import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.text) {
      return NextResponse.json({ error: "text field is required" }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 });
    }

    const { text } = body;

    const prompt = `
Extract tasks and deadlines from this email.

Return JSON only in this format:

{
  "tasks": [
    {
      "task": "Submit resume",
      "deadline": "Tomorrow"
    }
  ]
}

Email:
${text.slice(0, 4000)}
`;

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("OpenAI Tasks Error:", errData);
      return NextResponse.json({ error: "OpenAI API error", tasks: [] }, { status: res.status });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content || "";

    // Safely extract JSON block from response
    const match = raw.match(/\{[\s\S]*\}/);
    let output = { tasks: [] };
    if (match) {
      try {
        output = JSON.parse(match[0]);
      } catch {
        output = { tasks: [] };
      }
    }

    return NextResponse.json(output);
  } catch (err) {
    console.error("Tasks route error:", err);
    return NextResponse.json({ error: "Internal server error", tasks: [] }, { status: 500 });
  }
}
