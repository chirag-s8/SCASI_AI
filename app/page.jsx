"use client";

import { useEffect, useState, Fragment, useRef, useCallback } from "react";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Footer from "@/components/Footer";
import ScasiDashboard from "@/components/dashboard/ScasiDashboard";
import CalendarView from "@/components/calendar/CalendarView";
import CalendarNotifier from "@/components/calendar/CalendarNotifier";
import TeamCollaboration from "@/components/team/TeamCollaboration";
import EmailTeamPanel from "@/components/team/EmailTeamPanel";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/dashboard/Header";
import GeminiSidebar from "@/components/GeminiSidebar";
const ScassiHero3D = dynamic(
  () => import("@/components/ScassiHero3D"),
  { ssr: false, loading: () => <div style={{ height: "100vh" }} /> }
);

// ─────────────────────────────────────────────────────────────────
//  MAIL LOADING ANIMATION  (inline — no external file needed)
// ─────────────────────────────────────────────────────────────────

const MAIL_LINES = [
  { id: "tl", x1: 74, y1: 66, x2: 155, y2: 132 },
  { id: "tr", x1: 326, y1: 66, x2: 245, y2: 132 },
  { id: "bl", x1: 74, y1: 234, x2: 155, y2: 168 },
  { id: "br", x1: 326, y1: 234, x2: 245, y2: 168 },
];
const MAIL_LIFT = -30;

function PurpleOrb({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 30 }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        >
          {[28, 21, 15].map((s, i) => (
            <motion.div key={i} style={{
              position: "absolute", width: s, height: s,
              left: "50%", top: "50%", transform: "translate(-50%,-50%)",
              borderRadius: "50%",
              border: `1px solid rgba(120,50,200,${0.22 - i * 0.06})`,
            }}
              animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.6, 0.2] }}
              transition={{ duration: 2.5, delay: i * 0.25, repeat: Infinity }}
            />
          ))}
          <motion.div style={{
            position: "absolute", width: 17, height: 17,
            left: "50%", top: "50%", transform: "translate(-50%,-50%)",
            borderRadius: "50%",
            background: "radial-gradient(circle at 36% 30%, #cc99ff, #8822dd 44%, #5511aa 68%, #2e006e)",
          }}
            animate={{
              boxShadow: [
                "0 0 6px 3px rgba(130,40,210,0.6), 0 0 16px 5px rgba(110,20,190,0.25)",
                "0 0 10px 5px rgba(160,60,240,0.8), 0 0 24px 8px rgba(140,30,220,0.38)",
                "0 0 6px 3px rgba(130,40,210,0.6), 0 0 16px 5px rgba(110,20,190,0.25)",
              ]
            }}
            transition={{ duration: 2.4, repeat: Infinity }}
          >
            <div style={{
              position: "absolute", width: 5, height: 3, borderRadius: "50%",
              background: "radial-gradient(ellipse, rgba(255,255,255,0.75), transparent)",
              top: "20%", left: "18%",
            }} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


// EmptyStateEnvelope — new animated envelope for detail pane empty state
function EmptyStateEnvelope() {
  return (
    <motion.div
      style={{ position: "relative", width: 120, height: 90 }}
      initial={{ scale: 0.7, opacity: 0, y: 10 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg viewBox="0 0 400 300" width="120" height="90"
        style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <filter id="wg-es">
            <feGaussianBlur stdDeviation="2.5" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="bg-es">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <linearGradient id="envFill-es" x1="0" y1="0" x2="0.2" y2="1">
            <stop offset="0%" stopColor="#ede5ff" />
            <stop offset="100%" stopColor="#e2d6f8" />
          </linearGradient>
        </defs>
        <rect x="26" y="22" width="348" height="256" rx="30"
          fill="url(#envFill-es)"
          style={{ filter: "drop-shadow(0 4px 12px rgba(120,50,200,0.10))" }}
        />
        <rect x="26" y="22" width="348" height="256" rx="30"
          fill="none" stroke="#6611bb" strokeWidth="11" strokeLinejoin="round"
          filter="url(#bg-es)"
        />
        {[
          [74, 66, 155, 132], [326, 66, 245, 132],
          [74, 234, 155, 168], [326, 234, 245, 168],
        ].map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#6611bb" strokeWidth="9" strokeLinecap="round"
            filter="url(#wg-es)"
          />
        ))}
      </svg>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", zIndex: 30 }}>
        {[28, 21, 15].map((s, i) => (
          <motion.div key={i} style={{
            position: "absolute", width: s, height: s,
            left: "50%", top: "50%", transform: "translate(-50%,-50%)",
            borderRadius: "50%", border: `1px solid rgba(120,50,200,${0.22 - i * 0.06})`,
          }}
            animate={{ scale: [1, 1.12, 1], opacity: [0.2, 0.6, 0.2] }}
            transition={{ duration: 2.5, delay: i * 0.25, repeat: Infinity }}
          />
        ))}
        <motion.div style={{
          position: "absolute", width: 17, height: 17,
          left: "50%", top: "50%", transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: "radial-gradient(circle at 36% 30%, #cc99ff, #8822dd 44%, #5511aa 68%, #2e006e)",
        }}
          animate={{
            boxShadow: [
              "0 0 6px 3px rgba(130,40,210,0.6), 0 0 16px 5px rgba(110,20,190,0.25)",
              "0 0 10px 5px rgba(160,60,240,0.8), 0 0 24px 8px rgba(140,30,220,0.38)",
              "0 0 6px 3px rgba(130,40,210,0.6), 0 0 16px 5px rgba(110,20,190,0.25)",
            ]
          }} transition={{ duration: 2.4, repeat: Infinity }}>
          <div style={{
            position: "absolute", width: 5, height: 3, borderRadius: "50%",
            background: "radial-gradient(ellipse,rgba(255,255,255,0.75),transparent)",
            top: "20%", left: "18%"
          }} />
        </motion.div>
      </div>
    </motion.div>
  );
}

function MailLoadingScreen({ onDone }) {
  const [phase, setPhase] = useState(0);
  // Store onDone in a ref so the effect never re-runs when the parent re-renders
  const doneRef = useRef(onDone);
  const firedRef = useRef(false);

  useEffect(() => {
    // Runs ONCE on mount — empty deps prevents any loop
    const t1 = setTimeout(() => setPhase(1), 300);
    const t2 = setTimeout(() => setPhase(2), 1050);
    const t3 = setTimeout(() => {
      if (!firedRef.current) {
        firedRef.current = true;
        doneRef.current();
      }
    }, 2200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 99999,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "radial-gradient(ellipse at 55% 40%, #f0e8ff 0%, #f8f2ff 30%, #fdf8ff 65%, #ffffff 100%)",
    }}>
      {/* Faint network lines */}
      <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.13 }}>
        <line x1="15%" y1="8%" x2="82%" y2="62%" stroke="#8833bb" strokeWidth="0.7" />
        <line x1="68%" y1="4%" x2="28%" y2="82%" stroke="#8833bb" strokeWidth="0.7" />
        <line x1="8%" y1="48%" x2="92%" y2="28%" stroke="#8833bb" strokeWidth="0.6" />
        <line x1="48%" y1="2%" x2="88%" y2="88%" stroke="#8833bb" strokeWidth="0.5" />
        <line x1="5%" y1="75%" x2="60%" y2="15%" stroke="#8833bb" strokeWidth="0.5" />
        <circle cx="38%" cy="22%" r="2.5" fill="#8833bb" />
        <circle cx="74%" cy="57%" r="2" fill="#8833bb" />
        <circle cx="54%" cy="78%" r="1.6" fill="#8833bb" />
        <circle cx="18%" cy="62%" r="1.8" fill="#8833bb" />
        <circle cx="86%" cy="18%" r="1.4" fill="#8833bb" />
      </svg>

      {/* Gmail-sized envelope */}
      <motion.div
        style={{ position: "relative", width: 120, height: 90 }}
        initial={{ scale: 0.4, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
      >
        <svg
          viewBox="0 0 400 300"
          width="120" height="90"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}
        >
          <defs>
            <filter id="wg">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="bg">
              <feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <linearGradient id="envFill" x1="0" y1="0" x2="0.2" y2="1">
              <stop offset="0%" stopColor="#ede5ff" />
              <stop offset="100%" stopColor="#e2d6f8" />
            </linearGradient>
          </defs>

          <motion.rect x="26" y="22" width="348" height="256" rx="30"
            fill="url(#envFill)"
            style={{ filter: "drop-shadow(0 4px 12px rgba(120,50,200,0.12))" }}
            initial={{ opacity: 0 }}
            animate={{ opacity: phase >= 2 ? 1 : 0 }}
            transition={{ duration: 0.35 }}
          />

          <motion.rect x="26" y="22" width="348" height="256" rx="30"
            fill="none" stroke="#6611bb" strokeWidth="11" strokeLinejoin="round"
            filter="url(#bg)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={phase >= 2 ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />

          {MAIL_LINES.map((ln, i) => (
            <motion.line key={ln.id}
              x2={ln.x2} y2={ln.y2}
              stroke="#6611bb" strokeWidth="9" strokeLinecap="round"
              filter="url(#wg)"
              initial={{ x1: ln.x1, y1: ln.y1, opacity: 0 }}
              animate={
                phase === 0
                  ? { x1: ln.x1, y1: ln.y1, opacity: 0 }
                  : phase === 1
                    ? {
                      x1: ln.x1, y1: ln.y1 + MAIL_LIFT, opacity: 1,
                      transition: { duration: 0.45, delay: i * 0.06, ease: "easeOut" }
                    }
                    : {
                      x1: ln.x1, y1: ln.y1, opacity: 1,
                      transition: { duration: 0.4, delay: i * 0.05, ease: [0.34, 1.3, 0.64, 1] }
                    }
              }
            />
          ))}
        </svg>

        <PurpleOrb visible={phase >= 2} />
      </motion.div>

      {/* Label */}
      <AnimatePresence>
        {phase >= 2 && (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, delay: 0.45 }}
            style={{
              marginTop: 18, color: "rgba(90,30,160,0.5)", fontSize: 10,
              letterSpacing: "0.28em", textTransform: "uppercase", fontWeight: 500,
              fontFamily: "'SF Pro Display','Segoe UI',system-ui,sans-serif",
            }}
          >
            ✦ &nbsp; Loading your inbox &nbsp; ✦
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
//  HOME — Main export. Controls which view is shown.
//  'landing'  → not logged in  (ScassiHero3D + Header + Dashboard + Footer)
//  'loading'  → just logged in (MailLoadingScreen animation)
//  'scasi' → after loading  (Scasi inbox purple glass dashboard)
//  'inbox'    → clicked any nav (your complete original inbox code)
// ─────────────────────────────────────────────────────────────────

export default function Home() {
  const { data: session } = useSession();
  const router = useRouter();

  useEffect(() => {
    console.log("SESSION:", session);
    if (session?.error === "RefreshAccessTokenError") {
      console.error("Token refresh failed — signing out");
      signOut({ callbackUrl: "/" });
    }
  }, [session]);

  // ── view state to control which screen is shown ──
  const [appView, setAppView] = useState("landing");
  // Track if we've shown the loading animation
  const [hasShownLoading, setHasShownLoading] = useState(false);

  // When session arrives switch from landing → loading animation
  useEffect(() => {
    if (session && appView === "landing" && !hasShownLoading) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional state machine transition
      setAppView("loading");
      setHasShownLoading(true);
    }
  }, [session, appView, hasShownLoading]);

  // Called by MailLoadingScreen when animation finishes — wrapped in useCallback so it never changes reference
  const handleLoadingDone = useCallback(() => {
    setAppView("scasi");
  }, []);

  // Called by ScasiDashboard when user clicks any nav item
  const handleScasiNavigate = (folder) => {
    setActiveFolder(folder);
    setAppView("inbox");
  };

  const [hoverFile, setHoverFile] = useState(null);
  const [geminiQuestion, setGeminiQuestion] = useState("");
  const [geminiReply, setGeminiReply] = useState("");
  const [loadingGemini, setLoadingGemini] = useState(false);

  // 🔔 Notification Count
  const [newMailCount, setNewMailCount] = useState(0);
  // 🔔 Notification Dropdown
  const [showNotifications, setShowNotifications] = useState(false);

  // 🔔 Store New Emails List
  const [newMails, setNewMails] = useState([]);
  // ✅ Toolbar Feature States
  const [showCompose, setShowCompose] = useState(false);
  const [showGemini, setShowGemini] = useState(false);

  const [aiReply, setAiReply] = useState("");
  const [loadingReply, setLoadingReply] = useState(false);
  const [editableReply, setEditableReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replySent, setReplySent] = useState(false);

  // Modals for AI Features
  const [showBurnoutModal, setShowBurnoutModal] = useState(false);
  const [showPriorityModal, setShowPriorityModal] = useState(false);
  const [showSmartReplyModal, setShowSmartReplyModal] = useState(false);

  async function sendDraftReply() {
    if (!selectedMail || !handleForMeResult) return;

    // Extract only the draft reply body from the AI markdown output
    // The orchestrator formats it as: **Draft Reply:**\n<body>\n\n⚠️ Review...
    let draftBody = handleForMeResult;

    // Strategy 1: match **Draft Reply:** heading followed by content
    const draftHeadingMatch = handleForMeResult.match(
      /\*\*Draft Reply:\*\*\s*\n+([\s\S]+?)(?=\n{0,2}⚠️|$)/
    );
    if (draftHeadingMatch) {
      draftBody = draftHeadingMatch[1].trim();
    } else {
      // Strategy 2: match from greeting to end/warning
      const greetingMatch = handleForMeResult.match(
        /(?:^|\n)((?:Dear|Hi|Hello|Good\s+\w+)[\s\S]+?)(?=\n{0,2}⚠️|$)/i
      );
      if (greetingMatch) draftBody = greetingMatch[1].trim();
    }

    // Strip any remaining ⚠️ warning lines
    draftBody = draftBody.replace(/⚠️[^\n]*/g, "").trim();

    // Extract recipient — priority: Reply-To > From (skip if own email or noreply) > To
    // Handles "Display Name <email@domain.com>" and plain "email@domain.com"
    function extractEmailAddr(field) {
      if (!field) return "";
      const bracket = field.match(/<([^>]+@[^>]+)>/);
      if (bracket) return bracket[1].trim().toLowerCase();
      const plain = field.match(/([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/);
      return plain ? plain[1].trim().toLowerCase() : "";
    }

    function isUnreplyable(addr) {
      if (!addr) return true;
      const local = addr.split("@")[0].toLowerCase();
      return (
        local.startsWith("noreply") ||
        local.startsWith("no-reply") ||
        local.startsWith("donotreply") ||
        local.startsWith("do-not-reply") ||
        local === "mailer-daemon" ||
        local === "postmaster"
      );
    }

    const myEmail = (session?.user?.email || "").toLowerCase();
    const replyToAddr = extractEmailAddr(selectedMail.replyTo);
    const fromAddr    = extractEmailAddr(selectedMail.from);
    const toAddr      = extractEmailAddr(selectedMail.to);

    // Pick the first address that is replyable and isn't our own inbox
    const to =
      (replyToAddr && replyToAddr !== myEmail && !isUnreplyable(replyToAddr))
        ? replyToAddr
      : (fromAddr && fromAddr !== myEmail && !isUnreplyable(fromAddr))
        ? fromAddr
      : (toAddr && toAddr !== myEmail && !isUnreplyable(toAddr))
        ? toAddr
        : null;

    if (!to) {
      alert(
        `❌ This email was sent from a no-reply address and cannot be replied to.\n\nFrom: "${selectedMail.from}"\nTo: "${selectedMail.to}"`
      );
      return;
    }

    setSendingReply(true);
    try {
      console.log("🚀 Sending reply with data:", {
        to,
        subject: selectedMail.subject?.substring(0, 50),
        threadId: selectedMail.threadId || selectedMail.id,
        messageId: selectedMail.messageId?.substring(0, 30),
        bodyLength: draftBody.length
      });

      const res = await fetch("/api/gmail/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to,
          subject: selectedMail.subject || "",
          body: draftBody,
          threadId: selectedMail.threadId || selectedMail.id,
          messageId: selectedMail.messageId || "",
        }),
      });
      const data = await res.json();
      
      console.log("📬 Send response:", data);
      
      if (data.success) {
        setReplySent(true);
        console.log("✅ Reply sent successfully to:", to);
      } else {
        alert("❌ Failed to send: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error("❌ Send error:", err);
      alert("❌ Network error: " + err.message);
    }
    setSendingReply(false);
  }

  const [copied, setCopied] = useState(false);
  const [aiPriorityMap, setAiPriorityMap] = useState({});
  const [handleForMeResult, setHandleForMeResult] = useState("");
  const [loadingHandleForMe, setLoadingHandleForMe] = useState(false);
  // ⭐ Starred Emails
  const [starredIds, setStarredIds] = useState(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("starredIds");
    return saved ? JSON.parse(saved) : [];
  });

  // ⏳ Snoozed Emails (hidden temporarily)
  const [snoozedIds, setSnoozedIds] = useState(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("snoozedIds");
    return saved ? JSON.parse(saved) : [];
  });

  const [sidebarOpen, setSidebarOpen] = useState(false);



  // ✅ Done Emails
  const [doneIds, setDoneIds] = useState(() => {
    if (typeof window === "undefined") return [];
    const saved = localStorage.getItem("doneIds");
    return saved ? JSON.parse(saved) : [];
  });

  // ── MODIFIED: activeFolder now initialises from the value set by Scasi inbox nav ──
  const [activeFolder, setActiveFolder] = useState("inbox");

  // Sync activeFolder when inbox view is first entered from Scasi inbox

  // AI States
  const [aiSummary, setAiSummary] = useState("");
  const [aiReason, setAiReason] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);

  const [emails, setEmails] = useState([]);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [loading, setLoading] = useState(false);

  const [selectedMail, setSelectedMail] = useState(null);
  const ragIndexedRef = useRef(false);

  // ✅ FIX 1: Default tab to "All Mails"
  const [activeTab, setActiveTab] = useState("All Mails");

  // 🔍 Search Query
  const [searchQuery, setSearchQuery] = useState("");

  // ✅ Deadline + Urgency Inputs
  const [deadline, setDeadline] = useState("");
  const [urgency, setUrgency] = useState("Normal");

  // ⭐ Toggle Star
  function toggleStar() {
    if (!selectedMail) return;
    setStarredIds((prev) => {
      const updated = prev.includes(selectedMail.id)
        ? prev.filter((id) => id !== selectedMail.id)
        : [...prev, selectedMail.id];
      localStorage.setItem("starredIds", JSON.stringify(updated));
      return updated;
    });
  }

  // ⏳ Snooze Email (hide from inbox)
  function snoozeMail() {
    if (!selectedMail) return;
    setSnoozedIds((prev) => {
      const updated = [...prev, selectedMail.id];
      localStorage.setItem("snoozedIds", JSON.stringify(updated));
      return updated;
    });
    setSelectedMail(null);
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
      const data = await res.json();
      if (data.reply) {
        setGeminiReply(data.reply);
      } else {
        setGeminiReply("❌ Gemini failed: " + data.error);
      }
    } catch (err) {
      console.error("Gemini error:", err);
      setGeminiReply("❌ Network error: " + (err.message || "Failed to reach Gemini"));
    }
    setLoadingGemini(false);
  }

  // ✅ Mark Done (remove from inbox)
  function markDone() {
    if (!selectedMail) return;
    setDoneIds((prev) => {
      const updated = [...prev, selectedMail.id];
      localStorage.setItem("doneIds", JSON.stringify(updated));
      return updated;
    });
    setSelectedMail(null);
  }

  function deleteSelectedMail() {
    if (!selectedMail) {
      alert("❌ Please select an email first");
      return;
    }
    alert("🗑 Delete feature will be connected to Gmail API next");
  }

  const loadEmails = async () => {
    setLoading(true);
    const res = await fetch(
      `/api/gmail${nextPageToken ? `?pageToken=${nextPageToken}` : ""}`
    );
    const data = await res.json();
    // Best-effort persistence to Supabase (keeps existing UI flow intact)
    if (data?.emails?.length) {
      console.log("Syncing emails to Supabase...");
      fetch("/api/db/emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: data.emails }),
      })
        .then(async (res) => {
          const result = await res.json();
          if (result.error) {
            console.error("Supabase API error syncing emails:", result.error);
          } else {
            console.log(`Successfully synced ${result.inserted || 0} emails to Supabase.`);
          }
        })
        .catch(err => console.error('Failed to persist emails:', err));
    }
    setEmails((prev) => {
      const combined = [...prev, ...(data.emails || [])];
      const unique = Array.from(
        new Map(combined.map((mail) => [mail.id, mail])).values()
      );
      return unique;
    });
    setNextPageToken(data.nextPageToken || null);
    setLoading(false);
  };

  // ✅ FIXED: Combined function that fetches email AND generates AI
  const openMailAndGenerateAI = async (id, _mailPreview) => {
    setAiSummary("");
    setAiReason("");
    setAiReply("");
    setLoadingAI(false);
    setDeadline(null);
    setUrgency("");
    setHandleForMeResult("");
    setLoadingHandleForMe(false);
    setReplySent(false);
    const res = await fetch(`/api/gmail/message?id=${id}`);
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
      if (!collected) setHandleForMeResult("No response generated. Please try again.");
    } catch (err) {
      console.error("Handle For Me error:", err);
      setHandleForMeResult("❌ Error: " + (err.message || "Network error"));
    }
    setLoadingHandleForMe(false);
  }

  async function generateReply() {
    console.log("✅ generateReply() running...");
    if (!selectedMail) {
      console.log("❌ No email selected");
      alert("Please select an email first");
      return;
    }
    console.log("📧 Email data:", {
      subject: selectedMail.subject,
      snippet: selectedMail.snippet?.substring(0, 100),
    });
    setLoadingReply(true);
    setAiReply("");
    try {
      console.log("🚀 Sending request to /api/ai/reply...");
      const res = await fetch("/api/ai/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: selectedMail.subject,
          snippet: selectedMail.snippet || selectedMail.body || "",
        }),
      });
      console.log("📥 Response status:", res.status);
      const data = await res.json();
      console.log("📦 Response data:", data);
      if (data.error) {
        console.error("❌ API Error:", data.error);
        alert("Error: " + data.error);
        setLoadingReply(false);
        return;
      }
      setAiReply(data.reply);
      setEditableReply(data.reply);
      console.log("✅ Reply generated successfully!");
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
          snippet: emailContent,
          from: mail.from,
          date: mail.date,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAiSummary("❌ " + data.error);
      } else {
        setAiSummary(data.summary || "No summary generated.");
      }
    } catch (err) {
      console.error("Summary error:", err);
      setAiSummary("❌ Failed to generate summary: " + (err.message || "Network error"));
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
      const data = await res.json();
      if (data.result?.priority) {
        setAiPriorityMap((prev) => ({
          ...prev,
          [mail.id]: data.result,
        }));
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
          snippet: mail.snippet || mail.body || "",
          from: mail.from,
          date: mail.date,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setAiReason("❌ " + data.error);
      } else {
        setAiReason(data.explanation || "No explanation generated.");
      }
    } catch (err) {
      console.error("Explanation error:", err);
      setAiReason("❌ Failed to generate explanation: " + (err.message || "Network error"));
    }
    setLoadingAI(false);
  }

  function extractTasks(text) {
    const lower = text.toLowerCase();
    const tasks = [];
    if (
      lower.includes("payment due") ||
      lower.includes("pay now") ||
      lower.includes("invoice") ||
      lower.includes("bill")
    ) {
      tasks.push("💳 Make the payment");
    }
    if (
      lower.includes("meeting") ||
      lower.includes("zoom") ||
      lower.includes("google meet") ||
      lower.includes("schedule")
    ) {
      tasks.push("📅 Attend the meeting");
    }
    if (
      lower.includes("job") ||
      lower.includes("internship") ||
      lower.includes("interview") ||
      lower.includes("offer letter")
    ) {
      tasks.push("📝 Apply / Respond to recruiter");
    }
    if (lower.includes("deadline") || lower.includes("urgent")) {
      tasks.push("⏰ Take action immediately");
    }
    if (tasks.length === 0) tasks.push("📌 No urgent action required");
    return tasks;
  }

  function extractDeadline(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    if (lower.includes("tomorrow")) return "Tomorrow";
    if (lower.includes("today")) return "Today";
    const match = text.match(/\b(\d{1,2})\s?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i);
    if (match) {
      return match[0];
    }
    const match2 = text.match(/\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/);
    if (match2) {
      return match2[0];
    }
    return null;
  }

  function getUrgencyLevel(deadlineText) {
    if (!deadlineText) return "None";
    if (deadlineText === "Today") return "🔥 Very High";
    if (deadlineText === "Tomorrow") return "⚠️ High";
    return "📌 Medium";
  }

  // ✅ FIX 4: Load emails when session is available
  const fetchEmails = async (folder = activeFolder, token = null) => {
    setLoading(true);
    try {
      const url = token ? `/api/gmail?pageToken=${token}&folder=${folder}` : `/api/gmail?folder=${folder}`;
      const res = await fetch(url);
      const data = await res.json();
      
      const newMails = data.emails || [];
      setEmails(prev => token ? [...prev, ...newMails] : newMails);
      setNextPageToken(data.nextPageToken || null);
      
      const lastSeen = localStorage.getItem("lastSeenTime");
      let count = 0;
      let freshMails = [];
      if (lastSeen) {
        const lastTime = new Date(lastSeen).getTime();
        freshMails = newMails.filter((mail) => new Date(mail.date).getTime() > lastTime);
        count = freshMails.length;
      }
      setNewMails(freshMails);
      setNewMailCount(count);

      // Sync to Supabase
      if (newMails.length) {
        fetch("/api/db/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails: newMails }),
        }).catch(err => console.error(err));
      }

      // RAG async index
      if (!ragIndexedRef.current && newMails.length) {
        ragIndexedRef.current = true;
        fetch("/api/actions/index-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ maxEmails: 50 }),
        }).catch(e => console.error(e));
      }
    } catch (error) {
      console.error("❌ Error loading emails:", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!session) return;
    console.log(`✅ Session found. Loading emails for ${activeFolder}...`);
    setEmails([]);
    setNextPageToken(null);
    fetchEmails(activeFolder, null);
  }, [session, activeFolder]);

  const refreshInbox = async () => {
    setEmails([]);
    setNextPageToken(null);
    await fetchEmails(activeFolder, null);
  };

  function getEmailCategory(mail) {
    const subject = (mail.subject || "").toLowerCase();
    const snippet = (mail.snippet || "").toLowerCase();
    const text = subject + " " + snippet;
    if (
      text.includes("job") ||
      text.includes("intern") ||
      text.includes("interview") ||
      text.includes("apply")
    ) {
      return "Do Now";
    }
    if (
      text.includes("event") ||
      text.includes("meet") ||
      text.includes("schedule") ||
      text.includes("decision")
    ) {
      return "Needs Decision";
    }
    if (
      text.includes("newsletter") ||
      text.includes("update") ||
      text.includes("alert")
    ) {
      return "Waiting";
    }
    return "Low Energy";
  }

  function getPriorityScore(mail) {
    let score = 0;
    const subject = (mail.subject || "").toLowerCase();
    const snippet = (mail.snippet || "").toLowerCase();
    const text = subject + " " + snippet;
    if (
      text.includes("urgent") ||
      text.includes("today") ||
      text.includes("expires")
    )
      score += 50;
    else if (text.includes("tomorrow")) score += 40;
    else if (text.includes("deadline") || text.includes("last date"))
      score += 35;
    if (
      text.includes("job") ||
      text.includes("intern") ||
      text.includes("interview")
    )
      score += 20;
    else if (
      text.includes("payment") ||
      text.includes("invoice") ||
      text.includes("bill")
    )
      score += 18;
    else if (text.includes("meeting") || text.includes("event")) score += 15;
    else score += 5;
    if (mail.date) {
      const receivedDate = new Date(mail.date);
      const now = new Date();
      if (!isNaN(receivedDate.getTime())) {
        const diffHours =
          (now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60);
        if (diffHours < 1) score += 30;
        else if (diffHours < 24) score += 25;
        else if (diffHours < 48) score += 15;
        else score += 5;
      }
    }
    return Math.min(score, 100);
  }

  function getPriorityColor(score) {
    if (score >= 80) return "#DC2626";
    if (score >= 50) return "#D97706";
    return "#059669";
  }

  // ── DISTINCT CATEGORY COLOURS ─────────────────────────────────
  function getCategoryColor(category) {
    if (category === "Do Now") return "#DC2626"; // red
    if (category === "Needs Decision") return "#D97706"; // amber
    if (category === "Waiting") return "#2563EB"; // blue
    if (category === "Low Energy") return "#059669"; // green
    return "#7C3AED";                                    // purple default
  }

  function getCategoryBg(category) {
    if (category === "Do Now") return "#FEF2F2";
    if (category === "Needs Decision") return "#FFFBEB";
    if (category === "Waiting") return "#EFF6FF";
    if (category === "Low Energy") return "#F0FDF4";
    return "#F5F3FF";
  }

  function getBurnoutStats(emails) {
    let stressScore = 0;
    emails.forEach((mail) => {
      const text =
        (mail.subject || "").toLowerCase() +
        " " +
        (mail.snippet || "").toLowerCase();
      if (
        text.includes("urgent") ||
        text.includes("deadline") ||
        text.includes("asap") ||
        text.includes("immediately")
      ) {
        stressScore += 15;
      }
      if (getPriorityScore(mail) > 70) {
        stressScore += 10;
      }
      if (mail.date) {
        const dateObj = new Date(mail.date);
        const hour = dateObj.getHours();
        if (hour >= 23 || hour <= 5) {
          stressScore += 20;
        }
      }
    });
    if (stressScore > 100) stressScore = 100;
    let stressLevel = "Low";
    if (stressScore > 70) stressLevel = "High";
    else if (stressScore > 40) stressLevel = "Medium";
    let workloadTrend = emails.length > 15 ? "Increasing 📈" : "Stable ✅";
    let recommendation =
      stressLevel === "High"
        ? "Delegate or Snooze low-priority emails"
        : "You are managing well";
    return {
      stressScore,
      stressLevel,
      workloadTrend,
      recommendation,
    };
  }

  function isSpamEmail(mail) {
    const subject = (mail.subject || "").toLowerCase();
    const snippet = (mail.snippet || "").toLowerCase();
    const from = (mail.from || "").toLowerCase();
    const text = subject + " " + snippet;
    const spamWords = [
      "free", "offer", "limited time", "unsubscribe", "winner",
      "congratulations", "lottery", "claim", "buy now", "click here",
      "discount", "cash prize",
    ];
    for (let word of spamWords) {
      if (text.includes(word)) return true;
    }
    if (from.includes("noreply") && text.includes("unsubscribe")) {
      return true;
    }
    return false;
  }

  function isFirstTimeSender(mail, allEmails) {
    const sender = mail.from;
    const count = allEmails.filter((m) => m.from === sender).length;
    return count === 1;
  }

  function extractFirstLink(text) {
    if (!text) return null;
    const hrefMatch = text.match(/href=["']([^"']+)["']/i);
    if (hrefMatch && hrefMatch[1] && hrefMatch[1].startsWith("http")) {
      let link = hrefMatch[1];
      const lower = link.toLowerCase();
      if (
        !lower.includes("unsubscribe") &&
        !lower.includes("tracking") &&
        !lower.includes("email-alert") &&
        !lower.includes("manage") &&
        link.length < 500
      ) {
        link = link.replace(/&amp;/g, "&");
        return link;
      }
    }
    const cleanText = text.replace(/<[^>]*>/g, " ");
    const urlRegex = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/g;
    const matches = cleanText.match(urlRegex);
    if (!matches || matches.length === 0) return null;
    const validLinks = matches.filter((url) => {
      const lower = url.toLowerCase();
      return (
        !lower.includes("unsubscribe") &&
        !lower.includes("tracking") &&
        !lower.includes("pixel") &&
        !lower.includes("beacon") &&
        !lower.includes("email.") &&
        !lower.includes("manage") &&
        !lower.includes("email-alert") &&
        url.length < 500
      );
    });
    if (validLinks.length === 0) return null;
    let link = validLinks[0];
    link = link.replace(/[.,;:)\]]+$/, "");
    link = link.replace(/&amp;/g, "&");
    return link;
  }

  function cleanEmailBody(text) {
    return text
      .replace(/<[^>]*>/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/unsubscribe[\s\S]*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  /* ✅ ADD THIS EXACTLY HERE */
  function extractEmail(raw) {
    if (!raw) return "";
    const match = raw.match(/<(.+?)>/);
    if (match) return match[1];
    if (raw.includes("@")) return raw.trim();
    return "";
  }

  // ✅ Helper function to get initials from email
  function getInitials(email) {
    if (!email) return "?";
    const name = email.split("@")[0];
    const parts = name.split(/[._-]/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

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

  // ✅ FIX 3: Proper filtering with BOTH activeTab AND activeFolder
  const filteredEmails = emails.filter((mail) => {
    // 1. Local-only folders (not stored as Gmail labels in this app)
    if (activeFolder === "starred") return starredIds.includes(mail.id);
    if (activeFolder === "snoozed") return snoozedIds.includes(mail.id);
    if (activeFolder === "done") return doneIds.includes(mail.id);

    // 2. Main Inbox hides snoozed and done
    if (activeFolder === "inbox") {
      if (snoozedIds.includes(mail.id)) return false;
      if (doneIds.includes(mail.id)) return false;
    }

    // 3. For standard Gmail folders (drafts, sent, trash, spam, archive), 
    // the backend /api/gmail?folder=... ALREADY returns exactly the right emails!
    // So we don't need to filter them out locally.

    // 🔍 SEARCH FILTER
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      const subjectMatch = mail.subject?.toLowerCase().includes(query);
      const snippetMatch = mail.snippet?.toLowerCase().includes(query);
      const fromMatch = mail.from?.toLowerCase().includes(query);
      if (!subjectMatch && !snippetMatch && !fromMatch) {
        return false;
      }
    }

    if (activeTab === "All Mails") return true;
    return getEmailCategory(mail) === activeTab;
  });

  const burnout = getBurnoutStats(filteredEmails);

  // ── SVG ICON SET (all inline, no external deps) ────────────────
  const Ico = {
    Inbox: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" /></svg>,
    Star: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    Clock: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>,
    Check: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    Send: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>,
    File: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>,
    Archive: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="21 8 21 21 3 21 3 8" /><rect x="1" y="3" width="22" height="5" /><line x1="10" y1="12" x2="14" y2="12" /></svg>,
    Alert: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    Trash: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a1 1 0 011-1h4a1 1 0 011 1v2" /></svg>,
    Edit: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    Back: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></svg>,
    Sparkle: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3z" /></svg>,
    Zap: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>,
    Menu: () => <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></svg>,
    Search: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>,
    Bell: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" /></svg>,
    Refresh: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>,
    Copy: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>,
    Link: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>,
    Eye: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>,
    Download: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>,
    SignOut: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>,
    Fire: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 01-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" /></svg>,
    Info: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>,
    Attach: () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" /></svg>,
  };

  // ── SIDEBAR CONFIG ─────────────────────────────────────────────
  const mailNav = [
    { key: "inbox", label: "Inbox", icon: <Ico.Inbox />, count: newMailCount },
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

  // ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── GLOBAL STYLES ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Syne:wght@600;700;800&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        body { font-family: 'DM Sans', sans-serif; background: #FAF8FF; color: #18103A; font-size: 12.5px; line-height: 1.5; }

        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #C4B5FD; border-radius: 99px; }
        ::-webkit-scrollbar-thumb:hover { background: #A78BFA; }

        /* ─ sidebar ─ */
        .sb { background: #170A35; height: 100%; display: flex; flex-direction: column; overflow: hidden; transition: width .22s cubic-bezier(.4,0,.2,1), min-width .22s cubic-bezier(.4,0,.2,1); border-right: 1px solid rgba(196,181,253,.08); }
        .sb-lbl { font-size: 9px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(167,139,250,.4); padding: 12px 14px 4px; white-space: nowrap; overflow: hidden; }
        .sb-item { display: flex; align-items: center; gap: 8px; padding: 6px 12px; border-radius: 7px; margin: 1px 6px; cursor: pointer; font-size: 12px; font-weight: 500; color: #C4B5FD; white-space: nowrap; overflow: hidden; transition: background .14s, color .14s; position: relative; }
        .sb-item:hover { background: rgba(167,139,250,.12); color: #EDE9FE; }
        .sb-item.on { background: rgba(167,139,250,.18); color: #F5F3FF; font-weight: 600; }
        .sb-item.on::before { content:''; position: absolute; left: 0; top: 22%; bottom: 22%; width: 2px; background: #A78BFA; border-radius: 0 2px 2px 0; }
        .sb-item svg { flex-shrink: 0; opacity: .75; }
        .sb-badge { margin-left: auto; background: #7C3AED; color: #fff; border-radius: 99px; font-size: 8.5px; font-weight: 800; min-width: 15px; height: 15px; padding: 0 3px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        /* ─ topbar ─ */
        .topbar { height: 50px; background: #fff; border-bottom: 1px solid #EDE9FE; display: flex; align-items: center; gap: 8px; padding: 0 14px; flex-shrink: 0; position: fixed; top: 0; left: 0; right: 0; z-index: 1000; box-shadow: 0 1px 0 #EDE9FE; }

        /* ─ search ─ */
        .srch { flex: 1; max-width: 380px; position: relative; }
        .srch input { width: 100%; padding: 6px 10px 6px 28px; border-radius: 7px; border: 1px solid #E2D9F3; background: #FAF8FF; font-size: 12px; font-family: 'DM Sans', sans-serif; color: #18103A; outline: none; transition: border .14s; }
        .srch input:focus { border-color: #A78BFA; box-shadow: 0 0 0 2.5px rgba(167,139,250,.18); }
        .srch-ic { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: #A78BFA; pointer-events: none; display: flex; }

        /* ─ buttons ─ */
        .btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 9px; border-radius: 7px; border: 1px solid #E2D9F3; background: #fff; color: #4C1D95; font-size: 11px; font-weight: 600; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: all .14s; white-space: nowrap; line-height: 1; }
        .btn:hover { background: #F5F3FF; border-color: #C4B5FD; color: #7C3AED; }
        .btn.pri { background: #7C3AED; border-color: #7C3AED; color: #fff; box-shadow: 0 2px 7px rgba(124,58,237,.28); }
        .btn.pri:hover { background: #5B21B6; border-color: #5B21B6; }
        .btn.red { background: #FEF2F2; border-color: #FECACA; color: #DC2626; }
        .btn.red:hover { background: #FEE2E2; }
        .btn.grn { background: #F0FDF4; border-color: #BBF7D0; color: #059669; }
        .btn.grn:hover { background: #DCFCE7; }
        .btn.amb { background: #FFFBEB; border-color: #FDE68A; color: #D97706; }
        .btn.amb:hover { background: #FEF3C7; }
        .btn.ghost { background: transparent; border-color: transparent; }
        .btn.ghost:hover { background: #F5F3FF; border-color: #EDE9FE; }

        /* ─ ai button ─ */
        .ai-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; border-radius: 7px; border: none; background: linear-gradient(135deg,#7C3AED 0%,#8B5CF6 100%); color: #fff; font-size: 11.5px; font-weight: 700; font-family: 'DM Sans', sans-serif; cursor: pointer; box-shadow: 0 2px 9px rgba(124,58,237,.28); transition: all .17s; }
        .ai-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 13px rgba(124,58,237,.36); }
        .ai-btn:active { transform: none; }
        .ai-btn.sm { padding: 4px 9px; font-size: 10.5px; }

        /* ─ cards ─ */
        .card { background: #fff; border: 1px solid #EDE9FE; border-radius: 10px; padding: 12px 14px; }
        .card-pu { background: linear-gradient(135deg,#F5F3FF 0%,#EDE9FE 100%); border: 1px solid #DDD6FE; border-radius: 10px; padding: 12px 14px; }
        .card-ttl { font-size: 11px; font-weight: 700; color: #4C1D95; margin-bottom: 9px; display: flex; align-items: center; gap: 5px; letter-spacing: .01em; }

        /* ─ mail row ─ */
        .mail-row { padding: 8px 12px; border-bottom: 1px solid #F3F0FF; cursor: pointer; transition: background .1s; display: flex; align-items: flex-start; gap: 8px; }
        .mail-row:hover { background: #FAF8FF; }
        .mail-row.sel { background: #F0EBFF; border-left: 2.5px solid #7C3AED; }
        .mail-row:not(.sel) { border-left: 2.5px solid transparent; }

        /* ─ pill ─ */
        .pill { display: inline-flex; align-items: center; padding: 1.5px 6px; border-radius: 99px; font-size: 9.5px; font-weight: 700; }

        /* ─ inputs ─ */
        .inp { width: 100%; padding: 7px 10px; border-radius: 7px; border: 1px solid #E2D9F3; background: #FAF8FF; font-size: 12px; font-family: 'DM Sans', sans-serif; color: #18103A; outline: none; transition: border .14s; }
        .inp:focus { border-color: #A78BFA; box-shadow: 0 0 0 2.5px rgba(167,139,250,.14); }

        /* ─ overlay + modal ─ */
        .overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(15,4,44,.65); backdrop-filter: blur(7px); display: flex; justify-content: center; align-items: center; z-index: 99999; }
        .modal { background: #fff; border-radius: 14px; padding: 20px 22px; box-shadow: 0 18px 52px rgba(124,58,237,.22); border: 1px solid #DDD6FE; width: 460px; max-width: 94vw; }
        .modal-ttl { font-family: 'Syne', sans-serif; font-size: 14px; font-weight: 800; color: #18103A; margin-bottom: 12px; }

        /* ─ notif dropdown ─ */
        .notif-dd { position: absolute; right: 0; top: 38px; width: 280px; background: #fff; border: 1px solid #DDD6FE; border-radius: 11px; box-shadow: 0 9px 28px rgba(124,58,237,.14); z-index: 9999; padding: 9px; }

        /* ─ priority bar ─ */
        .pbar { height: 2.5px; border-radius: 99px; background: #EDE9FE; overflow: hidden; }
        .pbar-fill { height: 100%; border-radius: 99px; }

        /* ─ animations ─ */
        @keyframes sl { from { opacity:0; transform:translateY(5px); } to { opacity:1; transform:translateY(0); } }
        .anim { animation: sl .18s ease forwards; }
        @keyframes pu { 0%,100% { opacity:1; } 50% { opacity:.3; } }
        .pulse { animation: pu 2.2s infinite; }

        /* ─ detail heading ─ */
        .d-hd { font-size: 10px; font-weight: 700; letter-spacing: .07em; text-transform: uppercase; color: #A78BFA; margin-bottom: 7px; }

        /* ─ category filter strip ─ */
        .cat-strip { display: flex; gap: 4px; padding: 0 12px 8px; overflow-x: auto; flex-wrap: nowrap; }
        .cat-strip::-webkit-scrollbar { height: 0; }
      `}</style>

      {/* ══════════════════════════════════════════════════
          TOP NAV BAR
      ══════════════════════════════════════════════════ */}
      <div className="topbar">
        {/* hamburger + logo */}
        <button className="btn ghost" style={{ padding: "4px 5px" }} onClick={() => setSidebarOpen(v => !v)}>
          <Ico.Menu />
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginRight: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="5" fill="#7C3AED" />
            <path d="M4 8l8 5 8-5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="4" y="7" width="16" height="11" rx="2" stroke="#fff" strokeWidth="1.5" fill="none" />
          </svg>
          <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 13, color: "#18103A", letterSpacing: "-.3px" }}>
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

        <button className="btn" onClick={refreshInbox}><Ico.Refresh /> Refresh</button>

        {/* notifications */}
        <div style={{ position: "relative" }}>
          <button className="btn" onClick={() => setShowNotifications(v => !v)} style={{ padding: "5px 7px", position: "relative" }}>
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
              ) : newMails.slice(0, 6).map((m, i) => (
                <div
                  key={i}
                  onClick={() => { openMailAndGenerateAI(m.id, m); setShowNotifications(false); setNewMailCount(0); setNewMails([]); }}
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

      {/* ══════════════════════════════════════════════════
          MAIN LAYOUT  (offset 50px for fixed topbar)
      ══════════════════════════════════════════════════ */}
      <div style={{ display: "flex", height: "100vh", paddingTop: 50, overflow: "hidden" }}>

        {/* ══ LEFT SIDEBAR ══ */}
        <div
          className="sb"
          style={{ width: sidebarOpen ? 200 : 0, minWidth: sidebarOpen ? 200 : 0 }}
        >
          {/* compose */}
          <div style={{ padding: "10px 8px 6px" }}>
            <button
              onClick={() => { setShowCompose(true); setSidebarOpen(false); }}
              style={{
                width: "100%", padding: "8px 12px", borderRadius: 8, border: "none",
                background: "linear-gradient(135deg,#7C3AED,#8B5CF6)",
                color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12,
                fontFamily: "'DM Sans',sans-serif",
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
          <div className={`sb-item${activeFolder === "calendar" ? " on" : ""}`} onClick={() => { setAppView("inbox"); setActiveFolder("calendar"); setSidebarOpen(false); }}><span style={{ fontSize: "14px", marginRight: "4px" }}>📅</span><span style={{ flex: 1 }}>Calendar</span></div>
          <div className={`sb-item${activeFolder === "team" ? " on" : ""}`} onClick={() => { setAppView("inbox"); setActiveFolder("team"); setSidebarOpen(false); }}><span style={{ fontSize: "14px", marginRight: "4px" }}>👥</span><span style={{ flex: 1 }}>Team Collab</span></div>

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
          <div className="sb-item" onClick={() => setShowPriorityModal(true)}><Ico.Zap /><span style={{ flex: 1 }}>Priority Scoring</span><span className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#A78BFA", flexShrink: 0, display: "inline-block" }} /></div>
          <div className="sb-item" onClick={() => setShowSmartReplyModal(true)}><Ico.Sparkle /><span style={{ flex: 1 }}>Smart Reply</span><span className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#A78BFA", flexShrink: 0, display: "inline-block" }} /></div>
          <div className="sb-item" onClick={() => setShowBurnoutModal(true)}><Ico.Fire /><span style={{ flex: 1 }}>Burnout Score</span><span className="pulse" style={{ width: 5, height: 5, borderRadius: "50%", background: "#A78BFA", flexShrink: 0, display: "inline-block" }} /></div>

          <div style={{ flex: 1 }} />
          <div style={{ padding: "6px 8px 10px", borderTop: "1px solid rgba(196,181,253,.09)" }}>
            <div className="sb-item" onClick={() => signOut()} style={{ color: "rgba(196,181,253,.55)" }}>
              <Ico.SignOut /><span>Sign out</span>
            </div>
          </div>
        </div>

        {/* ══ CENTRE: list + detail ══ */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", background: "#FAF8FF" }}>

          {activeFolder === "calendar" ? (
             <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
               <CalendarView onEventClick={(evt) => { if(evt.emailId) setActiveFolder("inbox"); }} />
             </div>
          ) : activeFolder === "team" ? (
             <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden" }}>
               <TeamCollaboration onEmailClick={(id) => setActiveFolder("inbox")} />
             </div>
          ) : (
            <>
          {/* ════ EMAIL LIST ════ */}
          <div style={{
            width: 280, minWidth: 220, flexShrink: 0,
            borderRight: "1px solid #EDE9FE",
            display: "flex", flexDirection: "column",
            background: "#fff", overflow: "hidden",
          }}>

            {/* list header */}
            <div style={{ padding: "9px 12px 0", borderBottom: "1px solid #EDE9FE", background: "#fff" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 7 }}>
                <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 12.5, color: "#18103A", textTransform: "capitalize" }}>
                  {activeFolder}
                </span>
                <span style={{ fontSize: 10, color: "#A78BFA", fontWeight: 600 }}>{filteredEmails.length} msgs</span>
              </div>
              {/* category filter pills */}
              <div className="cat-strip" style={{ paddingLeft: 0, paddingRight: 0, marginBottom: 0 }}>
                {categoryNav.map(cat => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveTab(cat.key)}
                    style={{
                      padding: "2.5px 7px", borderRadius: 99, border: "none",
                      background: activeTab === cat.key ? cat.color : cat.bg,
                      color: activeTab === cat.key ? "#fff" : cat.color,
                      fontWeight: 700, fontSize: 9.5, cursor: "pointer",
                      fontFamily: "'DM Sans',sans-serif", whiteSpace: "nowrap",
                      transition: "all .13s", flexShrink: 0,
                    }}
                  >
                    {cat.key}
                  </button>
                ))}
              </div>
            </div>

            {/* email rows */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {filteredEmails.length === 0 && (
                <div style={{ padding: 20, textAlign: "center", color: "#C4B5FD", fontSize: 11.5 }}>
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

                return (
                  <div
                    key={mail.id + "_" + index}
                    className={`mail-row${isSelected ? " sel" : ""}`}
                    onClick={() => {
                      openMailAndGenerateAI(mail.id, mail);
                      generateAIPriorityForMail(mail);
                    }}
                  >
                    {/* avatar */}
                    <div style={{
                      width: 26, height: 26, borderRadius: "50%",
                      background: `${catColor}18`,
                      border: `1.5px solid ${catColor}40`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, fontSize: 8.5, fontWeight: 800, color: catColor,
                      marginTop: 1,
                    }}>
                      {initials}
                    </div>

                    {/* text */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      {/* from + date */}
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 1.5 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "#18103A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "68%" }}>
                          {mail.from?.split("<")[0]?.trim() || mail.from}
                        </span>
                        <span style={{ fontSize: 9.5, color: "#A78BFA", flexShrink: 0 }}>
                          {mail.date ? new Date(mail.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}
                        </span>
                      </div>
                      {/* subject */}
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#4C1D95", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 2 }}>
                        {mail.subject}
                      </div>
                      {/* snippet */}
                      <div style={{ fontSize: 10.5, color: "#6D28D9", opacity: .55, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3.5 }}>
                        {mail.snippet}
                      </div>
                      {/* tags + priority bar */}
                      <div style={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "nowrap" }}>
                        <span className="pill" style={{ background: catBg, color: catColor }}>{cat}</span>
                        {isSpam && <span className="pill" style={{ background: "#FEF2F2", color: "#DC2626" }}>Spam?</span>}
                        {isNew && <span className="pill" style={{ background: "#EFF6FF", color: "#2563EB" }}>New</span>}
                        {aiPriorityMap[mail.id] && (
                          <span className="pill" style={{ background: "#F5F3FF", color: "#7C3AED" }}>
                            AI·{aiPriorityMap[mail.id].priority}
                          </span>
                        )}
                        <div style={{ flex: 1, minWidth: 16 }}>
                          <div className="pbar">
                            <div className="pbar-fill" style={{ width: `${score}%`, background: scoreColor }} />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {nextPageToken && (
                <div style={{ padding: "8px 10px" }}>
                  <button
                    onClick={loadEmails}
                    disabled={loading}
                    style={{
                      width: "100%", padding: "7px 0", borderRadius: 7, border: "none",
                      background: loading ? "#EDE9FE" : "linear-gradient(135deg,#7C3AED,#8B5CF6)",
                      color: loading ? "#A78BFA" : "#fff",
                      fontWeight: 700, fontSize: 11, cursor: loading ? "not-allowed" : "pointer",
                      fontFamily: "'DM Sans',sans-serif",
                    }}
                  >
                    {loading ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ════ EMAIL DETAIL ════ */}
          <div style={{ flex: 1, overflowY: "auto", background: "#FAF8FF", padding: "14px 18px" }}>
            {!selectedMail ? (
              <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, paddingBottom: 60 }}>
                <EmptyStateEnvelope />
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 14, color: "#18103A" }}>Select an email to read</div>
                  <div style={{ fontSize: 11.5, color: "#A78BFA", marginTop: 3 }}>AI insights appear here automatically</div>
                </div>
              </div>
            ) : (
              <Fragment>

                {/* ── EMAIL HEADER ── */}
                <div className="card anim" style={{ marginBottom: 10 }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 13.5, color: "#18103A", lineHeight: 1.4, marginBottom: 7 }}>
                    {selectedMail.subject}
                  </div>
                  <div style={{ display: "flex", gap: 14, fontSize: 11, color: "#A78BFA", marginBottom: 9, flexWrap: "wrap" }}>
                    <span><strong style={{ color: "#4C1D95", fontWeight: 600 }}>From</strong>&ensp;{selectedMail.from}</span>
                    <span><strong style={{ color: "#4C1D95", fontWeight: 600 }}>Date</strong>&ensp;{selectedMail.date}</span>
                  </div>
                  {/* quick actions */}
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <button
                      className="btn amb"
                      onClick={toggleStar}
                      style={{ background: starredIds.includes(selectedMail.id) ? "#FEF3C7" : undefined, borderColor: starredIds.includes(selectedMail.id) ? "#FCD34D" : undefined }}
                    >
                      <Ico.Star /> {starredIds.includes(selectedMail.id) ? "Starred" : "Star"}
                    </button>
                    <button className="btn" onClick={snoozeMail}><Ico.Clock /> Snooze</button>
                    <button className="btn grn" onClick={markDone}><Ico.Check /> Done</button>
                    <button className="btn red" onClick={deleteSelectedMail}><Ico.Trash /> Delete</button>
                    <button className="btn pri" onClick={() => setShowGemini(true)}><Ico.Sparkle /> Ask AI</button>
                    <button className="ai-btn sm" onClick={() => runHandleForMe(selectedMail)} disabled={loadingHandleForMe}>
                      <Ico.Zap /> {loadingHandleForMe ? "Processing…" : "Handle For Me"}
                    </button>
                  </div>
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
                  <div className="card-pu anim" style={{ marginBottom: 8 }}>
                    <div className="card-ttl"><Ico.Zap /> Handle For Me — AI Analysis</div>

                    {/* Step progress — shown while loading */}
                    {loadingHandleForMe && (
                      <div style={{
                        background: "#F5F3FF", borderRadius: 10, padding: "12px 14px",
                        border: "1px solid #DDD6FE", marginBottom: 8,
                      }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 10, letterSpacing: "0.04em" }}>
                          ⚡ Processing your email…
                        </div>
                        {[
                          { label: "Classify", icon: "🏷️" },
                          { label: "Summarize", icon: "📝" },
                          { label: "Extract Tasks", icon: "✅" },
                          { label: "Draft Reply", icon: "✍️" },
                        ].map((step, i) => {
                          const progress = handleForMeResult.length;
                          const thresholds = [0, 80, 200, 400];
                          const isDone = progress > (thresholds[i + 1] ?? Infinity);
                          const isActive = progress >= thresholds[i] && !isDone;
                          return (
                            <div key={step.label} style={{
                              display: "flex", alignItems: "center", gap: 10,
                              padding: "7px 10px", borderRadius: 8, marginBottom: 5,
                              background: isDone ? "#F0FDF4" : isActive ? "#EFF6FF" : "rgba(255,255,255,0.6)",
                              border: `1px solid ${isDone ? "#BBF7D0" : isActive ? "#BFDBFE" : "#E5E7EB"}`,
                              transition: "all 0.3s ease",
                            }}>
                              <div style={{
                                width: 22, height: 22, borderRadius: "50%", flexShrink: 0,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                background: isDone ? "#16A34A" : isActive ? "#2563EB" : "#E5E7EB",
                              }}>
                                {isDone
                                  ? <span style={{ color: "#fff", fontWeight: 900, fontSize: 12 }}>✓</span>
                                  : isActive
                                    ? <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#fff", display: "block", animation: "hfm-pulse 1.2s ease-in-out infinite" }} />
                                    : <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 700 }}>{i + 1}</span>
                                }
                              </div>
                              <span style={{ fontSize: 12, fontWeight: 600, color: isDone ? "#16A34A" : isActive ? "#2563EB" : "#9CA3AF" }}>
                                {step.icon} {step.label}
                              </span>
                              {isActive && <span style={{ marginLeft: "auto", fontSize: 10, color: "#93C5FD", fontStyle: "italic" }}>running…</span>}
                              {isDone && <span style={{ marginLeft: "auto", fontSize: 10, color: "#86EFAC" }}>done</span>}
                            </div>
                          );
                        })}
                        {handleForMeResult && (
                          <div style={{
                            marginTop: 8, padding: "8px 10px", borderRadius: 7,
                            background: "rgba(255,255,255,0.7)", border: "1px solid #DDD6FE",
                            fontSize: 10.5, color: "#7C3AED", lineHeight: 1.6,
                            maxHeight: 56, overflow: "hidden",
                            maskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                            WebkitMaskImage: "linear-gradient(to bottom, black 50%, transparent 100%)",
                          }}>
                            {handleForMeResult.slice(0, 200)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Editable reply — shown after loading completes */}
                    {handleForMeResult && !loadingHandleForMe && (
                      <>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#7C3AED", marginBottom: 6, display: "flex", alignItems: "center", gap: 5 }}>
                          ✍️ Draft Reply <span style={{ fontWeight: 400, color: "#A78BFA", fontSize: 10 }}>(editable)</span>
                        </div>
                        <textarea
                          value={handleForMeResult}
                          onChange={(e) => setHandleForMeResult(e.target.value)}
                          rows={8}
                          style={{
                            width: "100%", boxSizing: "border-box",
                            background: "#fff", borderRadius: 8, padding: "10px 12px",
                            fontSize: 12, color: "#1e1b4b", lineHeight: 1.7,
                            border: "1.5px solid #DDD6FE", resize: "vertical",
                            fontFamily: "inherit", outline: "none",
                          }}
                          onFocus={e => e.target.style.borderColor = "#7C3AED"}
                          onBlur={e => e.target.style.borderColor = "#DDD6FE"}
                        />
                        <div style={{ marginTop: 8, display: "flex", gap: 6, alignItems: "center" }}>
                          {replySent ? (
                            <span style={{ fontSize: 12, color: "#16A34A", fontWeight: 700, padding: "5px 0" }}>
                              ✅ Reply sent successfully
                            </span>
                          ) : (
                            <button
                              className="ai-btn sm"
                              onClick={sendDraftReply}
                              disabled={sendingReply}
                              style={{ opacity: sendingReply ? 0.7 : 1 }}
                            >
                              <Ico.Send /> {sendingReply ? "Sending…" : "Send Reply"}
                            </button>
                          )}
                          <button
                            className="btn"
                            onClick={() => { setHandleForMeResult(""); setReplySent(false); }}
                            style={{ fontSize: 11 }}
                          >
                            Dismiss
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
                <style>{`@keyframes hfm-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.85)} }`}</style>

                {/* ── AI SUMMARY + WHY IMPORTANT ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  <div className="card-pu anim">
                    <div className="card-ttl"><Ico.Sparkle /> AI Summary</div>
                    <button className="ai-btn sm" onClick={() => generateSummary(selectedMail)} style={{ marginBottom: 7 }}>
                      Generate Summary
                    </button>
                    <div style={{
                      background: "#fff", borderRadius: 7, padding: "8px 10px",
                      fontSize: 11, color: "#4C1D95", lineHeight: 1.65,
                      border: "1px solid #DDD6FE", minHeight: 48, whiteSpace: "pre-wrap",
                    }}>
                      {loadingAI
                        ? <span style={{ color: "#A78BFA" }}>Generating…</span>
                        : aiSummary || <span style={{ color: "#C4B5FD" }}>Click to generate</span>}
                    </div>
                  </div>

                  <div className="card-pu anim">
                    <div className="card-ttl"><Ico.Zap /> Why Important?</div>
                    <button className="ai-btn sm" onClick={() => generateExplanation(selectedMail)} style={{ marginBottom: 7 }}>
                      Explain Importance
                    </button>
                    <div style={{
                      background: "#fff", borderRadius: 7, padding: "8px 10px",
                      fontSize: 11, color: "#4C1D95", lineHeight: 1.65,
                      border: "1px solid #DDD6FE", minHeight: 48, whiteSpace: "pre-wrap",
                    }}>
                      {aiReason || <span style={{ color: "#C4B5FD" }}>Click to explain</span>}
                    </div>
                  </div>
                </div>

                {/* ── TASKS + BURNOUT ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  {/* tasks */}
                  <div className="card anim">
                    <div className="card-ttl"><Ico.Check /> Tasks Extracted</div>
                    {extractTasks(selectedMail?.snippet || selectedMail?.body || "").map((task, i) => (
                      <div key={i} style={{
                        display: "flex", alignItems: "flex-start", gap: 5,
                        padding: "5px 7px", borderRadius: 6, background: "#F5F3FF",
                        marginBottom: 4, fontSize: 11, color: "#4C1D95",
                        border: "1px solid #EDE9FE",
                      }}>
                        <span style={{ color: "#7C3AED", marginTop: 1, flexShrink: 0 }}>◆</span>{task}
                      </div>
                    ))}
                  </div>

                  {/* burnout */}
                  <div className="card anim">
                    <div className="card-ttl"><Ico.Fire /> Burnout Dashboard</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 7 }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: "50%",
                        background: `conic-gradient(${burnout.stressLevel === "High" ? "#DC2626" : burnout.stressLevel === "Medium" ? "#D97706" : "#059669"} ${burnout.stressScore * 3.6}deg, #EDE9FE 0deg)`,
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 800, color: "#18103A" }}>
                          {burnout.stressScore}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, fontWeight: 700, color: "#18103A" }}>{burnout.stressLevel} Stress</div>
                        <div style={{ fontSize: 10.5, color: "#A78BFA", marginTop: 1 }}>{burnout.workloadTrend}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: "#4C1D95", padding: "6px 8px", background: "#F5F3FF", borderRadius: 6, lineHeight: 1.55, border: "1px solid #EDE9FE" }}>
                      💡 {burnout.recommendation}
                    </div>
                  </div>
                </div>

                {/* ── AI REPLY GENERATOR ── */}
                <div className="card anim" style={{ marginBottom: 8 }}>
                  <div className="card-ttl"><Ico.Send /> AI Reply Generator</div>
                  <button className="ai-btn" onClick={generateReply} style={{ marginBottom: aiReply ? 9 : 0 }}>
                    <Ico.Sparkle /> {loadingReply ? "Generating…" : "Generate Reply"}
                  </button>

                  {aiReply && (
                    <div className="anim">
                      <div style={{
                        background: "#F5F3FF", borderRadius: 7, padding: "8px 10px",
                        fontSize: 11, color: "#4C1D95", lineHeight: 1.65,
                        border: "1px solid #DDD6FE", marginBottom: 8, whiteSpace: "pre-wrap",
                      }}>
                        {aiReply}
                      </div>
                      <div style={{ border: "1px solid #EDE9FE", borderRadius: 8, padding: 10 }}>
                        <div style={{ fontSize: 10.5, fontWeight: 700, color: "#4C1D95", marginBottom: 6 }}>Edit reply before sending</div>
                        <textarea
                          value={editableReply}
                          onChange={e => setEditableReply(e.target.value)}
                          rows={4}
                          className="inp"
                          style={{ resize: "vertical", marginBottom: 7 }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <button
                            className="btn pri"
                            onClick={() => { navigator.clipboard.writeText(editableReply); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                            style={{ background: copied ? "#059669" : undefined, borderColor: copied ? "#059669" : undefined }}
                          >
                            <Ico.Copy /> {copied ? "Copied!" : "Copy"}
                          </button>
                          <button
                            className="btn pri"
                            onClick={async () => {
                              if (!selectedMail) return alert("Select email first");
                              const recipient = extractEmail(selectedMail.from);
                              if (!recipient) { alert("❌ Cannot reply: No valid recipient email found"); return; }
                              const res = await fetch("/api/gmail/reply", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  to: recipient,
                                  subject: selectedMail.subject,
                                  body: editableReply,
                                  threadId: selectedMail.threadId,
                                  originalMessageId: selectedMail.messageId,
                                }),
                              });
                              const data = await res.json();
                              alert(data.success ? "✅ Reply Sent Successfully!" : "❌ Error: " + data.error);
                            }}
                          >
                            <Ico.Send /> Reply Now
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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
                        boxShadow: "0 2px 9px rgba(124,58,237,.28)", fontFamily: "'DM Sans',sans-serif",
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

                {/* ── FULL EMAIL CONTENT ── */}
                <div className="card anim" style={{ marginBottom: 8 }}>
                  <div className="card-ttl"><Ico.File /> Full Email Content</div>
                  <iframe
                    srcDoc={`<base target="_blank" />${selectedMail?.body || "<p style='font-family:sans-serif;color:#aaa;font-size:12px;padding:10px'>No content available</p>"}`}
                    style={{ width: "100%", height: 540, border: "1px solid #EDE9FE", borderRadius: 8, background: "#fff" }}
                  />
                  
                  {/* ── INLINE TEAM ASSIGNMENT & NOTES ── */}
                  <EmailTeamPanel 
                    emailId={selectedMail.id} 
                    onAssigned={() => { setActiveFolder("team"); setAppView("inbox"); }} 
                  />
                </div>

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
                              fontFamily: "'DM Sans',sans-serif",
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
            )}
          </div>
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

    </>
  );
}