/**
 * @file src/agents/testing/evalAgent.ts
 * LLM-as-judge evaluation agent for Scasi.
 *
 * Architecture:
 *  - System-under-test: NLP agent (Groq Llama / Sarvam) called directly
 *  - Judge model: Qwen3 VL 235B via OpenRouter (llmRouter 'judge' task)
 *  - Prompt regression: tracks prompt version hashes across eval runs
 *
 * The judge model is intentionally a DIFFERENT model family than the NLP
 * pipeline to avoid self-evaluation bias.
 */

import { z } from 'zod';
import { EVAL_DATASET, EvalEmail } from './eval-dataset';
import { getPromptVersions, type PromptVersionMap } from './promptVersions';
import { nlpAgent } from '../nlp/index';
import { llmRouter } from '../../llm/router';

// ─── Schemas ──────────────────────────────────────────────────────────────────
export const EvalCategorySchema = z.enum([
  'priority_accuracy',
  'reply_quality',
  'summary_completeness',
  'rag_retrieval_precision',
]);
export type EvalCategory = z.infer<typeof EvalCategorySchema>;

export const EvalScoreSchema = z.object({
  category: EvalCategorySchema,
  score: z.number().min(0).max(100),
  passed: z.boolean(),
  reasoning: z.string(),
  skipped: z.boolean().default(false),
});
export type EvalScore = z.infer<typeof EvalScoreSchema>;

export const EvalResultSchema = z.object({
  emailId: z.string(),
  subject: z.string(),
  scores: z.array(EvalScoreSchema),
  overallScore: z.number().min(0).max(100),
  passed: z.boolean(),
  durationMs: z.number(),
});
export type EvalResult = z.infer<typeof EvalResultSchema>;

export const EvalRunSchema = z.object({
  runId: z.string(),
  timestamp: z.string(),
  promptVersions: z.record(z.string(), z.string()),
  results: z.array(EvalResultSchema),
  summary: z.object({
    total: z.number(),
    passed: z.number(),
    failed: z.number(),
    passRate: z.number(),
    avgScore: z.number(),
    byCategory: z.record(z.string(), z.object({
      avg: z.number(),
      passRate: z.number(),
    })),
  }),
});
export type EvalRun = z.infer<typeof EvalRunSchema>;

// ─── Judge response schema (validated by llmRouter) ──────────────────────────
const JudgeResponseSchema = z.object({
  score: z.coerce.number().min(0).max(100).catch(0),
  reasoning: z.string().catch('No reasoning provided'),
});
type JudgeResponse = z.infer<typeof JudgeResponseSchema>;

// ─── Thresholds & Timeouts ────────────────────────────────────────────────────
const PASS_THRESHOLD = 70;

/** Per-email evaluation timeout (ms). If a single email takes longer than this,
 *  a timeout result is recorded instead of hanging the entire suite.
 *
 *  Budget: maxDuration = 300s (Vercel lambda limit set in run-evals route).
 *  15 emails × 18s = 270s, leaving ~30s margin for cold starts + overhead.
 *  Typical per-email time is ~12-20s (4 categories × 3-5s per judge call).
 *  Under API degradation, individual categories already have their own
 *  retries/timeouts in llmRouter — so 18s is generous enough for normal
 *  operation while preventing a single slow email from eating the lambda budget.
 */
const PER_EMAIL_TIMEOUT_MS = 18_000;

// ─── Judge via llmRouter ('judge' task → Qwen3 VL 235B via OpenRouter) ───────
async function callJudge(prompt: string, signal?: AbortSignal): Promise<JudgeResponse> {
  const result = await llmRouter.generateText<JudgeResponse>('judge', prompt, {
    schema: JudgeResponseSchema,
    temperature: 0.1,
    maxTokens: 512,
    signal,
  });
  return result.data ?? { score: 0, reasoning: 'Judge returned no structured data' };
}

// ─── Per-category judge prompts ───────────────────────────────────────────────

function buildPriorityPrompt(email: EvalEmail, aiPriority1to10: number): string {
  return `You are an expert email triage evaluator. Judge whether the AI-assigned priority score is reasonable.

Email:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

Expected priority (1-10): ${email.expectedPriority}
AI-assigned priority (1-10): ${aiPriority1to10}

Score the accuracy from 0-100. A score within ±1 of expected = 90-100. Within ±2 = 70-89. Within ±3 = 50-69. More than ±3 = 0-49.

Respond ONLY with valid JSON: {"score": <number>, "reasoning": "<one sentence>"}`;
}

function buildReplyPrompt(email: EvalEmail, actualReply: string): string {
  return `You are an expert email communication evaluator. Judge the quality of this AI-generated reply.

Original email:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

Expected tone: ${email.expectedReplyTone}
AI-generated reply: ${actualReply}

Evaluate on: correct tone (${email.expectedReplyTone}), no hallucinated commitments, addresses all key points, professional quality.
Score 0-100.

Respond ONLY with valid JSON: {"score": <number>, "reasoning": "<one sentence>"}`;
}

function buildSummaryPrompt(email: EvalEmail, actualSummary: string): string {
  return `You are an expert email summarization evaluator.

Original email:
Subject: ${email.subject}
From: ${email.from}
Body: ${email.body}

Expected keywords that must appear: ${email.expectedSummaryKeywords.join(', ')}
AI-generated summary: ${actualSummary}

Score completeness 0-100. Check: does the summary capture the key facts? Are the expected keywords (or their semantic equivalents) present?

Respond ONLY with valid JSON: {"score": <number>, "reasoning": "<one sentence>"}`;
}

function buildRagPrompt(email: EvalEmail, retrievedChunks: string[]): string {
  return `You are an expert RAG retrieval evaluator.

Query email:
Subject: ${email.subject}
Body: ${email.body.slice(0, 300)}

Retrieved chunks:
${retrievedChunks.map((c, i) => `[${i + 1}] ${c}`).join('\n')}

Score retrieval precision 0-100. Are the retrieved chunks relevant to the email's topic and category (${email.expectedCategory})?

Respond ONLY with valid JSON: {"score": <number>, "reasoning": "<one sentence>"}`;
}

// ─── NLP pipeline calls (direct agent invocation — no HTTP) ──────────────────

/** Call the NLP classifier directly and convert 1-100 priority to 1-10 scale.
 *  Note: classify() is rule-based (no API call), so signal is accepted for
 *  forward-compatibility but currently not forwarded. */
async function getClassifyPriority(email: EvalEmail, _signal?: AbortSignal): Promise<number | null> {
  try {
    const result = await nlpAgent.classify({
      subject: email.subject,
      snippet: email.body,
      from: email.from,
    });
    // NLP agent returns priority 1-100; convert to 1-10 for judge comparison
    return Math.max(1, Math.min(10, Math.round(result.priority / 10)));
  } catch (err) {
    console.warn(`[EvalAgent] classify failed for ${email.id}:`, err);
    return null; // signal failure so evaluateEmail records a failing score
  }
}

/** Call the NLP reply drafter directly. */
async function getReply(email: EvalEmail, signal?: AbortSignal): Promise<string> {
  try {
    const tone = email.expectedReplyTone as 'professional' | 'friendly' | 'formal';
    const result = await nlpAgent.draftReply({
      subject: email.subject,
      snippet: email.body,
      from: email.from,
      tone,
    }, undefined, signal);
    return result.reply || '';
  } catch (err) {
    console.warn(`[EvalAgent] draftReply failed for ${email.id}:`, err);
    return '';
  }
}

/** Call the NLP summarizer directly. */
async function getSummary(email: EvalEmail, signal?: AbortSignal): Promise<string> {
  try {
    const result = await nlpAgent.summarize({
      subject: email.subject,
      snippet: email.body,
      from: email.from,
    }, undefined, signal);
    // Combine structured summary fields into one string for judge evaluation
    return [
      result.summary,
      result.keyAsk !== 'No action needed' ? `Key ask: ${result.keyAsk}` : '',
      result.deadline ? `Deadline: ${result.deadline}` : '',
      result.nextStep ? `Next step: ${result.nextStep}` : '',
    ].filter(Boolean).join(' | ');
  } catch (err) {
    console.warn(`[EvalAgent] summarize failed for ${email.id}:`, err);
    return '';
  }
}

/**
 * Query RAG for relevant chunks.
 * Returns { chunks, error? } — empty chunks + no error means empty index (skippable),
 * empty chunks + error means operational failure (not skippable).
 */
async function getRagChunks(email: EvalEmail, signal?: AbortSignal): Promise<{ chunks: string[]; error?: string }> {
  try {
    // Dynamic import to avoid crashing if RAG deps aren't available
    const { ragAgent } = await import('../rag/index');
    const EVAL_USER_ID = '00000000-0000-0000-0000-000000000000';
    const result = await ragAgent.query({
      query: `${email.subject} ${email.body.slice(0, 200)}`,
      userId: EVAL_USER_ID,
      topK: 3,
      similarityThreshold: 0.2,
      hybridWeight: 0.5,
      contextBudgetTokens: 2000,
      rerank: false, // skip reranking to save credits during eval
    }, { signal });
    return { chunks: result.chunks.map(c => c.chunkText) };
  } catch (err) {
    // Differentiate operational failures from unavailable index.
    // Returning the error message lets the caller decide whether to mark
    // the score as "skipped" (environment issue) or "failed" (pipeline bug).
    const msg = err instanceof Error ? err.message : String(err);
    // Suppress logging for expected aborts — timeouts fire AbortError which is
    // normal operational behavior, not a pipeline failure.
    const isAbort = err instanceof Error && err.name === 'AbortError';
    if (!isAbort && !signal?.aborted) {
      console.warn(`[EvalAgent] getRagChunks failed: ${msg}`);
    }
    return { chunks: [], error: msg };
  }
}

// ─── EvalAgent class ──────────────────────────────────────────────────────────

export class EvalAgent {
  /**
   * Evaluate a single email across all 4 categories.
   * Judge calls use llmRouter 'judge' task → Qwen3 VL 235B via OpenRouter.
   *
   * Includes a per-email timeout: if evaluation exceeds PER_EMAIL_TIMEOUT_MS,
   * a timeout result is returned with partial scores (whatever completed
   * before the deadline) plus a failed score for any remaining categories.
   */
  async evaluateEmail(email: EvalEmail): Promise<EvalResult> {
    const start = Date.now();
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    // AbortController allows us to cancel in-flight API calls when the
    // timeout fires — not just stop waiting, but actually abort the HTTP
    // requests so they stop consuming tokens/credits.
    const abortController = new AbortController();
    const { signal } = abortController;

    // Shared scores array: both the inner evaluation and the timeout handler
    // can read from this. The inner evaluation pushes completed scores here
    // as it progresses, and the timeout handler uses whatever has been
    // collected so far to build a partial result — preserving already-paid-for
    // judge results instead of discarding them.
    const sharedScores: EvalScore[] = [];

    // Create timeout promise that we can cancel if inner evaluation wins
    const timeoutPromise = new Promise<EvalResult>((resolve) => {
      timeoutId = setTimeout(() => {
        // Abort in-flight work so API calls stop consuming resources
        abortController.abort();
        // Use sharedScores (not []) so already-completed judge results are preserved
        resolve(this._buildPartialResult(email, start, sharedScores));
      }, PER_EMAIL_TIMEOUT_MS);
    });

    try {
      const innerPromise = this._evaluateEmailInner(email, signal, sharedScores);
      // Swallow errors from the inner promise after timeout resolves the race.
      // When the timeout aborts in-flight fetch calls, llmRouter throws AbortError,
      // but Promise.race no longer awaits the inner promise — without this catch,
      // the abort error becomes an unhandled rejection.
      innerPromise.catch(() => {});
      const result = await Promise.race([innerPromise, timeoutPromise]);
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      return result;
    } catch (err) {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      // Ensure in-flight work is cancelled on unexpected errors too
      abortController.abort();
      throw err;
    }
  }

  /** Inner evaluation logic, separated for timeout wrapping.
   *  Accepts an AbortSignal so in-flight API calls can be cancelled when
   *  the per-email timeout fires.
   *
   *  When signal.aborted is detected, partial scores are preserved — only
   *  the remaining applicable categories are filled with zero/failed entries.
   *  This avoids discarding already-completed (and paid-for) judge results. */
  private async _evaluateEmailInner(email: EvalEmail, signal: AbortSignal, scores: EvalScore[]): Promise<EvalResult> {
    const start = Date.now();

    // 1. Priority accuracy
    const aiPriority = await getClassifyPriority(email, signal);
    if (signal.aborted) return this._buildPartialResult(email, start, scores, 'Evaluation aborted during priority classification');
    if (aiPriority !== null) {
      const priorityJudge = await callJudge(buildPriorityPrompt(email, aiPriority), signal);
      scores.push({
        category: 'priority_accuracy',
        score: priorityJudge.score,
        passed: priorityJudge.score >= PASS_THRESHOLD,
        reasoning: priorityJudge.reasoning,
        skipped: false,
      });
    } else {
      scores.push({
        category: 'priority_accuracy',
        score: 0,
        passed: false,
        reasoning: 'NLP agent failed to classify priority',
        skipped: false,
      });
    }

    // 2. Reply quality (skip for emails with no expected reply)
    if (email.expectedReplyTone !== 'none') {
      const reply = await getReply(email, signal);
      if (signal.aborted) return this._buildPartialResult(email, start, scores, 'Evaluation aborted during reply generation');
      if (reply) {
        const replyJudge = await callJudge(buildReplyPrompt(email, reply), signal);
        scores.push({
          category: 'reply_quality',
          score: replyJudge.score,
          passed: replyJudge.score >= PASS_THRESHOLD,
          reasoning: replyJudge.reasoning,
          skipped: false,
        });
      } else {
        scores.push({
          category: 'reply_quality',
          score: 0,
          passed: false,
          reasoning: 'NLP agent failed to generate a reply',
          skipped: false,
        });
      }
    }

    // 3. Summary completeness
    const summary = await getSummary(email, signal);
    if (signal.aborted) return this._buildPartialResult(email, start, scores, 'Evaluation aborted during summary generation');
    if (summary) {
      const summaryJudge = await callJudge(buildSummaryPrompt(email, summary), signal);
      scores.push({
        category: 'summary_completeness',
        score: summaryJudge.score,
        passed: summaryJudge.score >= PASS_THRESHOLD,
        reasoning: summaryJudge.reasoning,
        skipped: false,
      });
    } else {
      scores.push({
        category: 'summary_completeness',
        score: 0,
        passed: false,
        reasoning: 'NLP agent failed to generate a summary',
        skipped: false,
      });
    }

    // 4. RAG retrieval precision
    const ragResult = await getRagChunks(email, signal);
    if (signal.aborted) return this._buildPartialResult(email, start, scores, 'Evaluation aborted during RAG retrieval');
    if (ragResult.chunks.length > 0) {
      const ragJudge = await callJudge(buildRagPrompt(email, ragResult.chunks), signal);
      scores.push({
        category: 'rag_retrieval_precision',
        score: ragJudge.score,
        passed: ragJudge.score >= PASS_THRESHOLD,
        reasoning: ragJudge.reasoning,
        skipped: false,
      });
    } else if (ragResult.error) {
      // Operational failure (Supabase outage, RPC regression, auth bug, etc.)
      // Mark as failed (not skipped) because this measures a real pipeline bug,
      // not just an empty index. Including it in averages surfaces regressions.
      scores.push({
        category: 'rag_retrieval_precision',
        score: 0,
        passed: false,
        reasoning: `RAG query failed: ${ragResult.error}`,
        skipped: false,
      });
    } else {
      // Empty index — mark as skipped (not failed).
      // A missing index measures environment setup, not retrieval quality.
      // Skipped scores are excluded from pass-rate and average calculations.
      scores.push({
        category: 'rag_retrieval_precision',
        score: 0,
        passed: false,
        reasoning: 'RAG index empty or unavailable — skipped',
        skipped: true,
      });
    }

    // Calculate overall score excluding skipped categories
    const activeScores = scores.filter(s => !s.skipped);
    const overallScore = activeScores.length > 0
      ? Math.round(activeScores.reduce((sum, s) => sum + s.score, 0) / activeScores.length)
      : 0;

    return {
      emailId: email.id,
      subject: email.subject,
      scores,
      overallScore,
      passed: overallScore >= PASS_THRESHOLD,
      durationMs: Date.now() - start,
    };
  }

  /** Get the applicable categories for an email.
   *  Reply quality is only applicable when the email expects a reply. */
  private _getApplicableCategories(email: EvalEmail): EvalCategory[] {
    const cats: EvalCategory[] = ['priority_accuracy', 'summary_completeness', 'rag_retrieval_precision'];
    if (email.expectedReplyTone !== 'none') {
      cats.splice(1, 0, 'reply_quality');
    }
    return cats;
  }

  /** Build a partial EvalResult that preserves already-completed scores
   *  and fills only the missing applicable categories with zero/failed entries.
   *
   *  This avoids discarding already-completed (and paid-for) judge results
   *  when a timeout or abort occurs mid-evaluation. It also respects
   *  per-email category applicability (e.g., reply_quality is skipped
   *  for emails with expectedReplyTone === 'none'). */
  private _buildPartialResult(
    email: EvalEmail,
    start: number,
    completedScores: EvalScore[],
    reason?: string,
  ): EvalResult {
    const applicableCategories = this._getApplicableCategories(email);
    const completedCategories = new Set(completedScores.map(s => s.category));

    const scores = [...completedScores];
    const defaultReason = reason ?? `Evaluation timed out after ${PER_EMAIL_TIMEOUT_MS / 1000}s`;

    for (const cat of applicableCategories) {
      if (!completedCategories.has(cat)) {
        // Timeout-filled categories are semantically different from model failures:
        // they represent evaluation infrastructure issues, not model quality issues.
        // RAG timeouts are marked as skipped (like empty-index) because the model
        // was never actually judged — the environment didn't allow it.
        // Non-RAG timeout categories remain as failed (score 0) since they reflect
        // that the model couldn't produce output in time, which is a quality signal.
        const isRagTimeout = cat === 'rag_retrieval_precision';
        scores.push({
          category: cat,
          score: 0,
          passed: false,
          reasoning: isRagTimeout
            ? 'RAG evaluation timed out — skipped'
            : defaultReason,
          skipped: isRagTimeout,
        });
      }
    }

    // Calculate overall score excluding skipped categories
    const activeScores = scores.filter(s => !s.skipped);
    const overallScore = activeScores.length > 0
      ? Math.round(activeScores.reduce((sum, s) => sum + s.score, 0) / activeScores.length)
      : 0;

    return {
      emailId: email.id,
      subject: email.subject,
      scores,
      overallScore,
      passed: overallScore >= PASS_THRESHOLD,
      durationMs: Date.now() - start,
    };
  }

  /** Build a timeout-failed EvalResult using _buildPartialResult with no completed scores.
   *  Used when no scores have been completed yet (e.g., unrecoverable error at the very start).
   *  Category-aware: reply_quality is only included for emails that expect a reply. */
  private _buildTimeoutResult(email: EvalEmail, start: number, reason?: string): EvalResult {
    return this._buildPartialResult(email, start, [], reason);
  }

  /** Run the full eval suite against all dataset emails.
   *
   *  Evaluates emails sequentially to avoid overwhelming the judge API
   *  with concurrent requests. Each email has its own timeout guard
   *  (PER_EMAIL_TIMEOUT_MS), so a single hung email won't block the suite.
   *
   *  Failed/timed-out emails are included in results (scored 0) rather than
   *  aborting the entire run, giving partial coverage even under degradation.
   */
  async runFullEval(): Promise<EvalRun> {
    const runId = `eval-${Date.now()}`;
    const timestamp = new Date().toISOString();
    const promptVersions = getPromptVersions();
    const results: EvalResult[] = [];

    for (const email of EVAL_DATASET) {
      const emailStart = Date.now();
      try {
        const result = await this.evaluateEmail(email);
        results.push(result);
      } catch (err) {
        // Graceful degradation: record a failure with all 4 categories instead of aborting the run
        const errMsg = err instanceof Error ? err.message : String(err);
        console.error(`[EvalAgent] Unrecoverable error for email ${email.id}: ${errMsg}`);
        results.push(this._buildTimeoutResult(email, emailStart, `Unrecoverable error: ${errMsg}`));
      }
    }

    return {
      runId,
      timestamp,
      promptVersions,
      results,
      summary: this.buildSummary(results),
    };
  }

  private buildSummary(results: EvalResult[]): EvalRun['summary'] {
    const total = results.length;
    const passed = results.filter((r) => r.passed).length;
    const avgScore = total > 0
      ? Math.round(results.reduce((s, r) => s + r.overallScore, 0) / total)
      : 0;

    const categories: EvalCategory[] = [
      'priority_accuracy', 'reply_quality', 'summary_completeness', 'rag_retrieval_precision',
    ];

    const byCategory: EvalRun['summary']['byCategory'] = {};
    for (const cat of categories) {
      // Exclude skipped scores from summary calculations (they measure
      // environment setup, not model quality)
      const catScores = results
        .flatMap((r) => r.scores.filter((s) => s.category === cat && !s.skipped));
      if (catScores.length === 0) continue;
      byCategory[cat] = {
        avg: Math.round(catScores.reduce((s, c) => s + c.score, 0) / catScores.length),
        passRate: Math.round((catScores.filter((c) => c.passed).length / catScores.length) * 100),
      };
    }

    return {
      total,
      passed,
      failed: total - passed,
      passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
      avgScore,
      byCategory,
    };
  }
}
