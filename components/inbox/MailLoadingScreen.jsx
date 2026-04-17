"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────
const MAIL_LINES = [
  { id: "tl", x1: 74, y1: 66, x2: 155, y2: 132 },
  { id: "tr", x1: 326, y1: 66, x2: 245, y2: 132 },
  { id: "bl", x1: 74, y1: 234, x2: 155, y2: 168 },
  { id: "br", x1: 326, y1: 234, x2: 245, y2: 168 },
];
const MAIL_LIFT = -30;

// ─── PurpleOrb ────────────────────────────────────────────────────
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

// ─── EmptyStateEnvelope ───────────────────────────────────────────
export function EmptyStateEnvelope() {
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
      <PurpleOrb visible />
    </motion.div>
  );
}

// ─── MailLoadingScreen ─────────────────────────────────────────────
export default function MailLoadingScreen({ onDone }) {
  const [phase, setPhase] = useState(0);
  const doneRef = useRef(onDone);
  const firedRef = useRef(false);

  useEffect(() => {
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
        <svg viewBox="0 0 400 300" width="120" height="90"
          style={{ position: "absolute", inset: 0, overflow: "visible" }}>
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
