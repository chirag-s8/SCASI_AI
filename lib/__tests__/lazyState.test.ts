/**
 * @file lib/__tests__/lazyState.test.ts
 * Tests for the lazy useState initializer pattern used in page.jsx.
 *
 * These test the *logic* of the initializer functions, not React itself.
 * The pattern is:  useState(() => { if (typeof window === "undefined") return []; ... })
 *
 * Run: npx jest lib/__tests__/lazyState.test.ts
 */

describe('lazy useState initializer pattern', () => {
    const originalWindow = global.window;

    afterEach(() => {
        // Restore window and localStorage
        global.window = originalWindow;
        jest.restoreAllMocks();
    });

    /**
     * Simulate the initializer function extracted from page.jsx.
     * This is the exact logic used for starredIds, snoozedIds, doneIds.
     */
    function lazyLocalStorageInit(key: string): string[] {
        if (typeof window === 'undefined') return [];
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : [];
    }

    describe('SSR safety (typeof window === "undefined")', () => {
        it('returns empty array when window is undefined (SSR)', () => {
            // simulating SSR where window is undefined
            delete (global as Record<string, unknown>).window;
            expect(lazyLocalStorageInit('starredIds')).toEqual([]);
        });
    });

    describe('browser environment', () => {
        it('returns empty array when localStorage has no saved data', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(null);
            expect(lazyLocalStorageInit('starredIds')).toEqual([]);
        });

        it('parses saved JSON array from localStorage', () => {
            const saved = ['id-1', 'id-2', 'id-3'];
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(saved));
            expect(lazyLocalStorageInit('starredIds')).toEqual(saved);
        });

        it('returns empty array for empty JSON array in localStorage', () => {
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue('[]');
            expect(lazyLocalStorageInit('doneIds')).toEqual([]);
        });

        it('handles a large saved array', () => {
            const saved = Array.from({ length: 500 }, (_, i) => `id-${i}`);
            jest.spyOn(Storage.prototype, 'getItem').mockReturnValue(JSON.stringify(saved));
            const result = lazyLocalStorageInit('snoozedIds');
            expect(result).toHaveLength(500);
            expect(result[0]).toBe('id-0');
            expect(result[499]).toBe('id-499');
        });
    });
});
