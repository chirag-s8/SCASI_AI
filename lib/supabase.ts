import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Session } from 'next-auth';
import { getAppUserIdFromSession } from './appUser';

// ---------------------------------------------------------------------------
// Lazy helpers — never throw at module load time
// ---------------------------------------------------------------------------

function getEnv(name: string): string {
  return process.env[name] || '';
}

function isSupabaseConfigured(): boolean {
  const url = getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return !!(url && !url.startsWith('your_') && key && !key.startsWith('your_'));
}

function isServiceRoleConfigured(): boolean {
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY');
  return !!(key && !key.startsWith('your_'));
}

// ---------------------------------------------------------------------------
// Lazy singletons — created on first use, never at import time
// ---------------------------------------------------------------------------

let _supabase: SupabaseClient | null = null;
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!_supabase) {
    _supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
      auth: { persistSession: true, autoRefreshToken: true },
    });
  }
  return _supabase;
}

// Browser-facing client (kept for backward compat — returns a no-op proxy if not configured)
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const client = getSupabaseClient();
    if (!client) {
      // Return a no-op function for any method call so the app doesn't crash
      return () => Promise.resolve({ data: null, error: new Error('Supabase not configured') });
    }
    const value = (client as any)[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});

export function getSupabaseAdmin(): SupabaseClient {
  if (!isServiceRoleConfigured()) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured. Add it to .env.local.');
  }
  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(
      getEnv('NEXT_PUBLIC_SUPABASE_URL'),
      getEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false, autoRefreshToken: false } }
    );
  }
  return _supabaseAdmin;
}

// Backward compatibility
export function supabaseAdmin(): SupabaseClient {
  return getSupabaseAdmin();
}

export function getSupabaseWithUser(userId: string): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured.');
  }
  return createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { 'x-app-user-id': userId } },
    db: { schema: 'public' },
  });
}

// ---------------------------------------------------------------------------
// ensureUserExists — non-fatal if Supabase not configured
// ---------------------------------------------------------------------------

export async function ensureUserExists(session: Session): Promise<string> {
  const userId = getAppUserIdFromSession(session);
  const email = session.user?.email;
  const name = session.user?.name;
  const image = session.user?.image;

  if (!email) throw new Error('Session missing email');

  // If Supabase not configured, just return the derived userId
  if (!isServiceRoleConfigured()) {
    return userId;
  }

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('users')
    .upsert(
      { id: userId, email: email.toLowerCase(), name, image },
      { onConflict: 'id' }
    )
    .select('id')
    .single();

  if (error) {
    console.warn('[ensureUserExists] Upsert failed (non-fatal):', error.message);
    return userId; // Return derived userId instead of throwing
  }

  return data?.id ?? userId;
}

// ---------------------------------------------------------------------------
// Type helpers
// ---------------------------------------------------------------------------

export type Database = {
  public: {
    Tables: {
      users: {
        Row: { id: string; email: string; name: string | null; image: string | null; created_at: string; updated_at: string; };
        Insert: { id: string; email: string; name?: string | null; image?: string | null; };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      emails: {
        Row: { id: string; user_id: string; gmail_id: string; subject: string | null; from: string | null; date: string | null; snippet: string | null; body: string | null; created_at: string; updated_at: string; };
        Insert: Omit<Database['public']['Tables']['emails']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['emails']['Insert']>;
      };
      email_chunks: {
        Row: { id: string; email_id: string; chunk_index: number; chunk_text: string; embedding: number[] | null; created_at: string; };
        Insert: Omit<Database['public']['Tables']['email_chunks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['email_chunks']['Insert']>;
      };
      assistant_sessions: {
        Row: { id: string; user_id: string; title: string; created_at: string; updated_at: string; };
        Insert: Omit<Database['public']['Tables']['assistant_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['assistant_sessions']['Insert']>;
      };
      assistant_messages: {
        Row: { id: string; session_id: string; role: 'user' | 'assistant' | 'system'; content: string; created_at: string; };
        Insert: Omit<Database['public']['Tables']['assistant_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['assistant_messages']['Insert']>;
      };
    };
  };
};