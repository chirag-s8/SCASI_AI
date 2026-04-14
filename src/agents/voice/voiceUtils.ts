/**
 * @file src/agents/voice/voiceUtils.ts
 * Pure utility functions for the Scasi voice agent.
 */

// ---------------------------------------------------------------------------
// TTS truncation
// ---------------------------------------------------------------------------

/**
 * Strips markdown and special characters so TTS reads naturally.
 * Removes: # * _ ` ~ > | [ ] ( ) — bullet numbers like "1." etc.
 */
export function cleanForSpeech(text: string): string {
  let t = text;
  // Extract value from JSON like {"spoken_answer": "..."} or {"answer": "..."}
  try {
    const parsed = JSON.parse(t);
    if (typeof parsed === 'object' && parsed !== null) {
      t = parsed.spoken_answer || parsed.answer || parsed.text || parsed.response || Object.values(parsed)[0] as string || t;
    }
  } catch { /* not JSON */ }

  return t
    // Strip thinking blocks
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    // Remove markdown headers
    .replace(/#{1,6}\s*/g, '')
    // Remove bold/italic markers
    .replace(/[*_]{1,3}/g, '')
    // Remove inline code and code blocks
    .replace(/`{1,3}[^`]*`{1,3}/g, '')
    // Remove blockquotes
    .replace(/^\s*>\s*/gm, '')
    // Remove markdown links, keep label
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    // Remove bare URLs
    .replace(/https?:\/\/\S+/g, '')
    // Remove table pipes
    .replace(/\|/g, '')
    // Remove numbered list markers
    .replace(/^\s*\d+\.\s+/gm, '')
    // Remove bullet dashes/tildes at line start
    .replace(/^\s*[-~]\s+/gm, '')
    // Remove square/round brackets
    .replace(/[[\]()]/g, '')
    // Remove em/en dashes
    .replace(/[—–]/g, ',')
    // Collapse whitespace
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Truncates text to a maximum number of words.
 * Returns the text unchanged if it is within the limit.
 */
export function truncateToWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ');
}

// ---------------------------------------------------------------------------
// Session-end detection
// ---------------------------------------------------------------------------

const SESSION_END_PHRASES = [
  'no',
  'nope',
  'no thanks',
  'no thank you',
  "that's all",
  'thats all',
  "that's it",
  'thats it',
  'goodbye',
  'good bye',
  'bye',
  'bye bye',
  'hang up',
  "i'm done",
  'im done',
  'done',
  'exit',
  'quit',
  'stop',
  'end',
  'close',
  'nothing else',
  'nothing more',
  "i'm good",
  'im good',
  "i'm all good",
  'all good',
  'all set',
  "i'm all set",
];

/**
 * Returns true if the transcript signals the user wants to end the session.
 * Case-insensitive, trims punctuation.
 */
export function detectSessionEnd(transcript: string): boolean {
  const normalized = transcript
    .toLowerCase()
    .trim()
    .replace(/[.,!?;:]+$/, '');
  return SESSION_END_PHRASES.includes(normalized);
}

// ---------------------------------------------------------------------------
// Email body truncation (for AI endpoints)
// ---------------------------------------------------------------------------

/**
 * Truncates an email body to maxChars characters.
 * Returns the original string if within limit.
 */
export function truncateBody(body: string, maxChars: number): string {
  if (body.length <= maxChars) return body;
  return body.slice(0, maxChars);
}
