/**
 * @file src/agents/orchestrator/index.ts
 * Orchestrator Agent — ReAct loop with tool calling, workflow dispatch, session memory.
 */

import { z } from 'zod';
import type { Agent, AgentContext } from '../_shared/types';
import { getServiceRoleClient } from '../_shared/supabase';
import { llmRouter } from '../../llm/router';
import { getToolByName, getToolDescriptionsForLLM } from '../_shared/tool-bridge';
import {
    type OrchestratorRequest,
    type OrchestratorResponse,
    type ReActStep,
    type AgentResult,
    type Intent,
    type ChatStreamEvent,
    OrchestratorRequestSchema,
    IntentSchema,
} from './types';
import { handleForMe, sortInbox, replyTo } from './workflows';

export * from './types';

const MAX_REACT_ITERATIONS = 5;

// ---------------------------------------------------------------------------
// Internal ReAct core event types (not exported — implementation detail)
// ---------------------------------------------------------------------------

type ReactCoreEvent =
    | { type: 'reasoning_start' }
    | { type: 'reasoning_failed'; durationMs: number; fallbackText: string; currentPrompt: string }
    | { type: 'final_answer'; thought: string; answer: string; durationMs: number; currentPrompt: string }
    | { type: 'tool_request'; thought: string; tool: string; toolInput: Record<string, unknown>; reasoningDurationMs: number }
    | { type: 'tool_result'; tool: string; observation: unknown; durationMs: number; success: boolean; errorMessage?: string }
    | { type: 'max_iterations'; currentPrompt: string; thoughts: string[] };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function chunkText(text: string, wordsPerChunk = 4): string[] {
    const chunks: string[] = [];
    const segments = text.split(/(\s+)/);
    let current = '';
    let wordCount = 0;

    for (const seg of segments) {
        current += seg;
        if (!/^\s*$/.test(seg)) wordCount++;
        if (wordCount >= wordsPerChunk) {
            chunks.push(current);
            current = '';
            wordCount = 0;
        }
    }
    if (current) chunks.push(current);
    return chunks;
}

function buildInitialPrompt(
    req: OrchestratorRequest,
    history: Array<{ role: string; content: string }>
): string {
    const messages: string[] = [];

    if (history.length > 0) {
        const historyStr = history
            .slice(-10)
            .map(m => `${m.role}: ${m.content}`)
            .join('\n');
        messages.push(`Previous conversation:\n${historyStr}`);
    }

    if (req.emailContext) {
        const ec = req.emailContext;
        messages.push(
            `Current email context:\nSubject: ${ec.subject}\nFrom: ${ec.from}\nSnippet: ${ec.snippet}`
        );
    }

    messages.push(`User: ${req.userMessage}`);
    return messages.join('\n\n');
}

const INTENT_SYSTEM = `You are the intent classifier for Scasi, an AI email assistant.
Classify the user's request into one of these workflows:

- handle_for_me: User wants the FULL automated pipeline — classify, summarize, extract tasks, draft reply, all at once.
  Examples: "handle this for me", "take care of this email", "do everything", "handle it", "process this", "deal with this", "manage this email for me", "what should I do with this and draft a reply"
  
- sort_inbox: User wants to sort, prioritize, rank, or organize their ENTIRE inbox (not a single email).
  Examples: "sort my inbox", "prioritize my emails", "organize my inbox", "rank my emails by importance", "what should I read first"
  
- reply_to: User wants to compose a reply to a specific person (extract their name as "target").
  Examples: "reply to John", "send a response to Sarah", "write back to the client", "respond to Mark's email"
  
- general: Everything else — single tasks like summarize, classify, explain, search, draft a standalone reply, answer questions about emails.
  Examples: "summarize this", "what does this email say", "is this urgent?", "draft a reply", "how many unread emails", "find emails from John", "what's in my inbox", "classify this email"

CRITICAL RULES:
- "Summarize this email" → general (single task, not full pipeline)
- "Draft a reply" → general (unless they also want classify + summarize + tasks)
- "What does this say?" → general
- Only route to handle_for_me when the user wants the COMPLETE analysis + draft reply pipeline
- If ambiguous, default to "general" — it's safer and more flexible

Return JSON: { "workflow": "...", "target": "optional person name", "reasoning": "one-sentence explanation" }`;

function buildReActSystemPrompt(): string {
    return `You are Scasi, a sharp and personable AI email assistant. You're like having a brilliant executive assistant who knows your inbox inside and out.

You have access to these tools:
${getToolDescriptionsForLLM()}

To use a tool, respond with JSON:
{ "thought": "your reasoning", "tool": "tool_name", "toolInput": { ... } }

When you have enough information to answer, respond with:
{ "thought": "your reasoning", "answer": "your final answer to the user" }

MANDATORY INBOX RULES — follow these without exception:
1. ANY question about emails, inbox, unread count, senders, subjects, or recent messages MUST start with a gmail.liveInbox tool call. Do NOT answer from memory or assumptions.
2. For unread count: call gmail.liveInbox with query "is:unread" FIRST.
3. For recent emails: call gmail.liveInbox with query "in:inbox" FIRST.
4. For emails from a specific person: call gmail.liveInbox with query "from:NAME" FIRST.
5. For today's emails: call gmail.liveInbox with query "newer_than:1d" FIRST.
6. NEVER guess, estimate, or fabricate email data — always call the tool.
7. After getting tool results, always CITE your source — mention the sender's name, the email subject, or the count from the actual data.
8. If the tool returns an error or empty results, say so clearly and suggest what the user can try.

PERSONALITY & RESPONSE STYLE:
- Be conversational and helpful, not robotic. Say "You've got 5 unread emails" not "There are 5 unread emails in your inbox."
- When listing emails, lead with the MOST important/actionable ones first.
- Give brief context for why something matters: "This one's from your manager — looks like they need the report by tomorrow."
- Be proactive: if you notice something important while answering, mention it. ("By the way, you also have an urgent email from IT about a password reset.")
- Keep answers concise but complete. Don't pad with unnecessary words.
- If you cannot find something, say so clearly rather than guessing.`;
}

const ReActResponseSchema = z.object({
    thought: z.string(),
    tool: z.string().optional(),
    toolInput: z.record(z.string(), z.unknown()).optional(),
    answer: z.string().optional(),
});

// ---------------------------------------------------------------------------
// OrchestratorAgent
// ---------------------------------------------------------------------------

export class OrchestratorAgent implements Agent<OrchestratorRequest, OrchestratorResponse> {
    readonly name = 'orchestrator' as const;

    async execute(ctx: AgentContext, req: OrchestratorRequest): Promise<OrchestratorResponse> {
        const validated = OrchestratorRequestSchema.parse(req);
        const startTime = Date.now();
        const traceId = ctx.traceId as string;

        const history = validated.sessionId
            ? await this.loadSessionHistory(validated.sessionId)
            : [];

        const intent = await this.detectIntent(validated.userMessage, traceId);

        let result: { answer: string; trace: AgentResult[]; steps?: ReActStep[] };

        switch (intent.workflow) {
            case 'handle_for_me':
                result = await handleForMe(ctx, validated);
                break;
            case 'sort_inbox':
                result = await sortInbox(ctx, validated);
                break;
            case 'reply_to':
                result = await replyTo(ctx, validated, intent.target ?? 'unknown');
                break;
            default:
                result = await this.reactLoop(ctx, validated, history, traceId);
                break;
        }

        if (validated.sessionId) {
            await this.saveToSession(
                validated.sessionId,
                validated.userMessage,
                result.answer
            );
        }

        return {
            answer: result.answer,
            workflow: intent.workflow,
            steps: result.steps ?? [],
            agentTrace: result.trace,
            totalDurationMs: Date.now() - startTime,
            sessionId: validated.sessionId,
        };
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }

    // -----------------------------------------------------------------------
    // Streaming execution — yields SSE-ready ChatStreamEvent objects
    // -----------------------------------------------------------------------

    async *streamExecute(
        ctx: AgentContext,
        req: OrchestratorRequest
    ): AsyncGenerator<ChatStreamEvent> {
        const validated = OrchestratorRequestSchema.parse(req);
        const startTime = Date.now();
        const traceId = ctx.traceId as string;

        const history = validated.sessionId
            ? await this.loadSessionHistory(validated.sessionId)
            : [];

        // 1. Intent detection
        const intent = await this.detectIntent(validated.userMessage, traceId);
        yield { type: 'intent', workflow: intent.workflow, reasoning: intent.reasoning };

        let answer: string;
        let tokensAlreadyStreamed = false;

        // 2. Dispatch to workflow or ReAct loop
        switch (intent.workflow) {
            case 'handle_for_me': {
                // Emit running events upfront so the UI shows all steps as pending/running
                for (const stepName of ['nlp.classify', 'nlp.summarize', 'nlp.extractTasks', 'nlp.draftReply', 'orchestrator.followUp']) {
                    yield { type: 'step', agentName: stepName, status: 'running' };
                }
                const result = await handleForMe(ctx, validated);
                for (const t of result.trace) {
                    yield { type: 'step', agentName: t.agentName, status: 'completed', durationMs: t.durationMs, output: t.output };
                }
                answer = result.answer;
                break;
            }
            case 'sort_inbox': {
                yield { type: 'step', agentName: 'workflow.sortInbox', status: 'running' };
                const result = await sortInbox(ctx, validated);
                for (const t of result.trace) {
                    yield { type: 'step', agentName: t.agentName, status: 'completed', durationMs: t.durationMs, output: t.output };
                }
                answer = result.answer;
                break;
            }
            case 'reply_to': {
                yield { type: 'step', agentName: 'workflow.replyTo', status: 'running' };
                const result = await replyTo(ctx, validated, intent.target ?? 'unknown');
                for (const t of result.trace) {
                    yield { type: 'step', agentName: t.agentName, status: 'completed', durationMs: t.durationMs, output: t.output };
                }
                answer = result.answer;
                break;
            }
            default: {
                answer = yield* this.streamReactLoop(ctx, validated, history, traceId);
                tokensAlreadyStreamed = true;
                break;
            }
        }

        // 3. Stream answer as token chunks (only for workflow paths)
        if (!tokensAlreadyStreamed) {
            for (const chunk of chunkText(answer)) {
                yield { type: 'token', text: chunk };
            }
        }

        // 4. Persist to session
        if (validated.sessionId) {
            await this.saveToSession(validated.sessionId, validated.userMessage, answer);
        }

        // 5. Done
        yield {
            type: 'done',
            sessionId: validated.sessionId,
            totalDurationMs: Date.now() - startTime,
            workflow: intent.workflow,
        };
    }

    // -----------------------------------------------------------------------
    // Shared ReAct core — single source of truth for the reasoning loop
    // -----------------------------------------------------------------------

    private async *reactCore(
        ctx: AgentContext,
        req: OrchestratorRequest,
        history: Array<{ role: string; content: string }>,
        traceId: string
    ): AsyncGenerator<ReactCoreEvent> {
        const systemPrompt = buildReActSystemPrompt();
        let currentPrompt = buildInitialPrompt(req, history);
        const thoughts: string[] = [];

        for (let iteration = 0; iteration < MAX_REACT_ITERATIONS; iteration++) {
            const stepStart = Date.now();

            yield { type: 'reasoning_start' as const };

            const result = await llmRouter.generateText('reply', currentPrompt, {
                schema: ReActResponseSchema,
                systemPrompt,
                traceId,
                temperature: 0.5,
                maxTokens: 1024,
            });

            if (!result.data) {
                yield {
                    type: 'reasoning_failed' as const,
                    durationMs: Date.now() - stepStart,
                    fallbackText: result.text ?? 'I encountered an issue processing your request.',
                    currentPrompt,
                };
                return;
            }

            const response = result.data;
            thoughts.push(response.thought);

            // Final answer
            if (response.answer) {
                yield {
                    type: 'final_answer' as const,
                    thought: response.thought,
                    answer: response.answer,
                    durationMs: Date.now() - stepStart,
                    currentPrompt,
                };
                return;
            }

            // Tool call
            if (response.tool && response.toolInput) {
                yield {
                    type: 'tool_request' as const,
                    thought: response.thought,
                    tool: response.tool,
                    toolInput: response.toolInput,
                    reasoningDurationMs: Date.now() - stepStart,
                };

                const toolStart = Date.now();
                const tool = getToolByName(response.tool);

                if (tool) {
                    try {
                        const observation = await tool.execute(response.toolInput, ctx);
                        const toolDuration = Date.now() - toolStart;

                        yield {
                            type: 'tool_result' as const,
                            tool: response.tool,
                            observation,
                            durationMs: toolDuration,
                            success: true,
                        };

                        const obsStr = typeof observation === 'string'
                            ? observation
                            : JSON.stringify(observation, null, 2).slice(0, 3000);
                        currentPrompt += `\n\nThought: ${response.thought}\nAction: ${response.tool}\nObservation: ${obsStr}\n\nContinue reasoning.`;
                    } catch (err: unknown) {
                        const errMsg = err instanceof Error ? err.message : String(err);
                        yield {
                            type: 'tool_result' as const,
                            tool: response.tool,
                            observation: errMsg,
                            durationMs: Date.now() - toolStart,
                            success: false,
                            errorMessage: errMsg,
                        };
                        currentPrompt += `\n\nThought: ${response.thought}\nAction: ${response.tool}\nObservation: Error - ${errMsg}\n\nTry a different approach.`;
                    }
                } else {
                    const errMsg = `Unknown tool: ${response.tool}`;
                    yield {
                        type: 'tool_result' as const,
                        tool: response.tool,
                        observation: errMsg,
                        durationMs: Date.now() - toolStart,
                        success: false,
                        errorMessage: errMsg,
                    };
                    currentPrompt += `\n\nObservation: Tool "${response.tool}" not found. Available tools: ${getToolDescriptionsForLLM().slice(0, 500)}`;
                }
            }
        }

        yield { type: 'max_iterations' as const, currentPrompt, thoughts };
    }

    // -----------------------------------------------------------------------
    // Non-streaming consumer — collects trace + steps, returns result
    // -----------------------------------------------------------------------

    private async reactLoop(
        ctx: AgentContext,
        req: OrchestratorRequest,
        history: Array<{ role: string; content: string }>,
        traceId: string
    ): Promise<{ answer: string; trace: AgentResult[]; steps: ReActStep[] }> {
        const trace: AgentResult[] = [];
        const steps: ReActStep[] = [];
        let pendingStep: ReActStep | null = null;

        for await (const event of this.reactCore(ctx, req, history, traceId)) {
            switch (event.type) {
                case 'reasoning_start':
                    break;

                case 'reasoning_failed':
                    return { answer: event.fallbackText, trace, steps };

                case 'final_answer': {
                    const step: ReActStep = { thought: event.thought, answer: event.answer };
                    steps.push(step);
                    return { answer: event.answer, trace, steps };
                }

                case 'tool_request':
                    pendingStep = {
                        thought: event.thought,
                        tool: event.tool,
                        toolInput: event.toolInput,
                    };
                    break;

                case 'tool_result': {
                    if (pendingStep) {
                        pendingStep.observation = event.success
                            ? event.observation
                            : `Error: ${event.errorMessage}`;
                        steps.push(pendingStep);
                    }
                    if (event.success) {
                        trace.push({
                            agentName: event.tool,
                            completedAt: new Date().toISOString(),
                            durationMs: event.durationMs,
                            output: event.observation,
                        });
                    }
                    pendingStep = null;
                    break;
                }

                case 'max_iterations':
                    return {
                        answer: 'I reached the maximum number of reasoning steps. Here\'s what I found so far:\n\n' +
                            event.thoughts.join('\n'),
                        trace,
                        steps,
                    };
            }
        }

        return { answer: 'No response generated.', trace, steps };
    }

    // -----------------------------------------------------------------------
    // Streaming consumer — yields ChatStreamEvents, streams final answer
    // -----------------------------------------------------------------------

    private async *streamReactLoop(
        ctx: AgentContext,
        req: OrchestratorRequest,
        history: Array<{ role: string; content: string }>,
        traceId: string
    ): AsyncGenerator<ChatStreamEvent, string> {
        for await (const event of this.reactCore(ctx, req, history, traceId)) {
            switch (event.type) {
                case 'reasoning_start':
                    yield { type: 'step', agentName: 'orchestrator.reason', status: 'running' };
                    break;

                case 'reasoning_failed':
                    yield {
                        type: 'step',
                        agentName: 'orchestrator.reason',
                        status: 'failed',
                        durationMs: event.durationMs,
                    };
                    return yield* this.streamFinalAnswer(
                        event.currentPrompt, event.fallbackText, undefined, traceId
                    );

                case 'final_answer':
                    yield {
                        type: 'step',
                        agentName: 'orchestrator.reason',
                        status: 'completed',
                        durationMs: event.durationMs,
                        output: { thought: event.thought },
                    };
                    return yield* this.streamFinalAnswer(
                        event.currentPrompt, event.thought, event.answer, traceId
                    );

                case 'tool_request':
                    yield {
                        type: 'step',
                        agentName: 'orchestrator.reason',
                        status: 'completed',
                        durationMs: event.reasoningDurationMs,
                        output: { thought: event.thought },
                    };
                    yield { type: 'step', agentName: event.tool, status: 'running' };
                    break;

                case 'tool_result':
                    yield {
                        type: 'step',
                        agentName: event.tool,
                        status: event.success ? 'completed' : 'failed',
                        durationMs: event.durationMs,
                        output: event.success
                            ? (typeof event.observation === 'string'
                                ? event.observation
                                : JSON.stringify(event.observation).slice(0, event.tool === 'rag.query' ? 3000 : 500))
                            : event.errorMessage,
                    };
                    break;

                case 'max_iterations':
                    return yield* this.streamFinalAnswer(
                        event.currentPrompt, 'Maximum reasoning steps reached', undefined, traceId
                    );
            }
        }

        return 'No response generated.';
    }

    /**
     * Streams a final answer token-by-token using llmRouter.streamText().
     * Yields ChatStreamEvent tokens and returns the collected full answer text.
     */
    private async *streamFinalAnswer(
        conversationContext: string,
        lastThought: string,
        plannedAnswer: string | undefined,
        traceId: string
    ): AsyncGenerator<ChatStreamEvent, string> {
        const answerHint = plannedAnswer
            ? `\nPlanned answer: ${plannedAnswer}\n\nRefine and present this answer to the user. Keep the same content but improve formatting and clarity.`
            : '\n\nNow provide your final answer to the user. Be concise, helpful, and use markdown for readability.';
        const finalPrompt = `${conversationContext}\n\nThought: ${lastThought}${answerHint}`;
        const finalSystemPrompt =
            'You are Scasi, a smart and personable AI email assistant. Based on the reasoning and observations above, ' +
            'provide a clear, helpful, and accurate response to the user. ' +
            'IMPORTANT: Your response will be spoken aloud via text-to-speech. ' +
            'Use short, conversational sentences. Do NOT use markdown, bullet points, asterisks, or special formatting. ' +
            'Speak naturally as if you are a helpful colleague talking to the user in person. ' +
            'Be specific — always mention real sender names, email subjects, counts, and dates from the actual data. ' +
            'Lead with the most important information first. ' +
            'If you notice something urgent or time-sensitive, highlight it. ' +
            'Never guess or fabricate email details. If data is unavailable, say so honestly and suggest next steps.';

        let collected = '';
        for await (const token of llmRouter.streamText('reply', finalPrompt, {
            systemPrompt: finalSystemPrompt,
            temperature: 0.5,
            maxTokens: 2048,
            traceId,
        })) {
            collected += token;
            yield { type: 'token', text: token };
        }

        return collected || 'I was unable to generate a response. Please try again.';
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private async detectIntent(userMessage: string, traceId: string): Promise<Intent> {
        try {
            const result = await llmRouter.generateText('route', userMessage, {
                schema: IntentSchema,
                systemPrompt: INTENT_SYSTEM,
                traceId,
                temperature: 0.2,
                maxTokens: 256,
            });
            if (result.data) return result.data;
        } catch {
            // Fall through to default
        }
        return { workflow: 'general', reasoning: 'Default fallback' };
    }

    private async loadSessionHistory(
        sessionId: string
    ): Promise<Array<{ role: string; content: string }>> {
        try {
            const db = getServiceRoleClient();
            const { data, error } = await db
                .from('assistant_messages')
                .select('role, content')
                .eq('session_id', sessionId)
                .order('created_at', { ascending: true })
                .limit(50);

            if (error || !data) return [];
            return data;
        } catch {
            return [];
        }
    }

    private async saveToSession(
        sessionId: string,
        userMessage: string,
        assistantAnswer: string
    ): Promise<void> {
        try {
            const db = getServiceRoleClient();
            await db.from('assistant_messages').insert([
                { session_id: sessionId, role: 'user', content: userMessage },
                { session_id: sessionId, role: 'assistant', content: assistantAnswer },
            ]);
            await db
                .from('assistant_sessions')
                .update({ updated_at: new Date().toISOString() })
                .eq('id', sessionId);
        } catch {
            console.warn('[Orchestrator] Failed to save session history');
        }
    }
}

export const orchestratorAgent = new OrchestratorAgent();
