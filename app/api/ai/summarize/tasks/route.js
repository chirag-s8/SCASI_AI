import { NextResponse } from "next/server";
import { nlpAgent } from "@/src/agents/nlp";

export async function POST(req) {
    try {
        const body = await req.json().catch(() => null);
        if (!body?.text) {
            return NextResponse.json({ error: "text field is required" }, { status: 400 });
        }

        const result = await nlpAgent.extractTasks({ text: body.text });

        return NextResponse.json({ tasks: result.tasks });
    } catch (err) {
        console.error("Tasks route error:", err);

        if (err?.message?.includes('rate')) {
            return NextResponse.json(
                { error: "Rate limit reached", tasks: [] },
                { status: 429 }
            );
        }

        return NextResponse.json(
            { error: "Internal server error", tasks: [] },
            { status: 500 }
        );
    }
}
