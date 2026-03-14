import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Session } from 'next-auth';
import { getAppUserIdFromSession } from './appUser';

// Validates that a required environment variable is set and returns it as a non-nullable string.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. Add it to .env.local.`
    );
  }
  return value;
}

// Environment variables - add these to your .env.local
const supabaseUrl: string = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseAnonKey: string = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');

// Client for browser (uses anon key - respects RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server-side client (uses service role - bypasses RLS, for admin operations)
// Lazy-loaded to avoid errors when service role key is not set
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceRoleKey) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local from Supabase Dashboard > Settings > API."
      );
    }
    _supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return _supabaseAdmin;
}

// Backward compatibility - use getter
export function supabaseAdmin(): SupabaseClient {
  return getSupabaseAdmin();
}
// Helper to create a Supabase client with app user context for RLS
export function getSupabaseWithUser(userId: string): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'x-app-user-id': userId,
      },
    },
    db: {
      schema: 'public',
    },
  });
}

// Ensure user exists in public.users table (upsert)
export async function ensureUserExists(session: Session): Promise<string> {
  const userId = getAppUserIdFromSession(session);
  const email = session.user?.email;
  const name = session.user?.name;
  const image = session.user?.image;

  if (!email) throw new Error('Session missing email');

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from('users')
    .upsert(
      {
        id: userId,
        email: email.toLowerCase(),
        name,
        image,
      },
      { onConflict: 'id' }
    )
    .select('id')
    .single();

  if (error) {
    console.error('[ensureUserExists] Upsert failed:', error.message, { userId, email });
    throw new Error(`Failed to upsert user: ${error.message}`);
  }

  if (!data) {
    console.error('[ensureUserExists] Upsert returned no data — row likely blocked by RLS', { userId, email });
    throw new Error('User upsert returned no data — possible RLS issue');
  }

  return userId;
}

// Type helpers for database tables
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          name: string | null;
          image: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          name?: string | null;
          image?: string | null;
        };
        Update: Partial<Database['public']['Tables']['users']['Insert']>;
      };
      emails: {
        Row: {
          id: string;
          user_id: string;
          gmail_id: string;
          subject: string | null;
          from: string | null;
          date: string | null;
          snippet: string | null;
          body: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['emails']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['emails']['Insert']>;
      };
      email_chunks: {
        Row: {
          id: string;
          email_id: string;
          chunk_index: number;
          chunk_text: string;
          embedding: number[] | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['email_chunks']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['email_chunks']['Insert']>;
      };
      assistant_sessions: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['assistant_sessions']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['assistant_sessions']['Insert']>;
      };
      assistant_messages: {
        Row: {
          id: string;
          session_id: string;
          role: 'user' | 'assistant' | 'system';
          content: string;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['assistant_messages']['Row'], 'id' | 'created_at'>;
        Update: Partial<Database['public']['Tables']['assistant_messages']['Insert']>;
      };
    };
  };
};
