/**
 * @file src/agents/rag/cache.ts
 * RAG-specific caching for embeddings and search results.
 */

import { createHash } from 'crypto';
import { llmCache } from '../../llm/cache';

function sha256(text: string): string {
    return createHash('sha256').update(text).digest('hex').slice(0, 16);
}

const EMBED_TTL = 24 * 60 * 60 * 1000; // 24 hours
const SEARCH_TTL = 5 * 60 * 1000;       // 5 minutes

export async function getCachedEmbedding(text: string): Promise<number[] | null> {
    const key = `emb:${sha256(text)}`;
    return llmCache.get<number[]>(key);
}

export async function setCachedEmbedding(text: string, embedding: number[]): Promise<void> {
    const key = `emb:${sha256(text)}`;
    await llmCache.set(key, embedding, EMBED_TTL);
}

export async function getCachedSearchResults<T>(queryHash: string): Promise<T | null> {
    const key = `search:${queryHash}`;
    return llmCache.get<T>(key);
}

export async function setCachedSearchResults<T>(queryHash: string, results: T): Promise<void> {
    const key = `search:${queryHash}`;
    await llmCache.set(key, results, SEARCH_TTL);
}

export function computeSearchHash(query: string, topK: number, hybridWeight: number): string {
    return sha256(`${query}:${topK}:${hybridWeight}`);
}
