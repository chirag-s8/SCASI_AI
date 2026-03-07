import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables - add these to your .env.local
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️  Supabase credentials missing. Add to .env.local:\n  NEXT_PUBLIC_SUPABASE_URL=your-project-url\n  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key');
}

// Client for browser (uses anon key - respects RLS)
export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

// Server-side client (uses service role - bypasses RLS, for admin operations)
export const supabaseAdmin: SupabaseClient = createClient(
  supabaseUrl,
  supabaseServiceRoleKey ?? 'missing-service-role-key',
  {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export function assertSupabaseAdminConfigured() {
  if (!supabaseServiceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is not set. Add it to Scasi-AI/.env.local from Supabase Dashboard > Settings > API."
    );
  }
}

// Type helpers for database tables
export type Database = {
  public: {
    Tables: {
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
