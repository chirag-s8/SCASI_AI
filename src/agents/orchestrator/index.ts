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

const INTENT_SYSTEM = `You are an intent classifier for an AI email assistant called Scasi.
Classify the user's request into one of these workflows:
- handle_for_me: User EXPLICITLY asks to "handle this for me", "do everything", "take care of this", or "handle this email". Must be an explicit all-in-one delegation request.
- sort_inbox: User wants to sort/prioritize/organize their inbox
- reply_to: User wants to reply to a specific person (extract the person's name as "target")
- general: Everything else — including summarize, classify, explain, search, questions, reply drafts, or any single-task request

IMPORTANT: "Summarize this email", "classify this", "draft a reply", "what does this email say" — these are ALL "general", NOT "handle_for_me".
Only route to handle_for_me when the user explicitly says they want the full automated pipeline done for them.

Return JSON: { "workflow": "...", "target": "optional person name", "reasoning": "..." }`;

function buildReActSystemPrompt(): string {
    return `You are Scasi, a powerful and precise AI email assistant. You help users manage their Gmail inbox with confidence and accuracy.

You have access to these tools:
${getToolDescriptionsForLLM()}

To use a tool, respond with JSON:
{ "thought": "your reasoning", "tool": "tool_name", "toolInput": { ... } }

When you have enough information to answer, respond with:
{ "thought": "your reasoning", "answer": "your final answer to the user" }

Rules:
- Always think before acting
- Use tools to fetch real inbox data before answering questions about emails
- NEVER guess or make up email content — always use tools to get accurate data
- Be direct, confident, and specific in your answers
- When asked about inbox, unread count, or specific emails — use the search or list tools first
- Format answers clearly with specific details (sender names, subjects, dates)
- If you cannot find something, say so clearly rather than guessing`;
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
            'You are Scasi, a powerful AI email assistant. Based on the reasoning and observations above, ' +
            'provide a clear, direct, and accurate response to the user. ' +
            'IMPORTANT: Your response will be spoken aloud via text-to-speech. ' +
            'Use short, clear sentences. Do NOT use markdown, bullet points, asterisks, or special characters. ' +
            'Speak naturally as if talking to the user. Be specific — include real names, subjects, and counts from the data. ' +
            'Never guess or fabricate email details. If data is unavailable, say so clearly.';

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
