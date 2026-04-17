"use client";
/**
 * @file components/voice/VoiceContext.jsx
 * Global voice context — single useVoiceController instance shared across all pages.
 * Handles compose-via-voice flow: draft → ask user → read aloud or open compose modal.
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

// Phrases meaning "read it aloud"
const READ_ALOUD = [
  "read", "read aloud", "read it", "read it out", "read it aloud", "read out",
  "yes read", "yes read it", "yes please read", "read the email", "read it to me",
  "yes", "yeah", "yep", "sure", "go ahead", "please read", "ok read", "okay read",
];

// Phrases meaning "show compose / view draft"
const VIEW_COMPOSE = [
  "view", "show", "compose", "open", "check", "see", "look",
  "show compose", "open compose", "view compose", "check compose",
  "show draft", "view draft", "open draft", "see draft",
  "no", "nope", "not now", "later", "show me", "let me see",
  "i will check", "ill check", "i want to see", "show it",
];

function matchesIntent(text, phrases) {
  const lower = text.toLowerCase().trim().replace(/[.,!?;:]+$/, "");
  return phrases.some((p) => lower === p || lower.includes(p));
}

export function VoiceProvider({ children }) {
  const { data: session, status } = useSession();
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceMessages, setVoiceMessages] = useState([]);

  // Pending draft state — set when AI composes an email
  const [pendingDraft, setPendingDraft] = useState(null);
  const pendingDraftRef = useRef(null);
  useEffect(() => { pendingDraftRef.current = pendingDraft; }, [pendingDraft]);

  // Compose modal state
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState(null);

  const addVoiceMessage = useCallback((role, text) => {
    setVoiceMessages((prev) => [...prev, { role, text }]);
  }, []);

  const handleCompose = useCallback((data) => {
    setPendingDraft(data);
    pendingDraftRef.current = data;
  }, []);

  const { state: voiceState, startSession, stopSession, speakText, isSupported } =
    useVoiceController({
      onTranscript: (text) => setVoiceTranscript(text),
      onAnswer: (answer, userText) => {
        setVoiceTranscript("");

        // If pending draft, check if user is responding to "read aloud or view compose?"
        const draft = pendingDraftRef.current;
        if (draft) {
          if (matchesIntent(userText, READ_ALOUD)) {
            addVoiceMessage("user", userText);
            const readMsg = `Here is the email I drafted. To: ${draft.recipientName || draft.to || "the recipient"}. Subject: ${draft.subject}. Body: ${draft.body}`;
            addVoiceMessage("assistant", readMsg);
            setPendingDraft(null);
            pendingDraftRef.current = null;
            return;
          }
          if (matchesIntent(userText, VIEW_COMPOSE)) {
            addVoiceMessage("user", userText);
            addVoiceMessage("assistant", "Opening the compose window for you now.");
            setComposeData(draft);
            setShowCompose(true);
            setPendingDraft(null);
            pendingDraftRef.current = null;
            return;
          }
        }

        addVoiceMessage("user", userText);
        addVoiceMessage("assistant", answer);
      },
      onStateChange: (s) => {
        if (s === "idle") {
          setVoiceTranscript("");
          setVoiceMessages([]);
          setPendingDraft(null);
          pendingDraftRef.current = null;
        }
      },
      onCompose: handleCompose,
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

  // Build display messages — append draft prompt when pending
  const displayMessages = pendingDraft
    ? [
        ...voiceMessages,
        {
          role: "assistant",
          text: `I have drafted an email to ${pendingDraft.recipientName || pendingDraft.to || "the recipient"} with subject "${pendingDraft.subject}". Would you like me to read it aloud, or would you like to check it in the compose section?`,
        },
      ]
    : voiceMessages;

  return (
    <VoiceContext.Provider value={{ voiceState, startSession, stopSession, isSupported, isVoiceActive }}>
      {children}

      {/* Global floating mic button */}
      {status === "authenticated" && MicButton && !isVoiceActive && (
        <MicButton
          state={voiceState}
          onClick={startSession}
          isSupported={isSupported.stt}
          floating
        />
      )}

      {/* Global session overlay */}
      {status === "authenticated" && SessionOverlay && (
        <SessionOverlay
          state={voiceState}
          isVisible={isVoiceActive}
          onDismiss={stopSession}
          transcript={voiceTranscript}
          messages={displayMessages}
        />
      )}

      {/* Compose modal — opened when user says "show compose" after draft */}
      {showCompose && (
        <ComposeWithAI
          emails={[]}
          session={session}
          prefillData={composeData}
          onClose={() => {
            setShowCompose(false);
            setComposeData(null);
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