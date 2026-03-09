/**
 * @file src/agents/testing/types.ts
 * Input / output types for the Testing agent.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const TestingRequestSchema = z.object({
    /** Fixture type to generate */
    fixture: z.enum(['email', 'user', 'session', 'email_chunk']),

    /** Number of synthetic records to generate */
    count: z.number().int().min(1).max(100).default(1),

    /** Optional seed for deterministic generation */
    seed: z.string().optional(),
});
export type TestingRequest = z.infer<typeof TestingRequestSchema>;

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface TestingResponse {
    /** Generated fixture records (shape depends on `fixture` type) */
    records: Record<string, unknown>[];
    /** Human-readable summary of what was generated */
    summary: string;
}
