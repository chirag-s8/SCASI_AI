/**
 * @file src/agents/orchestrator/types.ts
 * Input / output types for the Orchestrator agent.
 */

import { z } from 'zod';
import type { AgentName } from '../_shared';

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const OrchestratorRequestSchema = z.object({
    /** Raw message from the user (voice transcript OR typed text) */
    userMessage: z.string().min(1).max(10_000),

    /** Optionally force a specific agent pipeline; omit to let orchestrator decide */
    pipeline: z.array(z.enum(['rag', 'nlp', 'testing', 'voice', 'orchestrator'])).optional(),
});
export type OrchestratorRequest = z.infer<typeof OrchestratorRequestSchema>;

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface AgentResult {
    agentName: AgentName;
    /** ISO 8601 timestamp when this agent finished */
    completedAt: string;
    /** Duration in milliseconds */
    durationMs: number;
    output: unknown;
}

export interface OrchestratorResponse {
    /** Final synthesised answer shown to the user */
    answer: string;

    /** Per-agent execution trace for debugging / observability */
    agentTrace: AgentResult[];

    /** Total wall-clock time across all agents (ms) */
    totalDurationMs: number;
}
