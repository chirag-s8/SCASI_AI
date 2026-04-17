import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import { llmRouter } from '@/src/llm/router';
import { z } from 'zod';

const ComposeIntentSchema = z.object({
    recipientName: z.string(),
    ccNames: z.array(z.string()).catch([]),
    subject: z.string(),
    intent: z.string(),
    tone: z.enum(['professional', 'casual', 'formal', 'friendly', 'firm', 'grateful']).default('professional'),
    deadline: z.string().nullable().catch(null),
});

const DraftSchema = z.object({
    subject: z.string(),
    body: z.string(),
});

const EXTRACT_SYSTEM = `You are an email composition assistant. Extract the recipient name, CC names, subject, intent, tone, and deadline from the user's natural language prompt.

Return JSON:
{
  "recipientName": "first name or full name of the primary recipient",
  "ccNames": ["name of person to CC"],
  "subject": "a concise email subject line",
  "intent": "what the email should say in 1-2 sentences",
  "tone": "professional | casual | formal | friendly | firm | grateful",
  "deadline": "deadline string if mentioned, or null"
}

CC detection: look for "keep X in CC", "CC X", "copy X", "also CC", "with X in copy". ccNames is [] if none mentioned.

Examples:
- "Send a mail to Saloni and keep Chirag in CC that she has to send the report by tomorrow" → { "recipientName": "Saloni", "ccNames": ["Chirag"], "subject": "Report Submission Reminder", "intent": "Remind Saloni to send the report by tomorrow.", "tone": "professional", "deadline": "tomorrow" }
- "Write a friendly email to Rahul saying thanks for the help last week" → { "recipientName": "Rahul", "ccNames": [], "subject": "Thank You!", "intent": "Thank Rahul for his help last week.", "tone": "friendly", "deadline": null }
- "Email John about the meeting, CC Sarah and Mike" → { "recipientName": "John", "ccNames": ["Sarah", "Mike"], "subject": "Meeting", "intent": "Inform John about the meeting.", "tone": "professional", "deadline": null }`;

const DRAFT_SYSTEM = `You are an expert email writer. Write a complete, ready-to-send email body based on the given intent and tone.

Rules:
- Write ONLY the email body (no subject line, no metadata)
- Start with an appropriate greeting using the recipient name
- Keep it concise and on-point
- End with an appropriate sign-off using the sender's name exactly as provided — never use placeholders like [Your Name]

Return JSON: { "subject": "refined subject line", "body": "complete email body" }`;

export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.prompt || typeof body.prompt !== 'string') {
        return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    // Resolve sender name: body override → session name → email prefix
    const senderName: string =
        (typeof body.senderName === 'string' && body.senderName.trim())
            ? body.senderName.trim()
            : (session.user as { name?: string })?.name?.trim() ||
              ((session.user as { email?: string })?.email ?? '').split('@')[0] ||
              'Me';

    const traceId = crypto.randomUUID();

    // Step 1: Extract intent from the prompt
    const intentResult = await llmRouter.generateText('extract', body.prompt, {
        schema: ComposeIntentSchema,
        systemPrompt: EXTRACT_SYSTEM,
        traceId,
        temperature: 0.2,
        maxTokens: 256,
    });

    if (!intentResult.data) {
        return NextResponse.json({ error: 'Failed to parse compose intent' }, { status: 500 });
    }

    const intent = intentResult.data;

    // Step 2: Draft the email body
    const draftPrompt = `Recipient: ${intent.recipientName}
Subject: ${intent.subject}
Intent: ${intent.intent}
Tone: ${intent.tone}
Sender name (use exactly in sign-off): ${senderName}
${intent.deadline ? `Deadline: ${intent.deadline}` : ''}

Write the email body.`;

    const draftResult = await llmRouter.generateText('reply', draftPrompt, {
        schema: DraftSchema,
        systemPrompt: DRAFT_SYSTEM,
        traceId,
        temperature: 0.6,
        maxTokens: 512,
    });

    if (!draftResult.data) {
        return NextResponse.json({ error: 'Failed to draft email' }, { status: 500 });
    }

    return NextResponse.json({
        recipientName: intent.recipientName,
        ccNames: intent.ccNames ?? [],
        subject: draftResult.data.subject || intent.subject,
        body: draftResult.data.body,
        tone: intent.tone,
        deadline: intent.deadline,
    });
}
