import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { llmRouter } from "@/src/llm/router";

export const runtime = 'nodejs';

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json().catch(() => ({}));
        const { emails } = body;
        if (!emails || typeof emails !== 'string' || emails.trim().length === 0) {
            return NextResponse.json({ error: 'No email data provided' }, { status: 400 });
        }

        const now = new Date();
        const timeStr = now.toLocaleString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
        });

        const systemPrompt = `You are Scasi, the user's elite personal executive AI assistant. It is currently ${timeStr}.

Your job: analyze the user's inbox and produce a structured JSON triage briefing that is GENUINELY USEFUL and ACTIONABLE.

CRITICAL RULES:
1. Be SPECIFIC — name real senders, real subjects, real deadlines. Never be vague.
2. Focus on ACTIONS — tell the user what to DO, not what the email is about. Bad: "John sent a budget proposal." Good: "Reply to John with Q2 budget feedback by Friday."
3. Urgency must be INTELLIGENT — a job interview invite is urgent, a LinkedIn connection request is not. Payment due tomorrow is urgent, a newsletter is not.
4. If an email mentions a time/date, calculate how soon that is relative to NOW and mention it ("meeting in 3 hours", "deadline tomorrow").
5. Never generate generic advice like "consider applying" or "prepare your resume" unless the email explicitly asks for it.
6. If there are truly no urgent items, say so honestly — don't fabricate urgency.
7. Each item's "action" should be a clear, specific instruction the user can act on immediately.

Respond with ONLY valid JSON matching this exact schema (no markdown, no code fences, just raw JSON):
{
  "stats": {
    "total": <number of emails analyzed>,
    "urgent": <number of truly urgent emails>,
    "needsReply": <number that need a response>,
    "fyi": <number that are informational only>
  },
  "items": [
    {
      "sender": "<real sender name>",
      "subject": "<real subject line, abbreviated if long>",
      "action": "<specific action the user should take — be concrete and direct>",
      "urgency": "urgent" | "reply_needed" | "fyi",
      "reason": "<brief why this matters or why it's urgent, max 12 words>"
    }
  ]
}

ITEMS RULES:
- List items sorted by urgency: urgent first, then reply_needed, then fyi.
- Include ALL emails in items — don't skip any. Mark low-priority ones as "fyi".
- For "fyi" items, the action can be "No action needed" or "Read when free".
- Maximum 15 items.`;

        // Collect the full response (non-streaming) since we need valid JSON
        let fullResponse = '';
        try {
            for await (const token of llmRouter.streamText('summarize', `Analyze these emails:\n\n${emails}`, {
                systemPrompt,
                temperature: 0.2,
                maxTokens: 2000,
            })) {
                if (token) fullResponse += token;
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error('[triage] LLM error:', msg);
            return NextResponse.json({ error: msg }, { status: 502 });
        }

        // Try to parse the JSON response
        let parsed;
        try {
            // Strip markdown code fences if the LLM wraps them
            const cleaned = fullResponse.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
            parsed = JSON.parse(cleaned);
        } catch {
            console.error('[triage] Failed to parse JSON, returning raw:', fullResponse.slice(0, 200));
            // Fallback: return the raw text so the frontend can still render something
            return NextResponse.json({ raw: fullResponse });
        }

        return NextResponse.json(parsed);
    } catch (error) {
        console.error("TRIAGE ERROR:", error);
        return NextResponse.json({ error: "Failed to run triage" }, { status: 500 });
    }
}
