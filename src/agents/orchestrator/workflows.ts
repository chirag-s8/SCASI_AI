/**
 * @file src/agents/orchestrator/workflows.ts
 * Predefined multi-step workflow pipelines.
 */

import type { AgentContext } from '../_shared/types';
import type { AgentResult, OrchestratorRequest } from './types';
import type { EmailCategory } from '../nlp/types';
import { nlpAgent } from '../nlp';
import { ragAgent } from '../rag';
import { pMapSettled } from '../_shared/utils';
import { getServiceRoleClient } from '../_shared/supabase';

// Follow-up signal phrases to scan for in email bodies
const FOLLOW_UP_SIGNALS = [
    'waiting for your response',
    'waiting to hear from you',
    'please reply',
    'please respond',
    'let me know',
    'looking forward to your reply',
    'following up',
    'just checking in',
    'any update',
    'please confirm',
    'could you get back to me',
    'get back to me',
    'awaiting your',
    'please advise',
];

/**
 * Scans an email body for follow-up signals and stores a record in Supabase.
 * Returns the detected signal string, or null if none found.
 */
export async function detectFollowUps(
    userId: string,
    email: {
        emailId?: string;
        gmailId?: string;
        subject: string;
        from: string;
        body: string;
    }
): Promise<string | null> {
    const lowerBody = email.body.toLowerCase();
    const matched = FOLLOW_UP_SIGNALS.find(signal => lowerBody.includes(signal));
    if (!matched) return null;

    try {
        const db = getServiceRoleClient();
        await db.from('follow_ups').insert({
            user_id: userId,
            email_id: email.emailId ?? null,
            gmail_id: email.gmailId ?? null,
            subject: email.subject,
            recipient: email.from,
            signal: matched,
            status: 'pending',
        });
    } catch (err) {
        // Non-fatal — log and continue
        console.warn('[workflows] detectFollowUps store failed:', err instanceof Error ? err.message : err);
    }

    return matched;
}

interface ClassifiedEmail {
    emailId: string;
    text: string;
    category: EmailCategory;
    priority: number;
    reason: string;
}

// ---------------------------------------------------------------------------
// Handle For Me: Classify → Summarize → ExtractTasks → DraftReply
// ---------------------------------------------------------------------------

export async function handleForMe(
    ctx: AgentContext,
    req: OrchestratorRequest,
    signal?: AbortSignal
): Promise<{ answer: string; trace: AgentResult[] }> {
    const trace: AgentResult[] = [];
    const traceId = ctx.traceId as string;
    const email = req.emailContext;

    if (!email) {
        return { answer: 'No email context provided. Please select an email to handle.', trace };
    }

    // Step 1: Classify
    const classifyStart = Date.now();
    const classification = await nlpAgent.classify(
        { subject: email.subject, snippet: email.snippet },
        traceId
    );
    trace.push({
        agentName: 'nlp.classify',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - classifyStart,
        output: classification,
    });

    // Step 2: Summarize
    const summarizeStart = Date.now();
    const summary = await nlpAgent.summarize(
        { subject: email.subject, snippet: email.snippet, from: email.from },
        traceId,
        signal
    );
    trace.push({
        agentName: 'nlp.summarize',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - summarizeStart,
        output: summary,
    });

    // Step 3: Extract Tasks
    const tasksStart = Date.now();
    const tasks = await nlpAgent.extractTasks(
        { text: email.body || email.snippet },
        traceId,
        signal
    );
    trace.push({
        agentName: 'nlp.extractTasks',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - tasksStart,
        output: tasks,
    });

    // Step 4: Draft Reply
    const replyStart = Date.now();
    const reply = await nlpAgent.draftReply(
        { subject: email.subject, snippet: email.snippet, tone: 'professional', from: email.from },
        traceId,
        signal
    );
    trace.push({
        agentName: 'nlp.draftReply',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - replyStart,
        output: reply,
    });

    // Step 5: Follow-up detection
    const followUpStart = Date.now();
    const followUpSignal = await detectFollowUps(ctx.userId as string, {
        emailId: email.gmailId,
        gmailId: email.gmailId,
        subject: email.subject,
        from: email.from,
        body: email.body || email.snippet,
    });
    trace.push({
        agentName: 'orchestrator.followUp',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - followUpStart,
        output: followUpSignal ? { detected: true, signal: followUpSignal } : { detected: false },
    });

    const taskList = tasks.tasks.length > 0
        ? tasks.tasks.map(t => `• ${t.task}${t.deadline ? ` (by ${t.deadline})` : ''}`).join('\n')
        : 'No specific tasks detected.';

    const answer = [
        `📧 **Analysis Complete**`,
        ``,
        `**Category:** ${classification.category} (Priority: ${classification.priority}/100)`,
        `**Reason:** ${classification.reason}`,
        ``,
        `**Summary:** ${summary.summary}`,
        summary.deadline ? `**Deadline:** ${summary.deadline}` : '',
        ``,
        `**Tasks:**`,
        taskList,
        ``,
        `**Draft Reply:**`,
        reply.reply,
        ``,
        followUpSignal ? `🔔 **Follow-up tracked** — detected signal: "${followUpSignal}"` : '',
        `⚠️ Review before sending. Click "Send" to approve.`,
    ].filter(Boolean).join('\n');

    return { answer, trace };
}

// ---------------------------------------------------------------------------
// Sort My Inbox: Batch classify + prioritize → ranked list
// ---------------------------------------------------------------------------

export async function sortInbox(
    ctx: AgentContext,
    _req: OrchestratorRequest,
    signal?: AbortSignal
): Promise<{ answer: string; trace: AgentResult[] }> {
    const trace: AgentResult[] = [];
    const traceId = ctx.traceId as string;
    const userId = ctx.userId as string;

    // Search for recent emails via RAG
    const searchStart = Date.now();
    const searchResult = await ragAgent.query({
        query: 'recent important emails',
        userId,
        topK: 20,
        hybridWeight: 0.3,
        similarityThreshold: 0.1,
        contextBudgetTokens: 8000,
        rerank: false,
    }, { traceId, signal });
    trace.push({
        agentName: 'rag.query',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - searchStart,
        output: { chunksFound: searchResult.chunks.length },
    });

    if (searchResult.chunks.length === 0) {
        return {
            answer: 'No indexed emails found. Please run "Index Emails" first to sync your inbox.',
            trace,
        };
    }

    // Classify unique emails (by emailId) — parallelized
    const uniqueEmails = new Map<string, string>();
    for (const chunk of searchResult.chunks) {
        if (!uniqueEmails.has(chunk.emailId)) {
            uniqueEmails.set(chunk.emailId, chunk.chunkText);
        }
    }

    const emailEntries = Array.from(uniqueEmails.entries());
    const classifyStart = Date.now();

    const settled = await pMapSettled(
        emailEntries,
        async ([emailId, text]) => {
            const cls = await nlpAgent.classify(
                { subject: text.slice(0, 200), snippet: text },
                traceId
                // classify() is rule-based (no API call) — signal not forwarded
            );
            return {
                emailId,
                text: text.slice(0, 100),
                category: cls.category,
                priority: cls.priority,
                reason: cls.reason,
            };
        },
        5
    );

    const classifications: ClassifiedEmail[] = [];
    for (const result of settled) {
        if (result.status === 'fulfilled') {
            classifications.push(result.value);
        }
    }

    classifications.sort((a, b) => b.priority - a.priority);

    trace.push({
        agentName: 'nlp.classify (batch)',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - classifyStart,
        output: { classified: classifications.length },
    });

    const lines = classifications.map((c, i) =>
        `${i + 1}. [${c.priority}] **${c.category}** — ${c.text}... — ${c.reason}`
    );

    const answer = [
        `📋 **Inbox Sorted** (${classifications.length} emails ranked by priority)`,
        '',
        ...lines,
    ].join('\n');

    return { answer, trace };
}

// ---------------------------------------------------------------------------
// Reply To: RAG thread context → summarize → draft reply
// ---------------------------------------------------------------------------

export async function replyTo(
    ctx: AgentContext,
    req: OrchestratorRequest,
    target: string,
    signal?: AbortSignal
): Promise<{ answer: string; trace: AgentResult[] }> {
    const trace: AgentResult[] = [];
    const traceId = ctx.traceId as string;
    const userId = ctx.userId as string;

    // 1. Search for emails from the target person
    const searchStart = Date.now();
    const searchResult = await ragAgent.query({
        query: `emails from ${target}`,
        userId,
        topK: 10,
        hybridWeight: 0.5,
        similarityThreshold: 0.2,
        contextBudgetTokens: 4000,
        rerank: true,
    }, { traceId, signal });
    trace.push({
        agentName: 'rag.query',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - searchStart,
        output: { chunksFound: searchResult.chunks.length },
    });

    if (searchResult.chunks.length === 0) {
        return {
            answer: `No emails found from "${target}". Make sure your inbox is indexed.`,
            trace,
        };
    }

    // 2. Summarize the thread context
    const summarizeStart = Date.now();
    const summary = await nlpAgent.summarize({
        subject: `Thread with ${target}`,
        snippet: searchResult.contextBlock.slice(0, 8000),
        from: target,
    }, traceId, signal);
    trace.push({
        agentName: 'nlp.summarize',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - summarizeStart,
        output: summary,
    });

    // 3. Draft reply based on thread context
    const replyStart = Date.now();
    const reply = await nlpAgent.draftReply({
        subject: `Re: ${summary.summary.slice(0, 100)}`,
        snippet: searchResult.contextBlock.slice(0, 6000),
        tone: 'professional',
    }, traceId, signal);
    trace.push({
        agentName: 'nlp.draftReply',
        completedAt: new Date().toISOString(),
        durationMs: Date.now() - replyStart,
        output: reply,
    });

    const answer = [
        `✉️ **Reply to ${target}**`,
        '',
        `**Thread Summary:** ${summary.summary}`,
        summary.deadline ? `**Deadline:** ${summary.deadline}` : '',
        '',
        `**Draft Reply:**`,
        reply.reply,
        '',
        `⚠️ Review and edit before sending.`,
    ].filter(Boolean).join('\n');

    return { answer, trace };
}

// ---------------------------------------------------------------------------
// Send Email: Parse intent → generate draft → return compose data
// ---------------------------------------------------------------------------

export interface SendEmailResult {
    answer: string;
    trace: AgentResult[];
    composeData: {
        prompt: string;
        recipientName: string;
        subject: string;
        body: string;
        to: string;
        cc: string;
    } | null;
}

// Schemas for compose intent extraction (mirrors /api/ai/compose)
import { z } from 'zod';
import { llmRouter } from '../../llm/router';

const ComposeIntentSchema = z.object({
    recipientName: z.string(),
    ccNames: z.array(z.string()).catch([]),
    subject: z.string(),
    intent: z.string(),
    tone: z.enum(['professional', 'casual', 'formal', 'friendly', 'firm', 'grateful']).default('professional'),
    deadline: z.string().nullable().catch(null),
});

const DraftSchema = z.object({
    subject: z.string(),
    body: z.string(),
});

const COMPOSE_EXTRACT_SYSTEM = `You are an email composition assistant. Extract the recipient name, CC names, subject, intent, tone, and deadline from the user's natural language prompt.

Return JSON:
{
  "recipientName": "first name or full name of the primary recipient",
  "ccNames": ["name of person to CC"],
  "subject": "a concise email subject line",
  "intent": "what the email should say in 1-2 sentences",
  "tone": "professional | casual | formal | friendly | firm | grateful",
  "deadline": "deadline string if mentioned, or null"
}

CC detection: look for "keep X in CC", "CC X", "copy X", "also CC". ccNames is [] if none mentioned.`;

const COMPOSE_DRAFT_SYSTEM = `You are an expert email writer. Write a complete, ready-to-send email body based on the given intent and tone.

Rules:
- Write ONLY the email body (no subject line, no metadata)
- Start with an appropriate greeting using the recipient name
- Keep it concise and on-point
- End with an appropriate sign-off

Return JSON: { "subject": "refined subject line", "body": "complete email body" }`;

export async function sendEmail(
    ctx: AgentContext,
    req: OrchestratorRequest,
    signal?: AbortSignal
): Promise<SendEmailResult> {
    const trace: AgentResult[] = [];
    const traceId = ctx.traceId as string;
    const userMessage = req.userMessage;

    const composeStart = Date.now();

    try {
        // Step 1: Extract compose intent directly via LLM (no HTTP fetch — avoids auth issues)
        const intentResult = await llmRouter.generateText('extract', userMessage, {
            schema: ComposeIntentSchema,
            systemPrompt: COMPOSE_EXTRACT_SYSTEM,
            traceId,
            temperature: 0.2,
            maxTokens: 256,
            signal,
        });

        if (!intentResult.data) {
            throw new Error('Could not parse email intent from your request.');
        }

        const intent = intentResult.data;

        // Step 2: Draft the email body directly via LLM
        const draftPrompt = `Recipient: ${intent.recipientName}
Subject: ${intent.subject}
Intent: ${intent.intent}
Tone: ${intent.tone}
${intent.deadline ? `Deadline: ${intent.deadline}` : ''}

Write the email body.`;

        const draftResult = await llmRouter.generateText('reply', draftPrompt, {
            schema: DraftSchema,
            systemPrompt: COMPOSE_DRAFT_SYSTEM,
            traceId,
            temperature: 0.6,
            maxTokens: 512,
            signal,
        });

        if (!draftResult.data) {
            throw new Error('Could not draft the email body.');
        }

        trace.push({
            agentName: 'email.compose',
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - composeStart,
            output: { recipientName: intent.recipientName, subject: draftResult.data.subject },
        });

        const composeData = {
            prompt: userMessage,
            recipientName: intent.recipientName,
            subject: draftResult.data.subject || intent.subject,
            body: draftResult.data.body,
            to: '',
            cc: intent.ccNames?.join(', ') || '',
        };

        const answer = `I've drafted an email to ${intent.recipientName} with the subject "${composeData.subject}". Opening the compose window for you to review and send.`;

        return { answer, trace, composeData };

    } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        trace.push({
            agentName: 'email.compose',
            completedAt: new Date().toISOString(),
            durationMs: Date.now() - composeStart,
            output: { error: errMsg },
        });

        return {
            answer: `I wasn't able to draft that email. Please try using the Compose button directly.`,
            trace,
            composeData: null,
        };
    }
}
