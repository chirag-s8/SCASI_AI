import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { google } from 'googleapis';
import { ensureUserExists } from '@/lib/supabase';
import { ragAgent } from '@/src/agents/rag';
import { ensureUser } from '@/src/agents/rag/repository';
import { pMap } from '@/src/agents/_shared/utils';
import { safeISODate } from '@/lib/dateUtils';

const DEFAULT_MAX_EMAILS = 50;

function decodeBase64(data: string): string {
    return Buffer.from(
        data.replace(/-/g, '+').replace(/_/g, '/'),
        'base64'
    ).toString('utf-8');
}

function extractBody(payload: Record<string, unknown>): string {
    if (!payload) return '';

    const parts = payload.parts as Array<Record<string, unknown>> | undefined;
    if (parts) {
        for (const part of parts) {
            if (part.mimeType === 'text/html' && (part.body as Record<string, string>)?.data) {
                return decodeBase64((part.body as Record<string, string>).data);
            }
        }
        for (const part of parts) {
            if (part.mimeType === 'text/plain' && (part.body as Record<string, string>)?.data) {
                return decodeBase64((part.body as Record<string, string>).data);
            }
        }
    }

    const body = payload.body as Record<string, string> | undefined;
    if (body?.data) {
        return decodeBase64(body.data);
    }

    return '';
}

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !(session as Record<string, unknown>).accessToken) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
        userId = await ensureUserExists(session);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to provision user';
        console.error('[index-emails] ensureUserExists failed:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }

    // Belt-and-suspenders: also ensure user via the RAG repository's own DB client
    // to eliminate any Supabase client mismatch issues.
    try {
        await ensureUser(
            userId,
            session.user?.email ?? '',
            session.user?.name,
            session.user?.image
        );
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to ensure user in RAG DB';
        console.error('[index-emails] ensureUser (repository) failed:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }

    const body = await req.json().catch(() => ({}));
    const maxEmails = Math.min(
        (body as Record<string, number>).maxEmails ?? DEFAULT_MAX_EMAILS,
        100
    );

    const auth = new google.auth.OAuth2();
    auth.setCredentials({
        access_token: (session as Record<string, string>).accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth });

    // Fetch message IDs
    const listRes = await gmail.users.messages.list({
        userId: 'me',
        maxResults: maxEmails,
    });

    const messages = listRes.data.messages || [];
    if (messages.length === 0) {
        return NextResponse.json({ indexed: 0, failed: 0, total: 0 });
    }

    // Fetch full content for each email (10 concurrent)
    const validMessages = messages.filter(m => m.id);

    const fetchResults = await pMap(
        validMessages,
        async (m) => {
            try {
                const msg = await gmail.users.messages.get({
                    userId: 'me',
                    id: m.id as string,
                    format: 'full',
                });

                const headers = msg.data.payload?.headers || [];
                const getHeader = (name: string) =>
                    headers.find(h => h.name === name)?.value || '';

                return {
                    gmailId: m.id as string,
                    subject: getHeader('Subject'),
                    from: getHeader('From'),
                    date: safeISODate(getHeader('Date')) || new Date().toISOString(),
                    snippet: msg.data.snippet || '',
                    body: extractBody(msg.data.payload as Record<string, unknown>),
                };
            } catch (err: unknown) {
                console.error(`[index-emails] Failed to fetch message ${m.id}:`, err);
                return null;
            }
        },
        10
    );

    const emails = fetchResults.filter(
        (e): e is NonNullable<typeof e> => e !== null
    );

    // Index via RAG agent
    const result = await ragAgent.upsertEmails({
        emails,
        userId,
    });

    return NextResponse.json({
        total: emails.length,
        indexed: result.indexed,
        failed: result.failed,
        errors: result.errors.slice(0, 10),
    });
}
