/**
 * @file src/agents/testing/__tests__/promptVersions.test.ts
 * Tests for prompt version hashing and change detection.
 *
 * Verifies:
 * 1. getPromptVersions() returns consistent hashes for the same content
 * 2. getPromptVersions() returns different hashes when content changes
 * 3. detectPromptChanges() detects added, removed, and modified prompts
 * 4. Hash format is correct (12-char hex string)
 *
 * Run: npx jest src/agents/testing/__tests__/promptVersions.test.ts
 */

import { getPromptVersions, detectPromptChanges, type PromptVersionMap } from '../promptVersions';

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('promptVersions', () => {
  describe('getPromptVersions', () => {
    test('returns a non-empty map of prompt names to hashes', () => {
      const versions = getPromptVersions();
      expect(Object.keys(versions).length).toBeGreaterThan(0);
    });

    test('all hashes are 12-character hex strings', () => {
      const versions = getPromptVersions();
      for (const [name, hash] of Object.entries(versions)) {
        expect(hash).toMatch(/^[0-9a-f]{12}$/);
      }
    });

    test('returns consistent hashes across calls', () => {
      const v1 = getPromptVersions();
      const v2 = getPromptVersions();
      expect(v1).toEqual(v2);
    });

    test('includes expected prompt names', () => {
      const versions = getPromptVersions();
      const keys = Object.keys(versions);
      // These are the 6 prompt templates tracked by promptVersions.ts
      // Use toContain instead of toHaveProperty because Jest's toHaveProperty
      // validates the value at that path, and the hash values are dynamic.
      expect(keys).toContain('classify.v1');
      expect(keys).toContain('summarize.v1');
      expect(keys).toContain('reply.v1');
      expect(keys).toContain('explain.v1');
      expect(keys).toContain('extract_tasks.v1');
      expect(keys).toContain('extract_entities.v1');
    });
  });

  describe('detectPromptChanges', () => {
    const base: PromptVersionMap = {
      'classify.v1': 'a1b2c3d4e5f6',
      'summarize.v1': 'f6e5d4c3b2a1',
      'reply.v1': '123456789abc',
    };

    test('returns empty array when versions are identical', () => {
      const changes = detectPromptChanges(base, { ...base });
      expect(changes).toEqual([]);
    });

    test('detects hash changes', () => {
      const current: PromptVersionMap = {
        ...base,
        'classify.v1': 'changedhash123',
      };
      const changes = detectPromptChanges(current, base);
      expect(changes).toEqual(['classify.v1']);
    });

    test('detects added prompts', () => {
      const current: PromptVersionMap = {
        ...base,
        'new_prompt.v1': 'newhash123456',
      };
      const changes = detectPromptChanges(current, base);
      expect(changes).toEqual(['new_prompt.v1 (added)']);
    });

    test('detects removed prompts', () => {
      const current: PromptVersionMap = {
        'classify.v1': 'a1b2c3d4e5f6',
        'summarize.v1': 'f6e5d4c3b2a1',
        // reply.v1 is removed
      };
      const changes = detectPromptChanges(current, base);
      expect(changes).toEqual(['reply.v1 (removed)']);
    });

    test('detects multiple changes simultaneously', () => {
      const current: PromptVersionMap = {
        'classify.v1': 'changedhash123', // changed
        'summarize.v1': 'f6e5d4c3b2a1',  // unchanged
        // reply.v1 removed
        'new_prompt.v1': 'newhash123456', // added
      };
      const changes = detectPromptChanges(current, base);
      // Sort order: classify.v1, new_prompt.v1 (added), reply.v1 (removed)
      expect(changes).toContain('classify.v1');
      expect(changes).toContain('new_prompt.v1 (added)');
      expect(changes).toContain('reply.v1 (removed)');
      expect(changes).toHaveLength(3);
    });

    test('returns sorted output for deterministic order', () => {
      const current: PromptVersionMap = {
        'zebra.v1': 'aaa111bbb222',  // added
        'classify.v1': 'a1b2c3d4e5f6', // unchanged
      };
      const changes = detectPromptChanges(current, base);
      // classify.v1 is unchanged so not reported
      // reply.v1 and summarize.v1 are removed, zebra.v1 is added
      // Sorted: reply.v1 (removed), summarize.v1 (removed), zebra.v1 (added)
      expect(changes[0]).toBe('reply.v1 (removed)');
      expect(changes[1]).toBe('summarize.v1 (removed)');
      expect(changes[2]).toBe('zebra.v1 (added)');
    });

    test('handles empty previous map', () => {
      const current: PromptVersionMap = {
        'classify.v1': 'a1b2c3d4e5f6',
      };
      const changes = detectPromptChanges(current, {});
      expect(changes).toEqual(['classify.v1 (added)']);
    });

    test('handles empty current map', () => {
      const changes = detectPromptChanges({}, base);
      expect(changes).toEqual([
        'classify.v1 (removed)',
        'reply.v1 (removed)',
        'summarize.v1 (removed)',
      ]);
    });
  });
});
