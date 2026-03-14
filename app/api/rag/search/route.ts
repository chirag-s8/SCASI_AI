import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { ensureUserExists } from '@/lib/supabase';
import { ensureUser } from '@/src/agents/rag/repository';
import { ragAgent } from '@/src/agents/rag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let userId: string;
    try {
        userId = await ensureUserExists(session);
        await ensureUser(userId, session.user?.email ?? '', session.user?.name, session.user?.image);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to provision user';
        console.error('[/api/rag/search] ensureUserExists failed:', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.query || typeof body.query !== 'string') {
        return NextResponse.json(
            { error: 'query is required (string, 1-4000 chars)' },
            { status: 400 }
        );
    }

    const query: string = body.query.trim();
    if (query.length === 0 || query.length > 4000) {
        return NextResponse.json(
            { error: 'query must be 1-4000 characters' },
            { status: 400 }
        );
    }

    const topK = typeof body.topK === 'number' ? Math.min(Math.max(body.topK, 1), 50) : 10;
    const traceId = crypto.randomUUID();

    try {
        const result = await ragAgent.query(
            {
                query,
                userId,
                topK,
                hybridWeight: 0.5,
                similarityThreshold: 0.3,
                contextBudgetTokens: 4000,
                rerank: true,
            },
            traceId
        );

        return NextResponse.json({
            chunks: result.chunks,
            contextBlock: result.contextBlock,
            totalChunksSearched: result.totalChunksSearched,
        });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'RAG search failed';
        console.error('[/api/rag/search]', message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
