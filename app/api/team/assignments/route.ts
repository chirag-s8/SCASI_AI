import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://vkmvquxxpycwbzkihqbc.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { data: members, error: mErr } = await supabase.from('team_collaborators').select('*');
    const { data: assignments, error: aErr } = await supabase.from('email_assignments').select('*');

    if (mErr) throw mErr;
    if (aErr) throw aErr;

    const formattedMembers = (members || []).map((m: Record<string, unknown>) => ({
      id: m.id as string,
      name: m.name as string,
      email: m.email as string,
      activeTasksCount: m.active_tasks_count as number,
      responseRate: m.response_rate as number,
      avatar: (m.avatar_text as string) || "https://ui-avatars.com/api/?name=" + encodeURIComponent((m.name as string) || (m.email as string))
    }));

    const formattedAssignments = (assignments || []).map((a: Record<string, unknown>) => ({
      ...a,
      emailId: a.id as string,
      assignedTo: a.assignee_email as string,
      notes: []
    }));

    return NextResponse.json({ assignments: formattedAssignments, members: formattedMembers });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { emailId, assignedTo, deadline, notes, priority } = await req.json();

    // Map assignedTo (which comes from the frontend member ID, but our db uses email or UUIDs).
    // Let's lookup the email of the assignee.
    const { data: member } = await supabase.from('team_collaborators').select('email').eq('id', assignedTo).single();
    if (!member) throw new Error("Assignee not found in DB.");

    const { data, error } = await supabase.from('email_assignments').insert([{
      assignee_email: member.email,
      email_subject: "Task Assignment " + emailId,
      email_snippet: Array.isArray(notes) ? notes.join(" ") : String(notes || ""),
      status: 'assigned',
      priority: priority || 'Medium',
      due_date: deadline ? new Date(deadline).toISOString() : null
    }]).select();

    if (error) throw error;
    
    // Increment active tasks via RPC or simply update it
    const { data: memRaw } = await supabase.from('team_collaborators').select('active_tasks_count').eq('id', assignedTo).single();
    if (memRaw) {
       await supabase.from('team_collaborators').update({ active_tasks_count: (memRaw.active_tasks_count || 0) + 1 }).eq('id', assignedTo);
    }

    return NextResponse.json({ assignment: data[0] });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { name, email } = await req.json();
    
    const { data, error } = await supabase.from('team_collaborators').insert([{
      name: name || email.split("@")[0],
      email: email,
      active_tasks_count: 0,
      response_rate: 100,
      avatar_text: name ? name.charAt(0).toUpperCase() : email.charAt(0).toUpperCase(),
      status: 'pending'
    }]).select();

    if (error) throw error;

    const newMember = {
      id: data[0].id,
      name: data[0].name,
      email: data[0].email,
      activeTasksCount: data[0].active_tasks_count,
      responseRate: data[0].response_rate,
      avatar: "https://ui-avatars.com/api/?name=" + encodeURIComponent(data[0].name)
    };
    
    return NextResponse.json({ member: newMember });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  return NextResponse.json({ success: true });
}
