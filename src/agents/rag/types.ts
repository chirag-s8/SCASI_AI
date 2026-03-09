/**
 * @file src/agents/rag/types.ts
 * Input / output types for the RAG agent.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

export const RagRequestSchema = z.object({
    /** Natural-language query from the user */
    query: z.string().min(1).max(2000),

    /** Maximum number of email chunks to return */
    topK: z.number().int().min(1).max(20).default(5),

    /** Optional minimum cosine-similarity threshold [0, 1] */
    similarityThreshold: z.number().min(0).max(1).default(0.7),
});
export type RagRequest = z.infer<typeof RagRequestSchema>;

// ---------------------------------------------------------------------------
// Response
// ---------------------------------------------------------------------------

export interface RagChunk {
    chunkId: string;
    emailId: string;
    chunkText: string;
    similarity: number;
}

export interface RagResponse {
    chunks: RagChunk[];
    /** Concatenated context string ready for LLM injection */
    contextBlock: string;
}
