import { NextResponse } from "next/server";
import { nlpAgent } from "@/src/agents/nlp";

export async function POST(req) {
    try {
        const { subject, snippet, from, date } = await req.json();

        const result = await nlpAgent.summarize({
            subject: subject || "",
            snippet: snippet || "",
            from: from || undefined,
            date: date || undefined,
        });

        const formatted = [
            `📩 From: ${result.from}`,
            `📅 Received Date: ${result.receivedDate}`,
            result.deadline ? `⏳ Deadline: ${result.deadline}` : null,
            `📌 Summary: ${result.summary}`,
        ]
            .filter(Boolean)
            .join('\n');

        return NextResponse.json({ summary: formatted });
    } catch (error) {
        console.error("SUMMARY ERROR:", error);

        if (error?.message?.includes('rate')) {
            return NextResponse.json(
                { summary: "⚠️ Rate limit reached. Please wait 1 minute and try again." },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { summary: "❌ Error generating summary" },
            { status: 500 }
        );
    }
}
