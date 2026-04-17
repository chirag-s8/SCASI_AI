"use client";

import { signOut } from "next-auth/react";
import Ico from "./Icons";
import { useInboxStore } from "@/lib/inboxStore";
import { useShallow } from "zustand/react/shallow";

// ─── Sidebar navigation config ────────────────────────────────────
const mailNav = [
  { key: "inbox", label: "Inbox", icon: <Ico.Inbox /> },
  { key: "starred", label: "Starred", icon: <Ico.Star /> },
  { key: "snoozed", label: "Snoozed", icon: <Ico.Clock /> },
  { key: "done", label: "Done", icon: <Ico.Check /> },
  { key: "sent", label: "Sent", icon: <Ico.Send /> },
  { key: "drafts", label: "Drafts", icon: <Ico.File /> },
  { key: "archive", label: "Archive", icon: <Ico.Archive /> },
  { key: "spam", label: "Spam", icon: <Ico.Alert /> },
  { key: "trash", label: "Trash", icon: <Ico.Trash /> },
];

const categoryNav = [
  { key: "All Mails", color: "#7C3AED", bg: "#F5F3FF" },
  { key: "Do Now", color: "#DC2626", bg: "#FEF2F2" },
  { key: "Needs Decision", color: "#D97706", bg: "#FFFBEB" },
  { key: "Waiting", color: "#2563EB", bg: "#EFF6FF" },
  { key: "Low Energy", color: "#059669", bg: "#F0FDF4" },
];

export default function Sidebar() {
  const {
    sidebarOpen, setSidebarOpen,
    activeFolder, setActiveFolder,
    activeTab, setActiveTab,
    newMailCount,
    showCompose, setShowCompose,
    showPriorityModal, setShowPriorityModal,
    showSmartReplyModal, setShowSmartReplyModal,
    showBurnoutModal, setShowBurnoutModal,
    setAppView,
  } = useInboxStore(useShallow((s) => ({
    sidebarOpen: s.sidebarOpen,
    setSidebarOpen: s.setSidebarOpen,
    activeFolder: s.activeFolder,
    setActiveFolder: s.setActiveFolder,
    activeTab: s.activeTab,
    setActiveTab: s.setActiveTab,
    newMailCount: s.newMailCount,
    showCompose: s.showCompose,
    setShowCompose: s.setShowCompose,
    showPriorityModal: s.showPriorityModal,
    setShowPriorityModal: s.setShowPriorityModal,
    showSmartReplyModal: s.showSmartReplyModal,
    setShowSmartReplyModal: s.setShowSmartReplyModal,
    showBurnoutModal: s.showBurnoutModal,
    setShowBurnoutModal: s.setShowBurnoutModal,
    setAppView: s.setAppView,
  })));

  return (
    <div className="sb" style={{ width: sidebarOpen ? 200 : 0, minWidth: sidebarOpen ? 200 : 0 }}>
      {/* compose */}
      <div style={{ padding: "10px 8px 6px" }}>
        <button
          onClick={() => { setShowCompose(true); setSidebarOpen(false); }}
          style={{
            width: "100%", padding: "8px 12px", borderRadius: 8, border: "none",
            background: "linear-gradient(135deg,#7C3AED,#8B5CF6)",
            color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12,
            display: "flex", alignItems: "center", gap: 6, justifyContent: "center",
            boxShadow: "0 3px 10px rgba(124,58,237,.35)", whiteSpace: "nowrap",
          }}
        >
          <Ico.Edit /> Compose Mail
        </button>
      </div>

      <div className="sb-lbl">Mail</div>
      {mailNav.map(item => (
        <div
          key={item.key}
          className={`sb-item${activeFolder === item.key ? " on" : ""}`}
          onClick={() => { setActiveFolder(item.key); setSidebarOpen(false); }}
        >
          {item.icon}
          <span style={{ flex: 1 }}>{item.label}</span>
          {item.key === "inbox" && newMailCount > 0 && (
            <span className="sb-badge">{newMailCount}</span>
          )}
        </div>
      ))}

      <div className="sb-lbl" style={{ marginTop: 5 }}>Workspace</div>
      <div className={`sb-item${activeFolder === "calendar" ? " on" : ""}`} onClick={() => { setAppView("inbox"); setActiveFolder("calendar"); setSidebarOpen(false); }}>
        <span style={{ fontSize: "14px", marginRight: "4px" }}>📅</span><span style={{ flex: 1 }}>Calendar</span>
      </div>
      <div className={`sb-item${activeFolder === "team" ? " on" : ""}`} onClick={() => { setAppView("inbox"); setActiveFolder("team"); setSidebarOpen(false); }}>
        <span style={{ fontSize: "14px", marginRight: "4px" }}>👥</span><span style={{ flex: 1 }}>Team Collab</span>
      </div>
      <div className={`sb-item${activeFolder === "analytics" ? " on" : ""}`} onClick={() => { setAppView("inbox"); setActiveFolder("analytics"); setSidebarOpen(false); }}>
        <span style={{ fontSize: "14px", marginRight: "4px" }}>📊</span><span style={{ flex: 1 }}>Analytics</span>
      </div>

      <div className="sb-lbl" style={{ marginTop: 5 }}>Categories</div>
      {categoryNav.map(cat => (
        <div
          key={cat.key}
          className={`sb-item${activeTab === cat.key ? " on" : ""}`}
          onClick={() => { setActiveTab(cat.key); setSidebarOpen(false); }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: cat.color, flexShrink: 0, display: "inline-block" }} />
          <span style={{ flex: 1 }}>{cat.key}</span>
        </div>
      ))}

      <div className="sb-lbl" style={{ marginTop: 5 }}>AI Features</div>
      <div className="sb-item" onClick={() => { setShowPriorityModal(true); setSidebarOpen(false); }}>
        <Ico.Zap /><span style={{ flex: 1 }}>Priority Scoring</span>
        <span className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#A78BFA", flexShrink: 0, display: "inline-block" }} />
      </div>
      <div className="sb-item" onClick={() => { setShowSmartReplyModal(true); setSidebarOpen(false); }}>
        <Ico.Sparkle /><span style={{ flex: 1 }}>Smart Reply</span>
        <span className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#A78BFA", flexShrink: 0, display: "inline-block" }} />
      </div>
      <div className="sb-item" onClick={() => { setShowBurnoutModal(true); setSidebarOpen(false); }}>
        <Ico.Fire /><span style={{ flex: 1 }}>Burnout Score</span>
        <span className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#A78BFA", flexShrink: 0, display: "inline-block" }} />
      </div>

      <div style={{ flex: 1 }} />
      <div style={{ padding: "6px 8px 10px", borderTop: "1px solid rgba(196,181,253,.09)" }}>
        <div className="sb-item" onClick={() => signOut()} style={{ color: "rgba(196,181,253,.55)" }}>
          <Ico.SignOut /><span>Sign out</span>
        </div>
      </div>
    </div>
  );
}
