/**
 * @file src/agents/testing/__tests__/evalAgent.timeout.test.ts
 * Tests for EvalAgent timeout/partial-score preservation and RAG skipped behavior.
 *
 * These tests verify that:
 * 1. When a per-email timeout fires, already-completed judge scores are preserved
 *    (not discarded) in the partial result.
 * 2. RAG retrieval precision is marked as "skipped" when the index is empty,
 *    and skipped scores are excluded from overall score / pass-rate calculations.
 *
 * Run: npx jest src/agents/testing/__tests__/evalAgent.timeout.test.ts
 */

import { EvalAgent, EvalScore } from '../evalAgent';
import { EVAL_DATASET } from '../eval-dataset';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock the NLP agent so we don't make real API calls
jest.mock('../../nlp/index', () => ({
  nlpAgent: {
    classify: jest.fn().mockResolvedValue({ category: 'fyi', priority: 50 }),
    draftReply: jest.fn().mockResolvedValue({ reply: 'Test reply' }),
    summarize: jest.fn().mockResolvedValue({
      summary: 'Test summary',
      keyAsk: 'No action needed',
      deadline: null,
      nextStep: null,
    }),
  },
}));

// Mock the RAG agent — returns empty chunks to test skipped behavior
jest.mock('../../rag/index', () => ({
  ragAgent: {
    query: jest.fn().mockResolvedValue({ chunks: [] }),
  },
}));

// Mock llmRouter to simulate judge calls with controlled timing
const mockGenerateText = jest.fn();
jest.mock('../../../llm/router', () => ({
  llmRouter: {
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  },
}));

// Mock promptVersions to avoid importing all NLP prompts
jest.mock('../promptVersions', () => ({
  getPromptVersions: jest.fn().mockReturnValue({ 'test.v1': 'abc123' }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Find the first email in the dataset that expects a reply. */
function getEmailWithReply() {
  return EVAL_DATASET.find(e => e.expectedReplyTone !== 'none')!;
}

/** Find the first email in the dataset that does NOT expect a reply. */
function getEmailWithoutReply() {
  return EVAL_DATASET.find(e => e.expectedReplyTone === 'none')!;
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('EvalAgent — timeout & partial scores', () => {
  let agent: EvalAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new EvalAgent();
  });

  test('preserves already-completed scores when timeout fires mid-evaluation', async () => {
    // This test uses real timing with a short PER_EMAIL_TIMEOUT_MS.
    // We mock the judge to complete priority quickly but hang on summary,
    // then verify the partial result preserves the priority score.
    const email = getEmailWithReply();

    // Priority judge completes instantly, summary judge hangs forever
    let callCount = 0;
    mockGenerateText.mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        // Priority judge — complete quickly
        return { data: { score: 85, reasoning: 'Good priority match' }, usage: { totalTokens: 10 }, model: 'test' };
      }
      // All subsequent judge calls hang (simulate slow API)
      await new Promise(() => {}); // never resolves
    });

    // We can't easily override PER_EMAIL_TIMEOUT_MS (it's a module-level const),
    // so we test the _buildPartialResult method directly instead.
    const completedScores: EvalScore[] = [
      {
        category: 'priority_accuracy',
        score: 85,
        passed: true,
        reasoning: 'Good priority match',
        skipped: false,
      },
    ];

    // Access private method via bracket notation
    const result = (agent as any)._buildPartialResult(email, Date.now(), completedScores);

    // Priority score should be preserved
    const priorityScore = result.scores.find((s: EvalScore) => s.category === 'priority_accuracy');
    expect(priorityScore).toBeDefined();
    expect(priorityScore.score).toBe(85);
    expect(priorityScore.passed).toBe(true);

    // Missing categories should be filled with zero/failed
    const replyScore = result.scores.find((s: EvalScore) => s.category === 'reply_quality');
    expect(replyScore).toBeDefined();
    expect(replyScore.score).toBe(0);
    expect(replyScore.passed).toBe(false);

    const summaryScore = result.scores.find((s: EvalScore) => s.category === 'summary_completeness');
    expect(summaryScore).toBeDefined();
    expect(summaryScore.score).toBe(0);
    expect(summaryScore.passed).toBe(false);
  });

  test('_buildPartialResult does not add reply_quality for emails without expected reply', () => {
    const email = getEmailWithoutReply();
    const completedScores: EvalScore[] = [
      {
        category: 'priority_accuracy',
        score: 90,
        passed: true,
        reasoning: 'Exact match',
        skipped: false,
      },
    ];

    const result = (agent as any)._buildPartialResult(email, Date.now(), completedScores);

    // reply_quality should NOT be present
    const replyScore = result.scores.find((s: EvalScore) => s.category === 'reply_quality');
    expect(replyScore).toBeUndefined();
  });

  test('overallScore excludes skipped scores (from both empty-index and timeout-fill)', () => {
    const email = getEmailWithReply();
    // Simulate partial eval where only priority completed before timeout.
    // RAG, reply, and summary were NOT completed — _buildPartialResult will fill them.
    const completedScores: EvalScore[] = [
      {
        category: 'priority_accuracy',
        score: 80,
        passed: true,
        reasoning: 'Good',
        skipped: false,
      },
    ];

    const result = (agent as any)._buildPartialResult(email, Date.now(), completedScores);

    // _buildPartialResult fills missing applicable categories:
    //  - reply_quality: skipped=false, score=0 (model quality signal)
    //  - summary_completeness: skipped=false, score=0 (model quality signal)
    //  - rag_retrieval_precision: skipped=true (RAG timeout → environment, not model quality)
    // Non-skipped scores: priority=80, reply=0, summary=0 → avg = 80/3 ≈ 27
    const nonSkipped = result.scores.filter((s: EvalScore) => !s.skipped);
    const ragScore = result.scores.find((s: EvalScore) => s.category === 'rag_retrieval_precision');
    expect(ragScore.skipped).toBe(true);
    expect(ragScore.reasoning).toBe('RAG evaluation timed out — skipped');
    expect(nonSkipped.length).toBe(3); // priority + reply + summary (RAG excluded)
    expect(result.overallScore).toBe(Math.round(80 / 3)); // 27
  });

  test('already-completed skipped scores are preserved by _buildPartialResult', () => {
    const email = getEmailWithReply();
    // Simulate partial eval where priority completed AND RAG was already marked
    // as skipped (empty index), but reply + summary timed out.
    const completedScores: EvalScore[] = [
      {
        category: 'priority_accuracy',
        score: 80,
        passed: true,
        reasoning: 'Good',
        skipped: false,
      },
      {
        category: 'rag_retrieval_precision',
        score: 0,
        passed: false,
        reasoning: 'RAG index empty or unavailable — skipped',
        skipped: true,
      },
    ];

    const result = (agent as any)._buildPartialResult(email, Date.now(), completedScores);

    // The already-completed RAG score should keep its original reasoning (not overwritten)
    const ragScore = result.scores.find((s: EvalScore) => s.category === 'rag_retrieval_precision');
    expect(ragScore.skipped).toBe(true);
    expect(ragScore.reasoning).toBe('RAG index empty or unavailable — skipped');

    // overallScore still excludes all skipped scores
    const nonSkipped = result.scores.filter((s: EvalScore) => !s.skipped);
    expect(nonSkipped.length).toBe(3); // priority + reply + summary
    expect(result.overallScore).toBe(Math.round(80 / 3)); // 27
  });

  test('_getApplicableCategories includes reply_quality only for emails with expected reply', () => {
    const emailWithReply = getEmailWithReply();
    const emailWithoutReply = getEmailWithoutReply();

    const catsWith = (agent as any)._getApplicableCategories(emailWithReply);
    const catsWithout = (agent as any)._getApplicableCategories(emailWithoutReply);

    expect(catsWith).toContain('reply_quality');
    expect(catsWithout).not.toContain('reply_quality');
  });
});

describe('EvalAgent — RAG skipped behavior', () => {
  let agent: EvalAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new EvalAgent();
  });

  test('buildSummary excludes skipped scores from category averages', () => {
    const results = [
      {
        emailId: 'test-1',
        subject: 'Test Email',
        scores: [
          { category: 'priority_accuracy', score: 90, passed: true, reasoning: 'Good', skipped: false },
          { category: 'summary_completeness', score: 80, passed: true, reasoning: 'Decent', skipped: false },
          { category: 'rag_retrieval_precision', score: 0, passed: false, reasoning: 'Skipped', skipped: true },
        ],
        overallScore: 85, // average of 90 + 80 = 85 (skipping rag)
        passed: true,
        durationMs: 500,
      },
    ];

    const summary = (agent as any).buildSummary(results);

    // rag_retrieval_precision should be excluded from byCategory since all scores are skipped
    expect(summary.byCategory.rag_retrieval_precision).toBeUndefined();

    // priority_accuracy and summary_completeness should still be present
    expect(summary.byCategory.priority_accuracy).toBeDefined();
    expect(summary.byCategory.priority_accuracy.avg).toBe(90);
    expect(summary.byCategory.summary_completeness).toBeDefined();
    expect(summary.byCategory.summary_completeness.avg).toBe(80);
  });

  test('buildSummary includes non-skipped rag scores when available', () => {
    const results = [
      {
        emailId: 'test-1',
        subject: 'Test Email',
        scores: [
          { category: 'priority_accuracy', score: 90, passed: true, reasoning: 'Good', skipped: false },
          { category: 'rag_retrieval_precision', score: 75, passed: true, reasoning: 'Good retrieval', skipped: false },
        ],
        overallScore: 82,
        passed: true,
        durationMs: 500,
      },
    ];

    const summary = (agent as any).buildSummary(results);
    expect(summary.byCategory.rag_retrieval_precision).toBeDefined();
    expect(summary.byCategory.rag_retrieval_precision.avg).toBe(75);
  });
});
