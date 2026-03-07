import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAppUserIdFromSession } from "@/lib/appUser";

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

  const userId = getAppUserIdFromSession(session);
  const body = await req.json();
  const supabaseAdmin = getSupabaseAdmin();

  // Accept either a single email object or { emails: [...] }
  const emails = Array.isArray(body?.emails) ? body.emails : [body];

  const rows = emails
    .filter(Boolean)
    .map((e: any) => ({
      user_id: userId,
      gmail_id: e.gmail_id ?? e.id ?? null,
      subject: e.subject ?? null,
      from: e.from ?? null,
      date: e.date ?? null,
      snippet: e.snippet ?? null,
      body: e.body ?? null,
    }));

  if (rows.length === 0) return NextResponse.json({ inserted: 0 });

  const { data, error } = await supabaseAdmin
    .from("emails")
    .upsert(rows, { onConflict: "user_id,gmail_id" })
    .select("id,gmail_id,created_at,updated_at");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inserted: data?.length ?? 0, records: data ?? [] });
}

