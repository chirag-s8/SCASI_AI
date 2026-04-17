/**
 * @file lib/__tests__/emailHelpers.test.ts
 * Unit tests for email helper pure utility functions.
 * No mocks needed — all functions are pure.
 */

import {
  cleanEmailBody,
  extractEmail,
  extractFirstLink,
  getInitials,
  extractEmailAddr,
  isUnreplyable,
  parseHandleForMeOutput,
} from "../emailHelpers";

// ─────────────────────────────────────────────────────────────────
// cleanEmailBody
// ─────────────────────────────────────────────────────────────────
describe("cleanEmailBody", () => {
  it("strips HTML tags", () => {
    expect(cleanEmailBody("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("removes URLs", () => {
    expect(cleanEmailBody("Visit https://example.com for more")).toBe("Visit for more");
  });

  it("removes unsubscribe section and everything after", () => {
    expect(cleanEmailBody("Main content. unsubscribe here blah blah")).toBe("Main content.");
  });

  it("collapses multiple spaces", () => {
    expect(cleanEmailBody("Hello   world")).toBe("Hello world");
  });

  it("trims leading/trailing whitespace", () => {
    expect(cleanEmailBody("  hello  ")).toBe("hello");
  });

  it("handles empty string", () => {
    expect(cleanEmailBody("")).toBe("");
  });

  it("handles plain text with no HTML", () => {
    expect(cleanEmailBody("Just plain text")).toBe("Just plain text");
  });
});

// ─────────────────────────────────────────────────────────────────
// extractEmail
// ─────────────────────────────────────────────────────────────────
describe("extractEmail", () => {
  it("extracts email from Name <email> format", () => {
    expect(extractEmail("John Doe <john@example.com>")).toBe("john@example.com");
  });

  it("returns plain email address as-is", () => {
    expect(extractEmail("john@example.com")).toBe("john@example.com");
  });

  it("returns empty string for null", () => {
    expect(extractEmail(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(extractEmail(undefined)).toBe("");
  });

  it("returns empty string for non-email string", () => {
    expect(extractEmail("not an email")).toBe("");
  });

  it("handles display name with special characters", () => {
    expect(extractEmail("O'Brien, Mary <mary@corp.com>")).toBe("mary@corp.com");
  });
});

// ─────────────────────────────────────────────────────────────────
// extractFirstLink
// ─────────────────────────────────────────────────────────────────
describe("extractFirstLink", () => {
  it("returns null for null input", () => {
    expect(extractFirstLink(null)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(extractFirstLink("")).toBeNull();
  });

  it("extracts href link from HTML", () => {
    const html = '<a href="https://example.com/page">Click here</a>';
    expect(extractFirstLink(html)).toBe("https://example.com/page");
  });

  it("extracts plain URL from text", () => {
    expect(extractFirstLink("Visit https://example.com for details")).toBe("https://example.com");
  });

  it("skips unsubscribe links and returns the next valid href", () => {
    // Now checks ALL hrefs, not just the first — returns first valid one
    const html = '<a href="https://example.com/unsubscribe">Unsubscribe</a> <a href="https://example.com/article">Read more</a>';
    expect(extractFirstLink(html)).toBe("https://example.com/article");
  });

  it("skips tracking links and returns the next valid href", () => {
    const html = '<a href="https://tracking.example.com/t/123">Track</a> <a href="https://example.com/real">Real link</a>';
    expect(extractFirstLink(html)).toBe("https://example.com/real");
  });

  it("returns null when only unsubscribe links exist", () => {
    const html = '<a href="https://example.com/unsubscribe">Unsub</a>';
    expect(extractFirstLink(html)).toBeNull();
  });

  it("decodes &amp; in href", () => {
    const html = '<a href="https://example.com/page?a=1&amp;b=2">Link</a>';
    const result = extractFirstLink(html);
    expect(result).toBe("https://example.com/page?a=1&b=2");
  });

  it("strips trailing punctuation from plain URLs", () => {
    const result = extractFirstLink("See https://example.com/page.");
    expect(result).toBe("https://example.com/page");
  });
});

// ─────────────────────────────────────────────────────────────────
// getInitials
// ─────────────────────────────────────────────────────────────────
describe("getInitials", () => {
  it("returns ? for null", () => {
    expect(getInitials(null)).toBe("?");
  });

  it("returns ? for undefined", () => {
    expect(getInitials(undefined)).toBe("?");
  });

  it("returns ? for empty string", () => {
    expect(getInitials("")).toBe("?");
  });

  it("extracts two initials from dot-separated name", () => {
    expect(getInitials("john.doe@example.com")).toBe("JD");
  });

  it("extracts two initials from underscore-separated name", () => {
    expect(getInitials("john_doe@example.com")).toBe("JD");
  });

  it("extracts two initials from hyphen-separated name", () => {
    expect(getInitials("john-doe@example.com")).toBe("JD");
  });

  it("returns first two chars for single-part name", () => {
    expect(getInitials("johndoe@example.com")).toBe("JO");
  });

  it("returns uppercase initials", () => {
    expect(getInitials("alice.smith@example.com")).toBe("AS");
  });
});

// ─────────────────────────────────────────────────────────────────
// extractEmailAddr
// ─────────────────────────────────────────────────────────────────
describe("extractEmailAddr", () => {
  it("returns empty string for null", () => {
    expect(extractEmailAddr(null)).toBe("");
  });

  it("returns empty string for undefined", () => {
    expect(extractEmailAddr(undefined)).toBe("");
  });

  it("extracts from bracket format", () => {
    expect(extractEmailAddr("John Doe <john@example.com>")).toBe("john@example.com");
  });

  it("extracts plain email", () => {
    expect(extractEmailAddr("john@example.com")).toBe("john@example.com");
  });

  it("returns lowercase", () => {
    expect(extractEmailAddr("JOHN@EXAMPLE.COM")).toBe("john@example.com");
  });

  it("returns empty string for non-email string", () => {
    expect(extractEmailAddr("not an email")).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────
// isUnreplyable
// ─────────────────────────────────────────────────────────────────
describe("isUnreplyable", () => {
  it("flags noreply addresses", () => {
    expect(isUnreplyable("noreply@example.com")).toBe(true);
    expect(isUnreplyable("no-reply@example.com")).toBe(true);
    expect(isUnreplyable("donotreply@example.com")).toBe(true);
    expect(isUnreplyable("do-not-reply@example.com")).toBe(true);
  });

  it("flags mailer-daemon and postmaster", () => {
    expect(isUnreplyable("mailer-daemon@example.com")).toBe(true);
    expect(isUnreplyable("postmaster@example.com")).toBe(true);
  });

  it("flags empty string", () => {
    expect(isUnreplyable("")).toBe(true);
  });

  it("does not flag normal addresses", () => {
    expect(isUnreplyable("john@example.com")).toBe(false);
    expect(isUnreplyable("support@company.com")).toBe(false);
    expect(isUnreplyable("hello@scasi.ai")).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────
// parseHandleForMeOutput
// ─────────────────────────────────────────────────────────────────
describe("parseHandleForMeOutput", () => {
  const sampleOutput = `**Category:** action_required (Priority: 85/100)
**Reason:** The email requires immediate action regarding payment.
**Summary:** Client is requesting invoice payment by end of week.
**Deadline:** Friday 5pm
**Tasks:**
- Review the invoice
- Process the payment
**Draft Reply:**
Dear Client,

Thank you for your email. I will process the payment shortly.

Best regards,
Team

⚠️ Please review before sending.`;

  it("parses category and priority", () => {
    const { hfmData } = parseHandleForMeOutput(sampleOutput);
    expect(hfmData.category).toContain("action_required");
    expect(hfmData.priority).toBe(85);
  });

  it("parses summary", () => {
    const { hfmData, aiSummary } = parseHandleForMeOutput(sampleOutput);
    expect(hfmData.summary).toContain("invoice payment");
    expect(aiSummary).toContain("invoice payment");
  });

  it("parses reason", () => {
    const { hfmData, aiReason } = parseHandleForMeOutput(sampleOutput);
    expect(hfmData.reason).toContain("immediate action");
    expect(aiReason).toContain("immediate action");
  });

  it("parses deadline", () => {
    const { hfmData } = parseHandleForMeOutput(sampleOutput);
    expect(hfmData.deadline).toBe("Friday 5pm");
  });

  it("parses tasks", () => {
    const { hfmData } = parseHandleForMeOutput(sampleOutput);
    expect(hfmData.tasks).toContain("Review the invoice");
    expect(hfmData.tasks).toContain("Process the payment");
  });

  it("parses draft reply and strips warning", () => {
    const { draftReply } = parseHandleForMeOutput(sampleOutput);
    expect(draftReply).toContain("Thank you for your email");
    expect(draftReply).not.toContain("⚠️");
  });

  it("returns empty/null for missing fields on empty input", () => {
    const { hfmData } = parseHandleForMeOutput("");
    expect(hfmData.category).toBeNull();
    expect(hfmData.priority).toBeNull();
    expect(hfmData.summary).toBeNull();
    expect(hfmData.tasks).toHaveLength(0);
    expect(hfmData.followUp).toBeNull();
  });

  it("handles input longer than HFM_MAX_INPUT without throwing", () => {
    const longInput = "x".repeat(25000);
    expect(() => parseHandleForMeOutput(longInput)).not.toThrow();
  });

  it("does not include 'No specific tasks detected.' in tasks array", () => {
    const output = `**Tasks:**\nNo specific tasks detected.`;
    const { hfmData } = parseHandleForMeOutput(output);
    expect(hfmData.tasks).not.toContain("No specific tasks detected.");
  });
});
