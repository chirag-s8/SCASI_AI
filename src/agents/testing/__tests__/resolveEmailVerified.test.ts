/**
 * @file src/agents/testing/__tests__/resolveEmailVerified.test.ts
 * Unit tests for the resolveEmailVerified() helper.
 *
 * Covers: Google email_verified true/false, Azure AD trusted by default,
 * unknown provider defaults to false, missing profile defaults to false,
 * non-boolean email_verified values (hardening).
 *
 * Run: npx jest src/agents/testing/__tests__/resolveEmailVerified.test.ts
 */

import { resolveEmailVerified } from '@/lib/resolveEmailVerified';

// ─── Test suite ──────────────────────────────────────────────────────────────

describe('resolveEmailVerified', () => {
  // ─── Google provider ──────────────────────────────────────────────────────

  it('returns true for Google + email_verified: true', () => {
    expect(resolveEmailVerified('google', { email_verified: true })).toBe(true);
  });

  it('returns false for Google + email_verified: false', () => {
    expect(resolveEmailVerified('google', { email_verified: false })).toBe(false);
  });

  it('returns false for Google + missing email_verified', () => {
    expect(resolveEmailVerified('google', {})).toBe(false);
  });

  it('returns false for Google + null profile', () => {
    expect(resolveEmailVerified('google', null)).toBe(false);
  });

  it('returns false for Google + undefined profile', () => {
    expect(resolveEmailVerified('google', undefined)).toBe(false);
  });

  // ─── Azure AD provider ────────────────────────────────────────────────────

  it('returns true for Azure AD regardless of email_verified', () => {
    expect(resolveEmailVerified('azure-ad', {})).toBe(true);
  });

  it('returns true for Azure AD even with email_verified: false', () => {
    // Enterprise IdPs guarantee email ownership — email_verified is irrelevant
    expect(resolveEmailVerified('azure-ad', { email_verified: false })).toBe(true);
  });

  it('returns true for Azure AD with null profile', () => {
    expect(resolveEmailVerified('azure-ad', null)).toBe(true);
  });

  // ─── Unknown provider ─────────────────────────────────────────────────────

  it('returns false for unknown provider with no profile', () => {
    expect(resolveEmailVerified('some-other-provider', null)).toBe(false);
  });

  it('returns false for unknown provider with boolean email_verified: true (fail-closed)', () => {
    // Unknown providers are NOT trusted — even if they claim email_verified: true,
    // the helper requires an explicit per-provider entry to be trusted.
    // Adding a new provider to NextAuth config requires an explicit entry in
    // resolveEmailVerified() to be trusted.
    expect(resolveEmailVerified('some-other-provider', { email_verified: true })).toBe(false);
  });

  it('returns false for unknown provider with email_verified: false (fail-closed)', () => {
    expect(resolveEmailVerified('some-other-provider', { email_verified: false })).toBe(false);
  });

  // ─── Non-boolean email_verified hardening ──────────────────────────────────

  it('ignores string "false" for email_verified (not a boolean)', () => {
    // typeof "false" === "string", not "boolean" → falls through to false
    // This prevents the "false" string truthy bug that Boolean() would cause
    expect(resolveEmailVerified('google', { email_verified: 'false' as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it('ignores string "true" for email_verified (not a boolean)', () => {
    // typeof "true" === "string", not "boolean" → falls through to false
    // Only actual boolean true should pass
    expect(resolveEmailVerified('google', { email_verified: 'true' as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it('ignores number 1 for email_verified (not a boolean)', () => {
    expect(resolveEmailVerified('google', { email_verified: 1 as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  it('ignores number 0 for email_verified (not a boolean)', () => {
    expect(resolveEmailVerified('google', { email_verified: 0 as any })).toBe(false); // eslint-disable-line @typescript-eslint/no-explicit-any
  });
});
