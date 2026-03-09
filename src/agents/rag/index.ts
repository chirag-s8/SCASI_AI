/**
 * @file src/agents/rag/index.ts
 * RAG (Retrieval-Augmented Generation) Agent
 *
 * Responsible for:
 *  - Chunking and embedding email content into Supabase (pgvector)
 *  - Performing similarity search to retrieve relevant email chunks
 *  - Augmenting LLM prompts with retrieved context
 *
 * TODO: Implement RagAgent class conforming to Agent<RagRequest, RagResponse>
 */

export * from './types';
