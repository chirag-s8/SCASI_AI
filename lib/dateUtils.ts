/**
 * @file lib/dateUtils.ts
 * Shared date-parsing helpers used by API routes and agents.
 */

/**
 * Safely parse a date string (RFC 2822, ISO 8601, etc.) into an ISO 8601 string
 * suitable for Supabase TIMESTAMPTZ columns.
 *
 * Gmail headers often include a trailing timezone name in parentheses
 * (e.g. "Tue, 10 Mar 2026 12:12:13 +0000 (UTC)") which `new Date()` may
 * reject. We strip that before parsing.
 *
 * @returns ISO 8601 string or `null` if the input is falsy / unparseable.
 */
export function safeISODate(raw: string | null | undefined): string | null {
    if (!raw) return null;
    const cleaned = raw.replace(/\s*\([^)]*\)\s*$/, '').trim();
    const d = new Date(cleaned);
    return isNaN(d.getTime()) ? null : d.toISOString();
}
