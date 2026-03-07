import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Session } from 'next-auth';
import { getAppUserIdFromSession } from './appUser';

// Environment variables - add these to your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('⚠️  Supabase credentials missing. Add to .env.local:\n  NEXT_PUBLIC_SUPABASE_URL=your-project-url\n  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
}

// Client for browser (uses anon key - respects RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl as string, supabaseAnonKey as string, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server-side client (uses service role - bypasses RLS, for admin operations)
// Lazy-loaded to avoid errors when service role key is not set
let _supabaseAdmin: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to .env.local from Supabase Dashboard > Settings > API."
    );
  }

  if (!_supabaseAdmin) {
    _supabaseAdmin = createClient(supabaseUrl as string, supabaseServiceRoleKey as string, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return _supabaseAdmin;
}

// Backward compatibility - use getter
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
  get(target, prop) {
    return getSupabaseAdmin()[prop as keyof SupabaseClient];
  }
});

// Helper to create a Supabase client with app user context for RLS
export function getSupabaseWithUser(userId: string): SupabaseClient {
  return createClient(supabaseUrl as string, (supabaseServiceRoleKey ?? supabaseAnonKey) as string, {
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
  await admin
    .from('users')
    .upsert(
      {
        id: userId,
        email: email.toLowerCase(),
        name,
        image,
      },
      { onConflict: 'id' }
    );

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
          gmail_id: string | null;
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
