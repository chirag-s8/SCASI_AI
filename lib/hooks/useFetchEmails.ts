/**
 * @file lib/hooks/useFetchEmails.ts
 * Custom hook encapsulating all email fetching logic.
 * Reads/writes directly from the Zustand store — no duplicate local state.
 */
"use client";

import { useRef, useCallback } from "react";
import { useInboxStore } from "@/lib/inboxStore";
import { safeISODate } from "@/lib/dateUtils";
import type { Email } from "@/lib/emailAnalysis";

const GMAIL_FOLDERS = new Set(["inbox", "sent", "drafts", "spam", "trash", "archive"]);

/** Cooldown between RAG indexing requests (ms). The server fetches its own
 *  emails from Gmail, so tracking specific client-side IDs would be a
 *  contract mismatch. Instead, we just avoid re-triggering within this window. */
const RAG_INDEX_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

export function useFetchEmails() {
  const requestSeqRef = useRef(0);
  const lastRagIndexRef = useRef(0); // timestamp of last successful RAG index trigger
  const abortRef = useRef<AbortController | null>(null);

  const fetchEmails = useCallback(async (folder: string = "inbox", token: string | null = null, signal?: AbortSignal) => {
    if (!GMAIL_FOLDERS.has(folder)) return;

    const seq = ++requestSeqRef.current;
    const store = useInboxStore.getState();
    store.setLoading(true);
    store.setFetchError(null);

    try {
      const url = token
        ? `/api/gmail?pageToken=${token}&folder=${folder}`
        : `/api/gmail?folder=${folder}`;
      const res = await fetch(url, { signal });

      // Guard against non-JSON responses (e.g. Next.js dev compilation page on cold start).
      // Check Content-Type FIRST — a non-OK HTML page (500/503) is also a warmup case.
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Server is warming up — please try again in a few seconds.");
      }
      if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);

      let data: { emails?: Email[]; nextPageToken?: string | null };
      try {
        data = await res.json();
      } catch {
        throw new Error("Server is warming up — please try again in a few seconds.");
      }

      if (seq !== requestSeqRef.current) return; // stale response — discard

      const newMailList: Email[] = data.emails || [];
      const currentEmails = useInboxStore.getState().emails;
      useInboxStore.getState().setEmails(
        !token
          ? newMailList
          : Array.from(new Map([...currentEmails, ...newMailList].map(m => [m.id, m])).values())
      );
      useInboxStore.getState().setNextPageToken(data.nextPageToken || null);

      // New-mail notification tracking
      const lastSeenTime = useInboxStore.getState().lastSeenTime;
      if (folder === "inbox" && !token && lastSeenTime) {
        const lastTime = new Date(safeISODate(lastSeenTime)).getTime();
        if (!isNaN(lastTime)) {
          const fresh = newMailList.filter(m => {
            const t = new Date(safeISODate(m.date)).getTime();
            return !isNaN(t) && t > lastTime;
          });
          useInboxStore.getState().setNewMails(fresh);
          useInboxStore.getState().setNewMailCount(fresh.length);
        }
      }

      // Update lastSeenTime with the latest valid email date
      if (folder === "inbox" && !token && newMailList.length > 0) {
        const validTimestamps = newMailList
          .map(m => new Date(safeISODate(m.date)).getTime())
          .filter(t => !isNaN(t));
        if (validTimestamps.length > 0) {
          const latestDate = Math.max(...validTimestamps);
          const currentSeen = lastSeenTime ? new Date(safeISODate(lastSeenTime)).getTime() : 0;
          if (!isNaN(currentSeen) && latestDate > currentSeen) {
            const iso = new Date(latestDate).toISOString(); // latestDate is already a valid number
            useInboxStore.getState().setLastSeenTime(iso);
          }
        }
      }

      // Fire-and-forget: persist emails to Supabase
      if (newMailList.length) {
        fetch("/api/db/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: newMailList }),
        }).catch(err => console.error(err));
      }

      // Fire-and-forget: trigger RAG indexing (with cooldown to avoid duplicate requests).
      // Note: The server fetches its own emails from Gmail — it doesn't use client-provided
      // IDs. So we use a TTL-based cooldown rather than tracking specific IDs.
      const now = Date.now();
      if (newMailList.length && now - lastRagIndexRef.current >= RAG_INDEX_COOLDOWN_MS) {
        lastRagIndexRef.current = now;
        fetch("/api/actions/index-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxEmails: 50 }),
        })
          .then((res) => {
            // Reset cooldown only on success — allows retry on server errors
            if (!res.ok) lastRagIndexRef.current = 0;
          })
          .catch(() => {
            // On network error, reset cooldown to allow retry
            lastRagIndexRef.current = 0;
          });
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        if (seq === requestSeqRef.current) useInboxStore.getState().setLoading(false);
        return;
      }
      console.error("❌ Error loading emails:", error);
      if (seq === requestSeqRef.current) {
        useInboxStore.getState().setFetchError(
          error instanceof Error ? error.message : "Failed to load emails"
        );
      }
    }
    if (seq === requestSeqRef.current) useInboxStore.getState().setLoading(false);
  }, []);

  const refreshInbox = useCallback((folder: string = "inbox") => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    useInboxStore.getState().setEmails([]);
    useInboxStore.getState().setNextPageToken(null);
    fetchEmails(folder, null, controller.signal);
  }, [fetchEmails]);

  const loadMore = useCallback((folder: string = "inbox", nextPageToken: string | null) => {
    if (!nextPageToken) return;
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchEmails(folder, nextPageToken, controller.signal);
  }, [fetchEmails]);

  return { fetchEmails, refreshInbox, loadMore };
}
