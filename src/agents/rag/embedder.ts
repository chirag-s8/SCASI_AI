/**
 * @file src/agents/rag/embedder.ts
 * Embedding with per-text hash caching.
 * Gracefully handles missing API key — returns nulls so callers can skip.
 */

import { llmRouter } from '../../llm/router';
import { getCachedEmbedding, setCachedEmbedding } from './cache';

const BATCH_SIZE = 100;

/**
 * Embed multiple texts. Returns an array matching `texts` length.
 * Cached texts always return their embeddings.
 * If the embed provider is unavailable, uncached texts get `null` instead of
 * throwing — callers should skip null entries when storing embeddings.
 */
export async function embedTexts(
    texts: string[],
    traceId?: string
): Promise<(number[] | null)[]> {
    if (texts.length === 0) return [];

    const results: (number[] | null)[] = new Array(texts.length).fill(null);
    const uncachedIndices: number[] = [];

    for (let i = 0; i < texts.length; i++) {
        const cached = await getCachedEmbedding(texts[i]);
        if (cached) {
            results[i] = cached;
        } else {
            uncachedIndices.push(i);
        }
    }

    if (uncachedIndices.length === 0) return results;

    try {
        for (let batchStart = 0; batchStart < uncachedIndices.length; batchStart += BATCH_SIZE) {
            const batchIndices = uncachedIndices.slice(batchStart, batchStart + BATCH_SIZE);
            const batchTexts = batchIndices.map(i => texts[i]);

            const embedResult = await llmRouter.embed(batchTexts, { traceId });

            for (let j = 0; j < batchIndices.length; j++) {
                const originalIdx = batchIndices[j];
                const embedding = embedResult.embeddings[j];
                results[originalIdx] = embedding;
                await setCachedEmbedding(texts[originalIdx], embedding);
            }
        }
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[embedder] Embedding unavailable, skipping ${uncachedIndices.length} texts: ${msg}`);
    }

    return results;
}

/**
 * Embed a single text. Throws on failure so callers (e.g. hybridSearch)
 * can catch and fall back to FTS-only search.
 */
export async function embedSingleText(
    text: string,
    traceId?: string
): Promise<number[]> {
    const cached = await getCachedEmbedding(text);
    if (cached) return cached;

    const result = await llmRouter.embed([text], { traceId });
    const embedding = result.embeddings[0];
    await setCachedEmbedding(text, embedding);
    return embedding;
}
