/**
 * @file src/agents/_shared/supabase.ts
 *
 * Agent-layer Supabase client helpers.
 *
 * Two distinct clients:
 *  - `getAnonClient()`         — uses the public anon key, respects RLS
 *  - `getServiceRoleClient()`  — uses the service-role key, bypasses RLS
 *
 * These are singleton-per-process (lazily initialised) so that we do not
 * create a fresh TCP connection on every agent invocation.
 *
 * ⚠ Never expose the service-role client to the browser / edge runtime.
 *    It must only be used inside server-side agent code.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(
            `[agents/_shared/supabase] Missing required environment variable: ${name}. ` +
            `Add it to .env.local.`
        );
    }
    return value;
}

// ---------------------------------------------------------------------------
// Lazy singletons
// ---------------------------------------------------------------------------

let _anonClient: SupabaseClient | null = null;
let _serviceRoleClient: SupabaseClient | null = null;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a Supabase client that uses the **anon** key.
 * Row-Level Security (RLS) policies are enforced.
 * Safe to use in any agent that acts on behalf of a user.
 */
export function getAnonClient(): SupabaseClient {
    if (!_anonClient) {
        const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
        const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

        _anonClient = createClient(url, anonKey, {
            auth: {
                persistSession: false, // agents are stateless
                autoRefreshToken: false,
            },
        });
    }

    return _anonClient;
}

/**
 * Returns a Supabase client that uses the **service-role** key.
 * RLS is bypassed — use only for trusted server-side operations
 * (e.g. bulk ingestion, migrations, admin tasks).
 *
 * @throws {Error} if `SUPABASE_SERVICE_ROLE_KEY` is not set
 */
export function getServiceRoleClient(): SupabaseClient {
    if (!_serviceRoleClient) {
        const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
        const serviceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY');

        _serviceRoleClient = createClient(url, serviceKey, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
            },
        });
    }

    return _serviceRoleClient;
}

/**
 * Creates a **per-request** anon client that injects a custom header
 * to identify the app user for Supabase RLS policies.
 *
 * Use this when you need fine-grained per-user access control inside agents.
 */
export function getAnonClientForUser(userId: string): SupabaseClient {
    const url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
    const anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

    return createClient(url, anonKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
        },
        global: {
            headers: {
                'x-app-user-id': userId,
            },
        },
    });
}

// ---------------------------------------------------------------------------
// Re-export the SupabaseClient type so callers don't need a separate import
// ---------------------------------------------------------------------------
export type { SupabaseClient };
