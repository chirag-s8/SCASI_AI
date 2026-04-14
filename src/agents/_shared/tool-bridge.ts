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
            name: 'calendar.getEvents',
            description: 'Fetch the user\'s upcoming calendar events and tasks. Use for questions about schedule, meetings, events, deadlines, or what\'s coming up.',
            parameters: {
                type: 'object',
                properties: {
                    days: { type: 'number', description: 'Number of days ahead to fetch (default 30, max 90)' },
                },
                required: [],
            },
            execute: async (input, ctx) => {
                const accessToken = ctx.metadata?.accessToken as string | undefined;
                const days = Math.min((input.days as number) || 30, 90);

                // Step 1: Try Google Calendar API
                if (accessToken) {
                    try {
                        const { google } = await import('googleapis');
                        const auth = new google.auth.OAuth2(
                            process.env.GOOGLE_CLIENT_ID,
                            process.env.GOOGLE_CLIENT_SECRET
                        );
                        auth.setCredentials({ access_token: accessToken });
                        const calendar = google.calendar({ version: 'v3', auth });
                        const timeMin = new Date();
                        const timeMax = new Date();
                        timeMax.setDate(timeMax.getDate() + days);
                        const res = await calendar.events.list({
                            calendarId: 'primary',
                            timeMin: timeMin.toISOString(),
                            timeMax: timeMax.toISOString(),
                            maxResults: 20,
                            singleEvents: true,
                            orderBy: 'startTime',
                        });
                        const calEvents = (res.data.items || []).map(e => ({
                            title: e.summary || 'Untitled',
                            start: e.start?.dateTime || e.start?.date,
                            time: e.start?.dateTime
                                ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                                : null,
                            description: (e.description || '').replace('[Auto-extracted by Scasi AI]', '').trim(),
                        }));
                        if (calEvents.length > 0) return { count: calEvents.length, events: calEvents, source: 'google_calendar' };
                    } catch { /* fall through */ }
                }

                // Step 2: Extract events from Gmail inbox (same logic as CalendarView)
                if (!accessToken) return { count: 0, events: [], note: 'No access token available.' };

                try {
                    const { google } = await import('googleapis');
                    const auth = new google.auth.OAuth2();
                    auth.setCredentials({ access_token: accessToken });
                    const gmail = google.gmail({ version: 'v1', auth });

                    const listRes = await gmail.users.messages.list({ userId: 'me', maxResults: 20, q: 'in:inbox' });
                    const messages = listRes.data.messages || [];

                    const emailDetails = await Promise.allSettled(
                        messages.map(async (m) => {
                            if (!m.id) return null;
                            const msg = await gmail.users.messages.get({
                                userId: 'me', id: m.id, format: 'metadata',
                                metadataHeaders: ['Subject', 'From', 'Date'],
                            });
                            const headers = msg.data.payload?.headers || [];
                            const get = (n: string) => headers.find(h => h.name === n)?.value || '';
                            return { subject: get('Subject'), snippet: msg.data.snippet || '', from: get('From') };
                        })
                    );

                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() + days);
                    const extractedEvents: any[] = [];

                    for (const r of emailDetails) {
                        if (r.status !== 'fulfilled' || !r.value) continue;
                        const { subject, snippet, from } = r.value;
                        const text = (subject + ' ' + snippet).toLowerCase();

                        // Detect type
                        let type = '';
                        if (/meeting|call|zoom|teams|sync|standup|interview|webinar/i.test(text)) type = 'meeting';
                        else if (/deadline|due|submit|submission|deliver|complete by|send by/i.test(text)) type = 'deadline';
                        else if (/task|todo|action required|need to|please|can you|could you/i.test(text)) type = 'task';
                        else if (/urgent|emergency|asap|critical/i.test(text)) type = 'urgent';
                        else if (/reminder|follow.?up|don.?t forget/i.test(text)) type = 'reminder';
                        else continue;

                        // Extract date
                        let eventDate: Date | null = null;
                        const now = new Date();
                        if (/tomorrow/i.test(text)) { eventDate = new Date(now); eventDate.setDate(eventDate.getDate() + 1); }
                        else if (/\btoday\b/i.test(text)) { eventDate = new Date(now); }
                        else if (/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(text)) {
                            const m = text.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
                            if (m) {
                                const days2 = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
                                const target = days2.indexOf(m[1].toLowerCase());
                                const d = new Date(now);
                                d.setDate(d.getDate() + ((target - d.getDay() + 7) % 7 || 7));
                                eventDate = d;
                            }
                        }
                        else if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}/i.test(text)) {
                            const m = text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/i);
                            if (m) {
                                const months: Record<string,number> = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
                                const mo = months[m[1].toLowerCase().slice(0,3)];
                                const d = new Date(now.getFullYear(), mo, parseInt(m[2]));
                                if (d >= today) eventDate = d;
                            }
                        }
                        else if (/\b(noon|midnight|morning|evening|tonight)\b/i.test(text)) {
                            eventDate = new Date(now);
                            if (/tomorrow/i.test(text)) eventDate.setDate(eventDate.getDate() + 1);
                        }
                        else if (/end of (the )?(week|month)/i.test(text)) {
                            const d = new Date(now);
                            if (/month/i.test(text)) d.setDate(new Date(d.getFullYear(), d.getMonth()+1, 0).getDate());
                            else { const diff = 5 - d.getDay(); d.setDate(d.getDate() + (diff < 0 ? diff + 7 : diff)); }
                            eventDate = d;
                        }

                        if (!eventDate || eventDate < today || eventDate > cutoff) continue;

                        // Extract time
                        let time: string | null = null;
                        const tm = text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
                        if (tm) {
                            let h = parseInt(tm[1]);
                            const min = parseInt(tm[2] || '0');
                            if (/pm/i.test(tm[3]) && h < 12) h += 12;
                            if (/am/i.test(tm[3]) && h === 12) h = 0;
                            time = `${h.toString().padStart(2,'0')}:${min.toString().padStart(2,'0')}`;
                        } else if (/noon/i.test(text)) time = '12:00';
                        else if (/morning/i.test(text)) time = '09:00';
                        else if (/evening/i.test(text)) time = '18:00';

                        extractedEvents.push({
                            title: subject || `${type} from ${from.split('<')[0].trim()}`,
                            start: eventDate.toISOString().split('T')[0],
                            time,
                            type,
                            from: from.split('<')[0].trim(),
                            description: snippet.slice(0, 100),
                        });
                    }

                    // Sort by date
                    extractedEvents.sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
                    return { count: extractedEvents.length, events: extractedEvents, source: 'inbox_scan' };
                } catch (err: unknown) {
                    return { count: 0, events: [], error: err instanceof Error ? err.message : String(err) };
                }
            },
        },
        {
            name: 'team.getMembers',
            description: 'Get the user\'s team collaborators and their task assignments. Use for questions about team members, who has tasks, workload, or team collaboration.',
            parameters: { type: 'object', properties: {}, required: [] },
            execute: async (_input, _ctx) => {
                try {
                    const { createClient } = await import('@supabase/supabase-js');
                    const supabase = createClient(
                        process.env.NEXT_PUBLIC_SUPABASE_URL!,
                        process.env.SUPABASE_SERVICE_ROLE_KEY!
                    );
                    const { data: members } = await supabase.from('team_collaborators').select('*');
                    const { data: assignments } = await supabase.from('email_assignments').select('*');
                    return {
                        members: (members || []).map((m: any) => ({
                            name: m.name,
                            email: m.email,
                            activeTasks: m.active_tasks_count,
                            responseRate: m.response_rate,
                            status: m.status,
                        })),
                        assignments: (assignments || []).map((a: any) => ({
                            subject: a.email_subject,
                            assignee: a.assignee_email,
                            status: a.status,
                            priority: a.priority,
                            dueDate: a.due_date,
                        })),
                    };
                } catch (err: unknown) {
                    return { error: `Team fetch failed: ${err instanceof Error ? err.message : String(err)}` };
                }
            },
        },
        {
            name: 'inbox.getBurnoutStats',
            description: 'Calculate the user\'s burnout score, stress level, and inbox health based on their email patterns. Use for questions about burnout, stress, workload, productivity, or inbox health.',
            parameters: { type: 'object', properties: {}, required: [] },
            execute: async (_input, ctx) => {
                const accessToken = ctx.metadata?.accessToken as string | undefined;
                if (!accessToken) return { error: 'No access token available.' };
                try {
                    const { google } = await import('googleapis');
                    const auth = new google.auth.OAuth2();
                    auth.setCredentials({ access_token: accessToken });
                    const gmail = google.gmail({ version: 'v1', auth });
                    // Get recent emails for analysis
                    const [inboxRes, unreadRes, urgentRes, lateRes] = await Promise.all([
                        gmail.users.messages.list({ userId: 'me', q: 'in:inbox newer_than:7d', maxResults: 50 }),
                        gmail.users.messages.list({ userId: 'me', q: 'is:unread', maxResults: 1 }),
                        gmail.users.messages.list({ userId: 'me', q: 'is:unread subject:(urgent OR deadline OR asap OR action required)', maxResults: 20 }),
                        gmail.users.messages.list({ userId: 'me', q: 'newer_than:7d after:10pm OR before:6am', maxResults: 20 }),
                    ]);
                    const weeklyCount = inboxRes.data.resultSizeEstimate || 0;
                    const unreadCount = unreadRes.data.resultSizeEstimate || 0;
                    const urgentCount = urgentRes.data.resultSizeEstimate || 0;
                    const lateNightCount = lateRes.data.resultSizeEstimate || 0;
                    const burnoutScore = Math.min(100, Math.round((urgentCount * 8) + (lateNightCount * 12) + (unreadCount > 30 ? 15 : 0)));
                    const stressLevel = burnoutScore < 30 ? 'Low' : burnoutScore < 60 ? 'Moderate' : burnoutScore < 80 ? 'High' : 'Critical';
                    return {
                        burnoutScore,
                        stressLevel,
                        weeklyEmailCount: weeklyCount,
                        unreadCount,
                        urgentEmailCount: urgentCount,
                        lateNightEmailCount: lateNightCount,
                        inboxHealth: unreadCount < 10 ? 'Healthy' : unreadCount < 30 ? 'Moderate' : 'Overloaded',
                    };
                } catch (err: unknown) {
                    return { error: `Burnout stats failed: ${err instanceof Error ? err.message : String(err)}` };
                }
            },
        },
        {
            name: 'gmail.searchBySender',
            description: 'Search emails by a partial sender name or keyword. Use when user mentions a person or company name — even partial names like "prajwal" or "nextwave". Performs fuzzy matching against sender names.',
            parameters: {
                type: 'object',
                properties: {
                    senderName: { type: 'string', description: 'Partial or full sender name/company to search for' },
                    maxResults: { type: 'number', description: 'Max emails to return (default 5)' },
                },
                required: ['senderName'],
            },
            execute: async (input, ctx) => {
                const accessToken = ctx.metadata?.accessToken as string | undefined;
                if (!accessToken) return { error: 'No access token available.' };
                try {
                    const { google } = await import('googleapis');
                    const auth = new google.auth.OAuth2();
                    auth.setCredentials({ access_token: accessToken });
                    const gmail = google.gmail({ version: 'v1', auth });
                    const senderName = input.senderName as string;
                    const maxResults = Math.min((input.maxResults as number) || 5, 10);
                    // Search with partial name
                    const listRes = await gmail.users.messages.list({
                        userId: 'me',
                        q: `from:${senderName}`,
                        maxResults,
                    });
                    const messages = listRes.data.messages || [];
                    if (messages.length === 0) {
                        return { count: 0, emails: [], senderName, note: `No emails found from "${senderName}". Try a different spelling.` };
                    }
                    const results = await Promise.allSettled(
                        messages.map(async (m) => {
                            if (!m.id) return null;
                            const msg = await gmail.users.messages.get({
                                userId: 'me', id: m.id,
                                format: 'metadata',
                                metadataHeaders: ['Subject', 'From', 'Date'],
                            });
                            const headers = msg.data.payload?.headers || [];
                            const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';
                            return {
                                id: m.id,
                                subject: getHeader('Subject'),
                                from: getHeader('From'),
                                date: getHeader('Date'),
                                snippet: msg.data.snippet || '',
                                isUnread: (msg.data.labelIds || []).includes('UNREAD'),
                            };
                        })
                    );
                    const emails = results.flatMap(r => r.status === 'fulfilled' && r.value ? [r.value] : []);
                    return { count: emails.length, emails, senderName };
                } catch (err: unknown) {
                    return { error: `Search failed: ${err instanceof Error ? err.message : String(err)}` };
                }
            },
        },
        {
            name: 'gmail.getEmailBody',
            description: 'Fetch the full body/content of a specific email by its Gmail message ID. Use this when the user wants to read or hear the full content of an email.',
            parameters: {
                type: 'object',
                properties: {
                    messageId: { type: 'string', description: 'The Gmail message ID to fetch full body for' },
                },
                required: ['messageId'],
            },
            execute: async (input, ctx) => {
                const accessToken = ctx.metadata?.accessToken as string | undefined;
                if (!accessToken) return { error: 'No Gmail access token available.' };
                try {
                    const { google } = await import('googleapis');
                    const auth = new google.auth.OAuth2();
                    auth.setCredentials({ access_token: accessToken });
                    const gmail = google.gmail({ version: 'v1', auth });

                    const msg = await gmail.users.messages.get({
                        userId: 'me',
                        id: input.messageId as string,
                        format: 'full',
                    });

                    const headers = msg.data.payload?.headers || [];
                    const getHeader = (name: string) => headers.find(h => h.name === name)?.value || '';

                    // Extract plain text body
                    let body = '';
                    const extractBody = (parts: any[]): string => {
                        for (const part of parts) {
                            if (part.mimeType === 'text/plain' && part.body?.data) {
                                return Buffer.from(part.body.data, 'base64').toString('utf-8');
                            }
                            if (part.parts) {
                                const nested = extractBody(part.parts);
                                if (nested) return nested;
                            }
                        }
                        return '';
                    };

                    if (msg.data.payload?.parts) {
                        body = extractBody(msg.data.payload.parts);
                    } else if (msg.data.payload?.body?.data) {
                        body = Buffer.from(msg.data.payload.body.data, 'base64').toString('utf-8');
                    }

                    // Truncate to 2000 chars for voice
                    if (body.length > 2000) body = body.slice(0, 2000) + '...';

                    return {
                        id: input.messageId,
                        subject: getHeader('Subject'),
                        from: getHeader('From'),
                        date: getHeader('Date'),
                        body: body || msg.data.snippet || '',
                    };
                } catch (err: unknown) {
                    return { error: `Failed to fetch email: ${err instanceof Error ? err.message : String(err)}` };
                }
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
