"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";

/**
 * ComposeWithAI
 *
 * Props:
 *  - emails:      array of email objects from the inbox (used to find contacts)
 *  - onClose:     () => void
 *  - session:     NextAuth session (provides sender name for sign-off)
 *  - prefillData: optional pre-filled data from voice/chat assistant
 *                 { prompt, recipientName, subject, body, to, cc }
 */
export default function ComposeWithAI({ emails = [], onClose, session, prefillData = null }) {
    // Stages: "prompt" | "picking" | "editing" | "sent"
    // If prefillData has a body, skip straight to editing stage
    const [stage, setStage] = useState(prefillData?.body ? "editing" : "prompt");

    const [prompt, setPrompt] = useState(prefillData?.prompt || "");
    const [loadingDraft, setLoadingDraft] = useState(false);
    const [error, setError] = useState("");

    // Live contact suggestions shown while typing in the prompt
    const [suggestions, setSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Contacts matched after generation (multiple hits → picker stage)
    const [matches, setMatches] = useState([]);
    const [recipientName, setRecipientName] = useState("");

    // Draft fields — all editable
    const [to, setTo] = useState(prefillData?.to || "");
    const [cc, setCc] = useState(prefillData?.cc || "");
    const [bcc, setBcc] = useState("");
    const [showCc, setShowCc] = useState(!!(prefillData?.cc));
    const [showBcc, setShowBcc] = useState(false);
    const [subject, setSubject] = useState(prefillData?.subject || "");
    const [body, setBody] = useState(prefillData?.body || "");
    // Attachments: [{ filename, mimeType, data (base64 string) }]
    const [attachments, setAttachments] = useState([]);
    const fileInputRef = useRef(null);

    // Link insertion modal
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState("https://");
    const [linkText, setLinkText] = useState("");
    const bodyRef = useRef(null);

    // To-field live suggestions in editing stage
    const [toSuggestions, setToSuggestions] = useState([]);
    const [showToSuggestions, setShowToSuggestions] = useState(false);

    // CC names that couldn't be auto-resolved — show contact suggestions for them
    const [ccPendingNames, setCcPendingNames] = useState([]);

    const [sending, setSending] = useState(false);

    const promptRef = useRef(null);
    const suggestionsRef = useRef(null);
    const toSuggestionsRef = useRef(null);

    useEffect(() => { promptRef.current?.focus(); }, []);

    // Sender name from session — used in sign-off, never a placeholder
    const senderName = useMemo(() => {
        return session?.user?.name?.trim() ||
            (session?.user?.email ?? "").split("@")[0] ||
            "Me";
    }, [session]);

    // Build a deduplicated contact list from ALL emails (both from + to fields)
    const allContacts = useMemo(() => {
        const seen = new Set();
        const contacts = [];

        const parseField = (field) => {
            if (!field) return null;
            const bracket = field.match(/^(.+?)\s*<([^>]+@[^>]+)>/);
            if (bracket) return { displayName: bracket[1].trim(), email: bracket[2].trim() };
            const plain = field.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
            if (plain) return { displayName: "", email: plain[1].trim() };
            return null;
        };

        for (const mail of emails) {
            for (const field of [mail.from, mail.to]) {
                const parsed = parseField(field);
                if (!parsed) continue;
                const key = parsed.email.toLowerCase();
                // Skip the user's own address
                if (session?.user?.email && key === session.user.email.toLowerCase()) continue;
                if (seen.has(key)) continue;
                seen.add(key);
                contacts.push({
                    displayName: parsed.displayName || parsed.email,
                    email: parsed.email,
                });
            }
        }

        return contacts;
    }, [emails, session]);

    // Search contacts by any query string
    const searchContacts = useCallback((query) => {
        if (!query || query.trim().length < 2) return [];
        const q = query.toLowerCase().trim();
        return allContacts
            .filter(c => c.displayName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
            .slice(0, 6);
    }, [allContacts]);

    // Detect name in prompt and show live suggestions as user types
    const handlePromptChange = useCallback((e) => {
        const val = e.target.value;
        setPrompt(val);
        setError("");

        // Match patterns like "send to Saloni", "email Rahul that", "write to John about"
        const nameMatch = val.match(
            /(?:to|for|email|mail|message|write to|send to)\s+([a-zA-Z][a-zA-Z\s]{1,30}?)(?:\s+that|\s+about|\s+saying|\s+to\s+|\s*$)/i
        );
        if (nameMatch) {
            const name = nameMatch[1].trim();
            const hits = searchContacts(name);
            setSuggestions(hits);
            setShowSuggestions(hits.length > 0);
        } else {
            setSuggestions([]);
            setShowSuggestions(false);
        }
    }, [searchContacts]);

    // Close dropdowns on outside click
    useEffect(() => {
        const handler = (e) => {
            if (
                suggestionsRef.current && !suggestionsRef.current.contains(e.target) &&
                promptRef.current && !promptRef.current.contains(e.target)
            ) setShowSuggestions(false);

            if (toSuggestionsRef.current && !toSuggestionsRef.current.contains(e.target))
                setShowToSuggestions(false);
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Step 1: Generate draft from prompt
    const handleGenerate = useCallback(async () => {
        if (!prompt.trim()) return;
        setError("");
        setLoadingDraft(true);
        setShowSuggestions(false);

        try {
            const res = await fetch("/api/ai/compose", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: prompt.trim(), senderName }),
            });

            const data = await res.json();
            if (!res.ok) {
                setError(data.error || "Failed to generate draft");
                setLoadingDraft(false);
                return;
            }

            const name = data.recipientName || "";
            setRecipientName(name);
            setSubject(data.subject || "");
            setBody(data.body || "");

            // Auto-populate CC from extracted names
            if (data.ccNames && data.ccNames.length > 0) {
                setShowCc(true);
                const resolvedCc = data.ccNames.map(ccName => {
                    const hits = searchContacts(ccName);
                    return hits.length === 1 ? hits[0].email : ccName;
                }).join(", ");
                setCc(resolvedCc);
                // Track names that had 0 or multiple matches — show suggestions for them
                const unresolved = data.ccNames.filter(n => searchContacts(n).length !== 1);
                if (unresolved.length > 0) setCcPendingNames(unresolved);
            }

            const contacts = searchContacts(name);

            if (contacts.length === 0) {
                setTo("");
                setStage("editing");
            } else if (contacts.length === 1) {
                setTo(contacts[0].email);
                setStage("editing");
            } else {
                setMatches(contacts);
                setStage("picking");
            }
        } catch (err) {
            setError("Network error: " + (err.message || "Unknown"));
        } finally {
            setLoadingDraft(false);
        }
    }, [prompt, senderName, searchContacts]);

    // Suggestion chip clicked — fill the To field and close dropdown
    const handleSuggestionClick = useCallback((contact) => {
        setTo(contact.email);
        setShowSuggestions(false);
        setSuggestions([]);
    }, []);

    // Step 2: User picks a contact from the picker stage
    const handlePickContact = useCallback((emailAddr) => {
        setTo(emailAddr);
        setMatches([]);
        setStage("editing");
    }, []);

    // To field live suggestions
    const handleToChange = useCallback((e) => {
        const val = e.target.value;
        setTo(val);
        if (val.trim().length >= 2) {
            const hits = searchContacts(val);
            setToSuggestions(hits);
            setShowToSuggestions(hits.length > 0);
        } else {
            setToSuggestions([]);
            setShowToSuggestions(false);
        }
    }, [searchContacts]);

    // Step 3: Send the email
    const handleSend = useCallback(async () => {
        if (!to.trim() || !subject.trim() || !body.trim()) {
            setError("To, Subject, and Body are all required.");
            return;
        }
        setError("");
        setSending(true);

        try {
            const res = await fetch("/api/gmail/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    to: to.trim(),
                    subject: subject.trim(),
                    body: body.trim(),
                    cc: cc.trim() || undefined,
                    bcc: bcc.trim() || undefined,
                    attachments: attachments.length > 0 ? attachments : undefined,
                }),
            });

            const data = await res.json();
            if (!res.ok || !data.success) {
                setError(data.error || "Failed to send email");
            } else {
                setStage("sent");
            }
        } catch (err) {
            setError("Network error: " + (err.message || "Unknown"));
        } finally {
            setSending(false);
        }
    }, [to, cc, bcc, subject, body, attachments]);

    // File picker → read as base64
    const handleFileChange = useCallback((e) => {
        const files = Array.from(e.target.files || []);
        files.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (ev) => {
                const base64 = ev.target.result.split(",")[1];
                setAttachments((prev) => [
                    ...prev,
                    { filename: file.name, mimeType: file.type || "application/octet-stream", data: base64 },
                ]);
            };
            reader.readAsDataURL(file);
        });
        e.target.value = "";
    }, []);

    const removeAttachment = useCallback((filename) => {
        setAttachments((prev) => prev.filter((a) => a.filename !== filename));
    }, []);

    // Insert link into body at cursor position
    const handleInsertLink = useCallback(() => {
        if (!linkUrl.trim() || linkUrl === "https://") return;
        const label = linkText.trim() || linkUrl.trim();
        const insertion = `${label} (${linkUrl.trim()})`;
        const ta = bodyRef.current;
        if (ta) {
            const start = ta.selectionStart ?? body.length;
            const end = ta.selectionEnd ?? body.length;
            const newBody = body.slice(0, start) + insertion + body.slice(end);
            setBody(newBody);
            setTimeout(() => {
                ta.selectionStart = start + insertion.length;
                ta.selectionEnd = start + insertion.length;
                ta.focus();
            }, 0);
        } else {
            setBody((prev) => prev + (prev.endsWith("\n") ? "" : "\n") + insertion);
        }
        setShowLinkModal(false);
        setLinkUrl("https://");
        setLinkText("");
    }, [linkUrl, linkText, body]);

    const handleKeyDown = useCallback((e) => {
        if (e.key === "Enter" && !e.shiftKey && stage === "prompt" && !loadingDraft) {
            e.preventDefault();
            handleGenerate();
        }
        if (e.key === "Escape") {
            if (showSuggestions) { setShowSuggestions(false); return; }
            if (showToSuggestions) { setShowToSuggestions(false); return; }
            onClose?.();
        }
    }, [stage, loadingDraft, handleGenerate, showSuggestions, showToSuggestions, onClose]);

    const inputStyle = {
        width: "100%", padding: "9px 12px", borderRadius: 8,
        border: "1.5px solid #DDD6FE", fontSize: 13, fontFamily: "inherit",
        outline: "none", background: "#fff", color: "#1e1b4b",
        lineHeight: 1.5, boxSizing: "border-box",
    };
    const labelStyle = {
        fontSize: 11, fontWeight: 700, color: "#6D28D9",
        textTransform: "uppercase", letterSpacing: "0.06em",
        marginBottom: 4, display: "block",
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-label="Compose with AI"
            onKeyDown={handleKeyDown}
            style={{
                position: "fixed", inset: 0, zIndex: 9999,
                display: "flex", alignItems: "center", justifyContent: "center",
                background: "rgba(14,10,30,0.72)", backdropFilter: "blur(6px)", padding: 16,
            }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
            <div style={{
                width: "100%", maxWidth: 560, background: "#fff", borderRadius: 16,
                boxShadow: "0 24px 80px rgba(124,58,237,0.22)", border: "1px solid #DDD6FE",
                overflow: "hidden", display: "flex", flexDirection: "column",
            }}>
                {/* Header */}
                <div style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    padding: "14px 18px 12px",
                    background: "linear-gradient(135deg,#F5F3FF,#EDE9FE)",
                    borderBottom: "1px solid #E9D5FF", flexShrink: 0,
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>✍️</span>
                        <span style={{ fontWeight: 800, fontSize: 15, color: "#18103A" }}>Compose with AI</span>
                        {loadingDraft && <Badge color="#7C3AED">Drafting…</Badge>}
                        {stage === "editing" && <Badge color="#059669">Draft Ready</Badge>}
                        {stage === "picking" && <Badge color="#D97706">Choose Contact</Badge>}
                    </div>
                    <button onClick={onClose} aria-label="Close compose dialog" style={{
                        width: 28, height: 28, borderRadius: 7, border: "1px solid #DDD6FE",
                        background: "#fff", cursor: "pointer", fontSize: 14, color: "#6D28D9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                    }}>✕</button>
                </div>

                {/* Body */}
                <div style={{ padding: "18px 20px 20px", display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* ── STAGE: prompt ── */}
                    {stage === "prompt" && (
                        <>
                            <div style={{ position: "relative" }}>
                                <label style={labelStyle} htmlFor="cai-prompt">What do you want to send?</label>
                                <textarea
                                    id="cai-prompt"
                                    ref={promptRef}
                                    value={prompt}
                                    onChange={handlePromptChange}
                                    placeholder={`e.g. "Send a mail to Saloni that she has to send the report by tomorrow"`}
                                    rows={3}
                                    style={{ ...inputStyle, resize: "vertical" }}
                                    onFocus={e => e.target.style.borderColor = "#7C3AED"}
                                    onBlur={e => e.target.style.borderColor = "#DDD6FE"}
                                />

                                {/* Live contact suggestions dropdown */}
                                {showSuggestions && suggestions.length > 0 && (
                                    <div ref={suggestionsRef} style={{
                                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                                        background: "#fff", border: "1.5px solid #DDD6FE",
                                        borderTop: "none", borderRadius: "0 0 10px 10px",
                                        boxShadow: "0 8px 24px rgba(124,58,237,0.12)", overflow: "hidden",
                                    }}>
                                        <div style={{
                                            padding: "5px 12px 4px", fontSize: 10, fontWeight: 700,
                                            color: "#9CA3AF", textTransform: "uppercase", letterSpacing: "0.06em",
                                            background: "#F9FAFB", borderBottom: "1px solid #F3F0FF",
                                        }}>
                                            Contacts from your inbox
                                        </div>
                                        {suggestions.map((c) => (
                                            <ContactRow
                                                key={c.email}
                                                contact={c}
                                                onMouseDown={(e) => {
                                                    e.preventDefault(); // prevent textarea blur
                                                    handleSuggestionClick(c);
                                                }}
                                            />
                                        ))}
                                    </div>
                                )}

                                <p style={{ fontSize: 11, color: "#9CA3AF", marginTop: 5 }}>
                                    Describe who to send to and what to say — contacts from your inbox appear as you type.
                                </p>
                            </div>

                            {error && <ErrorBox message={error} />}

                            <button
                                onClick={handleGenerate}
                                disabled={!prompt.trim() || loadingDraft}
                                style={{
                                    padding: "10px 20px", borderRadius: 10, border: "none",
                                    background: !prompt.trim() || loadingDraft ? "#E5E7EB" : "linear-gradient(135deg,#7C3AED,#2563EB)",
                                    color: !prompt.trim() || loadingDraft ? "#9CA3AF" : "#fff",
                                    fontWeight: 700, fontSize: 13,
                                    cursor: !prompt.trim() || loadingDraft ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                                    transition: "all 0.15s",
                                }}
                            >
                                {loadingDraft ? <><Spinner />Generating draft…</> : "✨ Generate Draft"}
                            </button>
                        </>
                    )}

                    {/* ── STAGE: picking ── */}
                    {stage === "picking" && (
                        <div>
                            <label style={labelStyle}>
                                Found {matches.length} contacts named &ldquo;{recipientName}&rdquo; — which one?
                            </label>
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
                                {matches.map((c) => (
                                    <button
                                        key={c.email}
                                        onClick={() => handlePickContact(c.email)}
                                        style={{
                                            display: "flex", alignItems: "center", gap: 12,
                                            padding: "10px 14px", borderRadius: 10,
                                            border: "1.5px solid #DDD6FE", background: "#F5F3FF",
                                            cursor: "pointer", textAlign: "left", width: "100%",
                                            transition: "all 0.12s",
                                        }}
                                        onMouseEnter={e => { e.currentTarget.style.borderColor = "#7C3AED"; e.currentTarget.style.background = "#EDE9FE"; }}
                                        onMouseLeave={e => { e.currentTarget.style.borderColor = "#DDD6FE"; e.currentTarget.style.background = "#F5F3FF"; }}
                                    >
                                        <Avatar name={c.displayName || c.email} size={36} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 700, fontSize: 13, color: "#1e1b4b" }}>{c.displayName}</div>
                                            <div style={{ fontSize: 11, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.email}</div>
                                        </div>
                                        <span style={{ fontSize: 16, color: "#7C3AED", flexShrink: 0 }}>→</span>
                                    </button>
                                ))}
                            </div>
                            <button
                                onClick={() => { setTo(""); setStage("editing"); }}
                                style={{
                                    marginTop: 10, fontSize: 12, color: "#6B7280",
                                    background: "none", border: "none", cursor: "pointer",
                                    textDecoration: "underline", padding: 0,
                                }}
                            >
                                None of these — enter email manually
                            </button>
                        </div>
                    )}

                    {/* ── STAGE: editing ── */}
                    {stage === "editing" && (
                        <>
                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                multiple
                                style={{ display: "none" }}
                                onChange={handleFileChange}
                            />

                            {/* To field with live suggestions */}
                            <div style={{ position: "relative" }}>
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                                    <label style={labelStyle} htmlFor="cai-to">To</label>
                                    <div style={{ display: "flex", gap: 6 }}>
                                        {!showCc && <button onClick={() => setShowCc(true)} style={{ fontSize: 11, color: "#7C3AED", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Cc</button>}
                                        {!showBcc && <button onClick={() => setShowBcc(true)} style={{ fontSize: 11, color: "#7C3AED", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>+ Bcc</button>}
                                    </div>
                                </div>
                                <input
                                    id="cai-to"
                                    type="text"
                                    value={to}
                                    onChange={handleToChange}
                                    onFocus={e => {
                                        e.target.style.borderColor = "#7C3AED";
                                        if (to.trim().length >= 2) {
                                            const hits = searchContacts(to);
                                            setToSuggestions(hits);
                                            setShowToSuggestions(hits.length > 0);
                                        }
                                    }}
                                    onBlur={e => { e.target.style.borderColor = "#DDD6FE"; }}
                                    placeholder="recipient@example.com or type a name"
                                    autoComplete="off"
                                    style={inputStyle}
                                />
                                {showToSuggestions && toSuggestions.length > 0 && (
                                    <div ref={toSuggestionsRef} style={{
                                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100,
                                        background: "#fff", border: "1.5px solid #DDD6FE",
                                        borderTop: "none", borderRadius: "0 0 10px 10px",
                                        boxShadow: "0 8px 24px rgba(124,58,237,0.12)", overflow: "hidden",
                                    }}>
                                        {toSuggestions.map((c) => (
                                            <ContactRow key={c.email} contact={c} onMouseDown={(e) => { e.preventDefault(); setTo(c.email); setShowToSuggestions(false); }} />
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Cc */}
                            {showCc && (
                                <div>
                                    <label style={labelStyle} htmlFor="cai-cc">Cc</label>
                                    <input id="cai-cc" type="text" value={cc} onChange={e => setCc(e.target.value)} placeholder="cc@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor = "#7C3AED"} onBlur={e => e.target.style.borderColor = "#DDD6FE"} />
                                    {/* Suggestions for unresolved CC names */}
                                    {ccPendingNames.length > 0 && ccPendingNames.map(name => {
                                        const hits = searchContacts(name);
                                        if (hits.length === 0) return null;
                                        return (
                                            <div key={name} style={{ marginTop: 6 }}>
                                                <div style={{ fontSize: 10, color: "#9CA3AF", marginBottom: 4 }}>
                                                    Multiple matches for &ldquo;{name}&rdquo; — pick one:
                                                </div>
                                                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                                                    {hits.map(c => (
                                                        <button key={c.email}
                                                            onClick={() => {
                                                                setCc(prev => {
                                                                    const parts = prev.split(",").map(s => s.trim()).filter(Boolean);
                                                                    const replaced = parts.map(s => s.toLowerCase() === name.toLowerCase() ? c.email : s);
                                                                    if (!replaced.includes(c.email)) replaced.push(c.email);
                                                                    return replaced.join(", ");
                                                                });
                                                                setCcPendingNames(prev => prev.filter(n => n !== name));
                                                            }}
                                                            style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, border: "1.5px solid #DDD6FE", background: "#F5F3FF", cursor: "pointer", fontSize: 11, fontWeight: 600, color: "#4C1D95" }}
                                                            onMouseEnter={e => e.currentTarget.style.borderColor = "#7C3AED"}
                                                            onMouseLeave={e => e.currentTarget.style.borderColor = "#DDD6FE"}
                                                        >
                                                            <Avatar name={c.displayName} size={18} />
                                                            {c.displayName} <span style={{ color: "#9CA3AF", fontWeight: 400 }}>({c.email})</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Bcc */}
                            {showBcc && (
                                <div>
                                    <label style={labelStyle} htmlFor="cai-bcc">Bcc</label>
                                    <input id="cai-bcc" type="text" value={bcc} onChange={e => setBcc(e.target.value)} placeholder="bcc@example.com" style={inputStyle} onFocus={e => e.target.style.borderColor = "#7C3AED"} onBlur={e => e.target.style.borderColor = "#DDD6FE"} />
                                </div>
                            )}

                            {/* Subject */}
                            <div>
                                <label style={labelStyle} htmlFor="cai-subject">Subject</label>
                                <input id="cai-subject" type="text" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject" style={inputStyle} onFocus={e => e.target.style.borderColor = "#7C3AED"} onBlur={e => e.target.style.borderColor = "#DDD6FE"} />
                            </div>

                            {/* Toolbar — icon only like Gmail */}
                            <div style={{ display: "flex", alignItems: "center", gap: 2, padding: "4px 6px", borderRadius: 8, background: "#F9FAFB", border: "1px solid #E5E7EB" }}>
                                <IconBtn icon="📎" label="Attach file" onClick={() => fileInputRef.current?.click()} />
                                <IconBtn icon="🔗" label="Insert link" onClick={() => setShowLinkModal(true)} />
                            </div>

                            {/* Attachment chips */}
                            {attachments.length > 0 && (
                                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                    {attachments.map((att) => (
                                        <div key={att.filename} style={{ display: "flex", alignItems: "center", gap: 5, padding: "4px 10px", borderRadius: 99, background: "#F5F3FF", border: "1px solid #DDD6FE", fontSize: 11, color: "#4C1D95", fontWeight: 600 }}>
                                            📎 {att.filename.length > 24 ? att.filename.slice(0, 22) + "…" : att.filename}
                                            <button onClick={() => removeAttachment(att.filename)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7C3AED", fontSize: 12, padding: 0, lineHeight: 1 }} aria-label={`Remove ${att.filename}`}>✕</button>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Body */}
                            <div>
                                <label style={labelStyle} htmlFor="cai-body">
                                    Body
                                    <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 500, color: "#9CA3AF", textTransform: "none", letterSpacing: 0 }}>— edit freely before sending</span>
                                </label>
                                <textarea id="cai-body" ref={bodyRef} value={body} onChange={(e) => setBody(e.target.value)} rows={7} style={{ ...inputStyle, resize: "vertical", lineHeight: 1.65 }} onFocus={e => e.target.style.borderColor = "#7C3AED"} onBlur={e => e.target.style.borderColor = "#DDD6FE"} />
                            </div>

                            {error && <ErrorBox message={error} />}

                            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                                <button onClick={() => { setStage("prompt"); setError(""); }} style={{ padding: "9px 16px", borderRadius: 9, border: "1.5px solid #DDD6FE", background: "#fff", color: "#6D28D9", fontWeight: 600, fontSize: 13, cursor: "pointer" }}>← Re-generate</button>
                                <button onClick={handleSend} disabled={sending || !to.trim()} style={{ padding: "9px 22px", borderRadius: 9, border: "none", background: sending || !to.trim() ? "#E5E7EB" : "linear-gradient(135deg,#7C3AED,#2563EB)", color: sending || !to.trim() ? "#9CA3AF" : "#fff", fontWeight: 700, fontSize: 13, cursor: sending || !to.trim() ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}>
                                    {sending ? <><Spinner />Sending…</> : "Send ✉️"}
                                </button>
                            </div>

                            {/* Link insertion modal */}
                            {showLinkModal && (
                                <div style={{ position: "fixed", inset: 0, zIndex: 10000, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(14,10,30,0.5)", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setShowLinkModal(false); }}>
                                    <div style={{ background: "#fff", borderRadius: 12, padding: "20px 22px", width: 340, boxShadow: "0 16px 48px rgba(124,58,237,0.18)", border: "1px solid #DDD6FE", display: "flex", flexDirection: "column", gap: 12 }}>
                                        <div style={{ fontWeight: 800, fontSize: 14, color: "#18103A" }}>🔗 Insert Link</div>
                                        <div>
                                            <label style={labelStyle} htmlFor="cai-link-url">URL</label>
                                            <input id="cai-link-url" type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://example.com" style={inputStyle} onFocus={e => e.target.style.borderColor = "#7C3AED"} onBlur={e => e.target.style.borderColor = "#DDD6FE"} autoFocus />
                                        </div>
                                        <div>
                                            <label style={labelStyle} htmlFor="cai-link-text">Display text (optional)</label>
                                            <input id="cai-link-text" type="text" value={linkText} onChange={e => setLinkText(e.target.value)} placeholder="Click here" style={inputStyle} onFocus={e => e.target.style.borderColor = "#7C3AED"} onBlur={e => e.target.style.borderColor = "#DDD6FE"} onKeyDown={e => { if (e.key === "Enter") handleInsertLink(); }} />
                                        </div>
                                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                                            <button onClick={() => setShowLinkModal(false)} style={{ padding: "7px 14px", borderRadius: 8, border: "1.5px solid #DDD6FE", background: "#fff", color: "#6D28D9", fontWeight: 600, fontSize: 12, cursor: "pointer" }}>Cancel</button>
                                            <button onClick={handleInsertLink} disabled={!linkUrl.trim() || linkUrl === "https://"} style={{ padding: "7px 16px", borderRadius: 8, border: "none", background: !linkUrl.trim() || linkUrl === "https://" ? "#E5E7EB" : "linear-gradient(135deg,#7C3AED,#2563EB)", color: !linkUrl.trim() || linkUrl === "https://" ? "#9CA3AF" : "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Insert</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* ── STAGE: sent ── */}
                    {stage === "sent" && (
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "20px 0" }}>
                            <div style={{
                                width: 52, height: 52, borderRadius: "50%",
                                background: "linear-gradient(135deg,#059669,#10B981)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 24, color: "#fff",
                            }}>✓</div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: "#065F46" }}>Email sent!</div>
                            <div style={{ fontSize: 13, color: "#6B7280", textAlign: "center" }}>
                                Your email to <strong>{to}</strong> was sent successfully.
                            </div>
                            <button
                                onClick={onClose}
                                style={{
                                    marginTop: 4, padding: "9px 24px", borderRadius: 9, border: "none",
                                    background: "linear-gradient(135deg,#7C3AED,#2563EB)",
                                    color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer",
                                }}
                            >Close</button>
                        </div>
                    )}
                </div>
            </div>

            <style>{`
                @keyframes cai-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

// ── Reusable sub-components ──────────────────────────────────────────────────

function IconBtn({ icon, label, onClick }) {
    const [hovered, setHovered] = useState(false);
    return (
        <button
            onClick={onClick}
            title={label}
            aria-label={label}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            style={{
                width: 32, height: 32, borderRadius: 6, border: "none",
                background: hovered ? "#EDE9FE" : "transparent",
                cursor: "pointer", fontSize: 16,
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "background 0.1s",
            }}
        >
            {icon}
        </button>
    );
}



function ContactRow({ contact, onMouseDown }) {
    const [hovered, setHovered] = useState(false);
    return (
        <div
            style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", cursor: "pointer",
                background: hovered ? "#F5F3FF" : "#fff",
                borderBottom: "1px solid #F3F0FF", transition: "background 0.1s",
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onMouseDown={onMouseDown}
        >
            <Avatar name={contact.displayName || contact.email} />
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 12, color: "#1e1b4b" }}>{contact.displayName}</div>
                <div style={{ fontSize: 11, color: "#6B7280", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {contact.email}
                </div>
            </div>
            <span style={{ fontSize: 10, color: "#A78BFA", fontWeight: 600, flexShrink: 0 }}>Select</span>
        </div>
    );
}

function Avatar({ name = "", size = 30 }) {
    return (
        <div style={{
            width: size, height: size, borderRadius: "50%", flexShrink: 0,
            background: "linear-gradient(135deg,#7C3AED,#2563EB)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 800, fontSize: Math.round(size * 0.4),
        }}>
            {(name[0] || "?").toUpperCase()}
        </div>
    );
}

function Badge({ color, children }) {
    return (
        <span style={{
            fontSize: 10, background: color, color: "#fff",
            borderRadius: 99, padding: "1px 8px", fontWeight: 600,
        }}>
            {children}
        </span>
    );
}

function Spinner() {
    return (
        <span style={{
            width: 13, height: 13, border: "2px solid rgba(255,255,255,0.4)",
            borderTopColor: "#fff", borderRadius: "50%",
            animation: "cai-spin 0.7s linear infinite",
            display: "inline-block", flexShrink: 0,
        }} />
    );
}

function ErrorBox({ message }) {
    return (
        <div style={{
            padding: "8px 12px", borderRadius: 8,
            background: "#FEF2F2", border: "1px solid #FECACA",
            fontSize: 12, color: "#DC2626",
        }}>
            ❌ {message}
        </div>
    );
}
