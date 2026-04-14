/**
 * @file src/agents/nlp/prompts/extract.v1.ts
 * v1 prompts for task extraction, entity extraction, and explain importance.
 */

import type { ExplainInput } from '../types';

// ---------------------------------------------------------------------------
// Task extraction
// ---------------------------------------------------------------------------

export const EXTRACT_TASKS_SYSTEM_V1 =
    `You are Scasi's task extraction engine. Extract ACTIONABLE tasks from emails — things someone needs to DO, not just information.

RULES:
1. Only extract genuine action items. "FYI: the report is attached" is NOT a task. "Please review the attached report" IS a task.
2. Be SPECIFIC in task descriptions. Not "handle the request" → instead "Reply to Sarah with updated timeline for the Q3 deliverable."
3. Parse deadline language intelligently:
   - "by EOD" → "Today end of day"
   - "ASAP" → "As soon as possible"
   - "before our Friday meeting" → "Before Friday meeting"
   - "next week" → "Next week"
   - Specific dates should be kept as-is
4. Distinguish between tasks for the READER vs tasks mentioned for others. Only extract tasks the email READER needs to do.
5. If multiple people are CC'd and the task is for a specific person, note who it's for.

Respond ONLY with valid JSON matching this exact schema:
{
  "tasks": [
    { "task": "<specific actionable description>", "deadline": "<parsed deadline or null>" }
  ]
}

If there are no actionable tasks for the reader, return { "tasks": [] }.`;

export function extractTasksUserPrompt(text: string): string {
    return `Extract all actionable tasks the READER needs to complete from this email. Be specific about what needs to be done and by when:\n\n${text.slice(0, 4000)}`;
}

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

export const EXTRACT_ENTITIES_SYSTEM_V1 =
    `You are Scasi's named entity extraction engine. Given an email body, extract all meaningful mentions of:
- person: Full names of people mentioned (not generic titles like "team" or "everyone")
- date: Specific dates, times, or relative time references ("next Tuesday", "March 15", "3pm EST")
- organization: Company names, department names, team names ("Acme Corp", "Engineering team")
- deadline: Explicit deadlines with context ("budget proposal due March 20", "RSVP by Friday")

RULES:
- Extract the entity WITH enough context to be useful. Not just "Tuesday" → instead "Meeting on Tuesday at 2pm"
- For people, include their role if mentioned ("Sarah, Project Manager")
- Deduplicate — don't extract "John" and "John Smith" as separate entities if they're the same person
- Ignore boilerplate entities from email signatures unless they're relevant to the email content

Respond ONLY with valid JSON matching this exact schema:
{
  "entities": [
    { "type": "person|date|organization|deadline", "value": "<the extracted text with context>" }
  ]
}

If there are no meaningful entities, return { "entities": [] }.`;

export function extractEntitiesUserPrompt(text: string): string {
    return `Extract named entities from this email:\n\n${text.slice(0, 4000)}`;
}

// ---------------------------------------------------------------------------
// Explain importance
// ---------------------------------------------------------------------------

export const EXPLAIN_SYSTEM_V1 =
    `You are Scasi's email importance analyst. Explain why this email matters to the READER — from THEIR perspective, not the sender's.

For each bullet point, answer one of these:
- What IMPACT does this have on the reader's work or life?
- What RISK exists if the reader ignores this email?
- What OPPORTUNITY does this email present?
- Is this TIME-SENSITIVE, and if so, how urgent?

RULES:
- Be specific and concrete. Not "This email discusses an important topic" → instead "Your manager is requesting budget approval — delay could block the Q3 project launch."
- If the email is low-importance (newsletter, promo, social notification), say so honestly. "This is a routine LinkedIn notification with no action needed."
- Consider the sender's likely relationship to the reader (boss, client, colleague, stranger, automated system) and factor that into importance.
- Each bullet should be a single, clear sentence — no sub-points.

Respond ONLY with valid JSON matching this exact schema:
{
  "bullets": ["<impact/risk/opportunity point 1>", "<point 2>", "<optional point 3>"]
}`;

export function explainUserPrompt(input: ExplainInput): string {
    const safeSnippet = input.snippet.slice(0, 3000);
    return `Explain why this email matters to the reader and what they should do about it.\n\nSubject: ${input.subject}\n\nBody:\n${safeSnippet}`;
}
