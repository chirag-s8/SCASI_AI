/**
 * @file lib/__tests__/dateUtils.test.ts
 * Unit tests for the safeISODate helper.
 *
 * Run: npx jest lib/__tests__/dateUtils.test.ts
 */

import { safeISODate } from '../dateUtils';

describe('safeISODate', () => {
    // --- RFC 2822 formats (common from Gmail headers) ---

    it('parses standard RFC 2822 date', () => {
        const result = safeISODate('Tue, 10 Mar 2026 12:12:13 +0000');
        expect(result).toBe('2026-03-10T12:12:13.000Z');
    });

    it('parses RFC 2822 with trailing (UTC) — the original bug', () => {
        const result = safeISODate('Tue, 10 Mar 2026 12:12:13 +0000 (UTC)');
        expect(result).toBe('2026-03-10T12:12:13.000Z');
    });

    it('parses RFC 2822 with trailing timezone name like (PST)', () => {
        const result = safeISODate('Mon, 15 Jan 2024 08:30:00 -0800 (PST)');
        expect(result).not.toBeNull();
        expect(new Date(result!).toISOString()).toBe(result);
    });

    it('parses RFC 2822 with trailing (Eastern Standard Time)', () => {
        const result = safeISODate('Wed, 05 Jun 2024 14:00:00 -0500 (Eastern Standard Time)');
        expect(result).not.toBeNull();
    });

    // --- ISO 8601 formats ---

    it('passes through a valid ISO 8601 string', () => {
        const iso = '2024-06-15T10:30:00.000Z';
        expect(safeISODate(iso)).toBe(iso);
    });

    it('parses ISO 8601 without milliseconds', () => {
        const result = safeISODate('2024-06-15T10:30:00Z');
        expect(result).toBe('2024-06-15T10:30:00.000Z');
    });

    it('parses ISO 8601 with offset', () => {
        const result = safeISODate('2024-06-15T10:30:00+05:30');
        expect(result).not.toBeNull();
    });

    // --- Edge cases ---

    it('returns null for null input', () => {
        expect(safeISODate(null)).toBeNull();
    });

    it('returns null for undefined input', () => {
        expect(safeISODate(undefined)).toBeNull();
    });

    it('returns null for empty string', () => {
        expect(safeISODate('')).toBeNull();
    });

    it('returns null for garbage input', () => {
        expect(safeISODate('not a date at all')).toBeNull();
    });

    it('returns null for unparseable partial string', () => {
        expect(safeISODate('xyz foo bar baz qux')).toBeNull();
    });

    // --- Always returns valid ISO ---

    it('always returns a string parseable by new Date()', () => {
        const inputs = [
            'Tue, 10 Mar 2026 12:12:13 +0000 (UTC)',
            '2024-01-01T00:00:00Z',
            'Mon, 01 Jan 2024 00:00:00 GMT',
            'Sat, 22 Feb 2025 09:15:30 +0530 (IST)',
        ];

        for (const input of inputs) {
            const result = safeISODate(input);
            expect(result).not.toBeNull();
            const reparsed = new Date(result!);
            expect(isNaN(reparsed.getTime())).toBe(false);
        }
    });

    // --- Expanded coverage ---

    it('handles whitespace-only string', () => {
        expect(safeISODate('   ')).toBeNull();
    });

    it('parses Unix epoch string', () => {
        const result = safeISODate('Thu, 01 Jan 1970 00:00:00 +0000');
        expect(result).toBe('1970-01-01T00:00:00.000Z');
    });

    it('parses date with no time component', () => {
        const result = safeISODate('2024-06-15');
        expect(result).not.toBeNull();
    });

    it('does not throw on nested parentheses', () => {
        expect(() => safeISODate('Tue, 10 Mar 2026 12:12:13 +0000 (UTC)')).not.toThrow();
    });

    it('does not throw on numeric-only string', () => {
        expect(() => safeISODate('12345')).not.toThrow();
    });

    it('handles RFC 2822 with +0530 offset (IST)', () => {
        const result = safeISODate('Mon, 15 Apr 2024 10:00:00 +0530');
        expect(result).not.toBeNull();
        expect(result).toBe('2024-04-15T04:30:00.000Z');
    });

    it('handles RFC 2822 with -0500 offset (EST)', () => {
        const result = safeISODate('Mon, 15 Apr 2024 10:00:00 -0500');
        expect(result).not.toBeNull();
        expect(result).toBe('2024-04-15T15:00:00.000Z');
    });

    it('returns a string for valid GMT date', () => {
        const result = safeISODate('Mon, 01 Jan 2024 00:00:00 GMT');
        expect(typeof result).toBe('string');
        expect(result).toBe('2024-01-01T00:00:00.000Z');
    });
});
