import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { callOpenRouter } from "@/lib/openrouter";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { subject, body, snippet, emailId, from } = await req.json();

    const emailText = `${subject}\n\n${body || snippet}`;

    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });

    const prompt = `You are Scasi's calendar extraction assistant. Extract ALL calendar-worthy events from this email.

Email From: ${from || "Unknown"}
Subject: ${subject}
Content: ${emailText}

Current date: ${currentDate} (${dayOfWeek})

EXTRACT these event types:
- Meetings: video calls, in-person meetings, phone calls, syncs, standups, 1:1s
- Deadlines: submission dates, due dates, expiry dates, renewal dates, RSVP deadlines
- Appointments: interviews, scheduled events, doctor visits, client sessions
- Reminders: follow-ups, check-ins, "let's touch base next week", review dates

For each event, extract:
1. title: Clear, specific event name (not just "Meeting" — include who/what, e.g. "Budget Review with Sarah")
2. date: YYYY-MM-DD format. Convert relative dates:
   - "today" → ${currentDate}
   - "tomorrow" → next day from ${currentDate}
   - "next Monday" → calculate the actual date
   - "in 2 weeks" → calculate the actual date
   - "end of month" → last day of current month
3. time: HH:MM in 24-hour format. Convert:
   - "3pm" → "15:00"
   - "noon" → "12:00"
   - "morning" → "09:00" (reasonable default)
   - If timezone mentioned (EST, PST, etc.), note it in description
   - If no time mentioned → null
4. type: "meeting" | "deadline" | "appointment" | "reminder"
5. description: Brief context from the email (1 sentence)
6. reminderMinutes: 15 for meetings, 60 for deadlines, 30 for appointments, 15 for reminders

RULES:
- Return ONLY a valid JSON array, no other text
- If no events found, return []
- Extract ALL possible events, even implied ones ("let's meet next week" → create a tentative meeting)
- For recurring events ("every Monday", "weekly standup"), extract the NEXT occurrence only
- Don't extract past events unless the email is about rescheduling them
- If a timezone is mentioned, include it in the description field

Return format:
[
  {
    "title": "Q1 Budget Review with Client Team",
    "date": "2026-02-25",
    "time": "14:00",
    "type": "meeting",
    "description": "Discuss Q1 budget proposal — Zoom link in email (EST)",
    "reminderMinutes": 15
  }
]`;

    const response = await callOpenRouter([
      { role: "user", content: prompt }
    ], 0.2, 1000);
    
    // Extract JSON from response
    let events = [];
    try {
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        events = JSON.parse(jsonMatch[0]);
        // Add emailId to each event
        events = events.map((event: Record<string, unknown>) => ({
          ...event,
          emailId,
          from,
        }));
      }
    } catch (e) {
      console.error("Failed to parse events:", e);
      // Fallback: Try to extract manually
      events = fallbackExtraction(emailText, emailId, from);
    }

    return NextResponse.json({ events, count: events.length });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error("Calendar extraction error:", error);
    return NextResponse.json({ events: [], error: msg });
  }
}

// Fallback extraction using regex patterns
function fallbackExtraction(text: string, emailId: string, from: string) {
  const events = [];
  const lower = text.toLowerCase();

  // Meeting patterns
  if (lower.includes("meeting") || lower.includes("call") || lower.includes("zoom")) {
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    const timeMatch = text.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    
    if (dateMatch) {
      events.push({
        title: "Meeting",
        date: `2026-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`,
        time: timeMatch ? `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}` : null,
        type: "meeting",
        description: text.substring(0, 100),
        reminderMinutes: 15,
        emailId,
        from,
      });
    }
  }

  // Deadline patterns
  if (lower.includes("deadline") || lower.includes("due") || lower.includes("submit")) {
    const dateMatch = text.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    
    if (dateMatch) {
      events.push({
        title: "Deadline",
        date: `2026-${dateMatch[2].padStart(2, '0')}-${dateMatch[1].padStart(2, '0')}`,
        time: null,
        type: "deadline",
        description: text.substring(0, 100),
        reminderMinutes: 60,
        emailId,
        from,
      });
    }
  }

  return events;
}
