import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { getSupabaseAdmin } from "@/lib/supabase";
import { getAppUserIdFromSession } from "@/lib/appUser";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getAppUserIdFromSession(session);
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("session_id");
  if (!sessionId) return NextResponse.json({ error: "session_id required" }, { status: 400 });

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

  const userId = getAppUserIdFromSession(session);
  const { session_id, role, content } = await req.json();

  if (!session_id || !role || !content) {
    return NextResponse.json({ error: "session_id, role, content required" }, { status: 400 });
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

