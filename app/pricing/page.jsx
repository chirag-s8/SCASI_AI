"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { signIn } from "next-auth/react";
import Header from "@/components/dashboard/Header";
import Footer from "@/components/Footer";

const DISPLAY = "'Playfair Display',serif";
const BODY = "'Outfit',sans-serif";

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
                border: "1.5px solid rgba(124,58,237,0.55)", zIndex: 99999, pointerEvents: "none", willChange: "transform"
            }} />
            <div ref={dotRef} style={{
                position: "fixed", top: 0, left: 0, width: 6, height: 6, borderRadius: "50%",
                background: "#7c3aed", zIndex: 100000, pointerEvents: "none", willChange: "transform",
                boxShadow: "0 0 8px rgba(124,58,237,.7)"
            }} />
        </>
    );
}

function NebulaBG({ style }) {
    const canvasRef = useRef(null);
    const mouseRef = useRef({ x: 0, y: 0 });

    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return;
        const ctx = canvas.getContext("2d"); if (!ctx) return;
        let W = window.innerWidth, H = canvas.offsetHeight || window.innerHeight;
        canvas.width = W; canvas.height = H;

        const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
        window.addEventListener("mousemove", onMouse);

        const SHADES = ["rgba(124,58,237,", "rgba(168,85,247,", "rgba(196,130,255,", "rgba(88,28,199,", "rgba(147,51,234,"];
        const lines = Array.from({ length: 24 }, () => ({
            x1: Math.random() * W, y1: Math.random() * H, x2: Math.random() * W, y2: Math.random() * H,
            progress: Math.random(), speed: 0.001 + Math.random() * 0.0014,
            color: SHADES[Math.floor(Math.random() * SHADES.length)],
            width: Math.random() * 1.4 + 0.4, opacity: Math.random() * 0.3 + 0.07,
        }));

        const orbs = Array.from({ length: 6 }, () => ({
            x: Math.random() * W, y: Math.random() * H * 0.8,
            r: 100 + Math.random() * 180, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .2,
            hue: 260 + Math.random() * 55, opacity: 0.07 + Math.random() * 0.09, phase: Math.random() * Math.PI * 2,
        }));

        const particles = Array.from({ length: 500 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            r: Math.random() * .8 + .1, opacity: Math.random() * .45 + .1,
            phase: Math.random() * Math.PI * 2, speed: Math.random() * .02 + .005, hue: 250 + Math.random() * 80,
        }));

        const ripples = [];
        const onClick = (e) => { ripples.push({ x: e.clientX, y: e.clientY, r: 0, maxR: 80, opacity: 0.6 }); };
        window.addEventListener("click", onClick);

        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .012;
            ctx.clearRect(0, 0, W, H);
            for (const orb of orbs) {
                orb.x += orb.vx + Math.sin(t * .3 + orb.phase) * .4;
                orb.y += orb.vy + Math.cos(t * .2 + orb.phase) * .3;
                if (orb.x < -orb.r) orb.x = W + orb.r; if (orb.x > W + orb.r) orb.x = -orb.r;
                if (orb.y < -orb.r) orb.y = H + orb.r; if (orb.y > H + orb.r) orb.y = -orb.r;
                const pulse = 1 + Math.sin(t * .5 + orb.phase) * .12;
                const grd = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r * pulse);
                grd.addColorStop(0, `hsla(${orb.hue},80%,70%,${orb.opacity * 1.4})`);
                grd.addColorStop(.5, `hsla(${orb.hue},70%,60%,${orb.opacity * .5})`);
                grd.addColorStop(1, `hsla(${orb.hue},60%,50%,0)`);
                ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r * pulse, 0, Math.PI * 2);
                ctx.fillStyle = grd; ctx.fill();
            }
            const mx = mouseRef.current.x, my = mouseRef.current.y;
            const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 160);
            cg.addColorStop(0, "rgba(168,85,247,0.13)"); cg.addColorStop(.5, "rgba(124,58,237,0.05)"); cg.addColorStop(1, "rgba(124,58,237,0)");
            ctx.beginPath(); ctx.arc(mx, my, 160, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
            for (const ln of lines) {
                ln.progress += ln.speed;
                if (ln.progress > 1) { ln.progress = 0; ln.x1 = Math.random() * W; ln.y1 = Math.random() * H; ln.x2 = ln.x1 + (Math.random() - .5) * W * .8; ln.y2 = ln.y1 + (Math.random() - .5) * H * .8; }
                const ease = ln.progress < .5 ? 2 * ln.progress * ln.progress : 1 - Math.pow(-2 * ln.progress + 2, 2) / 2;
                const cx2 = ln.x1 + (ln.x2 - ln.x1) * ease, cy2 = ln.y1 + (ln.y2 - ln.y1) * ease;
                const fade = Math.sin(ln.progress * Math.PI);
                const lg = ctx.createLinearGradient(ln.x1, ln.y1, ln.x2, ln.y2);
                lg.addColorStop(0, `${ln.color}0)`); lg.addColorStop(.4, `${ln.color}${(ln.opacity * fade).toFixed(2)})`); lg.addColorStop(1, `${ln.color}0)`);
                ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(cx2, cy2);
                ctx.strokeStyle = lg; ctx.lineWidth = ln.width; ctx.stroke();
                ctx.beginPath(); ctx.arc(cx2, cy2, ln.width * 2.5, 0, Math.PI * 2);
                ctx.fillStyle = `${ln.color}${(fade * .6).toFixed(2)})`; ctx.fill();
            }
            for (const p of particles) {
                const pulse2 = (Math.sin(t * p.speed * 40 + p.phase) + 1) / 2;
                ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${p.hue},70%,75%,${p.opacity * (.3 + pulse2 * .7)})`; ctx.fill();
            }
            for (let i = ripples.length - 1; i >= 0; i--) {
                const rp = ripples[i]; rp.r += 3; rp.opacity -= .018;
                if (rp.opacity <= 0) { ripples.splice(i, 1); continue; }
                ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2);
                ctx.strokeStyle = `rgba(124,58,237,${rp.opacity})`; ctx.lineWidth = 1.5; ctx.stroke();
            }
        };
        draw();

        const onResize = () => { W = window.innerWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H; };
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
                <div style={{ position: "absolute", top: "-10%", left: "-5%", width: "55%", height: "60%", background: "radial-gradient(ellipse,rgba(167,139,250,0.18) 0%,rgba(139,92,246,0.08) 45%,transparent 70%)", animation: "cssOrb1 14s ease-in-out infinite" }} />
                <div style={{ position: "absolute", top: "15%", right: "-8%", width: "50%", height: "70%", background: "radial-gradient(ellipse,rgba(124,58,237,0.22) 0%,rgba(109,40,217,0.09) 40%,transparent 68%)", animation: "cssOrb2 18s ease-in-out infinite" }} />
                <div style={{ position: "absolute", bottom: "-15%", left: "20%", width: "60%", height: "55%", background: "radial-gradient(ellipse,rgba(88,28,199,0.16) 0%,rgba(76,29,149,0.06) 50%,transparent 72%)", animation: "cssOrb3 22s ease-in-out infinite" }} />
            </div>
            <style>{`
        @keyframes cssOrb1{0%,100%{transform:translate(0,0) scale(1)}35%{transform:translate(30px,20px) scale(1.06)}70%{transform:translate(-15px,35px) scale(0.95)}}
        @keyframes cssOrb2{0%,100%{transform:translate(0,0) scale(1)}40%{transform:translate(-25px,30px) scale(1.08)}75%{transform:translate(20px,-15px) scale(0.93)}}
        @keyframes cssOrb3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(35px,-25px) scale(1.1)}}
      `}</style>
        </div>
    );
}

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
                    if (d < 165) { const alpha = (1 - d / 165) * .18; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(167,139,250,${alpha})`; ctx.lineWidth = .65; ctx.stroke(); }
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

function NerveCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext("2d");
        let W = (c.width = c.offsetWidth), H = (c.height = c.offsetHeight);
        const paths = Array.from({ length: 10 }, () => ({
            pts: Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .16 })),
            hue: 255 + Math.random() * 50, opa: .04 + Math.random() * .06, w: .7 + Math.random() * 1.2, ph: Math.random() * Math.PI * 2,
        }));
        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .006;
            ctx.clearRect(0, 0, W, H);
            for (let gx = 0; gx < W; gx += 54) for (let gy = 0; gy < H; gy += 54) {
                ctx.beginPath(); ctx.arc(gx, gy, .9, 0, Math.PI * 2); ctx.fillStyle = "rgba(124,58,237,.04)"; ctx.fill();
            }
            for (const p of paths) {
                for (const pt of p.pts) {
                    pt.x += pt.vx + Math.sin(t * .3 + p.ph) * .05; pt.y += pt.vy + Math.cos(t * .25 + p.ph) * .04;
                    if (pt.x < -60) pt.x = W + 60; if (pt.x > W + 60) pt.x = -60; if (pt.y < -60) pt.y = H + 60; if (pt.y > H + 60) pt.y = -60;
                }
                const pulse = (Math.sin(t * .9 + p.ph) + 1) * .5;
                const f = p.pts[0], l = p.pts[p.pts.length - 1];
                const g = ctx.createLinearGradient(f.x, f.y, l.x, l.y);
                const a = p.opa * (.4 + pulse * .6);
                g.addColorStop(0, `hsla(${p.hue},80%,62%,0)`); g.addColorStop(.4, `hsla(${p.hue},80%,65%,${a})`); g.addColorStop(1, `hsla(${p.hue},72%,62%,0)`);
                ctx.beginPath(); ctx.moveTo(f.x, f.y);
                for (let i = 1; i < p.pts.length - 1; i++) { const mx = (p.pts[i].x + p.pts[i + 1].x) / 2, my = (p.pts[i].y + p.pts[i + 1].y) / 2; ctx.quadraticCurveTo(p.pts[i].x, p.pts[i].y, mx, my); }
                ctx.lineTo(l.x, l.y); ctx.strokeStyle = g; ctx.lineWidth = p.w; ctx.stroke();
            }
        };
        draw();
        const onR = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
        window.addEventListener("resize", onR);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
    }, []);
    return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

function WaveDown({ fromColor = "#ffffff", toColor = "#0f0b24" }) {
    return (
        <div style={{ background: fromColor, lineHeight: 0 }}>
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}>
                <path d="M0,0 C480,70 960,70 1440,0 L1440,70 L0,70 Z" fill={toColor} />
            </svg>
        </div>
    );
}
function WaveUp({ fromColor = "#0f0b24", toColor = "#ffffff" }) {
    return (
        <div style={{ background: fromColor, lineHeight: 0 }}>
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}>
                <path d="M0,70 C480,0 960,0 1440,70 L1440,0 L0,0 Z" fill={toColor} />
            </svg>
        </div>
    );
}

function Chip({ label, dark }) {
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 100, padding: "6px 18px", marginBottom: 20,
            background: dark ? "rgba(192,132,252,.12)" : "rgba(124,58,237,.07)",
            border: dark ? "1px solid rgba(192,132,252,.25)" : "1px solid rgba(124,58,237,.18)"
        }}>
            <motion.div animate={{ scale: [1, 1.55, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: dark ? "#c084fc" : "#7c3aed" }} />
            <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: BODY, color: dark ? "#c084fc" : "#7c3aed" }}>{label}</span>
        </div>
    );
}

function GradText({ children }) {
    return (
        <span style={{
            background: "linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#c084fc 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
        }}>
            {children}
        </span>
    );
}

function Tooltip({ text }) {
    const [show, setShow] = useState(false);
    return (
        <span style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: 5, cursor: "default" }}
            onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
            <span style={{
                width: 14, height: 14, borderRadius: "50%", background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)",
                display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 8, color: "#a78bfa", fontWeight: 800
            }}>?</span>
            <AnimatePresence>
                {show && (
                    <motion.div initial={{ opacity: 0, y: 4, scale: .95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 4, scale: .95 }}
                        style={{
                            position: "absolute", bottom: "calc(100% + 8px)", left: "50%", transform: "translateX(-50%)",
                            background: "#1a1040", border: "1px solid rgba(124,58,237,.35)", borderRadius: 10,
                            padding: "8px 12px", width: 180, fontSize: 10, color: "#94a3b8", fontFamily: BODY, lineHeight: 1.6,
                            zIndex: 100, boxShadow: "0 12px 40px rgba(0,0,0,.5)", whiteSpace: "normal"
                        }}>
                        {text}
                    </motion.div>
                )}
            </AnimatePresence>
        </span>
    );
}

function FeatureItem({ text, included, highlight, tooltip }) {
    return (
        <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "9px 0",
            borderBottom: "1px solid rgba(255,255,255,.04)"
        }}>
            <div style={{
                width: 18, height: 18, borderRadius: 5, flexShrink: 0,
                background: included ? "linear-gradient(135deg,#22c55e,#16a34a)" : "rgba(255,255,255,.06)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: included ? "0 0 10px rgba(34,197,94,.3)" : "none"
            }}>
                {included
                    ? <span style={{ fontSize: 9, color: "white" }}>✓</span>
                    : <span style={{ fontSize: 9, color: "rgba(255,255,255,.25)" }}>—</span>}
            </div>
            <span style={{
                fontFamily: BODY, fontSize: 12, flex: 1,
                color: highlight ? "#e2e8f0" : included ? "#94a3b8" : "rgba(255,255,255,.22)",
                fontWeight: highlight ? 600 : 400
            }}>{text}</span>
            {tooltip && <Tooltip text={tooltip} />}
        </div>
    );
}

const plans = [
    {
        id: "free",
        name: "Free",
        tagline: "Get a taste of intelligent email",
        monthlyPrice: 0,
        yearlyPrice: 0,
        color: "#6366f1",
        glow: "rgba(99,102,241,0.3)",
        badge: null,
        cta: "Start for free",
        features: [
            { text: "Up to 100 emails / month", included: true },
            { text: "Basic priority scoring", included: true },
            { text: "3 AI smart replies / day", included: true },
            { text: "Email overload stats", included: true },
            { text: "Burnout Intelligence", included: false },
            { text: "Unlimited AI replies", included: false },
            { text: "Gemini AI Co-Pilot", included: false },
            { text: "Task extraction engine", included: false },
            { text: "Deadline detection", included: false },
            { text: "Spam neural shield", included: false },
            { text: "Priority export reports", included: false },
            { text: "Team collaboration", included: false },
        ],
    },
    {
        id: "pro",
        name: "Pro",
        tagline: "Your AI-powered inbox command centre",
        monthlyPrice: 99,
        yearlyPrice: 79,
        color: "#7c3aed",
        glow: "rgba(124,58,237,0.45)",
        badge: "Most Popular",
        cta: "Start 14-day free trial",
        features: [
            { text: "Unlimited emails", included: true, highlight: true },
            { text: "Advanced priority scoring", included: true, highlight: true },
            { text: "Unlimited AI smart replies", included: true, highlight: true },
            { text: "Email overload stats", included: true },
            { text: "Burnout Intelligence", included: true, highlight: true, tooltip: "Real-time stress analytics and late-night urgency detection" },
            { text: "Gemini AI Co-Pilot", included: true, highlight: true, tooltip: "Context-aware AI assistant inside every email" },
            { text: "Task extraction engine", included: true, highlight: true },
            { text: "Deadline detection", included: true },
            { text: "Spam neural shield", included: true, tooltip: "AI-powered neural spam detection with 99.4% accuracy" },
            { text: "Priority export reports", included: true },
            { text: "Team collaboration", included: false },
            { text: "Custom AI training", included: false },
        ],
    },
    {
        id: "team",
        name: "Team",
        tagline: "Eliminate email chaos across your entire org",
        monthlyPrice: 249,
        yearlyPrice: 199,
        color: "#06b6d4",
        glow: "rgba(6,182,212,0.3)",
        badge: "Best for Teams",
        cta: "Start team trial",
        features: [
            { text: "Everything in Pro", included: true, highlight: true },
            { text: "Up to 25 seats", included: true, highlight: true },
            { text: "Shared inbox intelligence", included: true, highlight: true },
            { text: "Team burnout dashboard", included: true, highlight: true, tooltip: "Monitor stress signals across the whole team in one view" },
            { text: "Burnout Intelligence", included: true },
            { text: "Gemini AI Co-Pilot", included: true },
            { text: "Task extraction engine", included: true },
            { text: "Deadline detection", included: true },
            { text: "Spam neural shield", included: true },
            { text: "Priority export reports", included: true },
            { text: "Team collaboration", included: true, highlight: true },
            { text: "Custom AI training", included: true, highlight: true, tooltip: "Train Scasi on your team's unique tone and vocabulary" },
        ],
    },
];

function PlanCard({ plan, yearly, idx }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-60px" });
    const isPro = plan.id === "pro";
    const isFree = plan.id === "free";
    const price = yearly ? plan.yearlyPrice : plan.monthlyPrice;

    return (
        <motion.div ref={ref}
            initial={{ opacity: 0, y: 60, scale: .95 }}
            animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 60, scale: inView ? 1 : .95 }}
            transition={{ duration: .85, delay: idx * .13, ease: [.23, 1, .32, 1] }}
            whileHover={{ y: -8, boxShadow: `0 40px 100px ${plan.glow}` }}
            style={{
                position: "relative",
                background: isPro
                    ? "linear-gradient(160deg,#130d35 0%,#0f0928 50%,#0b0720 100%)"
                    : "linear-gradient(145deg,#0e0b28,#0b0920)",
                border: isPro
                    ? `1.5px solid rgba(124,58,237,.55)`
                    : `1px solid rgba(255,255,255,.08)`,
                borderRadius: 28,
                padding: "36px 30px 32px",
                display: "flex",
                flexDirection: "column",
                boxShadow: isPro
                    ? `0 0 0 1px rgba(124,58,237,.15), 0 30px 80px rgba(124,58,237,.25), inset 0 1px 0 rgba(255,255,255,.08)`
                    : `0 20px 60px rgba(0,0,0,.5), inset 0 1px 0 rgba(255,255,255,.04)`,
                transition: "box-shadow .3s ease, transform .3s ease",
                overflow: "hidden",
                flex: 1,
            }}>

            {/* Top accent line */}
            <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: `linear-gradient(90deg,transparent,${plan.color},transparent)`, opacity: .9
            }} />

            {/* Glow orb */}
            <div style={{
                position: "absolute", top: -50, right: -50, width: 200, height: 200, borderRadius: "50%",
                background: `radial-gradient(ellipse,${plan.glow} 0%,transparent 65%)`, pointerEvents: "none"
            }} />

            {/* Badge */}
            {plan.badge && (
                <div style={{
                    position: "absolute", top: 20, right: 20,
                    background: `linear-gradient(135deg,${plan.color},${plan.color}aa)`,
                    borderRadius: 100, padding: "4px 12px", fontSize: 9, color: "white",
                    fontWeight: 800, fontFamily: BODY, letterSpacing: 1.2,
                    textTransform: "uppercase",
                    boxShadow: `0 4px 16px ${plan.glow}`
                }}>
                    {plan.badge}
                </div>
            )}

            {/* Plan name */}
            <div style={{
                fontFamily: BODY, fontSize: 11, fontWeight: 800, letterSpacing: 2.5,
                textTransform: "uppercase", color: plan.color, marginBottom: 8
            }}>{plan.name}</div>

            {/* Price */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                <span style={{
                    fontFamily: DISPLAY, fontWeight: 900, fontSize: 52, lineHeight: 1,
                    color: "white", letterSpacing: "-2px"
                }}>
                    {price === 0 ? "Free" : `₹${price}`}
                </span>
                {price > 0 && (
                    <span style={{ fontFamily: BODY, fontSize: 13, color: "#475569" }}>
                        / mo{yearly ? " · billed yearly" : ""}
                    </span>
                )}
            </div>
            {yearly && plan.monthlyPrice > 0 && (
                <div style={{ fontSize: 10, color: "#22c55e", fontFamily: BODY, fontWeight: 700, marginBottom: 6 }}>
                    Save ₹{(plan.monthlyPrice - plan.yearlyPrice) * 12}/yr
                </div>
            )}

            {/* Tagline */}
            <p style={{ fontFamily: BODY, fontSize: 12, color: "#475569", lineHeight: 1.65, marginBottom: 26, minHeight: 36 }}>
                {plan.tagline}
            </p>

            {/* ── CTA: Free plan = active button, Pro/Team = Coming Soon ── */}
            {isFree ? (
                <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: .97 }}
                    onClick={() => signIn("google", { callbackUrl: "/" })}
                    style={{
                        width: "100%", padding: "13px 0", borderRadius: 100,
                        background: "rgba(255,255,255,.06)",
                        border: "1px solid rgba(255,255,255,.12)",
                        color: "#94a3b8",
                        fontFamily: BODY, fontWeight: 800, fontSize: 13,
                        cursor: "pointer", marginBottom: 28,
                        letterSpacing: .4,
                    }}>
                    {plan.cta}
                </motion.button>
            ) : (
                <div style={{
                    width: "100%", padding: "13px 0", borderRadius: 100, marginBottom: 28,
                    background: "rgba(255,255,255,.025)",
                    border: "1px solid rgba(255,255,255,.06)",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
                    userSelect: "none",
                }}>
                    <motion.div
                        animate={{ opacity: [1, 0.35, 1] }}
                        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                        style={{
                            width: 6, height: 6, borderRadius: "50%",
                            background: plan.color, flexShrink: 0,
                            boxShadow: `0 0 8px ${plan.color}`,
                        }}
                    />
                    <span style={{
                        fontFamily: BODY, fontWeight: 800, fontSize: 11,
                        letterSpacing: 2, textTransform: "uppercase",
                        color: "rgba(255,255,255,.2)",
                    }}>
                        Coming Soon
                    </span>
                </div>
            )}

            {/* Divider */}
            <div style={{ height: 1, background: "linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent)", marginBottom: 20 }} />

            {/* Feature list */}
            <div style={{ flex: 1 }}>
                {plan.features.map((f, i) => (
                    <FeatureItem key={i} text={f.text} included={f.included}
                        highlight={f.highlight} tooltip={f.tooltip} />
                ))}
            </div>
        </motion.div>
    );
}

const tableRows = [
    { cat: "Core", feat: "Emails / month", free: "100", pro: "Unlimited", team: "Unlimited" },
    { cat: "Core", feat: "Priority scoring", free: "Basic", pro: "Advanced", team: "Advanced" },
    { cat: "AI", feat: "Smart AI replies", free: "3/day", pro: "Unlimited", team: "Unlimited" },
    { cat: "AI", feat: "Gemini AI Co-Pilot", free: "—", pro: "✓", team: "✓" },
    { cat: "AI", feat: "Task extraction", free: "—", pro: "✓", team: "✓" },
    { cat: "AI", feat: "Custom AI training", free: "—", pro: "—", team: "✓" },
    { cat: "Safety", feat: "Spam neural shield", free: "—", pro: "✓", team: "✓" },
    { cat: "Insights", feat: "Burnout Intelligence", free: "—", pro: "✓", team: "✓" },
    { cat: "Insights", feat: "Deadline detection", free: "—", pro: "✓", team: "✓" },
    { cat: "Insights", feat: "Team burnout dashboard", free: "—", pro: "—", team: "✓" },
    { cat: "Team", feat: "Seats", free: "1", pro: "1", team: "Up to 25" },
    { cat: "Team", feat: "Shared inbox intel", free: "—", pro: "—", team: "✓" },
    { cat: "Team", feat: "Priority export reports", free: "—", pro: "✓", team: "✓" },
];

function CompareTable() {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: "-50px" });
    return (
        <div ref={ref} style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
                <thead>
                    <tr>
                        <th style={{
                            width: "40%", textAlign: "left", padding: "14px 20px",
                            fontFamily: BODY, fontSize: 10, color: "#334155", fontWeight: 800, letterSpacing: 2,
                            textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,.08)"
                        }}>Feature</th>
                        {["Free", "Pro", "Team"].map((h, i) => (
                            <th key={h} style={{
                                width: "20%", textAlign: "center", padding: "14px 8px",
                                fontFamily: BODY, fontSize: 12, fontWeight: 800,
                                color: i === 1 ? "#a78bfa" : i === 2 ? "#67e8f9" : "#475569",
                                borderBottom: "1px solid rgba(255,255,255,.08)"
                            }}>{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {tableRows.map((row, i) => {
                        const showCat = i === 0 || row.cat !== tableRows[i - 1].cat;
                        return (
                            <React.Fragment key={`fragment-${i}`}>
                                {showCat && (
                                    <tr key={`cat-${i}`}>
                                        <td colSpan={4} style={{
                                            padding: "16px 20px 6px",
                                            fontFamily: BODY, fontSize: 9, fontWeight: 800, letterSpacing: 2.5,
                                            textTransform: "uppercase", color: "#334155"
                                        }}>{row.cat}</td>
                                    </tr>
                                )}
                                <motion.tr key={`row-${i}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: inView ? 1 : 0, x: inView ? 0 : -20 }}
                                    transition={{ delay: i * .04 + .1 }}
                                    style={{ borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                                    <td style={{ padding: "11px 20px", fontFamily: BODY, fontSize: 12, color: "#64748b" }}>{row.feat}</td>
                                    {[row.free, row.pro, row.team].map((v, j) => (
                                        <td key={`cell-${i}-${j}`} style={{ textAlign: "center", padding: "11px 8px" }}>
                                            <span style={{
                                                fontFamily: BODY, fontSize: 12,
                                                color: v === "✓" ? "#22c55e" : v === "—" ? "rgba(255,255,255,.15)" : j === 1 ? "#c4b5fd" : j === 2 ? "#67e8f9" : "#64748b",
                                                fontWeight: v === "✓" || j === 1 ? 700 : 400,
                                            }}>{v}</span>
                                        </td>
                                    ))}
                                </motion.tr>
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

function FAQItem({ q, a, delay }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    return (
        <motion.div ref={ref}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 20 }} transition={{ delay, duration: .6 }}
            style={{ borderBottom: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
            <button onClick={() => setOpen(o => !o)}
                style={{
                    width: "100%", textAlign: "left", padding: "20px 0",
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16,
                    background: "none", border: "none", cursor: "pointer"
                }}>
                <span style={{ fontFamily: DISPLAY, fontSize: 16, fontWeight: 700, color: "#e2e8f0", lineHeight: 1.4 }}>{q}</span>
                <motion.div animate={{ rotate: open ? 45 : 0 }} transition={{ duration: .25 }}
                    style={{
                        width: 28, height: 28, borderRadius: 8, flexShrink: 0,
                        background: "rgba(124,58,237,.15)", border: "1px solid rgba(124,58,237,.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 16, color: "#a78bfa", fontWeight: 300
                    }}>+</motion.div>
            </button>
            <AnimatePresence>
                {open && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: .35, ease: [.23, 1, .32, 1] }}>
                        <p style={{ fontFamily: BODY, fontSize: 13, color: "#64748b", lineHeight: 1.8, paddingBottom: 20, paddingRight: 44 }}>{a}</p>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

const faqs = [
    { q: "Can I change my plan later?", a: "Absolutely. You can upgrade, downgrade, or cancel at any time from your account settings. Upgrades are effective immediately; downgrades take effect at the end of your billing cycle." },
    { q: "How does the 14-day Pro trial work?", a: "You get full Pro access — every feature, no limits — for 14 days with no credit card required. At the end, you can choose to subscribe or drop to the Free plan automatically." },
    { q: "Is my email data safe with Scasi?", a: "Your privacy is paramount. Scasi processes email metadata to generate insights but never stores raw email content on our servers. All AI inference happens in-session and nothing is used to train our models." },
    { q: "What email providers work with Scasi?", a: "Scasi currently connects to Gmail via Google OAuth. Outlook, Fastmail, and Apple Mail integrations are on the roadmap for Q2 2026." },
    { q: "Does the Team plan require everyone to sign up?", a: "Each seat needs a Scasi account but only the billing admin needs a paid seat to start. Teammates receive invite emails and get full access once they connect their Google account." },
    { q: "What happens to my data if I cancel?", a: "You keep read-only access to your insights and exports for 30 days after cancellation. After that, all data is permanently deleted per our data retention policy." },
];

const trustItems = [
    { icon: "🚀", name: "TechCrunch" },
    { icon: "⚡", name: "Product Hunt" },
    { icon: "🏆", name: "G2 Top Rated" },
    { icon: "💎", name: "Forbes Tech" },
    { icon: "🔒", name: "SOC 2 Type II" },
    { icon: "🌍", name: "GDPR Compliant" },
];

const testimonials = [
    {
        name: "Priya Sharma", role: "Product Lead, Notion", avatar: "PS", color: "#c084fc",
        quote: "Scasi went from 'nice experiment' to 'can't work without it' in under a week. The burnout score alone saved me from a very bad month."
    },
    {
        name: "Alex Rivera", role: "Engineering Manager, Stripe", avatar: "AR", color: "#818cf8",
        quote: "My team was drowning in email threads. The shared inbox intelligence is the first tool that actually surfaces what matters to each person."
    },
    {
        name: "Omar Khalid", role: "Founder, Zayit", avatar: "OK", color: "#06b6d4",
        quote: "I was skeptical about another AI tool but the deadline detection is genuinely magic. Three missed payment deadlines caught in the first day."
    },
];

function TestimonialCard({ t, i }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true });
    return (
        <motion.div ref={ref}
            initial={{ opacity: 0, y: 40 }} animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 40 }}
            transition={{ delay: i * .12, duration: .8, ease: [.23, 1, .32, 1] }}
            whileHover={{ y: -6 }}
            style={{ background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 24, padding: "28px", boxShadow: "0 16px 50px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.05)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg,transparent,${t.color},transparent)`, opacity: .7 }} />
            <div style={{ fontSize: 28, marginBottom: 16, opacity: .4 }}>&quot;</div>
            <p style={{ fontFamily: DISPLAY, fontSize: 13, color: "#94a3b8", lineHeight: 1.75, marginBottom: 20, fontStyle: "italic" }}>{t.quote}</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: 11, background: `linear-gradient(135deg,${t.color},${t.color}80)`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: BODY, fontSize: 12, fontWeight: 800, color: "white", flexShrink: 0 }}>{t.avatar}</div>
                <div>
                    <div style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#e2e8f0" }}>{t.name}</div>
                    <div style={{ fontFamily: BODY, fontSize: 10, color: "#475569" }}>{t.role}</div>
                </div>
            </div>
        </motion.div>
    );
}

export default function ScasiPricing() {
    const [yearly, setYearly] = useState(true);

    return (
        <div style={{ background: "#ffffff", fontFamily: BODY, color: "#1e1b4b", overflowX: "hidden" }}>
            <Header />
            <ElegantCursor />

            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:linear-gradient(#7c3aed,#a855f7);border-radius:10px}
        ::selection{background:rgba(124,58,237,0.18);color:#4c1d95}
      `}</style>

            {/* HERO */}
            <section style={{
                position: "relative", minHeight: "72vh", background: "#ffffff", overflow: "hidden",
                display: "flex", alignItems: "center", justifyContent: "center"
            }}>
                <NebulaBG style={{ zIndex: 0 }} />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", top: "8%", right: "8%", width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(124,58,237,.1)", zIndex: 2, pointerEvents: "none" }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", top: "5%", right: "5%", width: 290, height: 290, borderRadius: "50%", border: "1px dashed rgba(168,85,247,.08)", zIndex: 2, pointerEvents: "none" }} />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", bottom: "10%", left: "6%", width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(124,58,237,.08)", zIndex: 2, pointerEvents: "none" }} />

                <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 780, padding: "120px 48px 80px" }}>
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}>
                        <Chip label="Simple, transparent pricing" />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: .9, delay: .1, ease: [.23, 1, .32, 1] }}
                        style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(48px,6vw,86px)", lineHeight: 1.04, letterSpacing: "-3px", marginBottom: 20 }}>
                        Invest in your <GradText>inbox peace.</GradText>
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: .7, delay: .2 }}
                        style={{ fontFamily: BODY, fontSize: 17, color: "#64748b", lineHeight: 1.82, marginBottom: 44, maxWidth: 540, margin: "0 auto 44px" }}>
                        Start free. Scale up when you&apos;re ready. No hidden fees, no surprise charges — just a calmer, smarter inbox every single day.
                    </motion.p>

                    <motion.div
                        initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: .3 }}
                        style={{ display: "inline-flex", alignItems: "center", gap: 14, background: "rgba(124,58,237,.06)", border: "1px solid rgba(124,58,237,.15)", borderRadius: 100, padding: "6px 8px 6px 20px" }}>
                        <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: !yearly ? "#7c3aed" : "#94a3b8" }}>Monthly</span>
                        <button onClick={() => setYearly(y => !y)}
                            style={{ position: "relative", width: 46, height: 26, borderRadius: 13, background: yearly ? "#7c3aed" : "rgba(255,255,255,.1)", border: "none", cursor: "pointer", transition: "background .3s" }}>
                            <motion.div animate={{ x: yearly ? 22 : 2 }} transition={{ type: "spring", stiffness: 400, damping: 28 }}
                                style={{ position: "absolute", top: 3, width: 20, height: 20, borderRadius: "50%", background: "white", boxShadow: "0 2px 8px rgba(0,0,0,.2)" }} />
                        </button>
                        <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 600, color: yearly ? "#7c3aed" : "#94a3b8" }}>Yearly</span>
                        <AnimatePresence>
                            {yearly && (
                                <motion.span initial={{ opacity: 0, scale: .7 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: .7 }}
                                    style={{ fontSize: 9, fontWeight: 800, color: "white", background: "#22c55e", borderRadius: 100, padding: "3px 10px", letterSpacing: .5, fontFamily: BODY }}>
                                    Save up to 25%
                                </motion.span>
                            )}
                        </AnimatePresence>
                    </motion.div>
                </div>
            </section>

            {/* PRICING CARDS */}
            <WaveDown fromColor="#ffffff" toColor="#0d0922" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0d0922", paddingBottom: 20 }}>
                <NodeCanvas />
                <div style={{ position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)", width: "80%", height: "60%", background: "radial-gradient(ellipse,rgba(124,58,237,.12) 0%,transparent 65%)", pointerEvents: "none", zIndex: 1 }} />
                <div style={{ position: "relative", zIndex: 10, maxWidth: 1080, margin: "0 auto", padding: "80px 40px 100px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 24, alignItems: "start" }}>
                    {plans.map((plan, i) => (
                        <PlanCard key={plan.id} plan={plan} yearly={yearly} idx={i} />
                    ))}
                </div>
            </section>

            {/* TRUST STRIP */}
            <div style={{ background: "#0d0922", padding: "0 40px 70px" }}>
                <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
                    <p style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, letterSpacing: 2.5, textTransform: "uppercase", color: "#334155", marginBottom: 28 }}>Trusted by 12,000+ professionals worldwide</p>
                    <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 32 }}>
                        {trustItems.map((t, i) => (
                            <motion.div key={i}
                                initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                                transition={{ delay: i * .07 }}
                                style={{ display: "flex", alignItems: "center", gap: 7, color: "#334155", fontFamily: BODY, fontSize: 13, fontWeight: 600 }}>
                                <span style={{ fontSize: 16 }}>{t.icon}</span>{t.name}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            <WaveUp fromColor="#0d0922" toColor="#ffffff" />

            {/* COMPARISON TABLE */}
            <section style={{ position: "relative", overflow: "hidden", background: "#ffffff", padding: "96px 40px 80px" }}>
                <NerveCanvas />
                <div style={{ position: "relative", zIndex: 10, maxWidth: 860, margin: "0 auto" }}>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 52 }}>
                        <Chip label="Plan comparison" />
                        <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(32px,4vw,54px)", letterSpacing: "-2px", lineHeight: 1.1, color: "#1e1b4b", marginBottom: 12 }}>
                            Every feature, side by side.
                        </h2>
                        <p style={{ fontFamily: BODY, fontSize: 15, color: "#64748b", maxWidth: 480, margin: "0 auto" }}>
                            No asterisks. No footnotes. Just a clear picture of exactly what you get.
                        </p>
                    </motion.div>
                    <div style={{ background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
                        <CompareTable />
                    </div>
                </div>
            </section>

            {/* TESTIMONIALS */}
            <WaveDown fromColor="#ffffff" toColor="#0d0922" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0d0922", padding: "80px 40px 90px" }}>
                <NodeCanvas />
                <div style={{ position: "relative", zIndex: 10, maxWidth: 1060, margin: "0 auto" }}>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 52 }}>
                        <Chip label="Real users, real results" dark />
                        <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(30px,3.5vw,50px)", letterSpacing: "-2px", lineHeight: 1.1, background: "linear-gradient(135deg,#e9d5ff,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                            What our users say.
                        </h2>
                    </motion.div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22 }}>
                        {testimonials.map((t, i) => <TestimonialCard key={i} t={t} i={i} />)}
                    </div>
                </div>
            </section>
            <WaveUp fromColor="#0d0922" toColor="#ffffff" />

            {/* FAQ */}
            <section style={{ position: "relative", overflow: "hidden", background: "#ffffff", padding: "90px 40px 80px" }}>
                <NerveCanvas />
                <div style={{ position: "relative", zIndex: 10, maxWidth: 700, margin: "0 auto" }}>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 56 }}>
                        <Chip label="Got questions?" />
                        <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(30px,3.5vw,50px)", letterSpacing: "-2px", lineHeight: 1.1, color: "#1e1b4b" }}>
                            Frequently asked.
                        </h2>
                    </motion.div>
                    {faqs.map((f, i) => <FAQItem key={i} q={f.q} a={f.a} delay={i * .06} />)}
                </div>
            </section>

            {/* FINAL CTA */}
            <WaveDown fromColor="#ffffff" toColor="#0d0922" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0d0922" }}>
                <NodeCanvas />
                <div style={{ position: "absolute", top: "0%", left: "50%", transform: "translateX(-50%)", width: "60%", height: "100%", background: "radial-gradient(ellipse,rgba(124,58,237,.16) 0%,transparent 65%)", pointerEvents: "none", zIndex: 1 }} />
                <div style={{ position: "relative", zIndex: 10, maxWidth: 700, margin: "0 auto", padding: "100px 48px 128px", textAlign: "center" }}>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .8 }}>
                        <Chip label="Start Today" dark />
                        <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(36px,4.5vw,68px)", letterSpacing: "-2.5px", lineHeight: 1.05, background: "linear-gradient(160deg,#e9d5ff 0%,#c084fc 35%,#a855f7 65%,#7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 20 }}>
                            Your inbox won&apos;t fix itself.
                        </h2>
                        <p style={{ fontFamily: BODY, fontSize: 15, color: "rgba(200,188,255,.6)", lineHeight: 1.85, marginBottom: 44, maxWidth: 460, margin: "0 auto 44px" }}>
                            Join 12,000+ professionals who&apos;ve reclaimed their time, focus, and peace of mind with Scasi&apos;s AI.
                        </p>
                        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                            <motion.button whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(124,58,237,.55)" }} whileTap={{ scale: .97 }}
                                onClick={() => signIn("google", { callbackUrl: "/" })}
                                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", borderRadius: 100, padding: "15px 40px", color: "white", fontWeight: 800, fontSize: 15, fontFamily: BODY, boxShadow: "0 8px 32px rgba(124,58,237,.4)", cursor: "pointer" }}>
                                Start free — no card needed →
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .97 }}
                                onClick={() => window.location.href = '/features'}
                                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 100, padding: "15px 32px", color: "#94a3b8", fontWeight: 700, fontSize: 15, fontFamily: BODY, cursor: "pointer" }}>
                                View Pro features
                            </motion.button>
                        </div>
                        <p style={{ fontFamily: BODY, fontSize: 11, color: "#334155", marginTop: 22 }}>
                            ✓ 14-day free trial &nbsp;·&nbsp; ✓ Cancel anytime &nbsp;·&nbsp; ✓ No credit card required
                        </p>
                    </motion.div>
                </div>
            </section>

            <Footer />
        </div>
    );
}