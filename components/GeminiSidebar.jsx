"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";

function parseSSEEvents(buffer) {
    const events = [];
    const parts = buffer.split("\n\n");
    const remaining = parts.pop();

    for (const part of parts) {
        const lines = part.split("\n");
        let data = null;
        for (const line of lines) {
            if (line.startsWith("data: ")) {
                data = line.slice(6);
            }
        }
        if (data) {
            try {
                events.push(JSON.parse(data));
            } catch {
                // skip malformed JSON
            }
        }
    }

    return { events, remaining };
}

function extractSearchQuery(input) {
    const prefixes = [
        /^search\s+(?:my\s+)?emails?\s+(?:for|about)\s+/i,
        /^find\s+(?:my\s+)?emails?\s+(?:for|about|regarding|related\s+to)\s+/i,
        /^look\s+(?:for|up)\s+(?:emails?\s+(?:about|for|regarding)\s+)?/i,
    ];
    for (const re of prefixes) {
        const match = input.match(re);
        if (match) return input.slice(match[0].length).trim();
    }
    return null;
}

function mapChunksToSources(chunks) {
    return chunks
        .filter((c) => c.chunkText)
        .slice(0, 5)
        .map((c) => ({
            text: c.chunkText.slice(0, 140),
            type: c.chunkType || "body",
            score: Math.round(
                (c.rerankedScore ?? c.combinedScore ?? c.vectorScore ?? 0) * 100
            ),
            emailId: c.emailId,
        }));
}

function tryParseRagSources(output) {
    try {
        const parsed = typeof output === "string" ? JSON.parse(output) : output;
        if (parsed?.chunks && Array.isArray(parsed.chunks)) {
            return mapChunksToSources(parsed.chunks);
        }
    } catch {
        // not valid RAG output
    }
    return null;
}

export default function GeminiSidebar({ selectedMail }) {
    const [question, setQuestion] = useState("");
    const [reply, setReply] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState("");
    const [steps, setSteps] = useState([]);
    const [sessionId, setSessionId] = useState(null);
    const [sources, setSources] = useState([]);
    const [showSources, setShowSources] = useState(false);
    const abortRef = useRef(null);
    const replyRef = useRef(null);

    useEffect(() => {
        if (replyRef.current) {
            replyRef.current.scrollTop = replyRef.current.scrollHeight;
        }
    }, [reply]);

    useEffect(() => {
        return () => { abortRef.current?.abort(); };
    }, []);

    const cancelStream = useCallback(() => {
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        setLoading(false);
        setStatus("");
    }, []);

    const searchRag = useCallback(async (query) => {
        setLoading(true);
        setReply("");
        setStatus("🔍 Searching emails...");
        setSteps([{ agentName: "rag.query", status: "running" }]);
        setSources([]);
        setShowSources(false);

        const controller = new AbortController();
        abortRef.current = controller;

        try {
            const start = Date.now();
            const res = await fetch("/api/rag/search", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ query, topK: 10 }),
                signal: controller.signal,
            });

            const durationMs = Date.now() - start;

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setReply(`❌ ${err.error || "Search failed"} (${res.status})`);
                setSteps([{ agentName: "rag.query", status: "failed", durationMs }]);
                setStatus("Error");
                return;
            }

            const data = await res.json();

            setSteps([{ agentName: "rag.query", status: "completed", durationMs }]);

            if (data.chunks?.length > 0) {
                setSources(mapChunksToSources(data.chunks));
                setShowSources(true);
                setReply(
                    data.contextBlock ||
                        `Found ${data.chunks.length} relevant email chunks.`
                );
                setStatus(
                    `✅ ${data.chunks.length} results (${data.totalChunksSearched} searched) in ${(durationMs / 1000).toFixed(1)}s`
                );
            } else {
                setReply(
                    "No matching emails found. Try a different search term, or make sure your emails have been indexed."
                );
                setStatus(`No results (${data.totalChunksSearched} chunks searched)`);
            }
        } catch (err) {
            if (err?.name !== "AbortError") {
                setReply("❌ Search failed — connection error");
                setStatus("Error");
            }
        } finally {
            abortRef.current = null;
            setLoading(false);
        }
    }, []);

    const askChat = useCallback(async () => {
        if (!selectedMail && !question.trim()) return;

        const searchQuery = extractSearchQuery(question);
        if (searchQuery) {
            return searchRag(searchQuery);
        }

        setLoading(true);
        setReply("");
        setStatus("Connecting...");
        setSteps([]);
        setSources([]);
        setShowSources(false);

        const controller = new AbortController();
        abortRef.current = controller;

        const emailContext = selectedMail
            ? {
                  gmailId: selectedMail.id || "",
                  subject: selectedMail.subject || "",
                  from: selectedMail.from || "",
                  snippet: selectedMail.snippet || "",
                  body: selectedMail.body || undefined,
              }
            : undefined;

        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userMessage: question || "Summarize this email clearly",
                    sessionId: sessionId || undefined,
                    emailContext,
                }),
                signal: controller.signal,
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                setReply(`❌ ${err.error || "Request failed"} (${res.status})`);
                setLoading(false);
                setStatus("");
                return;
            }

            if (!res.body) {
                setReply("❌ No response stream");
                setLoading(false);
                setStatus("");
                return;
            }

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const { events, remaining } = parseSSEEvents(buffer);
                buffer = remaining;

                for (const event of events) {
                    switch (event.type) {
                        case "intent":
                            setStatus(`🎯 ${event.workflow.replace(/_/g, " ")}`);
                            break;

                        case "step":
                            setSteps((prev) => {
                                const existing = prev.findIndex(
                                    (s) => s.agentName === event.agentName && s.status === "running"
                                );
                                if (event.status === "running") {
                                    return [...prev, { agentName: event.agentName, status: "running" }];
                                }
                                if (existing >= 0) {
                                    const updated = [...prev];
                                    updated[existing] = {
                                        agentName: event.agentName,
                                        status: event.status,
                                        durationMs: event.durationMs,
                                    };
                                    return updated;
                                }
                                return [
                                    ...prev,
                                    {
                                        agentName: event.agentName,
                                        status: event.status,
                                        durationMs: event.durationMs,
                                    },
                                ];
                            });
                            setStatus(
                                event.status === "running"
                                    ? `⚡ ${event.agentName}...`
                                    : `✅ ${event.agentName}`
                            );

                            // Extract RAG sources from rag.query results
                            if (
                                event.agentName === "rag.query" &&
                                event.status === "completed" &&
                                event.output
                            ) {
                                const ragSources = tryParseRagSources(event.output);
                                if (ragSources && ragSources.length > 0) {
                                    setSources(ragSources);
                                    setShowSources(true);
                                }
                            }
                            break;

                        case "token":
                            accumulated += event.text;
                            setReply(accumulated);
                            setStatus("Streaming...");
                            break;

                        case "done":
                            if (event.sessionId) setSessionId(event.sessionId);
                            setStatus(
                                `Done in ${(event.totalDurationMs / 1000).toFixed(1)}s`
                            );
                            break;

                        case "error":
                            setReply(
                                (accumulated || "") +
                                    `\n\n❌ Error: ${event.message}`
                            );
                            setStatus("Error");
                            break;
                    }
                }
            }
        } catch (err) {
            if (err?.name !== "AbortError") {
                setReply((prev) => prev + "\n\n❌ Connection error");
                setStatus("Error");
            }
        } finally {
            abortRef.current = null;
            setLoading(false);
        }
    }, [selectedMail, question, sessionId, searchRag]);

    const handleKeyDown = useCallback(
        (e) => {
            if (e.key === "Enter" && !e.shiftKey && !loading) {
                e.preventDefault();
                askChat();
            }
        },
        [askChat, loading]
    );

    return (
        <div
            style={{
                width: "340px",
                borderLeft: "1px solid #E5E7EB",
                background: "white",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
                height: "100%",
            }}
        >
            {/* Header */}
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 14,
                }}
            >
                <h2 style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>
                    💎 Scasi Assistant
                </h2>
                {sessionId && (
                    <button
                        onClick={() => {
                            setSessionId(null);
                            setReply("");
                            setSteps([]);
                            setStatus("");
                            setSources([]);
                            setShowSources(false);
                        }}
                        style={{
                            fontSize: 11,
                            color: "#6B7280",
                            cursor: "pointer",
                            border: "1px solid #E5E7EB",
                            borderRadius: 6,
                            padding: "2px 8px",
                            background: "#F9FAFB",
                        }}
                    >
                        New Chat
                    </button>
                )}
            </div>

            {/* Suggestions */}
            <div style={{ fontSize: 13, color: "#555", marginBottom: 18 }}>
                <p style={{ marginBottom: 8 }}>Try asking:</p>
                <button
                    onClick={() => setQuestion("Summarize this email")}
                    style={suggestBtn}
                >
                    ✨ Summarize
                </button>
                <button
                    onClick={() => setQuestion("What action should I take?")}
                    style={suggestBtn}
                >
                    ✅ Action Needed
                </button>
                <button
                    onClick={() => setQuestion("Write a reply for this email")}
                    style={suggestBtn}
                >
                    ✍ Draft Reply
                </button>
                <button
                    onClick={() => setQuestion("Search my emails for ")}
                    style={suggestBtn}
                >
                    🔍 Search Emails
                </button>
                <button
                    onClick={() => setQuestion("Sort my inbox by priority")}
                    style={suggestBtn}
                >
                    📊 Sort Inbox
                </button>
            </div>

            {/* Input Box */}
            <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about this email or search your inbox..."
                rows={3}
                style={{
                    width: "100%",
                    padding: 12,
                    borderRadius: 12,
                    border: "1px solid #ddd",
                    resize: "none",
                    fontSize: 14,
                }}
            />

            {/* Action Button */}
            <button
                onClick={loading ? cancelStream : askChat}
                style={{
                    marginTop: 12,
                    padding: 12,
                    borderRadius: 12,
                    border: "none",
                    background: loading
                        ? "linear-gradient(135deg,#EF4444,#DC2626)"
                        : "linear-gradient(135deg,#2563EB,#0EA5E9)",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                    transition: "background 0.2s",
                }}
            >
                {loading ? "■ Stop" : "Ask Scasi →"}
            </button>

            {/* Status indicator */}
            {status && (
                <div
                    style={{
                        marginTop: 10,
                        fontSize: 12,
                        color: "#6B7280",
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                    }}
                >
                    {loading && (
                        <span
                            style={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#2563EB",
                                display: "inline-block",
                                animation: "pulse 1.5s ease-in-out infinite",
                            }}
                        />
                    )}
                    {status}
                </div>
            )}

            {/* Agent steps */}
            {steps.length > 0 && (
                <div
                    style={{
                        marginTop: 8,
                        display: "flex",
                        flexWrap: "wrap",
                        gap: 4,
                    }}
                >
                    {steps.map((step, i) => (
                        <span
                            key={`${step.agentName}-${i}`}
                            style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                borderRadius: 4,
                                background:
                                    step.status === "running"
                                        ? "#EFF6FF"
                                        : step.status === "completed"
                                          ? "#F0FDF4"
                                          : "#FEF2F2",
                                color:
                                    step.status === "running"
                                        ? "#2563EB"
                                        : step.status === "completed"
                                          ? "#16A34A"
                                          : "#DC2626",
                                border: `1px solid ${
                                    step.status === "running"
                                        ? "#BFDBFE"
                                        : step.status === "completed"
                                          ? "#BBF7D0"
                                          : "#FECACA"
                                }`,
                                fontWeight: 600,
                            }}
                        >
                            {step.agentName === "rag.query"
                                ? "🔍"
                                : step.status === "running"
                                  ? "⏳"
                                  : step.status === "completed"
                                    ? "✓"
                                    : "✗"}{" "}
                            {step.agentName}
                            {step.durationMs != null && ` ${step.durationMs}ms`}
                        </span>
                    ))}
                </div>
            )}

            {/* RAG Sources */}
            {sources.length > 0 && (
                <div style={{ marginTop: 8 }}>
                    <button
                        onClick={() => setShowSources((prev) => !prev)}
                        style={{
                            width: "100%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "6px 10px",
                            borderRadius: 8,
                            border: "1px solid #DDD6FE",
                            background: "#F5F3FF",
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 600,
                            color: "#6D28D9",
                        }}
                    >
                        <span>
                            📚 {sources.length} email{sources.length !== 1 ? "s" : ""} found
                        </span>
                        <span style={{ fontSize: 10 }}>{showSources ? "▲" : "▼"}</span>
                    </button>
                    {showSources && (
                        <div
                            style={{
                                marginTop: 4,
                                maxHeight: 160,
                                overflowY: "auto",
                                display: "flex",
                                flexDirection: "column",
                                gap: 4,
                            }}
                        >
                            {sources.map((src, i) => (
                                <div
                                    key={`src-${i}`}
                                    style={{
                                        padding: "6px 8px",
                                        borderRadius: 6,
                                        border: "1px solid #E5E7EB",
                                        background: "#FAFAFA",
                                        fontSize: 11,
                                        lineHeight: 1.4,
                                    }}
                                >
                                    <div
                                        style={{
                                            display: "flex",
                                            justifyContent: "space-between",
                                            alignItems: "center",
                                            marginBottom: 2,
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontWeight: 700,
                                                color: "#374151",
                                                textTransform: "capitalize",
                                            }}
                                        >
                                            {src.type === "subject"
                                                ? "📋"
                                                : src.type === "header"
                                                  ? "📝"
                                                  : "📧"}{" "}
                                            {src.type}
                                        </span>
                                        <span
                                            style={{
                                                fontSize: 10,
                                                color:
                                                    src.score >= 70
                                                        ? "#16A34A"
                                                        : src.score >= 40
                                                          ? "#CA8A04"
                                                          : "#9CA3AF",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {src.score}% match
                                        </span>
                                    </div>
                                    <div
                                        style={{
                                            color: "#6B7280",
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            display: "-webkit-box",
                                            WebkitLineClamp: 2,
                                            WebkitBoxOrient: "vertical",
                                        }}
                                    >
                                        {src.text}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Reply Output */}
            <div
                ref={replyRef}
                style={{
                    marginTop: 12,
                    flex: 1,
                    background: "#F9FAFB",
                    padding: 14,
                    borderRadius: 14,
                    border: "1px solid #E5E7EB",
                    fontSize: 14,
                    whiteSpace: "pre-wrap",
                    overflowY: "auto",
                    lineHeight: 1.6,
                }}
            >
                {reply || "Scasi will answer here..."}
                {loading && reply && (
                    <span
                        style={{
                            display: "inline-block",
                            width: 2,
                            height: 16,
                            background: "#2563EB",
                            marginLeft: 1,
                            animation: "blink 1s step-end infinite",
                            verticalAlign: "text-bottom",
                        }}
                    />
                )}
            </div>

            <style>{`
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.3; }
                }
                @keyframes blink {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0; }
                }
            `}</style>
        </div>
    );
}

const suggestBtn = {
    display: "block",
    width: "100%",
    textAlign: "left",
    padding: "8px 10px",
    marginBottom: 6,
    borderRadius: 10,
    border: "1px solid #E5E7EB",
    background: "#F3F4F6",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
};
