"use client";

import Ico from "./Icons";
import { useInboxStore } from "@/lib/inboxStore";
import { useShallow } from "zustand/react/shallow";

export default function TopNavBar({ session, onRefresh, onMailOpen }) {
  const {
    searchQuery, setSearchQuery,
    showNotifications, setShowNotifications,
    newMailCount, newMails,
    setAppView, setActiveFolder,
    openMailAndReset,
    setNewMailCount, setNewMails,
    toggleSidebar,
    setShowCompose,
  } = useInboxStore(useShallow((s) => ({
    searchQuery: s.searchQuery,
    setSearchQuery: s.setSearchQuery,
    showNotifications: s.showNotifications,
    setShowNotifications: s.setShowNotifications,
    newMailCount: s.newMailCount,
    newMails: s.newMails,
    setAppView: s.setAppView,
    setActiveFolder: s.setActiveFolder,
    openMailAndReset: s.openMailAndReset,
    setNewMailCount: s.setNewMailCount,
    setNewMails: s.setNewMails,
    toggleSidebar: s.toggleSidebar,
    setShowCompose: s.setShowCompose,
  })));

  return (
    <div className="topbar">
      {/* hamburger + logo */}
      <button className="btn ghost" style={{ padding: "4px 5px" }} onClick={() => toggleSidebar()}>
        <Ico.Menu />
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 6 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <rect width="24" height="24" rx="5" fill="#7C3AED" />
          <path d="M4 8l8 5 8-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
          <rect x="4" y="7" width="16" height="11" rx="2" stroke="#fff" strokeWidth="1.5" fill="none" />
        </svg>
        <span style={{ fontFamily: "var(--font-syne), 'Syne', sans-serif", fontWeight: 800, fontSize: 13, color: "#18103A", letterSpacing: "-.3px" }}>
          Scasi inbox
        </span>
      </div>

      {/* search */}
      <div className="srch" style={{ display: 'flex', gap: '8px', maxWidth: '500px' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <span className="srch-ic"><Ico.Search /></span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search emails, contacts, AI actions…"
            style={{ width: '100%' }}
          />
        </div>
        <button className="btn" onClick={() => { setAppView("inbox"); setActiveFolder("calendar"); }} style={{ flexShrink: 0, padding: "7px 14px", fontSize: 13, background: "#F5F3FF", borderColor: "#DDD6FE", fontWeight: 700, borderRadius: 8 }}>
          📅 Calendar
        </button>
        <button className="btn" onClick={() => { setAppView("inbox"); setActiveFolder("team"); }} style={{ flexShrink: 0, padding: "7px 14px", fontSize: 13, background: "#F5F3FF", borderColor: "#DDD6FE", fontWeight: 700, borderRadius: 8 }}>
          👥 Team
        </button>
      </div>

      <div style={{ flex: 1 }} />

      <button className="btn" onClick={onRefresh}><Ico.Refresh /> Refresh</button>

      {/* notifications */}
      <div style={{ position: "relative" }}>
        <button className="btn" onClick={() => setShowNotifications(!showNotifications)} style={{ padding: "5px 7px", position: "relative" }}>
          <Ico.Bell />
          {newMailCount > 0 && (
            <span style={{
              position: "absolute", top: -3, right: -3,
              background: "#7C3AED", color: "#fff", borderRadius: "50%",
              width: 13, height: 13, fontSize: 7.5, fontWeight: 900,
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "1.5px solid #fff",
            }}>
              {newMailCount}
            </span>
          )}
        </button>
        {showNotifications && (
          <div className="notif-dd anim">
            <div style={{ fontSize: 9.5, fontWeight: 800, color: "#A78BFA", letterSpacing: ".07em", textTransform: "uppercase", marginBottom: 7, padding: "0 3px" }}>
              New Messages
            </div>
            {newMails.length === 0 ? (
              <div style={{ padding: "9px 3px", color: "#A78BFA", fontSize: 11.5, textAlign: "center" }}>
                All caught up ✨
              </div>
            ) : newMails.slice(0, 6).map((m) => (
              <div
                key={m.id}
                onClick={() => {
                  if (onMailOpen) {
                    onMailOpen(m.id, m);
                  } else {
                    openMailAndReset(m);
                  }
                  setShowNotifications(false);
                  setNewMailCount(0);
                  setNewMails([]);
                }}
                style={{ padding: "6px 7px", borderRadius: 6, cursor: "pointer", marginBottom: 2 }}
                onMouseOver={e => (e.currentTarget.style.background = "#F5F3FF")}
                onMouseOut={e => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ fontSize: 11.5, fontWeight: 600, color: "#18103A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.subject}</div>
                <div style={{ fontSize: 10.5, color: "#A78BFA", marginTop: 1 }}>{m.from?.split("<")[0]?.trim()}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button className="btn" onClick={() => setAppView("scasi")} style={{ background: "#F5F3FF", borderColor: "#DDD6FE" }}>
        <Ico.Back /> Dashboard
      </button>

      <button className="ai-btn sm" onClick={() => setShowCompose(true)}>
        <Ico.Edit /> Compose
      </button>

      {/* avatar */}
      <div
        style={{
          width: 28, height: 28, borderRadius: "50%",
          background: "linear-gradient(135deg,#7C3AED,#A78BFA)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 10.5, cursor: "pointer",
          flexShrink: 0, border: "2px solid #DDD6FE",
        }}
      >
        {session?.user?.name?.[0]?.toUpperCase() || "U"}
      </div>
    </div>
  );
}
