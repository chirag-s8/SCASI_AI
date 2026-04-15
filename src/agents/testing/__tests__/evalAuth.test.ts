/**
 * @file src/agents/testing/__tests__/evalAuth.test.ts
 * Unit tests for eval endpoint authorization logic.
 *
 * Covers: email verification, allowlist matching, fail-closed production
 * behavior, case-insensitive matching, whitespace/empty-entry handling,
 * and log deduplication.
 *
 * Run: npx jest src/agents/testing/__tests__/evalAuth.test.ts
 */

import { isEvalAuthorized, checkEvalAccess, _resetEvalAuthState } from '../evalAuth';

describe('isEvalAuthorized', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    _resetEvalAuthState();
    process.env = { ...originalEnv };
    process.env.EVAL_ADMIN_EMAILS = 'admin@scasi.ai,dev@company.com';
    // Jest runs in test/dev mode by default — NODE_ENV is read-only
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ─── Basic reject cases ─────────────────────────────────────────────────

  it('rejects when email is null', () => {
    expect(isEvalAuthorized(null, true)).toBe(false);
  });

  it('rejects when email is undefined', () => {
    expect(isEvalAuthorized(undefined, true)).toBe(false);
  });

  it('rejects when email is empty string', () => {
    expect(isEvalAuthorized('', true)).toBe(false);
  });

  it('rejects when email is unverified', () => {
    expect(isEvalAuthorized('admin@scasi.ai', false)).toBe(false);
  });

  it('rejects when emailVerified is undefined/null', () => {
    expect(isEvalAuthorized('admin@scasi.ai', undefined)).toBe(false);
    expect(isEvalAuthorized('admin@scasi.ai', null)).toBe(false);
  });

  // ─── Allowlist matching ─────────────────────────────────────────────────

  it('allows verified email in allowlist', () => {
    expect(isEvalAuthorized('admin@scasi.ai', true)).toBe(true);
  });

  it('rejects verified email not in allowlist', () => {
    expect(isEvalAuthorized('random@evil.com', true)).toBe(false);
  });

  it('matches emails case-insensitively', () => {
    expect(isEvalAuthorized('ADMIN@SCASI.AI', true)).toBe(true);
    expect(isEvalAuthorized('Dev@Company.COM', true)).toBe(true);
  });

  it('trims whitespace from allowlist entries', () => {
    process.env.EVAL_ADMIN_EMAILS = '  admin@scasi.ai  ,  dev@company.com  ';
    expect(isEvalAuthorized('admin@scasi.ai', true)).toBe(true);
  });

  it('ignores empty allowlist entries from trailing commas', () => {
    process.env.EVAL_ADMIN_EMAILS = 'admin@scasi.ai,,dev@company.com,';
    expect(isEvalAuthorized('admin@scasi.ai', true)).toBe(true);
    expect(isEvalAuthorized('dev@company.com', true)).toBe(true);
    // Empty entries should not match anything
    expect(isEvalAuthorized('', true)).toBe(false);
  });

  // ─── Fail-closed behavior when EVAL_ADMIN_EMAILS is unset ──────────────

  it('allows access in dev/test when EVAL_ADMIN_EMAILS is unset', () => {
    delete process.env.EVAL_ADMIN_EMAILS;
    // NODE_ENV is 'test' in Jest, which is not 'production'
    expect(isEvalAuthorized('anyone@example.com', true)).toBe(true);
  });

  // ─── Log deduplication ──────────────────────────────────────────────────

  it('deduplicates unverified email warnings per email address', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _resetEvalAuthState();

    // First call — should log
    isEvalAuthorized('user1@test.com', false);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Second call for same email — should NOT log again
    isEvalAuthorized('user1@test.com', false);
    expect(warnSpy).toHaveBeenCalledTimes(1);

    // Different email — should log once
    isEvalAuthorized('user2@test.com', false);
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });

  it('deduplicates missing-allowlist error in production', () => {
    delete process.env.EVAL_ADMIN_EMAILS;
    // NODE_ENV is typed as read-only; use Object.defineProperty to override
    const originalNodeEnv = process.env.NODE_ENV;
    Object.defineProperty(process.env, 'NODE_ENV', { value: 'production', writable: true });

    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    _resetEvalAuthState();

    // First call — should log
    isEvalAuthorized('admin@scasi.ai', true);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    // Second call — should NOT log again
    isEvalAuthorized('admin@scasi.ai', true);
    expect(errorSpy).toHaveBeenCalledTimes(1);

    errorSpy.mockRestore();
    Object.defineProperty(process.env, 'NODE_ENV', { value: originalNodeEnv, writable: true });
  });

  // ─── Set cap on warned emails ────────────────────────────────────────────

  it('caps warned-unverified-emails set at 100 entries', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    _resetEvalAuthState();

    // First 100 unique emails: each should be logged exactly once
    for (let i = 0; i < 100; i++) {
      isEvalAuthorized(`user${i}@test.com`, false);
    }
    expect(warnSpy).toHaveBeenCalledTimes(100);

    // Repeat one of the first 100 emails — should NOT log again (dedup)
    warnSpy.mockClear();
    isEvalAuthorized('user0@test.com', false);
    expect(warnSpy).toHaveBeenCalledTimes(0);

    // Emails 100-109: beyond the cap, the Set stops tracking,
    // so the same email WILL be logged again on the second call
    warnSpy.mockClear();
    isEvalAuthorized('user100@test.com', false); // first call — logged
    isEvalAuthorized('user100@test.com', false); // second call — logged again (not tracked)
    expect(warnSpy).toHaveBeenCalledTimes(2);

    warnSpy.mockRestore();
  });
});

// ─── checkEvalAccess integration tests ──────────────────────────────────────

describe('checkEvalAccess', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    _resetEvalAuthState();
    process.env = { ...originalEnv };
    process.env.EVAL_ADMIN_EMAILS = 'admin@scasi.ai';
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ─── Null/missing session → 401 ────────────────────────────────────────

  it('returns { ok: false } for null session', () => {
    const result = checkEvalAccess(null);
    expect(result).toEqual({ ok: false, error: 'Unauthorized', status: 401 });
  });

  it('returns { ok: false } for session with no email', () => {
    const result = checkEvalAccess({ user: { email: null } });
    expect(result).toEqual({ ok: false, error: 'Unauthorized', status: 401 });
  });

  it('returns { ok: false } for session with empty email', () => {
    const result = checkEvalAccess({ user: { email: '' } });
    expect(result).toEqual({ ok: false, error: 'Unauthorized', status: 401 });
  });

  // ─── Unverified email → 403 ────────────────────────────────────────────

  it('returns { ok: false } for unverified email in allowlist', () => {
    const result = checkEvalAccess({ user: { email: 'admin@scasi.ai' }, emailVerified: false });
    expect(result).toEqual({ ok: false, error: 'Forbidden — eval access restricted', status: 403 });
  });

  // ─── Verified + in allowlist → success ──────────────────────────────────

  it('returns { ok: true } for verified allowed user', () => {
    const result = checkEvalAccess({ user: { email: 'admin@scasi.ai' }, emailVerified: true });
    expect(result).toEqual({ ok: true, email: 'admin@scasi.ai', emailVerified: true });
  });

  // ─── Verified + NOT in allowlist → 403 ──────────────────────────────────

  it('returns { ok: false } for verified email not in allowlist', () => {
    const result = checkEvalAccess({ user: { email: 'random@evil.com' }, emailVerified: true });
    expect(result).toEqual({ ok: false, error: 'Forbidden — eval access restricted', status: 403 });
  });

  // ─── Tagged union discrimination ─────────────────────────────────────────

  it('ok field discriminates success vs error correctly', () => {
    const success = checkEvalAccess({ user: { email: 'admin@scasi.ai' }, emailVerified: true });
    const failure = checkEvalAccess(null);

    if (success.ok) {
      // TypeScript narrows to the success branch — email is available
      expect(typeof success.email).toBe('string');
      expect(success.email).toBe('admin@scasi.ai');
    } else {
      fail('Expected ok: true for authorized user');
    }

    if (failure.ok === false) {
      // TypeScript narrows to the error branch — error and status are available
      expect(typeof failure.error).toBe('string');
      expect(typeof failure.status).toBe('number');
    } else {
      fail('Expected ok: false for null session');
    }
  });
});
