/**
 * Email helper utilities — pure, no React/state dependencies.
 * Extracted from app/page.jsx during the inbox refactoring.
 */

// ─── Clean HTML from email body ───────────────────────────────────
export function cleanEmailBody(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/unsubscribe[\s\S]*/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// ─── Extract email address from "Name <email>" format ─────────────
export function extractEmail(raw: string | null | undefined): string {
  if (!raw) return "";
  const match = raw.match(/<(.+?)>/);
  if (match) return match[1];
  if (raw.includes("@")) return raw.trim();
  return "";
}

// ─── Extract first meaningful link from HTML/text ─────────────────
export function extractFirstLink(text: string | null): string | null {
  if (!text) return null;

  // Try href attribute first
  const hrefMatch = text.match(/href=["']([^"']+)["']/i);
  if (hrefMatch && hrefMatch[1] && hrefMatch[1].startsWith("http")) {
    let link = hrefMatch[1];
    const lower = link.toLowerCase();
    if (
      !lower.includes("unsubscribe") &&
      !lower.includes("tracking") &&
      !lower.includes("email-alert") &&
      !lower.includes("manage") &&
      link.length < 500
    ) {
      link = link.replace(/&amp;/g, "&");
      return link;
    }
  }

  // Fallback: find plain URLs
  const cleanText = text.replace(/<[^>]*>/g, " ");
  const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
  const matches = cleanText.match(urlRegex);
  if (!matches || matches.length === 0) return null;

  const validLinks = matches.filter((url) => {
    const lower = url.toLowerCase();
    return (
      !lower.includes("unsubscribe") &&
      !lower.includes("tracking") &&
      !lower.includes("pixel") &&
      !lower.includes("beacon") &&
      !lower.includes("email.") &&
      !lower.includes("manage") &&
      !lower.includes("email-alert") &&
      url.length < 500
    );
  });

  if (validLinks.length === 0) return null;
  let link = validLinks[0];
  link = link.replace(/[.,;:)\]]+$/, "");
  link = link.replace(/&amp;/g, "&");
  return link;
}

// ─── Get initials from email address ──────────────────────────────
export function getInitials(email: string | null | undefined): string {
  if (!email) return "?";
  const name = email.split("@")[0];
  const parts = name.split(/[._-]/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// ─── Extract email address from header field ─────────────────────
export function extractEmailAddr(field: string | null | undefined): string {
  if (!field) return "";
  const bracket = field.match(/<([^>]+@[^>]+)>/);
  if (bracket) return bracket[1].trim().toLowerCase();
  const plain = field.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
  return plain ? plain[1].trim().toLowerCase() : "";
}

// ─── Check if an address is a no-reply/unreplyable address ───────
export function isUnreplyable(addr: string): boolean {
  if (!addr) return true;
  const local = addr.split("@")[0].toLowerCase();
  return (
    local.startsWith("noreply") ||
    local.startsWith("no-reply") ||
    local.startsWith("donotreply") ||
    local.startsWith("do-not-reply") ||
    local === "mailer-daemon" ||
    local === "postmaster"
  );
}

// ─── Parse Handle-For-Me structured output ───────────────────────
export interface HfmParsedData {
  category: string | null;
  priority: number | null;
  reason: string | null;
  summary: string | null;
  deadline: string | null;
  tasks: string[];
  followUp: string | null;
}

// Maximum input length for LLM output parsing (guards against pathological output)
const HFM_MAX_INPUT = 20_000;

export function parseHandleForMeOutput(collected: string): {
  hfmData: HfmParsedData;
  aiSummary: string;
  aiReason: string;
  draftReply: string;
} {
  // Cap input length to guard against pathological LLM output
  const input = collected.length > HFM_MAX_INPUT ? collected.slice(0, HFM_MAX_INPUT) : collected;

  // More defensive regex: tolerate optional whitespace, alternate label formats,
  // and capture multi-word categories (e.g. "Do Now", "Needs Decision", "Low Energy")
  const catMatch = input.match(/\*\*[Cc]ategor(?:y|ies):\*\*\s*([^\n(]+?)(?:\s*\(.*?Priority:\s*(\d+)\/100.*?\))?(?=\n|$)/i);
  const reasonMatch = input.match(/\*\*Reason:\*\*\s*([\s\S]+?)(?=\n\*\*|\n\n|$)/i);
  const sumMatch = input.match(/\*\*Summary:\*\*\s*([\s\S]+?)(?=\n\*\*|\n\n|$)/i);
  const deadlineMatch = input.match(/\*\*Deadline:\*\*\s*(.+?)(?=\n|$)/i);
  const tasksSection = input.match(/\*\*Tasks:\*\*\s*\n([\s\S]+?)(?=\n\n\*\*|$)/i);
  const draftMatch = input.match(/\*\*Draft Reply:\*\*\s*\n+([\s\S]+?)(?=\n{0,2}⚠️|\n{0,2}🔔|$)/i);
  const followUpMatch = input.match(/[🔔🔔]\s*\*\*Follow-up tracked\*\*\s*[-—]\s*(?:detected signal:\s*)?"(.+?)"/i);

  const tasks: string[] = [];
  if (tasksSection) {
    for (const line of tasksSection[1].split('\n')) {
      const cleaned = line.replace(/^[•\-]\s*/, '').trim();
      if (cleaned && cleaned !== 'No specific tasks detected.') tasks.push(cleaned);
    }
  }

  let draftReply = '';
  if (draftMatch) {
    draftReply = draftMatch[1].trim()
      .replace(/⚠️[^\n]*/g, '').replace(/🔔[^\n]*/g, '')
      .replace(/(Dear\s+.*?,|Hi\s+.*?,|Hello\s+.*?,|Greetings\s+.*?,)\s*/gi, '$1\n\n')
      .replace(/\s*(Best regards,|Sincerely,|Thanks,|Warm regards,|Cheers,|Yours truly,)/gi, '\n\n$1\n')
      .trim();
  }

  const hfmData: HfmParsedData = {
    category: catMatch?.[1] ?? null,
    priority: catMatch?.[2] ? parseInt(catMatch[2]) : null,
    reason: reasonMatch ? reasonMatch[1].trim() : null,
    summary: sumMatch ? sumMatch[1].trim() : null,
    deadline: deadlineMatch ? deadlineMatch[1].trim() : null,
    tasks,
    followUp: followUpMatch ? followUpMatch[1] : null,
  };

  return {
    hfmData,
    aiSummary: sumMatch ? sumMatch[1].trim() : '',
    aiReason: reasonMatch ? reasonMatch[1].trim() : '',
    draftReply,
  };
}
