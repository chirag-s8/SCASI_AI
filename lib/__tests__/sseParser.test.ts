/**
 * @file lib/__tests__/sseParser.test.ts
 * Unit tests for SSE parsing utilities.
 */
import { parseSSEChunk, processSSEChunk } from "../sseParser";

describe("parseSSEChunk", () => {
  it("parses a token event", () => {
    const chunk = `data: ${JSON.stringify({ type: "token", text: "Hello " })}`;
    const result = parseSSEChunk(chunk);
    expect(result).toEqual({ type: "token", text: "Hello " });
  });

  it("parses an error event", () => {
    const chunk = `data: ${JSON.stringify({ type: "error", message: "Rate limited" })}`;
    const result = parseSSEChunk(chunk);
    expect(result).toEqual({ type: "error", message: "Rate limited" });
  });

  it("returns unknown for valid JSON but unrecognized type", () => {
    const chunk = `data: ${JSON.stringify({ type: "ping" })}`;
    const result = parseSSEChunk(chunk);
    expect(result).toEqual({ type: "unknown" });
  });

  it("returns null when no data: line exists", () => {
    const chunk = "event: keepalive\nid: 42";
    expect(parseSSEChunk(chunk)).toBeNull();
  });

  it("returns null for empty chunk", () => {
    expect(parseSSEChunk("")).toBeNull();
  });

  it("returns null for malformed JSON in data line", () => {
    const chunk = "data: {invalid json";
    expect(parseSSEChunk(chunk)).toBeNull();
  });

  it("returns null when data: value is not JSON at all", () => {
    const chunk = "data: plain text not json";
    expect(parseSSEChunk(chunk)).toBeNull();
  });

  it("returns unknown when token event has non-string text field", () => {
    const chunk = `data: ${JSON.stringify({ type: "token", text: 123 })}`;
    expect(parseSSEChunk(chunk)).toEqual({ type: "unknown" });
  });

  it("returns unknown when error event has non-string message field", () => {
    const chunk = `data: ${JSON.stringify({ type: "error", message: true })}`;
    expect(parseSSEChunk(chunk)).toEqual({ type: "unknown" });
  });

  it("ignores non-data lines and finds data: line among them", () => {
    const chunk = `event: message\nid: 7\ndata: ${JSON.stringify({ type: "token", text: "found" })}`;
    const result = parseSSEChunk(chunk);
    expect(result).toEqual({ type: "token", text: "found" });
  });

  it("handles data: line with multi-line SSE prefix fields", () => {
    const chunk = `event: token\nretry: 100\ndata: ${JSON.stringify({ type: "token", text: "multi" })}`;
    const result = parseSSEChunk(chunk);
    expect(result).toEqual({ type: "token", text: "multi" });
  });
});

describe("processSSEChunk", () => {
  it("appends token text to collected", () => {
    const chunk = `data: ${JSON.stringify({ type: "token", text: "world" })}`;
    expect(processSSEChunk(chunk, "Hello ")).toBe("Hello world");
  });

  it("appends error message with ❌ prefix to collected", () => {
    const chunk = `data: ${JSON.stringify({ type: "error", message: "timeout" })}`;
    expect(processSSEChunk(chunk, "Partial")).toBe("Partial\n❌ timeout");
  });

  it("returns collected unchanged for malformed chunk", () => {
    expect(processSSEChunk("garbage", "existing")).toBe("existing");
  });

  it("returns collected unchanged when no data: line", () => {
    expect(processSSEChunk("event: ping", "existing")).toBe("existing");
  });

  it("returns collected unchanged for unknown event type", () => {
    const chunk = `data: ${JSON.stringify({ type: "ping" })}`;
    expect(processSSEChunk(chunk, "existing")).toBe("existing");
  });

  it("works with empty collected string", () => {
    const chunk = `data: ${JSON.stringify({ type: "token", text: "start" })}`;
    expect(processSSEChunk(chunk, "")).toBe("start");
  });

  it("chains multiple token chunks", () => {
    const c1 = `data: ${JSON.stringify({ type: "token", text: "Hello " })}`;
    const c2 = `data: ${JSON.stringify({ type: "token", text: "World" })}`;
    const collected = processSSEChunk(c2, processSSEChunk(c1, ""));
    expect(collected).toBe("Hello World");
  });

  it("chains token then error", () => {
    const c1 = `data: ${JSON.stringify({ type: "token", text: "Partial" })}`;
    const c2 = `data: ${JSON.stringify({ type: "error", message: "failed" })}`;
    const collected = processSSEChunk(c2, processSSEChunk(c1, ""));
    expect(collected).toBe("Partial\n❌ failed");
  });
});
