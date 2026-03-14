import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getSupabaseAdmin, ensureUserExists } from "@/lib/supabase";
import { getAppUserIdFromSession } from "@/lib/appUser";
import { ensureUser } from "@/src/agents/rag/repository";
import { safeISODate } from "@/lib/dateUtils";

interface EmailPayload {
  gmail_id?: string;
  id?: string;
  subject?: string;
  from?: string;
  date?: string;
  snippet?: string;
  body?: string;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getAppUserIdFromSession(session);
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("emails")
    .select("*")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(200);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ emails: data ?? [] });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let userId: string;
  try {
    userId = await ensureUserExists(session);
    await ensureUser(userId, session.user?.email ?? '', session.user?.name, session.user?.image);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to provision user';
    console.error('[db/emails] ensureUserExists failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
  }

  const MAX_BATCH_SIZE = 100;
  const supabaseAdmin = getSupabaseAdmin();

  // Accept either a single email object or { emails: [...] }
  const bodyAsRecord = body as Record<string, unknown>;
  const emails: unknown[] = Array.isArray(bodyAsRecord?.emails) ? bodyAsRecord.emails : [body];

  if (emails.length > MAX_BATCH_SIZE) {
    return NextResponse.json(
      { error: `Batch size exceeds maximum allowed (${MAX_BATCH_SIZE})` },
      { status: 400 }
    );
  }

  const rows = emails
    .filter(Boolean)
    .map((e) => {
      const email = e as EmailPayload;
      return {
        user_id: userId,
        gmail_id: email.gmail_id ?? email.id ?? null,
        subject: email.subject ?? null,
        from: email.from ?? null,
        date: safeISODate(email.date),
        snippet: email.snippet ?? null,
        body: email.body ?? null,
      };
    });

  if (rows.length === 0) return NextResponse.json({ inserted: 0 });

  const { data, error } = await supabaseAdmin
    .from("emails")
    .upsert(rows, { onConflict: "user_id,gmail_id" })
    .select("id,gmail_id,created_at,updated_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0, records: data ?? [] });
}

