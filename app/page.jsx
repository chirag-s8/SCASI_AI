"use client";

import { useEffect, Fragment, useRef, useMemo } from "react";
import { signOut, useSession } from "next-auth/react";
import DOMPurify from "dompurify";
import Footer from "@/components/Footer";
import ScasiDashboard from "@/components/dashboard/ScasiDashboard";
import CalendarView from "@/components/calendar/CalendarView";
import CalendarNotifier from "@/components/calendar/CalendarNotifier";
import TeamCollaboration from "@/components/team/TeamCollaboration";
import EmailTeamPanel from "@/components/team/EmailTeamPanel";
import AnalyticsDashboard from "@/components/analytics/AnalyticsDashboard";
import dynamic from "next/dynamic";
import GeminiSidebar from "@/components/GeminiSidebar";
import Header from "@/components/dashboard/Header";

// ─── Extracted modules ────────────────────────────────────────────
import {
  getEmailCategory, getCategoryColor, getCategoryBg,
  getPriorityScore, getPriorityColor,
  getPhishingInfo, getToneInfo, getBurnoutStats,
  isSpamEmail, isFirstTimeSender,
  extractDeadline, getUrgencyLevel, extractTasks,
} from "@/lib/emailAnalysis";
import {
  cleanEmailBody, extractEmail, extractFirstLink,
  getInitials,
  parseHandleForMeOutput,
} from "@/lib/emailHelpers";
import Ico from "@/components/inbox/Icons";
import Sidebar from "@/components/inbox/Sidebar";
import TopNavBar from "@/components/inbox/TopNavBar";
import { useInboxStore, hydratePersistedState } from "@/lib/inboxStore";
import { useShallow } from "zustand/react/shallow";
import MailLoadingScreen, { EmptyStateEnvelope } from "@/components/inbox/MailLoadingScreen";
import "@/components/inbox/inbox.css";
const ScassiHero3D = dynamic(
  () => import("@/components/ScassiHero3D"),
  { ssr: false, loading: () => <div style={{ height: "100vh" }} /> }
);

// ── Module-scope constants (stable across renders) ──
const GMAIL_FOLDERS = new Set(["inbox", "sent", "drafts", "trash", "spam", "archive"]);

const CATEGORY_NAV = [
  { key: "All Mails", color: "#6D28D9", bg: "#F5F3FF" },
  { key: "Do Now", color: "#DC2626", bg: "#FEF2F2" },
  { key: "Needs Decision", color: "#D97706", bg: "#FFFBEB" },
  { key: "Waiting", color: "#2563EB", bg: "#EFF6FF" },
  { key: "Low Energy", color: "#059669", bg: "#ECFDF5" },
];

// ─────────────────────────────────────────────────────────────────
//  HOME — Main export. Controls which view is shown.
//  'landing'  → not logged in  (ScassiHero3D + Header + Dashboard + Footer)
//  'loading'  → just logged in (MailLoadingScreen animation)
//  'scasi' → after loading  (Scasi inbox purple glass dashboard)
//  'inbox'    → clicked any nav (your complete original inbox code)
// ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: session, status } = useSession();

  useEffect(() => {
    if (session?.error === "RefreshAccessTokenError") {
      console.error("Token refresh failed — signing out");
      signOut({ callbackUrl: "/" });
    }
  }, [session]);

  // Hydrate localStorage-backed state on mount (avoids SSR mismatch)
  // Gate until auth status is resolved — don't hydrate with undefined email
  useEffect(() => {
    if (status === "loading") return; // Wait for NextAuth to resolve
    if (!session?.user?.email) return; // No email to scope persisted state to
    hydratePersistedState(session.user.email);
  }, [status, session?.user?.email]);

  // ── Zustand store (replaces ~46 useState hooks) ──
  const {
    // View state
    appView, setAppView, hasShownLoading, markLoadingShown,
    // Email data
    emails, setEmails, nextPageToken, setNextPageToken,
    loading, setLoading, selectedMail, setSelectedMail,
    // Folder / navigation
    activeFolder, setActiveFolder, activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    // Local-persisted sets
    starredIds, toggleStar, snoozedIds, snoozeMail, doneIds, markDone,
    // AI features
    aiSummary, setAiSummary, aiReason, setAiReason,
    loadingAI, setLoadingAI,
    aiReply, setAiReply, loadingReply, setLoadingReply,
    editableReply, setEditableReply,
    sendingReply, setSendingReply, replySent, setReplySent,
    aiPriorityMap, setAIPriorityMap, updateAIPriority,
    // Handle-For-Me
    handleForMeResult, setHandleForMeResult,
    loadingHandleForMe, setLoadingHandleForMe,
    hfmData, setHfmData,
    // Triage
    triageLoading, setTriageLoading, triageStep, setTriageStep,
    triageResultBody, setTriageResultBody, triageCollapsed, setTriageCollapsed,
    // Notifications
    newMailCount, setNewMailCount, showNotifications, setShowNotifications,
    newMails, setNewMails,
    // Modals
    showCompose, setShowCompose, showGemini, setShowGemini,
    showBurnoutModal, setShowBurnoutModal,
    showPriorityModal, setShowPriorityModal,
    showSmartReplyModal, setShowSmartReplyModal,
    // UI state
    sidebarOpen, setSidebarOpen, toggleSidebar,
    hoverFile, setHoverFile, copied, setCopied,
    deadline, setDeadline, urgency, setUrgency,
    // Gemini sidebar
    geminiQuestion, setGeminiQuestion, geminiReply, setGeminiReply,
    loadingGemini, setLoadingGemini,
    // Security
    safeIds, setSafeIds, reportedIds, setReportedIds,
    addSafeId, addReportedId,
    // Hydration state + lastSeenTime
    hasHydrated,
    lastSeenTime, setLastSeenTime,
    // Fetch error
    fetchError, setFetchError,
    // Compound actions
    resetMailState, openMailAndReset,
  } = useInboxStore(useShallow((state) => ({
      appView: state.appView,
      setAppView: state.setAppView,
      hasShownLoading: state.hasShownLoading,
      markLoadingShown: state.markLoadingShown,
      emails: state.emails,
      setEmails: state.setEmails,
      nextPageToken: state.nextPageToken,
      setNextPageToken: state.setNextPageToken,
      loading: state.loading,
      setLoading: state.setLoading,
      selectedMail: state.selectedMail,
      setSelectedMail: state.setSelectedMail,
      activeFolder: state.activeFolder,
      setActiveFolder: state.setActiveFolder,
      activeTab: state.activeTab,
      setActiveTab: state.setActiveTab,
      searchQuery: state.searchQuery,
      setSearchQuery: state.setSearchQuery,
      starredIds: state.starredIds,
      toggleStar: state.toggleStar,
      snoozedIds: state.snoozedIds,
      snoozeMail: state.snoozeMail,
      doneIds: state.doneIds,
      markDone: state.markDone,
      aiSummary: state.aiSummary,
      setAiSummary: state.setAiSummary,
      aiReason: state.aiReason,
      setAiReason: state.setAiReason,
      loadingAI: state.loadingAI,
      setLoadingAI: state.setLoadingAI,
      aiReply: state.aiReply,
      setAiReply: state.setAiReply,
      loadingReply: state.loadingReply,
      setLoadingReply: state.setLoadingReply,
      editableReply: state.editableReply,
      setEditableReply: state.setEditableReply,
      sendingReply: state.sendingReply,
      setSendingReply: state.setSendingReply,
      replySent: state.replySent,
      setReplySent: state.setReplySent,
      aiPriorityMap: state.aiPriorityMap,
      setAIPriorityMap: state.setAIPriorityMap,
      updateAIPriority: state.updateAIPriority,
      handleForMeResult: state.handleForMeResult,
      setHandleForMeResult: state.setHandleForMeResult,
      loadingHandleForMe: state.loadingHandleForMe,
      setLoadingHandleForMe: state.setLoadingHandleForMe,
      hfmData: state.hfmData,
      setHfmData: state.setHfmData,
      triageLoading: state.triageLoading,
      setTriageLoading: state.setTriageLoading,
      triageStep: state.triageStep,
      setTriageStep: state.setTriageStep,
      triageResultBody: state.triageResultBody,
      setTriageResultBody: state.setTriageResultBody,
      triageCollapsed: state.triageCollapsed,
      setTriageCollapsed: state.setTriageCollapsed,
      newMailCount: state.newMailCount,
      setNewMailCount: state.setNewMailCount,
      showNotifications: state.showNotifications,
      setShowNotifications: state.setShowNotifications,
      newMails: state.newMails,
      setNewMails: state.setNewMails,
      showCompose: state.showCompose,
      setShowCompose: state.setShowCompose,
      showGemini: state.showGemini,
      setShowGemini: state.setShowGemini,
      showBurnoutModal: state.showBurnoutModal,
      setShowBurnoutModal: state.setShowBurnoutModal,
      showPriorityModal: state.showPriorityModal,
      setShowPriorityModal: state.setShowPriorityModal,
      showSmartReplyModal: state.showSmartReplyModal,
      setShowSmartReplyModal: state.setShowSmartReplyModal,
      sidebarOpen: state.sidebarOpen,
      setSidebarOpen: state.setSidebarOpen,
      toggleSidebar: state.toggleSidebar,
      hoverFile: state.hoverFile,
      setHoverFile: state.setHoverFile,
      copied: state.copied,
      setCopied: state.setCopied,
      deadline: state.deadline,
      setDeadline: state.setDeadline,
      urgency: state.urgency,
      setUrgency: state.setUrgency,
      geminiQuestion: state.geminiQuestion,
      setGeminiQuestion: state.setGeminiQuestion,
      geminiReply: state.geminiReply,
      setGeminiReply: state.setGeminiReply,
      loadingGemini: state.loadingGemini,
      setLoadingGemini: state.setLoadingGemini,
      safeIds: state.safeIds,
      setSafeIds: state.setSafeIds,
      reportedIds: state.reportedIds,
      setReportedIds: state.setReportedIds,
      addSafeId: state.addSafeId,
      addReportedId: state.addReportedId,
      hasHydrated: state.hasHydrated,
      lastSeenTime: state.lastSeenTime,
      setLastSeenTime: state.setLastSeenTime,
      fetchError: state.fetchError,
      setFetchError: state.setFetchError,
      resetMailState: state.resetMailState,
      openMailAndReset: state.openMailAndReset,
  })));

  // ── Bootstrap appView based on session state ──
  // Depend on !!session (boolean) so token refreshes don't reset the view.
  // Only transition if we're still in a bootstrap state (landing/loading/scasi).
  const isAuthenticated = !!session;
  useEffect(() => {
    if (!isAuthenticated) {
      setAppView("landing");
      return;
    }
    // Guard: don't reset if the user has already navigated past bootstrap views
    const current = useInboxStore.getState().appView;
    if (current !== "landing" && current !== "loading" && current !== "scasi") return;
    setAppView(hasShownLoading ? "scasi" : "loading");
  }, [isAuthenticated, hasShownLoading, setAppView]);


  // ── Refs ──
  const ragIndexedRef = useRef(new Set());
  const abortRef = useRef(null);
  const requestSeqRef = useRef(0);

  // ── View transition handlers ──
  function handleLoadingDone() {
    markLoadingShown();
    setAppView("scasi");
  }

  function handleScasiNavigate(targetFolder) {
    setAppView("inbox");
    if (targetFolder) setActiveFolder(targetFolder);
  }

  async function askGemini() {
    if (!selectedMail) {
      alert("Select an email first");
      return;
    }
    setLoadingGemini(true);
    setGeminiReply("");
    try {
      const emailText =
        selectedMail.subject +
        "\n\n" +
        selectedMail.snippet +
        "\n\n" +
        (selectedMail.body || "");
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailText,
          question: geminiQuestion || "Summarize this email clearly",
        }),
      });
      if (!res.ok) throw new Error(`Gemini API error: ${res.status}`);
      const data = await res.json();
      if (data.reply) {
        setGeminiReply(data.reply);
      } else {
        setGeminiReply("❌ Gemini failed: " + data.error);
      }
    } catch (err) {
      console.error("Gemini error:", err);
      setGeminiReply("❌ Network error: " + (err instanceof Error ? err.message : "Failed to reach Gemini"));
    }
    setLoadingGemini(false);
  }

  function deleteSelectedMail() {
    if (!selectedMail) {
      alert("❌ Please select an email first");
      return;
    }
    alert("🗑 Delete feature will be connected to Gmail API next");
  }

  const loadMoreEmails = () => {
    // Abort any in-flight folder fetch, then create a new controller for pagination
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    fetchEmails(activeFolder, nextPageToken, controller.signal);
  };

  // ✅ FIXED: Combined function that fetches email AND generates AI
  const openMailAndGenerateAI = async (id, _mailPreview) => {
    resetMailState();
    const res = await fetch(`/api/gmail/message?id=${id}`);
    if (!res.ok) { console.error(`Email detail API error: ${res.status}`); return; }
    const fullEmailData = await res.json();
    setSelectedMail(fullEmailData);
    const combinedText =
      fullEmailData.subject + " " +
      fullEmailData.snippet + " " +
      fullEmailData.body;
    const detected = extractDeadline(combinedText);
    setDeadline(detected);
    setUrgency(getUrgencyLevel(detected));
  };

  async function runHandleForMe(mail) {
    if (!mail) return;
    setLoadingHandleForMe(true);
    setHandleForMeResult("");
    setReplySent(false);
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
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        setHandleForMeResult("❌ " + (errData.error || "Failed to process email. Please try again."));
        setLoadingHandleForMe(false);
        return;
      }
      const reader = res.body.getReader();
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
          const dataLine = chunk.split("\n").find(l => l.startsWith("data: "));
          if (dataLine) {
            try {
              const evt = JSON.parse(dataLine.slice(6));
              if (evt.type === "token") {
                collected += evt.text;
                setHandleForMeResult(collected);
              } else if (evt.type === "error") {
                collected += "\n❌ " + evt.message;
                setHandleForMeResult(collected);
              }
            } catch { /* skip malformed SSE */ }
          }
        }
      }
      if (!collected) {
        setHandleForMeResult("No response generated. Please try again.");
      } else {
        // Parse structured fields using the extracted utility
        const parsed = parseHandleForMeOutput(collected);
        setHfmData(parsed.hfmData);
        if (parsed.aiSummary) setAiSummary(parsed.aiSummary);
        if (parsed.aiReason) setAiReason(parsed.aiReason);
        setHandleForMeResult(parsed.draftReply || collected);
      }
    } catch (err) {
      console.error("Handle For Me error:", err);
      setHandleForMeResult("❌ Error: " + (err instanceof Error ? err.message : "Network error"));
    }
    setLoadingHandleForMe(false);
  }

  async function runInboxTriage() {
    setTriageLoading(true);
    setTriageResultBody(null);
    setTriageStep(1);
    try {
      if (filteredEmails.length === 0) {
        setTriageResultBody({ kind: "text", text: "inbox_zero" });
        setTriageLoading(false);
        setTriageStep(0);
        return;
      }
      const emailsTarget = filteredEmails.slice(0, 15);
      const combinedSnippets = emailsTarget.map((m, i) =>
        `Email ${i + 1}:\nFrom: ${m.from || "Unknown"}\nSubject: ${m.subject}\nSnippet: ${m.snippet}`
      ).join("\n\n---\n\n");
      setTriageStep(2);
      const res = await fetch("/api/ai/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: combinedSnippets.slice(0, 12000) }),
      });
      if (!res.ok) throw new Error(`Triage API error: ${res.status}`);
      setTriageStep(3);
      const data = await res.json();
      if (data.error) {
        setTriageResultBody({ kind: "text", text: "❌ " + data.error });
      } else if (data.raw) {
        setTriageResultBody({ kind: "text", text: data.raw });
      } else if (data.stats && data.items) {
        setTriageResultBody({ kind: "stats", stats: data.stats, items: data.items });
      } else {
        setTriageResultBody({ kind: "text", text: "❌ Unexpected response from triage service." });
      }
    } catch (e) {
      console.error('[triage] Client error:', e);
      setTriageResultBody({ kind: "text", text: "❌ Could not connect to the triage service. Check your connection and try again." });
    }
    setTriageStep(0);
    setTriageLoading(false);
  }

  async function sendDraftReply() {
    if (!selectedMail) return;
    setSendingReply(true);
    try {
      const recipient = extractEmail(selectedMail.from);
      if (!recipient) { alert("❌ Cannot reply: No valid recipient email found"); setSendingReply(false); return; }
      const res = await fetch("/api/gmail/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: recipient,
          subject: selectedMail.subject,
          body: handleForMeResult,
          threadId: selectedMail.threadId,
          originalMessageId: selectedMail.messageId,
        }),
      });
      if (!res.ok) { alert(`❌ Reply failed: ${res.status}`); setSendingReply(false); return; }
      const data = await res.json();
      if (data.success) {
        setReplySent(true);
      } else {
        alert("❌ Error: " + data.error);
      }
    } catch (err) {
      alert("❌ Failed to send reply: " + (err instanceof Error ? err.message : "Network error"));
    }
    setSendingReply(false);
  }

  async function sendReply(body) { // returns true on success
    if (!selectedMail) return alert("Select email first");
    const recipient = extractEmail(selectedMail.from);
    if (!recipient) { alert("❌ Cannot reply: No valid recipient email found"); return; }
    setSendingReply(true);
    try {
      const res = await fetch("/api/gmail/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: recipient, subject: selectedMail.subject, body, threadId: selectedMail.threadId, originalMessageId: selectedMail.messageId }),
      });
      if (!res.ok) { alert(`❌ Reply failed: ${res.status}`); setSendingReply(false); return; }
      const data = await res.json();
      alert(data.success ? "✅ Reply Sent Successfully!" : "❌ Error: " + data.error);
    } catch (err) {
      alert("❌ Failed to send reply: " + (err instanceof Error ? err.message : "Network error"));
    }
    setSendingReply(false);
  }

  async function generateReply() {
    if (!selectedMail) {
      alert("Please select an email first");
      return;
    }
    setLoadingReply(true);
    setAiReply("");
    try {
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedMail.subject,
          snippet: selectedMail.snippet || selectedMail.body || "",
        }),
      });
      if (!res.ok) throw new Error(`Reply API error: ${res.status}`);
      const data = await res.json();
      if (data.error) {
        console.error("❌ API Error:", data.error);
        alert("Error: " + data.error);
        setLoadingReply(false);
        return;
      }
      setAiReply(data.reply);
      setEditableReply(data.reply);
    } catch (error) {
      console.error("❌ Fetch error:", error);
      alert("Failed to generate reply. Check console for details.");
    }
    setLoadingReply(false);
  }

  async function generateSummary(mail) {
    setLoadingAI(true);
    try {
      const emailContent = cleanEmailBody(mail.body || mail.snippet || "");
      if (!emailContent) {
        setAiSummary("⚠️ No email content available.");
        setLoadingAI(false);
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
      });
      if (!res.ok) throw new Error(`Summary API error: ${res.status}`);
      const data = await res.json();
      if (data.error) {
        setAiSummary("❌ " + data.error);
      } else {
        setAiSummary(data.summary || "No summary generated.");
      }
    } catch (err) {
      console.error("Summary error:", err);
      setAiSummary("❌ Failed to generate summary: " + (err instanceof Error ? err.message : "Network error"));
    }
    setLoadingAI(false);
  }

  async function generateAIPriorityForMail(mail) {
    if (aiPriorityMap[mail.id]) return;
    try {
      const res = await fetch("/api/ai/priority", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: mail.subject,
          snippet: mail.snippet,
        }),
      });
      if (!res.ok) throw new Error(`Priority API error: ${res.status}`);
      const data = await res.json();
      if (data.result?.priority) {
        updateAIPriority(mail.id, data.result);
      }
    } catch (err) {
      console.error("AI Priority error:", err);
    }
  }

  async function generateExplanation(mail) {
    setLoadingAI(true);
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
      });
      if (!res.ok) throw new Error(`Explain API error: ${res.status}`);
      const data = await res.json();
      if (data.error) {
        setAiReason("❌ " + data.error);
      } else {
        setAiReason(data.explanation || "No explanation generated.");
      }
    } catch (err) {
      console.error("Explanation error:", err);
      setAiReason("❌ Failed to generate explanation: " + (err instanceof Error ? err.message : "Network error"));
    }
    setLoadingAI(false);
  }

  // ✅ FIX 4: Load emails when session is available
  const fetchEmails = async (folder = activeFolder, token = null, signal) => {
    const seq = ++requestSeqRef.current;
    setLoading(true);
    setFetchError(null); // Clear any previous error for this new request
    try {
      const url = token ? `/api/gmail?pageToken=${token}&folder=${folder}` : `/api/gmail?folder=${folder}`;
      const res = await fetch(url, { signal });
      // Guard against non-JSON responses (e.g. Next.js dev compilation page on cold start).
      // Check Content-Type FIRST — a non-OK HTML page (500/503) is also a warmup case.
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error('Server is warming up — please try again in a few seconds.');
      }
      if (!res.ok) throw new Error(`Gmail API error: ${res.status}`);
      let data;
      try {
        data = await res.json();
      } catch {
        throw new Error('Server is warming up — please try again in a few seconds.');
      }
      // Stale-request guard: if a newer fetch started, discard this response
      if (seq !== requestSeqRef.current) return;

      const newMails = data.emails || [];
      setEmails(prev => {
        if (!token) return newMails;
        const combined = [...prev, ...newMails];
        return Array.from(new Map(combined.map(m => [m.id, m])).values());
      });
      setNextPageToken(data.nextPageToken || null);

      // Notification tracking: only for initial inbox loads (not pagination, not other folders)
      const lastSeen = lastSeenTime;
      let count = 0;
      let freshMails = [];
      if (folder === "inbox" && !token && lastSeen) {
        const lastTime = new Date(lastSeen).getTime();
        freshMails = newMails.filter((mail) => new Date(mail.date).getTime() > lastTime);
        count = freshMails.length;
        setNewMails(freshMails);
        setNewMailCount(count);
      }

      // Only update lastSeenTime for initial inbox loads, and only advance it forward
      if (folder === "inbox" && !token && newMails.length > 0) {
        const latestDate = newMails
          .map(m => new Date(m.date).getTime())
          .reduce((a, b) => Math.max(a, b), 0);
        if (latestDate) {
          const currentSeen = lastSeenTime ? new Date(lastSeenTime).getTime() : 0;
          if (latestDate > currentSeen) {
            setLastSeenTime(new Date(latestDate).toISOString());
          }
        }
      }

      // Sync to Supabase
      if (newMails.length) {
        fetch("/api/db/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: newMails }),
        }).catch(err => console.error(err));
      }

      // RAG async index
      const unindexed = newMails.filter(m => !ragIndexedRef.current.has(m.id));
      if (unindexed.length) {
        unindexed.forEach(m => ragIndexedRef.current.add(m.id));
        fetch("/api/actions/index-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxEmails: 50 }),
        }).catch(e => console.error(e));
      }
    } catch (error) {
      if (error.name === 'AbortError') { if (seq === requestSeqRef.current) setLoading(false); return; } // cancelled — don't update state
      console.error("❌ Error loading emails:", error);
      if (seq === requestSeqRef.current) setFetchError(error instanceof Error ? error.message : 'Failed to load emails');
    }
    if (seq === requestSeqRef.current) setLoading(false);
  };

  useEffect(() => {
    if (!session) return;
    // Only fetch for Gmail-backed folders; local-only views (starred/snoozed/done/calendar/team/analytics)
    // are derived from the cached email list and don't need an API call.
    if (!GMAIL_FOLDERS.has(activeFolder)) return;

    // Abort any in-flight fetch from a previous folder to prevent stale responses
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setEmails([]);
    setNextPageToken(null);
    fetchEmails(activeFolder, null, controller.signal);

    return () => controller.abort(); // cleanup on unmount or re-run
  }, [session, activeFolder]);

  const refreshInbox = async () => {
    if (!GMAIL_FOLDERS.has(activeFolder)) return; // Local-only views don't have a Gmail endpoint
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setEmails([]);
    setNextPageToken(null);
    await fetchEmails(activeFolder, null, controller.signal);
  };

  // ── Memoized values (MUST be above all early returns — Rules of Hooks) ──
  const filteredEmails = useMemo(() => emails.filter((mail) => {
    if (reportedIds.includes(mail.id)) return false;
    if (activeFolder === "starred") return starredIds.includes(mail.id);
    if (activeFolder === "snoozed") return snoozedIds.includes(mail.id);
    if (activeFolder === "done") return doneIds.includes(mail.id);
    if (activeFolder === "inbox") {
      if (snoozedIds.includes(mail.id)) return false;
      if (doneIds.includes(mail.id)) return false;
    }
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const subjectMatch = mail.subject?.toLowerCase().includes(query);
      const snippetMatch = mail.snippet?.toLowerCase().includes(query);
      const fromMatch = mail.from?.toLowerCase().includes(query);
      if (!subjectMatch && !snippetMatch && !fromMatch) return false;
    }
    if (activeTab === "All Mails") return true;
    return getEmailCategory(mail) === activeTab;
  }), [emails, activeFolder, activeTab, searchQuery, starredIds, snoozedIds, doneIds, reportedIds]);

  const burnout = useMemo(() => getBurnoutStats(filteredEmails), [filteredEmails]);

  const sanitizedBody = useMemo(() => {
    if (typeof window === 'undefined') return ''; // DOMPurify requires a DOM — skip during SSR
    return DOMPurify.sanitize(selectedMail?.body || "<p style='font-family:sans-serif;color:#64748B;line-height:1.6;font-size:14px;padding:10px'>No content available</p>", {
      ALLOWED_TAGS: ['p','br','b','i','em','strong','a','ul','ol','li','h1','h2','h3','h4','table','tr','td','th','hr','div','span','blockquote','pre','code'],
      ALLOWED_ATTR: ['href','target','style','class','colspan','rowspan'],
      FORBID_TAGS: ['style','script','iframe','object','embed','form','input','textarea','select','button','link','meta','img'],
      FORBID_ATTR: ['onerror','onload','onclick','onmouseover','formaction','xlink:href','data','src'],
    });
  }, [selectedMail?.body]);

  // ── RENDER: Not logged in → landing ──
  if (!session) {
    return (
      <main className="min-h-screen">
        <ScassiHero3D />
        
        {Header && <Header />}
        
        <Footer />
      </main>
    );
  }

  // ── RENDER: Just logged in → mail loading animation ──
  if (appView === "loading") {
    return <MailLoadingScreen onDone={handleLoadingDone} />;
  }

  // ── RENDER: Logged in but haven't navigated yet → Scasi inbox dashboard ──
  if (appView === "scasi") {
    return (
      <ScasiDashboard
        onNavigate={handleScasiNavigate}
        session={session}
        emailCount={emails.length}
        loadingEmails={loading}
        emails={emails}
      />
    );
  }

  // ── RENDER: User clicked a nav item → full inbox ──

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="inbox-root">

      {/* ══════════════════════════════════════════════════
          TOP NAV BAR
      ══════════════════════════════════════════════════ */}
      <TopNavBar
        session={session}
        onRefresh={refreshInbox}
        onMailOpen={(id, mail) => { openMailAndGenerateAI(id, mail); generateAIPriorityForMail(mail); }}
      />

      {/* ══════════════════════════════════════════════════
          MAIN LAYOUT  (offset 50px for fixed topbar)
      ══════════════════════════════════════════════════ */}
      <div className="main-layout">

        {/* ══ LEFT SIDEBAR ══ */}
        <Sidebar />

        {/* ══ CENTRE: list + detail ══ */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", background: activeFolder === "analytics" ? "#1c1535" : "#FAF8FF" }}>

          {activeFolder === "calendar" ? (
             <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
               <CalendarView onEventClick={(evt) => { if(evt.emailId) setActiveFolder("inbox"); }} />
             </div>
          ) : activeFolder === "team" ? (
             <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
               <TeamCollaboration onEmailClick={(id) => setActiveFolder("inbox")} />
             </div>
          ) : activeFolder === "analytics" ? (
             <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", background: "#1c1535" }}>
               <AnalyticsDashboard />
             </div>
          ) : (
            <>
          {/* ════ EMAIL LIST ════ */}
          <div style={{
            display: selectedMail ? "none" : "flex", flex: 1, flexShrink: 0,
            borderRight: "1px solid #EDE9FE",
            flexDirection: "column",
            background: "#fff", overflow: "hidden",
          }}>

            {/* ── ELITE TRIAGE BANNER ── */}
            {activeFolder === "inbox" && (
              <div style={{ 
                position: "relative", padding: "26px 30px", overflow: "hidden",
                background: "linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)",
                borderBottom: "1px solid #312E81",
              }}>
                {/* Decorative glowing orb effects in the background */}
                <div style={{ position: "absolute", top: -50, right: -50, width: 150, height: 150, background: "#8B5CF6", borderRadius: "50%", filter: "blur(80px)", opacity: 0.3, pointerEvents: "none" }} />
                <div style={{ position: "absolute", bottom: -50, left: 100, width: 200, height: 200, background: "#3B82F6", borderRadius: "50%", filter: "blur(90px)", opacity: 0.2, pointerEvents: "none" }} />

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", position: "relative", zIndex: 1 }}>
                   <div>
                     <div style={{ fontSize: 20, fontFamily: "var(--font-syne), sans-serif", fontWeight: 800, letterSpacing: "-0.02em", display: "flex", gap: 10, alignItems: "center", color: "#F8FAFC", textShadow: "0 2px 10px rgba(0,0,0,0.5)" }}>
                       <span style={{ color: "#A78BFA" }}><Ico.Sparkle /></span> Triage My Inbox
                     </div>
                     <div style={{ fontSize: 13, color: "#94A3B8", marginTop: 6, fontWeight: 500, letterSpacing: "0.01em" }}>
                       Instantly batch analyze your unread queue and receive an elite Morning Briefing.
                     </div>
                   </div>
                   <button 
                     className="btn hover-glow" 
                     onClick={() => { setTriageCollapsed(false); runInboxTriage(); }} 
                     disabled={triageLoading} 
                     style={{ 
                       background: "linear-gradient(135deg, #6366F1, #8B5CF6)", 
                       border: "1px solid rgba(255,255,255,0.1)", color: "#fff", 
                       fontWeight: 800, padding: "12px 24px", borderRadius: 12,
                       boxShadow: "0 4px 15px rgba(139, 92, 246, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
                       transition: "all 0.3s ease", cursor: triageLoading ? "not-allowed" : "pointer",
                       opacity: triageLoading ? 0.7 : 1, transform: triageLoading ? "scale(0.98)" : "scale(1)"
                     }}
                   >
                     <Ico.Zap /> {triageLoading ? "Analyzing Inbox..." : "Run Executive Triage"}
                   </button>
                </div>

                {/* Triage Output / Loading State */}
                {(triageLoading || triageResultBody) && (triageCollapsed && !triageLoading ? (
                  <div onClick={() => setTriageCollapsed(false)} style={{ 
                    position: "relative", zIndex: 1, marginTop: 14, cursor: "pointer",
                    background: "rgba(15, 23, 42, 0.4)", borderRadius: 10, padding: "10px 16px", 
                    border: "1px solid rgba(139, 92, 246, 0.15)", 
                    display: "flex", alignItems: "center", justifyContent: "space-between",
                    transition: "all 0.2s"
                  }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#C4B5FD", letterSpacing: "0.02em" }}>📊 Triage results minimized</span>
                    <span style={{ fontSize: 11, color: "#A78BFA", fontWeight: 600 }}>▼ Expand</span>
                  </div>
                ) : (
                  <div className="anim" style={{ 
                    position: "relative", zIndex: 1, marginTop: 22, 
                    background: "rgba(15, 23, 42, 0.6)", borderRadius: 16, padding: "20px 24px", 
                    border: "1px solid rgba(139, 92, 246, 0.2)", backdropFilter: "blur(12px)",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05), 0 10px 30px rgba(0,0,0,0.2)",
                    maxHeight: "min(300px, 35vh)", overflowY: "auto"
                  }}>
                     {/* Loading */}
                     {triageLoading && (
                       <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                         <div style={{ position: "relative", width: 16, height: 16 }}>
                           <div style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", borderRadius: "50%", background: "#8B5CF6", animation: "inbox-hfm-spin 1s linear infinite" }} />
                           <div style={{ position: "absolute", top: 3, left: 3, width: 10, height: 10, borderRadius: "50%", background: "#C4B5FD" }} />
                         </div>
                         <span style={{ fontSize: 13, fontWeight: 700, color: "#C4B5FD", letterSpacing: "0.02em" }}>
                           {triageStep === 1 ? "Scanning your inbox…" 
                           : triageStep === 2 ? "Identifying priorities & deadlines…" 
                           : "Generating your executive briefing…"}
                         </span>
                       </div>
                     )}

                     {/* Inbox Zero */}
                     {triageResultBody?.kind === "text" && triageResultBody.text === "inbox_zero" && (
                       <div style={{ textAlign: "center", padding: "20px 0" }}>
                         <div style={{ fontSize: 32, marginBottom: 8 }}>🎉</div>
                         <div style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 800, fontSize: 18, color: "#E2E8F0", marginBottom: 6 }}>Inbox Zero!</div>
                         <div style={{ fontSize: 13, color: "#94A3B8" }}>You're all caught up. No urgent tasks or replies needed.</div>
                       </div>
                     )}

                     {/* Structured JSON result */}
                     {triageResultBody?.kind === "stats" && (() => {
                       const { stats, items = [] } = triageResultBody;
                       const urgCfg = {
                         urgent:       { color: "#EF4444", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.25)", label: "ACT NOW", icon: "🔴" },
                         reply_needed: { color: "#F59E0B", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", label: "REPLY NEEDED", icon: "🟡" },
                         fyi:          { color: "#22C55E", bg: "rgba(34,197,94,0.10)",  border: "rgba(34,197,94,0.20)",  label: "FYI", icon: "🟢" },
                       };
                       const findTriageEmail = (item) => filteredEmails.find(m => {
                         const f = (m.from || "").toLowerCase();
                         const s = (m.subject || "").toLowerCase();
                         const iSender = (item.sender || "").toLowerCase();
                         const iSubject = (item.subject || "").toLowerCase();
                         return (iSender && f.includes(iSender)) || (iSubject && s.includes(iSubject));
                       });
                       const groups = ["urgent", "reply_needed", "fyi"];
                       return (
                         <div>
                           {/* Stats Bar */}
                           <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
                             {[
                               { label: `${stats.total} analyzed`, color: "#A78BFA", bg: "rgba(167,139,250,0.12)" },
                               { label: `${stats.urgent} urgent`, color: "#EF4444", bg: "rgba(239,68,68,0.12)" },
                               { label: `${stats.needsReply} need reply`, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
                               { label: `${stats.fyi} FYI`, color: "#22C55E", bg: "rgba(34,197,94,0.10)" },
                             ].map((s) => (
                               <span key={s.label} style={{
                                 fontSize: 11.5, fontWeight: 700, color: s.color, background: s.bg,
                                 padding: "5px 12px", borderRadius: 99, border: `1px solid ${s.color}30`,
                                 letterSpacing: "0.02em"
                               }}>{s.label}</span>
                             ))}
                           </div>

                           {/* Urgency Groups */}
                           {groups.map(urgency => {
                             const groupItems = items.filter(it => it.urgency === urgency);
                             if (groupItems.length === 0) return null;
                             const cfg = urgCfg[urgency] || urgCfg.fyi;
                             return (
                               <div key={urgency} style={{ marginBottom: 16 }}>
                                 <div style={{ fontSize: 10, fontWeight: 800, color: cfg.color, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                                   {cfg.icon} {cfg.label}
                                 </div>
                                 {groupItems.map((item, i) => {
                                   const matchedMail = findTriageEmail(item);
                                   return (
                                     <div key={`${item.subject || ""}-${item.from || ""}-${i}`} style={{
                                       display: "flex", alignItems: "center", gap: 14,
                                       padding: "10px 14px", borderRadius: 10, marginBottom: 6,
                                       background: cfg.bg, border: `1px solid ${cfg.border}`,
                                       transition: "all 0.15s", cursor: matchedMail ? "pointer" : "default",
                                     }}
                                       onClick={() => { if (matchedMail) { openMailAndGenerateAI(matchedMail.id, matchedMail); setTriageResultBody(null); } }}
                                       onMouseOver={e => { if (matchedMail) e.currentTarget.style.background = `${cfg.color}20`; }}
                                       onMouseOut={e => { e.currentTarget.style.background = cfg.bg; }}
                                     >
                                       <div style={{ flex: 1, minWidth: 0 }}>
                                         <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                           <span style={{ fontSize: 12.5, fontWeight: 700, color: "#F1F5F9" }}>{item.sender}</span>
                                           <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.subject}</span>
                                         </div>
                                         <div style={{ fontSize: 13, color: "#E2E8F0", fontWeight: 600, lineHeight: 1.5 }}>
                                           {item.action}
                                         </div>
                                         {item.reason && (
                                           <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 3, fontStyle: "italic" }}>{item.reason}</div>
                                         )}
                                       </div>
                                       {matchedMail && (
                                         <div style={{ flexShrink: 0, fontSize: 11, color: cfg.color, fontWeight: 700, opacity: 0.7 }}>Open →</div>
                                       )}
                                     </div>
                                   );
                                 })}
                               </div>
                             );
                           })}
                         </div>
                       );
                     })()}

                     {/* Fallback: raw text */}
                     {triageResultBody?.kind === "text" && triageResultBody.text !== "inbox_zero" && (
                       <div style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{triageResultBody.text}</div>
                     )}

                     {/* Dismiss / Re-run */}
                     {!triageLoading && triageResultBody && (
                        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end", gap: 8, borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16 }}>
                           <button className="btn" onClick={runInboxTriage} style={{ background: "rgba(139,92,246,0.15)", color: "#A78BFA", border: "1px solid rgba(139,92,246,0.25)", fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
                             ↻ Re-run
                           </button>
                           <button className="btn" onClick={() => setTriageCollapsed(true)} style={{ background: "rgba(255,255,255,0.05)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
                             ▲ Collapse
                           </button>
                           <button className="btn" onClick={() => { setTriageResultBody(null); setTriageCollapsed(false); }} style={{ background: "rgba(255,255,255,0.05)", color: "#94A3B8", border: "1px solid rgba(255,255,255,0.1)", fontSize: 12, padding: "6px 14px", borderRadius: 8 }}>
                             Dismiss
                           </button>
                        </div>
                     )}
                  </div>
                ))}
              </div>
            )}

            {/* list header */}
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <span style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 800, fontSize: 16, color: "#0F172A", textTransform: "capitalize", letterSpacing: "-0.01em" }}>
                  {activeFolder}
                </span>
                <span style={{ fontSize: 11, color: "#64748B", fontWeight: 600, letterSpacing: "0.02em" }}>{filteredEmails.length} messages</span>
              </div>
              {/* category filter pills */}
              <div className="cat-strip" style={{ paddingLeft: 0, paddingRight: 0, marginBottom: 0 }}>
                {CATEGORY_NAV.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveTab(cat.key)}
                    style={{
                      padding: "4px 12px", borderRadius: 99, border: "none",
                      background: activeTab === cat.key ? cat.color : cat.bg,
                      color: activeTab === cat.key ? "#fff" : cat.color,
                      fontWeight: 700, fontSize: 11, cursor: "pointer",
                      fontFamily: "var(--font-dm-sans), sans-serif", whiteSpace: "nowrap",
                      transition: "all .15s ease", flexShrink: 0,
                    }}
                  >
                    {cat.key}
                  </button>
                ))}
              </div>
            </div>

            {/* email rows */}
            <div style={{ flex: 1, overflowY: "auto", background: "#fff" }}>
              {fetchError && (
                <div style={{
                  padding: 24, textAlign: "center",
                  background: "#FEF2F2", borderBottom: "1px solid #FCA5A5",
                }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#DC2626", marginBottom: 10 }}>
                    ⚠️ {fetchError}
                  </div>
                  <button
                    onClick={refreshInbox}
                    style={{
                      padding: "8px 20px", borderRadius: 8, border: "1px solid #FCA5A5",
                      background: "#fff", color: "#DC2626", fontWeight: 700, fontSize: 12,
                      cursor: "pointer", transition: "all 0.2s",
                    }}
                  >
                    ↻ Try Again
                  </button>
                </div>
              )}
              {!fetchError && filteredEmails.length === 0 && (
                <div style={{ padding: 40, textAlign: "center", color: "#94A3B8", fontSize: 13, fontWeight: 500 }}>
                  No emails to display
                </div>
              )}
              {filteredEmails.map((mail, index) => {
                const cat = getEmailCategory(mail);
                const catColor = getCategoryColor(cat);
                const catBg = getCategoryBg(cat);
                const score = getPriorityScore(mail);
                const scoreColor = getPriorityColor(score);
                const isSelected = selectedMail?.id === mail.id;
                const isSpam = isSpamEmail(mail);
                const isNew = isFirstTimeSender(mail, emails);
                const initials = getInitials(mail.from || "");
                const catIcons = { "Do Now": "◈", "Needs Decision": "◨", "Waiting": "◴", "Low Energy": "⬚" };
                const catIcon = catIcons[cat] || "❖";
                const tone = getToneInfo(mail);
                const phishing = getPhishingInfo(mail);

                return (
                  <div
                    key={mail.id + "_" + index}
                    className="mail-row"
                    onClick={() => {
                      openMailAndGenerateAI(mail.id, mail);
                      generateAIPriorityForMail(mail);
                    }}
                    style={{
                      display: "flex", alignItems: "center", gap: 16, padding: "12px 24px 12px 20px",
                      borderBottom: "1px solid #F1F5F9", cursor: "pointer", 
                      background: isNew ? "#F8FAFC" : "#FFFFFF",
                      borderLeft: `4px solid ${scoreColor}`,
                      transition: "background 0.2s ease"
                    }}
                    onMouseOver={e => (e.currentTarget.style.background = "#F1F5F9")}
                    onMouseOut={e => (e.currentTarget.style.background = isNew ? "#F8FAFC" : "#FFFFFF")}
                  >
                    {/* avatar + sender */}
                    <div style={{ width: 220, flexShrink: 0, display: "flex", alignItems: "center", gap: 12, overflow: "hidden" }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: "50%", background: `${catColor}12`, border: `1px solid ${catColor}20`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 11, fontWeight: 800, color: catColor
                      }}>
                        {initials}
                      </div>
                      <span style={{ fontSize: 13, fontWeight: isNew ? 800 : 600, color: "#0F172A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {mail.from?.split("<")[0]?.trim() || mail.from}
                      </span>
                    </div>

                    {/* badges */}
                    <div style={{ width: 230, flexShrink: 0, display: "flex", alignItems: "center", gap: 6 }}>
                        {phishing.isPhishing && !safeIds.includes(mail.id) ? (
                          <span className="pill threat-badge" style={{
                            background: "linear-gradient(90deg, #7F1D1D, #DC2626, #7F1D1D)",
                            backgroundSize: "200% auto",
                            animation: "inbox-threat-glow 1.6s ease-in-out infinite, inbox-threat-shimmer 3s linear infinite",
                            color: "#FEF2F2", fontWeight: 800, border: "1px solid #EF444460",
                            whiteSpace: "nowrap", padding: "4px 10px", fontSize: 10,
                            letterSpacing: "0.04em", textTransform: "uppercase"
                          }}>🚨 Phishing Risk · {phishing.score}</span>
                        ) : isSpam ? (
                          <span className="pill" style={{ background: "#FEF2F2", color: "#B91C1C", fontWeight: 700, border: "1px solid #B91C1C30", whiteSpace: "nowrap", padding: "4px 10px" }}>✕ Spam</span>
                        ) : (
                          <>
                            <span className="pill" style={{ background: "transparent", color: catColor, whiteSpace: "nowrap", fontWeight: 600, border: `1px solid ${catColor}40`, padding: "4px 8px", fontSize: 10 }}>
                              {catIcon} {cat}
                            </span>
                            <span className="pill" style={{ background: "transparent", color: tone.color, fontWeight: 600, border: `1px solid ${tone.color}40`, padding: "4px 8px", fontSize: 10 }}>
                              {tone.icon} {tone.label}
                            </span>
                          </>
                        )}
                        {isNew && <span style={{ fontSize: 9, color: "#1D4ED8", background: "#EFF6FF", padding: "3px 6px", borderRadius: 4, fontWeight: 800, border: "none", letterSpacing: "0.04em" }}>NEW</span>}
                    </div>

                    {/* subject + snippet */}
                    <div style={{ flex: 1, display: "flex", alignItems: "center", minWidth: 0, overflow: "hidden" }}>
                      <div style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 13, fontWeight: isNew ? 700 : 500, color: "#1E293B", marginRight: 8 }}>{mail.subject}</span>
                        <span style={{ fontSize: 13, color: "#64748B", fontWeight: 400 }}>— {mail.snippet}</span>
                      </div>
                    </div>

                    {/* date */}
                    <div style={{ width: 80, flexShrink: 0, textAlign: "right" }}>
                      <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
                        {mail.date ? new Date(mail.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                  </div>
                );
              })}

              {nextPageToken && (
                <div style={{ padding: "8px 10px" }}>
                  <button
                    onClick={loadMoreEmails}
                    disabled={loading}
                    style={{
                      width: "100%", padding: "7px 0", borderRadius: 7, border: "none",
                      background: loading ? "#EDE9FE" : "linear-gradient(135deg,#7C3AED,#8B5CF6)",
                      color: loading ? "#A78BFA" : "#fff",
                      fontWeight: 700, fontSize: 11, cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "var(--font-dm-sans), sans-serif",
                    }}
                  >
                    {loading ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ════ EMAIL DETAIL ════ */}
          {selectedMail && (
            <div style={{ flex: 1, overflowY: "auto", background: "#FAF8FF", padding: "14px 18px", display: "flex", flexDirection: "column" }}>
              <button 
                onClick={() => setSelectedMail(null)}
                style={{ 
                  background: "#EDE9FE", border: "1px solid #DDD6FE", borderRadius: 8, padding: "8px 12px", 
                  color: "#6D28D9", fontSize: 11.5, fontWeight: 700, cursor: "pointer", 
                  display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 15, alignSelf: "flex-start",
                  transition: "all 0.2s"
                }}
              >
                ← Back to Inbox
              </button>
              <Fragment>

                {/* ── ELITE PHISHING ALERT BANNER ── */}
                {(() => {
                  const ph = getPhishingInfo(selectedMail);
                  if (!ph.isPhishing || safeIds.includes(selectedMail.id)) return null;
                  const isHigh = ph.level === "high";
                  // SVG circular gauge
                  const radius = 28, circumference = 2 * Math.PI * radius;
                  const dashOffset = circumference - (ph.score / 100) * circumference;
                  const gaugeColor = isHigh ? "#EF4444" : "#F59E0B";
                  return (
                    <div className="anim" style={{
                      position: "relative", overflow: "hidden",
                      background: isHigh
                        ? "linear-gradient(135deg, rgba(127,29,29,0.95) 0%, rgba(69,10,10,0.98) 100%)"
                        : "linear-gradient(135deg, rgba(120,53,15,0.95) 0%, rgba(69,39,0,0.98) 100%)",
                      border: `1px solid ${gaugeColor}35`,
                      borderRadius: 16, padding: "20px 22px", marginBottom: 16,
                      backdropFilter: "blur(16px)",
                      boxShadow: isHigh
                        ? `0 8px 32px rgba(239,68,68,0.25), inset 0 1px 0 rgba(255,255,255,0.08), 0 0 0 1px rgba(239,68,68,0.1)`
                        : `0 8px 32px rgba(245,158,11,0.2), inset 0 1px 0 rgba(255,255,255,0.06)`
                    }}>
                      {/* Background shimmer stripe */}
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.03) 50%, transparent 60%)", backgroundSize: "200% auto", animation: "inbox-threat-shimmer 4s linear infinite", pointerEvents: "none" }} />

                      {/* Header row: icon + title + gauge */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                          {/* Pulsing icon */}
                          <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
                            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", background: isHigh ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)", animation: "inbox-threat-glow 1.6s ease-in-out infinite" }} />
                            <div style={{ position: "absolute", inset: 6, borderRadius: "50%", background: isHigh ? "#DC2626" : "#D97706", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
                              {isHigh ? "🚨" : "⚠️"}
                            </div>
                          </div>
                          <div>
                            <div style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 900, fontSize: 16, color: "#FFF1F1", letterSpacing: "-0.01em", lineHeight: 1.2 }}>
                              {isHigh ? "PHISHING ALERT" : "SUSPICIOUS EMAIL"}
                            </div>
                            <div style={{ fontSize: 11.5, color: isHigh ? "#FCA5A5" : "#FCD34D", marginTop: 4, fontWeight: 500 }}>
                              Do not click links • Do not share credentials • Do not reply
                            </div>
                          </div>
                        </div>

                        {/* SVG Risk Gauge */}
                        <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                          <svg width={72} height={72} style={{ transform: "rotate(-90deg)" }}>
                            <circle cx={36} cy={36} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
                            <circle cx={36} cy={36} r={radius} fill="none" stroke={gaugeColor} strokeWidth={6}
                              strokeDasharray={circumference} strokeDashoffset={dashOffset}
                              strokeLinecap="round"
                              style={{ filter: `drop-shadow(0 0 6px ${gaugeColor})`, transition: "stroke-dashoffset 1s ease" }}
                            />
                            <text x={36} y={40} textAnchor="middle" style={{ transform: "rotate(90deg)", transformOrigin: "36px 36px" }}
                              fill="#FFF" fontSize={14} fontWeight={900} fontFamily="var(--font-syne), sans-serif">
                              {ph.score}
                            </text>
                          </svg>
                          <div style={{ fontSize: 9, color: "rgba(255,255,255,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: -6 }}>Risk Score</div>
                        </div>
                      </div>

                      {/* Reason Chips */}
                      {ph.reasons.length > 0 && (
                        <div style={{ marginTop: 16, display: "flex", flexWrap: "wrap", gap: 7 }}>
                          {ph.reasons.map((r) => (
                            <span key={r} style={{
                              fontSize: 11, fontWeight: 700,
                              background: "rgba(0,0,0,0.3)",
                              backdropFilter: "blur(8px)",
                              color: isHigh ? "#FECACA" : "#FEF3C7",
                              padding: "5px 11px", borderRadius: 8,
                              border: `1px solid ${isHigh ? "rgba(239,68,68,0.25)" : "rgba(245,158,11,0.25)"}`,
                              display: "flex", alignItems: "center", gap: 5
                            }}>
                              <span style={{ fontSize: 9 }}>⚑</span> {r}
                            </span>
                          ))}
                        </div>
                      )}


                      {/* Safety Tips */}
                      <div style={{ marginTop: 16, padding: '12px 14px', borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>How to Stay Safe</div>
                        {['Never click links from unknown senders', 'Check sender email address carefully for typos', 'Legitimate companies never ask for passwords via email', 'When in doubt, contact the company directly'].map((tip) => (
                          <div key={tip} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)' }}>{'●'}</span>
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', lineHeight: 1.4 }}>{tip}</span>
                          </div>
                        ))}
                      </div>

                      {/* CTA row */}
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", gap: 8, justifyContent: "flex-end" }}>
                        <button onClick={() => { addSafeId(selectedMail.id); }} style={{
                          background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)",
                          color: "rgba(255,255,255,0.65)", fontSize: 11.5, fontWeight: 700,
                          padding: "7px 14px", borderRadius: 8, cursor: "pointer", letterSpacing: "0.02em"
                        }}>
                          ✓ Mark as Safe
                        </button>
                        <button onClick={() => { addReportedId(selectedMail.id); setSelectedMail(null); }} style={{
                          background: isHigh ? "#DC2626" : "#D97706",
                          border: "none", color: "#fff",
                          fontSize: 11.5, fontWeight: 800,
                          padding: "7px 16px", borderRadius: 8, cursor: "pointer",
                          boxShadow: `0 2px 10px ${isHigh ? "rgba(220,38,38,0.4)" : "rgba(217,119,6,0.4)"}`
                        }}>
                          🚩 Report & Remove
                        </button>
                      </div>
                    </div>
                  );
                })()}

                {/* ── TONE BANNER ── */}
                <div className="anim" style={{
                  background: `linear-gradient(135deg, ${getToneInfo(selectedMail).bg}, #fff)`,
                  border: `1px solid ${getToneInfo(selectedMail).color}40`,
                  borderRadius: 9, padding: "8px 12px", marginBottom: 10,
                  display: "flex", alignItems: "center", gap: 8,
                  boxShadow: `0 4px 12px ${getToneInfo(selectedMail).color}15`
                }}>
                  <div style={{ fontSize: 16 }}>{getToneInfo(selectedMail).icon}</div>
                  <div style={{ fontSize: 11.5, color: getToneInfo(selectedMail).color }}>
                    <strong style={{ letterSpacing: "0.03em" }}>Tone: {getToneInfo(selectedMail).label}</strong> — <span>{getToneInfo(selectedMail).msg}</span>
                  </div>
                </div>

                {/* ── EMAIL HEADER ── */}
                <div style={{ marginBottom: 24, padding: "0 8px" }}>
                  <h1 style={{ fontFamily: "var(--font-syne), sans-serif", fontWeight: 800, fontSize: 24, color: "#0F172A", lineHeight: 1.3, marginBottom: 14 }}>
                    {selectedMail.subject}
                  </h1>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
                    <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#F1F5F9", border: "1px solid #E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: "#475569", fontSize: 14 }}>
                        {getInitials(selectedMail.from || "")}
                      </div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: "#1E293B" }}>{selectedMail.from?.split("<")[0]?.trim() || selectedMail.from}</div>
                        <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{selectedMail.date}</div>
                      </div>
                    </div>
                    {/* Minimal Quick Actions */}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button className="btn" onClick={() => toggleStar(selectedMail.id)} disabled={!hasHydrated} style={{ background: starredIds.includes(selectedMail.id) ? "#FEF3C7" : "#fff", padding: "8px 12px", opacity: hasHydrated ? 1 : 0.5 }}><Ico.Star /></button>
                      <button className="btn" onClick={deleteSelectedMail} style={{ padding: "8px 12px" }}><Ico.Trash /></button>
                      <button className="btn" onClick={() => setShowGemini(true)} style={{ color: "#7C3AED", fontWeight: 700, background: "#F5F3FF", borderColor: "#EDE9FE", padding: "8px 14px" }}><Ico.Sparkle /> Ask AI</button>
                    </div>
                  </div>
                </div>

                {/* ── FULL EMAIL CONTENT (MOVED UP FOR IMMEDIATE READING) ── */}
                <div style={{ padding: "0 8px", marginBottom: 32 }}>
                  <iframe
                    sandbox="allow-popups"
                    srcDoc={`<base target="_blank" />${sanitizedBody}`}
                    style={{ width: "100%", height: 500, border: "none", background: "transparent" }}
                  />
                  {/* ── INLINE TEAM ASSIGNMENT & NOTES ── */}
                  <div style={{ marginTop: 16 }}>
                    <EmailTeamPanel emailId={selectedMail.id} onAssigned={() => { setActiveFolder("team"); setAppView("inbox"); }} />
                  </div>
                </div>

                {/* ── SCASI AI COPILOT TOOLBAR ── */}
                <div className="anim" style={{ 
                  background: "#0F172A", borderRadius: 16, padding: "12px 16px", marginBottom: 24, 
                  boxShadow: "0 12px 32px rgba(15,23,42,0.25)", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", 
                  position: "sticky", bottom: 20, zIndex: 10, border: "1px solid #1E293B"
                }}>
                   <div style={{ color: "#E2E8F0", fontWeight: 800, fontSize: 13, padding: "0 8px", display: "flex", alignItems: "center", gap: 8, letterSpacing: "0.02em" }}>
                     <Ico.Sparkle /> SCASI COPILOT
                   </div>
                   <div style={{ width: 1, height: 24, background: "#334155", margin: "0 4px" }} />
                   
                   <button className="btn" onClick={() => runHandleForMe(selectedMail)} disabled={loadingHandleForMe} style={{ background: "linear-gradient(135deg, #A855F7, #7C3AED)", color: "#fff", border: "none", fontWeight: 700 }}>
                     <Ico.Zap /> {loadingHandleForMe ? "Auto-Handling..." : "Auto-Handle"}
                   </button>
                   <button className="btn" onClick={() => generateSummary(selectedMail)} style={{ background: "#1E293B", color: "#F8FAFC", border: "1px solid #334155", fontWeight: 600 }}>
                     📝 Summarize
                   </button>
                   <button className="btn" onClick={() => generateExplanation(selectedMail)} style={{ background: "#1E293B", color: "#F8FAFC", border: "1px solid #334155", fontWeight: 600 }}>
                     🔍 Explain Priority
                   </button>
                   <button className="btn" onClick={generateReply} style={{ background: "#1E293B", color: "#F8FAFC", border: "1px solid #334155", fontWeight: 600 }}>
                     ✍️ Smart Reply
                   </button>
                </div>

                {/* ── DEADLINE ALERT ── */}
                {deadline && (
                  <div className="anim" style={{
                    background: "linear-gradient(135deg,#FFFBEB,#FEF3C7)",
                    border: "1px solid #FDE68A", borderRadius: 9,
                    padding: "8px 12px", marginBottom: 10,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <Ico.Info />
                    <div style={{ fontSize: 11.5, color: "#92400E" }}>
                      <strong>Deadline Detected:</strong>&ensp;{deadline}&ensp;·&ensp;Urgency:&ensp;<strong>{urgency}</strong>
                    </div>
                  </div>
                )}

                {/* ── HANDLE FOR ME RESULT ── */}
                {(handleForMeResult || loadingHandleForMe) && (
                  <div className="anim" style={{ 
                    background: "#FFF", borderRadius: 14, padding: "22px", marginBottom: 24, 
                    border: "1px solid #E2E8F0", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)"
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginBottom: 16, display: "flex", alignItems: "center", gap: 6, letterSpacing: "0.02em" }}>
                      <Ico.Zap /> AUTO-HANDLE RESULT
                    </div>

                    {/* Loading state — honest, no fake steps */}
                    {loadingHandleForMe && (
                      <div style={{
                        background: "linear-gradient(135deg, #F8FAFC, #EFF6FF)", borderRadius: 10, padding: "20px",
                        border: "1px solid #DBEAFE", display: "flex", alignItems: "center", gap: 14,
                      }}>
                        <div style={{ position: "relative", width: 20, height: 20, flexShrink: 0 }}>
                          <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2.5px solid #DBEAFE", borderTopColor: "#3B82F6", animation: "inbox-hfm-spin 0.8s linear infinite" }} />
                        </div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: "#1D4ED8" }}>
                            Analyzing email & drafting response…
                          </div>
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 3 }}>
                            Classifying, summarizing, extracting tasks, and composing a reply
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Structured result card — shown when hfmData is available */}
                    {!loadingHandleForMe && hfmData && (hfmData.category || hfmData.summary || hfmData.tasks?.length > 0) && (
                      <>
                        {/* Row 1: Category badge + Priority bar */}
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, flexWrap: "wrap" }}>
                          {hfmData.category && (
                            <span style={{
                              fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em",
                              padding: "4px 10px", borderRadius: 6,
                              background: hfmData.category === "action_required" ? "rgba(239,68,68,0.1)" : hfmData.category === "follow_up" ? "rgba(245,158,11,0.1)" : "rgba(99,102,241,0.1)",
                              color: hfmData.category === "action_required" ? "#DC2626" : hfmData.category === "follow_up" ? "#D97706" : "#6366F1",
                              border: `1px solid ${hfmData.category === "action_required" ? "#DC262630" : hfmData.category === "follow_up" ? "#D9770630" : "#6366F130"}`,
                            }}>
                              {hfmData.category.replace(/_/g, " ")}
                            </span>
                          )}
                          {hfmData.priority != null && (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
                              <div style={{ flex: 1, height: 5, borderRadius: 99, background: "#F1F5F9", overflow: "hidden", maxWidth: 120 }}>
                                <div style={{
                                  height: "100%", borderRadius: 99, transition: "width 0.6s ease",
                                  width: `${hfmData.priority}%`,
                                  background: hfmData.priority >= 70 ? "linear-gradient(90deg, #EF4444, #DC2626)" : hfmData.priority >= 40 ? "linear-gradient(90deg, #F59E0B, #D97706)" : "linear-gradient(90deg, #22C55E, #16A34A)",
                                }} />
                              </div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>{hfmData.priority}/100</span>
                            </div>
                          )}
                          {hfmData.deadline && (
                            <span style={{ fontSize: 10.5, fontWeight: 600, color: "#92400E", background: "#FFFBEB", padding: "3px 8px", borderRadius: 5, border: "1px solid #FDE68A" }}>
                              ⏰ {hfmData.deadline}
                            </span>
                          )}
                        </div>

                        {/* Summary */}
                        {hfmData.summary && (
                          <div style={{ fontSize: 13.5, color: "#1E293B", lineHeight: 1.65, marginBottom: 14, fontWeight: 500 }}>
                            {hfmData.summary}
                          </div>
                        )}

                        {/* Tasks */}
                        {hfmData.tasks?.length > 0 && (
                          <div style={{ marginBottom: 14 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                              Action Items
                            </div>
                            {hfmData.tasks.map((task, i) => (
                              <label key={`task-${i}-${task.slice(0,20)}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6, cursor: "pointer", fontSize: 13, color: "#334155", lineHeight: 1.5 }}>
                                <input type="checkbox" style={{ marginTop: 3, accentColor: "#7C3AED" }} />
                                {task}
                              </label>
                            ))}
                          </div>
                        )}

                        {/* Follow-up indicator */}
                        {hfmData.followUp && (
                          <div style={{ fontSize: 11, color: "#7C3AED", background: "#F5F3FF", padding: "6px 10px", borderRadius: 6, marginBottom: 14, border: "1px solid #EDE9FE", fontWeight: 600 }}>
                            🔔 Follow-up tracked — "{hfmData.followUp}"
                          </div>
                        )}

                        {/* Divider */}
                        <div style={{ height: 1, background: "#E2E8F0", margin: "4px 0 14px" }} />

                        {/* Draft reply */}
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
                          ✍️ Draft Reply <span style={{ fontWeight: 400, fontSize: 10, textTransform: "none", letterSpacing: 0 }}>(editable)</span>
                        </div>
                        <textarea
                          value={handleForMeResult}
                          onChange={(e) => setHandleForMeResult(e.target.value)}
                          rows={6}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: "#F8FAFC", borderRadius: 8, padding: "12px 14px",
                            fontSize: 13, color: "#1E293B", lineHeight: 1.7,
                            border: "1px solid #CBD5E1", resize: "vertical",
                            fontFamily: "inherit", outline: "none", marginBottom: 12
                          }}
                          onFocus={e => e.target.style.borderColor = "#7C3AED"}
                          onBlur={e => e.target.style.borderColor = "#CBD5E1"}
                        />
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
                          {replySent ? (
                            <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 700, padding: "5px 0" }}>
                              ✅ Reply sent successfully
                            </span>
                          ) : (
                            <button
                              className="btn"
                              onClick={sendDraftReply}
                              disabled={sendingReply}
                              style={{ 
                                background: "linear-gradient(135deg, #10B981, #059669)", 
                                color: "#fff", border: "none", fontWeight: 700,
                                opacity: sendingReply ? 0.7 : 1, padding: "10px 16px" 
                              }}
                            >
                              <Ico.Send /> {sendingReply ? "Sending..." : "Send Reply"}
                            </button>
                          )}
                          <button
                            className="btn"
                            onClick={() => { setHandleForMeResult(""); setHfmData(null); setReplySent(false); }}
                            style={{ background: "#F1F5F9", color: "#475569", border: "none" }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </>
                    )}

                    {/* Fallback: raw text when structured parsing didn't produce hfmData */}
                    {!loadingHandleForMe && handleForMeResult && (!hfmData || (!hfmData.category && !hfmData.summary && (!hfmData.tasks || hfmData.tasks.length === 0))) && (
                      <>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
                          ✍️ AI Response <span style={{ fontWeight: 400, fontSize: 10, textTransform: "none", letterSpacing: 0 }}>(editable)</span>
                        </div>
                        <textarea
                          value={handleForMeResult}
                          onChange={(e) => setHandleForMeResult(e.target.value)}
                          rows={8}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: "#F8FAFC", borderRadius: 8, padding: "14px",
                            fontSize: 13, color: "#1E293B", lineHeight: 1.7,
                            border: "1px solid #CBD5E1", resize: "vertical",
                            fontFamily: "inherit", outline: "none", marginBottom: 12
                          }}
                          onFocus={e => e.target.style.borderColor = "#7C3AED"}
                          onBlur={e => e.target.style.borderColor = "#CBD5E1"}
                        />
                        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
                          {replySent ? (
                            <span style={{ fontSize: 13, color: "#16A34A", fontWeight: 700, padding: "5px 0" }}>
                              ✅ Reply sent successfully
                            </span>
                          ) : (
                            <button className="btn" onClick={sendDraftReply} disabled={sendingReply}
                              style={{ background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", border: "none", fontWeight: 700, opacity: sendingReply ? 0.7 : 1, padding: "10px 16px" }}>
                              <Ico.Send /> {sendingReply ? "Sending..." : "Send Reply"}
                            </button>
                          )}
                          <button className="btn" onClick={() => { setHandleForMeResult(""); setHfmData(null); setReplySent(false); }}
                            style={{ background: "#F1F5F9", color: "#475569", border: "none" }}>
                            Dismiss
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {/* ── PREMIUM INSIGHTS RENDER AREA ── */}
                {(aiSummary || loadingAI || aiReason || aiReply || extractTasks(selectedMail?.snippet || selectedMail?.body || "").length > 0) && (
                  <div className="anim" style={{ marginBottom: 24, padding: "0 8px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                      
                      {/* Left Column: Summary & Reason */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                        {(aiSummary || loadingAI || aiReason) && (
                          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px" }}>
                            {loadingAI && <div style={{ fontSize: 13, color: "#64748B", fontStyle: "italic", animation: "pulse 2s infinite" }}>✨ Generating AI Insights...</div>}
                            
                            {aiSummary && (
                              <div style={{ marginBottom: aiReason ? 16 : 0 }}>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>AI Summary</div>
                                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiSummary}</div>
                              </div>
                            )}
                            {aiReason && (
                              <div>
                                <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>Priority Analysis</div>
                                <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiReason}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {extractTasks(selectedMail?.snippet || selectedMail?.body || "").length > 0 && (
                           <div style={{ background: "#FDF4FF", border: "1px solid #F5D0FE", borderRadius: 12, padding: "16px 20px" }}>
                             <div style={{ fontSize: 11, fontWeight: 800, color: "#C026D3", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}><Ico.Check /> Extracted Tasks</div>
                             {extractTasks(selectedMail?.snippet || selectedMail?.body || "").map((task, i) => (
                               <div key={`extracted-${i}-${task.slice(0,20)}`} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8, fontSize: 13, color: "#701A75", lineHeight: 1.5 }}>
                                 <div style={{ marginTop: 2, flexShrink: 0, width: 14, height: 14, borderRadius: 4, border: "1.5px solid #D946EF", background: "#FDF4FF" }} />
                                 {task}
                               </div>
                             ))}
                           </div>
                        )}
                      </div>

                      {/* Right Column: AI Reply Generator */}
                      {aiReply && (
                        <div style={{ background: "#FFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "16px 20px", display: "flex", flexDirection: "column" }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10, display: "flex", gap: 6, alignItems: "center" }}>
                            <Ico.Send /> Smart Reply Draft
                          </div>
                          <textarea
                            value={editableReply}
                            onChange={e => setEditableReply(e.target.value)}
                            style={{ 
                              flex: 1, width: "100%", background: "#F8FAFC", borderRadius: 8, padding: "14px", 
                              border: "1px solid #CBD5E1", fontSize: 13, color: "#1E293B", lineHeight: 1.6, 
                              resize: "none", outline: "none", minHeight: 180, fontFamily: "inherit", marginBottom: 12
                            }}
                            onFocus={e => e.target.style.borderColor = "#94A3B8"}
                            onBlur={e => e.target.style.borderColor = "#CBD5E1"}
                          />
                          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                            <button
                              className="btn"
                              onClick={() => { navigator.clipboard.writeText(editableReply); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                              style={{ background: copied ? "#059669" : "#fff", color: copied ? "#fff" : "#475569", borderColor: copied ? "#059669" : "#CBD5E1" }}
                            >
                              <Ico.Copy /> {copied ? "Copied!" : "Copy Text"}
                            </button>
                            <button
                              className="btn"
                              onClick={() => sendReply(editableReply)}
                              style={{ background: "#7C3AED", color: "#fff", border: "none", fontWeight: 700 }}
                            >
                              <Ico.Send /> Send Reply
                            </button>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                )}

                {/* ── LINK BUTTON ── */}
                {extractFirstLink(selectedMail?.body || selectedMail?.snippet || "") && (
                  <div className="card anim" style={{ marginBottom: 8 }}>
                    <div className="card-ttl"><Ico.Link /> Email Link</div>
                    <a
                      href={extractFirstLink(selectedMail?.body || selectedMail?.snippet || "") || "#"}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 5,
                        padding: "6px 12px", borderRadius: 7,
                        background: "linear-gradient(135deg,#7C3AED,#8B5CF6)",
                        color: "#fff", textDecoration: "none", fontSize: 11.5, fontWeight: 700,
                        boxShadow: "0 2px 9px rgba(124,58,237,.28)", fontFamily: "var(--font-dm-sans), sans-serif",
                      }}
                    >
                      <Ico.Link /> Open Link from Email
                    </a>
                  </div>
                )}

                {/* ── RELATED EMAILS ── */}
                <div className="card anim" style={{ marginBottom: 8 }}>
                  <div className="card-ttl"><Ico.Inbox /> Related Emails</div>
                  {emails
                    .filter(m => m.id !== selectedMail.id && m.subject?.includes(selectedMail.subject.split(" ")[0]))
                    .slice(0, 3)
                    .map((m) => (
                      <div
                        key={m.id}
                        onClick={() => openMailAndGenerateAI(m.id, m)}
                        style={{
                          padding: "5px 7px", borderRadius: 6, marginBottom: 3,
                          fontSize: 11, color: "#4C1D95", cursor: "pointer",
                          background: "#F5F3FF", border: "1px solid #EDE9FE",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}
                        onMouseOver={e => (e.currentTarget.style.background = "#EDE9FE")}
                        onMouseOut={e => (e.currentTarget.style.background = "#F5F3FF")}
                      >
                        · {m.subject}
                      </div>
                    ))
                  }
                  {emails.filter(m => m.id !== selectedMail.id && m.subject?.includes(selectedMail.subject.split(" ")[0])).length === 0 && (
                    <div style={{ fontSize: 11, color: "#C4B5FD" }}>No related emails found.</div>
                  )}
                </div>

                {/* (Email Content has been moved above the Copilot Toolbar for optimal reading UX) */}

                {/* ── ATTACHMENTS ── */}
                {selectedMail?.attachments?.length > 0 && (
                  <div className="card anim" style={{ marginBottom: 8 }}>
                    <div className="card-ttl">
                      <Ico.Attach /> Attachments ({selectedMail.attachments.length})
                    </div>
                    {selectedMail.attachments.map((file) => (
                      <div
                        key={file.attachmentId}
                        style={{
                          display: "flex", justifyContent: "space-between", alignItems: "center",
                          padding: "7px 9px", background: "#FAF8FF",
                          borderRadius: 7, border: "1px solid #EDE9FE", marginBottom: 5,
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 11.5, color: "#18103A" }}>📎 {file.filename}</div>
                          <div style={{ fontSize: 10, color: "#A78BFA", marginTop: 1 }}>{file.mimeType}</div>
                        </div>
                        <div style={{ display: "flex", gap: 5 }}>
                          <button className="btn" onClick={() => setHoverFile(file)}>
                            <Ico.Eye /> Preview
                          </button>
                          <a
                            href={`/api/gmail/attachment?id=${selectedMail.id}&att=${file.attachmentId}&mime=${file.mimeType}`}
                            target="_blank"
                            style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              padding: "5px 9px", borderRadius: 7, fontSize: 11, fontWeight: 600,
                              background: "#7C3AED", color: "#fff", textDecoration: "none",
                              fontFamily: "var(--font-dm-sans), sans-serif",
                            }}
                          >
                            <Ico.Download /> Download
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── ATTACHMENT PREVIEW MODAL ── */}
                {hoverFile && (
                  <div className="overlay" onClick={() => setHoverFile(null)}>
                    <div className="modal anim" onClick={e => e.stopPropagation()} style={{ width: 520 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div className="modal-ttl" style={{ margin: 0 }}>Preview: {hoverFile.filename}</div>
                        <button className="btn red" onClick={() => setHoverFile(null)} style={{ fontSize: 10.5 }}>✕ Close</button>
                      </div>
                      {hoverFile.mimeType.startsWith("image/") && (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={`/api/gmail/attachment?id=${selectedMail.id}&att=${hoverFile.attachmentId}&mime=${hoverFile.mimeType}`}
                          alt="preview"
                          style={{ width: "100%", height: 320, objectFit: "contain", borderRadius: 9, background: "#FAF8FF" }}
                        />
                      )}
                      {hoverFile.mimeType === "application/pdf" && (
                        <iframe
                          src={`/api/gmail/attachment?id=${selectedMail.id}&att=${hoverFile.attachmentId}&mime=${hoverFile.mimeType}`}
                          style={{ width: "100%", height: 320, border: "none", borderRadius: 9 }}
                        />
                      )}
                      {!hoverFile.mimeType.startsWith("image/") && hoverFile.mimeType !== "application/pdf" && (
                        <div style={{ height: 140, display: "flex", alignItems: "center", justifyContent: "center", color: "#A78BFA", fontSize: 12 }}>
                          Preview not available for this file type.
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </Fragment>
            </div>
          )}
            </>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════
          COMPOSE MODAL
      ══════════════════════════════════════════════════ */}
      {showCompose && (
        <div className="overlay">
          <div className="modal anim">
            <div className="modal-ttl">Compose Email</div>
            <input placeholder="To" className="inp" style={{ marginBottom: 7 }} />
            <input placeholder="Subject" className="inp" style={{ marginBottom: 7 }} />
            <textarea placeholder="Write your email…" rows={5} className="inp" style={{ resize: "vertical", marginBottom: 12 }} />
            <div style={{ display: "flex", gap: 7 }}>
              <button className="ai-btn" style={{ flex: 1, justifyContent: "center" }}>
                <Ico.Send /> Send Email
              </button>
              <button className="btn" onClick={() => setShowCompose(false)} style={{ flex: 1, justifyContent: "center", padding: "8px 0" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          AI FEATURE MODALS
      ══════════════════════════════════════════════════ */}
      {showBurnoutModal && (
        <div className="overlay" onClick={() => setShowBurnoutModal(false)}>
          <div className="modal anim" onClick={e => e.stopPropagation()}>
            <div className="modal-ttl" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Ico.Fire /> Burnout Score Report</div>
            <div style={{ marginBottom: 15, fontSize: 13 }}>
              Here is your AI-analyzed mental wellbeing score based on your inbox activity.
            </div>
            <div style={{ background: "#FAF8FF", padding: 15, borderRadius: 10, border: "1px solid #EDE9FE" }}>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>Stress Score:</span> {burnout.stressScore}/100
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>Stress Level:</span> <span style={{ color: burnout.stressLevel === "High" ? "#DC2626" : burnout.stressLevel === "Medium" ? "#D97706" : "#059669" }}>{burnout.stressLevel}</span>
              </div>
              <div style={{ marginBottom: 10 }}>
                <span style={{ fontWeight: 600 }}>Workload Trend:</span> {burnout.workloadTrend}
              </div>
              <div>
                <span style={{ fontWeight: 600 }}>AI Recommendation:</span> {burnout.recommendation}
              </div>
            </div>
            <button className="btn" onClick={() => setShowBurnoutModal(false)} style={{ marginTop: 15, width: "100%", justifyContent: "center" }}>
              Close
            </button>
          </div>
        </div>
      )}

      {showPriorityModal && (
        <div className="overlay" onClick={() => setShowPriorityModal(false)}>
          <div className="modal anim" onClick={e => e.stopPropagation()}>
            <div className="modal-ttl" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Ico.Zap /> Priority Scoring</div>
            <div style={{ marginBottom: 15, fontSize: 13 }}>
              Your emails have been scored based on urgency. See the red indicators on emails that require immediate attention. AI prioritization is actively running in the background.
            </div>
            <button className="btn pri" onClick={() => setShowPriorityModal(false)} style={{ width: "100%", justifyContent: "center" }}>
              Got It
            </button>
          </div>
        </div>
      )}

      {showSmartReplyModal && (
        <div className="overlay" onClick={() => setShowSmartReplyModal(false)}>
          <div className="modal anim" onClick={e => e.stopPropagation()}>
            <div className="modal-ttl" style={{ display: "flex", alignItems: "center", gap: "8px" }}><Ico.Sparkle /> Smart Reply</div>
            <div style={{ marginBottom: 15, fontSize: 13 }}>
              To use Smart Reply, please click on an email in your inbox to read it. Then click the <strong style={{ color: "#7C3AED" }}>"Generate AI Reply"</strong> button inside the email viewer to have AI draft a response for you.
            </div>
            <button className="btn" onClick={() => setShowSmartReplyModal(false)} style={{ width: "100%", justifyContent: "center" }}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════
          GEMINI / ASK AI MODAL
      ══════════════════════════════════════════════════ */}
      {showGemini && (
        <div className="overlay" onClick={() => setShowGemini(false)}>
          <div onClick={e => e.stopPropagation()}>
            <GeminiSidebar
              selectedMail={selectedMail}
              onSelectEmail={(id) => {
                const mail = emails.find(e => e.id === id);
                if (mail) { setSelectedMail(mail); setShowGemini(false); }
              }}
            />
          </div>
        </div>
      )}
      {/* GLOBAL NOTIFICATION MANAGER */}
      <CalendarNotifier />

    </div>
  );
}
