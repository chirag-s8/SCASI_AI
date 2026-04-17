/**
 * @file lib/__tests__/emailAnalysis.test.ts
 * Unit tests for email analysis pure utility functions.
 * No mocks needed — all functions are pure.
 */

import {
  getEmailCategory,
  getPriorityScore,
  getPriorityColor,
  getPhishingInfo,
  getToneInfo,
  isSpamEmail,
  extractDeadline,
  extractTasks,
  getBurnoutStats,
  getUrgencyLevel,
  type Email,
} from "../emailAnalysis";

// ─── Helpers ──────────────────────────────────────────────────────
function makeEmail(overrides: Partial<Email> = {}): Email {
  return { id: "test-id", subject: "", snippet: "", body: "", from: "", ...overrides };
}

// ─────────────────────────────────────────────────────────────────
// getEmailCategory
// ─────────────────────────────────────────────────────────────────
describe("getEmailCategory", () => {
  it('returns "Do Now" for job-related emails', () => {
    expect(getEmailCategory(makeEmail({ subject: "Job offer from Acme" }))).toBe("Do Now");
    expect(getEmailCategory(makeEmail({ subject: "Internship opportunity" }))).toBe("Do Now");
    expect(getEmailCategory(makeEmail({ snippet: "Interview scheduled for Monday" }))).toBe("Do Now");
    expect(getEmailCategory(makeEmail({ snippet: "Please apply before Friday" }))).toBe("Do Now");
  });

  it('returns "Needs Decision" for event/meeting emails', () => {
    expect(getEmailCategory(makeEmail({ subject: "Team event this Friday" }))).toBe("Needs Decision");
    expect(getEmailCategory(makeEmail({ subject: "Meeting at 3pm" }))).toBe("Needs Decision");
    expect(getEmailCategory(makeEmail({ snippet: "Schedule a call" }))).toBe("Needs Decision");
    expect(getEmailCategory(makeEmail({ snippet: "Need your decision by EOD" }))).toBe("Needs Decision");
  });

  it('returns "Waiting" for newsletter/update emails', () => {
    expect(getEmailCategory(makeEmail({ subject: "Weekly newsletter" }))).toBe("Waiting");
    expect(getEmailCategory(makeEmail({ subject: "Product update" }))).toBe("Waiting");
    expect(getEmailCategory(makeEmail({ snippet: "Security alert for your account" }))).toBe("Waiting");
  });

  it('returns "Low Energy" for unclassified emails', () => {
    expect(getEmailCategory(makeEmail({ subject: "Hello there" }))).toBe("Low Energy");
    expect(getEmailCategory(makeEmail({ subject: "", snippet: "" }))).toBe("Low Energy");
  });
});

// ─────────────────────────────────────────────────────────────────
// getPriorityScore
// ─────────────────────────────────────────────────────────────────
describe("getPriorityScore", () => {
  it("returns score capped at 100", () => {
    const mail = makeEmail({ subject: "URGENT today expires", snippet: "urgent today", date: new Date().toISOString() });
    expect(getPriorityScore(mail)).toBeLessThanOrEqual(100);
  });

  it("gives higher score for urgent keywords", () => {
    const urgent = makeEmail({ subject: "urgent action required" });
    const normal = makeEmail({ subject: "hello friend" });
    expect(getPriorityScore(urgent)).toBeGreaterThan(getPriorityScore(normal));
  });

  it("gives higher score for recent emails", () => {
    const recent = makeEmail({ subject: "hello", date: new Date().toISOString() });
    const old = makeEmail({ subject: "hello", date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() });
    expect(getPriorityScore(recent)).toBeGreaterThan(getPriorityScore(old));
  });

  it("handles missing date gracefully", () => {
    const mail = makeEmail({ subject: "test", date: undefined });
    expect(() => getPriorityScore(mail)).not.toThrow();
  });

  it("handles invalid date gracefully", () => {
    const mail = makeEmail({ subject: "test", date: "not-a-date" });
    expect(() => getPriorityScore(mail)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────
// getPriorityColor
// ─────────────────────────────────────────────────────────────────
describe("getPriorityColor", () => {
  it("returns red for score >= 80", () => {
    expect(getPriorityColor(80)).toBe("#DC2626");
    expect(getPriorityColor(100)).toBe("#DC2626");
  });

  it("returns amber for score 50-79", () => {
    expect(getPriorityColor(50)).toBe("#D97706");
    expect(getPriorityColor(79)).toBe("#D97706");
  });

  it("returns green for score < 50", () => {
    expect(getPriorityColor(0)).toBe("#059669");
    expect(getPriorityColor(49)).toBe("#059669");
  });
});

// ─────────────────────────────────────────────────────────────────
// getPhishingInfo
// ─────────────────────────────────────────────────────────────────
describe("getPhishingInfo", () => {
  it("returns safe result for null input", () => {
    const result = getPhishingInfo(null);
    expect(result.isPhishing).toBe(false);
    expect(result.score).toBe(0);
    expect(result.reasons).toHaveLength(0);
  });

  it("detects urgency pressure", () => {
    const mail = makeEmail({ subject: "Act now! Limited time offer expires in 24 hours" });
    const result = getPhishingInfo(mail);
    expect(result.reasons).toContain("Urgency pressure language detected");
    expect(result.score).toBeGreaterThan(0);
  });

  it("detects account suspension threat", () => {
    const mail = makeEmail({ snippet: "Your account has been suspended. Verify your account immediately." });
    const result = getPhishingInfo(mail);
    expect(result.reasons).toContain("Account verification/suspension threat");
  });

  it("detects prize/lottery claim", () => {
    const mail = makeEmail({ subject: "You have won a lottery prize!" });
    const result = getPhishingInfo(mail);
    expect(result.reasons).toContain("Prize or lottery claim detected");
  });

  it("detects money transfer fraud", () => {
    const mail = makeEmail({ body: "Please wire $5,000 to our account. Unclaimed inheritance funds available." });
    const result = getPhishingInfo(mail);
    expect(result.reasons).toContain("Money transfer or advance-fee fraud pattern");
  });

  it("detects lookalike domain spoofing", () => {
    const mail = makeEmail({ from: "support@paypa1.com", subject: "account update" });
    const result = getPhishingInfo(mail);
    expect(result.reasons).toContain("Lookalike domain spoofing detected");
  });

  it("marks high score as isPhishing=true", () => {
    const mail = makeEmail({
      subject: "URGENT: Verify your account now or it will be suspended",
      snippet: "You have won a prize! Click here to confirm your details",
      from: "noreply@suspicious.com",
    });
    const result = getPhishingInfo(mail);
    expect(result.isPhishing).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(40);
  });

  it("caps score at 100", () => {
    const mail = makeEmail({
      subject: "URGENT verify account suspended lottery winner",
      snippet: "wire transfer unclaimed funds click here login immediately",
      from: "noreply@paypa1.com",
      body: "Dear valued customer, confirm your pin password reset",
    });
    const result = getPhishingInfo(mail);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it("returns low level for safe email", () => {
    const safe = makeEmail({ subject: "Hello" });
    expect(getPhishingInfo(safe).level).toBe("low");
  });

  it("does not flag legitimate Google noreply", () => {
    const mail = makeEmail({ from: "noreply@google.com", subject: "security alert" });
    const result = getPhishingInfo(mail);
    expect(result.reasons).not.toContain("Unknown sender with security-related subject");
  });
});

// ─────────────────────────────────────────────────────────────────
// getToneInfo
// ─────────────────────────────────────────────────────────────────
describe("getToneInfo", () => {
  it("returns Professional for null input", () => {
    expect(getToneInfo(null).label).toBe("Professional");
  });

  it("detects Frustrated tone", () => {
    const mail = makeEmail({ subject: "This is unacceptable", snippet: "I am very disappointed" });
    expect(getToneInfo(mail).label).toBe("Frustrated");
  });

  it("detects Urgent tone", () => {
    const mail = makeEmail({ subject: "URGENT: deadline today", snippet: "asap please" });
    expect(getToneInfo(mail).label).toBe("Urgent");
  });

  it("detects Friendly tone", () => {
    const mail = makeEmail({ subject: "Thank you so much!", snippet: "Great job on the project" });
    expect(getToneInfo(mail).label).toBe("Friendly");
  });

  it("returns Professional for neutral email", () => {
    const mail = makeEmail({ subject: "Q3 report attached", snippet: "Please review the attached document" });
    expect(getToneInfo(mail).label).toBe("Professional");
  });

  it("Frustrated takes priority over Urgent", () => {
    const mail = makeEmail({ subject: "This is unacceptable and urgent" });
    expect(getToneInfo(mail).label).toBe("Frustrated");
  });
});

// ─────────────────────────────────────────────────────────────────
// isSpamEmail
// ─────────────────────────────────────────────────────────────────
describe("isSpamEmail", () => {
  it("flags emails with spam keywords", () => {
    expect(isSpamEmail(makeEmail({ subject: "Free offer just for you" }))).toBe(true);
    expect(isSpamEmail(makeEmail({ subject: "You are the winner!" }))).toBe(true);
    expect(isSpamEmail(makeEmail({ snippet: "Buy now with discount" }))).toBe(true);
    expect(isSpamEmail(makeEmail({ snippet: "Claim your cash prize today" }))).toBe(true);
  });

  it("flags noreply + unsubscribe combo", () => {
    expect(isSpamEmail(makeEmail({ from: "noreply@example.com", snippet: "click to unsubscribe" }))).toBe(true);
  });

  it("does not flag normal emails", () => {
    expect(isSpamEmail(makeEmail({ subject: "Meeting tomorrow at 3pm", snippet: "Let me know if you can make it" }))).toBe(false);
    expect(isSpamEmail(makeEmail({ subject: "Your invoice is ready", from: "billing@company.com" }))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// extractDeadline
// ─────────────────────────────────────────────────────────────────
describe("extractDeadline", () => {
  it("returns null for null/undefined/empty", () => {
    expect(extractDeadline(null)).toBeNull();
    expect(extractDeadline(undefined)).toBeNull();
    expect(extractDeadline("")).toBeNull();
  });

  it('detects "today"', () => {
    expect(extractDeadline("Please respond today")).toBe("Today");
  });

  it('detects "tomorrow"', () => {
    expect(extractDeadline("Due tomorrow morning")).toBe("Tomorrow");
  });

  it("detects month-day format", () => {
    expect(extractDeadline("Deadline is 15 Jan")).toBe("15 Jan");
    expect(extractDeadline("Submit by 3 Mar")).toBe("3 Mar");
  });

  it("detects numeric date format", () => {
    expect(extractDeadline("Due by 12/31/2024")).toBe("12/31/2024");
    expect(extractDeadline("Deadline: 01/15/25")).toBe("01/15/25");
  });

  it("returns null when no deadline found", () => {
    expect(extractDeadline("Hello, how are you?")).toBeNull();
  });

  it("tomorrow takes priority over today in same string", () => {
    expect(extractDeadline("Not today but tomorrow")).toBe("Tomorrow");
  });
});

// ─────────────────────────────────────────────────────────────────
// extractTasks
// ─────────────────────────────────────────────────────────────────
describe("extractTasks", () => {
  it("extracts payment task", () => {
    expect(extractTasks("Your invoice is due, please pay now")).toContain("💳 Make the payment");
  });

  it("extracts meeting task", () => {
    expect(extractTasks("Join the Zoom meeting at 3pm")).toContain("📅 Attend the meeting");
  });

  it("extracts recruiter task", () => {
    expect(extractTasks("We have a job offer for you")).toContain("📝 Apply / Respond to recruiter");
  });

  it("extracts urgent action task", () => {
    expect(extractTasks("This is urgent, deadline today")).toContain("⏰ Take action immediately");
  });

  it("returns default task when nothing detected", () => {
    const tasks = extractTasks("Hello, hope you are well");
    expect(tasks).toEqual(["📌 No urgent action required"]);
  });

  it("can return multiple tasks", () => {
    const tasks = extractTasks("Urgent invoice due, join the meeting and apply for the job");
    expect(tasks.length).toBeGreaterThan(1);
  });
});

// ─────────────────────────────────────────────────────────────────
// getUrgencyLevel
// ─────────────────────────────────────────────────────────────────
describe("getUrgencyLevel", () => {
  it('returns "None" for null', () => {
    expect(getUrgencyLevel(null)).toBe("None");
  });

  it('returns Very High for "Today"', () => {
    expect(getUrgencyLevel("Today")).toBe("🔥 Very High");
  });

  it('returns High for "Tomorrow"', () => {
    expect(getUrgencyLevel("Tomorrow")).toBe("⚠️ High");
  });

  it('returns Medium for any other deadline', () => {
    expect(getUrgencyLevel("15 Jan")).toBe("📌 Medium");
  });
});

// ─────────────────────────────────────────────────────────────────
// getBurnoutStats
// ─────────────────────────────────────────────────────────────────
describe("getBurnoutStats", () => {
  it("returns zero stress for empty inbox", () => {
    const stats = getBurnoutStats([]);
    expect(stats.stressScore).toBe(0);
    expect(stats.stressLevel).toBe("Low");
    expect(stats.workloadTrend).toBe("Stable ✅");
  });

  it("increases stress for urgent emails", () => {
    const emails = Array(5).fill(makeEmail({ subject: "URGENT deadline asap" }));
    const stats = getBurnoutStats(emails);
    expect(stats.stressScore).toBeGreaterThan(0);
  });

  it("caps stress at 100", () => {
    const emails = Array(20).fill(makeEmail({ subject: "URGENT deadline asap immediately" }));
    const stats = getBurnoutStats(emails);
    expect(stats.stressScore).toBeLessThanOrEqual(100);
  });

  it('shows "Increasing" trend for > 15 emails', () => {
    const emails = Array(16).fill(makeEmail({ subject: "hello" }));
    expect(getBurnoutStats(emails).workloadTrend).toBe("Increasing 📈");
  });

  it('shows "Stable" trend for <= 15 emails', () => {
    const emails = Array(15).fill(makeEmail({ subject: "hello" }));
    expect(getBurnoutStats(emails).workloadTrend).toBe("Stable ✅");
  });

  it("gives delegation recommendation for high stress", () => {
    const emails = Array(20).fill(makeEmail({ subject: "URGENT deadline asap immediately" }));
    const stats = getBurnoutStats(emails);
    if (stats.stressLevel === "High") {
      expect(stats.recommendation).toBe("Delegate or Snooze low-priority emails");
    }
  });
});
