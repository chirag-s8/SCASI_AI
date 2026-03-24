"use client";
/**
 * @file components/voice/VoiceContext.jsx
 * Global voice context — single useVoiceController instance shared across all pages.
 * Wrap the app with <VoiceProvider> and consume with useVoice().
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useVoiceController } from "@/src/agents/voice/useVoiceController";
import { WakeWordListener } from "@/src/agents/voice/wakeWordListener";

const SessionOverlay = dynamic(() => import("./SessionOverlay"), { ssr: false });

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const { status } = useSession();
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceMessages, setVoiceMessages] = useState([]);

  const addVoiceMessage = useCallback((role, text) => {
    setVoiceMessages(prev => [...prev, { role, text }]);
  }, []);

  const { state: voiceState, startSession, stopSession, isSupported } =
    useVoiceController({
      onTranscript: (text) => setVoiceTranscript(text),
      onAnswer: (answer, userText) => {
        setVoiceTranscript("");
        addVoiceMessage("user", userText);
        addVoiceMessage("assistant", answer);
      },
      onStateChange: (s) => {
        if (s === "idle") {
          setVoiceTranscript("");
          setVoiceMessages([]);
        }
      },
    });

  const isVoiceActive = voiceState !== "idle";
  const wakeListenerRef = useRef(null);
  const startSessionRef = useRef(startSession);
  useEffect(() => { startSessionRef.current = startSession; }, [startSession]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const listener = new WakeWordListener({ onDetected: () => startSessionRef.current() });
    wakeListenerRef.current = listener;
    listener.start();
    return () => listener.stop();
  }, [status]);

  useEffect(() => {
    const listener = wakeListenerRef.current;
    if (!listener) return;
    if (isVoiceActive) listener.pause();
    else listener.resume();
  }, [isVoiceActive]);

  return (
    <VoiceContext.Provider value={{ voiceState, startSession, stopSession, isSupported, isVoiceActive }}>
      {children}
      {/* Global session overlay — renders on top of every page */}
      {status === "authenticated" && SessionOverlay && (
        <SessionOverlay
          state={voiceState}
          isVisible={isVoiceActive}
          onDismiss={stopSession}
          transcript={voiceTranscript}
          messages={voiceMessages}
        />
      )}
    </VoiceContext.Provider>
  );
}

export function useVoice() {
  const ctx = useContext(VoiceContext);
  if (!ctx) throw new Error("useVoice must be used inside <VoiceProvider>");
  return ctx;
}
