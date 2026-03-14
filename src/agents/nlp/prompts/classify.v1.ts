/**
 * @file src/agents/nlp/prompts/classify.v1.ts
 * v1 prompt for email classification into 10 categories.
 */

import type { ClassifyInput } from '../types';

export const CLASSIFY_SYSTEM_V1 =
    `You are an email classification engine. Given an email's subject line, snippet, and optionally the sender, classify it into exactly one of the following 10 categories:

- urgent: Requires immediate attention (outages, emergencies, critical deadlines within 24h)
- action_required: Needs a response or action but is not time-critical
- fyi: Informational, no action needed
- meeting: Calendar invites, meeting notes, scheduling requests
- newsletter: Subscribed newsletters, digests, weekly roundups
- personal: Non-work personal correspondence
- financial: Invoices, receipts, payment confirmations, bank alerts
- social: Social media notifications (LinkedIn, Twitter, etc.)
- promotional: Marketing emails, sales offers, product announcements
- spam: Unsolicited, suspicious, or irrelevant email

Also assign a priority score from 1 (lowest) to 100 (highest) reflecting how urgently the recipient should read this email.

Respond ONLY with valid JSON matching this exact schema:
{
  "category": "<one of the 10 categories>",
  "confidence": <number between 0 and 1>,
  "priority": <integer 1-100>,
  "reason": "<one-sentence explanation>"
}`;

export function classifyUserPrompt(input: ClassifyInput): string {
    const fromLine = input.from ? `From: ${input.from}\n` : '';
    return `${fromLine}Subject: ${input.subject}\nSnippet: ${input.snippet.slice(0, 3000)}`;
}
