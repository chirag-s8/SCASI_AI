"use client";
/**
 * @file components/voice/SessionOverlay.tsx
 * Siri-style session overlay for Scasi voice assistant.
 * Shows full conversation history + live transcript below the wave orb.
 */

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { VoiceMessage, VoiceState } from "@/src/agents/voice/voiceTypes";

interface SessionOverlayProps {
  state: VoiceState;
  isVisible: boolean;
  onDismiss: () => void;
  transcript?: string;
  messages?: VoiceMessage[];
}

const RING_COUNT = 4;

const ringVariants: Record<
  Exclude<VoiceState, "idle">,
  { scale: number[]; opacity: number[]; duration: number; stagger: number }
> = {
  listening:  { scale: [1, 1.28, 1], opacity: [0.5, 0.1, 0.5], duration: 2.2, stagger: 0.38 },
  processing: { scale: [1, 1.12, 1], opacity: [0.4, 0.1, 0.4], duration: 1.1, stagger: 0.18 },
  speaking:   { scale: [1, 1.5,  1], opacity: [0.6, 0.05, 0.6], duration: 0.85, stagger: 0.13 },
};

const stateLabel: Record<VoiceState, string> = {
  idle: "", listening: "Listening…", processing: "Thinking…", speaking: "Speaking…",
};

const stateColor: Record<VoiceState, string> = {
  idle: "#7C3AED", listening: "#2563EB", processing: "#7C3AED", speaking: "#059669",
};

export default function SessionOverlay({
  state,
  isVisible,
  onDismiss,
  transcript,
  messages = [],
}: SessionOverlayProps) {
  const activeState = state === "idle" ? "listening" : state;
  const config = ringVariants[activeState as Exclude<VoiceState, "idle">];
  const color = stateColor[state];
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasContent = messages.length > 0 || !!transcript;

  // Auto-scroll to bottom whenever messages or transcript change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="scasi-overlay"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.88 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            display: "flex", alignItems: "center", justifyContent: "center",
            background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)",
          }}
          onClick={onDismiss}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: 400,
              maxHeight: "85vh",
              borderRadius: 32,
              background: "linear-gradient(145deg, #0f0c29 0%, #1a1640 50%, #24243e 100%)",
              border: "1px solid rgba(167,139,250,0.18)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              overflow: "hidden",
              boxShadow: `0 0 80px 12px ${color}44, 0 32px 80px rgba(0,0,0,0.6)`,
            }}
          >
            {/* ── Wave orb ── */}
            <div style={{
              position: "relative",
              width: 200,
              height: 200,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {Array.from({ length: RING_COUNT }).map((_, i) => (
                <motion.div
                  key={i}
                  animate={{ scale: config.scale, opacity: config.opacity }}
                  transition={{
                    duration: config.duration,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * config.stagger,
                  }}
                  style={{
                    position: "absolute",
                    width: 200,
                    height: 200,
                    borderRadius: 32,
                    border: `2px solid ${color}`,
                    pointerEvents: "none",
                  }}
                />
              ))}

              {state === "processing" && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }}
                  style={{
                    position: "absolute",
                    width: 76,
                    height: 76,
                    borderRadius: "50%",
                    border: "3px solid transparent",
                    borderTopColor: color,
                    borderRightColor: color,
                  }}
                />
              )}

              <div style={{
                fontSize: 26,
                fontWeight: 900,
                color: "#fff",
                letterSpacing: 3,
                zIndex: 1,
                textShadow: `0 0 24px ${color}`,
              }}>
                SCASI
              </div>

              <motion.div
                key={state}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                style={{ marginTop: 8, fontSize: 12, color, fontWeight: 600, letterSpacing: 1, zIndex: 1 }}
              >
                {stateLabel[state]}
              </motion.div>

              <div style={{
                position: "absolute", bottom: 12,
                fontSize: 9.5, color: "rgba(255,255,255,0.3)", zIndex: 1,
              }}>
                tap outside to dismiss
              </div>
            </div>

            {/* ── Conversation history + live transcript ── */}
            {hasContent && (
              <div
                ref={scrollRef}
                style={{
                  width: "100%",
                  flex: 1,
                  overflowY: "auto",
                  borderTop: "1px solid rgba(255,255,255,0.07)",
                  padding: "14px 20px 20px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  scrollbarWidth: "thin",
                  scrollbarColor: "rgba(167,139,250,0.2) transparent",
                }}
              >
                {messages.map((msg, i) => (
                  <div key={i} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      flexShrink: 0, marginTop: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      ...(msg.role === "user"
                        ? { background: "rgba(37,99,235,0.3)", border: "1.5px solid #2563EB" }
                        : { background: "rgba(124,58,237,0.3)", border: "1.5px solid #7C3AED", fontSize: 9, fontWeight: 900, color: "#a78bfa" }
                      ),
                    }}>
                      {msg.role === "user" ? (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
                          <rect x="9" y="2" width="6" height="12" rx="3" />
                          <path d="M5 10a7 7 0 0 0 14 0" />
                          <line x1="12" y1="19" x2="12" y2="22" />
                        </svg>
                      ) : "S"}
                    </div>
                    <div style={{
                      fontSize: 13, lineHeight: 1.55, flex: 1,
                      color: msg.role === "user" ? "rgba(255,255,255,0.88)" : "rgba(255,255,255,0.72)",
                    }}>
                      {msg.text}
                    </div>
                  </div>
                ))}

                {/* Live interim transcript */}
                {transcript && (
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <div style={{
                      width: 24, height: 24, borderRadius: "50%",
                      flexShrink: 0, marginTop: 1,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: "rgba(37,99,235,0.3)", border: "1.5px solid #2563EB",
                    }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round">
                        <rect x="9" y="2" width="6" height="12" rx="3" />
                        <path d="M5 10a7 7 0 0 0 14 0" />
                        <line x1="12" y1="19" x2="12" y2="22" />
                      </svg>
                    </div>
                    <div style={{
                      fontSize: 13, lineHeight: 1.55, flex: 1,
                      color: "rgba(255,255,255,0.88)", fontStyle: "italic",
                    }}>
                      {transcript}
                      {state === "listening" && (
                        <motion.span
                          animate={{ opacity: [1, 0, 1] }}
                          transition={{ duration: 0.75, repeat: Infinity }}
                          style={{ marginLeft: 2, color: "#2563EB", fontStyle: "normal" }}
                        >|</motion.span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
