/**
 * @file src/agents/nlp/types.ts
 * Input / output types for the NLP agent.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Intent enum
// ---------------------------------------------------------------------------

export const Intent = z.enum([
    'reply',
    'summarise',
    'search',
    'compose',
    'label',
    'delete',
    'snooze',
    'unknown',
]);
export type Intent = z.infer<typeof Intent>;

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const NlpRequestSchema = z.object({
    /** Raw user utterance or email body to parse */
    text: z.string().min(1).max(10_000),
});
export type NlpRequest = z.infer<typeof NlpRequestSchema>;

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface NamedEntity {
    type: 'person' | 'date' | 'org' | 'action' | 'other';
    value: string;
    /** Character offset in the source text */
    start: number;
    end: number;
}

export interface NlpResponse {
    intent: Intent;
    /** Confidence score [0, 1] */
    confidence: number;
    entities: NamedEntity[];
    /** Cleaned / normalised version of the input text */
    normalizedText: string;
}
