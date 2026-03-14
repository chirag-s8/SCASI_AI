/**
 * @file src/agents/rag/repository.ts
 * Supabase operations for emails + email_chunks with ingest_status lifecycle.
 */

import { getServiceRoleClient } from '../_shared/supabase';
import type { EmailChunk, IngestStatus } from './types';
import { safeISODate } from '../../../lib/dateUtils';

/**
 * Ensures a user row exists in public.users using the service-role client.
 * Called before any FK-dependent insert so the same DB client is used.
 */
export async function ensureUser(
    userId: string,
    email: string,
    name?: string | null,
    image?: string | null
): Promise<void> {
    const db = getServiceRoleClient();
    const { error } = await db
        .from('users')
        .upsert(
            { id: userId, email: email.toLowerCase(), name, image },
            { onConflict: 'id' }
        );

    if (error) {
        console.error('[rag/repository] ensureUser failed:', error.message, { userId, email });
        throw new Error(`Failed to ensure user exists: ${error.message}`);
    }
}

export async function upsertEmail(userId: string, email: {
    gmailId: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body: string;
}): Promise<string> {
    const db = getServiceRoleClient();

    const { data, error } = await db
        .from('emails')
        .upsert({
            user_id: userId,
            gmail_id: email.gmailId,
            subject: email.subject,
            from: email.from,
            date: safeISODate(email.date) || new Date().toISOString(),
            snippet: email.snippet,
            body: email.body,
            ingest_status: 'pending',
        }, { onConflict: 'user_id,gmail_id' })
        .select('id')
        .single();

    if (error) throw new Error(`DB upsert email failed: ${error.message}`);
    return data.id;
}

export async function updateIngestStatus(
    emailId: string,
    status: IngestStatus
): Promise<void> {
    const db = getServiceRoleClient();
    const { error } = await db
        .from('emails')
        .update({ ingest_status: status })
        .eq('id', emailId);

    if (error) throw new Error(`DB update ingest_status failed: ${error.message}`);
}

export async function deleteChunksForEmail(emailId: string): Promise<void> {
    const db = getServiceRoleClient();
    const { error } = await db
        .from('email_chunks')
        .delete()
        .eq('email_id', emailId);

    if (error) throw new Error(`DB delete chunks failed: ${error.message}`);
}

export async function insertChunks(chunks: EmailChunk[]): Promise<void> {
    if (chunks.length === 0) return;

    const db = getServiceRoleClient();
    const rows = chunks.map(c => ({
        email_id: c.emailId,
        chunk_index: c.chunkIndex,
        chunk_type: c.chunkType,
        chunk_text: c.chunkText,
        embedding: c.embedding ? `[${c.embedding.join(',')}]` : null,
    }));

    const { error } = await db.from('email_chunks').insert(rows);
    if (error) throw new Error(`DB insert chunks failed: ${error.message}`);
}

export async function updateChunkEmbeddings(
    emailId: string,
    embeddings: Map<number, number[]>
): Promise<void> {
    const db = getServiceRoleClient();

    const updates = Array.from(embeddings.entries()).map(([chunkIndex, embedding]) =>
        db
            .from('email_chunks')
            .update({ embedding: `[${embedding.join(',')}]` })
            .eq('email_id', emailId)
            .eq('chunk_index', chunkIndex)
            .then(({ error }) => {
                if (error) throw new Error(`DB update embedding chunk ${chunkIndex}: ${error.message}`);
            })
    );

    await Promise.all(updates);
}

export async function getEmailsNeedingIndex(userId: string, limit: number = 100): Promise<Array<{
    id: string;
    gmail_id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
    body: string;
}>> {
    const db = getServiceRoleClient();
    const { data, error } = await db
        .from('emails')
        .select('id, gmail_id, subject, from, date, snippet, body')
        .eq('user_id', userId)
        .in('ingest_status', ['pending', 'failed'])
        .order('date', { ascending: false })
        .limit(limit);

    if (error) throw new Error(`DB fetch pending emails failed: ${error.message}`);
    return data ?? [];
}
