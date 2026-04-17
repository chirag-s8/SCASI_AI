/**
 * @file lib/__tests__/inboxFlows.test.js
 * Integration tests for inbox flows using store-backed hooks.
 *
 * Hooks now read/write directly from the Zustand store rather than
 * maintaining duplicate local state. Tests verify that store state
 * is updated correctly through the hook callbacks.
 *
 * Uses jest fetch mocking — no real network calls.
 */

import { renderHook, act } from "@testing-library/react";
import { useFetchEmails } from "../hooks/useFetchEmails";
import { useTriage } from "../hooks/useTriage";
import { useHandleForMe } from "../hooks/useHandleForMe";
import { useReplyFlow } from "../hooks/useReplyFlow";
import { useInboxStore } from "../inboxStore";

// Polyfill TextEncoder/TextDecoder for jsdom environment
const { TextEncoder, TextDecoder } = require("util");
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// ─── Global fetch mock ────────────────────────────────────────────
beforeEach(() => {
  global.fetch = jest.fn();
  // Reset the Zustand store before each test
  useInboxStore.setState({
    emails: [],
    loading: false,
    fetchError: null,
    nextPageToken: null,
    triageLoading: false,
    triageStep: 0,
    triageResultBody: null,
    handleForMeResult: "",
    loadingHandleForMe: false,
    hfmData: null,
    aiSummary: "",
    aiReason: "",
    aiReply: "",
    editableReply: "",
    loadingSummary: false,
    loadingExplanation: false,
    loadingReply: false,
    sendingReply: false,
    replySent: false,
    sendError: null,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

// ─── Helpers ──────────────────────────────────────────────────────
function mockJsonResponse(data, status = 200) {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => "application/json" },
    json: () => Promise.resolve(data),
  });
}

// Mock streaming response using a fake reader (avoids ReadableStream in jsdom)
function mockStreamResponse(chunks) {
  const encoder = new TextEncoder();
  const encoded = chunks.map(c => encoder.encode(c));
  let index = 0;
  const reader = {
    read: jest.fn(() => {
      if (index < encoded.length) {
        return Promise.resolve({ done: false, value: encoded[index++] });
      }
      return Promise.resolve({ done: true, value: undefined });
    }),
    cancel: jest.fn(() => Promise.resolve()),
  };
  return Promise.resolve({
    ok: true,
    status: 200,
    body: { getReader: () => reader },
    headers: { get: () => "text/event-stream" },
  });
}

const SAMPLE_EMAILS = [
  { id: "email-1", subject: "Invoice due", snippet: "Please pay invoice", from: "billing@acme.com", date: new Date().toISOString() },
  { id: "email-2", subject: "Team meeting", snippet: "Join us at 3pm", from: "boss@acme.com", date: new Date().toISOString() },
];

// Helper: read current store state
function storeState() {
  return useInboxStore.getState();
}

// ─────────────────────────────────────────────────────────────────
// FLOW 1: Fetch emails
// ─────────────────────────────────────────────────────────────────
describe("useFetchEmails — fetch flow", () => {
  it("fetches emails and populates store state", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/gmail")) return mockJsonResponse({ emails: SAMPLE_EMAILS, nextPageToken: null });
      if (url.includes("/api/db/emails")) return mockJsonResponse({});
      if (url.includes("/api/actions/index-emails")) return mockJsonResponse({});
      return mockJsonResponse({});
    });

    const { result } = renderHook(() => useFetchEmails());

    await act(async () => {
      await result.current.fetchEmails("inbox");
    });

    expect(storeState().emails).toHaveLength(2);
    expect(storeState().emails[0].id).toBe("email-1");
    expect(storeState().loading).toBe(false);
    expect(storeState().fetchError).toBeNull();
  });

  it("sets fetchError on non-JSON response (cold start)", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: () => "text/html" },
    });

    const { result } = renderHook(() => useFetchEmails());

    await act(async () => {
      await result.current.fetchEmails("inbox");
    });

    expect(storeState().fetchError).toContain("warming up");
    expect(storeState().emails).toHaveLength(0);
  });

  it("sets fetchError on API error", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/gmail")) return mockJsonResponse({ error: "Unauthorized" }, 401);
      return mockJsonResponse({});
    });

    const { result } = renderHook(() => useFetchEmails());

    await act(async () => {
      await result.current.fetchEmails("inbox");
    });

    expect(storeState().fetchError).toBeTruthy();
  });

  it("skips fetch for non-Gmail folders", async () => {
    const { result } = renderHook(() => useFetchEmails());

    await act(async () => {
      await result.current.fetchEmails("starred");
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(storeState().emails).toHaveLength(0);
  });

  it("deduplicates emails on pagination load", async () => {
    global.fetch.mockImplementation((url) => {
      if (url.includes("pageToken")) {
        return mockJsonResponse({ emails: [SAMPLE_EMAILS[1]], nextPageToken: null });
      }
      return mockJsonResponse({ emails: [SAMPLE_EMAILS[0]], nextPageToken: "tok123" });
    });

    const { result } = renderHook(() => useFetchEmails());

    await act(async () => { await result.current.fetchEmails("inbox"); });
    await act(async () => { await result.current.loadMore("inbox", "tok123"); });

    expect(storeState().emails).toHaveLength(2);
  });
});

// ─────────────────────────────────────────────────────────────────
// FLOW 2: Triage
// ─────────────────────────────────────────────────────────────────
describe("useTriage — triage flow", () => {
  it("runs triage and sets structured result in store", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({
      stats: { urgent: 1, fyi: 1, total: 2, needsReply: 0 },
      items: [{ subject: "Invoice due", sender: "billing@acme.com", urgency: "urgent", action: "Review" }],
    }));

    const { result } = renderHook(() => useTriage());

    await act(async () => {
      await result.current.runInboxTriage(SAMPLE_EMAILS);
    });

    expect(storeState().triageResultBody).not.toBeNull();
    expect(storeState().triageResultBody.kind).toBe("stats");
    expect(storeState().triageLoading).toBe(false);
    expect(storeState().triageStep).toBe(0);
  });

  it("handles inbox_zero when no emails", async () => {
    const { result } = renderHook(() => useTriage());

    await act(async () => {
      await result.current.runInboxTriage([]);
    });

    expect(storeState().triageResultBody.kind).toBe("text");
    expect(storeState().triageResultBody.text).toBe("inbox_zero");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("handles API error gracefully", async () => {
    global.fetch.mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useTriage());

    await act(async () => {
      await result.current.runInboxTriage(SAMPLE_EMAILS);
    });

    expect(storeState().triageResultBody.kind).toBe("text");
    expect(storeState().triageResultBody.text).toContain("❌");
    expect(storeState().triageLoading).toBe(false);
  });

  it("handles raw text response", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ raw: "Here is your triage summary..." }));

    const { result } = renderHook(() => useTriage());

    await act(async () => {
      await result.current.runInboxTriage(SAMPLE_EMAILS);
    });

    expect(storeState().triageResultBody.kind).toBe("text");
    expect(storeState().triageResultBody.text).toContain("triage summary");
  });

  it("resetTriage clears store state", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ raw: "result" }));
    const { result } = renderHook(() => useTriage());

    await act(async () => { await result.current.runInboxTriage(SAMPLE_EMAILS); });
    act(() => { result.current.resetTriage(); });

    expect(storeState().triageResultBody).toBeNull();
    expect(storeState().triageStep).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────
// FLOW 3: Handle For Me (AI orchestration)
// ─────────────────────────────────────────────────────────────────
describe("useHandleForMe — AI handle flow", () => {
  const sseChunks = [
    `data: ${JSON.stringify({ type: "token", text: "**Summary:** Invoice needs payment.\n" })}\n\n`,
    `data: ${JSON.stringify({ type: "token", text: "**Draft Reply:**\nDear Client,\n\nWill process shortly.\n\nBest regards" })}\n\n`,
  ];

  it("streams tokens and updates store state", async () => {
    global.fetch.mockReturnValue(mockStreamResponse(sseChunks));

    const { result } = renderHook(() => useHandleForMe());

    await act(async () => {
      await result.current.runHandleForMe(SAMPLE_EMAILS[0]);
    });

    expect(storeState().loadingHandleForMe).toBe(false);
    expect(storeState().handleForMeResult).toBeTruthy();
  });

  it("sets error message on non-ok response", async () => {
    global.fetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "LLM failed" }),
    });

    const { result } = renderHook(() => useHandleForMe());

    await act(async () => {
      await result.current.runHandleForMe(SAMPLE_EMAILS[0]);
    });

    expect(storeState().handleForMeResult).toContain("❌");
    expect(storeState().loadingHandleForMe).toBe(false);
  });

  it("does nothing when mail is null", async () => {
    const { result } = renderHook(() => useHandleForMe());

    await act(async () => {
      await result.current.runHandleForMe(null);
    });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(storeState().handleForMeResult).toBe("");
  });

  it("resetHandleForMe clears store state", async () => {
    global.fetch.mockReturnValue(mockStreamResponse(sseChunks));
    const { result } = renderHook(() => useHandleForMe());

    await act(async () => { await result.current.runHandleForMe(SAMPLE_EMAILS[0]); });
    act(() => { result.current.resetHandleForMe(); });

    expect(storeState().handleForMeResult).toBe("");
    expect(storeState().hfmData).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────
// FLOW 4: Reply flow
// ─────────────────────────────────────────────────────────────────
describe("useReplyFlow — reply flow", () => {
  const selectedMail = {
    id: "email-1",
    subject: "Invoice due",
    snippet: "Please pay invoice",
    from: "billing@acme.com",
    threadId: "thread-1",
    messageId: "msg-1",
    date: new Date().toISOString(),
  };

  it("generateReply fetches and sets store aiReply", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ reply: "Thank you for your email." }));

    const { result } = renderHook(() => useReplyFlow());

    await act(async () => {
      await result.current.generateReply(selectedMail);
    });

    expect(storeState().aiReply).toBe("Thank you for your email.");
    expect(storeState().editableReply).toBe("Thank you for your email.");
    expect(storeState().loadingReply).toBe(false);
  });

  it("sendDraftReply sends and sets replySent on success", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ success: true }));

    const { result } = renderHook(() => useReplyFlow());

    let success;
    await act(async () => {
      success = await result.current.sendDraftReply(selectedMail, "Will process shortly.");
    });

    expect(success).toBe(true);
    expect(storeState().replySent).toBe(true);
    expect(storeState().sendingReply).toBe(false);
  });

  it("sendDraftReply sets sendError when no recipient", async () => {
    const { result } = renderHook(() => useReplyFlow());
    const mailNoFrom = { ...selectedMail, from: "" };

    let success;
    await act(async () => {
      success = await result.current.sendDraftReply(mailNoFrom, "body");
    });

    expect(success).toBe(false);
    expect(storeState().sendError).toBeTruthy();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("generateSummary fetches and sets store aiSummary", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ summary: "Invoice payment required." }));

    const { result } = renderHook(() => useReplyFlow());

    await act(async () => {
      await result.current.generateSummary(selectedMail);
    });

    expect(storeState().aiSummary).toBe("Invoice payment required.");
    expect(storeState().loadingSummary).toBe(false);
  });

  it("generateSummary handles empty body gracefully", async () => {
    const { result } = renderHook(() => useReplyFlow());
    const emptyMail = { ...selectedMail, body: "", snippet: "" };

    await act(async () => {
      await result.current.generateSummary(emptyMail);
    });

    expect(storeState().aiSummary).toContain("⚠️");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("generateExplanation fetches and sets store aiReason", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ explanation: "This email is high priority." }));

    const { result } = renderHook(() => useReplyFlow());

    await act(async () => {
      await result.current.generateExplanation(selectedMail);
    });

    expect(storeState().aiReason).toBe("This email is high priority.");
    expect(storeState().loadingExplanation).toBe(false);
  });

  it("resetReplyFlow clears all store state", async () => {
    global.fetch.mockResolvedValue(mockJsonResponse({ reply: "Hello" }));
    const { result } = renderHook(() => useReplyFlow());

    await act(async () => { await result.current.generateReply(selectedMail); });
    act(() => { result.current.resetReplyFlow(); });

    expect(storeState().aiReply).toBe("");
    expect(storeState().editableReply).toBe("");
    expect(storeState().replySent).toBe(false);
    expect(storeState().aiSummary).toBe("");
    expect(storeState().aiReason).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────
// RACE CONDITION TESTS: stale-request guards
// ─────────────────────────────────────────────────────────────────
describe("Stale-request guards", () => {
  const selectedMail = {
    id: "email-1",
    subject: "Invoice due",
    snippet: "Please pay invoice",
    from: "billing@acme.com",
    threadId: "thread-1",
    messageId: "msg-1",
    date: new Date().toISOString(),
  };

  it("stale non-OK useHandleForMe does not clobber store", async () => {
    // Request A: slow non-OK
    let resolveA;
    const promiseA = new Promise(r => { resolveA = r; });
    // Request B: fast OK
    const sseChunks = [
      `data: ${JSON.stringify({ type: "token", text: "New result" })}\n\n`,
    ];

    let chatCallIdx = 0;
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/chat")) {
        chatCallIdx++;
        if (chatCallIdx === 1) {
          // First call → slow non-OK (request A)
          return promiseA.then(() => ({
            ok: false,
            status: 500,
            json: () => Promise.resolve({ error: "Server error" }),
          }));
        }
        // Second call → fast OK stream (request B)
        return mockStreamResponse(sseChunks);
      }
      return mockJsonResponse({});
    });

    const { result } = renderHook(() => useHandleForMe());

    // Start request A (slow, will resolve later with error)
    const promiseAAct = act(async () => {
      await result.current.runHandleForMe(SAMPLE_EMAILS[0]);
    });

    // Start request B (fast, will resolve with success)
    await act(async () => {
      await result.current.runHandleForMe(SAMPLE_EMAILS[0]);
    });

    // Now resolve request A — it should NOT clobber B's result
    resolveA();
    await promiseAAct;

    // Store should reflect B's result, not A's error
    expect(storeState().handleForMeResult).not.toContain("❌");
    expect(storeState().handleForMeResult).toContain("New result");
    expect(storeState().loadingHandleForMe).toBe(false);
  });

  it("stale error in generateReply does not overwrite newer aiReply", async () => {
    // Request A: slow, will fail
    let resolveA;
    const promiseA = new Promise(r => { resolveA = r; });

    let chatCallIdx = 0;
    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/ai/reply")) {
        chatCallIdx++;
        if (chatCallIdx === 1) {
          // First call → slow failure
          return promiseA.then(() => ({
            ok: false,
            status: 500,
            json: () => Promise.resolve({}),
          }));
        }
        // Second call → fast success
        return mockJsonResponse({ reply: "New reply" });
      }
      return mockJsonResponse({});
    });

    const { result } = renderHook(() => useReplyFlow());

    // Start request A (slow, will fail)
    const promiseAAct = act(async () => {
      await result.current.generateReply(selectedMail);
    });

    // Start request B (fast, will succeed)
    await act(async () => {
      await result.current.generateReply(selectedMail);
    });

    // Now resolve request A — it should NOT clobber B's reply
    resolveA();
    await promiseAAct;

    expect(storeState().aiReply).toBe("New reply");
    expect(storeState().editableReply).toBe("New reply");
    expect(storeState().sendError).toBeNull();
  });

  it("stale error in generateSummary does not overwrite newer aiSummary", async () => {
    let resolveA;
    const promiseA = new Promise(r => { resolveA = r; });
    let callIdx = 0;

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/ai/summarize")) {
        callIdx++;
        if (callIdx === 1) {
          return promiseA.then(() => { throw new Error("Network error"); });
        }
        return mockJsonResponse({ summary: "New summary" });
      }
      return mockJsonResponse({});
    });

    const { result } = renderHook(() => useReplyFlow());

    const promiseAAct = act(async () => {
      await result.current.generateSummary(selectedMail);
    });

    await act(async () => {
      await result.current.generateSummary(selectedMail);
    });

    resolveA();
    await promiseAAct;

    expect(storeState().aiSummary).toBe("New summary");
  });

  it("sendDraftReply prevents duplicate sends while one is in progress", async () => {
    let resolveA;
    const promiseA = new Promise(r => { resolveA = r; });
    let callIdx = 0;

    global.fetch.mockImplementation((url) => {
      if (url.includes("/api/gmail/reply")) {
        callIdx++;
        if (callIdx === 1) {
          // Slow first send — stays in flight until we resolve
          return promiseA.then(() => mockJsonResponse({ success: true }));
        }
        // Second send should NEVER be reached — blocked by sendingReply guard
        return mockJsonResponse({ success: true });
      }
      return mockJsonResponse({});
    });

    const { result } = renderHook(() => useReplyFlow());

    // Start first send (slow, stays in flight)
    const promiseAAct = act(async () => {
      await result.current.sendDraftReply(selectedMail, "Draft A");
    });

    // Try second send while first is in flight — should be blocked immediately
    let secondResult;
    await act(async () => {
      secondResult = await result.current.sendDraftReply(selectedMail, "Draft B");
    });

    // Second send should have returned false (blocked) and NOT triggered a second fetch
    expect(secondResult).toBe(false);

    // Only one fetch call to /api/gmail/reply should have occurred
    const replyCalls = global.fetch.mock.calls.filter(c => c[0].includes("/api/gmail/reply"));
    expect(replyCalls).toHaveLength(1);

    // Now resolve the first send
    resolveA();
    await promiseAAct;

    expect(storeState().replySent).toBe(true);
    expect(storeState().sendingReply).toBe(false);
  });
});

