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

        switch (validated.action) {
            case 'upsert':
                return this.upsertEmails(validated, traceId);
            case 'query':
                return this.query(validated, traceId);
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }

    async upsertEmails(
        input: RagUpsertEmailRequest,
        traceId?: string
    ): Promise<RagUpsertEmailResponse> {
        const validated = RagUpsertEmailRequestSchema.parse(input);
        let indexed = 0;
        let failed = 0;
        const errors: Array<{ gmailId: string; error: string }> = [];

        for (const email of validated.emails) {
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
                const chunkTexts = chunks.map(c => c.chunkText);
                const embeddings = await embedTexts(chunkTexts, traceId);

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

                indexed++;
            } catch (err: unknown) {
                failed++;
                const msg = err instanceof Error ? err.message : String(err);
                errors.push({ gmailId: email.gmailId, error: msg });
                console.error(`[RagAgent] Failed to index email ${email.gmailId}: ${msg}`);
            }
        }

        return { indexed, failed, errors };
    }

    async query(
        input: RagQueryRequest,
        traceId?: string
    ): Promise<RagQueryResponse> {
        const validated = RagQueryRequestSchema.parse(input);

        // 1. Hybrid search (vector + FTS + RRF)
        const searchResults = await hybridSearch({
            userId: validated.userId,
            query: validated.query,
            topK: validated.topK,
            hybridWeight: validated.hybridWeight,
            traceId,
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
            ? await rerankChunks(validated.query, filtered, traceId)
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
