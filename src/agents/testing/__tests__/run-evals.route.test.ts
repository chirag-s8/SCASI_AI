/**
 * @file src/agents/testing/__tests__/run-evals.route.test.ts
 * Route integration tests for the /api/actions/run-evals endpoints.
 *
 * Tests the POST and GET handlers by mocking NextAuth, next/server, and
 * Supabase, verifying that auth checks, error handling, and response
 * shapes work correctly at the route level.
 *
 * Run: npx jest src/agents/testing/__tests__/run-evals.route.test.ts
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Use relative paths for jest.mock to avoid path-alias resolution issues.

// Mock next-auth getServerSession
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

// Mock next/server — NextRequest/NextResponse require Web APIs (Request, Response)
// that are not available in Jest's jsdom environment without polyfilling.
// We mock them with simple objects that have the shape our tests need.
jest.mock('next/server', () => ({
  NextRequest: class {
    url: string;
    method: string;
    constructor(input: string, init?: { method?: string }) {
      this.url = input;
      this.method = init?.method ?? 'GET';
    }
  },
  NextResponse: {
    json: (data: unknown, init?: { status?: number }) => ({
      status: init?.status ?? 200,
      json: async () => data,
    }),
  },
}));

// Mock authOptions
jest.mock('../../../../app/api/auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

// Mock EvalAgent — avoid real API calls
const mockRunFullEval = jest.fn();
jest.mock('../evalAgent', () => ({
  EvalAgent: class {
    runFullEval = mockRunFullEval;
  },
}));

// Mock Supabase
const mockFrom = jest.fn();
const mockSelect = jest.fn();
const mockInsert = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();

jest.mock('../../../../lib/supabase', () => ({
  getSupabaseAdmin: () => ({
    from: mockFrom,
  }),
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

import { POST, GET } from '../../../../app/api/actions/run-evals/route';
import { _resetEvalAuthState } from '../evalAuth';

/** Create a minimal request-like object for POST. */
function makePostRequest() {
  return { url: 'http://localhost/api/actions/run-evals', method: 'POST' };
}

/** Standard eval result shape returned by EvalAgent. */
const MOCK_EVAL_RUN = {
  runId: 'eval-1234567890',
  timestamp: new Date().toISOString(),
  promptVersions: { 'classify.v1': 'abc123' },
  results: [],
  summary: {
    total: 15,
    passed: 10,
    failed: 5,
    passRate: 67,
    avgScore: 72,
    byCategory: {},
  },
};

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('POST /api/actions/run-evals', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    _resetEvalAuthState();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.EVAL_ADMIN_EMAILS = 'admin@scasi.ai';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ─── Auth failures ──────────────────────────────────────────────────────

  it('returns 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makePostRequest() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 401 when session has no email', async () => {
    mockGetServerSession.mockResolvedValue({ user: {} });
    const res = await POST(makePostRequest() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(401);
  });

  it('returns 403 for unverified email in allowlist', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'admin@scasi.ai' },
      emailVerified: false,
    });
    const res = await POST(makePostRequest() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error).toContain('Forbidden');
  });

  it('returns 403 for verified email NOT in allowlist', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'stranger@evil.com' },
      emailVerified: true,
    });
    const res = await POST(makePostRequest() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(403);
  });

  // ─── Success path ───────────────────────────────────────────────────────

  it('returns eval results for authorized user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'admin@scasi.ai' },
      emailVerified: true,
    });
    mockRunFullEval.mockResolvedValue(MOCK_EVAL_RUN);
    mockFrom.mockReturnValue({
      insert: mockInsert.mockReturnValue({ error: null }),
    });

    const res = await POST(makePostRequest() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runId).toBe(MOCK_EVAL_RUN.runId);
    expect(body.summary.passRate).toBe(67);
  });

  it('still returns results when Supabase persistence fails', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'admin@scasi.ai' },
      emailVerified: true,
    });
    mockRunFullEval.mockResolvedValue(MOCK_EVAL_RUN);
    mockFrom.mockReturnValue({
      insert: mockInsert.mockReturnValue({
        error: { message: 'DB connection failed' },
      }),
    });

    const res = await POST(makePostRequest() as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runId).toBe(MOCK_EVAL_RUN.runId);
  });
});

describe('GET /api/actions/run-evals', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    _resetEvalAuthState();
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.EVAL_ADMIN_EMAILS = 'admin@scasi.ai';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ─── Auth failures ──────────────────────────────────────────────────────

  it('returns 401 when no session exists', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it('returns 403 for unverified email', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'admin@scasi.ai' },
      emailVerified: false,
    });
    const res = await GET();
    expect(res.status).toBe(403);
  });

  // ─── Success path ───────────────────────────────────────────────────────

  it('returns eval history for authorized user', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'admin@scasi.ai' },
      emailVerified: true,
    });

    const mockRows = [
      {
        run_id: 'eval-1',
        timestamp: '2025-01-01T00:00:00Z',
        prompt_versions: { 'classify.v1': 'abc123' },
        summary: { passRate: 80, passed: 12, failed: 3, total: 15, avgScore: 75, byCategory: {} },
      },
    ];

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        order: mockOrder.mockReturnValue({
          limit: mockLimit.mockReturnValue({ data: mockRows, error: null }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runs).toHaveLength(1);
    expect(body.runs[0].runId).toBe('eval-1');
    // PII: triggered_by should NOT be in the response
    expect(body.runs[0]).not.toHaveProperty('triggeredBy');
  });

  it('returns 500 when Supabase query fails', async () => {
    mockGetServerSession.mockResolvedValue({
      user: { email: 'admin@scasi.ai' },
      emailVerified: true,
    });

    mockFrom.mockReturnValue({
      select: mockSelect.mockReturnValue({
        order: mockOrder.mockReturnValue({
          limit: mockLimit.mockReturnValue({ data: null, error: { message: 'Connection refused' } }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
