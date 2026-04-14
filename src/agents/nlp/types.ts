/**
 * @file src/agents/nlp/types.ts
 * Input / output Zod schemas for every NLP agent method.
 */

import { z } from 'zod';

// ---------------------------------------------------------------------------
// Email category enum (10 classes)
// ---------------------------------------------------------------------------

export const EmailCategory = z.enum([
    'urgent',
    'action_required',
    'fyi',
    'meeting',
    'newsletter',
    'personal',
    'financial',
    'social',
    'promotional',
    'spam',
]);
export type EmailCategory = z.infer<typeof EmailCategory>;

// ---------------------------------------------------------------------------
// Entity type enum
// ---------------------------------------------------------------------------

export const EntityType = z.enum(['person', 'date', 'organization', 'deadline']);
export type EntityType = z.infer<typeof EntityType>;

// ---------------------------------------------------------------------------
// classify()
// ---------------------------------------------------------------------------

export const ClassifyInputSchema = z.object({
    subject: z.string().max(1000),
    snippet: z.string().max(10_000),
    from: z.string().max(500).optional(),
});
export type ClassifyInput = z.infer<typeof ClassifyInputSchema>;

export const ClassifyOutputSchema = z.object({
    category: z.preprocess(
        (val) => typeof val === 'string' ? val.toLowerCase() : val,
        EmailCategory
    ).catch('fyi'),
    confidence: z.coerce.number().min(0).max(1).catch(0.5),
    priority: z.coerce.number().transform(n => Math.min(100, Math.max(1, Math.round(n)))).catch(50),
    reason: z.string().catch(''),
});
export type ClassifyOutput = z.infer<typeof ClassifyOutputSchema>;

// ---------------------------------------------------------------------------
// summarize()
// ---------------------------------------------------------------------------

export const SummarizeInputSchema = z.object({
    subject: z.string().max(1000),
    snippet: z.string().max(10_000),
    from: z.string().max(500).optional(),
    date: z.string().max(200).optional(),
});
export type SummarizeInput = z.infer<typeof SummarizeInputSchema>;

export const SummarizeOutputSchema = z.object({
    from: z.string().catch('Unknown'),
    receivedDate: z.string().catch(''),
    deadline: z.string().nullable().catch(null),
    summary: z.string().catch(''),
    keyAsk: z.string().catch('No action needed'),
    tone: z.string().catch('neutral'),
    nextStep: z.string().catch(''),
});
export type SummarizeOutput = z.infer<typeof SummarizeOutputSchema>;

// ---------------------------------------------------------------------------
// draftReply()
// ---------------------------------------------------------------------------

export const DraftReplyInputSchema = z.object({
    subject: z.string().max(1000),
    snippet: z.string().max(10_000),
    tone: z.enum(['professional', 'casual', 'formal', 'friendly', 'firm', 'grateful']).default('professional'),
    from: z.string().max(500).optional(),
});
export type DraftReplyInput = z.infer<typeof DraftReplyInputSchema>;

export const DraftReplyOutputSchema = z.object({
    reply: z.string().catch(''),
});
export type DraftReplyOutput = z.infer<typeof DraftReplyOutputSchema>;

// ---------------------------------------------------------------------------
// extractTasks()
// ---------------------------------------------------------------------------

export const ExtractTasksInputSchema = z.object({
    text: z.string().max(10_000),
});
export type ExtractTasksInput = z.infer<typeof ExtractTasksInputSchema>;

export const ExtractTasksOutputSchema = z.object({
    tasks: z.array(
        z.object({
            task: z.string(),
            deadline: z.string().nullable().catch(null),
        })
    ).catch([]),
});
export type ExtractTasksOutput = z.infer<typeof ExtractTasksOutputSchema>;

// ---------------------------------------------------------------------------
// extractEntities()
// ---------------------------------------------------------------------------

export const ExtractEntitiesInputSchema = z.object({
    text: z.string().max(10_000),
});
export type ExtractEntitiesInput = z.infer<typeof ExtractEntitiesInputSchema>;

export const ExtractEntitiesOutputSchema = z.object({
    entities: z.array(
        z.object({
            type: z.preprocess(
                (val) => typeof val === 'string' ? val.toLowerCase() : val,
                EntityType
            ).catch('date'),
            value: z.string(),
        })
    ).catch([]),
});
export type ExtractEntitiesOutput = z.infer<typeof ExtractEntitiesOutputSchema>;

// ---------------------------------------------------------------------------
// explain()
// ---------------------------------------------------------------------------

export const ExplainInputSchema = z.object({
    subject: z.string().max(1000),
    snippet: z.string().max(10_000),
});
export type ExplainInput = z.infer<typeof ExplainInputSchema>;

export const ExplainOutputSchema = z.object({
    bullets: z.preprocess(
        (val) => Array.isArray(val) ? val : typeof val === 'string' ? [val] : [],
        z.array(z.string())
    ).catch([]),
});
export type ExplainOutput = z.infer<typeof ExplainOutputSchema>;

// ---------------------------------------------------------------------------
// NLP Agent action enum
// ---------------------------------------------------------------------------

export const NlpAction = z.enum([
    'classify',
    'summarize',
    'draftReply',
    'extractTasks',
    'extractEntities',
    'explain',
]);
export type NlpAction = z.infer<typeof NlpAction>;

// ---------------------------------------------------------------------------
// Discriminated union request for Agent.execute()
// ---------------------------------------------------------------------------

export const NlpRequestSchema = z.discriminatedUnion('action', [
    ClassifyInputSchema.extend({ action: z.literal('classify') }),
    SummarizeInputSchema.extend({ action: z.literal('summarize') }),
    DraftReplyInputSchema.extend({ action: z.literal('draftReply') }),
    ExtractTasksInputSchema.extend({ action: z.literal('extractTasks') }),
    ExtractEntitiesInputSchema.extend({ action: z.literal('extractEntities') }),
    ExplainInputSchema.extend({ action: z.literal('explain') }),
]);
export type NlpRequest = z.infer<typeof NlpRequestSchema>;

// ---------------------------------------------------------------------------
// Union response
// ---------------------------------------------------------------------------

export type NlpResponse =
    | ClassifyOutput
    | SummarizeOutput
    | DraftReplyOutput
    | ExtractTasksOutput
    | ExtractEntitiesOutput
    | ExplainOutput;
