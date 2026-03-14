import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { getSupabaseAdmin, ensureUserExists } from "@/lib/supabase";
import { getAppUserIdFromSession } from "@/lib/appUser";
import { ensureUser } from "@/src/agents/rag/repository";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ALLOWED_ROLES = new Set(["user", "assistant", "system"]);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getAppUserIdFromSession(session);
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });
  if (!UUID_REGEX.test(sessionId)) return NextResponse.json({ error: "session_id must be a valid UUID" }, { status: 400 });

  const supabaseAdmin = getSupabaseAdmin();

  // Ownership check (since we use service role)
  const { data: owned, error: ownedErr } = await supabaseAdmin
    .from("assistant_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedErr) return NextResponse.json({ error: ownedErr.message }, { status: 500 });
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("assistant_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ messages: data ?? [] });
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
    console.error('[db/assistant/messages] ensureUserExists failed:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { session_id, role, content } = await req.json();

  if (!session_id || !role || !content) {
    return NextResponse.json({ error: "session_id, role, content required" }, { status: 400 });
  }

  if (!UUID_REGEX.test(session_id)) {
    return NextResponse.json({ error: "session_id must be a valid UUID" }, { status: 400 });
  }

  if (!ALLOWED_ROLES.has(role)) {
    return NextResponse.json({ error: "role must be one of: user, assistant, system" }, { status: 400 });
  }

  const supabaseAdmin = getSupabaseAdmin();

  // Ownership check (since we use service role)
  const { data: owned, error: ownedErr } = await supabaseAdmin
    .from("assistant_sessions")
    .select("id")
    .eq("id", session_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (ownedErr) return NextResponse.json({ error: ownedErr.message }, { status: 500 });
  if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin
    .from("assistant_messages")
    .insert({ session_id, role, content })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}

