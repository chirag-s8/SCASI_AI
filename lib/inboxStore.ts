/**
 * Zustand inbox store — consolidates all useState hooks from app/page.jsx
 * into a single, typed, persistable state manager.
 */
import { create } from "zustand";
import type { Email } from "./emailAnalysis";
import type { HfmParsedData } from "./emailHelpers";

// ─── Types ────────────────────────────────────────────────────────
export type AppView = "landing" | "loading" | "scasi" | "inbox";

/** Discriminated union for triage result body — uses `kind` tag for reliable runtime narrowing */
export type TriageResult =
  | null
  | { kind: "text"; text: string }
  | { kind: "stats"; stats: { total: number; urgent: number; needsReply: number; fyi: number }; items: Array<{ sender: string; subject: string; action: string; reason?: string; urgency: string }> };

export interface InboxState {
  // ── App view ──
  appView: AppView;
  hasShownLoading: boolean;
  setAppView: (view: AppView) => void;
  markLoadingShown: () => void;

  // ── Email data ──
  emails: Email[];
  nextPageToken: string | null;
  loading: boolean;
  selectedMail: Email | null;
  fetchError: string | null;
  setEmails: (emails: Email[] | ((prev: Email[]) => Email[])) => void;
  setNextPageToken: (token: string | null) => void;
  setLoading: (v: boolean) => void;
  setSelectedMail: (mail: Email | null) => void;
  setFetchError: (v: string | null) => void;

  // ── Folder / navigation ──
  activeFolder: string;
  activeTab: string;
  searchQuery: string;
  setActiveFolder: (folder: string) => void;
  setActiveTab: (tab: string) => void;
  setSearchQuery: (query: string) => void;

  // ── Local-persisted sets (starred, snoozed, done) ──
  hasHydrated: boolean;
  starredIds: string[];
  snoozedIds: string[];
  doneIds: string[];
  lastSeenTime: string | null;
  toggleStar: (id: string) => void;
  snoozeMail: (id: string) => void;
  markDone: (id: string) => void;
  setLastSeenTime: (v: string | null) => void;

  // ── AI features ──
  aiSummary: string;
  aiReason: string;
  loadingAI: boolean;
  aiReply: string;
  loadingReply: boolean;
  editableReply: string;
  sendingReply: boolean;
  replySent: boolean;
  aiPriorityMap: Record<string, { priority: number; reason?: string }>;
  setAiSummary: (v: string) => void;
  setAiReason: (v: string) => void;
  setLoadingAI: (v: boolean) => void;
  setAiReply: (v: string) => void;
  setLoadingReply: (v: boolean) => void;
  setEditableReply: (v: string) => void;
  setSendingReply: (v: boolean) => void;
  setReplySent: (v: boolean) => void;
  setAIPriorityMap: (map: Record<string, { priority: number; reason?: string }>) => void;
  updateAIPriority: (id: string, result: { priority: number; reason?: string }) => void;

  // ── Handle-For-Me ──
  handleForMeResult: string;
  loadingHandleForMe: boolean;
  hfmData: HfmParsedData | null;
  setHandleForMeResult: (v: string) => void;
  setLoadingHandleForMe: (v: boolean) => void;
  setHfmData: (data: HfmParsedData | null) => void;

  // ── Triage ──
  triageLoading: boolean;
  triageStep: number;
  triageResultBody: TriageResult;
  triageCollapsed: boolean;
  setTriageLoading: (v: boolean) => void;
  setTriageStep: (v: number) => void;
  setTriageResultBody: (v: TriageResult) => void;
  setTriageCollapsed: (v: boolean) => void;

  // ── Notifications ──
  newMailCount: number;
  showNotifications: boolean;
  newMails: Email[];
  setNewMailCount: (v: number) => void;
  setShowNotifications: (v: boolean) => void;
  setNewMails: (mails: Email[]) => void;

  // ── Modals ──
  showCompose: boolean;
  showGemini: boolean;
  showBurnoutModal: boolean;
  showPriorityModal: boolean;
  showSmartReplyModal: boolean;
  setShowCompose: (v: boolean) => void;
  setShowGemini: (v: boolean) => void;
  setShowBurnoutModal: (v: boolean) => void;
  setShowPriorityModal: (v: boolean) => void;
  setShowSmartReplyModal: (v: boolean) => void;

  // ── UI state ──
  sidebarOpen: boolean;
  hoverFile: string | null;
  copied: boolean;
  deadline: string | null;
  urgency: string;
  setSidebarOpen: (v: boolean) => void;
  toggleSidebar: () => void;
  setHoverFile: (v: string | null) => void;
  setCopied: (v: boolean) => void;
  setDeadline: (v: string | null) => void;
  setUrgency: (v: string) => void;

  // ── Gemini sidebar ──
  geminiQuestion: string;
  geminiReply: string;
  loadingGemini: boolean;
  setGeminiQuestion: (v: string) => void;
  setGeminiReply: (v: string) => void;
  setLoadingGemini: (v: boolean) => void;

  // ── Security ──
  safeIds: string[];
  reportedIds: string[];
  setSafeIds: (ids: string[]) => void;
  setReportedIds: (ids: string[]) => void;
  addSafeId: (id: string) => void;
  addReportedId: (id: string) => void;

  // ── Compound actions ──
  resetMailState: () => void;
  openMailAndReset: (mail: Email) => void;
}

// ─── Helpers for localStorage-backed state ────────────────────────
/** Current user email used to namespace localStorage keys (set during hydration). */
let currentUserEmail: string | null = null;

function scopedKey(key: string): string {
  return currentUserEmail ? `inbox:${currentUserEmail}:${key}` : key;
}

function loadJSON<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const saved = localStorage.getItem(scopedKey(key));
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
}

function saveJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(scopedKey(key), JSON.stringify(value));
  } catch {
    // localStorage may be full or unavailable
  }
}

/** Hydrate localStorage-backed fields on the client after mount.
 *  Call once from a useEffect in the root inbox component to avoid
 *  SSR hydration mismatches. Sets hasHydrated=true when complete so that
 *  persisted-set actions (toggleStar, snoozeMail, markDone) can guard
 *  against overwriting localStorage with empty data during the init race.
 *  @param userEmail — used to namespace localStorage keys per user so that
 *  shared browsers don't bleed state across accounts. */
export function hydratePersistedState(userEmail?: string | null): void {
  if (typeof window === "undefined") return;
  // If the user changed, clear the previous user's state and re-scope keys
  const previousEmail = currentUserEmail;
  if (userEmail && userEmail !== previousEmail) {
    // Reset to defaults before loading the new user's data
    useInboxStore.setState({ starredIds: [], snoozedIds: [], doneIds: [], lastSeenTime: null });
  }
  currentUserEmail = userEmail ?? null;

  // One-time migration: if scoped keys are empty but legacy unscoped keys exist,
  // copy the data over and remove the old keys to avoid silent data loss.
  if (typeof window !== "undefined" && currentUserEmail) {
    const MIGRATION_KEYS = ["starredIds", "snoozedIds", "doneIds", "lastSeenTime"] as const;
    for (const key of MIGRATION_KEYS) {
      const scoped = scopedKey(key);
      if (!localStorage.getItem(scoped)) {
        const legacy = localStorage.getItem(key);
        if (legacy) {
          localStorage.setItem(scoped, legacy);
          localStorage.removeItem(key);
        }
      }
    }
  }

  const starredIds = loadJSON<string[]>("starredIds", []);
  const snoozedIds = loadJSON<string[]>("snoozedIds", []);
  const doneIds = loadJSON<string[]>("doneIds", []);
  const lastSeenTime = loadJSON<string | null>("lastSeenTime", null);
  useInboxStore.setState({ starredIds, snoozedIds, doneIds, lastSeenTime, hasHydrated: true });
}

// ─── Store ────────────────────────────────────────────────────────
export const useInboxStore = create<InboxState>((set) => ({
  // ── App view ──
  appView: "landing",
  hasShownLoading: false,
  setAppView: (view) => set({ appView: view }),
  markLoadingShown: () => set({ hasShownLoading: true }),

  // ── Email data ──
  emails: [],
  nextPageToken: null,
  loading: false,
  selectedMail: null,
  fetchError: null,
  setEmails: (updater) =>
    set((s) => ({
      emails: typeof updater === "function" ? updater(s.emails) : updater,
    })),
  setNextPageToken: (token) => set({ nextPageToken: token }),
  setLoading: (v) => set({ loading: v }),
  setSelectedMail: (mail) => set({ selectedMail: mail }),
  setFetchError: (v) => set({ fetchError: v }),

  // ── Folder / navigation ──
  activeFolder: "inbox",
  activeTab: "All Mails",
  searchQuery: "",
  setActiveFolder: (folder) => set({ activeFolder: folder }),
  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearchQuery: (query) => set({ searchQuery: query }),

  // ── Hydration guard ──
  hasHydrated: false,

  // ── Local-persisted sets (initialized empty; hydrated client-side via hydratePersistedState) ──
  starredIds: [],
  snoozedIds: [],
  doneIds: [],
  lastSeenTime: null,
  setLastSeenTime: (v) =>
    set((s) => {
      if (!s.hasHydrated) return s; // guard: don't overwrite localStorage before hydration
      saveJSON("lastSeenTime", v);
      return { lastSeenTime: v };
    }),
  toggleStar: (id) =>
    set((s) => {
      if (!s.hasHydrated) return s; // guard: don't overwrite localStorage before hydration
      const updated = s.starredIds.includes(id)
        ? s.starredIds.filter((x) => x !== id)
        : [...s.starredIds, id];
      saveJSON("starredIds", updated);
      return { starredIds: updated };
    }),
  snoozeMail: (id) =>
    set((s) => {
      if (!s.hasHydrated) return s; // guard: don't overwrite localStorage before hydration
      const updated = Array.from(new Set([...s.snoozedIds, id]));
      saveJSON("snoozedIds", updated);
      return { snoozedIds: updated, selectedMail: null };
    }),
  markDone: (id) =>
    set((s) => {
      if (!s.hasHydrated) return s; // guard: don't overwrite localStorage before hydration
      const updated = Array.from(new Set([...s.doneIds, id]));
      saveJSON("doneIds", updated);
      return { doneIds: updated, selectedMail: null };
    }),

  // ── AI features ──
  aiSummary: "",
  aiReason: "",
  loadingAI: false,
  aiReply: "",
  loadingReply: false,
  editableReply: "",
  sendingReply: false,
  replySent: false,
  aiPriorityMap: {},
  setAiSummary: (v) => set({ aiSummary: v }),
  setAiReason: (v) => set({ aiReason: v }),
  setLoadingAI: (v) => set({ loadingAI: v }),
  setAiReply: (v) => set({ aiReply: v }),
  setLoadingReply: (v) => set({ loadingReply: v }),
  setEditableReply: (v) => set({ editableReply: v }),
  setSendingReply: (v) => set({ sendingReply: v }),
  setReplySent: (v) => set({ replySent: v }),
  setAIPriorityMap: (map) => set({ aiPriorityMap: map }),
  updateAIPriority: (id, result) =>
    set((s) => ({ aiPriorityMap: { ...s.aiPriorityMap, [id]: result } })),

  // ── Handle-For-Me ──
  handleForMeResult: "",
  loadingHandleForMe: false,
  hfmData: null,
  setHandleForMeResult: (v) => set({ handleForMeResult: v }),
  setLoadingHandleForMe: (v) => set({ loadingHandleForMe: v }),
  setHfmData: (data) => set({ hfmData: data }),

  // ── Triage ──
  triageLoading: false,
  triageStep: 0,
  triageResultBody: null,
  triageCollapsed: false,
  setTriageLoading: (v) => set({ triageLoading: v }),
  setTriageStep: (v) => set({ triageStep: v }),
  setTriageResultBody: (v) => set({ triageResultBody: v }),
  setTriageCollapsed: (v) => set({ triageCollapsed: v }),

  // ── Notifications ──
  newMailCount: 0,
  showNotifications: false,
  newMails: [],
  setNewMailCount: (v) => set({ newMailCount: v }),
  setShowNotifications: (v) => set({ showNotifications: v }),
  setNewMails: (mails) => set({ newMails: mails }),

  // ── Modals ──
  showCompose: false,
  showGemini: false,
  showBurnoutModal: false,
  showPriorityModal: false,
  showSmartReplyModal: false,
  setShowCompose: (v) => set({ showCompose: v }),
  setShowGemini: (v) => set({ showGemini: v }),
  setShowBurnoutModal: (v) => set({ showBurnoutModal: v }),
  setShowPriorityModal: (v) => set({ showPriorityModal: v }),
  setShowSmartReplyModal: (v) => set({ showSmartReplyModal: v }),

  // ── UI state ──
  sidebarOpen: false,
  hoverFile: null,
  copied: false,
  deadline: null,
  urgency: "Normal",
  setSidebarOpen: (v) => set({ sidebarOpen: v }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setHoverFile: (v) => set({ hoverFile: v }),
  setCopied: (v) => set({ copied: v }),
  setDeadline: (v) => set({ deadline: v }),
  setUrgency: (v) => set({ urgency: v }),

  // ── Gemini sidebar ──
  geminiQuestion: "",
  geminiReply: "",
  loadingGemini: false,
  setGeminiQuestion: (v) => set({ geminiQuestion: v }),
  setGeminiReply: (v) => set({ geminiReply: v }),
  setLoadingGemini: (v) => set({ loadingGemini: v }),

  // ── Security ──
  safeIds: [],
  reportedIds: [],
  setSafeIds: (ids) => set({ safeIds: ids }),
  setReportedIds: (ids) => set({ reportedIds: ids }),
  addSafeId: (id) => set((s) => ({ safeIds: Array.from(new Set([...s.safeIds, id])) })),
  addReportedId: (id) => set((s) => ({ reportedIds: Array.from(new Set([...s.reportedIds, id])) })),

  // ── Compound actions ──
  resetMailState: () =>
    set({
      aiSummary: "",
      aiReason: "",
      aiReply: "",
      loadingAI: false,
      loadingReply: false,
      editableReply: "",
      sendingReply: false,
      deadline: null,
      urgency: "Normal",
      handleForMeResult: "",
      hfmData: null,
      loadingHandleForMe: false,
      replySent: false,
      triageLoading: false,
      triageStep: 0,
      triageResultBody: null,
      triageCollapsed: false,
      copied: false,
      fetchError: null,
    }),

  openMailAndReset: (mail) =>
    set({
      selectedMail: mail,
      aiSummary: "",
      aiReason: "",
      aiReply: "",
      loadingAI: false,
      loadingReply: false,
      editableReply: "",
      sendingReply: false,
      deadline: null,
      urgency: "Normal",
      handleForMeResult: "",
      hfmData: null,
      loadingHandleForMe: false,
      replySent: false,
      triageLoading: false,
      triageStep: 0,
      triageResultBody: null,
      triageCollapsed: false,
      copied: false,
    }),
}));
