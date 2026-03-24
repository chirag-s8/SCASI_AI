"use client";

import { useEffect, useRef, useState } from "react";
import { signOut } from "next-auth/react";
import dynamic from "next/dynamic";
import { useVoiceController } from "@/src/agents/voice/useVoiceController";
import { WakeWordListener } from "@/src/agents/voice/wakeWordListener";

const SessionOverlay = dynamic(() => import("@/components/voice/SessionOverlay"), { ssr: false });
const MicButton = dynamic(() => import("@/components/voice/MicButton"), { ssr: false });

export default function TopNavbar({
    searchQuery,
    setSearchQuery,
    newMailCount,
    newMails,
    showNotifications,
    setShowNotifications,
    openMailAndGenerateAI,
    setNewMailCount,
    setNewMails,
    session,
    sidebarOpen,
    setSidebarOpen,
    refreshInbox,
    setAppView,
    setShowCompose,
}) {
    const [voiceTranscript, setVoiceTranscript] = useState("");
    const [voiceAnswer, setVoiceAnswer] = useState("");
    const voiceSessionIdRef = useRef(null);

    const { state: voiceState, startSession, stopSession, isSupported } = useVoiceController({
        sessionId: voiceSessionIdRef.current,
        onTranscript: (text) => setVoiceTranscript(text),
        onAnswer: (text) => { setVoiceAnswer(text); setVoiceTranscript(""); },
        onStateChange: (s) => { if (s === "idle") { setVoiceTranscript(""); setVoiceAnswer(""); voiceSessionIdRef.current = null; } },
    });
    const isVoiceActive = voiceState !== "idle";

    const wakeListenerRef = useRef(null);
    useEffect(() => {
        const listener = new WakeWordListener({
            onDetected: () => {
                if (!isVoiceActive) startSession();
            },
        });
        listener.start();
        wakeListenerRef.current = listener;
        return () => listener.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Pause wake word detection while a session is active to avoid conflicts
    useEffect(() => {
        const listener = wakeListenerRef.current;
        if (!listener) return;
        if (isVoiceActive) listener.pause();
        else listener.resume();
    }, [isVoiceActive]);

    const handleMicClick = () => {
        if (isVoiceActive) {
            stopSession();
        } else {
            voiceSessionIdRef.current = crypto.randomUUID();
            setVoiceTranscript("");
            setVoiceAnswer("");
            startSession();
        }
    };

    return (
        <>
        <div className="topbar">

            {/* LEFT: Menu + Logo */}
            <button
                className="btn ghost"
                style={{ padding: "4px 5px" }}
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                ☰
            </button>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span
                    style={{
                        fontWeight: 800,
                        fontSize: 14,
                        color: "#18103A",
                    }}
                >
                    Scasi inbox

                </span>
            </div>

            {/* SEARCH */}
            <div className="srch">
                <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search emails, contacts, AI actions…"
                />
            </div>

            <div style={{ flex: 1 }} />

            {/* Scasi Voice */}
            <MicButton
                state={voiceState}
                onClick={handleMicClick}
                isSupported={isSupported.stt}
            />

            {/* Refresh */}
            <button className="btn" onClick={refreshInbox}>
                Refresh
            </button>

            {/* Notifications */}
            <div style={{ position: "relative" }}>
                <button
                    className="btn"
                    onClick={() => setShowNotifications(!showNotifications)}
                    style={{ position: "relative" }}
                >
                    🔔
                    {newMailCount > 0 && (
                        <span
                            style={{
                                position: "absolute",
                                top: -4,
                                right: -4,
                                background: "#7C3AED",
                                color: "#fff",
                                borderRadius: "50%",
                                width: 14,
                                height: 14,
                                fontSize: 8,
                                fontWeight: 800,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                            }}
                        >
                            {newMailCount}
                        </span>
                    )}
                </button>

                {showNotifications && (
                    <div className="notif-dd">
                        <div
                            style={{
                                fontSize: 10,
                                fontWeight: 800,
                                marginBottom: 8,
                                color: "#7C3AED",
                            }}
                        >
                            New Messages
                        </div>

                        {newMails.length === 0 ? (
                            <div style={{ fontSize: 12 }}>All caught up ✨</div>
                        ) : (
                            newMails.slice(0, 5).map((mail) => (
                                <div
                                    key={mail.id}
                                    onClick={() => {
                                        openMailAndGenerateAI(mail.id, mail);
                                        setShowNotifications(false);
                                    }}
                                    style={{
                                        padding: 6,
                                        borderRadius: 6,
                                        cursor: "pointer",
                                        marginBottom: 4,
                                    }}
                                >
                                    <div style={{ fontSize: 12, fontWeight: 600 }}>
                                        {mail.subject}
                                    </div>
                                    <div style={{ fontSize: 11, opacity: 0.7 }}>
                                        {mail.from}
                                    </div>
                                </div>
                            ))
                        )}

                        {newMailCount > 0 && (
                            <button
                                className="btn"
                                style={{ marginTop: 6, width: "100%" }}
                                onClick={() => {
                                    setNewMailCount(0);
                                    setNewMails([]);
                                    localStorage.setItem(
                                        "lastSeenTime",
                                        new Date().toISOString()
                                    );
                                    setShowNotifications(false);
                                }}
                            >
                                Mark all as seen
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Dashboard button */}
            <button className="btn" onClick={() => setAppView("scasi")}>
                Dashboard
            </button>

            {/* Compose */}
            <button
                className="btn"
                style={{ background: "#7C3AED", color: "#fff" }}
                onClick={() => setShowCompose(true)}
            >
                Compose
            </button>

            {/* Avatar */}
            <div
                style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: "#7C3AED",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 12,
                }}
            >
                {session?.user?.name?.[0]?.toUpperCase() || "U"}
            </div>

            <button className="btn red" onClick={() => signOut()}>
                Logout
            </button>
        </div>

        {/* Scasi Session Overlay — renders above all dashboard content */}
        <SessionOverlay
            state={voiceState}
            isVisible={isVoiceActive}
            onDismiss={stopSession}
            transcript={voiceTranscript}
            answer={voiceAnswer}
        />
    </>
    );
}