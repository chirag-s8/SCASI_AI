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
import { MailMindError } from '../_shared/types';
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
import { CLASSIFY_SYSTEM_V1, classifyUserPrompt } from './prompts/classify.v1';
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

        switch (validated.action) {
            case 'classify':
                return this.classify(validated, traceId);
            case 'summarize':
                return this.summarize(validated, traceId);
            case 'draftReply':
                return this.draftReply(validated, traceId);
            case 'extractTasks':
                return this.extractTasks(validated, traceId);
            case 'extractEntities':
                return this.extractEntities(validated, traceId);
            case 'explain':
                return this.explain(validated, traceId);
        }
    }

    async healthCheck(): Promise<boolean> {
        return true;
    }

    // -----------------------------------------------------------------------
    // classify
    // -----------------------------------------------------------------------

    async classify(input: ClassifyInput, traceId?: string): Promise<ClassifyOutput> {
        const validated = ClassifyInputSchema.parse(input);
        const result = await llmRouter.generateText<ClassifyOutput>('classify', classifyUserPrompt(validated), {
            schema: ClassifyOutputSchema,
            systemPrompt: CLASSIFY_SYSTEM_V1,
            traceId,
            temperature: 0.3,
            maxTokens: 256,
        });
        if (!result.data) throw new MailMindError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for classify' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // summarize
    // -----------------------------------------------------------------------

    async summarize(input: SummarizeInput, traceId?: string): Promise<SummarizeOutput> {
        const validated = SummarizeInputSchema.parse(input);
        const result = await llmRouter.generateText<SummarizeOutput>('summarize', summarizeUserPrompt(validated), {
            schema: SummarizeOutputSchema,
            systemPrompt: SUMMARIZE_SYSTEM_V1,
            traceId,
            temperature: 0.4,
            maxTokens: 512,
        });
        if (!result.data) throw new MailMindError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for summarize' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // draftReply
    // -----------------------------------------------------------------------

    async draftReply(input: DraftReplyInput, traceId?: string): Promise<DraftReplyOutput> {
        const validated = DraftReplyInputSchema.parse(input);
        const result = await llmRouter.generateText<DraftReplyOutput>('reply', replyUserPrompt(validated), {
            schema: DraftReplyOutputSchema,
            systemPrompt: REPLY_SYSTEM_V1,
            traceId,
            temperature: 0.7,
            maxTokens: 1024,
        });
        if (!result.data) throw new MailMindError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for draftReply' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // extractTasks
    // -----------------------------------------------------------------------

    async extractTasks(input: ExtractTasksInput, traceId?: string): Promise<ExtractTasksOutput> {
        const validated = ExtractTasksInputSchema.parse(input);
        const result = await llmRouter.generateText<ExtractTasksOutput>('extract', extractTasksUserPrompt(validated.text), {
            schema: ExtractTasksOutputSchema,
            systemPrompt: EXTRACT_TASKS_SYSTEM_V1,
            traceId,
            temperature: 0.3,
            maxTokens: 1024,
        });
        if (!result.data) throw new MailMindError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for extractTasks' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // extractEntities
    // -----------------------------------------------------------------------

    async extractEntities(input: ExtractEntitiesInput, traceId?: string): Promise<ExtractEntitiesOutput> {
        const validated = ExtractEntitiesInputSchema.parse(input);
        const result = await llmRouter.generateText<ExtractEntitiesOutput>('extract', extractEntitiesUserPrompt(validated.text), {
            schema: ExtractEntitiesOutputSchema,
            systemPrompt: EXTRACT_ENTITIES_SYSTEM_V1,
            traceId,
            temperature: 0.3,
            maxTokens: 1024,
        });
        if (!result.data) throw new MailMindError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for extractEntities' });
        return result.data;
    }

    // -----------------------------------------------------------------------
    // explain
    // -----------------------------------------------------------------------

    // Uses 'summarize' task type — no dedicated 'explain' policy; Gemini Flash handles it well.
    async explain(input: ExplainInput, traceId?: string): Promise<ExplainOutput> {
        const validated = ExplainInputSchema.parse(input);
        const result = await llmRouter.generateText<ExplainOutput>('summarize', explainUserPrompt(validated), {
            schema: ExplainOutputSchema,
            systemPrompt: EXPLAIN_SYSTEM_V1,
            traceId,
            temperature: 0.5,
            maxTokens: 512,
        });
        if (!result.data) throw new MailMindError({ code: 'NLP_PARSE_ERROR', message: 'No structured data returned for explain' });
        return result.data;
    }
}

export const nlpAgent = new NlpAgent();
