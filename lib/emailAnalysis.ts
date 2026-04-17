/**
 * Email analysis utility functions — pure, no React/state dependencies.
 * Extracted from app/page.jsx during the inbox refactoring.
 */

// ─── Types ────────────────────────────────────────────────────────
export interface Email {
  id: string;
  subject?: string;
  snippet?: string;
  body?: string;
  from?: string;
  to?: string;
  date?: string;
  replyTo?: string;
  threadId?: string;
  messageId?: string;
  labelIds?: string[];
}

export interface PhishingInfo {
  isPhishing: boolean;
  score: number;
  reasons: string[];
  level: "high" | "medium" | "low";
}

export interface ToneInfo {
  label: string;
  icon: string;
  color: string;
  bg: string;
  msg: string;
}

export interface BurnoutStats {
  stressScore: number;
  stressLevel: string;
  workloadTrend: string;
  recommendation: string;
}

// ─── Phishing / Scam Detection (rule-based, no LLM) ──────────────
export function getPhishingInfo(mail: Email | null): PhishingInfo {
  if (!mail) return { isPhishing: false, score: 0, reasons: [], level: "low" };
  const subject = (mail.subject || "").toLowerCase();
  const snippet = (mail.snippet || "").toLowerCase();
  const body = (mail.body || "").slice(0, 5000).toLowerCase(); // cap to avoid slow regex on large HTML
  const from = (mail.from || "").toLowerCase();
  const text = subject + " " + snippet + " " + body;

  const reasons: string[] = [];
  let score = 0;

  // 1. Urgency pressure
  if (/urgent|immediately|act now|respond within|expires in|limited time|last chance|final notice/.test(text)) {
    reasons.push("Urgency pressure language detected"); score += 25;
  }
  // 2. Suspicious request patterns
  if (/verify your (account|identity|email|password)|confirm your (details|info|credentials)|update your (billing|payment|account)|your account (has been|will be) (suspended|locked|terminated|deactivated)/.test(text)) {
    reasons.push("Account verification/suspension threat"); score += 30;
  }
  // 3. Prize / lottery / winner
  if (/you (have won|are selected|are a winner)|congratulations.{0,30}(win|prize|selected)|unclaim(ed)?\s+(reward|prize|gift)|lottery/.test(text)) {
    reasons.push("Prize or lottery claim detected"); score += 35;
  }
  // 4. Suspicious link patterns in text
  if (/click here to (verify|confirm|secure|update|activate)|login (here|now|immediately)|access (your|the) account/.test(text)) {
    reasons.push("Suspicious call-to-action link"); score += 20;
  }
  // 5. Money transfer / advance-fee fraud
  if (/(transfer|send|wire)\s+\$?[0-9,]+|unclaimed\s+(funds|money|inheritance)|million\s+(dollars|usd)|advance\s+fee/.test(text)) {
    reasons.push("Money transfer or advance-fee fraud pattern"); score += 40;
  }
  // 6. Mismatched/unknown sender domain
  const emailMatch = from.match(/<([^>]+)>/) || [null, from];
  const senderEmail = emailMatch[1] || from;
  if (/noreply@(?!google|microsoft|amazon|github|linkedin|twitter|paypal|apple)/i.test(senderEmail) &&
      (subject.includes("security") || subject.includes("verify") || subject.includes("account"))) {
    reasons.push("Unknown sender with security-related subject"); score += 20;
  }
  // 7. Credential harvesting keywords
  if (/password\s+(reset|change|expired)|confirm\s+your\s+(pin|otp|code|password)|enter\s+(your|the)\s+(otp|pin|verification)/.test(text)) {
    reasons.push("Credential harvesting attempt"); score += 30;
  }
  // 8. Generic greeting (sign of mass phishing)
  if (/dear\s+(valued\s+)?(customer|user|client|member|account\s+holder)|hello\s+dear/.test(text)) {
    reasons.push("Generic mass-phishing greeting"); score += 15;
  }
  // 9. Suspicious financial domain spoofing
  if (/paypa1|g00gle|arnazon|micros0ft|app1e|faceb00k|netf1ix/.test(senderEmail + " " + text)) {
    reasons.push("Lookalike domain spoofing detected"); score += 50;
  }

  const isPhishing = score >= 40;
  const level = score >= 70 ? "high" : score >= 40 ? "medium" : "low";
  return { isPhishing, score: Math.min(score, 100), reasons, level };
}

// ─── Tone / Sentiment Detection ──────────────────────────────────
export function getToneInfo(mail: Email | null): ToneInfo {
  if (!mail) return { label: "Professional", icon: "⬡", color: "#4F46E5", bg: "#EEF2FF", msg: "Standard professional tone is appropriate." };
  const text = ((mail.subject || "") + " " + (mail.snippet || "") + " " + (mail.body || "")).toLowerCase();

  if (text.includes("unacceptable") || text.includes("disappointed") || text.includes("complaint") || text.includes("frustrated") || text.includes("terrible") || text.includes("issue") || text.includes("fix this") || text.includes("fail") || text.includes("worst") || text.includes("refund")) {
    return { label: "Frustrated", icon: "⚡", color: "#B91C1C", bg: "#FEF2F2", msg: "Consider delivering a careful, empathetic response." };
  }
  if (text.includes("urgent") || text.includes("asap") || text.includes("deadline") || text.includes("immediately") || text.includes("important") || text.includes("emergency")) {
    return { label: "Urgent", icon: "◬", color: "#C2410C", bg: "#FFF7ED", msg: "Action required immediately to prevent delays." };
  }
  if (text.includes("thank you") || text.includes("thanks") || text.includes("great job") || text.includes("awesome") || text.includes("love") || text.includes("excited") || text.includes("cheers") || text.includes("happy") || text.includes("hope you're doing well") || text.includes("would be great")) {
    return { label: "Friendly", icon: "✦", color: "#047857", bg: "#F0FDF4", msg: "Keep the interaction warm and approachable." };
  }
  return { label: "Professional", icon: "⬡", color: "#4338CA", bg: "#EEF2FF", msg: "Standard professional tone is appropriate." };
}

// ─── Priority Scoring ─────────────────────────────────────────────
export function getPriorityScore(mail: Email): number {
  let score = 0;
  const subject = (mail.subject || "").toLowerCase();
  const snippet = (mail.snippet || "").toLowerCase();
  const text = subject + " " + snippet;
  if (text.includes("urgent") || text.includes("today") || text.includes("expires"))
    score += 50;
  else if (text.includes("tomorrow")) score += 40;
  else if (text.includes("deadline") || text.includes("last date"))
    score += 35;
  if (text.includes("job") || text.includes("intern") || text.includes("interview"))
    score += 20;
  else if (text.includes("payment") || text.includes("invoice") || text.includes("bill"))
    score += 18;
  else if (text.includes("meeting") || text.includes("event")) score += 15;
  else score += 5;
  if (mail.date) {
    const receivedDate = new Date(mail.date);
    const now = new Date();
    if (!isNaN(receivedDate.getTime())) {
      const diffHours = (now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60);
      if (diffHours < 1) score += 30;
      else if (diffHours < 24) score += 25;
      else if (diffHours < 48) score += 15;
      else score += 5;
    }
  }
  return Math.min(score, 100);
}

export function getPriorityColor(score: number): string {
  if (score >= 80) return "#DC2626";
  if (score >= 50) return "#D97706";
  return "#059669";
}

// ─── Email Categorization ─────────────────────────────────────────
export function getEmailCategory(mail: Email): string {
  const subject = (mail.subject || "").toLowerCase();
  const snippet = (mail.snippet || "").toLowerCase();
  const text = subject + " " + snippet;
  if (text.includes("job") || text.includes("intern") || text.includes("interview") || text.includes("apply")) {
    return "Do Now";
  }
  if (text.includes("event") || text.includes("meet") || text.includes("schedule") || text.includes("decision")) {
    return "Needs Decision";
  }
  if (text.includes("newsletter") || text.includes("update") || text.includes("alert")) {
    return "Waiting";
  }
  return "Low Energy";
}

export function getCategoryColor(category: string): string {
  if (category === "Do Now") return "#DC2626";
  if (category === "Needs Decision") return "#D97706";
  if (category === "Waiting") return "#2563EB";
  if (category === "Low Energy") return "#059669";
  return "#7C3AED";
}

export function getCategoryBg(category: string): string {
  if (category === "Do Now") return "#FEF2F2";
  if (category === "Needs Decision") return "#FFFBEB";
  if (category === "Waiting") return "#EFF6FF";
  if (category === "Low Energy") return "#F0FDF4";
  return "#F5F3FF";
}

// ─── Burnout Stats ────────────────────────────────────────────────
export function getBurnoutStats(emails: Email[]): BurnoutStats {
  let stressScore = 0;
  emails.forEach((mail) => {
    const text = (mail.subject || "").toLowerCase() + " " + (mail.snippet || "").toLowerCase();
    if (text.includes("urgent") || text.includes("deadline") || text.includes("asap") || text.includes("immediately")) {
      stressScore += 15;
    }
    if (getPriorityScore(mail) > 70) {
      stressScore += 10;
    }
    if (mail.date) {
      const dateObj = new Date(mail.date);
      const hour = dateObj.getHours();
      if (hour >= 23 || hour <= 5) {
        stressScore += 20;
      }
    }
  });
  if (stressScore > 100) stressScore = 100;
  let stressLevel = "Low";
  if (stressScore > 70) stressLevel = "High";
  else if (stressScore > 40) stressLevel = "Medium";
  const workloadTrend = emails.length > 15 ? "Increasing 📈" : "Stable ✅";
  const recommendation = stressLevel === "High" ? "Delegate or Snooze low-priority emails" : "You are managing well";
  return { stressScore, stressLevel, workloadTrend, recommendation };
}

// ─── Spam Detection ───────────────────────────────────────────────
export function isSpamEmail(mail: Email): boolean {
  const subject = (mail.subject || "").toLowerCase();
  const snippet = (mail.snippet || "").toLowerCase();
  const from = (mail.from || "").toLowerCase();
  const text = subject + " " + snippet;
  const spamWords = [
    "free", "offer", "limited time", "unsubscribe", "winner",
    "congratulations", "lottery", "claim", "buy now", "click here",
    "discount", "cash prize",
  ];
  for (const word of spamWords) {
    if (text.includes(word)) return true;
  }
  if (from.includes("noreply") && text.includes("unsubscribe")) {
    return true;
  }
  return false;
}

// ─── First-time Sender ────────────────────────────────────────────
export function isFirstTimeSender(mail: Email, allEmails: Email[]): boolean {
  const sender = mail.from;
  const count = allEmails.filter((m) => m.from === sender).length;
  return count === 1;
}

// ─── Deadline Extraction ──────────────────────────────────────────
export function extractDeadline(text: string | null | undefined): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  if (lower.includes("tomorrow")) return "Tomorrow";
  if (lower.includes("today")) return "Today";
  const match = text.match(/\b(\d{1,2})\s?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
  if (match) return match[0];
  const match2 = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/);
  if (match2) return match2[0];
  return null;
}

export function getUrgencyLevel(deadlineText: string | null): string {
  if (!deadlineText) return "None";
  if (deadlineText === "Today") return "🔥 Very High";
  if (deadlineText === "Tomorrow") return "⚠️ High";
  return "📌 Medium";
}

// ─── Task Extraction ──────────────────────────────────────────────
export function extractTasks(text: string): string[] {
  const lower = text.toLowerCase();
  const tasks: string[] = [];
  if (lower.includes("payment due") || lower.includes("pay now") || lower.includes("invoice") || lower.includes("bill")) {
    tasks.push("💳 Make the payment");
  }
  if (lower.includes("meeting") || lower.includes("zoom") || lower.includes("google meet") || lower.includes("schedule")) {
    tasks.push("📅 Attend the meeting");
  }
  if (lower.includes("job") || lower.includes("internship") || lower.includes("interview") || lower.includes("offer letter")) {
    tasks.push("📝 Apply / Respond to recruiter");
  }
  if (lower.includes("deadline") || lower.includes("urgent")) {
    tasks.push("⏰ Take action immediately");
  }
  if (tasks.length === 0) tasks.push("📌 No urgent action required");
  return tasks;
}
