/**
 * @file lib/hooks/useHandleForMe.ts
 * Custom hook encapsulating the "Auto-Handle" AI orchestration flow.
 * Reads/writes directly from the Zustand store — no duplicate local state.
 * Includes AbortController + stale-request guard for streaming requests.
 */
"use client";

import { useRef, useCallback } from "react";
import { useInboxStore } from "@/lib/inboxStore";
import { parseHandleForMeOutput } from "@/lib/emailHelpers";
import { processSSEChunk } from "@/lib/sseParser";
import type { Email } from "@/lib/emailAnalysis";

export function useHandleForMe() {
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const runHandleForMe = useCallback(async (
    mail: Email | null,
    { onSummary, onReason }: { onSummary?: (s: string) => void; onReason?: (r: string) => void } = {}
  ) => {
    if (!mail) return;

    const seq = ++requestSeqRef.current;
    const mailId = mail.id; // capture for mail-switch guard
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const store = useInboxStore.getState();
    store.setLoadingHandleForMe(true);
    store.setHandleForMeResult("");
    store.setHfmData(null);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "Handle this email for me",
          emailContext: {
            gmailId: mail.id || "",
            subject: mail.subject || "",
            snippet: (mail.snippet || "").slice(0, 500),
            from: mail.from || "",
            body: (mail.body || mail.snippet || "").slice(0, 8000),
          },
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        if (seq !== requestSeqRef.current) return; // stale
        if (useInboxStore.getState().selectedMail?.id !== undefined && useInboxStore.getState().selectedMail?.id !== mailId) return; // mail switched
        useInboxStore.getState().setHandleForMeResult("❌ " + (errData.error || "Failed to process email. Please try again."));
        useInboxStore.getState().setLoadingHandleForMe(false);
        return;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let collected = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let boundary = buffer.indexOf("\n\n");
        while (boundary !== -1) {
          const chunk = buffer.slice(0, boundary);
          buffer = buffer.slice(boundary + 2);
          boundary = buffer.indexOf("\n\n");

          collected = processSSEChunk(chunk, collected);
          if (seq === requestSeqRef.current) {
            useInboxStore.getState().setHandleForMeResult(collected);
          }
        }
      }

      // Flush remaining buffer if stream ended without trailing \n\n
      if (buffer.trim()) {
        collected = processSSEChunk(buffer, collected);
        if (seq === requestSeqRef.current) {
          useInboxStore.getState().setHandleForMeResult(collected);
        }
      }

      if (seq !== requestSeqRef.current) return; // stale
      if (useInboxStore.getState().selectedMail?.id !== undefined && useInboxStore.getState().selectedMail?.id !== mailId) return; // mail switched

      if (!collected) {
        useInboxStore.getState().setHandleForMeResult("No response generated. Please try again.");
      } else {
        const parsed = parseHandleForMeOutput(collected);
        useInboxStore.getState().setHfmData(parsed.hfmData);
        if (parsed.aiSummary) onSummary?.(parsed.aiSummary);
        if (parsed.aiReason) onReason?.(parsed.aiReason);
        useInboxStore.getState().setHandleForMeResult(parsed.draftReply || collected);
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        if (seq === requestSeqRef.current) useInboxStore.getState().setLoadingHandleForMe(false);
        return;
      }
      console.error("Handle For Me error:", err);
      if (seq === requestSeqRef.current && (useInboxStore.getState().selectedMail?.id === undefined || useInboxStore.getState().selectedMail?.id === mailId)) {
        useInboxStore.getState().setHandleForMeResult(
          "❌ Error: " + (err instanceof Error ? err.message : "Network error")
        );
      }
    }

    if (seq === requestSeqRef.current) {
      useInboxStore.getState().setLoadingHandleForMe(false);
    }
  }, []);

  const resetHandleForMe = useCallback(() => {
    // Invalidate in-flight request by bumping seq ref
    requestSeqRef.current++;
    if (abortRef.current) abortRef.current.abort();
    useInboxStore.getState().setHandleForMeResult("");
    useInboxStore.getState().setHfmData(null);
    useInboxStore.getState().setLoadingHandleForMe(false);
  }, []);

  return { runHandleForMe, resetHandleForMe };
}
