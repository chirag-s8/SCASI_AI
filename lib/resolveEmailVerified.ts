/**
 * Centralized provider-specific email verification resolution.
 *
 * Different OAuth providers use different claim shapes and semantics for
 * email_verified. This helper normalizes them into a single boolean.
 *
 * Provider mapping (EXPLICIT — no provider is implicitly trusted):
 *  - azure-ad:   always true  (enterprise IdPs guarantee email ownership)
 *  - google:     profile.email_verified (standard OpenID Connect claim)
 *  - Other/unknown: always false (fail-closed — user must re-auth)
 *
 * Uses strict type check for email_verified — typeof check prevents
 * String("false") truthy bug that Boolean() would cause.
 */

export function resolveEmailVerified(
  provider: string,
  profile: { email_verified?: boolean } | null | undefined,
): boolean {
  // Enterprise/organizational IdPs guarantee email ownership
  if (provider === 'azure-ad') return true;

  // Google exposes email_verified as a standard OIDC claim.
  // Use strict type check — String("false") would be truthy with Boolean().
  if (provider === 'google') {
    return typeof profile?.email_verified === 'boolean' ? profile.email_verified : false;
  }

  // Unknown provider — fail-closed: treat as unverified so the user
  // is prompted to re-authenticate. Adding a new provider to NextAuth
  // config requires an explicit entry here to be trusted.
  return false;
}
