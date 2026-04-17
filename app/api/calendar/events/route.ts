import { NextResponse } from "next/server";
import { getServerSession, Session } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
import { google } from "googleapis";

class CalendarAuthError extends Error {
  constructor(message: string) { super(message); this.name = 'CalendarAuthError'; }
}

function getCalendarClient(session: Session | null) {
  if (!session?.accessToken) throw new CalendarAuthError("Unauthorized — no access token");
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: session.accessToken });
  return google.calendar({ version: "v3", auth });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const calendar = getCalendarClient(session);

    // Fetch last 1 month to next 6 months events
    // Use first-of-previous-month to avoid 31st-day overflow (e.g. Mar 31 → Feb 31 → Mar 3)
    const now = new Date();
    const timeMin = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: timeMin.toISOString(),
      maxResults: 150,
      singleEvents: true,
      orderBy: "startTime",
    });

    const googleEvents = response.data.items || [];
    
    const events = googleEvents.map(e => {
      const isAllDay = !!e.start?.date;
      const startDate = e.start?.dateTime || e.start?.date;
      const d = new Date(startDate as string);
      
      let timeStr = undefined;
      if (!isAllDay) {
        timeStr = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
      
      return {
        id: e.id,
        title: e.summary || "Untitled Event",
        date: startDate,
        time: timeStr,
        type: "meeting", // Fallback, real calendar doesn't strictly have Scasi types
        description: e.description || "",
        reminderMinutes: e.reminders?.overrides?.[0]?.minutes || 15
      };
    });

    return NextResponse.json({ events });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Calendar GET Error:", error);
    // Map Google auth/config failures to meaningful status codes
    const gerr = error as { code?: number; status?: number } | null;
    if (gerr?.code === 401 || gerr?.status === 401 || error instanceof CalendarAuthError) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (gerr?.code === 403 || gerr?.status === 403) {
      return NextResponse.json({ error: message }, { status: 503 }); // upstream config/auth failure
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const calendar = getCalendarClient(session);

    const body = await req.json();
    const { title, date, time, description, reminderMinutes } = body;
    
    let startDateTime: Date;
    let endDateTime: Date;
    
    if (time) {
      const [hours, minutes] = time.split(':');
      startDateTime = new Date(date);
      startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);
      
      // Default 1 hour duration
      endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1);
    } else {
      startDateTime = new Date(date);
      // All day event format is YYYY-MM-DD
    }

    const eventParams = {
      summary: title,
      description: description || "Created via Scasi-AI",
      start: time 
        ? { dateTime: startDateTime.toISOString() } 
        : { date: startDateTime.toISOString().split('T')[0] },
      end: time 
        ? { dateTime: endDateTime!.toISOString() } 
        : { date: new Date(startDateTime.getTime() + 86400000).toISOString().split('T')[0] },
      reminders: reminderMinutes
        ? {
            useDefault: false,
            overrides: [
              { method: 'popup' as const, minutes: reminderMinutes },
              { method: 'email' as const, minutes: reminderMinutes }
            ]
          }
        : { useDefault: true },
    };

    const res = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: eventParams,
    });

    const newEvent = {
        id: res.data.id,
        title,
        date: time ? startDateTime.toISOString() : startDateTime.toISOString().split('T')[0],
        time,
        type: body.type || 'appointment',
        description,
        reminderMinutes
    };

    return NextResponse.json({ event: newEvent });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Calendar POST error:", error);
    // Map Google auth/config failures to meaningful status codes
    const gerr = error as { code?: number; status?: number } | null;
    if (gerr?.code === 401 || gerr?.status === 401 || error instanceof CalendarAuthError) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (gerr?.code === 403 || gerr?.status === 403) {
      return NextResponse.json({ error: message }, { status: 503 }); // upstream config/auth failure
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    const calendar = getCalendarClient(session);

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("id");
    
    if (!eventId) return NextResponse.json({ error: "No ID provided" }, { status: 400 });

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId,
    });
    
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Calendar DELETE error:", error);
    // Map Google auth/config failures to meaningful status codes
    const gerr = error as { code?: number; status?: number } | null;
    if (gerr?.code === 401 || gerr?.status === 401 || error instanceof CalendarAuthError) {
      return NextResponse.json({ error: message }, { status: 401 });
    }
    if (gerr?.code === 403 || gerr?.status === 403) {
      return NextResponse.json({ error: message }, { status: 503 }); // upstream config/auth failure
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
