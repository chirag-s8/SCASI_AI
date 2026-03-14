/**
 * @file src/agents/rag/types.ts
 * Input / output Zod schemas for the RAG agent.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const ChunkType = z.enum(['subject', 'header', 'body', 'signature', 'quoted', 'metadata']);
export type ChunkType = z.infer<typeof ChunkType>;

export const IngestStatus = z.enum(['pending', 'ingested', 'indexed', 'failed']);
export type IngestStatus = z.infer<typeof IngestStatus>;

// ---------------------------------------------------------------------------
// Email Chunk (internal representation)
// ---------------------------------------------------------------------------

export interface EmailChunk {
    emailId: string;
    chunkIndex: number;
    chunkType: ChunkType;
    chunkText: string;
    embedding?: number[];
}

// ---------------------------------------------------------------------------
// Scored chunk (search result)
// ---------------------------------------------------------------------------

export interface ScoredChunk {
    chunkId: string;
    emailId: string;
    chunkText: string;
    chunkType: ChunkType;
    chunkIndex: number;
    vectorScore: number;
    ftsScore: number;
    combinedScore: number;
    rerankedScore?: number;
}

// ---------------------------------------------------------------------------
// RagUpsertEmailRequest / Response
// ---------------------------------------------------------------------------

export const RagUpsertEmailRequestSchema = z.object({
    emails: z.array(z.object({
        gmailId: z.string(),
        subject: z.string().default(''),
        from: z.string().default(''),
        date: z.string().default(''),
        snippet: z.string().default(''),
        body: z.string().default(''),
    })),
    userId: z.string().uuid(),
});
export type RagUpsertEmailRequest = z.infer<typeof RagUpsertEmailRequestSchema>;

export interface RagUpsertEmailResponse {
    indexed: number;
    failed: number;
    errors: Array<{ gmailId: string; error: string }>;
}

// ---------------------------------------------------------------------------
// RagQueryRequest / Response
// ---------------------------------------------------------------------------

export const RagQueryRequestSchema = z.object({
    query: z.string().min(1).max(4000),
    userId: z.string().uuid(),
    topK: z.number().int().min(1).max(50).default(10),
    similarityThreshold: z.number().min(0).max(1).default(0.3),
    hybridWeight: z.number().min(0).max(1).default(0.5),
    contextBudgetTokens: z.number().int().min(100).max(16000).default(4000),
    rerank: z.boolean().default(true),
});
export type RagQueryRequest = z.infer<typeof RagQueryRequestSchema>;

export interface RagQueryResponse {
    chunks: ScoredChunk[];
    contextBlock: string;
    totalChunksSearched: number;
}

// ---------------------------------------------------------------------------
// Agent-level request/response (discriminated union)
// ---------------------------------------------------------------------------

export const RagRequestSchema = z.discriminatedUnion('action', [
    RagUpsertEmailRequestSchema.extend({ action: z.literal('upsert') }),
    RagQueryRequestSchema.extend({ action: z.literal('query') }),
]);
export type RagRequest = z.infer<typeof RagRequestSchema>;

export type RagResponse = RagUpsertEmailResponse | RagQueryResponse;
