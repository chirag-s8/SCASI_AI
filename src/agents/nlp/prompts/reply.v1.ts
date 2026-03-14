/**
 * @file src/agents/nlp/prompts/reply.v1.ts
 * v1 prompt for drafting email replies.
 */

import type { DraftReplyInput } from '../types';

export const REPLY_SYSTEM_V1 =
    `You are an email reply assistant. Given an email subject and body, draft a short, polite reply.

Respond ONLY with valid JSON matching this exact schema:
{
  "reply": "<the reply message text>"
}`;

export function replyUserPrompt(input: DraftReplyInput): string {
    const safeSnippet = input.snippet.slice(0, 3000);
    return [
        `Tone: ${input.tone}`,
        `Subject: ${input.subject}`,
        '',
        `Email Content:\n${safeSnippet}`,
        '',
        'Draft a reply:',
    ].join('\n');
}
