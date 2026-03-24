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
        {
            name: 'gmail.liveInbox',
            description: 'Query the user\'s Gmail inbox in real-time. Returns recent emails with subject, sender, date, and snippet. Use this for questions about unread count, latest emails, or finding specific recent emails. Common queries: "is:unread" for unread count, "in:inbox" for recent inbox, "from:NAME" to find emails from someone, "newer_than:1d" for today\'s emails.',
            parameters: {
                type: 'object',
                properties: {
                    query: { type: 'string', description: 'Gmail search query (e.g. "is:unread", "from:john", "subject:meeting", "newer_than:1d"). Default: "in:inbox"' },
                    maxResults: { type: 'number', description: 'Max emails to return (default 10)' },
                },
                required: [],
            },
            execute: async (input, ctx) => {
                const accessToken = ctx.metadata?.accessToken as string | undefined;
                if (!accessToken) {
                    return { error: 'No Gmail access token available. The user may need to sign in again.' };
                }

                try {
                    const { google } = await import('googleapis');
                    const auth = new google.auth.OAuth2();
                    auth.setCredentials({ access_token: accessToken });
                    const gmail = google.gmail({ version: 'v1', auth });

                    const query = (input.query as string) || 'in:inbox';
                    const maxResults = Math.min((input.maxResults as number) || 10, 20);

                    const listRes = await gmail.users.messages.list({
                        userId: 'me',
                        maxResults,
                        q: query,
                    });

                    const messages = listRes.data.messages || [];
                    const estimatedTotal = listRes.data.resultSizeEstimate || 0;

                    if (messages.length === 0) {
                        return { estimatedTotal: 0, count: 0, emails: [], query };
                    }

                    const results = await Promise.allSettled(
                        messages.map(async (m) => {
                            if (!m.id) return null;
                            const msg = await gmail.users.messages.get({
                                userId: 'me',
                                id: m.id,
                                format: 'metadata',
                                metadataHeaders: ['Subject', 'From', 'Date'],
                            });
                            const headers = msg.data.payload?.headers || [];
                            const getHeader = (name: string) =>
                                headers.find((h) => h.name === name)?.value || '';
                            const labelIds = msg.data.labelIds || [];
                            return {
                                id: m.id,
                                subject: getHeader('Subject'),
                                from: getHeader('From'),
                                date: getHeader('Date') || new Date().toISOString(),
                                snippet: msg.data.snippet || '',
                                labelIds,
                                isUnread: labelIds.includes('UNREAD'),
                            };
                        })
                    );

                    const emails = results
                        .flatMap(r => r.status === 'fulfilled' && r.value != null ? [r.value] : []);

                    const unreadCount = emails.filter(e => e.isUnread).length;
                    return { estimatedTotal, count: emails.length, unreadInResults: unreadCount, emails, query };
                } catch (err: unknown) {
                    const msg = err instanceof Error ? err.message : 'Gmail query failed';
                    if (msg.includes('401') || msg.includes('invalid_grant')) {
                        return { error: 'Gmail session expired. Please sign out and sign back in.' };
                    }
                    return { error: `Gmail query failed: ${msg}` };
                }
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
