/**
 * @file src/agents/rag/index.ts
 * RAG Agent — chunking, embedding, hybrid search, reranking, context selection.
 */

import type { Agent, AgentContext } from '../_shared/types';
import {
    type RagRequest,
    type RagResponse,
    type RagUpsertEmailRequest,
    type RagUpsertEmailResponse,
    type RagQueryRequest,
    type RagQueryResponse,
    RagRequestSchema,
    RagUpsertEmailRequestSchema,
    RagQueryRequestSchema,
} from './types';
import { createAbortError } from '../../llm/router';
import { chunkEmail } from './chunker';
import { embedTexts } from './embedder';
import {
    upsertEmail,
    updateIngestStatus,
    deleteChunksForEmail,
    insertChunks,
    updateChunkEmbeddings,
} from './repository';
import { hybridSearch } from './hybridSearch';
import { rerankChunks } from './reranker';
import { selectContext } from './contextSelector';

export * from './types';
export { chunkEmail } from './chunker';
export { embedTexts, embedSingleText } from './embedder';

export class RagAgent implements Agent<RagRequest, RagResponse> {
    readonly name = 'rag' as const;

    async execute(ctx: AgentContext, req: RagRequest): Promise<RagResponse> {
        const validated = RagRequestSchema.parse(req);
        const traceId = ctx.traceId as string;
        const signal = ctx.signal;

        switch (validated.action) {
            case 'upsert':
                return this.upsertEmails(validated, traceId, signal);
            case 'query':
                return this.query(validated, { traceId, signal });
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }

    async upsertEmails(
        input: RagUpsertEmailRequest,
        traceId?: string,
        signal?: AbortSignal
    ): Promise<RagUpsertEmailResponse> {
        const validated = RagUpsertEmailRequestSchema.parse(input);
        let indexed = 0;
        let failed = 0;
        const errors: Array<{ gmailId: string; error: string }> = [];

        for (const email of validated.emails) {
            // Stop processing if the request was cancelled mid-batch
            if (signal?.aborted) {
                throw createAbortError('Aborted during email upsert batch');
            }
            try {
                // 1. Upsert email to DB (status: pending)
                const emailId = await upsertEmail(validated.userId, email);

                // 2. Chunk the email
                const chunks = chunkEmail({
                    emailId,
                    subject: email.subject,
                    from: email.from,
                    date: email.date,
                    snippet: email.snippet,
                    body: email.body,
                });

                // 3. Delete old chunks and insert new ones
                await deleteChunksForEmail(emailId);
                await insertChunks(chunks);
                await updateIngestStatus(emailId, 'ingested');

                // 4. Embed all chunk texts (graceful — skips if provider unavailable)
                if (!validated.skipEmbedding) {
                    const chunkTexts = chunks.map(c => c.chunkText);
                    const embeddings = await embedTexts(chunkTexts, traceId, signal);

                    // 5. Update chunks with embeddings (only for non-null results)
                    const embeddingMap = new Map<number, number[]>();
                    chunks.forEach((c, i) => {
                        const emb = embeddings[i];
                        if (emb && emb.length > 0) {
                            embeddingMap.set(c.chunkIndex, emb);
                        }
                    });

                    if (embeddingMap.size > 0) {
                        await updateChunkEmbeddings(emailId, embeddingMap);
                        await updateIngestStatus(emailId, 'indexed');
                    } else {
                        // Chunks stored but no embeddings — FTS search still works
                        console.warn(`[RagAgent] Email ${email.gmailId} ingested without embeddings (FTS only)`);
                    }
                } else {
                    console.log(`[RagAgent] Fast-indexing email ${email.gmailId} without vectors (Backfill)`);
                }

                indexed++;
            } catch (err: unknown) {
                // Rethrow AbortError — don't swallow cancellation as an indexing failure
                if (err instanceof Error && err.name === 'AbortError') throw err;
                failed++;
                const msg = err instanceof Error ? err.message : String(err);
                errors.push({ gmailId: email.gmailId, error: msg });
                console.error(`[RagAgent] Failed to index email ${email.gmailId}: ${msg}`);
            }
        }

        return { indexed, failed, errors };
    }

    /** Query the RAG index for relevant chunks.
     *  Uses an options object for the signal/traceId params to avoid brittle
     *  positional argument changes when new options are added. */
    async query(
        input: RagQueryRequest,
        options?: { signal?: AbortSignal; traceId?: string },
    ): Promise<RagQueryResponse> {
        const validated = RagQueryRequestSchema.parse(input);

        // 1. Hybrid search (vector + FTS + RRF)
        const searchResults = await hybridSearch({
            userId: validated.userId,
            query: validated.query,
            topK: validated.topK,
            hybridWeight: validated.hybridWeight,
            traceId: options?.traceId,
            signal: options?.signal,
        });

        // 2. Filter by similarity threshold
        const filtered = searchResults.filter(
            c => c.vectorScore >= validated.similarityThreshold || c.ftsScore > 0
        );

        if (filtered.length === 0) {
            return { chunks: [], contextBlock: '', totalChunksSearched: searchResults.length };
        }

        // 3. Rerank (skips if <= 5 results to save credits)
        const reranked = validated.rerank
            ? await rerankChunks(validated.query, filtered, options?.traceId, options?.signal)
            : filtered;

        // 4. Select context within token budget
        const { selected, contextBlock } = selectContext(
            reranked,
            validated.contextBudgetTokens
        );

        return {
            chunks: selected,
            contextBlock,
            totalChunksSearched: searchResults.length,
        };
    }
}

export const ragAgent = new RagAgent();
