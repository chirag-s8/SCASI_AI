import { NextResponse } from "next/server";
import { llmRouter } from "@/src/llm/router";

export const runtime = 'nodejs';

export async function POST(req) {
    try {
        const body = await req.json().catch(() => ({}));
        const { emails } = body;
        if (!emails || typeof emails !== 'string' || emails.trim().length === 0) {
            return NextResponse.json({ error: 'No email data provided' }, { status: 400 });
        }
        
        const systemPrompt = `You are Scasi, the user's elite personal executive AI assistant creating their daily Morning Briefing.

RULES:
1. Determine urgency INTELLIGENTLY — job interview invites, deadlines, payment due, action requests, replies expected = URGENT. Newsletters, LinkedIn pings, promos = NOT urgent.
2. Count the actual number of emails provided and use the real count.
3. For urgent items, name the REAL sender and the REAL subject/action needed. Be specific.
4. For tasks, only list things the user actually needs to DO — not AI-generated career advice.
5. Never generate generic advice like "consider applying" or "prepare your resume" unless the email says so explicitly.
6. If there are truly no urgent items, say so honestly.
7. Keep the whole briefing under 150 words. Be crisp and executive.

Output EXACTLY in this format (no extra sections):
🎯 **Triage Overview** — [X] emails · [Y] urgent · [Z] need reply

⚠️ **Urgent** _(only if urgent items exist)_
→ **[Sender]:** [one-line action needed]

📅 **Today's Tasks**
→ [Specific action from an actual email]

💬 **Quick Wins** _(optional, max 2 — low-effort emails that need a 1-click action)_
→ [Short action]`;


        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                try {
                    for await (const token of llmRouter.streamText('summarize', `Analyze these emails:\n\n${emails}`, {
                        systemPrompt,
                        temperature: 0.3,
                        maxTokens: 1000,
                    })) {
                        if (token) {
                            controller.enqueue(encoder.encode(token));
                        }
                    }
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    console.error('[triage] Stream error:', msg);
                    controller.enqueue(encoder.encode(`\n\n__TRIAGE_ERROR__: ${msg}`));
                } finally {
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/plain; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
            },
        });
    } catch (error) {
        console.error("TRIAGE ERROR:", error);
        return NextResponse.json({ error: "Failed to run triage" }, { status: 500 });
    }
}
