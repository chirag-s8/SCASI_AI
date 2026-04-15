/**
 * @file src/agents/testing/__tests__/evalAgent.ragSkipped.test.ts
 * Tests for RAG empty-index vs operational-failure behavior
 * through the public evaluateEmail() path.
 *
 * Verifies:
 * 1. When RAG returns empty chunks + no error → rag_retrieval_precision is skipped: true
 * 2. When RAG returns empty chunks + error → rag_retrieval_precision is skipped: false (failed)
 * 3. Skipped RAG scores are excluded from overallScore calculation
 *
 * Run: npx jest src/agents/testing/__tests__/evalAgent.ragSkipped.test.ts
 */

import { EvalAgent, EvalScore } from '../evalAgent';
import { EVAL_DATASET } from '../eval-dataset';

// ─── Mocks ──────────────────────────────────────────────────────────────────

// Mock the NLP agent
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

// We'll dynamically control the RAG mock per test
const mockRagQuery = jest.fn();
jest.mock('../../rag/index', () => ({
  ragAgent: {
    query: (...args: unknown[]) => mockRagQuery(...args),
  },
}));

// Mock llmRouter judge calls — return high scores for all categories
const mockGenerateText = jest.fn();
jest.mock('../../../llm/router', () => ({
  llmRouter: {
    generateText: (...args: unknown[]) => mockGenerateText(...args),
  },
}));

// Mock promptVersions
jest.mock('../promptVersions', () => ({
  getPromptVersions: jest.fn().mockReturnValue({ 'test.v1': 'abc123' }),
}));

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('EvalAgent — RAG skipped vs failed', () => {
  let agent: EvalAgent;

  beforeEach(() => {
    jest.clearAllMocks();
    agent = new EvalAgent();

    // Default: judge returns passing scores for all categories
    mockGenerateText.mockResolvedValue({
      data: { score: 85, reasoning: 'Good quality' },
      usage: { totalTokens: 10 },
      model: 'test',
    });
  });

  test('empty RAG index produces skipped: true score', async () => {
    // RAG returns empty chunks with no error → empty index
    mockRagQuery.mockResolvedValue({ chunks: [] });

    // Use an email without expected reply to simplify (3 categories instead of 4)
    const email = EVAL_DATASET.find(e => e.expectedReplyTone === 'none')!;
    const result = await agent.evaluateEmail(email);

    const ragScore = result.scores.find((s: EvalScore) => s.category === 'rag_retrieval_precision');
    expect(ragScore).toBeDefined();
    expect(ragScore.skipped).toBe(true);
    expect(ragScore.reasoning).toContain('skipped');

    // Skipped scores should be excluded from overallScore
    const nonSkipped = result.scores.filter((s: EvalScore) => !s.skipped);
    expect(nonSkipped.length).toBeLessThan(result.scores.length);
    // overallScore is average of non-skipped only
    const expectedAvg = Math.round(
      nonSkipped.reduce((sum: number, s: EvalScore) => sum + s.score, 0) / nonSkipped.length
    );
    expect(result.overallScore).toBe(expectedAvg);
  });

  test('RAG operational failure produces skipped: false score with error reasoning', async () => {
    // RAG throws an error → operational failure
    mockRagQuery.mockRejectedValue(new Error('Supabase connection refused'));

    const email = EVAL_DATASET.find(e => e.expectedReplyTone === 'none')!;
    const result = await agent.evaluateEmail(email);

    const ragScore = result.scores.find((s: EvalScore) => s.category === 'rag_retrieval_precision');
    expect(ragScore).toBeDefined();
    expect(ragScore.skipped).toBe(false);
    expect(ragScore.score).toBe(0);
    expect(ragScore.passed).toBe(false);
    expect(ragScore.reasoning).toContain('RAG query failed');
    expect(ragScore.reasoning).toContain('Supabase connection refused');

    // Non-skipped scores include the failed RAG score
    const nonSkipped = result.scores.filter((s: EvalScore) => !s.skipped);
    expect(nonSkipped).toContainEqual(ragScore);
  });

  test('RAG with results produces normal non-skipped score', async () => {
    // RAG returns actual chunks
    mockRagQuery.mockResolvedValue({
      chunks: [
        { chunkText: 'Relevant chunk about the email topic' },
        { chunkText: 'Another relevant chunk' },
      ],
    });

    const email = EVAL_DATASET.find(e => e.expectedReplyTone === 'none')!;
    const result = await agent.evaluateEmail(email);

    const ragScore = result.scores.find((s: EvalScore) => s.category === 'rag_retrieval_precision');
    expect(ragScore).toBeDefined();
    expect(ragScore.skipped).toBe(false);
    expect(ragScore.score).toBe(85); // from mock judge
    expect(ragScore.passed).toBe(true);
  });
});
