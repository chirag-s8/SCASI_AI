import { NextResponse } from "next/server";
import { nlpAgent } from "@/src/agents/nlp";

export async function POST(req) {
    try {
        const { subject, snippet } = await req.json();

        const result = await nlpAgent.draftReply({ subject: subject || "", snippet: snippet || "" });

        return NextResponse.json({
            reply: result.reply,
        });
    } catch (err) {
        console.error("Reply API Error:", err.message);

        if (err?.message?.includes('rate')) {
            return NextResponse.json(
                { reply: "⚠️ Rate limit reached. Please wait and try again." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: err.message },
            { status: 500 }
        );
    }
}
