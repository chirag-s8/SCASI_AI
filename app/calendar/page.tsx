"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import CalendarView from "@/components/calendar/CalendarView";
import ReminderPopup from "@/components/calendar/ReminderPopup";
import { useVoice } from "@/components/voice/VoiceContext";

const MicButton = dynamic(() => import("@/components/voice/MicButton"), { ssr: false });

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: "deadline" | "meeting" | "appointment" | "reminder";
  emailId?: string;
  description?: string;
  reminderMinutes?: number;
};

export default function CalendarPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeReminder, setActiveReminder] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const { voiceState, startSession, stopSession, isSupported, isVoiceActive } = useVoice();

  useEffect(() => {
    if (!session) {
      router.push("/");
      return;
    }
    loadEvents();
    startReminderCheck();
  }, [session]);

  const loadEvents = async () => {
    try {
      const res = await fetch("/api/calendar/events");
      const data = await res.json();
      
      if (!res.ok || data.error) {
        console.error("API Error:", data.error);
        alert("Calendar Error: " + (data.error || "Failed to fetch. Did you sign out and back in to grant Calendar permissions?"));
        setEvents([]);
        setLoading(false);
        return;
      }

      setEvents((data.events || []).map((e: any) => ({ ...e, date: new Date(e.date) })));
    } catch (error) {
      console.error("Failed to load events:", error);
      setEvents([]);
    }
    setLoading(false);
  };

  const startReminderCheck = () => {
    const interval = setInterval(() => {
      checkReminders();
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  };

  const checkReminders = () => {
    const now = new Date();
    events.forEach(event => {
      const eventTime = new Date(event.date);
      if (event.time) {
        const [hours, minutes] = event.time.split(":");
        eventTime.setHours(parseInt(hours), parseInt(minutes));
      }

      const reminderTime = new Date(eventTime.getTime() - (event.reminderMinutes || 15) * 60000);

      if (now >= reminderTime && now < eventTime && !activeReminder) {
        setActiveReminder(event);
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
      setEvents([...events, { ...data.event, date: new Date(data.event.date) }]);
    } catch (error) {
      console.error("Failed to add event:", error);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      await fetch(`/api/calendar/events?id=${id}`, { method: "DELETE" });
      setEvents(events.filter(e => e.id !== id));
    } catch (error) {
      console.error("Failed to delete event:", error);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.emailId) {
      router.push(`/?emailId=${event.emailId}`);
    }
  };

  const handleDismissReminder = () => {
    setActiveReminder(null);
  };

  const handleSnoozeReminder = (minutes: number) => {
    if (activeReminder) {
      setTimeout(() => {
        setActiveReminder(activeReminder);
      }, minutes * 60000);
      setActiveReminder(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ fontSize: 18, color: "#6B7280" }}>Loading calendar...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 20 }}>
      {/* Header */}
      <div style={{ maxWidth: 1400, margin: "0 auto", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
              📅 Calendar & Events
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280" }}>
              Track deadlines, meetings, and appointments from your emails
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => router.push("/calendar")}
              style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #E5E7EB", background: "#F5F3FF", color: "#4C1D95", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => router.push("/team")}
              style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #E5E7EB", background: "#F5F3FF", color: "#4C1D95", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
            >
              👥 Team
            </button>
            {MicButton && (
              <MicButton
                state={voiceState}
                onClick={isVoiceActive ? stopSession : startSession}
                isSupported={isSupported.stt}
              />
            )}
            <button
              onClick={() => router.push("/")}
              style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid #E5E7EB", background: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
            >
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
          onDismiss={handleDismissReminder}
          onSnooze={handleSnoozeReminder}
        />
      )}
    </div>
  );
}
