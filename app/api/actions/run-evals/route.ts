import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { EvalAgent } from '@/src/agents/testing/evalAgent';
import { checkEvalAccess } from '@/src/agents/testing/evalAuth';
import { getSupabaseAdmin } from '@/lib/supabase';

// Allow up to 300 seconds for the full eval run (15 emails × 4 categories + judge calls)
export const maxDuration = 300;

/** POST — Run the full evaluation suite */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const access = checkEvalAccess(session);
    if (access.ok === false) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const agent = new EvalAgent();
    const evalRun = await agent.runFullEval();

    // Persist to Supabase
    try {
      const supabase = getSupabaseAdmin();
      const { error: dbError } = await supabase.from('eval_runs').insert({
        run_id: evalRun.runId,
        timestamp: evalRun.timestamp,
        results: evalRun.results,
        summary: evalRun.summary,
        prompt_versions: evalRun.promptVersions,
        triggered_by: access.email,
      });

      if (dbError) {
        console.error('Failed to persist eval run:', dbError.message);
      }
    } catch (dbErr) {
      console.error('Supabase persistence error:', dbErr);
      // Still return results even if DB write fails
    }

    return NextResponse.json(evalRun);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/** GET — Fetch recent eval run history */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const access = checkEvalAccess(session);
    if (access.ok === false) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('eval_runs')
      .select('run_id, timestamp, summary, prompt_versions')
      .order('timestamp', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // triggered_by is excluded from the response to avoid exposing PII
    // (email addresses of other admins) in multi-admin setups.
    const runs = (data ?? []).map(row => ({
      runId: row.run_id,
      timestamp: row.timestamp,
      promptVersions: row.prompt_versions ?? {},
      summary: row.summary ?? {},
    }));

    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
