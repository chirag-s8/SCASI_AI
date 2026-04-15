"use client";

import { useEffect, useState } from "react";

type CalendarEvent = {
  id: string;
  title: string;
  date: Date;
  time?: string;
  type: "deadline" | "meeting" | "appointment" | "reminder" | "emergency" | "task";
  description?: string;
};

type Props = {
  event: CalendarEvent;
  onDismiss: () => void;
  onSnooze: (minutes: number) => void;
};

export default function ReminderPopup({ event, onDismiss, onSnooze }: Props) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setTimeout(() => setShow(true), 100);
  }, []);

  const getIcon = (type: string) => {
    switch (type) {
      case "deadline": return "⏰";
      case "meeting": return "📞";
      case "appointment": return "📅";
      case "reminder": return "🔔";
      default: return "📌";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: show ? 20 : -200,
        right: 20,
        width: 350,
        background: "white",
        borderRadius: 18,
        boxShadow: "0 10px 40px rgba(0,0,0,0.2)",
        padding: 20,
        zIndex: 9999,
        transition: "bottom 0.4s ease",
        border: "2px solid #2563EB",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div style={{ fontSize: 24 }}>{getIcon(event.type)}</div>
        <button
          onClick={onDismiss}
          style={{
            background: "transparent",
            border: "none",
            fontSize: 20,
            cursor: "pointer",
            color: "#6B7280",
          }}
        >
          ×
        </button>
      </div>

      {/* Content */}
      <h3 style={{ fontSize: 16, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
        {event.title}
      </h3>
      <p style={{ fontSize: 13, color: "#6B7280", marginBottom: 4 }}>
        {new Date(event.date).toLocaleDateString()} {event.time && `at ${event.time}`}
      </p>
      {event.description && (
        <p style={{ fontSize: 13, color: "#374151", marginTop: 8, marginBottom: 12 }}>
          {event.description}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <button
          onClick={onDismiss}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            border: "1px solid #E5E7EB",
            background: "white",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Dismiss
        </button>
        <button
          onClick={() => onSnooze(15)}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: 10,
            border: "none",
            background: "linear-gradient(135deg,#6D28D9,#2563EB)",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: 13,
          }}
        >
          Snooze 15m
        </button>
      </div>
    </div>
  );
}
