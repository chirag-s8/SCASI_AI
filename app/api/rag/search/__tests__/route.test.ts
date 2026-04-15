/**
 * @file app/api/rag/search/__tests__/route.test.ts
 * Route integration tests for the /api/rag/search endpoint.
 *
 * Verifies:
 * 1. Returns 401 when no session
 * 2. Returns 400 when query is missing or too long
 * 3. Returns search results on valid request
 * 4. Returns 500 when ragAgent.query throws (operational failure)
 * 5. Returns empty chunks when index is empty (not an error)
 * 6. Forwards request signal to ragAgent.query
 * 7. Distinguishes empty index (200) from operational failure (500)
 *
 * Run: npx jest app/api/rag/search/__tests__/route.test.ts
 */

// ─── Mocks ──────────────────────────────────────────────────────────────────
// Use relative paths for jest.mock to avoid path-alias resolution issues.

// Mock next-auth
const mockGetServerSession = jest.fn();
jest.mock('next-auth', () => ({
  getServerSession: (...args: unknown[]) => mockGetServerSession(...args),
}));

// Mock next/server — NextRequest/NextResponse require Web APIs (Request, Response)
// that are not available in Jest's jsdom environment without polyfilling.
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
jest.mock('../../../auth/[...nextauth]/route', () => ({
  authOptions: {},
}));

// Mock supabase
jest.mock('../../../../../lib/supabase', () => ({
  ensureUserExists: jest.fn().mockResolvedValue('user-123'),
}));

// Mock RAG repository
jest.mock('../../../../../src/agents/rag/repository', () => ({
  ensureUser: jest.fn().mockResolvedValue(undefined),
}));

// Mock ragAgent
const mockQuery = jest.fn();
jest.mock('../../../../../src/agents/rag', () => ({
  ragAgent: {
    query: (...args: unknown[]) => mockQuery(...args),
  },
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { POST } from '../route';

/** Create a minimal request-like object with a JSON body and a signal. */
function makeRequest(body: Record<string, unknown>) {
  return {
    json: async () => body,
    signal: new AbortController().signal,
  };
}

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('POST /api/rag/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue({
      user: { email: 'test@example.com', name: 'Test' },
    });
  });

  test('returns 401 when no session', async () => {
    mockGetServerSession.mockResolvedValue(null);
    const res = await POST(makeRequest({ query: 'test' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(401);
    const data = await res.json();
    expect(data.error).toBe('Unauthorized');
  });

  test('returns 400 when query is missing', async () => {
    const res = await POST(makeRequest({}) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('query is required');
  });

  test('returns 400 when query is too long', async () => {
    const res = await POST(makeRequest({ query: 'x'.repeat(4001) }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('1-4000');
  });

  test('returns 400 when query is empty string', async () => {
    const res = await POST(makeRequest({ query: '   ' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain('1-4000');
  });

  test('returns results on valid request with chunks', async () => {
    mockQuery.mockResolvedValue({
      chunks: [
        { chunkId: '1', emailId: 'e1', chunkText: 'Hello world', chunkType: 'body', chunkIndex: 0, vectorScore: 0.9, ftsScore: 0.5, combinedScore: 0.7 },
      ],
      contextBlock: 'Hello world',
      totalChunksSearched: 5,
    });

    const res = await POST(makeRequest({ query: 'hello' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chunks).toHaveLength(1);
    expect(data.totalChunksSearched).toBe(5);
  });

  test('returns empty chunks when index is empty (not an error)', async () => {
    mockQuery.mockResolvedValue({
      chunks: [],
      contextBlock: '',
      totalChunksSearched: 0,
    });

    const res = await POST(makeRequest({ query: 'nonexistent topic' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.chunks).toHaveLength(0);
    expect(data.contextBlock).toBe('');
  });

  test('returns 500 when ragAgent.query throws (operational failure)', async () => {
    mockQuery.mockRejectedValue(new Error('Supabase connection failed'));

    const res = await POST(makeRequest({ query: 'test' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain('Supabase connection failed');
  });

  test('clamps topK to valid range', async () => {
    mockQuery.mockResolvedValue({
      chunks: [],
      contextBlock: '',
      totalChunksSearched: 0,
    });

    // topK too high → clamped to 50
    const res = await POST(makeRequest({ query: 'test', topK: 100 }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(200);
    expect(mockQuery).toHaveBeenCalledWith(
      expect.objectContaining({ topK: 50 }),
      expect.objectContaining({ traceId: expect.any(String) }),
    );
  });

  test('forwards request signal to ragAgent.query', async () => {
    mockQuery.mockResolvedValue({
      chunks: [],
      contextBlock: '',
      totalChunksSearched: 0,
    });

    const res = await POST(makeRequest({ query: 'test' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(res.status).toBe(200);
    // Verify the second arg to ragAgent.query includes a signal property
    const callArgs = mockQuery.mock.calls[0];
    expect(callArgs[1]).toEqual(
      expect.objectContaining({
        traceId: expect.any(String),
        signal: expect.any(AbortSignal),
      }),
    );
  });

  test('distinguishes empty index (200 + empty chunks) from operational failure (500)', async () => {
    // Empty index → 200 with empty chunks (not an error)
    mockQuery.mockResolvedValue({
      chunks: [],
      contextBlock: '',
      totalChunksSearched: 0,
    });
    const emptyRes = await POST(makeRequest({ query: 'nothing matches' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(emptyRes.status).toBe(200);
    const emptyData = await emptyRes.json();
    expect(emptyData.chunks).toEqual([]);

    // Operational failure → 500 with error message
    mockQuery.mockRejectedValue(new Error('Hybrid search RPC failed: connection refused'));
    const failRes = await POST(makeRequest({ query: 'test' }) as any); // eslint-disable-line @typescript-eslint/no-explicit-any
    expect(failRes.status).toBe(500);
    const failData = await failRes.json();
    expect(failData.error).toContain('connection refused');
  });
});
