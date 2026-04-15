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
    return `You are Scasi, a fully intelligent AI assistant and the voice brain of the Scasi platform. You know everything about the user's data and the Scasi app.

SCASI PLATFORM KNOWLEDGE:
Scasi is an AI-powered email and productivity platform with these features:
- Inbox & Email Management: read, search, summarize, classify, and reply to emails
- AI Priority Scoring: scores emails 1-100 by urgency
- AI Categorization: sorts emails into urgent, action_required, fyi, meeting, newsletter, personal, financial, social, promotional, spam
- Spam Neural Shield: 99.4% accuracy spam detection
- Deadline Extraction: pulls dates and deadlines from emails
- Generate Reply: context-aware AI draft replies
- Handle For Me: 5-step agentic AI pipeline for full email handling
- Calendar: synced with Google Calendar — view, create, delete events
- Team Collaboration: assign emails to team members, track workload and response rates
- Analytics Dashboard: email volume trends, sender frequency, category distribution, peak traffic heatmap
- Burnout Detection: tracks stress level, burnout score, urgent email count, late-night email patterns
- Focus Mode: filters to urgent tasks only
- RAG Search: semantic search across all indexed emails
- Voice Assistant: that's you — the voice brain of Scasi

You have access to these tools:
${getToolDescriptionsForLLM()}

To use a tool, respond with JSON:
{ "thought": "your reasoning", "tool": "tool_name", "toolInput": { ... } }

When you have enough information to answer, respond with:
{ "thought": "your reasoning", "answer": "your final answer to the user" }

TOOL USAGE RULES:
1. For ANY email question → use gmail.liveInbox or gmail.searchBySender
2. When user mentions a SENDER NAME (even partial like "prajwal", "nextwave", "harpreet") → ALWAYS use gmail.searchBySender with that name. Never use liveInbox with from: for partial names.
3. When user wants to READ an email → first find it with searchBySender or liveInbox, then call gmail.getEmailBody with the message ID
4. For "latest email from X" → use gmail.searchBySender with maxResults:1, then gmail.getEmailBody
5. For calendar/schedule/events/meetings/upcoming events/what do I have today/this week → ALWAYS use calendar.getEvents tool. Never say you can't access the calendar.
   - If the tool returns events, read them out naturally.
   - If the tool returns count:0 or empty events, say "You have no upcoming events scheduled in the next 30 days."
   - NEVER say there is a permissions issue or technical limitation — just report what the data says.
6. For team/assignments/workload → use team.getMembers
7. For burnout/stress/productivity/inbox health → use inbox.getBurnoutStats
8. For unread count → gmail.liveInbox with query "is:unread"
9. For today's emails → gmail.liveInbox with query "newer_than:1d"
10. NEVER guess or fabricate data — always call the tool first

RESPONSE STYLE:
- Your answer will be READ ALOUD by text-to-speech. Write as if SPEAKING, not writing.
- No markdown, no asterisks, no bullet points, no special characters, no numbered lists.
- Do NOT output thinking or <think> tags — only the final spoken answer.
- For simple questions: 1-2 sentences. For complex ones like summaries or task lists: as many sentences as needed, but stay focused.
- Speak naturally and confidently like a human assistant.
- Never add unsolicited information.`;
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

        const signal = ctx.signal;

        const intent = await this.detectIntent(validated.userMessage, traceId, signal);

        let result: { answer: string; trace: AgentResult[]; steps?: ReActStep[] };

        switch (intent.workflow) {
            case 'handle_for_me':
                result = await handleForMe(ctx, validated, signal);
                break;
            case 'sort_inbox':
                result = await sortInbox(ctx, validated, signal);
                break;
            case 'reply_to':
                result = await replyTo(ctx, validated, intent.target ?? 'unknown', signal);
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
        const signal = ctx.signal;
        const intent = await this.detectIntent(validated.userMessage, traceId, signal);
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
                const result = await handleForMe(ctx, validated, signal);
                for (const t of result.trace) {
                    yield { type: 'step', agentName: t.agentName, status: 'completed', durationMs: t.durationMs, output: t.output };
                }
                answer = result.answer;
                break;
            }
            case 'sort_inbox': {
                yield { type: 'step', agentName: 'workflow.sortInbox', status: 'running' };
                const result = await sortInbox(ctx, validated, signal);
                for (const t of result.trace) {
                    yield { type: 'step', agentName: t.agentName, status: 'completed', durationMs: t.durationMs, output: t.output };
                }
                answer = result.answer;
                break;
            }
            case 'reply_to': {
                yield { type: 'step', agentName: 'workflow.replyTo', status: 'running' };
                const result = await replyTo(ctx, validated, intent.target ?? 'unknown', signal);
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
                signal: ctx.signal,
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
                        const observation = await tool.execute(response.toolInput, ctx, ctx.signal);
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
                        // Rethrow AbortError — don't swallow cancellation as a tool failure
                        if (err instanceof Error && err.name === 'AbortError') throw err;
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
                        ctx, event.currentPrompt, event.fallbackText, undefined, traceId
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
                        ctx, event.currentPrompt, event.thought, event.answer, traceId
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
                        ctx, event.currentPrompt, 'Maximum reasoning steps reached', undefined, traceId
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
        ctx: AgentContext,
        conversationContext: string,
        lastThought: string,
        plannedAnswer: string | undefined,
        traceId: string
    ): AsyncGenerator<ChatStreamEvent, string> {
        const answerHint = plannedAnswer
            ? `\nPlanned answer: ${plannedAnswer}\n\nDeliver this answer directly and concisely. No extra commentary.`
            : '\n\nNow provide your final answer to the user. Be direct and brief — answer only what was asked.';
        const finalPrompt = `${conversationContext}\n\nThought: ${lastThought}${answerHint}`;
        const finalSystemPrompt =
            'You are Scasi, an AI email assistant. Your response will be spoken aloud via text-to-speech. ' +
            'Do NOT output any thinking, reasoning, or <think> tags — only the final spoken answer. ' +
            'Do NOT output JSON — only plain spoken text. ' +
            'No markdown, no bullet points, no asterisks, no numbered lists, no special characters. ' +
            'Speak naturally and conversationally. Answer only what was asked — no unsolicited extras. ' +
            'For simple questions give 1 to 2 sentences. For complex questions like summaries or task lists, speak as many sentences as needed to fully answer — but stay focused and do not pad. ' +
            'Use real sender names, subjects, and counts from the actual data. Never fabricate details.';

        let collected = '';
        for await (const token of llmRouter.streamText('reply', finalPrompt, {
            systemPrompt: finalSystemPrompt,
            temperature: 0.2,
            maxTokens: 600,
            traceId,
            signal: ctx.signal,
        })) {
            collected += token;
            yield { type: 'token', text: token };
        }

        return collected || 'I was unable to generate a response. Please try again.';
    }

    // -----------------------------------------------------------------------
    // Private helpers
    // -----------------------------------------------------------------------

    private async detectIntent(userMessage: string, traceId: string, signal?: AbortSignal): Promise<Intent> {
        try {
            const result = await llmRouter.generateText('route', userMessage, {
                schema: IntentSchema,
                systemPrompt: INTENT_SYSTEM,
                traceId,
                temperature: 0.2,
                maxTokens: 256,
                signal,
            });
            if (result.data) return result.data;
        } catch (err: unknown) {
            // Rethrow AbortError — don't swallow cancellation
            if (err instanceof Error && err.name === 'AbortError') throw err;
            // Fall through to default for real routing failures
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
