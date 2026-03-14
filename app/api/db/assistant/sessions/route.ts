import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { getSupabaseAdmin, ensureUserExists } from "@/lib/supabase";
import { getAppUserIdFromSession } from "@/lib/appUser";
import { ensureUser } from "@/src/agents/rag/repository";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getAppUserIdFromSession(session);
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("assistant_sessions")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(50);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ sessions: data ?? [] });
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
    console.error('[db/assistant/sessions] ensureUserExists failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { title } = await req.json().catch(() => ({ title: undefined }));
  const supabaseAdmin = getSupabaseAdmin();

  const { data, error } = await supabaseAdmin
    .from("assistant_sessions")
    .insert({ user_id: userId, title: title ?? "New Chat" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

