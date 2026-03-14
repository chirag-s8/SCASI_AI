/**
 * @file src/agents/rag/contextSelector.ts
 * Token-budget enforcement, dedup by email_id, select highest-scoring chunks.
 */

import type { ScoredChunk } from './types';
import { estimateTokens } from '../_shared/utils';

const MAX_CHUNKS_PER_EMAIL = 3;

export function selectContext(
    chunks: ScoredChunk[],
    budgetTokens: number
): { selected: ScoredChunk[]; contextBlock: string } {
    const sorted = [...chunks].sort(
        (a, b) => (b.rerankedScore ?? b.combinedScore) - (a.rerankedScore ?? a.combinedScore)
    );

    const emailChunkCounts = new Map<string, number>();
    const selected: ScoredChunk[] = [];
    let totalTokens = 0;

    for (const chunk of sorted) {
        const currentCount = emailChunkCounts.get(chunk.emailId) ?? 0;
        if (currentCount >= MAX_CHUNKS_PER_EMAIL) continue;

        const chunkTokens = estimateTokens(chunk.chunkText);
        if (totalTokens + chunkTokens > budgetTokens) {
            if (selected.length > 0) break;
        }

        selected.push(chunk);
        totalTokens += chunkTokens;
        emailChunkCounts.set(chunk.emailId, currentCount + 1);

        if (totalTokens >= budgetTokens) break;
    }

    const contextBlock = selected
        .map((c, i) => `[Source ${i + 1}] (email: ${c.emailId}, type: ${c.chunkType})\n${c.chunkText}`)
        .join('\n\n---\n\n');

    return { selected, contextBlock };
}
