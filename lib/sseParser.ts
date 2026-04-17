/**
 * @file lib/sseParser.ts
 * Shared SSE (Server-Sent Events) parsing utilities.
 * Extracts the duplicated chunk-parsing logic from useHandleForMe into a
 * single, testable helper function.
 */

/** Parsed result from a single SSE data line */
export type SSEEvent =
  | { type: "token"; text: string }
  | { type: "error"; message: string }
  | { type: "unknown" };

/**
 * Parse a single SSE chunk (the text between two `\n\n` boundaries)
 * and return the event, if any.
 *
 * Supports single-line `data:` payloads containing JSON objects
 * with a `type` field of `"token"` or `"error"`.
 */
export function parseSSEChunk(chunk: string): SSEEvent | null {
  const dataLine = chunk.split("\n").find(l => l.startsWith("data: "));
  if (!dataLine) return null;

  try {
    const evt = JSON.parse(dataLine.slice(6));
    if (evt.type === "token" && typeof evt.text === "string") {
      return { type: "token", text: evt.text };
    }
    if (evt.type === "error" && typeof evt.message === "string") {
      return { type: "error", message: evt.message };
    }
    return { type: "unknown" };
  } catch {
    return null; // skip malformed SSE
  }
}

/**
 * Process an SSE chunk: parse it and append to the collected text.
 * Returns the new `collected` string (unchanged if the chunk is
 * malformed or not a token/error event).
 */
export function processSSEChunk(chunk: string, collected: string): string {
  const evt = parseSSEChunk(chunk);
  if (!evt) return collected;
  if (evt.type === "token") return collected + evt.text;
  if (evt.type === "error") return collected + "\n❌ " + evt.message;
  return collected;
}
