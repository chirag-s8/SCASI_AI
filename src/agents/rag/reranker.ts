/**
 * @file src/agents/rag/reranker.ts
 * LLM reranking of top chunks by relevance to query.
 */

import { z } from 'zod';
import { llmRouter } from '../../llm/router';
import type { ScoredChunk } from './types';

const RERANK_THRESHOLD = 5;

const RerankOutputSchema = z.object({
    rankings: z.array(z.object({
        index: z.number().int().min(0),
        score: z.number().min(0).max(1),
    })),
});

const RERANK_SYSTEM = `You are a relevance scoring expert. Given a query and a list of text chunks, score each chunk's relevance to the query on a scale of 0 to 1.
Return JSON with format: { "rankings": [{ "index": 0, "score": 0.95 }, ...] }
Score 1.0 = perfectly relevant, 0.0 = completely irrelevant. Be precise.`;

function buildRerankPrompt(query: string, chunks: ScoredChunk[]): string {
    const chunkList = chunks.map((c, i) =>
        `[${i}] ${c.chunkText.slice(0, 500)}`
    ).join('\n\n');

    return `Query: "${query}"\n\nChunks:\n${chunkList}\n\nScore each chunk's relevance to the query.`;
}

export async function rerankChunks(
    query: string,
    chunks: ScoredChunk[],
    traceId?: string
): Promise<ScoredChunk[]> {
    if (chunks.length <= RERANK_THRESHOLD) {
        return chunks;
    }

    try {
        const result = await llmRouter.generateText('rerank', buildRerankPrompt(query, chunks), {
            schema: RerankOutputSchema,
            systemPrompt: RERANK_SYSTEM,
            traceId,
            temperature: 0.1,
            maxTokens: 1024,
        });

        if (!result.data) return chunks;

        const scoreMap = new Map<number, number>();
        for (const r of result.data.rankings) {
            if (r.index >= 0 && r.index < chunks.length) {
                scoreMap.set(r.index, r.score);
            }
        }

        const reranked = chunks.map((chunk, i) => ({
            ...chunk,
            rerankedScore: scoreMap.get(i) ?? chunk.combinedScore,
        }));

        reranked.sort((a, b) => (b.rerankedScore ?? 0) - (a.rerankedScore ?? 0));
        return reranked;
    } catch {
        return chunks;
    }
}
