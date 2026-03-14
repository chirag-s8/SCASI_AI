"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    motion,
    useInView,
    useScroll,
    useTransform,
    AnimatePresence,
} from "framer-motion";
import { signIn } from "next-auth/react";
import {
    Mail, Star, Send, ChevronRight, Sparkles,
    Calendar, Info, Reply, X,
    Brain, Shield, Clock, Zap, AlertTriangle,
    Gem, BarChart2, Bell, User, Flame,
    FileText, Briefcase, Activity, Lock,
    MessageSquare, CheckCircle,
    LayoutGrid, Eye,
} from "lucide-react";

/* ════════════════════════════════════════════════════════════
   FONT TOKENS
════════════════════════════════════════════════════════════ */
const DISPLAY = "'Playfair Display',serif";
const BODY = "'Outfit',sans-serif";

/* ════════════════════════════════════════════════════════════
   ELEGANT CURSOR
════════════════════════════════════════════════════════════ */
function ElegantCursor() {
    const ringRef = useRef(null);
    const dotRef = useRef(null);
    const pos = useRef({ x: -300, y: -300 });
    const lag = useRef({ x: -300, y: -300 });

    useEffect(() => {
const onMove = (e) => {
            pos.current = { x: e.clientX, y: e.clientY };
            if (dotRef.current)
                dotRef.current.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 3}px)`;
        };
        let raf;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            lag.current.x += (pos.current.x - lag.current.x) * 0.09;
            lag.current.y += (pos.current.y - lag.current.y) * 0.09;
            if (ringRef.current)
                ringRef.current.style.transform = `translate(${lag.current.x - 20}px,${lag.current.y - 20}px)`;
        };
        loop();
        document.addEventListener("mousemove", onMove);
        return () => { cancelAnimationFrame(raf); document.removeEventListener("mousemove", onMove); };
    }, []);

    return (
        <>
            <style>{`*{cursor:none!important}`}</style>
            <div ref={ringRef} style={{
                position: "fixed", top: 0, left: 0, width: 40, height: 40, borderRadius: "50%",
                border: "1.5px solid rgba(124,58,237,0.55)", zIndex: 99999, pointerEvents: "none",
                willChange: "transform", transform: "translate(-300px,-300px)", transition: "border-color .2s"
            }} />
            <div ref={dotRef} style={{
                position: "fixed", top: 0, left: 0, width: 6, height: 6, borderRadius: "50%",
                background: "#7c3aed", zIndex: 100000, pointerEvents: "none",
                willChange: "transform", transform: "translate(-300px,-300px)",
                boxShadow: "0 0 8px rgba(124,58,237,.7)"
            }} />
        </>
    );
}

/* ════════════════════════════════════════════════════════════
   NEBULA BG
════════════════════════════════════════════════════════════ */
function NebulaBG({ style }) {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        let W = window.innerWidth;
        let H = canvas.offsetHeight || window.innerHeight;
        canvas.width = W;
        canvas.height = H;

        const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
        window.addEventListener("mousemove", onMouse);

        const PURPLE_SHADES = [
            "rgba(124,58,237,", "rgba(168,85,247,", "rgba(196,130,255,",
            "rgba(88,28,199,", "rgba(147,51,234,", "rgba(216,180,254,",
            "rgba(109,40,217,", "rgba(139,92,246,", "rgba(167,139,250,",
        ];

        const lines = Array.from({ length: 28 }, () => ({
            x1: Math.random() * W, y1: Math.random() * H,
            x2: Math.random() * W, y2: Math.random() * H,
            progress: Math.random(),
            speed: 0.0008 + Math.random() * 0.0015,
            color: PURPLE_SHADES[Math.floor(Math.random() * PURPLE_SHADES.length)],
            width: Math.random() * 1.5 + 0.4,
            opacity: Math.random() * 0.35 + 0.08,
            dash: Math.random() > 0.5 ? Math.floor(Math.random() * 8 + 2) : 0,
        }));

        const orbs = Array.from({ length: 7 }, () => ({
            x: Math.random() * W, y: Math.random() * H * 0.8,
            r: 120 + Math.random() * 200,
            vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.2,
            hue: 260 + Math.random() * 60,
            opacity: 0.06 + Math.random() * 0.1,
            phase: Math.random() * Math.PI * 2,
        }));

        const particles = Array.from({ length: 600 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            r: Math.random() * 0.8 + 0.1,
            opacity: Math.random() * 0.5 + 0.1,
            phase: Math.random() * Math.PI * 2,
            speed: Math.random() * 0.02 + 0.005,
            hue: 250 + Math.random() * 80,
        }));

        const ripples = [];
        const onClick = (e) => {
            ripples.push({ x: e.clientX, y: e.clientY, r: 0, maxR: 80, opacity: 0.6 });
        };
        window.addEventListener("click", onClick);

        let t = 0; let raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += 0.012;
            ctx.clearRect(0, 0, W, H);

            for (const orb of orbs) {
                orb.x += orb.vx + Math.sin(t * 0.3 + orb.phase) * 0.4;
                orb.y += orb.vy + Math.cos(t * 0.2 + orb.phase) * 0.3;
                if (orb.x < -orb.r) orb.x = W + orb.r; if (orb.x > W + orb.r) orb.x = -orb.r;
                if (orb.y < -orb.r) orb.y = H + orb.r; if (orb.y > H + orb.r) orb.y = -orb.r;
                const pulse = 1 + Math.sin(t * 0.5 + orb.phase) * 0.12;
                const grd = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r * pulse);
                grd.addColorStop(0, `hsla(${orb.hue},80%,70%,${orb.opacity * 1.4})`);
                grd.addColorStop(0.4, `hsla(${orb.hue},70%,60%,${orb.opacity * 0.6})`);
                grd.addColorStop(1, `hsla(${orb.hue},60%,50%,0)`);
                ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r * pulse, 0, Math.PI * 2);
                ctx.fillStyle = grd; ctx.fill();
            }

            const mx = mouseRef.current.x, my = mouseRef.current.y;
            const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 160);
            cg.addColorStop(0, "rgba(168,85,247,0.12)");
            cg.addColorStop(0.5, "rgba(124,58,237,0.05)");
            cg.addColorStop(1, "rgba(124,58,237,0)");
            ctx.beginPath(); ctx.arc(mx, my, 160, 0, Math.PI * 2);
            ctx.fillStyle = cg; ctx.fill();

            for (const ln of lines) {
                ln.progress += ln.speed;
                if (ln.progress > 1) {
                    ln.progress = 0;
                    ln.x1 = Math.random() * W; ln.y1 = Math.random() * H;
                    ln.x2 = ln.x1 + (Math.random() - 0.5) * W * 0.8;
                    ln.y2 = ln.y1 + (Math.random() - 0.5) * H * 0.8;
                }
                const ease = ln.progress < 0.5 ? 2 * ln.progress * ln.progress : 1 - Math.pow(-2 * ln.progress + 2, 2) / 2;
                const cx2 = ln.x1 + (ln.x2 - ln.x1) * ease, cy2 = ln.y1 + (ln.y2 - ln.y1) * ease;
                const fade = Math.sin(ln.progress * Math.PI);
                const lg = ctx.createLinearGradient(ln.x1, ln.y1, ln.x2, ln.y2);
                lg.addColorStop(0, `${ln.color}0)`);
                lg.addColorStop(0.3, `${ln.color}${(ln.opacity * fade).toFixed(2)})`);
                lg.addColorStop(0.7, `${ln.color}${(ln.opacity * fade * 1.3).toFixed(2)})`);
                lg.addColorStop(1, `${ln.color}0)`);
                ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(cx2, cy2);
                ctx.strokeStyle = lg; ctx.lineWidth = ln.width;
                if (ln.dash) ctx.setLineDash([ln.dash, ln.dash * 2]); else ctx.setLineDash([]);
                ctx.stroke(); ctx.setLineDash([]);
                ctx.beginPath(); ctx.arc(cx2, cy2, ln.width * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `${ln.color}${(fade * 0.7).toFixed(2)})`; ctx.fill();
            }

            for (const p of particles) {
                const pulse2 = (Math.sin(t * p.speed * 40 + p.phase) + 1) / 2;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue},70%,75%,${p.opacity * (0.3 + pulse2 * 0.7)})`;
                ctx.fill();
            }

            for (let i = ripples.length - 1; i >= 0; i--) {
                const rp = ripples[i]; rp.r += 3; rp.opacity -= 0.018;
                if (rp.opacity <= 0) { ripples.splice(i, 1); continue; }
                ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(124,58,237,${rp.opacity})`; ctx.lineWidth = 1.5; ctx.stroke();
                ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r * 0.6, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(168,85,247,${rp.opacity * 0.5})`; ctx.lineWidth = 0.8; ctx.stroke();
            }
        };
        draw();

        const onResize = () => {
            W = window.innerWidth; H = canvas.offsetHeight;
            canvas.width = W; canvas.height = H;
        };
        window.addEventListener("resize", onResize);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("mousemove", onMouse);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("click", onClick);
        };
    }, []);

    return (
        <div style={{ position: "absolute", inset: 0, ...style, overflow: "hidden" }}>
            <canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
            <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}>
                <div style={{
                    position: "absolute", top: "-10%", left: "-5%", width: "55%", height: "60%",
                    background: "radial-gradient(ellipse,rgba(167,139,250,0.18) 0%,rgba(139,92,246,0.08) 45%,transparent 70%)",
                    animation: "cssOrb1 14s ease-in-out infinite"
                }} />
                <div style={{
                    position: "absolute", top: "15%", right: "-8%", width: "50%", height: "70%",
                    background: "radial-gradient(ellipse,rgba(124,58,237,0.22) 0%,rgba(109,40,217,0.09) 40%,transparent 68%)",
                    animation: "cssOrb2 18s ease-in-out infinite"
                }} />
                <div style={{
                    position: "absolute", bottom: "-15%", left: "20%", width: "60%", height: "55%",
                    background: "radial-gradient(ellipse,rgba(88,28,199,0.16) 0%,rgba(76,29,149,0.06) 50%,transparent 72%)",
                    animation: "cssOrb3 22s ease-in-out infinite"
                }} />
            </div>
            <style>{`
        @keyframes cssOrb1{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(30px,20px) scale(1.06)}70%{transform:translate(-15px,35px) scale(0.95)}}
        @keyframes cssOrb2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-25px,30px) scale(1.08)}75%{transform:translate(20px,-15px) scale(0.93)}}
        @keyframes cssOrb3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(35px,-25px) scale(1.1)}}
      `}</style>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   NERVE CANVAS
════════════════════════════════════════════════════════════ */
function NerveCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext("2d");
        let W = (c.width = c.offsetWidth), H = (c.height = c.offsetHeight);
        const paths = Array.from({ length: 12 }, () => ({
            pts: Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .16 })),
            hue: 255 + Math.random() * 50, opa: .04 + Math.random() * .07, w: .7 + Math.random() * 1.3, ph: Math.random() * Math.PI * 2,
        }));
        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .006;
            ctx.clearRect(0, 0, W, H);
            for (let gx = 0; gx < W; gx += 54)
                for (let gy = 0; gy < H; gy += 54) {
                    ctx.beginPath(); ctx.arc(gx, gy, .9, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(124,58,237,.045)"; ctx.fill();
                }
            for (const p of paths) {
                for (const pt of p.pts) {
                    pt.x += pt.vx + Math.sin(t * .3 + p.ph) * .05; pt.y += pt.vy + Math.cos(t * .25 + p.ph) * .04;
                    if (pt.x < -60) pt.x = W + 60; if (pt.x > W + 60) pt.x = -60;
                    if (pt.y < -60) pt.y = H + 60; if (pt.y > H + 60) pt.y = -60;
                }
                const pulse = (Math.sin(t * .9 + p.ph) + 1) * .5;
                const f = p.pts[0], l = p.pts[p.pts.length - 1];
                const g = ctx.createLinearGradient(f.x, f.y, l.x, l.y);
                const a = p.opa * (.4 + pulse * .6);
                g.addColorStop(0, `hsla(${p.hue},80%,62%,0)`);
                g.addColorStop(.35, `hsla(${p.hue},80%,65%,${a})`);
                g.addColorStop(.7, `hsla(${p.hue + 14},76%,68%,${a * .85})`);
                g.addColorStop(1, `hsla(${p.hue},72%,62%,0)`);
                ctx.beginPath(); ctx.moveTo(f.x, f.y);
                for (let i = 1; i < p.pts.length - 1; i++) {
                    const mx = (p.pts[i].x + p.pts[i + 1].x) / 2, my = (p.pts[i].y + p.pts[i + 1].y) / 2;
                    ctx.quadraticCurveTo(p.pts[i].x, p.pts[i].y, mx, my);
                }
                ctx.lineTo(l.x, l.y);
                ctx.strokeStyle = g; ctx.lineWidth = p.w; ctx.stroke();
            }
        };
        draw();
        const onR = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
        window.addEventListener("resize", onR);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
    }, []);
    return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ════════════════════════════════════════════════════════════
   NODE CANVAS
════════════════════════════════════════════════════════════ */
function NodeCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext("2d");
        let W = (c.width = c.offsetWidth), H = (c.height = c.offsetHeight);
        const nodes = Array.from({ length: 55 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .38, vy: (Math.random() - .5) * .28, ph: Math.random() * Math.PI * 2 }));
        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .007;
            ctx.clearRect(0, 0, W, H);
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                a.x += a.vx + Math.sin(t * .5 + a.ph) * .055; a.y += a.vy + Math.cos(t * .4 + a.ph) * .045;
                if (a.x < 0) a.x = W; if (a.x > W) a.x = 0; if (a.y < 0) a.y = H; if (a.y > H) a.y = 0;
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 165) {
                        const alpha = (1 - d / 165) * .18;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(167,139,250,${alpha})`; ctx.lineWidth = .65; ctx.stroke();
                    }
                }
                const pulse = (Math.sin(t * 1.3 + a.ph) + 1) * .5;
                ctx.beginPath(); ctx.arc(a.x, a.y, 1.4 + pulse * .8, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(192,132,252,${.15 + pulse * .22})`; ctx.fill();
            }
        };
        draw();
        const onR = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
        window.addEventListener("resize", onR);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
    }, []);
    return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ════════════════════════════════════════════════════════════
   WAVE DIVIDERS
════════════════════════════════════════════════════════════ */
function WaveDown({ fromColor = "#ffffff", toColor = "#0f0b24" }) {
    return (
        <div style={{ background: fromColor, lineHeight: 0, display: "block" }}>
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}>
                <path d="M0,0 C480,70 960,70 1440,0 L1440,70 L0,70 Z" fill={toColor} />
            </svg>
        </div>
    );
}
function WaveUp({ fromColor = "#0f0b24", toColor = "#ffffff" }) {
    return (
        <div style={{ background: fromColor, lineHeight: 0, display: "block" }}>
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}>
                <path d="M0,70 C480,0 960,0 1440,70 L1440,0 L0,0 Z" fill={toColor} />
            </svg>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   DESIGN ATOMS
════════════════════════════════════════════════════════════ */
function Pill({ icon, text, color }) {
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            background: `${color}12`, border: `1px solid ${color}30`,
            borderRadius: 30, padding: "5px 15px", marginBottom: 16,
        }}>
            <span style={{ display: "flex", alignItems: "center", opacity: 0.9 }}>{icon}</span>
            <span style={{ fontFamily: BODY, fontSize: 9, fontWeight: 800, color, letterSpacing: 2, textTransform: "uppercase" }}>{text}</span>
        </div>
    );
}

function Chip({ label, dark }) {
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 100, padding: "5px 15px", marginBottom: 20,
            background: dark ? "rgba(192,132,252,.12)" : "rgba(124,58,237,.07)",
            border: dark ? "1px solid rgba(192,132,252,.22)" : "1px solid rgba(124,58,237,.16)"
        }}>
            <motion.div animate={{ scale: [1, 1.55, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: dark ? "#c084fc" : "#7c3aed" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: BODY, color: dark ? "#c084fc" : "#7c3aed" }}>{label}</span>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   INBOX TYPES & DATA
════════════════════════════════════════════════════════════ */

const inboxEmails = [
    {
        id: 1, from: "Priya Sharma", initials: "PS", subject: "Re: Product launch timeline",
        preview: "Following up on the Q1 launch — are we able to confirm the go-live date this week?",
        tag: "TO RESPOND", avatarColor: "#c084fc",
        draft: { body: "Dear Priya, thank you for following up. I have reviewed the timeline and March 18th is confirmed for the go-live. I will schedule a brief call on Thursday to finalise the remaining details." }
    },
    {
        id: 2, from: "Alex Rivera", initials: "AR", subject: "Design review — Friday, 15:00",
        preview: "A reminder regarding our weekly design review session. The agenda has been shared in Notion.",
        tag: "MEETINGS", avatarColor: "#818cf8"
    },
    {
        id: 3, from: "Finance Operations", initials: "FO", subject: "Invoice #7043 — Approval Required",
        preview: "Kindly review and authorise the attached invoice before the end of the current business week.",
        tag: "FYI", avatarColor: "#f59e0b"
    },
];

const tagConfig = {
    "TO RESPOND": { bg: "bg-rose-400/20 text-rose-500 border border-rose-300/40", text: "TO RESPOND", icon: <Reply size={10} /> },
    "MEETINGS": { bg: "bg-violet-400/20 text-violet-600 border border-violet-300/40", text: "MEETINGS", icon: <Calendar size={10} /> },
    "FYI": { bg: "bg-amber-400/20 text-amber-600 border border-amber-300/40", text: "FYI", icon: <Info size={10} /> },
};

const navItems = [
    { icon: <Mail size={16} />, label: "Inbox" },
    { icon: <Star size={16} />, label: "Starred" },
    { icon: <Send size={16} />, label: "Sent" },
];

/* ════════════════════════════════════════════════════════════
   INBOX SUB-COMPONENTS
════════════════════════════════════════════════════════════ */
function InboxAvatar({ initials, color }) {
    return (
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0 shadow-sm"
            style={{ backgroundColor: color }}>{initials}</div>
    );
}

function TagBadge({ tag }) {
    const cfg = tagConfig[tag];
    return (
        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold tracking-widest uppercase ${cfg.bg}`}>
            {cfg.icon}{cfg.text}
        </span>
    );
}

function DraftBox({ body, onSend }) {
    const [text, setText] = useState(body);
    const [sent, setSent] = useState(false);
    const handleSend = () => { setSent(true); setTimeout(onSend, 600); };
    return (
        <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="mt-4 rounded-2xl bg-white/70 backdrop-blur-sm border border-violet-200/60 shadow-sm overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-100/60 bg-violet-50/40">
                <Sparkles size={13} className="text-violet-400" />
                <span className="text-[11px] font-semibold text-violet-500 tracking-widest uppercase">AI Draft</span>
            </div>
            <textarea value={text} onChange={e => setText(e.target.value)}
                className="w-full px-4 py-3 text-sm text-slate-700 bg-transparent resize-none focus:outline-none leading-relaxed"
                rows={3} />
            <div className="flex justify-end px-4 pb-3">
                <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={handleSend} disabled={sent}
                    className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold px-5 py-2 rounded-xl shadow-md shadow-violet-300/30 transition-colors disabled:opacity-60">
                    {sent ? <>Dispatched</> : <><Send size={14} />Dispatch</>}
                </motion.button>
            </div>
        </motion.div>
    );
}

function EmailCard({ email }) {
    const [expanded, setExpanded] = useState(email.draft !== undefined);
    const [dismissed, setDismissed] = useState(false);
    const [draftVisible, setDraftVisible] = useState(email.draft !== undefined);
    if (dismissed) return null;
    return (
        <motion.div layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="relative group rounded-2xl bg-white/60 backdrop-blur-sm border border-violet-100/80 shadow-sm hover:shadow-md hover:shadow-violet-200/40 transition-shadow duration-300 overflow-hidden">
            <div className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full bg-gradient-to-b from-violet-300 to-purple-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="p-5">
                <div className="flex items-start gap-3">
                    <InboxAvatar initials={email.initials} color={email.avatarColor} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold text-slate-800 text-sm truncate">{email.from}</p>
                            <TagBadge tag={email.tag} />
                        </div>
                        <p className="text-xs text-violet-500 font-medium mt-0.5 truncate">{email.subject}</p>
                    </div>
                    <button onClick={() => setDismissed(true)} className="opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-slate-400 mt-0.5">
                        <X size={14} />
                    </button>
                </div>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed ml-[52px]">{email.preview}</p>
                <button onClick={() => setExpanded(e => !e)}
                    className="ml-[52px] mt-2 inline-flex items-center gap-1 text-[11px] text-violet-400 hover:text-violet-600 font-medium transition-colors">
                    <motion.span animate={{ rotate: expanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                        <ChevronRight size={12} />
                    </motion.span>
                    {expanded ? "Collapse" : "View Draft"}
                </button>
                <AnimatePresence>
                    {expanded && draftVisible && email.draft && (
                        <div className="ml-[52px]">
                            <DraftBox body={email.draft.body} onSend={() => setDraftVisible(false)} />
                        </div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}

function InboxPanel() {
    const [activeNav, setActiveNav] = useState(0);
    return (
        <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 26, delay: 0.15 }}
            className="w-full bg-white/50 backdrop-blur-xl rounded-3xl border border-violet-200/60 shadow-2xl shadow-violet-200/30 overflow-hidden">
            <div className="px-6 pt-5 pb-4 border-b border-violet-100/60 bg-white/40">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-base font-bold text-slate-800 tracking-tight">Intelligent Inbox</h3>
                        <p className="text-[11px] text-violet-400 mt-0.5 font-medium">3 communications &nbsp;·&nbsp; 1 awaiting response</p>
                    </div>
                    <div className="flex items-center gap-1 bg-violet-100/60 rounded-2xl p-1">
                        {navItems.map((item, i) => (
                            <motion.button key={i} whileTap={{ scale: 0.95 }} onClick={() => setActiveNav(i)}
                                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${activeNav === i ? "text-white" : "text-violet-500 hover:text-violet-700"}`}>
                                {activeNav === i && (
                                    <motion.span layoutId="inbox-panel-nav"
                                        className="absolute inset-0 bg-violet-600 rounded-xl shadow-sm"
                                        transition={{ type: "spring", stiffness: 300, damping: 28 }} />
                                )}
                                <span className="relative z-10 flex items-center gap-1.5">
                                    {item.icon}<span className="hidden sm:inline">{item.label}</span>
                                </span>
                            </motion.button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="p-5 flex flex-col gap-3">
                <AnimatePresence>
                    {inboxEmails.map((email, i) => (
                        <motion.div key={email.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.08, type: "spring", stiffness: 260, damping: 24 }}>
                            <EmailCard email={email} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
            <div className="px-6 py-3 border-t border-violet-100/50 bg-white/30 flex items-center justify-between">
                <p className="text-[11px] text-violet-300 font-medium">Neural Triage Engine</p>
                <div className="flex items-center gap-1.5 text-[11px] text-violet-400 font-medium">
                    <Sparkles size={11} className="text-violet-400" />Contextual Classification
                </div>
            </div>
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   INBOX PANEL CSS OVERRIDES
════════════════════════════════════════════════════════════ */
const INBOX_PANEL_CSS = `
  .ibx .bg-white\\/60{background:rgba(255,255,255,0.6)}
  .ibx .bg-white\\/50{background:rgba(255,255,255,0.5)}
  .ibx .bg-white\\/40{background:rgba(255,255,255,0.4)}
  .ibx .bg-white\\/30{background:rgba(255,255,255,0.3)}
  .ibx .bg-white\\/70{background:rgba(255,255,255,0.7)}
  .ibx .bg-violet-50\\/40{background:rgba(245,243,255,0.4)}
  .ibx .bg-violet-100\\/60{background:rgba(237,233,254,0.6)}
  .ibx .bg-violet-600{background:#7c3aed}
  .ibx .hover\\:bg-violet-700:hover{background:#6d28d9}
  .ibx .bg-rose-400\\/20{background:rgba(251,113,133,0.2)}
  .ibx .bg-violet-400\\/20{background:rgba(167,139,250,0.2)}
  .ibx .bg-amber-400\\/20{background:rgba(251,191,36,0.2)}
  .ibx .text-rose-500{color:#f43f5e}
  .ibx .text-violet-600{color:#7c3aed}
  .ibx .text-amber-600{color:#d97706}
  .ibx .border-rose-300\\/40{border-color:rgba(252,165,165,0.4)}
  .ibx .border-violet-300\\/40{border-color:rgba(196,181,253,0.4)}
  .ibx .border-amber-300\\/40{border-color:rgba(252,211,77,0.4)}
  .ibx .border-violet-200\\/60{border-color:rgba(221,214,254,0.6)}
  .ibx .border-violet-100\\/60{border-color:rgba(237,233,254,0.6)}
  .ibx .border-violet-100\\/80{border-color:rgba(237,233,254,0.8)}
  .ibx .border-violet-100\\/50{border-color:rgba(237,233,254,0.5)}
  .ibx .text-violet-400{color:#a78bfa}
  .ibx .text-violet-500{color:#8b5cf6}
  .ibx .text-slate-800{color:#1e293b}
  .ibx .text-slate-700{color:#334155}
  .ibx .text-slate-500{color:#64748b}
  .ibx .text-slate-400{color:#94a3b8}
  .ibx .text-white{color:white}
  .ibx .shadow-violet-200\\/30{box-shadow:0 25px 50px -12px rgba(221,214,254,0.3)}
  .ibx .shadow-violet-200\\/40{box-shadow:0 10px 15px -3px rgba(221,214,254,0.4)}
  .ibx .shadow-violet-300\\/30{box-shadow:0 4px 6px -1px rgba(196,181,253,0.3)}
  .ibx .rounded-3xl{border-radius:1.5rem}
  .ibx .rounded-2xl{border-radius:1rem}
  .ibx .rounded-xl{border-radius:0.75rem}
  .ibx .rounded-full{border-radius:9999px}
  .ibx .p-5{padding:1.25rem}
  .ibx .p-1{padding:0.25rem}
  .ibx .px-6{padding-left:1.5rem;padding-right:1.5rem}
  .ibx .px-5{padding-left:1.25rem;padding-right:1.25rem}
  .ibx .px-4{padding-left:1rem;padding-right:1rem}
  .ibx .px-3{padding-left:0.75rem;padding-right:0.75rem}
  .ibx .px-2\\.5{padding-left:0.625rem;padding-right:0.625rem}
  .ibx .py-3{padding-top:0.75rem;padding-bottom:0.75rem}
  .ibx .py-2\\.5{padding-top:0.625rem;padding-bottom:0.625rem}
  .ibx .py-2{padding-top:0.5rem;padding-bottom:0.5rem}
  .ibx .py-1\\.5{padding-top:0.375rem;padding-bottom:0.375rem}
  .ibx .py-1{padding-top:0.25rem;padding-bottom:0.25rem}
  .ibx .pb-3{padding-bottom:0.75rem}
  .ibx .pb-4{padding-bottom:1rem}
  .ibx .pt-5{padding-top:1.25rem}
  .ibx .mt-0\\.5{margin-top:0.125rem}
  .ibx .mt-2{margin-top:0.5rem}
  .ibx .mt-3{margin-top:0.75rem}
  .ibx .mt-4{margin-top:1rem}
  .ibx .ml-\\[52px\\]{margin-left:52px}
  .ibx .gap-1{gap:0.25rem}
  .ibx .gap-1\\.5{gap:0.375rem}
  .ibx .gap-2{gap:0.5rem}
  .ibx .gap-3{gap:0.75rem}
  .ibx .flex{display:flex}
  .ibx .flex-col{flex-direction:column}
  .ibx .flex-1{flex:1 1 0%}
  .ibx .flex-shrink-0{flex-shrink:0}
  .ibx .items-center{align-items:center}
  .ibx .items-start{align-items:flex-start}
  .ibx .justify-between{justify-content:space-between}
  .ibx .justify-end{justify-content:flex-end}
  .ibx .overflow-hidden{overflow:hidden}
  .ibx .relative{position:relative}
  .ibx .absolute{position:absolute}
  .ibx .inset-0{inset:0}
  .ibx .left-0{left:0}
  .ibx .top-4{top:1rem}
  .ibx .bottom-4{bottom:1rem}
  .ibx .w-0\\.5{width:0.125rem}
  .ibx .w-10{width:2.5rem}
  .ibx .h-10{height:2.5rem}
  .ibx .w-full{width:100%}
  .ibx .min-w-0{min-width:0}
  .ibx .truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .ibx .inline-flex{display:inline-flex}
  .ibx .opacity-0{opacity:0}
  .ibx .backdrop-blur-sm{backdrop-filter:blur(4px)}
  .ibx .backdrop-blur-xl{backdrop-filter:blur(24px)}
  .ibx .border{border-width:1px;border-style:solid}
  .ibx .border-b{border-bottom-width:1px;border-bottom-style:solid}
  .ibx .border-t{border-top-width:1px;border-top-style:solid}
  .ibx .shadow-sm{box-shadow:0 1px 2px 0 rgba(0,0,0,0.05)}
  .ibx .shadow-2xl{box-shadow:0 25px 50px -12px rgba(0,0,0,0.25)}
  .ibx .shadow-md{box-shadow:0 4px 6px -1px rgba(0,0,0,0.1),0 2px 4px -2px rgba(0,0,0,0.1)}
  .ibx .resize-none{resize:none}
  .ibx .leading-relaxed{line-height:1.625}
  .ibx .font-bold{font-weight:700}
  .ibx .font-semibold{font-weight:600}
  .ibx .font-medium{font-weight:500}
  .ibx .text-sm{font-size:0.875rem;line-height:1.25rem}
  .ibx .text-xs{font-size:0.75rem;line-height:1rem}
  .ibx .text-base{font-size:1rem}
  .ibx .text-\\[10px\\]{font-size:10px}
  .ibx .text-\\[11px\\]{font-size:11px}
  .ibx .tracking-tight{letter-spacing:-0.025em}
  .ibx .tracking-widest{letter-spacing:0.1em}
  .ibx .uppercase{text-transform:uppercase}
  .ibx .transition-colors{transition:color .15s ease,background-color .15s ease,border-color .15s ease}
  .ibx .transition-opacity{transition:opacity .15s ease}
  .ibx .transition-shadow{transition:box-shadow .15s ease}
  .ibx .duration-300{transition-duration:300ms}
  .ibx .group:hover .group-hover\\:opacity-100{opacity:1}
  .ibx .from-violet-300{--tw-gradient-from:#c4b5fd}
  .ibx .to-purple-200{--tw-gradient-to:#ddd6fe}
  .ibx .bg-gradient-to-b{background-image:linear-gradient(to bottom,var(--tw-gradient-from),var(--tw-gradient-to))}
  .ibx .hover\\:text-violet-600:hover{color:#7c3aed}
  .ibx .hover\\:text-violet-700:hover{color:#6d28d9}
  .ibx .focus\\:outline-none:focus{outline:none}
  .ibx .disabled\\:opacity-60:disabled{opacity:0.6}
  @media(min-width:640px){.ibx .sm\\:inline{display:inline}}
`;

/* ════════════════════════════════════════════════════════════
   INBOX SECTION CARD
════════════════════════════════════════════════════════════ */
function InboxSectionCard({ inView }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 36 }}
            transition={{ duration: 0.85, ease: [0.23, 1, 0.32, 1] }}
            style={{
                background: "linear-gradient(145deg,#0e0b28,#0b0920)",
                border: "1px solid rgba(124,58,237,0.2)",
                borderRadius: 26, overflow: "hidden",
                boxShadow: "0 20px 60px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.06)",
                position: "relative", padding: "34px",
            }}>
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: "linear-gradient(90deg,transparent,#7c3aed,#a855f7,transparent)", opacity: 0.8
            }} />
            <div style={{ marginBottom: 24 }}>
                <Pill icon={<Mail size={10} color="#a78bfa" />} text="Interactive Demonstration" color="#a78bfa" />
                <h2 style={{
                    fontFamily: DISPLAY, fontWeight: 900, fontSize: 24,
                    background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 8
                }}>
                    Scasi in Operation
                </h2>
                <p style={{ fontFamily: BODY, color: "#64748b", fontSize: 12, lineHeight: 1.8, maxWidth: 560 }}>
                    Expand threads, refine AI-generated drafts, dispatch replies, and dismiss messages.
                    This is precisely how your inbox functions with Scasi active.
                </p>
                <div style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.18)",
                    borderRadius: 20, padding: "5px 14px", marginTop: 12
                }}>
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, 0.3, 1] }} transition={{ duration: 1.4, repeat: Infinity }}
                        style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                    <Eye size={10} color="#22c55e" />
                    <span style={{ fontSize: 10, color: "#22c55e", fontFamily: BODY, fontWeight: 700, letterSpacing: 1 }}>LIVE — FULLY INTERACTIVE</span>
                </div>
            </div>
            <style>{INBOX_PANEL_CSS}</style>
            <div className="ibx"><InboxPanel /></div>
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   LIVE BURNOUT CHART
════════════════════════════════════════════════════════════ */

function LiveBurnoutChart({ stress, workload, trend }) {
    const W = 320, H = 100, N = 14;
    const [mounted] = useState(() => typeof window !== 'undefined');

    const gen = useCallback((s, w, tr) => {
        const base = s * 1.2, wm = w === "High" ? 1.3 : w === "Medium" ? 1 : 0.7;
        return Array.from({ length: N }, (_, i) => {
            const ta = tr === "Rising" ? (i / N) * 45 : tr === "Falling" ? ((N - i) / N) * 35 : 0;
            return Math.max(4, Math.min(150, base * wm * (0.45 + (i / N) * 0.7) + ta + (Math.random() - 0.5) * 16));
        });
    }, []);

    const stableInit = useCallback((s, w, tr) => {
        const base = s * 1.2, wm = w === "High" ? 1.3 : w === "Medium" ? 1 : 0.7;
        return Array.from({ length: N }, (_, i) => {
            const ta = tr === "Rising" ? (i / N) * 45 : tr === "Falling" ? ((N - i) / N) * 35 : 0;
            return Math.max(4, Math.min(150, base * wm * (0.45 + (i / N) * 0.7) + ta));
        });
    }, []);

    const pts = useMemo(() => mounted ? gen(stress, workload, trend) : stableInit(stress, workload, trend), [stress, workload, trend, gen, stableInit, mounted]);
    const key = useMemo(() => `${stress}-${workload}-${trend}`, [stress, workload, trend]);

    const mx = Math.max(...pts), mn = Math.min(...pts);
    const tx = (i) => (i / (N - 1)) * W;
    const ty = (v) => H - ((v - mn) / Math.max(mx - mn, 1)) * (H - 14) - 7;
    const pD = pts.map((v, i) => `${i === 0 ? "M" : "L"}${tx(i).toFixed(1)},${ty(v).toFixed(1)}`).join(" ");
    const aD = `${pD} L${W},${H} L0,${H} Z`;
    const lc = stress > 70 ? "#ef4444" : stress > 40 ? "#f97316" : "#22c55e";
    const sc = stress > 70 ? "#f97316" : stress > 40 ? "#eab308" : "#10b981";
    const pk = pts.indexOf(mx);

    return (
        <div style={{ position: "relative", width: "100%" }}>
            <svg key={key} width="100%" viewBox={`-24 -6 ${W + 32} ${H + 26}`} style={{ overflow: "visible" }}>
                <defs>
                    <linearGradient id={`ag${key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={lc} stopOpacity=".5" />
                        <stop offset="100%" stopColor={lc} stopOpacity=".02" />
                    </linearGradient>
                    <linearGradient id={`lg${key}`} x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor={sc} />
                        <stop offset="100%" stopColor={lc} />
                    </linearGradient>
                    <filter id="cg">
                        <feGaussianBlur stdDeviation="2.5" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                    </filter>
                </defs>
                {[0, 1, 2, 3].map(i => { const y = H - (i / 3) * (H - 14) - 7; return <line key={i} x1="0" y1={y} x2={W} y2={y} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />; })}
                <path d={aD} fill={`url(#ag${key})`} style={{ animation: "fi .7s ease forwards" }} />
                <path d={pD} fill="none" stroke={`url(#lg${key})`} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" filter="url(#cg)"
                    style={{ strokeDasharray: 1200, strokeDashoffset: 1200, animation: "dl 1.4s cubic-bezier(.23,1,.32,1) forwards" }} />
                <circle cx={tx(pk)} cy={ty(mx)} r={11} fill={`${lc}18`}>
                    <animate attributeName="r" values="11;17;11" dur="2s" repeatCount="indefinite" />
                </circle>
                <circle cx={tx(pk)} cy={ty(mx)} r={5} fill={lc} filter="url(#cg)" />
                <circle cx={tx(N - 1)} cy={ty(pts[N - 1])} r={4} fill={lc}>
                    <animate attributeName="r" values="4;8;4" dur="1.4s" repeatCount="indefinite" />
                </circle>
                <text x={tx(N - 1) + 7} y={ty(pts[N - 1]) - 6} fontSize="7.5" fill={lc} fontWeight="800">LIVE</text>
                <rect x={tx(pk) - 22} y={ty(mx) - 24} width="44" height="17" rx="5" fill={`${lc}22`} stroke={lc} strokeWidth=".6" />
                <text x={tx(pk)} y={ty(mx) - 12} fontSize="8.5" fill={lc} textAnchor="middle" fontWeight="800">Peak {Math.round(mx)}</text>
                {["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D", "—", "—"].slice(0, N).map((l, i) => (
                    <text key={i} x={tx(i)} y={H + 17} fontSize="6.5" fill="#334155" textAnchor="middle">{l}</text>
                ))}
            </svg>
            <style>{`@keyframes dl{from{stroke-dashoffset:1200}to{stroke-dashoffset:0}}@keyframes fi{from{opacity:0}to{opacity:1}}`}</style>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   SCORE BAR
════════════════════════════════════════════════════════════ */
function ScoreBar({ label, score, color, delay, go }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                <span style={{ fontSize: 11, color: "#64748b", fontFamily: BODY }}>{label}</span>
                <span style={{ fontSize: 11, color, fontWeight: 800, fontFamily: BODY }}>{score}</span>
            </div>
            <div style={{ height: 5, background: "rgba(255,255,255,0.05)", borderRadius: 6, overflow: "hidden" }}>
                <motion.div initial={{ width: 0 }} animate={{ width: go ? `${score}%` : 0 }} transition={{ duration: 1.3, delay, ease: "easeOut" }}
                    style={{ height: "100%", borderRadius: 6, background: `linear-gradient(90deg,${color}aa,${color})`, boxShadow: `0 0 12px ${color}70` }} />
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   TASK ROW
════════════════════════════════════════════════════════════ */
function TaskRow({ text, done, delay, go, tag }) {
    return (
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: go ? 1 : 0, x: go ? 0 : -20 }} transition={{ delay, duration: .55, ease: [.23, 1, .32, 1] }}
            style={{
                display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 10,
                background: done ? "rgba(34,197,94,0.05)" : "rgba(124,58,237,0.05)",
                border: `1px solid ${done ? "rgba(34,197,94,0.15)" : "rgba(124,58,237,0.12)"}`, marginBottom: 7
            }}>
            <div style={{
                width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                border: done ? "none" : "1.5px solid rgba(124,58,237,0.4)",
                background: done ? "linear-gradient(135deg,#22c55e,#16a34a)" : "transparent",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: done ? "0 0 10px rgba(34,197,94,0.3)" : "none"
            }}>
                {done && <span style={{ fontSize: 10, color: "white" }}>✓</span>}
            </div>
            <span style={{
                fontSize: 11.5, fontFamily: BODY, color: done ? "#475569" : "#cbd5e1",
                textDecoration: done ? "line-through" : "none", flex: 1
            }}>{text}</span>
            {tag && <span style={{
                fontSize: 8, background: done ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                color: done ? "#22c55e" : "#f87171", padding: "2px 8px", borderRadius: 6, fontFamily: BODY, fontWeight: 700, whiteSpace: "nowrap"
            }}>{tag}</span>}
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   STAR ORB
════════════════════════════════════════════════════════════ */
function StarOrb() {
    return (
        <div style={{ position: "relative", width: 160, height: 160, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse,rgba(124,58,237,0.35) 0%,transparent 68%)", borderRadius: "50%" }} />
            {[0, 1, 2, 3].map(r => (
                <motion.div key={r} animate={{ rotate: r % 2 === 0 ? 360 : -360 }} transition={{ duration: 5 + r * 2.2, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: "absolute", width: 56 + r * 26, height: 56 + r * 26,
                        border: `${1.2 + r * 0.2}px solid rgba(124,58,237,${0.6 - r * 0.13})`, borderRadius: `${28 + r * 4}%`
                    }} />
            ))}
            <motion.div animate={{ scale: [1, 1.1, 1], boxShadow: ["0 0 30px rgba(124,58,237,0.4)", "0 0 60px rgba(124,58,237,0.7)", "0 0 30px rgba(124,58,237,0.4)"] }} transition={{ duration: 3, repeat: Infinity }}
                style={{
                    width: 64, height: 64, background: "linear-gradient(135deg,rgba(124,58,237,.6),rgba(79,70,229,.35))",
                    border: "2px solid rgba(124,58,237,.7)", borderRadius: "22%", display: "flex", alignItems: "center",
                    justifyContent: "center", backdropFilter: "blur(12px)", zIndex: 2
                }}>
                <Star size={28} color="#fbbf24" fill="#fbbf24" />
            </motion.div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   OVERLOAD PHONE
════════════════════════════════════════════════════════════ */
function OverloadPhone() {
    const notifs = [
        { icon: <AlertTriangle size={13} color="#ef4444" />, x: -78, y: -22, d: 0 },
        { icon: <Mail size={13} color="#a78bfa" />, x: 68, y: -32, d: .3 },
        { icon: <Activity size={13} color="#f97316" />, x: -60, y: 46, d: .6 },
        { icon: <Bell size={13} color="#fbbf24" />, x: 72, y: 36, d: .9 },
        { icon: <Zap size={13} color="#ef4444" />, x: -20, y: -68, d: 1.2 },
        { icon: <AlertTriangle size={13} color="#ef4444" />, x: 40, y: -60, d: 1.5 },
        { icon: <Clock size={13} color="#f97316" />, x: 60, y: -10, d: 1.8 },
        { icon: <MessageSquare size={13} color="#a78bfa" />, x: -45, y: 20, d: 2.1 },
    ];
    const phoneItems = [
        { icon: <AlertTriangle size={8} />, c: "239,68,68", txt: "URGENT" },
        { icon: <Mail size={8} />, c: "124,58,237", txt: "Interview" },
        { icon: <Bell size={8} />, c: "239,68,68", txt: "Payment" },
        { icon: <Briefcase size={8} />, c: "249,115,22", txt: "Deadline" },
    ];
    return (
        <div style={{ position: "relative", width: 160, height: 200, flexShrink: 0 }}>
            {notifs.map((n, i) => (
                <motion.div key={i} animate={{ y: [0, -12, 0], opacity: [.6, 1, .6], scale: [.9, 1, .9] }}
                    transition={{ duration: 2.2 + i * .3, repeat: Infinity, delay: n.d, ease: "easeInOut" }}
                    style={{
                        position: "absolute", top: "50%", left: "50%",
                        transform: `translate(calc(-50% + ${n.x}px),calc(-50% + ${n.y}px))`,
                        width: 36, height: 36, borderRadius: "50%", background: "rgba(15,10,40,.85)",
                        border: "1px solid rgba(255,255,255,.15)", backdropFilter: "blur(10px)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: "0 6px 24px rgba(0,0,0,.4)", zIndex: 3
                    }}>
                    {n.icon}
                </motion.div>
            ))}
            <motion.div animate={{ y: [0, -7, 0] }} transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
                style={{
                    position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
                    width: 84, height: 148, background: "linear-gradient(170deg,#1a1040,#0c0920)",
                    borderRadius: 22, border: "1.5px solid rgba(124,58,237,.4)",
                    boxShadow: "0 24px 70px rgba(109,40,217,.45)", overflow: "hidden", zIndex: 2
                }}>
                <div style={{ width: 28, height: 5, background: "rgba(255,255,255,.08)", borderRadius: 10, margin: "8px auto 0" }} />
                <div style={{ margin: "6px 7px 0", background: "#09071a", borderRadius: 14, height: 115, overflow: "hidden", padding: "8px 6px" }}>
                    {phoneItems.map((item, i) => (
                        <motion.div key={i} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * .18 + .5 }}
                            style={{
                                display: "flex", alignItems: "center", gap: 5, marginBottom: 7,
                                background: `rgba(${item.c},.1)`, borderRadius: 6, padding: "3px 5px"
                            }}>
                            <span style={{ color: `rgba(${item.c},0.9)`, display: "flex", alignItems: "center" }}>{item.icon}</span>
                            <span style={{ flex: 1, fontSize: 8, color: `rgba(${item.c},.9)`, fontFamily: BODY, fontWeight: 700 }}>{item.txt}</span>
                            <div style={{ width: 6, height: 6, borderRadius: "50%", background: `rgba(${item.c},.8)` }} />
                        </motion.div>
                    ))}
                    <div style={{
                        textAlign: "center", fontSize: 9, color: "#ef4444", fontWeight: 800, fontFamily: BODY,
                        marginTop: 4, background: "rgba(239,68,68,.1)", borderRadius: 6, padding: "2px 0"
                    }}>+47 unread items</div>
                </div>
            </motion.div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   CLIPBOARD ORB
════════════════════════════════════════════════════════════ */
function ClipboardOrb() {
    return (
        <motion.div animate={{ y: [0, -10, 0], rotateZ: [0, 1, 0, -1, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ position: "relative", flexShrink: 0 }}>
            <div style={{ position: "absolute", inset: -24, background: "radial-gradient(ellipse,rgba(6,182,212,.2) 0%,transparent 70%)", pointerEvents: "none" }} />
            <div style={{
                width: 100, height: 130,
                background: "linear-gradient(160deg,rgba(255,255,255,.06),rgba(255,255,255,.02))",
                border: "1.5px solid rgba(124,58,237,.3)", borderRadius: 20, padding: "18px 14px 12px",
                boxShadow: "0 16px 50px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.08)",
                backdropFilter: "blur(16px)", position: "relative"
            }}>
                <div style={{
                    position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)",
                    width: 36, height: 16, background: "linear-gradient(135deg,rgba(124,58,237,.5),rgba(79,70,229,.4))",
                    borderRadius: 6, border: "1.5px solid rgba(124,58,237,.6)"
                }} />
                {[{ d: true, w: "92%" }, { d: true, w: "76%" }, { d: false, w: "84%" }, { d: false, w: "62%" }].map((l, i) => (
                    <motion.div key={i} initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: .2 + i * .12, duration: .6 }}
                        style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                        <div style={{
                            width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                            background: l.d ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(255,255,255,.08)",
                            display: "flex", alignItems: "center", justifyContent: "center"
                        }}>
                            {l.d && <span style={{ fontSize: 6, color: "white" }}>✓</span>}
                        </div>
                        <div style={{
                            width: l.w, height: 5, borderRadius: 3,
                            background: l.d ? "linear-gradient(90deg,rgba(34,197,94,.5),rgba(34,197,94,.3))" : "rgba(255,255,255,.07)"
                        }} />
                    </motion.div>
                ))}
                <motion.div animate={{ scale: [1, 1.18, 1], boxShadow: ["0 4px 16px rgba(124,58,237,.4)", "0 4px 30px rgba(124,58,237,.7)", "0 4px 16px rgba(124,58,237,.4)"] }}
                    transition={{ duration: 2.2, repeat: Infinity }}
                    style={{
                        width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#4f46e5)",
                        display: "flex", alignItems: "center", justifyContent: "center", margin: "2px auto 0"
                    }}>
                    <span style={{ fontSize: 15, color: "white" }}>✓</span>
                </motion.div>
            </div>
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   GEMINI CHAT
════════════════════════════════════════════════════════════ */
function GeminiChat({ inView }) {
    const [qi, setQi] = useState(0);
    const [txt, setTxt] = useState("");
    const [typing, setTyping] = useState(false);
    const qas = [
        {
            q: "Summarise this message",
            a: "Meeting confirmed for tomorrow at 14:45. Recruiter requires acknowledgement before 17:00. Priority Classification: Critical — immediate action required.",
            icon: <FileText size={11} />,
        },
        {
            q: "Identify the deadline",
            a: "Deadline: Today, 17:00. Urgency tier: Very High. Delayed response risks reallocation of your interview slot.",
            icon: <Clock size={11} />,
        },
        {
            q: "Compose a reply",
            a: "Draft: 'Dear [Name], Thank you for the confirmation. I am pleased to accept the interview scheduled for tomorrow at 14:45. Warm regards, [You]'",
            icon: <Mail size={11} />,
        },
        {
            q: "Verify legitimacy",
            a: "Sender verified. Domain reputation: Clean. Neural spam probability: 0.3%. Priority Score: 94 / 100. This is a high-value, authenticated communication.",
            icon: <Shield size={11} />,
        },
    ];
    useEffect(() => {
        if (!inView) return;
        const iv = setInterval(() => setQi(p => (p + 1) % qas.length), 4500);
        return () => clearInterval(iv);
    }, [inView, qas.length]);
    useEffect(() => {
        setTyping(true); setTxt(""); let i = 0; const a = qas[qi].a;
        const t = setInterval(() => { setTxt(a.slice(0, i)); i++; if (i > a.length) { clearInterval(t); setTyping(false); } }, 18);
        return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [qi]);
    return (
        <div style={{
            background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(124,58,237,.25)",
            borderRadius: 26, padding: "30px", boxShadow: "0 20px 60px rgba(0,0,0,.6),inset 0 1px 0 rgba(255,255,255,.06)",
            position: "relative", overflow: "hidden"
        }}>
            <div style={{
                position: "absolute", top: -60, right: -60, width: 180, height: 180,
                background: "radial-gradient(ellipse,rgba(6,182,212,.15) 0%,transparent 70%)", pointerEvents: "none"
            }} />
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                <motion.div animate={{ boxShadow: ["0 0 20px rgba(124,58,237,.4)", "0 0 40px rgba(6,182,212,.5)", "0 0 20px rgba(124,58,237,.4)"] }} transition={{ duration: 3, repeat: Infinity }}
                    style={{ width: 44, height: 44, borderRadius: 14, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Gem size={20} color="white" />
                </motion.div>
                <div>
                    <div style={{
                        fontFamily: DISPLAY, fontWeight: 900, fontSize: 18,
                        background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)",
                        WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", lineHeight: 1
                    }}>Gemini Intelligence Layer</div>
                    <div style={{ fontFamily: BODY, fontSize: 10, color: "#475569", marginTop: 3, letterSpacing: 0.3 }}>Contextual AI embedded within every communication</div>
                </div>
                <div style={{
                    marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
                    background: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.25)", borderRadius: 20, padding: "5px 12px"
                }}>
                    <motion.div animate={{ scale: [1, 1.5, 1], opacity: [1, .3, 1] }} transition={{ duration: 1.3, repeat: Infinity }}
                        style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                    <span style={{ fontSize: 9, color: "#22c55e", fontFamily: BODY, fontWeight: 700, letterSpacing: 1 }}>INTELLIGENCE ACTIVE</span>
                </div>
            </div>
            {/* Query buttons */}
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 18 }}>
                {qas.map((q, i) => (
                    <motion.button key={i} onClick={() => setQi(i)} whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: .96 }}
                        style={{
                            background: qi === i ? "linear-gradient(135deg,rgba(124,58,237,.4),rgba(79,70,229,.3))" : "rgba(255,255,255,.04)",
                            border: `1px solid ${qi === i ? "rgba(124,58,237,.6)" : "rgba(255,255,255,.07)"}`,
                            borderRadius: 22, padding: "6px 14px", color: qi === i ? "#c4b5fd" : "#475569",
                            fontSize: 10, cursor: "pointer", fontFamily: BODY, transition: "all .2s", fontWeight: qi === i ? 700 : 400,
                            display: "inline-flex", alignItems: "center", gap: 6
                        }}>
                        <span style={{ opacity: 0.8 }}>{q.icon}</span>{q.q}
                    </motion.button>
                ))}
            </div>
            {/* Chat bubble */}
            <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 18, padding: "16px", minHeight: 100 }}>
                <div style={{ display: "flex", gap: 9, marginBottom: 14, justifyContent: "flex-end" }}>
                    <div style={{
                        background: "linear-gradient(135deg,rgba(124,58,237,.3),rgba(79,70,229,.2))",
                        border: "1px solid rgba(124,58,237,.3)", borderRadius: "12px 0 12px 12px", padding: "8px 14px", maxWidth: "70%"
                    }}>
                        <span style={{ fontSize: 11, color: "#c4b5fd", fontFamily: BODY }}>{qas[qi].q}</span>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: "rgba(124,58,237,.3)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <User size={12} color="white" />
                    </div>
                </div>
                <div style={{ display: "flex", gap: 9 }}>
                    <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }}
                        style={{
                            width: 26, height: 26, borderRadius: 8, background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
                            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontWeight: 900, color: "white",
                            fontSize: 10, fontFamily: BODY
                        }}>M</motion.div>
                    <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: "0 12px 12px 12px", padding: "8px 14px", flex: 1 }}>
                        <AnimatePresence mode="wait">
                            <motion.span key={qi} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                style={{ fontSize: 11, color: "#94a3b8", lineHeight: 1.7, fontFamily: BODY }}>
                                {txt}
                                {typing && <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: .65, repeat: Infinity }}
                                    style={{ display: "inline-block", width: 2, height: 12, background: "#7c3aed", verticalAlign: "middle", marginLeft: 2, borderRadius: 1 }} />}
                            </motion.span>
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   STAT CARD
════════════════════════════════════════════════════════════ */
function useCountUp(end, dur = 1500, go = false) {
    const [v, setV] = useState(0);
    useEffect(() => {
        if (!go) return;
        let st = 0;
        const f = (t) => { if (!st) st = t; const p = Math.min((t - st) / dur, 1); setV(Math.floor((1 - Math.pow(1 - p, 3)) * end)); if (p < 1) requestAnimationFrame(f); };
        requestAnimationFrame(f);
    }, [go, end, dur]);
    return v;
}

function StatCard({ icon, num, label, color, sub, delay, go }) {
    const v = useCountUp(num, 1500, go);
    return (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: go ? 1 : 0, y: go ? 0 : 30 }} transition={{ delay, duration: .65, ease: [.23, 1, .32, 1] }}
            whileHover={{ y: -6, boxShadow: `0 28px 70px ${color}28` }}
            style={{
                background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(124,58,237,.2)",
                borderRadius: 22, padding: "28px 22px", display: "flex", flexDirection: "column", alignItems: "center",
                textAlign: "center", boxShadow: "0 14px 44px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.06)",
                position: "relative", overflow: "hidden", cursor: "default"
            }}>
            <div style={{ position: "absolute", top: -24, right: -24, width: 90, height: 90, background: `radial-gradient(ellipse,${color}30 0%,transparent 70%)` }} />
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${color},transparent)`, opacity: .5 }} />
            <motion.div animate={{ scale: [1, 1.12, 1] }} transition={{ duration: 3, repeat: Infinity, delay }}
                style={{ marginBottom: 12, color }}>{icon}</motion.div>
            <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 34, color: "white", lineHeight: 1, marginBottom: 4 }}>{v.toLocaleString()}</div>
            <div style={{ fontFamily: BODY, fontSize: 11, color: "#475569", lineHeight: 1.5, marginBottom: 10 }}>{label}</div>
            <div style={{ background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 10, padding: "4px 12px", fontSize: 9, color, fontWeight: 700, fontFamily: BODY }}>{sub}</div>
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   DEADLINE CARD
════════════════════════════════════════════════════════════ */
function DeadlineCard({ label, deadline, urgency, color, email, delay, go }) {
    return (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: go ? 1 : 0, y: go ? 0 : 20 }} transition={{ delay, duration: .6 }} whileHover={{ y: -5 }}
            style={{ background: `linear-gradient(145deg,${color}0a,rgba(9,7,26,.8))`, border: `1px solid ${color}35`, borderRadius: 18, padding: "18px 16px", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${color},transparent)`, opacity: .7 }} />
            <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 800, color: "white", marginBottom: 5 }}>{label}</div>
            <div style={{ fontFamily: BODY, fontSize: 9, color: "#475569", marginBottom: 10 }}>{email}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                <Clock size={12} color={color} />
                <span style={{ fontFamily: BODY, fontSize: 11, color, fontWeight: 700 }}>{deadline}</span>
            </div>
            <div style={{ background: `${color}20`, border: `1px solid ${color}45`, borderRadius: 8, padding: "4px 10px", display: "inline-block", fontFamily: BODY, fontSize: 9, color, fontWeight: 800 }}>{urgency}</div>
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   COMPARE TABLE
════════════════════════════════════════════════════════════ */
function CompareTable({ go }) {
    const rows = [
        { f: "Email Sorting", g: "Manual", m: "AI Categorisation", c: "#7c3aed" },
        { f: "Urgency Detection", g: "None", m: "Priority Score 0–100", c: "#ef4444" },
        { f: "Burnout Awareness", g: "None", m: "Live Stress Analytics", c: "#f97316" },
        { f: "Task Extraction", g: "None", m: "Automated Action Registry", c: "#22c55e" },
        { f: "AI Reply Drafting", g: "Basic", m: "Contextual Composition", c: "#06b6d4" },
        { f: "Spam Protection", g: "Basic Filter", m: "Neural Threat Detection", c: "#eab308" },
    ];
    return (
        <div style={{
            background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(124,58,237,.22)",
            borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.55)"
        }}>
            <div style={{
                display: "grid", gridTemplateColumns: "1fr 140px 200px", background: "rgba(255,255,255,.02)",
                borderBottom: "1px solid rgba(255,255,255,.06)", padding: "18px 28px"
            }}>
                <span style={{ fontFamily: BODY, fontSize: 9, color: "#334155", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>Feature</span>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div style={{ width: 24, height: 24, borderRadius: 7, background: "rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Mail size={13} color="#94a3b8" />
                    </div>
                    <span style={{ fontFamily: BODY, fontSize: 11, color: "#475569", fontWeight: 700 }}>Gmail</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <motion.div animate={{ boxShadow: ["0 0 0px rgba(124,58,237,0)", "0 0 16px rgba(124,58,237,.6)", "0 0 0px rgba(124,58,237,0)"] }} transition={{ duration: 2.5, repeat: Infinity }}
                        style={{ width: 24, height: 24, borderRadius: 7, background: "linear-gradient(135deg,#7c3aed,#06b6d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "white", fontFamily: BODY }}>M</motion.div>
                    <span style={{ fontFamily: BODY, fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>Scasi</span>
                </div>
            </div>
            {rows.map((r, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -24 }} animate={{ opacity: go ? 1 : 0, x: go ? 0 : -24 }} transition={{ delay: i * .09 + .2 }}
                    style={{
                        display: "grid", gridTemplateColumns: "1fr 140px 200px", padding: "15px 28px",
                        borderBottom: i < rows.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none", alignItems: "center"
                    }}>
                    <span style={{ fontFamily: BODY, fontSize: 12, color: "#64748b" }}>{r.f}</span>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: "rgba(239,68,68,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                            <span style={{ fontSize: 9, color: "#ef4444" }}>✕</span>
                        </div>
                        <span style={{ fontFamily: BODY, fontSize: 10, color: "#334155" }}>{r.g}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 16, height: 16, borderRadius: 4, background: `${r.c}25`, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: `0 0 6px ${r.c}50` }}>
                            <span style={{ fontSize: 9, color: r.c }}>✓</span>
                        </div>
                        <span style={{ fontFamily: BODY, fontSize: 10, color: r.c, fontWeight: 600 }}>{r.m}</span>
                    </div>
                </motion.div>
            ))}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════
   STACK CARD
════════════════════════════════════════════════════════════ */
function StackCard({ children, idx }) {
    const ref = useRef(null);
    const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
    const y = useTransform(scrollYProgress, [0, 1], [55, -30]);
    const sc = useTransform(scrollYProgress, [0, .4, .6, 1], [.96, 1, 1, .97]);
    return (
        <motion.div ref={ref} style={{ y, scale: sc, position: "relative", zIndex: idx, willChange: "transform" }}>
            {children}
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   HERO CYCLING HEADLINE
════════════════════════════════════════════════════════════ */
const CYCLING_WORDS = ["Smarter.", "Calmer.", "Faster.", "Clearer.", "Focused.", "Effortless."];

function HeroCyclingHeadline() {
    const [idx, setIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setIdx(i => (i + 1) % CYCLING_WORDS.length), 2200);
        return () => clearInterval(t);
    }, []);
    return (
        <span style={{ display: "block", fontFamily: "'Cormorant Garamond',serif" }}>
            <span style={{
                display: "block", background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                fontWeight: 900, letterSpacing: "-2px"
            }}>Your Inbox.</span>
            <span style={{ display: "flex", alignItems: "baseline", gap: 12, overflow: "hidden" }}>
                <AnimatePresence mode="wait">
                    <motion.span key={idx}
                        initial={{ y: 48, opacity: 0, rotateX: -35 }}
                        animate={{ y: 0, opacity: 1, rotateX: 0 }}
                        exit={{ y: -48, opacity: 0, rotateX: 35 }}
                        transition={{ duration: .48, ease: [.22, 1, .36, 1] }}
                        style={{
                            display: "inline-block", background: "linear-gradient(135deg,#6d28d9 0%,#9333ea 50%,#c026d3 100%)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                            fontWeight: 900, letterSpacing: "-2px"
                        }}>
                        {CYCLING_WORDS[idx]}
                    </motion.span>
                </AnimatePresence>
            </span>
            <span style={{
                display: "block", background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)",
                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                fontWeight: 700, letterSpacing: "-1px", opacity: .85, fontSize: ".72em", marginTop: 4, fontFamily: BODY
            }}>
                Engineered by AI. Refined for you.
            </span>
            <span style={{ display: "block", fontSize: "clamp(13px,1.3vw,16px)", fontWeight: 400, lineHeight: 1.8,
                color: "#64748b", marginTop: 22, fontFamily: BODY, maxWidth: 420, letterSpacing: ".1px"
            }}>
                Scasi&apos;s neural engine classifies priority, composes contextual replies, and surfaces critical actions — ensuring your highest-value work commands your undivided attention.
            </span>
        </span>
    );
}

/* ════════════════════════════════════════════════════════════
   LAPTOP MOCKUP
════════════════════════════════════════════════════════════ */
function LaptopMockup() {
    const [typing, setTyping] = useState(false);
    const [replyText, setReplyText] = useState("");
    const fullReply = "Dear Priya, thank you for following up. March 18th is confirmed as the go-live date. I will block the calendar and brief the engineering lead. Looking forward to a successful launch — warm regards...";

    useEffect(() => {
        const timeout = setTimeout(() => {
            setTyping(true); let i = 0;
            const interval = setInterval(() => { setReplyText(fullReply.slice(0, i)); i++; if (i > fullReply.length) clearInterval(interval); }, 28);
            return () => clearInterval(interval);
        }, 2500);
        return () => clearTimeout(timeout);
    }, []);

    const folders = [
        { icon: <Mail size={10} />, label: "Inbox", count: 14, active: true },
        { icon: <Star size={10} />, label: "Starred" },
        { icon: <Send size={10} />, label: "Sent" },
        { icon: <FileText size={10} />, label: "Drafts", count: 3 },
        { icon: <Zap size={10} />, label: "Priority", count: 5 },
        { icon: <LayoutGrid size={10} />, label: "Categories" },
    ];
    const emailList = [
        { from: "Priya Sharma", subj: "Product launch date?", time: "9:41 AM", urgent: true, read: false },
        { from: "Alex Rivera", subj: "Design review Friday", time: "8:20 AM", urgent: false, read: true },
        { from: "Finance Ops", subj: "Invoice #7043", time: "Yesterday", urgent: false, read: true },
        { from: "Dev Team", subj: "Sprint retrospective", time: "Yesterday", urgent: false, read: true },
        { from: "Omar Khalid", subj: "Partnership proposal", time: "Mon", urgent: false, read: true },
    ];

    return (
        <motion.div initial={{ opacity: 0, y: 40, rotateX: 8 }} animate={{ opacity: 1, y: 0, rotateX: 3 }}
            transition={{ duration: 1.2, delay: .3, ease: [.23, 1, .32, 1] }}
            style={{ width: 520, perspective: "1200px", filter: "drop-shadow(0 40px 80px rgba(109,40,217,.5))", transformStyle: "preserve-3d" }}>
            <div style={{
                background: "linear-gradient(160deg,#1a1040 0%,#0e0826 100%)", borderRadius: "16px 16px 0 0",
                border: "1.5px solid rgba(124,58,237,.35)", borderBottom: "none", padding: "12px 12px 0"
            }}>
                <div style={{
                    background: "rgba(255,255,255,.04)", borderRadius: "8px 8px 0 0", padding: "8px 12px",
                    display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,.06)"
                }}>
                    <div style={{ display: "flex", gap: 5 }}>
                        {["#ff5f56", "#ffbd2e", "#27c93f"].map((c, i) => (
                            <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
                        ))}
                    </div>
                    <div style={{ flex: 1, background: "rgba(255,255,255,.06)", borderRadius: 6, padding: "4px 10px", fontSize: 10, color: "#64748b", fontFamily: BODY, display: "flex", alignItems: "center", gap: 5 }}>
                        <Lock size={8} color="#64748b" /> app.scasi.ai
                    </div>
                </div>
                <div style={{ background: "#0d0b1e", minHeight: 320, display: "flex", fontSize: 11, fontFamily: BODY, overflow: "hidden" }}>
                    {/* Sidebar */}
                    <div style={{ width: 140, background: "#09071a", borderRight: "1px solid rgba(255,255,255,.05)", padding: "12px 0", flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 12px 12px", borderBottom: "1px solid rgba(255,255,255,.05)" }}>
                            <div style={{
                                width: 20, height: 20, borderRadius: 5, background: "linear-gradient(135deg,#7c3aed,#06b6d4)",
                                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 900, color: "white", fontFamily: BODY
                            }}>M</div>
                            <span style={{ color: "white", fontWeight: 700, fontSize: 12, fontFamily: BODY }}>Scasi</span>
                        </div>
                        {folders.map((f, i) => (
                            <div key={i} style={{
                                display: "flex", alignItems: "center", gap: 7, padding: "7px 12px",
                                background: f.active ? "rgba(124,58,237,.2)" : "transparent",
                                borderLeft: f.active ? "2px solid #7c3aed" : "2px solid transparent"
                            }}>
                                <span style={{ display: "flex", alignItems: "center", color: f.active ? "#a78bfa" : "#475569" }}>{f.icon}</span>
                                <span style={{ color: f.active ? "#a78bfa" : "#475569", fontSize: 10, flex: 1, fontFamily: BODY }}>{f.label}</span>
                                {f.count !== undefined && (
                                    <span style={{ background: "rgba(124,58,237,.3)", color: "#a78bfa", fontSize: 8, padding: "1px 5px", borderRadius: 10, fontFamily: BODY }}>{f.count}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    {/* Email list panel */}
                    <div style={{ width: 160, borderRight: "1px solid rgba(255,255,255,.05)", padding: "8px 0" }}>
                        <div style={{ padding: "6px 10px", fontSize: 9, color: "#475569", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", fontFamily: BODY }}>Inbox · 14</div>
                        {emailList.map((m, i) => (
                            <div key={i} style={{
                                padding: "8px 10px", background: i === 0 ? "rgba(124,58,237,.15)" : "transparent",
                                borderLeft: i === 0 ? "2px solid #7c3aed" : "2px solid transparent"
                            }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                                    <span style={{ color: m.read ? "#475569" : "#e2e8f0", fontSize: 10, fontWeight: m.read ? 400 : 700, fontFamily: BODY }}>{m.from}</span>
                                    <span style={{ color: "#334155", fontSize: 8, fontFamily: BODY }}>{m.time}</span>
                                </div>
                                <div style={{ color: "#334155", fontSize: 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", fontFamily: BODY }}>{m.subj}</div>
                                {m.urgent && <span style={{ background: "rgba(239,68,68,.2)", color: "#f87171", fontSize: 7, padding: "1px 5px", borderRadius: 8, fontWeight: 700, fontFamily: BODY }}>CRITICAL</span>}
                            </div>
                        ))}
                    </div>
                    {/* Detail pane */}
                    <div style={{ flex: 1, padding: "12px" }}>
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .8 }}
                            style={{
                                background: "linear-gradient(135deg,rgba(234,179,8,.1),rgba(234,179,8,.05))",
                                border: "1px solid rgba(234,179,8,.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 10
                            }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                                <Zap size={13} color="#fbbf24" />
                                <span style={{ color: "#fbbf24", fontWeight: 800, fontSize: 12, fontFamily: BODY }}>Action Required</span>
                            </div>
                            <div style={{ color: "#94a3b8", fontSize: 10, fontFamily: BODY }}>AI Analysis: Priya requires go-live date confirmation this week.</div>
                        </motion.div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
                            style={{
                                background: "linear-gradient(135deg,#7c3aed,#4f46e5)", borderRadius: 8, padding: "9px 14px",
                                display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10,
                                boxShadow: "0 4px 20px rgba(124,58,237,.4)"
                            }}>
                            <span style={{ color: "white", fontWeight: 700, fontSize: 11, fontFamily: BODY }}>Compose Reply →</span>
                        </motion.div>
                        <AnimatePresence>
                            {typing && (
                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                                    style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: "10px 12px" }}>
                                    <div style={{ color: "#94a3b8", fontSize: 10, lineHeight: 1.6, fontFamily: BODY }}>
                                        {replyText}
                                        <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: .8, repeat: Infinity }}
                                            style={{ display: "inline-block", width: 1.5, height: 12, background: "#7c3aed", verticalAlign: "middle", marginLeft: 1, borderRadius: 1 }} />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
            <div style={{
                background: "linear-gradient(180deg,#1a1040,#120d30)", height: 16, borderRadius: "0 0 6px 6px",
                border: "1.5px solid rgba(124,58,237,.25)", borderTop: "none"
            }} />
        </motion.div>
    );
}

/* ════════════════════════════════════════════════════════════
   FEATURES SECTION INNER
════════════════════════════════════════════════════════════ */
function ScasiFeaturesSectionInner() {
    const STATES = [
        [74, "High", "Rising"], [89, "High", "Rising"], [56, "Medium", "Stable"],
        [32, "Low", "Falling"], [50, "Medium", "Rising"], [92, "High", "Rising"],
    ];
    const [si, setSi] = useState(0);
    useEffect(() => { const iv = setInterval(() => setSi(p => (p + 1) % STATES.length), 3800); return () => clearInterval(iv); }, [STATES.length]);
    const [stress, workload, trend] = STATES[si];
    const sc = stress > 70 ? "#ef4444" : stress > 40 ? "#f97316" : "#22c55e";
    const sl = stress > 70 ? "Critical" : stress > 40 ? "Elevated" : "Nominal";

    const ref0 = useRef(null); const ref1 = useRef(null); const ref2 = useRef(null);
    const ref3 = useRef(null); const ref4 = useRef(null); const ref5 = useRef(null);
    const ref6 = useRef(null); const ref7 = useRef(null); const ref8 = useRef(null);
    const iv0 = useInView(ref0, { once: true, margin: "-50px" });
    const iv1 = useInView(ref1, { once: true, margin: "-50px" });
    const iv2 = useInView(ref2, { once: true, margin: "-50px" });
    const iv3 = useInView(ref3, { once: true, margin: "-50px" });
    const iv4 = useInView(ref4, { once: true, margin: "-50px" });
    const iv5 = useInView(ref5, { once: true, margin: "-50px" });
    const iv6 = useInView(ref6, { once: true, margin: "-50px" });
    const iv7 = useInView(ref7, { once: true, margin: "-50px" });
    const iv8 = useInView(ref8, { once: true, margin: "-50px" });
    const inViews = [iv0, iv1, iv2, iv3, iv4, iv5, iv6, iv7, iv8];

    const base = {
        background: "linear-gradient(145deg,#0e0b28 0%,#0b0920 100%)",
        border: "1px solid rgba(124,58,237,0.2)",
        borderRadius: 26, overflow: "hidden",
        boxShadow: "0 20px 60px rgba(0,0,0,0.55),inset 0 1px 0 rgba(255,255,255,0.06)",
        position: "relative",
    };

    return (
        <section style={{ padding: "0 48px 160px", fontFamily: BODY, position: "relative", overflow: "hidden" }}>
            <style>{`.fc{transition:transform .3s ease,box-shadow .3s ease}.fc:hover{transform:translateY(-6px);box-shadow:0 36px 90px rgba(109,40,217,0.3)!important}`}</style>
            <div style={{ maxWidth: 940, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20, position: "relative", zIndex: 10 }}>

                {/* ── CARD 1: Cognitive Wellbeing ── */}
                <StackCard idx={1}>
                    <motion.div ref={ref0} className="fc"
                        initial={{ opacity: 0, y: 60 }} animate={{ opacity: inViews[0] ? 1 : 0, y: inViews[0] ? 0 : 60 }}
                        transition={{ duration: .95, ease: [.23, 1, .32, 1] }}
                        style={{ ...base, padding: "36px 36px 28px" }}>
                        <motion.div animate={{ background: `radial-gradient(ellipse,${sc}14 0%,transparent 70%)` }} transition={{ duration: 1.2 }}
                            style={{ position: "absolute", top: -60, right: -60, width: 280, height: 280, pointerEvents: "none" }} />
                        <div style={{
                            position: "absolute", top: 0, left: 0, right: 0, height: 3,
                            background: `linear-gradient(90deg,transparent 0%,${sc}80 40%,#7c3aed 60%,transparent 100%)`, transition: "background 1.2s"
                        }} />
                        <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 26 }}>
                            <div style={{ flex: 1 }}>
                                <Pill icon={<Brain size={10} color="#ef4444" />} text="Cognitive Wellbeing Engine" color="#ef4444" />
                                <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 26, lineHeight: 1.15, marginBottom: 6 }}>
                                    <span style={{ background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Protect Your Focus —</span><br />
                                    <span style={{ background: "linear-gradient(135deg,#f97316,#ef4444)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Stress Intelligence & Recovery</span>
                                </h2>
                                <p style={{ fontFamily: BODY, fontSize: 12, color: "#475569", lineHeight: 1.75 }}>
                                    Scasi&apos;s neural monitoring system analyses your communication patterns in real time, detecting late-hour pressure spikes and cognitive overload before burnout takes hold.
                                </p>
                            </div>
                            <motion.div animate={{ boxShadow: ["0 0 0px rgba(239,68,68,0)", "0 0 20px rgba(239,68,68,.4)", "0 0 0px rgba(239,68,68,0)"] }} transition={{ duration: 2, repeat: Infinity }}
                                style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", borderRadius: 20, padding: "7px 14px" }}>
                                <motion.div animate={{ scale: [1, 1.6, 1], opacity: [1, .25, 1] }} transition={{ duration: 1.1, repeat: Infinity }} style={{ width: 8, height: 8, borderRadius: "50%", background: "#ef4444" }} />
                                <span style={{ fontSize: 10, color: "#fca5a5", fontFamily: BODY, fontWeight: 800, letterSpacing: 1 }}>MONITORING ACTIVE</span>
                            </motion.div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 30 }}>
                            <div>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 18 }}>
                                    {[
                                        { label: "Stress", val: `${stress}/100`, color: sc },
                                        { label: "Workload", val: workload, color: workload === "High" ? "#ef4444" : workload === "Medium" ? "#f97316" : "#22c55e" },
                                        { label: "Trend", val: `${trend === "Rising" ? "↑" : trend === "Falling" ? "↓" : "→"} ${trend}`, color: trend === "Rising" ? "#ef4444" : trend === "Falling" ? "#22c55e" : "#eab308" },
                                    ].map(pill => (
                                        <AnimatePresence key={pill.label} mode="wait">
                                            <motion.div key={pill.val} initial={{ scale: .85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: .85, opacity: 0 }} transition={{ duration: .35 }}
                                                style={{ background: `${pill.color}10`, border: `1px solid ${pill.color}30`, borderRadius: 14, padding: "10px 8px", textAlign: "center" }}>
                                                <div style={{ fontSize: 8, color: "#334155", fontFamily: BODY, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 }}>{pill.label}</div>
                                                <div style={{ fontSize: 13, fontWeight: 900, color: pill.color, fontFamily: BODY }}>{pill.val}</div>
                                            </motion.div>
                                        </AnimatePresence>
                                    ))}
                                </div>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                                        <span style={{ fontSize: 10, color: "#475569", fontFamily: BODY }}>Stress Index</span>
                                        <AnimatePresence mode="wait">
                                            <motion.span key={sl} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                                                style={{ fontSize: 10, color: sc, fontWeight: 800, fontFamily: BODY }}>{sl}</motion.span>
                                        </AnimatePresence>
                                    </div>
                                    <div style={{ height: 10, background: "rgba(255,255,255,.05)", borderRadius: 8, overflow: "hidden", position: "relative" }}>
                                        <motion.div animate={{ width: `${stress}%`, background: `linear-gradient(90deg,${stress > 70 ? "#f97316" : "#22c55e"},${sc})` }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                            style={{ height: "100%", borderRadius: 8, boxShadow: `0 0 18px ${sc}60` }} />
                                    </div>
                                </div>
                                <AnimatePresence mode="wait">
                                    <motion.div key={`tip-${si}`} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: .4 }}
                                        style={{ padding: "12px 16px", background: `${sc}0c`, border: `1px solid ${sc}28`, borderRadius: 14, fontSize: 11, color: "#94a3b8", fontFamily: BODY, lineHeight: 1.65 }}>
                                        {stress > 70
                                            ? "Analysis: 12 high-urgency communications logged between 23:00–01:00. Burnout probability elevated. Recommendation: activate inbox pause immediately."
                                            : stress > 40
                                                ? "Assessment: Moderate load detected. 3 critical items require attention before 17:00. Structured focus recommended."
                                                : "Status: Communication load nominal. Optimal window for processing deferred correspondence."}
                                    </motion.div>
                                </AnimatePresence>
                            </div>
                            <div>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                                    <span style={{ fontSize: 10, color: "#334155", fontFamily: BODY, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.2 }}>Stress Trend</span>
                                    <motion.div key={`wl-${workload}`} initial={{ scale: .8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                                        style={{ fontSize: 9, color: sc, background: `${sc}15`, padding: "3px 10px", borderRadius: 8, fontFamily: BODY, border: `1px solid ${sc}35`, fontWeight: 700 }}>
                                        {workload} Workload
                                    </motion.div>
                                </div>
                                <LiveBurnoutChart stress={stress} workload={workload} trend={trend} />
                            </div>
                        </div>
                    </motion.div>
                </StackCard>

                {/* ── CARD 2: Priority Scoring ── */}
                <StackCard idx={2}>
                    <div ref={ref1} style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 20 }}>
                        <motion.div className="fc" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: inViews[1] ? 1 : 0, scale: inViews[1] ? 1 : .9 }} transition={{ duration: .8, ease: [.23, 1, .32, 1] }}
                            style={{ ...base, display: "flex", alignItems: "center", justifyContent: "center", padding: "36px 20px" }}>
                            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center,rgba(124,58,237,.2) 0%,transparent 70%)", pointerEvents: "none" }} />
                            <StarOrb />
                        </motion.div>
                        <motion.div className="fc" initial={{ opacity: 0, x: 40 }} animate={{ opacity: inViews[1] ? 1 : 0, x: inViews[1] ? 0 : 40 }} transition={{ duration: .8, delay: .12, ease: [.23, 1, .32, 1] }}
                            style={{ ...base, padding: "32px 30px" }}>
                            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,transparent,#7c3aed,#4f46e5,transparent)", opacity: .8 }} />
                            <Pill icon={<Zap size={10} color="#a78bfa" />} text="Intelligent Priority Classification" color="#a78bfa" />
                            <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 24, background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 10 }}>Priority Scoring</h2>
                            <p style={{ fontFamily: BODY, color: "#475569", fontSize: 12, lineHeight: 1.75, marginBottom: 22 }}>
                                Every communication receives a real-time Priority Score from 0–100. Time-sensitive opportunities, client commitments, and critical deadlines are automatically ranked — ensuring zero exceptions.
                            </p>
                            <ScoreBar label="Interviews & Career Opportunities" score={95} color="#7c3aed" delay={.30} go={inViews[1]} />
                            <ScoreBar label="Client & Payment Obligations" score={88} color="#ef4444" delay={.45} go={inViews[1]} />
                            <ScoreBar label="Legal & Financial Compliance" score={82} color="#f97316" delay={.60} go={inViews[1]} />
                            <ScoreBar label="Team Collaboration" score={64} color="#06b6d4" delay={.75} go={inViews[1]} />
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .97 }}
                                style={{ marginTop: 20, background: "#ffffff", border: "none", borderRadius: 100, padding: "11px 26px", color: "#1e1b4b", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: BODY, boxShadow: "0 6px 24px rgba(124,58,237,.45)", display: "flex", alignItems: "center", gap: 8 }}>
                                <Gem size={14} color="#7c3aed" /> Unlock Full Access
                            </motion.button>
                        </motion.div>
                    </div>
                </StackCard>

                {/* ── CARD 3: Task Extraction ── */}
                <StackCard idx={3}>
                    <motion.div ref={ref2} className="fc"
                        initial={{ opacity: 0, y: 36 }} animate={{ opacity: inViews[2] ? 1 : 0, y: inViews[2] ? 0 : 36 }}
                        transition={{ duration: .85, ease: [.23, 1, .32, 1] }}
                        style={{ ...base, padding: "34px", display: "flex", gap: 34, alignItems: "center" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,transparent,#06b6d4,#22c55e,transparent)", opacity: .7 }} />
                        <div style={{ flex: 1 }}>
                            <Pill icon={<CheckCircle size={10} color="#06b6d4" />} text="Automated Action Intelligence" color="#06b6d4" />
                            <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 24, lineHeight: 1.2, marginBottom: 10 }}>
                                <span style={{ background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Action Registry —</span>{" "}
                                <span style={{ background: "linear-gradient(135deg,#a78bfa,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Clarity in Seconds</span>
                            </h2>
                            <p style={{ fontFamily: BODY, color: "#64748b", fontSize: 12, lineHeight: 1.8, marginBottom: 22 }}>
                                Financial commitments, meeting invitations, hard deadlines, and action requirements are automatically extracted and catalogued — converting unstructured correspondence into a precision task registry.
                            </p>
                            <TaskRow text="Confirm interview attendance: 14:45 tomorrow" done={true} delay={.12} go={inViews[2]} tag="Completed" />
                            <TaskRow text="Review and execute: Client ABC Contract" done={true} delay={.22} go={inViews[2]} tag="Completed" />
                            <TaskRow text="Authorise payment: Invoice #4821 — Due today" done={false} delay={.32} go={inViews[2]} tag="Critical" />
                            <TaskRow text="Deliver sprint presentation: Friday, end of day" done={false} delay={.42} go={inViews[2]} tag="Due Friday" />
                            <TaskRow text="Respond to recruiter communication: Before 17:00" done={false} delay={.52} go={inViews[2]} tag="17:00" />
                        </div>
                        <ClipboardOrb />
                    </motion.div>
                </StackCard>

                {/* ── CARD 4: Live Inbox Preview ── */}
                <StackCard idx={4}>
                    <div ref={ref3}>
                        <InboxSectionCard inView={inViews[3]} />
                    </div>
                </StackCard>

                {/* ── CARD 5: Email Overload ── */}
                <StackCard idx={5}>
                    <motion.div ref={ref4} className="fc"
                        initial={{ opacity: 0, y: 36 }} animate={{ opacity: inViews[4] ? 1 : 0, y: inViews[4] ? 0 : 36 }}
                        transition={{ duration: .85, ease: [.23, 1, .32, 1] }}
                        style={{ ...base, padding: "34px", display: "flex", gap: 34, alignItems: "center" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,transparent,#ef4444,#f97316,transparent)", opacity: .7 }} />
                        <div style={{ flex: 1 }}>
                            <Pill icon={<AlertTriangle size={10} color="#ef4444" />} text="The Cost of Disorder" color="#ef4444" />
                            <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 26, lineHeight: 1.15, marginBottom: 10 }}>
                                <span style={{ background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>The Compounding Cost of</span><br />
                                <span style={{ background: "linear-gradient(135deg,#ef4444,#f97316)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Inbox Disorder</span>
                            </h2>
                            <p style={{ fontFamily: BODY, color: "#64748b", fontSize: 13, lineHeight: 1.85, marginBottom: 24 }}>
                                Persistent notifications and an unmanaged inbox erode mental bandwidth, precipitating chronic stress, diminished output, and a perpetual sense of being overwhelmed.{" "}
                                <strong style={{ color: "#cbd5e1" }}>Break the cycle of digital exhaustion.</strong>
                            </p>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 26 }}>
                                {[
                                    { stat: "28%", label: "of productive time lost to email management", color: "#ef4444", icon: <Clock size={16} color="#ef4444" /> },
                                    { stat: "3.1h", label: "average cognitive hours lost daily", color: "#f97316", icon: <Activity size={16} color="#f97316" /> },
                                    { stat: "40%", label: "elevated burnout risk from inbox overload", color: "#eab308", icon: <Flame size={16} color="#eab308" /> },
                                ].map((item, i) => (
                                    <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: inViews[4] ? 1 : 0, y: inViews[4] ? 0 : 14 }} transition={{ delay: .2 + i * .1 }}
                                        style={{ background: `${item.color}0c`, border: `1px solid ${item.color}28`, borderRadius: 16, padding: "14px 12px", textAlign: "center" }}>
                                        <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>{item.icon}</div>
                                        <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 22, color: item.color, lineHeight: 1, marginBottom: 4 }}>{item.stat}</div>
                                        <div style={{ fontFamily: BODY, fontSize: 9, color: "#475569", lineHeight: 1.55 }}>{item.label}</div>
                                    </motion.div>
                                ))}
                            </div>
                            <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }}
                                style={{ background: "linear-gradient(135deg,#7c3aed,#4f46e5)", border: "none", borderRadius: 100, padding: "12px 26px", color: "white", fontWeight: 800, fontSize: 13, cursor: "pointer", fontFamily: BODY, boxShadow: "0 6px 24px rgba(124,58,237,.4)", display: "flex", alignItems: "center", gap: 8 }}>
                                <Sparkles size={14} /> Resolve This with Scasi →
                            </motion.button>
                        </div>
                        <OverloadPhone />
                    </motion.div>
                </StackCard>

                {/* ── CARD 6: Gemini AI ── */}
                <StackCard idx={6}>
                    <div ref={ref5}>
                        <GeminiChat inView={inViews[5]} />
                    </div>
                </StackCard>

                {/* ── CARD 7: Stats ── */}
                <StackCard idx={7}>
                    <div ref={ref6} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                        <StatCard icon={<Shield size={32} color="#ef4444" />} num={2847} label="Malicious Emails Intercepted This Month" color="#ef4444" sub="+18% month-over-month" delay={0} go={inViews[6]} />
                        <StatCard icon={<Clock size={32} color="#7c3aed" />} num={94} label="Critical Deadlines Automatically Surfaced" color="#7c3aed" sub="98.7% detection accuracy" delay={.12} go={inViews[6]} />
                        <StatCard icon={<Zap size={32} color="#06b6d4" />} num={1203} label="Contextual AI Replies Composed" color="#06b6d4" sub="+31% this week" delay={.24} go={inViews[6]} />
                    </div>
                </StackCard>

                {/* ── CARD 8: Deadline Detection ── */}
                <StackCard idx={8}>
                    <motion.div ref={ref7} className="fc"
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: inViews[7] ? 1 : 0, y: inViews[7] ? 0 : 30 }}
                        transition={{ duration: .8, ease: [.23, 1, .32, 1] }}
                        style={{ ...base, padding: "30px" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,transparent,#eab308,#f97316,transparent)", opacity: .7 }} />
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
                            <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 3, repeat: Infinity }}>
                                <Clock size={28} color="#eab308" />
                            </motion.div>
                            <div>
                                <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 19, background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Temporal Intelligence Engine</div>
                                <div style={{ fontFamily: BODY, fontSize: 10, color: "#475569", marginTop: 2, letterSpacing: 0.3 }}>Every time-critical communication, automatically identified and prioritised</div>
                            </div>
                            <div style={{ marginLeft: "auto", background: "rgba(234,179,8,.1)", border: "1px solid rgba(234,179,8,.25)", borderRadius: 20, padding: "5px 12px", display: "flex", alignItems: "center", gap: 6 }}>
                                <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }}
                                    style={{ width: 6, height: 6, borderRadius: "50%", background: "#fbbf24" }} />
                                <span style={{ fontSize: 9, color: "#fbbf24", fontWeight: 700, fontFamily: BODY, letterSpacing: 1 }}>SCANNING</span>
                            </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14 }}>
                            <DeadlineCard label="Interview Confirmation" deadline="Today, 17:00" urgency="Critical" color="#ef4444" email="From: Recruiter, Smith & Partners" delay={.20} go={inViews[7]} />
                            <DeadlineCard label="Invoice #4821 — Payment" deadline="Tomorrow, EOD" urgency="Elevated" color="#f97316" email="From: Client ABC Finance" delay={.32} go={inViews[7]} />
                            <DeadlineCard label="Sprint Planning Deck" deadline="21 Feb 2026" urgency="Moderate" color="#eab308" email="From: Engineering Lead" delay={.44} go={inViews[7]} />
                        </div>
                    </motion.div>
                </StackCard>

                {/* ── CARD 9: Compare Table ── */}
                <StackCard idx={9}>
                    <motion.div ref={ref8}
                        initial={{ opacity: 0, y: 36 }} animate={{ opacity: inViews[8] ? 1 : 0, y: inViews[8] ? 0 : 36 }}
                        transition={{ duration: .85, ease: [.23, 1, .32, 1] }}>
                        <div style={{ textAlign: "center", marginBottom: 24 }}>
                            <Pill icon={<BarChart2 size={10} color="#a78bfa" />} text="Feature Comparison" color="#a78bfa" />
                            <h2 style={{
                                fontFamily: DISPLAY, fontWeight: 900, fontSize: 28, marginBottom: 8,
                                background: "linear-gradient(135deg,#3b0764,#7c3aed,#a855f7,#c084fc)",
                                WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
                            }}>The Scasi Advantage</h2>
                            <p style={{ fontFamily: BODY, fontSize: 12, color: "#475569" }}>A definitive comparison of native capability versus AI-powered intelligence</p>
                        </div>
                        <CompareTable go={inViews[8]} />
                    </motion.div>
                </StackCard>

            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════════════ */
export default function ScasiComplete() {
    return (
        <div style={{ background: "#ffffff", fontFamily: BODY, color: "#1e1b4b", overflowX: "hidden" }}>
            <ElegantCursor />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Cormorant+Garamond:wght@400;500;600;700;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#ffffff;overflow-x:hidden}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:linear-gradient(#7c3aed,#a855f7);border-radius:10px}
        ::selection{background:rgba(124,58,237,0.18);color:#4c1d95}
      `}</style>

            {/* ══════════════════════════════════════════════
          HERO
      ══════════════════════════════════════════════ */}
            <section style={{ position: "relative", minHeight: "100vh", background: "#ffffff", overflow: "hidden" }}>
                <NebulaBG style={{ zIndex: 0 }} />

                <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: "absolute", top: "8%", right: "8%", width: 180, height: 180, borderRadius: "50%",
                        border: "1px solid rgba(124,58,237,0.15)", zIndex: 2, pointerEvents: "none"
                    }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 55, repeat: Infinity, ease: "linear" }}
                    style={{
                        position: "absolute", top: "6%", right: "6%", width: 260, height: 260, borderRadius: "50%",
                        border: "1px dashed rgba(168,85,247,0.12)", zIndex: 2, pointerEvents: "none"
                    }} />

                <div style={{
                    position: "relative", zIndex: 10, width: "100%", maxWidth: 1200, margin: "0 auto",
                    padding: "100px 60px 60px", display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 60,
                    alignItems: "center", minHeight: "100vh"
                }}>
                    <div>
                        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}
                            style={{
                                display: "inline-flex", alignItems: "center", gap: 8,
                                background: "linear-gradient(135deg,rgba(124,58,237,.08),rgba(168,85,247,.05))",
                                border: "1px solid rgba(124,58,237,.2)", borderRadius: 100, padding: "6px 16px", marginBottom: 24
                            }}>
                            <motion.div animate={{ scale: [1, 1.5, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                                style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed" }} />
                            <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 700, fontFamily: BODY, letterSpacing: 0.5 }}>Precision Intelligence for Executive Communication</span>
                        </motion.div>

                        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: .9, delay: .1, ease: [.23, 1, .32, 1] }}
                            style={{ fontSize: "clamp(52px,5.5vw,82px)", fontWeight: 900, lineHeight: 1.05, marginBottom: 0, letterSpacing: "-2px", fontFamily: "'Cormorant Garamond',serif" }}>
                            <HeroCyclingHeadline />
                        </motion.h1>
                    </div>

                    <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", transform: "translateX(70px)" }}>
                        <LaptopMockup />
                    </div>
                </div>
            </section>

            {/* ══════════════════════════════════════════════
          DARK BRIDGE SECTION
      ══════════════════════════════════════════════ */}
            <WaveDown fromColor="#ffffff" toColor="#0d0922" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0d0922", paddingTop: 16, paddingBottom: 0 }}>
                <NodeCanvas />
                <div style={{
                    position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
                    width: "70%", height: "80%",
                    background: "radial-gradient(ellipse at 50% 40%, rgba(124,58,237,.18) 0%, rgba(88,28,199,.08) 40%, transparent 70%)",
                    pointerEvents: "none", zIndex: 1
                }} />
                <div style={{
                    position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
                    width: "60%", height: 1,
                    background: "linear-gradient(90deg,transparent,rgba(167,139,250,.3),transparent)",
                    zIndex: 2
                }} />

                <div style={{
                    position: "relative", zIndex: 10,
                    maxWidth: 900, margin: "0 auto",
                    padding: "80px 48px 96px",
                    textAlign: "center",
                }}>
                    <motion.div
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: .6 }}
                        style={{
                            display: "inline-flex", alignItems: "center", gap: 8,
                            background: "rgba(124,58,237,.25)",
                            border: "1px solid rgba(167,139,250,.3)",
                            borderRadius: 100, padding: "7px 20px", marginBottom: 36,
                        }}>
                        <motion.div
                            animate={{ scale: [1, 1.5, 1], opacity: [1, .4, 1] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            style={{ width: 7, height: 7, borderRadius: "50%", background: "#a78bfa" }} />
                        <span style={{
                            fontSize: 11, fontWeight: 800, letterSpacing: 2,
                            textTransform: "uppercase", fontFamily: BODY, color: "#c4b5fd"
                        }}>
                            Why Scasi?
                        </span>
                    </motion.div>

                    <motion.h2
                        initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: .85, ease: [.23, 1, .32, 1], delay: .08 }}
                        style={{
                            fontSize: "clamp(56px,7.5vw,108px)", fontWeight: 900,
                            letterSpacing: "-3.5px", lineHeight: .98,
                            fontFamily: DISPLAY,
                            color: "#c084fc",
                            marginBottom: 28,
                            background: "linear-gradient(160deg,#e9d5ff 0%,#c084fc 35%,#a855f7 65%,#7c3aed 100%)",
                            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
                        }}>
                        Everything You Need.
                    </motion.h2>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }} transition={{ duration: .7, delay: .18 }}
                        style={{
                            fontFamily: BODY, fontSize: 17,
                            color: "rgba(196,181,253,.65)",
                            lineHeight: 1.82, maxWidth: 560, margin: "0 auto",
                        }}>
                        From predictive priority scoring to burnout prevention — Scasi transforms inbox chaos into a precision-engineered command centre.
                    </motion.p>
                </div>
            </section>
            <WaveUp fromColor="#0d0922" toColor="#ffffff" />

            {/* ══════════════════════════════════════════════
          FEATURE CARDS
      ══════════════════════════════════════════════ */}
            <div style={{ position: "relative", overflow: "hidden", background: "#ffffff" }}>
                <NerveCanvas />
                <div style={{
                    position: "absolute", top: 0, left: 0, width: 3, height: "100%",
                    background: "linear-gradient(180deg,transparent,#7c3aed 20%,#a855f7 50%,#c084fc 80%,transparent)",
                    opacity: .25, pointerEvents: "none", zIndex: 1
                }} />
                <div style={{ position: "relative", zIndex: 10 }}>
                    <ScasiFeaturesSectionInner />
                </div>
            </div>

            {/* ══════════════════════════════════════════════
          CTA FOOTER
      ══════════════════════════════════════════════ */}
            <WaveDown fromColor="#ffffff" toColor="#0e0b22" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0e0b22" }}>
                <NodeCanvas />
                <div style={{
                    position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
                    width: "60%", height: 300, background: "radial-gradient(ellipse,rgba(124,58,237,.18) 0%,transparent 65%)",
                    filter: "blur(60px)", pointerEvents: "none"
                }} />
                <div style={{ position: "relative", zIndex: 10, maxWidth: 700, margin: "0 auto", padding: "96px 48px 120px", textAlign: "center" }}>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .8 }}>
                        <Chip label="Get Started" dark />
                        <h2 style={{
                            fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(36px,4vw,60px)",
                            letterSpacing: "-2px", lineHeight: 1.1, color: "rgba(255,255,255,.95)", marginBottom: 18
                        }}>
                            Your inbox deserves intelligence.<br />
                            <span style={{ background: "linear-gradient(135deg,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>So does your attention.</span>
                        </h2>
                        <p style={{ fontFamily: BODY, fontSize: 16, color: "rgba(200,188,255,.65)", lineHeight: 1.85, marginBottom: 40, maxWidth: 480, margin: "0 auto 40px" }}>
                            Join a discerning community of professionals who have reclaimed their focus and transformed inbox disorder into a precision-engineered workflow.
                        </p>
                        <motion.button whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(124,58,237,.5)" }} whileTap={{ scale: .97 }}
                            onClick={() => signIn("google", { callbackUrl: "/loading" })}
                            style={{
                                background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", borderRadius: 100,
                                padding: "16px 44px", color: "white", fontWeight: 800, fontSize: 16, fontFamily: BODY,
                                boxShadow: "0 8px 32px rgba(124,58,237,.4)", cursor: "pointer", letterSpacing: 0.3
                            }}>
                            Begin Your Free Trial — Connect with Google
                        </motion.button>
                    </motion.div>
                </div>
            </section>

        </div>
    );
}