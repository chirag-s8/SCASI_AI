/**
 * @file src/agents/orchestrator/types.ts
 * Input / output types for the Orchestrator agent.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Workflow enum
// ---------------------------------------------------------------------------

export const WorkflowType = z.enum([
    'handle_for_me',
    'sort_inbox',
    'reply_to',
    'general',
]);
export type WorkflowType = z.infer<typeof WorkflowType>;

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const OrchestratorRequestSchema = z.object({
    userMessage: z.string().min(1).max(10_000),
    sessionId: z.string().uuid().optional(),
    emailContext: z.object({
        gmailId: z.string(),
        subject: z.string(),
        from: z.string(),
        snippet: z.string(),
        body: z.string().optional(),
    }).optional(),
});
export type OrchestratorRequest = z.infer<typeof OrchestratorRequestSchema>;

// ---------------------------------------------------------------------------
// ReAct step
// ---------------------------------------------------------------------------

export interface ReActStep {
    thought: string;
    tool?: string;
    toolInput?: Record<string, unknown>;
    observation?: unknown;
    answer?: string;
}

// ---------------------------------------------------------------------------
// Agent result trace
// ---------------------------------------------------------------------------

export interface AgentResult {
    agentName: string;
    completedAt: string;
    durationMs: number;
    output: unknown;
}

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface OrchestratorResponse {
    answer: string;
    workflow: WorkflowType;
    steps: ReActStep[];
    agentTrace: AgentResult[];
    totalDurationMs: number;
    sessionId?: string;
}

// ---------------------------------------------------------------------------
// Intent detection output
// ---------------------------------------------------------------------------

export const IntentSchema = z.object({
    workflow: WorkflowType,
    target: z.string().optional(),
    reasoning: z.string(),
});
export type Intent = z.infer<typeof IntentSchema>;

// ---------------------------------------------------------------------------
// SSE Chat stream events
// ---------------------------------------------------------------------------

export interface ChatEventIntent {
    type: 'intent';
    workflow: WorkflowType;
    reasoning: string;
}

export interface ChatEventStep {
    type: 'step';
    agentName: string;
    status: 'running' | 'completed' | 'failed';
    durationMs?: number;
    output?: unknown;
}

export interface ChatEventToken {
    type: 'token';
    text: string;
}

export interface ChatEventDone {
    type: 'done';
    sessionId?: string;
    totalDurationMs: number;
    workflow: WorkflowType;
}

export interface ChatEventError {
    type: 'error';
    code: string;
    message: string;
}

export type ChatStreamEvent =
    | ChatEventIntent
    | ChatEventStep
    | ChatEventToken
    | ChatEventDone
    | ChatEventError;
