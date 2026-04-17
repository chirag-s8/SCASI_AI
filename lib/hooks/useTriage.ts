/**
 * @file lib/hooks/useTriage.ts
 * Custom hook encapsulating inbox triage logic.
 * Reads/writes directly from the Zustand store — no duplicate local state.
 */
"use client";

import { useRef, useCallback } from "react";
import { useInboxStore } from "@/lib/inboxStore";

export function useTriage() {
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  const runInboxTriage = useCallback(async (filteredEmails: Array<{ from?: string; subject?: string; snippet?: string }>) => {
    const seq = ++requestSeqRef.current;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const store = useInboxStore.getState();
    store.setTriageLoading(true);
    store.setTriageResultBody(null);
    store.setTriageStep(1);

    try {
      if (filteredEmails.length === 0) {
        store.setTriageResultBody({ kind: "text", text: "inbox_zero" });
        store.setTriageLoading(false);
        store.setTriageStep(0);
        return;
      }

      const emailsTarget = filteredEmails.slice(0, 15);
      const combinedSnippets = emailsTarget
        .map((m, i) => `Email ${i + 1}:\nFrom: ${m.from || "Unknown"}\nSubject: ${m.subject}\nSnippet: ${m.snippet}`)
        .join("\n\n---\n\n");

      store.setTriageStep(2);
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: combinedSnippets.slice(0, 12000) }),
        signal: controller.signal,
      });

      if (!res.ok) throw new Error(`Triage API error: ${res.status}`);

      const data = await res.json();
      if (seq !== requestSeqRef.current) return; // stale
      store.setTriageStep(3);

      if (data.error) {
        useInboxStore.getState().setTriageResultBody({ kind: "text", text: "❌ " + data.error });
      } else if (data.raw) {
        useInboxStore.getState().setTriageResultBody({ kind: "text", text: data.raw });
      } else if (data.stats && data.items) {
        useInboxStore.getState().setTriageResultBody({ kind: "stats", stats: data.stats, items: data.items });
      } else {
        useInboxStore.getState().setTriageResultBody({ kind: "text", text: "❌ Unexpected response from triage service." });
      }
    } catch (e: unknown) {
      if (e instanceof Error && e.name === "AbortError") {
        if (seq === requestSeqRef.current) useInboxStore.getState().setTriageLoading(false);
        return;
      }
      console.error("[triage] Client error:", e);
      if (seq === requestSeqRef.current) {
        useInboxStore.getState().setTriageResultBody({
          kind: "text",
          text: "❌ Could not connect to the triage service. Check your connection and try again.",
        });
      }
    }

    if (seq === requestSeqRef.current) {
      useInboxStore.getState().setTriageStep(0);
      useInboxStore.getState().setTriageLoading(false);
    }
  }, []);

  const resetTriage = useCallback(() => {
    // Invalidate in-flight request by bumping seq ref
    requestSeqRef.current++;
    if (abortRef.current) abortRef.current.abort();
    useInboxStore.getState().setTriageResultBody(null);
    useInboxStore.getState().setTriageStep(0);
    useInboxStore.getState().setTriageLoading(false);
  }, []);

  return { runInboxTriage, resetTriage };
}
