/**
 * @file src/agents/testing/evalAuth.ts
 * Eval endpoint authorization logic, extracted for testability.
 *
 * Requires both: (a) email is in EVAL_ADMIN_EMAILS allowlist, and
 * (b) email has been verified by the OAuth provider.
 *
 * Production behavior is fail-closed: if EVAL_ADMIN_EMAILS is unset,
 * access is denied in production environments.
 */

/** Redact an email address for logging: show first char + domain.
 *  e.g. "admin@scasi.ai" → "a***@scasi.ai"
 *  Preserves enough context to identify the domain while minimizing PII. */
function redactEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  return `${local.slice(0, 1)}***@${domain}`;
}

/** Whether the missing-allowlist warning has already been logged this process. */
let _loggedMissingAllowlist = false;

/** Set of unverified emails already warned about this process.
 *  Capped to prevent unbounded growth across long-running processes. */
const _warnedUnverifiedEmails = new Set<string>();
const MAX_WARNED_EMAILS = 100;

/** Check whether the session user is authorized to run/read evals.
 *  Requires both: (a) email is in EVAL_ADMIN_EMAILS allowlist, and
 *  (b) email has been verified by the OAuth provider.
 */
export function isEvalAuthorized(
  email: string | undefined | null,
  emailVerified: boolean | undefined | null,
): boolean {
  if (!email) return false;
  // Reject unverified emails — prevents allowlist bypass via unverified identity claims
  if (!emailVerified) {
    // Log once per email address to avoid spamming on repeated requests
    // Normalize to lowercase for dedup — prevents Admin@x.com vs admin@x.com duplicates
    const lowerEmail = email.toLowerCase();
    if (!_warnedUnverifiedEmails.has(lowerEmail)) {
      console.warn('[EvalAuth] Rejected access for unverified email:', redactEmail(email));
      // Cap Set size to prevent unbounded growth across long-running processes
      if (_warnedUnverifiedEmails.size < MAX_WARNED_EMAILS) {
        _warnedUnverifiedEmails.add(lowerEmail);
      }
      // Once the cap is reached, we stop tracking but still reject access.
      // This means warnings may repeat after the cap, which is acceptable
      // since 100 distinct unverified emails is already highly unusual.
    }
    return false;
  }
  const allowlist = process.env.EVAL_ADMIN_EMAILS;
  // In production, deny access when no allowlist is configured (fail-closed)
  if (!allowlist) {
    if (process.env.NODE_ENV === 'production' && !_loggedMissingAllowlist) {
      console.error('[EvalAuth] EVAL_ADMIN_EMAILS is not set — eval endpoints are locked down.');
      _loggedMissingAllowlist = true;
    }
    return process.env.NODE_ENV !== 'production';
  }
  // filter(Boolean) prevents empty strings from trailing commas or whitespace
  const allowed = allowlist.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

/** Reset internal deduplication state. For use in tests only. */
export function _resetEvalAuthState(): void {
  _loggedMissingAllowlist = false;
  _warnedUnverifiedEmails.clear();
}

/** Successful eval access result. */
export interface EvalAccessGranted {
  ok: true;
  email: string;
  emailVerified: boolean;
}

/** Failed eval access result. */
export interface EvalAccessDenied {
  ok: false;
  error: string;
  status: number;
}

/** Tagged union for eval access check results.
 *  Callers use `if (!access.ok)` to discriminate — TypeScript narrows
 *  to EvalAccessDenied (with .error/.status) or EvalAccessGranted (with .email).
 */
export type EvalAccessResult = EvalAccessGranted | EvalAccessDenied;

/** Check eval access from a NextAuth session object.
 *  Uses a tagged union so callers can discriminate safely.
 *
 *  This design keeps evalAuth.ts free of next/server dependencies so it
 *  works in Jest without polyfilling Request/Response.
 *
 *  Usage in route handlers:
 *    const access = checkEvalAccess(session);
 *    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status });
 *    // ... access.email is guaranteed authorized
 */
export function checkEvalAccess(
  session: { user?: { email?: string | null }; emailVerified?: boolean | null } | null,
): EvalAccessResult {
  if (!session?.user?.email) {
    return { ok: false as const, error: 'Unauthorized', status: 401 };
  }
  if (!isEvalAuthorized(session.user.email, session.emailVerified)) {
    return { ok: false as const, error: 'Forbidden — eval access restricted', status: 403 };
  }

  return { ok: true as const, email: session.user.email, emailVerified: session.emailVerified ?? false };
}
