import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../../auth/[...nextauth]/route";
import { assertSupabaseAdminConfigured, supabaseAdmin } from "@/lib/supabase";
import { getAppUserIdFromSession } from "@/lib/appUser";

export async function GET() {
  assertSupabaseAdminConfigured();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getAppUserIdFromSession(session);

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
  assertSupabaseAdminConfigured();
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = getAppUserIdFromSession(session);
  const { title } = await req.json().catch(() => ({ title: undefined }));

  const { data, error } = await supabaseAdmin
    .from("assistant_sessions")
    .insert({ user_id: userId, title: title ?? "New Chat" })
    .select("*")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ session: data });
}

