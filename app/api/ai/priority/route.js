import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { nlpAgent } from "@/src/agents/nlp";

export async function POST(req) {
    try {
        const session = await getServerSession(authOptions);
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { subject, snippet } = await req.json();

        const classification = await nlpAgent.classify({ subject: subject || "", snippet: snippet || "" });

        return NextResponse.json({
            result: {
                score: classification.priority,
                reason: classification.reason,
            },
        });
    } catch (err) {
        console.error("Priority API Error:", err.message);

        if (err?.message?.includes('rate')) {
            return NextResponse.json(
                { result: { score: 50, reason: "Rate limit reached. Please retry shortly." } },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { result: { score: 50, reason: "AI could not generate priority" } },
            { status: 500 }
        );
    }
}
