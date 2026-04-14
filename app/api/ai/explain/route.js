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

        const result = await nlpAgent.explain({
            subject: subject || "",
            snippet: snippet || "",
        });

        const explanation = result.bullets.join('\n');

        return NextResponse.json({ explanation });
    } catch (error) {
        console.error("EXPLAIN ERROR:", error);

        if (error?.message?.includes('rate')) {
            return NextResponse.json(
                { explanation: "⚠️ Rate limit reached. Please wait 1 minute before retrying." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { explanation: "❌ Error generating explanation" },
            { status: 500 }
        );
    }
}
