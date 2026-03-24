"use client";
/**
 * @file components/voice/VoiceWidget.jsx
 * Global floating voice widget — renders on every page.
 * Sits fixed bottom-right, shows MicButton + SessionOverlay.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useVoiceController } from "@/src/agents/voice/useVoiceController";
import { WakeWordListener } from "@/src/agents/voice/wakeWordListener";

const SessionOverlay = dynamic(() => import("./SessionOverlay"), { ssr: false });
const MicButton = dynamic(() => import("./MicButton"), { ssr: false });

export default function VoiceWidget() {
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

  // Start wake-word listener once user is authenticated
  useEffect(() => {
    if (status !== "authenticated") return;
    const listener = new WakeWordListener({ onDetected: () => startSessionRef.current() });
    wakeListenerRef.current = listener;
    listener.start();
    return () => listener.stop();
  }, [status]);

  // Pause wake listener while session is active to avoid mic conflict
  useEffect(() => {
    const listener = wakeListenerRef.current;
    if (!listener) return;
    if (isVoiceActive) listener.pause();
    else listener.resume();
  }, [isVoiceActive]);

  // Only show when authenticated
  if (status !== "authenticated") return null;

  return (
    <>
      {/* Floating mic button — fixed bottom-right */}
      <div style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        zIndex: 9000,
      }}>
        {MicButton && (
          <MicButton
            state={voiceState}
            onClick={isVoiceActive ? stopSession : startSession}
            isSupported={isSupported.stt}
          />
        )}
      </div>

      {/* Full-screen session overlay */}
      {SessionOverlay && (
        <SessionOverlay
          state={voiceState}
          isVisible={isVoiceActive}
          onDismiss={stopSession}
          transcript={voiceTranscript}
          messages={voiceMessages}
        />
      )}
    </>
  );
}
