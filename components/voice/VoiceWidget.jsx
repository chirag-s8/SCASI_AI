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
import ComposeWithAI from "@/components/compose/ComposeWithAI";

const SessionOverlay = dynamic(() => import("./SessionOverlay"), { ssr: false });
const MicButton = dynamic(() => import("./MicButton"), { ssr: false });

// Phrases that mean "read it aloud"
const READ_ALOUD_PHRASES = [
  'read', 'read aloud', 'read it', 'read it out', 'read it aloud',
  'read out', 'yes read', 'yes read it', 'yes please read',
  'read the email', 'read it to me', 'yes', 'yeah', 'sure', 'go ahead',
  'please read', 'read aloud please', 'ok read', 'okay read',
];

// Phrases that mean "show compose / view draft"
const VIEW_COMPOSE_PHRASES = [
  'view', 'show', 'compose', 'open', 'check', 'see', 'look',
  'show compose', 'open compose', 'view compose', 'check compose',
  'show draft', 'view draft', 'open draft', 'see draft',
  'no', 'nope', 'not now', 'later', 'show me', 'let me see',
  'i will check', "i'll check", 'i want to see', 'show it',
];

function matchesIntent(text, phrases) {
  const lower = text.toLowerCase().trim().replace(/[.,!?;:]+$/, '');
  return phrases.some(p => lower === p || lower.includes(p));
}

export default function VoiceWidget({ emails = [], session: propSession }) {
  const { data: sessionData, status } = useSession();
  const session = propSession || sessionData;

  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [voiceMessages, setVoiceMessages] = useState([]);

  // Pending draft — set when AI composes an email, cleared after user decides
  const [pendingDraft, setPendingDraft] = useState(null);
  // Show compose modal
  const [showCompose, setShowCompose] = useState(false);
  const [composeData, setComposeData] = useState(null);

  // Ref so processTranscript can check pending draft without stale closure
  const pendingDraftRef = useRef(null);
  useEffect(() => { pendingDraftRef.current = pendingDraft; }, [pendingDraft]);

  const addVoiceMessage = useCallback((role, text) => {
    setVoiceMessages(prev => [...prev, { role, text }]);
  }, []);

  const handleCompose = useCallback((data) => {
    // Store draft and ask user what they want to do
    setPendingDraft(data);
    pendingDraftRef.current = data;
  }, []);

  const { state: voiceState, startSession, stopSession, isSupported, speakText } =
    useVoiceController({
      onTranscript: (text) => setVoiceTranscript(text),
      onAnswer: (answer, userText) => {
        setVoiceTranscript("");

        // If we have a pending draft, check if user is responding to "read aloud or view compose?"
        const draft = pendingDraftRef.current;
        if (draft) {
          if (matchesIntent(userText, READ_ALOUD_PHRASES)) {
            // User wants it read aloud — add to messages and clear pending
            addVoiceMessage("user", userText);
            const readMsg = `Here is the email I drafted. To: ${draft.recipientName || draft.to || 'the recipient'}. Subject: ${draft.subject}. Body: ${draft.body}`;
            addVoiceMessage("assistant", readMsg);
            setPendingDraft(null);
            pendingDraftRef.current = null;
            return;
          }
          if (matchesIntent(userText, VIEW_COMPOSE_PHRASES)) {
            // User wants to see compose — open modal and clear pending
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

  // Start wake-word listener once user is authenticated
  useEffect(() => {
    if (status !== "authenticated") return;
    const listener = new WakeWordListener({ onDetected: () => startSessionRef.current(true) });
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

  // Build messages to show in overlay — add draft prompt if pending
  const displayMessages = pendingDraft
    ? [
        ...voiceMessages,
        {
          role: "assistant",
          text: `I've drafted an email to ${pendingDraft.recipientName || pendingDraft.to || 'the recipient'} with subject "${pendingDraft.subject}". Would you like me to read it aloud, or would you like to check it in the compose section?`,
        },
      ]
    : voiceMessages;

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
          messages={displayMessages}
        />
      )}

      {/* Compose modal — opened when user says "show compose" or voice triggers it */}
      {showCompose && (
        <ComposeWithAI
          emails={emails}
          session={session}
          prefillData={composeData}
          onClose={() => {
            setShowCompose(false);
            setComposeData(null);
          }}
        />
      )}
    </>
  );
}
