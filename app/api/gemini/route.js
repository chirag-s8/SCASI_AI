import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { emailText, question } = await req.json();

        if (!emailText || !question) {
            return NextResponse.json({ error: "Missing emailText or question" }, { status: 400 });
        }

        const apiKey = process.env.OPENROUTER_API_KEY_HUNTER;
        if (!apiKey) {
            return NextResponse.json({ error: "OPENROUTER_API_KEY_HUNTER not configured" }, { status: 500 });
        }

        // Truncate to ~12 000 chars to stay within context limits
        const trimmedEmail = emailText.slice(0, 12000);

        const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
                model: "openrouter/hunter-alpha",
                messages: [
                    {
                        role: "system",
                        content: "You are an intelligent email assistant. Answer questions about the email clearly and helpfully. Be concise but thorough.",
                    },
                    {
                        role: "user",
                        content: `Here is the email:\n\n${trimmedEmail}\n\nUser question: ${question}`,
                    },
                ],
                temperature: 0.5,
                max_tokens: 1024,
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            console.error("[Ask AI] OpenRouter error:", resp.status, errText);
            return NextResponse.json({ error: `AI error: ${resp.status}` }, { status: 500 });
        }

        const data = await resp.json();
        const reply = data.choices?.[0]?.message?.content || "No response generated.";

        return NextResponse.json({ reply });
    } catch (err) {
        console.error("[Ask AI] Error:", err);
        return NextResponse.json({ error: "Failed to generate AI response" }, { status: 500 });
    }
}
