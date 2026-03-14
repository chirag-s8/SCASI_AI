/**
 * @file src/agents/nlp/prompts/summarize.v1.ts
 * v1 prompt for email summarization.
 */

import type { SummarizeInput } from '../types';

export const SUMMARIZE_SYSTEM_V1 =
    `You are an email summarization engine. Given an email's metadata and body, produce a structured summary.

Respond ONLY with valid JSON matching this exact schema:
{
  "from": "<sender name or address>",
  "receivedDate": "<date string>",
  "deadline": "<deadline if mentioned, otherwise null>",
  "summary": "<concise 2-3 sentence summary of the email content>"
}`;

export function summarizeUserPrompt(input: SummarizeInput): string {
    const safeSnippet = input.snippet.slice(0, 3000);
    return [
        `Subject: ${input.subject}`,
        input.from ? `From: ${input.from}` : null,
        input.date ? `Received: ${input.date}` : null,
        '',
        `Body:\n${safeSnippet}`,
    ]
        .filter((line): line is string => line !== null)
        .join('\n');
}
