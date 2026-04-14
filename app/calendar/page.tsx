"use client";

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import CalendarView from "@/components/calendar/CalendarView";
import ReminderPopup from "@/components/calendar/ReminderPopup";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: "deadline" | "meeting" | "appointment" | "reminder" | "emergency" | "task";
  emailId?: string;
  description?: string;
  reminderMinutes?: number;
  priority?: "critical" | "high" | "normal";
  aiDetected?: boolean;
  from?: string;
};

export default function CalendarPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeReminder, setActiveReminder] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<"idle" | "scanning" | "done">("idle");
  const eventsRef = useRef<CalendarEvent[]>([]);
  const activeReminderRef = useRef<CalendarEvent | null>(null);

  // Keep refs in sync for use inside intervals
  useEffect(() => { eventsRef.current = events; }, [events]);
  useEffect(() => { activeReminderRef.current = activeReminder; }, [activeReminder]);

  useEffect(() => {
    if (!session) { router.push("/"); return; }

    // Request browser notification permission
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    // 1. Load Google Calendar events
    // 2. Auto-scan inbox for AI-extracted events
    loadAndScan();

    // Reminder check every minute
    const interval = setInterval(checkReminders, 60000);
    return () => clearInterval(interval);
  }, [session]);

  const loadAndScan = async () => {
    setLoading(true);
    try {
      // Step 1: Load existing Google Calendar events
      const calRes = await fetch("/api/calendar/events");
      const calData = await calRes.json();
      const calEvents: CalendarEvent[] = (calData.events || []).map((e: any) => ({
        ...e,
        date: new Date(e.date),
      }));
      setEvents(calEvents);
      eventsRef.current = calEvents;
    } catch {
      setEvents([]);
    }
    setLoading(false);

    // Step 2: Auto-scan inbox in background
    autoScanInbox();
  };

  const autoScanInbox = async () => {
    setAiStatus("scanning");
    try {
      // Fetch recent inbox emails
      const gmailRes = await fetch("/api/gmail");
      const gmailData = await gmailRes.json();
      const emails: any[] = gmailData.emails || [];
      if (!emails.length) { setAiStatus("done"); return; }

      // Extract calendar events from each email in parallel
      const results = await Promise.allSettled(
        emails.map(async (email: any) => {
          try {
            const res = await fetch("/api/calendar/extract", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                subject: email.subject || "",
                snippet: email.snippet || "",
                body: email.snippet || "",
                emailId: email.id,
                from: email.from || "",
              }),
            });
            const data = await res.json();
            return data.events || [];
          } catch { return []; }
        })
      );

      // Flatten and classify extracted events
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const existingTitles = new Set(eventsRef.current.map(e => e.title.toLowerCase().trim()));
      let newEvents: CalendarEvent[] = [];

      results.forEach(r => {
        if (r.status !== "fulfilled") return;
        r.value.forEach((e: any) => {
          const d = new Date(e.date);
          if (isNaN(d.getTime()) || d < today) return; // skip past/invalid
          const titleKey = (e.title || "").toLowerCase().trim();
          if (existingTitles.has(titleKey)) return; // skip duplicates
          existingTitles.add(titleKey);

          const text = (e.title + " " + (e.description || "")).toLowerCase();
          const isCritical = text.includes("urgent") || text.includes("emergency") || text.includes("asap") || text.includes("critical");
          const isHigh = text.includes("deadline") || text.includes("due") || text.includes("important") || text.includes("required");

          newEvents.push({
            ...e,
            id: "ai_" + Date.now() + "_" + Math.random().toString(36).slice(2),
            date: d,
            aiDetected: true,
            priority: isCritical ? "critical" : isHigh ? "high" : "normal",
            type: e.type || "reminder",
            reminderMinutes: e.reminderMinutes || (e.type === "deadline" ? 60 : 15),
          } as CalendarEvent);
        });
      });

      if (!newEvents.length) { setAiStatus("done"); return; }

      // Add each new event to Google Calendar and update state
      for (const event of newEvents) {
        try {
          const res = await fetch("/api/calendar/events", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: event.title,
              date: event.date instanceof Date ? event.date.toISOString() : event.date,
              time: event.time,
              description: event.description
                ? `${event.description} [Auto-extracted by Scasi AI]`
                : `Auto-extracted by Scasi AI${event.from ? ` from ${event.from}` : ""}`,
              reminderMinutes: event.reminderMinutes,
              type: event.type,
            }),
          });
          if (res.ok) {
            const data = await res.json();
            const added: CalendarEvent = {
              ...data.event,
              date: new Date(data.event.date),
              aiDetected: true,
              priority: event.priority,
              type: event.type,
              reminderMinutes: event.reminderMinutes,
            };
            setEvents(prev => [...prev, added]);
          }
        } catch { /* skip failed */ }
      }
    } catch { /* silent fail */ }
    setAiStatus("done");
  };

  const checkReminders = () => {
    const now = new Date();
    eventsRef.current.forEach(event => {
      const eventTime = new Date(event.date);
      if (event.time) {
        const [h, m] = event.time.split(":");
        eventTime.setHours(parseInt(h), parseInt(m));
      }
      const diff = Math.round((eventTime.getTime() - now.getTime()) / 60000);

      // Popup reminder
      const reminderMins = event.reminderMinutes || 15;
      if (diff <= reminderMins && diff > 0 && !activeReminderRef.current) {
        setActiveReminder(event);
      }

      // Browser notifications at 30 min and 5 min
      if ("Notification" in window && Notification.permission === "granted") {
        if (diff === 30 || diff === 5) {
          new Notification(`⏰ Scasi: ${event.title}`, {
            body: `${diff} minute${diff > 1 ? "s" : ""} until ${event.title}${event.time ? ` at ${event.time}` : ""}`,
            icon: "/logo.png",
          });
        }
      }
    });
  };

  const handleAddEvent = async (event: CalendarEvent) => {
    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(event),
      });
      const data = await res.json();
      setEvents(prev => [...prev, { ...data.event, date: new Date(data.event.date) }]);
    } catch (err) { console.error("Failed to add event:", err); }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await fetch(`/api/calendar/events?id=${id}`, { method: "DELETE" });
      setEvents(prev => prev.filter(e => e.id !== id));
    } catch (err) { console.error("Failed to delete event:", err); }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.emailId) router.push(`/?emailId=${event.emailId}`);
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", height: "100vh", gap: 16 }}>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #E2D9F3", borderTopColor: "#7C3AED", animation: "spin 1s linear infinite" }} />
        <div style={{ fontSize: 15, color: "#6B7280", fontWeight: 600 }}>Loading your calendar...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 20 }}>
      <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ maxWidth: 1400, margin: "0 auto", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 4 }}>
              📅 Calendar & Events
            </h1>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <p style={{ fontSize: 14, color: "#6B7280" }}>
                Deadlines, meetings and tasks auto-synced from your inbox
              </p>
              {aiStatus === "scanning" && (
                <span style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#7C3AED", fontWeight: 600, background: "#EDE9FE", padding: "3px 10px", borderRadius: 20 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", border: "2px solid #C4B5FD", borderTopColor: "#7C3AED", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                  AI scanning inbox...
                </span>
              )}
              {aiStatus === "done" && (
                <span style={{ fontSize: 12, color: "#059669", fontWeight: 600, background: "#D1FAE5", padding: "3px 10px", borderRadius: 20 }}>
                  ✦ Inbox synced
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => router.push("/team")} style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #E5E7EB", background: "#F5F3FF", color: "#4C1D95", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              👥 Team
            </button>
            <button onClick={() => router.push("/")} style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid #E5E7EB", background: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>
              ← Inbox
            </button>
          </div>
        </div>
      </div>

      {/* Calendar */}
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <CalendarView
          events={events}
          onAddEvent={handleAddEvent}
          onDeleteEvent={handleDeleteEvent}
          onEventClick={handleEventClick}
        />
      </div>

      {/* Reminder Popup */}
      {activeReminder && (
        <ReminderPopup
          event={activeReminder}
          onDismiss={() => setActiveReminder(null)}
          onSnooze={(mins: number) => {
            const ev = activeReminder;
            setActiveReminder(null);
            setTimeout(() => setActiveReminder(ev), mins * 60000);
          }}
        />
      )}
    </div>
  );
}
