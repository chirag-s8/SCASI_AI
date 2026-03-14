/**
 * @file src/agents/nlp/prompts/extract.v1.ts
 * v1 prompts for task extraction, entity extraction, and explain importance.
 */

import type { ExplainInput } from '../types';

// ---------------------------------------------------------------------------
// Task extraction
// ---------------------------------------------------------------------------

export const EXTRACT_TASKS_SYSTEM_V1 =
    `You are a task extraction engine. Given an email body, extract every action item and its deadline (if mentioned).

Respond ONLY with valid JSON matching this exact schema:
{
  "tasks": [
    { "task": "<description>", "deadline": "<deadline or null>" }
  ]
}

If there are no tasks, return { "tasks": [] }.`;

export function extractTasksUserPrompt(text: string): string {
    return `Extract tasks and deadlines from this email:\n\n${text.slice(0, 4000)}`;
}

// ---------------------------------------------------------------------------
// Entity extraction
// ---------------------------------------------------------------------------

export const EXTRACT_ENTITIES_SYSTEM_V1 =
    `You are a named entity extraction engine. Given an email body, extract all mentions of:
- person: People's names
- date: Specific dates or time references
- organization: Company or organization names
- deadline: Explicit deadlines or due dates

Respond ONLY with valid JSON matching this exact schema:
{
  "entities": [
    { "type": "person|date|organization|deadline", "value": "<the extracted text>" }
  ]
}

If there are no entities, return { "entities": [] }.`;

export function extractEntitiesUserPrompt(text: string): string {
    return `Extract named entities from this email:\n\n${text.slice(0, 4000)}`;
}

// ---------------------------------------------------------------------------
// Explain importance
// ---------------------------------------------------------------------------

export const EXPLAIN_SYSTEM_V1 =
    `You are an email importance analyst. Given an email's subject and body, explain why it matters in 2-3 concise bullet points.

Respond ONLY with valid JSON matching this exact schema:
{
  "bullets": ["<point 1>", "<point 2>", "<optional point 3>"]
}`;

export function explainUserPrompt(input: ExplainInput): string {
    const safeSnippet = input.snippet.slice(0, 3000);
    return `Subject: ${input.subject}\n\nBody:\n${safeSnippet}`;
}
