/**
 * @file lib/hooks/useReplyFlow.ts
 * Custom hook encapsulating smart reply generation and send flow.
 * Reads/writes directly from the Zustand store — no duplicate local state.
 * Uses sendError state instead of alert() for error feedback.
 */
"use client";

import { useRef, useCallback } from "react";
import { useInboxStore } from "@/lib/inboxStore";
import { extractEmail, cleanEmailBody } from "@/lib/emailHelpers";
import type { Email } from "@/lib/emailAnalysis";

export function useReplyFlow() {
  const replySeqRef = useRef(0);
  const summarySeqRef = useRef(0);
  const explainSeqRef = useRef(0);
  const sendSeqRef = useRef(0);
  const abortReplyRef = useRef<AbortController | null>(null);
  const abortSummaryRef = useRef<AbortController | null>(null);
  const abortExplainRef = useRef<AbortController | null>(null);

  const generateReply = useCallback(async (selectedMail: Email | null) => {
    if (!selectedMail) return;
    const seq = ++replySeqRef.current;
    const mailId = selectedMail.id; // capture for mail-switch guard
    if (abortReplyRef.current) abortReplyRef.current.abort();
    const controller = new AbortController();
    abortReplyRef.current = controller;

    const store = useInboxStore.getState();
    store.setLoadingReply(true);
    store.setAiReply("");
    store.setEditableReply("");
    store.setSendError(null);

    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedMail.subject,
          snippet: selectedMail.snippet || selectedMail.body || "",
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Reply API error: ${res.status}`);
      const data = await res.json();
      if (seq !== replySeqRef.current) return; // stale
      if (useInboxStore.getState().selectedMail?.id !== undefined && useInboxStore.getState().selectedMail?.id !== mailId) return; // mail switched
      if (data.error) {
        const errMsg = typeof data.error === "string" ? data.error : "Failed to generate reply";
        useInboxStore.getState().setSendError(errMsg);
        useInboxStore.getState().setAiReply("");
        useInboxStore.getState().setEditableReply("");
      } else {
        useInboxStore.getState().setAiReply(data.reply);
        useInboxStore.getState().setEditableReply(data.reply);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (seq === replySeqRef.current) useInboxStore.getState().setLoadingReply(false);
        return;
      }
      if (seq !== replySeqRef.current) return; // stale
      if (useInboxStore.getState().selectedMail?.id !== undefined && useInboxStore.getState().selectedMail?.id !== mailId) return; // mail switched
      const msg = err instanceof Error ? err.message : "Network error";
      useInboxStore.getState().setSendError("Failed to generate reply: " + msg);
      useInboxStore.getState().setAiReply("");
      useInboxStore.getState().setEditableReply("");
    }
    if (seq === replySeqRef.current) useInboxStore.getState().setLoadingReply(false);
  }, []);

  const sendDraftReply = useCallback(async (selectedMail: Email | null, draftBody: string) => {
    if (!selectedMail || !draftBody) return false;

    // Prevent duplicate sends — block while a send is already in progress
    if (useInboxStore.getState().sendingReply) return false;

    const seq = ++sendSeqRef.current;
    const recipient = extractEmail(selectedMail.from);
    if (!recipient) {
      useInboxStore.getState().setSendError("Cannot reply: No valid recipient email found");
      return false;
    }

    const store = useInboxStore.getState();
    store.setSendingReply(true);
    store.setSendError(null);

    try {
      const res = await fetch("/api/gmail/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject: selectedMail.subject,
          body: draftBody,
          threadId: selectedMail.threadId,
          originalMessageId: selectedMail.messageId,
        }),
      });
      if (seq !== sendSeqRef.current) return false; // stale — another send superseded this one
      if (!res.ok) {
        useInboxStore.getState().setSendError(`Reply failed: ${res.status}`);
        useInboxStore.getState().setSendingReply(false);
        return false;
      }
      const data = await res.json();
      if (seq !== sendSeqRef.current) return false; // stale
      if (data.success) {
        useInboxStore.getState().setReplySent(true);
        useInboxStore.getState().setSendingReply(false);
        return true;
      }
      useInboxStore.getState().setSendError(data.error || "Failed to send reply");
    } catch (err: unknown) {
      if (seq !== sendSeqRef.current) return false; // stale
      useInboxStore.getState().setSendError(
        "Failed to send reply: " + (err instanceof Error ? err.message : "Network error")
      );
    }
    if (seq === sendSeqRef.current) useInboxStore.getState().setSendingReply(false);
    return false;
  }, []);

  const generateSummary = useCallback(async (mail: Email | null) => {
    if (!mail) return;
    const seq = ++summarySeqRef.current;
    const mailId = mail.id; // capture for mail-switch guard
    if (abortSummaryRef.current) abortSummaryRef.current.abort();
    const controller = new AbortController();
    abortSummaryRef.current = controller;

    useInboxStore.getState().setLoadingSummary(true);
    useInboxStore.getState().setSendError(null);

    try {
      const emailContent = cleanEmailBody(mail.body || mail.snippet || "");
      if (!emailContent) {
        useInboxStore.getState().setAiSummary("⚠️ No email content available.");
        useInboxStore.getState().setLoadingSummary(false);
        return;
      }
      const res = await fetch("/api/ai/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: mail.subject,
          snippet: emailContent.slice(0, 9500),
          from: mail.from,
          date: mail.date,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Summary API error: ${res.status}`);
      const data = await res.json();
      if (seq !== summarySeqRef.current) return; // stale
      if (useInboxStore.getState().selectedMail?.id !== undefined && useInboxStore.getState().selectedMail?.id !== mailId) return; // mail switched
      useInboxStore.getState().setAiSummary(
        data.error ? "❌ " + data.error : data.summary || "No summary generated."
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (seq === summarySeqRef.current) useInboxStore.getState().setLoadingSummary(false);
        return;
      }
      if (seq !== summarySeqRef.current) return; // stale
      if (useInboxStore.getState().selectedMail?.id !== undefined && useInboxStore.getState().selectedMail?.id !== mailId) return; // mail switched
      useInboxStore.getState().setAiSummary(
        "❌ Failed to generate summary: " + (err instanceof Error ? err.message : "Network error")
      );
    }
    if (seq === summarySeqRef.current) useInboxStore.getState().setLoadingSummary(false);
  }, []);

  const generateExplanation = useCallback(async (mail: Email | null) => {
    if (!mail) return;
    const seq = ++explainSeqRef.current;
    const mailId = mail.id; // capture for mail-switch guard
    if (abortExplainRef.current) abortExplainRef.current.abort();
    const controller = new AbortController();
    abortExplainRef.current = controller;

    useInboxStore.getState().setLoadingExplanation(true);
    useInboxStore.getState().setSendError(null);

    try {
      const res = await fetch("/api/ai/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: mail.subject || "",
          snippet: (mail.snippet || mail.body || "").slice(0, 9500),
          from: mail.from,
          date: mail.date,
        }),
        signal: controller.signal,
      });
      if (!res.ok) throw new Error(`Explain API error: ${res.status}`);
      const data = await res.json();
      if (seq !== explainSeqRef.current) return; // stale
      if (useInboxStore.getState().selectedMail?.id !== undefined && useInboxStore.getState().selectedMail?.id !== mailId) return; // mail switched
      useInboxStore.getState().setAiReason(
        data.error ? "❌ " + data.error : data.explanation || "No explanation generated."
      );
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (seq === explainSeqRef.current) useInboxStore.getState().setLoadingExplanation(false);
        return;
      }
      if (seq !== explainSeqRef.current) return; // stale
      if (useInboxStore.getState().selectedMail?.id !== undefined && useInboxStore.getState().selectedMail?.id !== mailId) return; // mail switched
      useInboxStore.getState().setAiReason(
        "❌ Failed to generate explanation: " + (err instanceof Error ? err.message : "Network error")
      );
    }
    if (seq === explainSeqRef.current) useInboxStore.getState().setLoadingExplanation(false);
  }, []);

  const resetReplyFlow = useCallback(() => {
    // Invalidate all in-flight requests by bumping seq refs — this ensures
    // any still-pending request will fail the stale guard even if no newer
    // request of the same type is started (e.g. user just switches mails).
    replySeqRef.current++;
    summarySeqRef.current++;
    explainSeqRef.current++;
    sendSeqRef.current++;
    if (abortReplyRef.current) abortReplyRef.current.abort();
    if (abortSummaryRef.current) abortSummaryRef.current.abort();
    if (abortExplainRef.current) abortExplainRef.current.abort();
    useInboxStore.getState().setAiReply("");
    useInboxStore.getState().setEditableReply("");
    useInboxStore.getState().setReplySent(false);
    useInboxStore.getState().setAiSummary("");
    useInboxStore.getState().setAiReason("");
    useInboxStore.getState().setLoadingSummary(false);
    useInboxStore.getState().setLoadingExplanation(false);
    useInboxStore.getState().setLoadingReply(false);
    useInboxStore.getState().setSendingReply(false);
    useInboxStore.getState().setSendError(null);
  }, []);

  return {
    generateReply,
    sendDraftReply,
    generateSummary,
    generateExplanation,
    resetReplyFlow,
  };
}
