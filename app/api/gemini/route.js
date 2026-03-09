import { NextResponse } from "next/server";

export async function POST(req) {
    try {
        const body = await req.json().catch(() => null);
        if (!body?.emailText || !body?.question) {
            return NextResponse.json(
                { error: "emailText and question are required" },
                { status: 400 }
            );
        }

        const { emailText, question } = body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            return NextResponse.json(
                { error: "Gemini API key not configured" },
                { status: 500 }
            );
        }

        const prompt = `
You are an AI assistant for emails.

EMAIL:
${emailText.slice(0, 8000)}

QUESTION:
${question}

Answer clearly:
`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                }),
            }
        );

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            console.error("Gemini API error:", errData);
            return NextResponse.json(
                { error: "Gemini API request failed" },
                { status: response.status }
            );
        }

        const data = await response.json();
        const reply =
            data?.candidates?.[0]?.content?.parts?.[0]?.text ||
            "❌ No response from Gemini";

        return NextResponse.json({ reply });
    } catch (err) {
        console.error("Gemini route error:", err);
        return NextResponse.json(
            { error: "Gemini API failed" },
            { status: 500 }
        );
    }
}
