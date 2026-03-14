/**
 * @file src/agents/_shared/tool-bridge.ts
 * Structured tool definitions for the orchestrator's ReAct loop.
 */

import type { AgentContext } from './types';

export interface ToolDefinition {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
    execute: (input: Record<string, unknown>, ctx: AgentContext) => Promise<unknown>;
}

function buildTools(): ToolDefinition[] {
    return [
        {
            name: 'rag.query',
            description: 'Search the user\'s emails using natural language. Returns relevant email chunks with context.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Natural language search query' },
                    topK: { type: 'number', description: 'Max results (default 10)' },
                },
                required: ['query'],
            },
            execute: async (input, ctx) => {
                const { ragAgent } = await import('../rag');
                return ragAgent.query({
                    query: input.query as string,
                    userId: ctx.userId as string,
                    topK: (input.topK as number) ?? 10,
                    hybridWeight: 0.5,
                    similarityThreshold: 0.3,
                    contextBudgetTokens: 4000,
                    rerank: true,
                }, ctx.traceId as string);
            },
        },
        {
            name: 'nlp.classify',
            description: 'Classify an email into one of 10 categories (urgent, action_required, fyi, meeting, newsletter, personal, financial, social, promotional, spam) with priority score 1-100.',
            parameters: {
                type: 'object',
                properties: {
                    subject: { type: 'string', description: 'Email subject line' },
                    snippet: { type: 'string', description: 'Email body or snippet' },
                },
                required: ['subject', 'snippet'],
            },
            execute: async (input, ctx) => {
                const { nlpAgent } = await import('../nlp');
                return nlpAgent.classify(
                    { subject: input.subject as string, snippet: input.snippet as string },
                    ctx.traceId as string
                );
            },
        },
        {
            name: 'nlp.summarize',
            description: 'Summarize an email into structured format: from, receivedDate, deadline, summary.',
            parameters: {
                type: 'object',
                properties: {
                    subject: { type: 'string' },
                    snippet: { type: 'string' },
                    from: { type: 'string' },
                    date: { type: 'string' },
                },
                required: ['subject', 'snippet'],
            },
            execute: async (input, ctx) => {
                const { nlpAgent } = await import('../nlp');
                return nlpAgent.summarize({
                    subject: input.subject as string,
                    snippet: input.snippet as string,
                    from: input.from as string | undefined,
                    date: input.date as string | undefined,
                }, ctx.traceId as string);
            },
        },
        {
            name: 'nlp.draftReply',
            description: 'Draft a professional reply to an email.',
            parameters: {
                type: 'object',
                properties: {
                    subject: { type: 'string' },
                    snippet: { type: 'string' },
                    tone: { type: 'string', enum: ['professional', 'casual', 'formal'] },
                },
                required: ['subject', 'snippet'],
            },
            execute: async (input, ctx) => {
                const { nlpAgent } = await import('../nlp');
                return nlpAgent.draftReply({
                    subject: input.subject as string,
                    snippet: input.snippet as string,
                    tone: (input.tone as 'professional' | 'casual' | 'formal') ?? 'professional',
                }, ctx.traceId as string);
            },
        },
        {
            name: 'nlp.extractTasks',
            description: 'Extract actionable tasks and deadlines from email text.',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Email text to extract tasks from' },
                },
                required: ['text'],
            },
            execute: async (input, ctx) => {
                const { nlpAgent } = await import('../nlp');
                return nlpAgent.extractTasks(
                    { text: input.text as string },
                    ctx.traceId as string
                );
            },
        },
        {
            name: 'nlp.extractEntities',
            description: 'Extract named entities (people, dates, organizations, deadlines) from email text.',
            parameters: {
                type: 'object',
                properties: {
                    text: { type: 'string', description: 'Email text to extract entities from' },
                },
                required: ['text'],
            },
            execute: async (input, ctx) => {
                const { nlpAgent } = await import('../nlp');
                return nlpAgent.extractEntities(
                    { text: input.text as string },
                    ctx.traceId as string
                );
            },
        },
    ];
}

let _tools: ToolDefinition[] | null = null;

export function getTools(): ToolDefinition[] {
    if (!_tools) _tools = buildTools();
    return _tools;
}

export function getToolByName(name: string): ToolDefinition | undefined {
    return getTools().find(t => t.name === name);
}

export function getToolDescriptionsForLLM(): string {
    return getTools().map(t =>
        `Tool: ${t.name}\nDescription: ${t.description}\nParameters: ${JSON.stringify(t.parameters)}`
    ).join('\n\n');
}
