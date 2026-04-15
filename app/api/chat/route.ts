import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { ensureUserExists } from '@/lib/supabase';
import { ensureUser } from '@/src/agents/rag/repository';
import { orchestratorAgent } from '@/src/agents/orchestrator';
import { TraceId, UserId, SessionId } from '@/src/agents/_shared/types';
import type { AgentContext } from '@/src/agents/_shared/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    let userId: string;
    try {
        userId = await ensureUserExists(session);
        await ensureUser(userId, session.user?.email ?? '', session.user?.name, session.user?.image);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Failed to provision user';
        console.error('[/api/chat] ensureUserExists failed:', message);
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const body = await req.json().catch(() => null);
    if (!body?.userMessage || typeof body.userMessage !== 'string') {
        return new Response(JSON.stringify({ error: 'userMessage is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const { userMessage, sessionId, emailContext } = body;

    // Forward Gmail access token so orchestrator tools can query live inbox
    const accessToken = (session as Record<string, unknown>).accessToken as string | undefined;

    const traceId = TraceId(crypto.randomUUID());
    const ctx: AgentContext = {
        traceId,
        userId: UserId(userId),
        sessionId: sessionId ? SessionId(sessionId) : undefined,
        requestedAt: new Date().toISOString(),
        agentName: 'orchestrator',
        signal: req.signal,
        metadata: accessToken ? { accessToken } : undefined,
    };

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            try {
                for await (const event of orchestratorAgent.streamExecute(ctx, {
                    userMessage,
                    sessionId,
                    emailContext,
                })) {
                    if (req.signal.aborted) break;
                    const sse = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
                    controller.enqueue(encoder.encode(sse));
                }
            } catch (err: unknown) {
                // AbortError = client disconnected — close stream cleanly, no error event
                if (err instanceof Error && err.name === 'AbortError') {
                    // Stream ends naturally via finally → controller.close()
                } else {
                    const errorEvent = {
                        type: 'error',
                        code: 'STREAM_ERROR',
                        message: err instanceof Error ? err.message : 'Unknown error',
                    };
                    const sse = `event: error\ndata: ${JSON.stringify(errorEvent)}\n\n`;
                    controller.enqueue(encoder.encode(sse));
                }
            } finally {
                controller.close();
            }
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no',
        },
    });
}
