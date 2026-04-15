/**
 * @file src/agents/nlp/index.ts
 * NLP Agent — single typed agent wrapping all NLP operations.
 *
 * Methods:
 *  - classify()        → 10-category email classification with priority score
 *  - summarize()       → Structured email summary
 *  - draftReply()      → Generate a reply to an email
 *  - extractTasks()    → Pull action items & deadlines from text
 *  - extractEntities() → Named-entity extraction (people, dates, orgs, deadlines)
 *  - explain()         → Bullet-point importance explanation
 */

import type { Agent, AgentContext } from '../_shared/types';
import { ScasiError } from '../_shared/types';
import { llmRouter } from '../../llm/router';
import {
    type ClassifyInput,
    type ClassifyOutput,
    ClassifyInputSchema,
    ClassifyOutputSchema,
    type SummarizeInput,
    type SummarizeOutput,
    SummarizeInputSchema,
    SummarizeOutputSchema,
    type DraftReplyInput,
    type DraftReplyOutput,
    DraftReplyInputSchema,
    DraftReplyOutputSchema,
    type ExtractTasksInput,
    type ExtractTasksOutput,
    ExtractTasksInputSchema,
    ExtractTasksOutputSchema,
    type ExtractEntitiesInput,
    type ExtractEntitiesOutput,
    ExtractEntitiesInputSchema,
    ExtractEntitiesOutputSchema,
    type ExplainInput,
    type ExplainOutput,
    ExplainInputSchema,
    ExplainOutputSchema,
    type NlpRequest,
    type NlpResponse,
    NlpRequestSchema,
} from './types';
import { SUMMARIZE_SYSTEM_V1, summarizeUserPrompt } from './prompts/summarize.v1';
import { REPLY_SYSTEM_V1, replyUserPrompt } from './prompts/reply.v1';
import {
    EXTRACT_TASKS_SYSTEM_V1,
    extractTasksUserPrompt,
    EXTRACT_ENTITIES_SYSTEM_V1,
    extractEntitiesUserPrompt,
    EXPLAIN_SYSTEM_V1,
    explainUserPrompt,
} from './prompts/extract.v1';

export * from './types';

// ---------------------------------------------------------------------------
// NlpAgent
// ---------------------------------------------------------------------------

export class NlpAgent implements Agent<NlpRequest, NlpResponse> {
    readonly name = 'nlp' as const;

    /**
     * Agent interface entry point — dispatches to the appropriate method
     * based on the `action` discriminator.
     */
    async execute(ctx: AgentContext, req: NlpRequest): Promise<NlpResponse> {
        const validated = NlpRequestSchema.parse(req);
        const traceId = ctx.traceId as string;
        const signal = ctx.signal;

        switch (validated.action) {
            case 'classify':
                return this.classify(validated, traceId);
            case 'summarize':
                return this.summarize(validated, traceId, signal);
            case 'draftReply':
                return this.draftReply(validated, traceId, signal);
            case 'extractTasks':
                return this.extractTasks(validated, traceId, signal);
            case 'extractEntities':
                return this.extractEntities(validated, traceId, signal);
            case 'explain':
                return this.explain(validated, traceId, signal);
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }

    // -----------------------------------------------------------------------
    // classify
    // -----------------------------------------------------------------------

    /** Classify an email by keyword rules — purely local, no LLM calls.
     *  Signal is not accepted because this method never makes async I/O
     *  that could be cancelled. If a future refactor adds LLM-based
     *  classification, signal must be threaded here at that time. */
    async classify(input: ClassifyInput, _traceId?: string): Promise<ClassifyOutput> {
        const validated = ClassifyInputSchema.parse(input);
        const text = `${validated.subject} ${validated.snippet} ${validated.from ?? ''}`.toLowerCase();

        // ── Keyword rule engine (free, no API) ──────────────────────────────
        const match = (keywords: string[]) => keywords.some(k => text.includes(k));

        // Priority 1: Urgent signals
        if (match(['urgent', 'asap', 'immediately', 'action required', 'critical', 'emergency', 'respond now'])) {
            return { category: 'urgent', confidence: 0.92, priority: 90, reason: 'Urgent keywords detected' };
        }

        // Priority 2: Financial
        if (match(['invoice', 'payment due', 'billing statement', 'receipt', 'bank transfer', 'bank account', 'transaction alert', 'refund', 'overdue', 'amount due', 'payslip', 'salary credit'])) {
            return { category: 'financial', confidence: 0.88, priority: 75, reason: 'Financial keywords detected' };
        }

        // Priority 3: Action required
        if (match(['action required', 'please review', 'your approval', 'please confirm', 'follow up on', 'kindly assist', 'approval needed', 'your response is needed'])) {
            return { category: 'action_required', confidence: 0.85, priority: 70, reason: 'Action request detected' };
        }

        // Priority 4: Meetings / calendar
        if (match(['meeting', 'interview', 'schedule', 'calendar invite', 'zoom', 'google meet', 'teams call', 'appointment', 'standup', 'sync'])) {
            return { category: 'meeting', confidence: 0.87, priority: 65, reason: 'Meeting/scheduling keywords detected' };
        }

        // Priority 5: Social networks
        if (match(['linkedin', 'twitter', 'instagram', 'facebook', 'github notification', 'mentioned you', 'connection request', 'started following', 'noreply@', 'social notification'])) {
            return { category: 'social', confidence: 0.90, priority: 20, reason: 'Social network email detected' };
        }

        // Priority 6: Promotional
        if (match(['unsubscribe', 'sale', '% off', 'deal', 'offer', 'discount', 'coupon', 'promo', 'limited time', 'shop now', 'buy now', 'free trial', 'upgrade now'])) {
            return { category: 'promotional', confidence: 0.91, priority: 15, reason: 'Promotional keywords detected' };
        }

        // Priority 7: Newsletter / updates
        if (match(['newsletter', 'digest', 'weekly update', 'monthly report', 'announcement', 'release notes', 'changelog', 'alert', 'no-reply', 'noreply'])) {
            return { category: 'newsletter', confidence: 0.83, priority: 25, reason: 'Newsletter or digest email' };
        }

        // Priority 8: Spam indicators
        if (match(['congratulations', 'you have won', 'click here to claim', 'verify your account now', 'suspicious', 'out of office auto-reply'])) {
            return { category: 'spam', confidence: 0.80, priority: 5, reason: 'Spam-like keywords detected' };
        }

        // Priority 9: Personal signals
        if (match(['hey', 'hi there', 'dear friend', 'hope you are', 'miss you', 'family', 'mom', 'dad', 'brother', 'sister'])) {
            return { category: 'personal', confidence: 0.75, priority: 55, reason: 'Personal email signals detected' };
        }

        // Default → FYI
        return { category: 'fyi', confidence: 0.60, priority: 30, reason: 'General informational email' };
    }

    // -----------------------------------------------------------------------
    // summarize
    // -----------------------------------------------------------------------

    async summarize(input: SummarizeInput, traceId?: string, signal?: AbortSignal): Promise<SummarizeOutput> {
        const validated = SummarizeInputSchema.parse(input);
        const result = await llmRouter.generateText<SummarizeOutput>('summarize', summarizeUserPrompt(validated), {
            schema: SummarizeOutputSchema,
            systemPrompt: SUMMARIZE_SYSTEM_V1,
            traceId,
            temperature: 0.4,
            maxTokens: 512,
            signal,
        });
        if (!result.data) throw new ScasiError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for summarize' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // draftReply
    // -----------------------------------------------------------------------

    async draftReply(input: DraftReplyInput, traceId?: string, signal?: AbortSignal): Promise<DraftReplyOutput> {
        const validated = DraftReplyInputSchema.parse(input);
        const result = await llmRouter.generateText<DraftReplyOutput>('reply', replyUserPrompt(validated), {
            schema: DraftReplyOutputSchema,
            systemPrompt: REPLY_SYSTEM_V1,
            traceId,
            temperature: 0.7,
            maxTokens: 1024,
            signal,
        });
        if (!result.data) throw new ScasiError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for draftReply' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // extractTasks
    // -----------------------------------------------------------------------

    async extractTasks(input: ExtractTasksInput, traceId?: string, signal?: AbortSignal): Promise<ExtractTasksOutput> {
        const validated = ExtractTasksInputSchema.parse(input);
        const result = await llmRouter.generateText<ExtractTasksOutput>('extract', extractTasksUserPrompt(validated.text), {
            schema: ExtractTasksOutputSchema,
            systemPrompt: EXTRACT_TASKS_SYSTEM_V1,
            traceId,
            temperature: 0.3,
            maxTokens: 1024,
            signal,
        });
        if (!result.data) throw new ScasiError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for extractTasks' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // extractEntities
    // -----------------------------------------------------------------------

    async extractEntities(input: ExtractEntitiesInput, traceId?: string, signal?: AbortSignal): Promise<ExtractEntitiesOutput> {
        const validated = ExtractEntitiesInputSchema.parse(input);
        const result = await llmRouter.generateText<ExtractEntitiesOutput>('extract', extractEntitiesUserPrompt(validated.text), {
            schema: ExtractEntitiesOutputSchema,
            systemPrompt: EXTRACT_ENTITIES_SYSTEM_V1,
            traceId,
            temperature: 0.3,
            maxTokens: 1024,
            signal,
        });
        if (!result.data) throw new ScasiError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for extractEntities' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // explain
    // -----------------------------------------------------------------------

    // Uses 'summarize' task type — no dedicated 'explain' policy; Gemini Flash handles it well.
    async explain(input: ExplainInput, traceId?: string, signal?: AbortSignal): Promise<ExplainOutput> {
        const validated = ExplainInputSchema.parse(input);
        const result = await llmRouter.generateText<ExplainOutput>('summarize', explainUserPrompt(validated), {
            schema: ExplainOutputSchema,
            systemPrompt: EXPLAIN_SYSTEM_V1,
            traceId,
            temperature: 0.5,
            maxTokens: 512,
            signal,
        });
        if (!result.data) throw new ScasiError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for explain' });
        return result.data;
    }
}

export const nlpAgent = new NlpAgent();
