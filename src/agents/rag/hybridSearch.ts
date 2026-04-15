/**
 * @file src/agents/rag/hybridSearch.ts
 * pgvector cosine + tsvector FTS + Reciprocal Rank Fusion.
 * Falls back to FTS-only search when embedding provider is unavailable.
 */

import { getServiceRoleClient } from '../_shared/supabase';
import type { ScoredChunk, ChunkType } from './types';
import { embedSingleText } from './embedder';
import { getCachedSearchResults, setCachedSearchResults, computeSearchHash } from './cache';
import { createAbortError } from '../../llm/router';

const EMBED_DIM = 768;

export interface HybridSearchOptions {
    userId: string;
    query: string;
    topK: number;
    hybridWeight: number;
    traceId?: string;
    signal?: AbortSignal;
}

export async function hybridSearch(options: HybridSearchOptions): Promise<ScoredChunk[]> {
    const { userId, query, topK, traceId } = options;
    let { hybridWeight } = options;

    const cacheKey = computeSearchHash(`${userId}:${query}`, topK, hybridWeight);
    const cached = await getCachedSearchResults<ScoredChunk[]>(cacheKey);
    if (cached) return cached;

    let queryEmbedding: number[];
    try {
        queryEmbedding = await embedSingleText(query, traceId, options.signal);
    } catch (err: unknown) {
        // Rethrow abort errors — they're intentional cancellation, not provider failures.
        // Degrading to FTS-only on abort would silently produce low-quality results
        // and waste the work already done (the caller expects cancellation, not degradation).
        if (err instanceof Error && err.name === 'AbortError') throw err;
        if (options.signal?.aborted) throw err; // signal already aborted but error name may differ
        queryEmbedding = new Array(EMBED_DIM).fill(0);
        hybridWeight = 0;
        console.warn('[hybridSearch] Embedding unavailable, falling back to FTS-only search:',
            err instanceof Error ? err.message : String(err));
    }

    const db = getServiceRoleClient();

    // AbortSignal support: check before the potentially slow DB query
    if (options.signal?.aborted) {
        throw createAbortError('Aborted before DB query');
    }

    const { data, error } = await db.rpc('hybrid_search_chunks', {
        p_user_id: userId,
        p_query_embedding: `[${queryEmbedding.join(',')}]`,
        p_query_text: query,
        p_match_count: topK * 2,
        p_vector_weight: hybridWeight,
    });

    if (options.signal?.aborted) {
        throw createAbortError('Aborted after DB query');
    }

    if (error) throw new Error(`Hybrid search failed: ${error.message}`);

    const results: ScoredChunk[] = (data ?? []).map((row: {
        chunk_id: string;
        email_id: string;
        chunk_text: string;
        chunk_type: string;
        chunk_index: number;
        vector_score: number;
        fts_score: number;
        combined_score: number;
    }) => ({
        chunkId: row.chunk_id,
        emailId: row.email_id,
        chunkText: row.chunk_text,
        chunkType: row.chunk_type as ChunkType,
        chunkIndex: row.chunk_index,
        vectorScore: row.vector_score,
        ftsScore: row.fts_score,
        combinedScore: row.combined_score,
    }));

    await setCachedSearchResults(cacheKey, results);
    return results;
}
