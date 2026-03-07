import { NextResponse } from 'next/server';
import { supabase, getSupabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    // Test 1: Check if Supabase URL and anon key are configured
    const hasBasicConfig = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && 
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );

    // Test 2: Check if service role key is configured
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Test 3: Try to connect with anon client
    let anonConnectionWorks = false;
    try {
      const { data, error } = await supabase.from('users').select('count').limit(1);
      anonConnectionWorks = !error || error.code === 'PGRST116'; // PGRST116 = no rows, but connection works
    } catch (e) {
      anonConnectionWorks = false;
    }

    // Test 4: Try to connect with admin client (if configured)
    let adminConnectionWorks = false;
    if (hasServiceRole) {
      try {
        const admin = getSupabaseAdmin();
        const { error } = await admin.from('users').select('count').limit(1);
        adminConnectionWorks = !error || error.code === 'PGRST116';
      } catch (e) {
        adminConnectionWorks = false;
      }
    }

    return NextResponse.json({
      status: 'ok',
      config: {
        hasBasicConfig,
        hasServiceRole,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
      },
      connections: {
        anonClient: anonConnectionWorks ? 'connected' : 'failed',
        adminClient: hasServiceRole 
          ? (adminConnectionWorks ? 'connected' : 'failed')
          : 'not_configured',
      },
      message: anonConnectionWorks 
        ? 'Supabase connection successful!' 
        : 'Supabase connection failed. Check your credentials.',
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      error: error.message,
    }, { status: 500 });
  }
}
