"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import { Check } from "lucide-react";

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

const HANDLE_FOR_ME_STEPS = [
  { key: "nlp.classify",           label: "Classify" },
  { key: "nlp.summarize",          label: "Summarize" },
  { key: "nlp.extractTasks",       label: "Extract Tasks" },
  { key: "nlp.draftReply",         label: "Draft Reply" },
  { key: "orchestrator.followUp",  label: "Follow-up" },
  { key: "done",                   label: "Ready" },
];

function GeminiSidebar({ selectedMail, onSelectEmail, onCompose }) {
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
                  snippet: (selectedMail.snippet || "").slice(0, 500),
                  body: selectedMail.body ? selectedMail.body.slice(0, 8000) : undefined,
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

                        case "compose":
                            // Trigger compose modal with pre-filled data
                            if (onCompose) {
                                onCompose({
                                    prompt: event.prompt || '',
                                    recipientName: event.recipientName || '',
                                    subject: event.subject || '',
                                    body: event.body || '',
                                    to: event.to || '',
                                    cc: event.cc || '',
                                });
                            }
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
                width: "min(480px, 92vw)",
                maxHeight: "85vh",
                borderRadius: 16,
                background: "#fff",
                boxShadow: "0 20px 60px rgba(124,58,237,0.18)",
                border: "1px solid #DDD6FE",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            {/* ── Header ── */}
            <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 18px 12px",
                borderBottom: "1px solid #F3F0FF",
                background: "linear-gradient(135deg,#F5F3FF,#EDE9FE)",
                flexShrink: 0,
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 18 }}>💎</span>
                    <span style={{ fontWeight: 800, fontSize: 16, color: "#18103A" }}>Scasi Assistant</span>
                    {sessionId && (
                        <span style={{ fontSize: 10, background: "#7C3AED", color: "#fff", borderRadius: 99, padding: "1px 7px", fontWeight: 600 }}>
                            Active
                        </span>
                    )}
                </div>
                {sessionId && (
                    <button
                        onClick={() => { setSessionId(null); setReply(""); setSteps([]); setStatus(""); setSources([]); setShowSources(false); }}
                        style={{ fontSize: 11, color: "#7C3AED", cursor: "pointer", border: "1px solid #DDD6FE", borderRadius: 6, padding: "3px 9px", background: "#fff", fontWeight: 600 }}
                    >
                        New Chat
                    </button>
                )}
            </div>

            {/* ── Suggestion chips (horizontal scroll, no wrap) ── */}
            <div style={{
                display: "flex", gap: 6, padding: "10px 16px",
                overflowX: "auto", flexShrink: 0,
                borderBottom: "1px solid #F3F0FF",
                scrollbarWidth: "none",
            }}>
                {[
                    { icon: "✨", label: "Summarize", q: "Summarize this email" },
                    { icon: "✅", label: "Action?", q: "What action should I take?" },
                    { icon: "✍️", label: "Draft Reply", q: "Write a reply for this email" },
                    { icon: "🔍", label: "Search", q: "Search my emails for " },
                    { icon: "📊", label: "Priority", q: "Sort my inbox by priority" },
                ].map(({ icon, label, q }) => (
                    <button key={label} onClick={() => setQuestion(q)} style={{
                        flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
                        padding: "5px 11px", borderRadius: 99,
                        border: "1px solid #DDD6FE", background: "#F5F3FF",
                        cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6D28D9",
                        whiteSpace: "nowrap",
                    }}>
                        {icon} {label}
                    </button>
                ))}
            </div>

            {/* ── Scrollable body ── */}
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minHeight: 0 }}>

                {/* Status + Steps */}
                {(status || steps.length > 0) && (
                    <div style={{ padding: "8px 16px 0", flexShrink: 0 }}>
                        {status && (
                            <div style={{ fontSize: 11, color: "#6B7280", display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
                                {loading && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#7C3AED", display: "inline-block", animation: "pulse 1.5s ease-in-out infinite" }} />}
                                {status}
                            </div>
                        )}
                        {steps.length > 0 && (() => {
                            const isHandleForMe = status.includes("handle for me") ||
                                steps.some(s => ["nlp.classify","nlp.summarize","nlp.extractTasks","nlp.draftReply"].includes(s.agentName));

                            if (isHandleForMe) {
                                const completedKeys = new Set(steps.filter(s => s.status === "completed").map(s => s.agentName));
                                const runningKey = steps.find(s => s.status === "running")?.agentName;
                                const allDone = !loading && HANDLE_FOR_ME_STEPS.slice(0, -1).every(s => completedKeys.has(s.key));
                                return (
                                    <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                                        {HANDLE_FOR_ME_STEPS.map((step, i) => {
                                            const isDone = step.key === "done" ? allDone : completedKeys.has(step.key);
                                            const isRunning = step.key === runningKey;
                                            return (
                                                <div key={step.key} style={{
                                                    display: "flex", alignItems: "center", gap: 4,
                                                    padding: "3px 8px", borderRadius: 99, fontSize: 10, fontWeight: 600,
                                                    background: isDone ? "#F0FDF4" : isRunning ? "#EFF6FF" : "#F9FAFB",
                                                    border: `1px solid ${isDone ? "#BBF7D0" : isRunning ? "#BFDBFE" : "#E5E7EB"}`,
                                                    color: isDone ? "#16A34A" : isRunning ? "#2563EB" : "#9CA3AF",
                                                }}>
                                                    <span style={{
                                                        width: 12, height: 12, borderRadius: "50%", flexShrink: 0,
                                                        background: isDone ? "#16A34A" : isRunning ? "#2563EB" : "#E5E7EB",
                                                        display: "flex", alignItems: "center", justifyContent: "center",
                                                    }}>
                                                        {isDone ? <Check size={7} color="#fff" strokeWidth={3} />
                                                            : isRunning ? <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#fff", animation: "pulse 1.5s ease-in-out infinite" }} />
                                                            : <span style={{ fontSize: 7, color: "#9CA3AF", fontWeight: 700 }}>{i + 1}</span>}
                                                    </span>
                                                    {step.label}
                                                </div>
                                            );
                                        })}
                                    </div>
                                );
                            }

                            return (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 6 }}>
                                    {steps.map((step, i) => (
                                        <span key={`${step.agentName}-${i}`} style={{
                                            fontSize: 10, padding: "2px 6px", borderRadius: 4, fontWeight: 600,
                                            background: step.status === "running" ? "#EFF6FF" : step.status === "completed" ? "#F0FDF4" : "#FEF2F2",
                                            color: step.status === "running" ? "#2563EB" : step.status === "completed" ? "#16A34A" : "#DC2626",
                                            border: `1px solid ${step.status === "running" ? "#BFDBFE" : step.status === "completed" ? "#BBF7D0" : "#FECACA"}`,
                                        }}>
                                            {step.status === "running" ? "⏳" : step.status === "completed" ? "✓" : "✗"} {step.agentName}
                                            {step.durationMs != null && ` ${step.durationMs}ms`}
                                        </span>
                                    ))}
                                </div>
                            );
                        })()}
                    </div>
                )}

                {/* RAG Sources */}
                {sources.length > 0 && (
                    <div style={{ padding: "0 16px 8px", flexShrink: 0 }}>
                        <button onClick={() => setShowSources(prev => !prev)} style={{
                            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "6px 10px", borderRadius: 8, border: "1px solid #DDD6FE",
                            background: "#F5F3FF", cursor: "pointer", fontSize: 12, fontWeight: 600, color: "#6D28D9",
                        }}>
                            <span>📚 {sources.length} email{sources.length !== 1 ? "s" : ""} found</span>
                            <span style={{ fontSize: 10 }}>{showSources ? "▲" : "▼"}</span>
                        </button>
                        {showSources && (
                            <div style={{ marginTop: 4, maxHeight: 140, overflowY: "auto", display: "flex", flexDirection: "column", gap: 4 }}>
                                {sources.map((src, i) => (
                                    <div key={`src-${i}`} onClick={() => src.emailId && onSelectEmail?.(src.emailId)}
                                        style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #E5E7EB", background: "#FAFAFA", fontSize: 11, lineHeight: 1.4, cursor: src.emailId ? "pointer" : "default" }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                                            <span style={{ fontWeight: 700, color: "#374151", textTransform: "capitalize" }}>
                                                {src.type === "subject" ? "📋" : src.type === "header" ? "📝" : "📧"} {src.type}
                                            </span>
                                            <span style={{ fontSize: 10, fontWeight: 600, color: src.score >= 70 ? "#16A34A" : src.score >= 40 ? "#CA8A04" : "#9CA3AF" }}>
                                                {src.score}% match
                                            </span>
                                        </div>
                                        <div style={{ color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                            {src.text}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Reply output */}
                <div ref={replyRef} style={{
                    flex: 1, margin: "8px 16px 16px", padding: "12px 14px",
                    background: "#F9FAFB", borderRadius: 12, border: "1px solid #E5E7EB",
                    fontSize: 13, lineHeight: 1.65, overflowY: "auto", minHeight: 100,
                }}>
                    {reply ? (
                        <>
                            <ReactMarkdown components={{
                                p: ({ children }) => <p style={{ marginBottom: 8 }}>{children}</p>,
                                ul: ({ children }) => <ul style={{ paddingLeft: 18, marginBottom: 8 }}>{children}</ul>,
                                ol: ({ children }) => <ol style={{ paddingLeft: 18, marginBottom: 8 }}>{children}</ol>,
                                li: ({ children }) => <li style={{ marginBottom: 3 }}>{children}</li>,
                                strong: ({ children }) => <strong style={{ fontWeight: 700 }}>{children}</strong>,
                                h1: ({ children }) => <h1 style={{ fontSize: 15, fontWeight: 800, marginBottom: 6 }}>{children}</h1>,
                                h2: ({ children }) => <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 5 }}>{children}</h2>,
                                h3: ({ children }) => <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>{children}</h3>,
                                code: ({ children }) => <code style={{ background: "#E5E7EB", borderRadius: 3, padding: "1px 4px", fontSize: 11 }}>{children}</code>,
                            }}>
                                {reply}
                            </ReactMarkdown>
                            {loading && <span style={{ display: "inline-block", width: 2, height: 14, background: "#7C3AED", marginLeft: 1, animation: "blink 1s step-end infinite", verticalAlign: "text-bottom" }} />}
                        </>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 8, color: "#C4B5FD", paddingTop: 20 }}>
                            <span style={{ fontSize: 28 }}>💬</span>
                            <span style={{ fontSize: 12 }}>Ask anything about your emails</span>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Input footer (always visible) ── */}
            <div style={{ padding: "10px 16px 14px", borderTop: "1px solid #F3F0FF", background: "#FAFAFA", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
                    <textarea
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask about this email or search your inbox…"
                        rows={2}
                        style={{
                            flex: 1, padding: "9px 12px", borderRadius: 10,
                            border: "1.5px solid #DDD6FE", resize: "none",
                            fontSize: 13, fontFamily: "inherit", outline: "none",
                            background: "#fff", lineHeight: 1.5,
                        }}
                        onFocus={e => e.target.style.borderColor = "#7C3AED"}
                        onBlur={e => e.target.style.borderColor = "#DDD6FE"}
                    />
                    <button
                        onClick={loading ? cancelStream : askChat}
                        style={{
                            padding: "9px 16px", borderRadius: 10, border: "none",
                            background: loading ? "#EF4444" : "linear-gradient(135deg,#7C3AED,#2563EB)",
                            color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 16,
                            flexShrink: 0, alignSelf: "stretch",
                        }}
                    >
                        {loading ? "■" : "→"}
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
                @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
            `}</style>
        </div>
    );
}

export default GeminiSidebar;
