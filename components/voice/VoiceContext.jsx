"use client";
/**
 * @file components/voice/VoiceContext.jsx
 * Global voice context — handles compose-via-voice flow.
 * The useVoiceController handles read-aloud/view-compose intercept internally.
 */

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useVoiceController } from "@/src/agents/voice/useVoiceController";
import { WakeWordListener } from "@/src/agents/voice/wakeWordListener";
import ComposeWithAI from "@/components/compose/ComposeWithAI";

const SessionOverlay = dynamic(() => import("./SessionOverlay"), { ssr: false });
const MicButton = dynamic(() => import("./MicButton"), { ssr: false });

const VoiceContext = createContext(null);

export function VoiceProvider({ children }) {
  const { data: session, status } = useSession();
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceMessages, setVoiceMessages] = useState([]);

  // Compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState(null);
  const composeDataRef = useRef(null);

  const addVoiceMessage = useCallback((role, text) => {
    setVoiceMessages((prev) => [...prev, { role, text }]);
  }, []);

  const { state: voiceState, startSession, stopSession, speakText, isSupported } =
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
      // Called when AI drafts an email — store it for compose modal
      onCompose: (data) => {
        setComposeData(data);
        composeDataRef.current = data;
      },
      // Called when user says "show compose" / "view" after draft prompt
      onReadAloud: () => {
        // Open compose modal with stored draft data
        if (composeDataRef.current) {
          setShowCompose(true);
        }
      },
    });

  const isVoiceActive = voiceState !== "idle";
  const wakeListenerRef = useRef(null);
  const startSessionRef = useRef(startSession);
  useEffect(() => { startSessionRef.current = startSession; }, [startSession]);

  useEffect(() => {
    if (status !== "authenticated") return;
    const listener = new WakeWordListener({
      onDetected: () => {
        listener.pause();
        startSessionRef.current(true);
      },
    });
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

      {status === "authenticated" && MicButton && !isVoiceActive && (
        <MicButton
          state={voiceState}
          onClick={startSession}
          isSupported={isSupported.stt}
          floating
        />
      )}

      {status === "authenticated" && SessionOverlay && (
        <SessionOverlay
          state={voiceState}
          isVisible={isVoiceActive}
          onDismiss={stopSession}
          transcript={voiceTranscript}
          messages={voiceMessages}
        />
      )}

      {showCompose && composeData && (
        <ComposeWithAI
          emails={[]}
          session={session}
          prefillData={composeData}
          onClose={() => {
            setShowCompose(false);
            setComposeData(null);
            composeDataRef.current = null;
          }}
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