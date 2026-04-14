"use client";

import { useState, useEffect } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: "deadline" | "meeting" | "appointment" | "reminder";
  emailId?: string;
  description?: string;
};

type Props = {
  events?: CalendarEvent[];
  onAddEvent?: (event: CalendarEvent) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;
  onEventClick?: (event: CalendarEvent) => void;
};

const MOCK_EVENTS: CalendarEvent[] = [
  { id: "m1", title: "Product Launch Strategy Sync", date: new Date(), time: "10:00", type: "meeting", description: "Review Q3 marketing assets." },
  { id: "m2", title: "Vendor Payment Due", date: new Date(), time: "14:00", type: "deadline", description: "Clear AWS infrastructure invoice." },
  { id: "m3", title: "Team Weekly Standup", date: new Date(Date.now() + 86400000), time: "09:30", type: "meeting" },
  { id: "m4", title: "Review Q4 Roadmap", date: new Date(Date.now() + 172800000), type: "reminder" },
];

export default function CalendarView({ events: externalEvents, onAddEvent, onDeleteEvent, onEventClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // Use external events when provided, otherwise fall back to internal localStorage events
  const events = externalEvents ?? internalEvents;

  // Modal Form State
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDate, setNewEventDate] = useState(new Date().toISOString().split("T")[0]);
  const [newEventTime, setNewEventTime] = useState("");
  const [newEventType, setNewEventType] = useState("meeting");

  const loadEvents = () => {
    const rawEvents = localStorage.getItem("scasi_calendar_events");
    if (rawEvents) {
      const parsed = JSON.parse(rawEvents);
      setInternalEvents(parsed.map((e: any) => ({ ...e, date: new Date(e.date) })));
    } else {
      setInternalEvents(MOCK_EVENTS);
      localStorage.setItem("scasi_calendar_events", JSON.stringify(MOCK_EVENTS));
    }
  };

  useEffect(() => {
    // Only load from localStorage when no external events are provided
    if (!externalEvents) {
      loadEvents();
      const handleSync = () => loadEvents();
      window.addEventListener("calendarSync", handleSync);
      setLoading(false);
      return () => window.removeEventListener("calendarSync", handleSync);
    }
    setLoading(false);
  }, [externalEvents]);

  const handleSaveEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDate) return;

    const newEvent: CalendarEvent = {
        id: "evt_" + Date.now(),
        title: newEventTitle,
        date: new Date(newEventDate),
        time: newEventTime || undefined,
        type: newEventType as any
    };

    if (onAddEvent) {
      await onAddEvent(newEvent);
    } else {
      const updatedEvents = [...events, newEvent];
      setInternalEvents(updatedEvents);
      localStorage.setItem("scasi_calendar_events", JSON.stringify(updatedEvents));
      window.dispatchEvent(new Event("calendarSync"));
    }
    
    setShowAddModal(false);
    setNewEventTitle("");
    setNewEventTime("");
  };

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return { firstDay, daysInMonth };
  };

  const { firstDay, daysInMonth } = getDaysInMonth(currentDate);

  const getEventsForDate = (day: number) => {
    return events.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getDate() === day &&
        eventDate.getMonth() === currentDate.getMonth() &&
        eventDate.getFullYear() === currentDate.getFullYear();
    });
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "deadline": return "linear-gradient(135deg, #EF4444, #DC2626)";
      case "meeting": return "linear-gradient(135deg, #3B82F6, #2563EB)";
      case "appointment": return "linear-gradient(135deg, #8B5CF6, #7C3AED)";
      case "reminder": return "linear-gradient(135deg, #10B981, #059669)";
      default: return "linear-gradient(135deg, #6B7280, #4B5563)";
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%", background: "#FAF8FF" }}>
        <div style={{ width: 40, height: 40, borderRadius: "50%", border: "3px solid #E2D9F3", borderTopColor: "#7C3AED", animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ padding: "32px 40px", background: "#FAF8FF", minHeight: "100%", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .cal-day-card { transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .cal-day-card:hover { transform: translateY(-3px); box-shadow: 0 12px 24px rgba(124,58,237,0.08); border-color: rgba(124,58,237,0.3); }
        .cal-btn { transition: all 0.2s; }
        .cal-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(124,58,237,0.2); }
      `}</style>
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
        <div>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: "#18103A", letterSpacing: "-0.5px", marginBottom: 4 }}>
            📅 Intelligent Calendar
          </h2>
          <p style={{ color: "#7a72a8", fontSize: 14 }}>Add events manually or auto-extract from your inbox with intelligent alerts 30 & 5 minutes before.</p>
        </div>
        <button
          className="cal-btn"
          onClick={() => setShowAddModal(true)}
          style={{
            padding: "12px 24px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)",
            color: "white",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 14,
            boxShadow: "0 4px 14px rgba(124,58,237,0.25)"
          }}
        >
          + Add New Event
        </button>
      </div>

      <div style={{ display: "flex", gap: 32, alignItems: "flex-start" }}>
        
        {/* Main Calendar Section */}
        <div style={{ flex: 1, background: "white", padding: 28, borderRadius: 24, border: "1px solid #E2D9F3", boxShadow: "0 8px 30px rgba(24,16,58,0.03)" }}>
          
          {/* Month Navigation */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} style={navButton}>←</button>
            <h3 style={{ fontSize: 22, fontWeight: 800, color: "#18103A", fontFamily: "'Syne', sans-serif" }}>
              {monthNames[currentDate.getMonth()]} <span style={{ color: "#A78BFA" }}>{currentDate.getFullYear()}</span>
            </h3>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} style={navButton}>→</button>
          </div>

          {/* Calendar Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 12 }}>
            {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(day => (
              <div key={day} style={{ textAlign: "center", fontWeight: 800, fontSize: 11, color: "#a78bfa", paddingBottom: 12, letterSpacing: "1px" }}>
                {day}
              </div>
            ))}

            {Array.from({ length: firstDay }).map((_, i) => (
              <div key={`empty-${i}`} style={{ minHeight: 110 }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDate(day);
              const isToday = new Date().getDate() === day && new Date().getMonth() === currentDate.getMonth() && new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div
                  key={day}
                  className="cal-day-card"
                  style={{
                    minHeight: 110,
                    padding: 10,
                    borderRadius: 14,
                    border: isToday ? "2px solid #7C3AED" : "1px solid rgba(226,217,243,0.6)",
                    background: isToday ? "#F5F3FF" : "white",
                    cursor: "pointer",
                    position: "relative"
                  }}
                  onClick={() => setSelectedDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day))}
                >
                  <div style={{ fontWeight: 800, fontSize: 15, color: isToday ? "#7C3AED" : "#18103A", marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
                    {day}
                    {dayEvents.length > 0 && <span style={{ width: 6, height: 6, background: "#A78BFA", borderRadius: "50%", marginTop: 5 }} />}
                  </div>
                  {dayEvents.slice(0, 3).map(event => (
                    <div
                      key={event.id}
                      onClick={(e) => { e.stopPropagation(); onEventClick?.(event); }}
                      style={{
                        fontSize: 10.5,
                        padding: "4px 7px",
                        borderRadius: 6,
                        background: getEventColor(event.type),
                        color: "white",
                        marginBottom: 4,
                        fontWeight: 600,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                      }}
                    >
                      {event.title}
                    </div>
                  ))}
                  {dayEvents.length > 3 && (
                    <div style={{ fontSize: 10, color: "#7a72a8", fontWeight: 700, marginTop: 4 }}>
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Sidebar pane inside Calendar */}
        <div style={{ width: 340, flexShrink: 0, display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ background: "white", padding: 24, borderRadius: 24, border: "1px solid #E2D9F3", boxShadow: "0 8px 30px rgba(24,16,58,0.03)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: "#18103A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
              📌 Upcoming Events
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {events
                .filter(e => new Date(e.date) >= new Date(new Date().setHours(0,0,0,0)))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .slice(0, 5)
                .map((event, idx) => (
                  <div
                    key={event.id + idx}
                    className="cal-day-card"
                    style={{
                      padding: 14,
                      borderRadius: 14,
                      background: "#FAF8FF",
                      border: "1px solid #E2D9F3",
                      cursor: "pointer",
                      display: "flex",
                      gap: 12
                    }}
                  >
                     <div style={{ width: 4, borderRadius: 4, background: getEventColor(event.type) }} />
                     <div>
                       <div style={{ fontWeight: 700, fontSize: 13, color: "#18103A", marginBottom: 2 }}>{event.title}</div>
                       <div style={{ fontSize: 11, color: "#7a72a8", fontWeight: 500 }}>
                         {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} {event.time && `• ${event.time}`}
                       </div>
                     </div>
                  </div>
                ))}
            </div>
          </div>
          
          <div style={{ background: "linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)", padding: 24, borderRadius: 24, color: "white", boxShadow: "0 12px 30px rgba(124,58,237,0.2)" }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>✨ Active Notifications</h3>
            <p style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.6 }}>Any event created with a set time will now push a browser notification strictly to you 30 mins and 5 mins exactly before it begins.</p>
          </div>
        </div>

      </div>

      {/* Modern Add Event Modal */}
      {showAddModal && (
        <div className="anim" style={{ position: "fixed", inset: 0, background: "rgba(15,9,38,0.7)", backdropFilter: "blur(12px)", zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", padding: 32, borderRadius: 24, width: "100%", maxWidth: 420, boxShadow: "0 24px 60px rgba(24,16,58,0.15)", border: "1px solid #E2D9F3" }}>
            <h3 style={{ fontSize: 22, fontWeight: 800, marginBottom: 24, color: "#18103A" }}>✨ New Event</h3>
            <form onSubmit={handleSaveEvent}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7a72a8", marginBottom: 6, textTransform: "uppercase", letterSpacing: "1px" }}>Title</label>
                <input value={newEventTitle} onChange={e => setNewEventTitle(e.target.value)} required placeholder="Website Launch Sync" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E2D9F3", background: "#FAF8FF", outline: "none", fontFamily: "'DM Sans'", fontSize: 14 }} />
              </div>
              <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7a72a8", marginBottom: 6, textTransform: "uppercase" }}>Date</label>
                  <input type="date" value={newEventDate} onChange={e => setNewEventDate(e.target.value)} required style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E2D9F3", background: "#FAF8FF", outline: "none", fontFamily: "'DM Sans'", fontSize: 14 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7a72a8", marginBottom: 6, textTransform: "uppercase" }}>Time (For Alerts)</label>
                  <input type="time" value={newEventTime} onChange={e => setNewEventTime(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E2D9F3", background: "#FAF8FF", outline: "none", fontFamily: "'DM Sans'", fontSize: 14 }} />
                </div>
              </div>
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#7a72a8", marginBottom: 6, textTransform: "uppercase" }}>Event Type</label>
                <select value={newEventType} onChange={e => setNewEventType(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #E2D9F3", background: "#FAF8FF", outline: "none", fontFamily: "'DM Sans'", fontSize: 14 }}>
                  <option value="meeting">Meeting</option>
                  <option value="deadline">Deadline</option>
                  <option value="appointment">Appointment</option>
                  <option value="reminder">Reminder</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: 16 }}>
                <button type="button" onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: "12px", background: "transparent", color: "#7a72a8", borderRadius: 10, fontWeight: 700, border: "1px solid #E2D9F3" }}>Cancel</button>
                <button type="submit" style={{ flex: 1, padding: "12px", background: "#7C3AED", color: "white", borderRadius: 10, fontWeight: 700, border: "none", boxShadow: "0 4px 12px rgba(124,58,237,0.3)" }}>Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const navButton = {
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid rgba(226,217,243,0.8)",
  background: "#FAF8FF",
  cursor: "pointer",
  fontWeight: 700,
  fontSize: 16,
  color: "#7C3AED",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 40,
  height: 40
};
