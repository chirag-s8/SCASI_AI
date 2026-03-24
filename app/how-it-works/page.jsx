"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { signIn } from "next-auth/react";
import Header from "@/components/dashboard/Header";
import Footer from "@/components/Footer";

const DISPLAY = "'Playfair Display',serif";
const BODY = "'Outfit',sans-serif";

/* ════════════════════════════════════════════════════
   MONOCHROME SVG ICONS  (white / soft purple only)
════════════════════════════════════════════════════ */
const Icon = {
    Mail: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m2 7 10 7 10-7" /></svg>,
    Bot: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="10" rx="2" /><circle cx="12" cy="5" r="2" /><path d="M12 7v4" /><path d="M8 15h.01M12 15h.01M16 15h.01" /></svg>,
    Zap: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>,
    Lock: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>,
    Inbox: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-6l-2 3H10l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 17.76 4H6.24a2 2 0 0 0-1.79 1.11z" /></svg>,
    BarChart: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10" /><line x1="18" y1="20" x2="18" y2="4" /><line x1="6" y1="20" x2="6" y2="16" /></svg>,
    Star: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>,
    Shield: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>,
    Calendar: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>,
    Edit: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    FileText: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>,
    Lightbulb: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><line x1="9" y1="18" x2="15" y2="18" /><line x1="10" y1="22" x2="14" y2="22" /><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" /></svg>,
    Target: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>,
    Focus: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>,
    TrendUp: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>,
    Code: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
    Globe: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></svg>,
    Check: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>,
    Server: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>,
    Database: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>,
    Layers: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>,
    Ban: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>,
    Sparkle: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.64 5.64l2.83 2.83M15.54 15.54l2.83 2.83M5.64 18.36l2.83-2.83M15.54 8.46l2.83-2.83" /></svg>,
    ArrowRight: (p = {}) => <svg {...p} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></svg>,
};

/* icon box helper */
function IBox({ icon: Ic, size = 36, bg = "rgba(255,255,255,.08)", color = "rgba(255,255,255,.8)", br = 12 }) {
    return (
        <div style={{ width: size, height: size, borderRadius: br, background: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Ic style={{ width: size * .46, height: size * .46, color }} />
        </div>
    );
}

/* ════════════════════════════════════════════════════
   ELEGANT CURSOR
════════════════════════════════════════════════════ */
function ElegantCursor() {
    const ringRef = useRef(null); const dotRef = useRef(null);
    const pos = useRef({ x: -300, y: -300 }); const lag = useRef({ x: -300, y: -300 });
    useEffect(() => {
        const onMove = (e) => { pos.current = { x: e.clientX, y: e.clientY }; if (dotRef.current) dotRef.current.style.transform = `translate(${e.clientX - 3}px,${e.clientY - 3}px)`; };
        let raf;
        const loop = () => { raf = requestAnimationFrame(loop); lag.current.x += (pos.current.x - lag.current.x) * .09; lag.current.y += (pos.current.y - lag.current.y) * .09; if (ringRef.current) ringRef.current.style.transform = `translate(${lag.current.x - 20}px,${lag.current.y - 20}px)`; };
        loop(); document.addEventListener("mousemove", onMove);
        return () => { cancelAnimationFrame(raf); document.removeEventListener("mousemove", onMove); };
    }, []);
    return (<><style>{`*{cursor:none!important}`}</style><div ref={ringRef} style={{ position: "fixed", top: 0, left: 0, width: 40, height: 40, borderRadius: "50%", border: "1.5px solid rgba(124,58,237,0.55)", zIndex: 99999, pointerEvents: "none", willChange: "transform" }} /><div ref={dotRef} style={{ position: "fixed", top: 0, left: 0, width: 6, height: 6, borderRadius: "50%", background: "#7c3aed", zIndex: 100000, pointerEvents: "none", willChange: "transform", boxShadow: "0 0 8px rgba(124,58,237,.7)" }} /></>);
}

/* ════════════════════════════════════════════════════
   NEBULA BG
════════════════════════════════════════════════════ */
function NebulaBG({ style: extStyle }) {
    const canvasRef = useRef(null); const mouseRef = useRef({ x: 0, y: 0 });
    useEffect(() => {
        const canvas = canvasRef.current; if (!canvas) return; const ctx = canvas.getContext("2d"); if (!ctx) return;
        let W = window.innerWidth, H = canvas.offsetHeight || window.innerHeight; canvas.width = W; canvas.height = H;
        const onMouse = (e) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
        window.addEventListener("mousemove", onMouse);
        const SHADES = ["rgba(124,58,237,", "rgba(168,85,247,", "rgba(196,130,255,", "rgba(88,28,199,", "rgba(147,51,234,"];
        const lines = Array.from({ length: 24 }, () => ({ x1: Math.random() * W, y1: Math.random() * H, x2: Math.random() * W, y2: Math.random() * H, progress: Math.random(), speed: 0.001 + Math.random() * 0.0014, color: SHADES[Math.floor(Math.random() * SHADES.length)], width: Math.random() * 1.4 + 0.4, opacity: Math.random() * 0.3 + 0.07 }));
        const orbs = Array.from({ length: 6 }, () => ({ x: Math.random() * W, y: Math.random() * H * .8, r: 100 + Math.random() * 180, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .2, hue: 260 + Math.random() * 55, opacity: 0.07 + Math.random() * 0.09, phase: Math.random() * Math.PI * 2 }));
        const particles = Array.from({ length: 500 }, () => ({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * .8 + .1, opacity: Math.random() * .45 + .1, phase: Math.random() * Math.PI * 2, speed: Math.random() * .02 + .005, hue: 250 + Math.random() * 80 }));
        const ripples = []; const onClick = (e) => { ripples.push({ x: e.clientX, y: e.clientY, r: 0, maxR: 80, opacity: .6 }); }; window.addEventListener("click", onClick);
        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .012; ctx.clearRect(0, 0, W, H);
            for (const orb of orbs) { orb.x += orb.vx + Math.sin(t * .3 + orb.phase) * .4; orb.y += orb.vy + Math.cos(t * .2 + orb.phase) * .3; if (orb.x < -orb.r) orb.x = W + orb.r; if (orb.x > W + orb.r) orb.x = -orb.r; if (orb.y < -orb.r) orb.y = H + orb.r; if (orb.y > H + orb.r) orb.y = -orb.r; const pulse = 1 + Math.sin(t * .5 + orb.phase) * .12; const grd = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.r * pulse); grd.addColorStop(0, `hsla(${orb.hue},80%,70%,${orb.opacity * 1.4})`); grd.addColorStop(.5, `hsla(${orb.hue},70%,60%,${orb.opacity * .5})`); grd.addColorStop(1, `hsla(${orb.hue},60%,50%,0)`); ctx.beginPath(); ctx.arc(orb.x, orb.y, orb.r * pulse, 0, Math.PI * 2); ctx.fillStyle = grd; ctx.fill(); }
            const mx = mouseRef.current.x, my = mouseRef.current.y; const cg = ctx.createRadialGradient(mx, my, 0, mx, my, 160); cg.addColorStop(0, "rgba(168,85,247,0.13)"); cg.addColorStop(.5, "rgba(124,58,237,0.05)"); cg.addColorStop(1, "rgba(124,58,237,0)"); ctx.beginPath(); ctx.arc(mx, my, 160, 0, Math.PI * 2); ctx.fillStyle = cg; ctx.fill();
            for (const ln of lines) { ln.progress += ln.speed; if (ln.progress > 1) { ln.progress = 0; ln.x1 = Math.random() * W; ln.y1 = Math.random() * H; ln.x2 = ln.x1 + (Math.random() - .5) * W * .8; ln.y2 = ln.y1 + (Math.random() - .5) * H * .8; } const ease = ln.progress < .5 ? 2 * ln.progress * ln.progress : 1 - Math.pow(-2 * ln.progress + 2, 2) / 2; const cx2 = ln.x1 + (ln.x2 - ln.x1) * ease, cy2 = ln.y1 + (ln.y2 - ln.y1) * ease; const fade = Math.sin(ln.progress * Math.PI); const lg = ctx.createLinearGradient(ln.x1, ln.y1, ln.x2, ln.y2); lg.addColorStop(0, `${ln.color}0)`); lg.addColorStop(.4, `${ln.color}${(ln.opacity * fade).toFixed(2)})`); lg.addColorStop(1, `${ln.color}0)`); ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(cx2, cy2); ctx.strokeStyle = lg; ctx.lineWidth = ln.width; ctx.stroke(); ctx.beginPath(); ctx.arc(cx2, cy2, ln.width * 2.5, 0, Math.PI * 2); ctx.fillStyle = `${ln.color}${(fade * .6).toFixed(2)})`; ctx.fill(); }
            for (const p of particles) { const pulse2 = (Math.sin(t * p.speed * 40 + p.phase) + 1) / 2; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fillStyle = `hsla(${p.hue},70%,75%,${p.opacity * (.3 + pulse2 * .7)})`; ctx.fill(); }
            for (let i = ripples.length - 1; i >= 0; i--) { const rp = ripples[i]; rp.r += 3; rp.opacity -= .018; if (rp.opacity <= 0) { ripples.splice(i, 1); continue; } ctx.beginPath(); ctx.arc(rp.x, rp.y, rp.r, 0, Math.PI * 2); ctx.strokeStyle = `rgba(124,58,237,${rp.opacity})`; ctx.lineWidth = 1.5; ctx.stroke(); }
        };
        draw();
        const onResize = () => { W = window.innerWidth; H = canvas.offsetHeight; canvas.width = W; canvas.height = H; };
        window.addEventListener("resize", onResize);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("mousemove", onMouse); window.removeEventListener("resize", onResize); window.removeEventListener("click", onClick); };
    }, []);
    return (<div style={{ position: "absolute", inset: 0, ...extStyle, overflow: "hidden" }}><canvas ref={canvasRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} /><div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 1 }}><div style={{ position: "absolute", top: "-10%", left: "-5%", width: "55%", height: "60%", background: "radial-gradient(ellipse,rgba(167,139,250,0.18) 0%,rgba(139,92,246,0.08) 45%,transparent 70%)", animation: "cssOrb1 14s ease-in-out infinite" }} /><div style={{ position: "absolute", top: "15%", right: "-8%", width: "50%", height: "70%", background: "radial-gradient(ellipse,rgba(124,58,237,0.22) 0%,rgba(109,40,217,0.09) 40%,transparent 68%)", animation: "cssOrb2 18s ease-in-out infinite" }} /><div style={{ position: "absolute", bottom: "-15%", left: "20%", width: "60%", height: "55%", background: "radial-gradient(ellipse,rgba(88,28,199,0.16) 0%,rgba(76,29,149,0.06) 50%,transparent 72%)", animation: "cssOrb3 22s ease-in-out infinite" }} /></div><style>{`@keyframes cssOrb1{0%,100%{transform:translate(0,0)scale(1)}35%{transform:translate(30px,20px)scale(1.06)}70%{transform:translate(-15px,35px)scale(0.95)}}@keyframes cssOrb2{0%,100%{transform:translate(0,0)scale(1)}40%{transform:translate(-25px,30px)scale(1.08)}75%{transform:translate(20px,-15px)scale(0.93)}}@keyframes cssOrb3{0%,100%{transform:translate(0,0)scale(1)}50%{transform:translate(35px,-25px)scale(1.1)}}`}</style></div>);
}

function NodeCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return;
        let W = (c.width = c.offsetWidth), H = (c.height = c.offsetHeight);
        const nodes = Array.from({ length: 55 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .38, vy: (Math.random() - .5) * .28, ph: Math.random() * Math.PI * 2 }));
        let t = 0, raf;
        const draw = () => { raf = requestAnimationFrame(draw); t += .007; ctx.clearRect(0, 0, W, H); for (let i = 0; i < nodes.length; i++) { const a = nodes[i]; a.x += a.vx + Math.sin(t * .5 + a.ph) * .055; a.y += a.vy + Math.cos(t * .4 + a.ph) * .045; if (a.x < 0) a.x = W; if (a.x > W) a.x = 0; if (a.y < 0) a.y = H; if (a.y > H) a.y = 0; for (let j = i + 1; j < nodes.length; j++) { const b = nodes[j]; const dx = b.x - a.x, dy = b.y - a.y, d = Math.sqrt(dx * dx + dy * dy); if (d < 165) { ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.strokeStyle = `rgba(167,139,250,${(1 - d / 165) * .18})`; ctx.lineWidth = .65; ctx.stroke(); } } const pulse = (Math.sin(t * 1.3 + a.ph) + 1) * .5; ctx.beginPath(); ctx.arc(a.x, a.y, 1.4 + pulse * .8, 0, Math.PI * 2); ctx.fillStyle = `rgba(192,132,252,${.15 + pulse * .22})`; ctx.fill(); } };
        draw(); const onR = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; }; window.addEventListener("resize", onR); return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
    }, []);
    return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

function NerveCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return; const ctx = c.getContext("2d"); if (!ctx) return;
        let W = (c.width = c.offsetWidth), H = (c.height = c.offsetHeight);
        const paths = Array.from({ length: 10 }, () => ({ pts: Array.from({ length: 4 }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .16 })), hue: 255 + Math.random() * 50, opa: .04 + Math.random() * .06, w: .7 + Math.random() * 1.2, ph: Math.random() * Math.PI * 2 }));
        let t = 0, raf;
        const draw = () => { raf = requestAnimationFrame(draw); t += .006; ctx.clearRect(0, 0, W, H); for (let gx = 0; gx < W; gx += 54)for (let gy = 0; gy < H; gy += 54) { ctx.beginPath(); ctx.arc(gx, gy, .9, 0, Math.PI * 2); ctx.fillStyle = "rgba(124,58,237,.04)"; ctx.fill(); } for (const p of paths) { for (const pt of p.pts) { pt.x += pt.vx + Math.sin(t * .3 + p.ph) * .05; pt.y += pt.vy + Math.cos(t * .25 + p.ph) * .04; if (pt.x < -60) pt.x = W + 60; if (pt.x > W + 60) pt.x = -60; if (pt.y < -60) pt.y = H + 60; if (pt.y > H + 60) pt.y = -60; } const pulse = (Math.sin(t * .9 + p.ph) + 1) * .5; const f = p.pts[0], l = p.pts[p.pts.length - 1]; const g = ctx.createLinearGradient(f.x, f.y, l.x, l.y); const a = p.opa * (.4 + pulse * .6); g.addColorStop(0, `hsla(${p.hue},80%,62%,0)`); g.addColorStop(.4, `hsla(${p.hue},80%,65%,${a})`); g.addColorStop(1, `hsla(${p.hue},72%,62%,0)`); ctx.beginPath(); ctx.moveTo(f.x, f.y); for (let i = 1; i < p.pts.length - 1; i++) { const mx = (p.pts[i].x + p.pts[i + 1].x) / 2, my = (p.pts[i].y + p.pts[i + 1].y) / 2; ctx.quadraticCurveTo(p.pts[i].x, p.pts[i].y, mx, my); } ctx.lineTo(l.x, l.y); ctx.strokeStyle = g; ctx.lineWidth = p.w; ctx.stroke(); } };
        draw(); const onR = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; }; window.addEventListener("resize", onR); return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
    }, []);
    return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

function WaveDown({ fromColor = "#ffffff", toColor = "#0d0922" }) { return (<div style={{ background: fromColor, lineHeight: 0 }}><svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}><path d="M0,0 C480,70 960,70 1440,0 L1440,70 L0,70 Z" fill={toColor} /></svg></div>); }
function WaveUp({ fromColor = "#0d0922", toColor = "#ffffff" }) { return (<div style={{ background: fromColor, lineHeight: 0 }}><svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}><path d="M0,70 C480,0 960,0 1440,70 L1440,0 L0,0 Z" fill={toColor} /></svg></div>); }

function Chip({ label, dark }) { return (<div style={{ display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 100, padding: "6px 18px", marginBottom: 20, background: dark ? "rgba(192,132,252,.12)" : "rgba(124,58,237,.07)", border: dark ? "1px solid rgba(192,132,252,.25)" : "1px solid rgba(124,58,237,.18)" }}><motion.div animate={{ scale: [1, 1.55, 1] }} transition={{ duration: 2.2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: "50%", background: dark ? "#c084fc" : "#7c3aed" }} /><span style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", fontFamily: BODY, color: dark ? "#c084fc" : "#7c3aed" }}>{label}</span></div>); }
function GradText({ children }) { return (<span style={{ background: "linear-gradient(135deg,#7c3aed 0%,#a855f7 50%,#c084fc 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>{children}</span>); }
function Counter({ value, suffix = "" }) {
    const [count, setCount] = useState(0); const ref = useRef(null); const inView = useInView(ref, { once: true });
    useEffect(() => { if (!inView) return; let s = 0; const e = parseInt(value); const step = e / (2000 / 16); const timer = setInterval(() => { s += step; if (s >= e) { setCount(e); clearInterval(timer); } else setCount(Math.floor(s)); }, 16); return () => clearInterval(timer); }, [inView, value]);
    return <span ref={ref}>{count}{suffix}</span>;
}

/* ════════════════════════════════════════════════════
   HERO
════════════════════════════════════════════════════ */
function Hero() {
    const steps = [{ Ic: Icon.Mail, label: "Connect Gmail" }, { Ic: Icon.Bot, label: "AI Processes" }, { Ic: Icon.Zap, label: "Inbox Clarity" }];
    return (
        <section style={{ position: "relative", minHeight: "88vh", background: "#ffffff", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <NebulaBG style={{ zIndex: 0 }} />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 40, repeat: Infinity, ease: "linear" }} style={{ position: "absolute", top: "8%", right: "8%", width: 200, height: 200, borderRadius: "50%", border: "1px solid rgba(124,58,237,.1)", zIndex: 2, pointerEvents: "none" }} />
            <motion.div animate={{ rotate: -360 }} transition={{ duration: 60, repeat: Infinity, ease: "linear" }} style={{ position: "absolute", top: "5%", right: "5%", width: 290, height: 290, borderRadius: "50%", border: "1px dashed rgba(168,85,247,.08)", zIndex: 2, pointerEvents: "none" }} />
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 50, repeat: Infinity, ease: "linear" }} style={{ position: "absolute", bottom: "10%", left: "6%", width: 180, height: 180, borderRadius: "50%", border: "1px solid rgba(124,58,237,.08)", zIndex: 2, pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 10, textAlign: "center", maxWidth: 860, padding: "130px 48px 100px" }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6 }}><Chip label="How Scasi Works" /></motion.div>
                <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .1, ease: [.23, 1, .32, 1] }}
                    style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(48px,6vw,92px)", lineHeight: 1.03, letterSpacing: "-3px", marginBottom: 22, color: "#0f0b24" }}>
                    Your inbox.<br /><GradText>Transformed by AI.</GradText>
                </motion.h1>
                <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .2 }}
                    style={{ fontFamily: BODY, fontSize: 18, color: "#64748b", lineHeight: 1.85, marginBottom: 56, maxWidth: 580, margin: "0 auto 56px" }}>
                    Scasi layers 8 AI models over your Gmail to score, categorize, summarize, and act on every email — so you focus only on what matters.
                </motion.p>
                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .35, duration: .8 }} style={{ display: "flex", alignItems: "center", justifyContent: "center", flexWrap: "wrap", gap: 8 }}>
                    {steps.map((s, i) => (
                        <div key={i} style={{ display: "contents" }}>
                            <motion.div whileHover={{ scale: 1.07, y: -4 }} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(124,58,237,.07)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 100, padding: "12px 22px" }}>
                                <s.Ic style={{ width: 18, height: 18, color: "#7c3aed" }} />
                                <span style={{ fontFamily: BODY, fontSize: 13, fontWeight: 700, color: "#4c1d95" }}>{s.label}</span>
                            </motion.div>
                            {i < 2 && <motion.div animate={{ x: [0, 6, 0] }} transition={{ duration: 1.8, repeat: Infinity, delay: i * .4 }} style={{ color: "#a78bfa", fontSize: 22, fontWeight: 300, padding: "0 4px" }}>→</motion.div>}
                        </div>
                    ))}
                </motion.div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .6 }} style={{ display: "flex", justifyContent: "center", gap: 40, marginTop: 64, flexWrap: "wrap" }}>
                    {[{ val: "12000", suffix: "+", label: "Professionals" }, { val: "15", suffix: "", label: "AI Endpoints" }, { val: "99", suffix: ".4%", label: "Spam Accuracy" }, { val: "8", suffix: "", label: "AI Features" }].map((s, i) => (
                        <div key={i} style={{ textAlign: "center" }}>
                            <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 38, letterSpacing: "-1.5px", background: "linear-gradient(135deg,#7c3aed,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}><Counter value={s.val} suffix={s.suffix} /></div>
                            <div style={{ fontFamily: BODY, fontSize: 11, color: "#94a3b8", fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════
   PROCESS TIMELINE  (dark)
════════════════════════════════════════════════════ */
const processSteps = [
    { num: "01", Ic: Icon.Lock, title: "Connect with Google OAuth 2.0", desc: "One click connects your Gmail securely. Scasi uses OAuth 2.0 — your password is never seen or stored. We read, send, and modify emails only when you ask.", details: ["Gmail full OAuth 2.0", "Token auto-refresh", "CSRF protected", "No password storage"] },
    { num: "02", Ic: Icon.Inbox, title: "Your Inbox Loads Instantly", desc: "Emails appear in a clean, paginated list. Avatars, snippets, sender names — all rendered from Gmail's API in real-time. Threads are grouped, folders are smart.", details: ["Thread grouping", "Real-time refresh", "Paginated loading", "Inbox · Starred · Snoozed · Archive"] },
    { num: "03", Ic: Icon.Bot, title: "AI Analyses Every Email", desc: "8 AI models (powered by Qwen 2.5 Coder 32B via OpenRouter) process each email on-demand. Nothing runs until you need it — your data is never batch-processed or stored.", details: ["Priority scoring (1–100)", "Smart categorisation", "Spam neural shield", "Deadline extraction"] },
    { num: "04", Ic: Icon.Zap, title: "You Act — or Let AI Handle It", desc: "Scasi\u2019s agentic \u201CHandle For Me\u201D runs a 5-step pipeline \u2014 analyse, create task, check calendar, draft reply \u2014 and presents every action for your approval before sending.", details: ["AI-drafted replies", "Handle For Me agent", "Smart to-do titles", "Never sends without approval"] },
    { num: "05", Ic: Icon.BarChart, title: "Weekly Intelligence Report", desc: "Every Sunday, Scasi generates a burnout risk score, productivity rate, stress analysis, and personalised recommendations — turning email data into wellbeing insights.", details: ["Burnout score (0–100)", "Stress level detection", "Late-night tracking", "Productivity trend analysis"] },
];

function ProcessStepItem({ step, i }) {
    const ref = useRef(null); const inView = useInView(ref, { once: true, margin: "-80px" });
    return (
        <motion.div ref={ref} initial={{ opacity: 0, x: -50 }} animate={{ opacity: inView ? 1 : 0, x: inView ? 0 : -50 }} transition={{ duration: .85, delay: i * .1, ease: [.23, 1, .32, 1] }} style={{ display: "flex", gap: 36, marginBottom: 60, position: "relative" }}>
            <div style={{ flexShrink: 0, position: "relative", zIndex: 2 }}>
                <motion.div animate={{ boxShadow: ["0 0 0 0 rgba(167,139,250,.35)", "0 0 0 18px rgba(167,139,250,0)"] }} transition={{ duration: 2.5, repeat: Infinity, delay: i * .5 }}
                    style={{ width: 88, height: 88, borderRadius: "50%", background: "linear-gradient(135deg,rgba(167,139,250,.15),rgba(167,139,250,.06))", border: "2px solid rgba(167,139,250,.25)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 0 30px rgba(167,139,250,.18)" }}>
                    <step.Ic style={{ width: 26, height: 26, color: "rgba(255,255,255,.8)" }} />
                    <span style={{ fontFamily: BODY, fontSize: 9, fontWeight: 800, color: "#a78bfa", letterSpacing: 1, marginTop: 4 }}>{step.num}</span>
                </motion.div>
            </div>
            <motion.div whileHover={{ y: -4, borderColor: "rgba(167,139,250,.3)" }} style={{ flex: 1, background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "28px 30px", boxShadow: "0 12px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04)", transition: "border-color .3s,transform .3s", overflow: "hidden", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(167,139,250,.55),transparent)" }} />
                <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 22, color: "#e2e8f0", marginBottom: 10, lineHeight: 1.25 }}>{step.title}</h3>
                <p style={{ fontFamily: BODY, fontSize: 13, color: "#64748b", lineHeight: 1.78, marginBottom: 20 }}>{step.desc}</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {step.details.map((d, j) => (
                        <span key={j} style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.2)", color: "#c4b5fd", borderRadius: 100, padding: "4px 12px", letterSpacing: .3 }}>✓ {d}</span>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    );
}

function ProcessTimeline() {
    return (
        <section style={{ position: "relative", overflow: "hidden", background: "#0d0922", padding: "90px 40px 110px" }}>
            <NodeCanvas />
            <div style={{ position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)", width: "80%", height: "60%", background: "radial-gradient(ellipse,rgba(124,58,237,.12) 0%,transparent 65%)", pointerEvents: "none", zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 10, maxWidth: 900, margin: "0 auto" }}>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 70 }}>
                    <Chip label="The 5-step journey" dark />
                    <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(34px,4vw,60px)", letterSpacing: "-2.5px", lineHeight: 1.06, background: "linear-gradient(135deg,#e9d5ff,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
                        From raw inbox to<br />intelligent command centre.
                    </h2>
                </motion.div>
                <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: 44, top: 0, bottom: 0, width: 2, background: "linear-gradient(180deg,transparent,rgba(124,58,237,.4) 10%,rgba(168,85,247,.5) 50%,rgba(124,58,237,.3) 90%,transparent)", zIndex: 1 }} />
                    {processSteps.map((step, i) => (
                        <ProcessStepItem key={i} step={step} i={i} />
                    ))}
                </div>
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════
   AI FEATURES GRID  (light)
════════════════════════════════════════════════════ */
const aiFeatures = [
    {
        Ic: Icon.Star, title: "Priority Scoring", subtitle: "Score 1–100",
        desc: "AI reads subject, body, and sender to assign a precise urgency score. The higher the score, the sooner you act.",
        visual: <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "16px 0 4px" }}>
            {[{ label: "Project deadline", score: 94 }, { label: "Team standup", score: 61 }, { label: "Newsletter", score: 12 }].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontFamily: BODY, fontSize: 10, color: "#94a3b8", width: 100, flexShrink: 0 }}>{r.label}</span>
                    <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(255,255,255,.06)" }}>
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${r.score}%` }} viewport={{ once: true }} transition={{ delay: .3 + i * .15, duration: 1.2, ease: [.23, 1, .32, 1] }} style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#7c3aed,#c084fc)" }} />
                    </div>
                    <span style={{ fontFamily: BODY, fontSize: 10, fontWeight: 800, color: "#a78bfa", width: 24 }}>{r.score}</span>
                </div>
            ))}
        </div>,
    },
    {
        Ic: Icon.Layers, title: "Smart Categorisation", subtitle: "4 actionable buckets",
        desc: "Every email is sorted into Do Now, Needs Decision, Waiting, or Low Energy — so attention is never wasted on the wrong thing.",
        visual: <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "16px 0 4px" }}>
            {["Do Now", "Needs Decision", "Waiting", "Low Energy"].map((c, i) => (
                <motion.span key={i} initial={{ opacity: 0, scale: .8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: .2 + i * .1 }}
                    style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, borderRadius: 100, padding: "5px 12px", background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.22)", color: "#c4b5fd" }}>{c}</motion.span>
            ))}
        </div>,
    },
    {
        Ic: Icon.Ban, title: "Spam Neural Shield", subtitle: "99.4% accuracy",
        desc: "Detects phishing, promotional spam, and too-good-to-be-true offers using a trained neural model — not just keyword filters.",
        visual: <div style={{ padding: "16px 0 4px", display: "flex", flexDirection: "column", gap: 8 }}>
            {[{ text: "URGENT: You won $500 gift card", spam: true, conf: 98 }, { text: "Team retro Friday 3pm", spam: false, conf: 99 }].map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.04)", borderRadius: 10, padding: "8px 12px", border: "1px solid rgba(255,255,255,.07)" }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, background: "rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {r.spam ? <Icon.Ban style={{ width: 10, height: 10, color: "rgba(255,255,255,.45)" }} /> : <Icon.Check style={{ width: 10, height: 10, color: "rgba(255,255,255,.45)" }} />}
                    </div>
                    <span style={{ fontFamily: BODY, fontSize: 10, color: "#94a3b8", flex: 1 }}>{r.text}</span>
                    <span style={{ fontFamily: BODY, fontSize: 9, fontWeight: 800, color: "#a78bfa" }}>{r.conf}%</span>
                </div>
            ))}
        </div>,
    },
    {
        Ic: Icon.Calendar, title: "Deadline Extraction", subtitle: "Never miss a date",
        desc: "AI parses natural language like \"by end of week\" or \"before the 21st\" and converts it to a badge on every email.",
        visual: <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "16px 0 4px" }}>
            {["Today", "Tomorrow", "This Week", "No Deadline"].map((b, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 10 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: .15 * i }}
                    style={{ fontFamily: BODY, fontSize: 10, fontWeight: 800, borderRadius: 100, padding: "5px 14px", background: "rgba(167,139,250,.1)", border: "1px solid rgba(167,139,250,.22)", color: "#c4b5fd" }}>{b}</motion.div>
            ))}
        </div>,
    },
    {
        Ic: Icon.Edit, title: "AI Reply Generation", subtitle: "Context-aware drafts",
        desc: "Scasi reads the full thread and crafts a professional, polite, concise reply. Edit it, copy it, or send it directly from the app.",
        visual: <div style={{ padding: "16px 0 4px" }}>
            <div style={{ background: "rgba(167,139,250,.08)", border: "1px solid rgba(167,139,250,.2)", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontFamily: BODY, fontSize: 9, color: "#a78bfa", fontWeight: 800, marginBottom: 6, letterSpacing: .8, display: "flex", alignItems: "center", gap: 5 }}>
                    <Icon.Sparkle style={{ width: 9, height: 9, color: "#a78bfa" }} /> AI DRAFT
                </div>
                <p style={{ fontFamily: BODY, fontSize: 11, color: "#94a3b8", lineHeight: 1.7, margin: 0 }}>&quot;Hi Sarah, thanks for reaching out. I&apos;ve reviewed the proposal and I&apos;m happy to schedule a call. Does Thursday at 3pm work for you?&quot;</p>
            </div>
        </div>,
    },
    {
        Ic: Icon.FileText, title: "Email Summarisation", subtitle: "2-line clarity",
        desc: "Long, rambling emails condensed to a 3-field summary: sender, deadline (if any), and a 2–3 line synopsis. Understand in 5 seconds.",
        visual: <div style={{ padding: "16px 0 4px", display: "flex", flexDirection: "column", gap: 4 }}>
            {[{ Ic: Icon.Mail, label: "From", val: "Raj Kumar · PM Lead" }, { Ic: Icon.Calendar, label: "Date", val: "28 Feb, 2:14 PM" }, { Ic: Icon.Zap, label: "Deadline", val: "Friday EOD" }, { Ic: Icon.FileText, label: "Summary", val: "Sign-off on Q2 budget before board meeting." }].map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "4px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <r.Ic style={{ width: 11, height: 11, color: "rgba(255,255,255,.28)", flexShrink: 0, marginTop: 2 }} />
                    <span style={{ fontFamily: BODY, fontSize: 9, fontWeight: 700, color: "#475569", width: 52, flexShrink: 0 }}>{r.label}</span>
                    <span style={{ fontFamily: BODY, fontSize: 10, color: "#94a3b8", lineHeight: 1.5 }}>{r.val}</span>
                </div>
            ))}
        </div>,
    },
    {
        Ic: Icon.Lightbulb, title: "Email Explanation", subtitle: "Why this matters",
        desc: "One click gives you 2–3 bullets explaining exactly why an email is important and what action is expected — no more re-reading.",
        visual: <div style={{ padding: "16px 0 4px", display: "flex", flexDirection: "column", gap: 6 }}>
            {["Budget approval needed by Friday — missing it delays Q2 launch by 2 weeks.", "Sender is your direct manager. Urgency: High.", "Action: Reply with approval or schedule a call."].map((b, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                    <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(167,139,250,.55)", marginTop: 5, flexShrink: 0 }} />
                    <span style={{ fontFamily: BODY, fontSize: 10, color: "#94a3b8", lineHeight: 1.6 }}>{b}</span>
                </div>
            ))}
        </div>,
    },
    {
        Ic: Icon.Target, title: "Handle For Me Agent", subtitle: "5-step agentic AI",
        desc: "A multi-step AI agent analyses, creates a task, checks calendar, drafts a reply, and surfaces a full action summary — then asks before doing anything.",
        visual: <div style={{ padding: "16px 0 4px", display: "flex", flexDirection: "column", gap: 5 }}>
            {[{ Ic: Icon.Globe, label: "Analysing email…", done: true }, { Ic: Icon.Check, label: "Task: Review Q2 Budget", done: true }, { Ic: Icon.Calendar, label: "Event: Board Meeting Fri", done: true }, { Ic: Icon.Edit, label: "Reply drafted", done: true }, { Ic: Icon.Sparkle, label: "Awaiting your approval", done: false, active: true }].map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, opacity: s.done || s.active ? 1 : .3 }}>
                    <div style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, background: s.done ? "rgba(167,139,250,.18)" : s.active ? "rgba(167,139,250,.1)" : "rgba(255,255,255,.05)", border: s.active ? "1px solid rgba(167,139,250,.38)" : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {s.done ? <Icon.Check style={{ width: 9, height: 9, color: "#a78bfa" }} /> : s.active ? <motion.div animate={{ opacity: [1, .3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa" }} /> : null}
                    </div>
                    <span style={{ fontFamily: BODY, fontSize: 10, color: s.active ? "#c4b5fd" : s.done ? "#94a3b8" : "#334155", fontWeight: s.active ? 700 : 400 }}>{s.label}</span>
                </div>
            ))}
        </div>,
    },
];

function AIFeatureCard({ f, i }) {
    const ref = useRef(null); const inView = useInView(ref, { once: true, margin: "-60px" });
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 40, scale: .97 }} animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 40, scale: inView ? 1 : .97 }} transition={{ delay: i * .07, duration: .75, ease: [.23, 1, .32, 1] }} whileHover={{ y: -8, boxShadow: "0 30px 80px rgba(124,58,237,.18)" }}
            style={{ background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 22, padding: "26px 24px", boxShadow: "0 12px 40px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.04)", position: "relative", overflow: "hidden", transition: "transform .3s,box-shadow .3s" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(167,139,250,.55),transparent)" }} />
            <div style={{ position: "absolute", top: -30, right: -30, width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(124,58,237,.12) 0%,transparent 65%)", pointerEvents: "none" }} />
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                <IBox icon={f.Ic} size={42} br={12} />
                <div>
                    <div style={{ fontFamily: BODY, fontSize: 14, fontWeight: 800, color: "#e2e8f0" }}>{f.title}</div>
                    <div style={{ fontFamily: BODY, fontSize: 10, color: "#a78bfa", fontWeight: 700, letterSpacing: .4 }}>{f.subtitle}</div>
                </div>
            </div>
            <p style={{ fontFamily: BODY, fontSize: 12, color: "#64748b", lineHeight: 1.72, marginBottom: 0 }}>{f.desc}</p>
            {f.visual}
        </motion.div>
    );
}

function AIFeaturesGrid() {
    return (
        <section style={{ position: "relative", overflow: "hidden", background: "#ffffff", padding: "90px 40px 80px" }}>
            <NerveCanvas />
            <div style={{ position: "relative", zIndex: 10, maxWidth: 1120, margin: "0 auto" }}>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 62 }}>
                    <Chip label="8 AI superpowers" />
                    <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(34px,4vw,58px)", letterSpacing: "-2.5px", lineHeight: 1.07, color: "#0f0b24", marginBottom: 14 }}>Every feature, explained.</h2>
                    <p style={{ fontFamily: BODY, fontSize: 15, color: "#64748b", maxWidth: 520, margin: "0 auto" }}>Each AI capability runs on-demand. Your emails stay private — nothing is stored, nothing is trained on.</p>
                </motion.div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 22 }}>
                    {aiFeatures.map((f, i) => <AIFeatureCard key={i} f={f} i={i} />)}
                </div>
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════
   FOCUS + WEEKLY  (dark)
════════════════════════════════════════════════════ */
function PowerSections() {
    const focusRef = useRef(null); const focusInView = useInView(focusRef, { once: true });
    const weekRef = useRef(null); const weekInView = useInView(weekRef, { once: true });
    return (
        <section style={{ position: "relative", overflow: "hidden", background: "#0d0922", padding: "90px 40px 100px" }}>
            <NodeCanvas />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 30%,rgba(124,58,237,.12) 0%,transparent 60%)", zIndex: 1, pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 10, maxWidth: 1100, margin: "0 auto" }}>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 70 }}>
                    <Chip label="Advanced modes" dark />
                    <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(32px,4vw,56px)", letterSpacing: "-2.5px", lineHeight: 1.06, background: "linear-gradient(135deg,#e9d5ff,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Focus deeper. Understand more.</h2>
                </motion.div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26 }}>
                    {/* Focus Mode */}
                    <motion.div ref={focusRef} initial={{ opacity: 0, x: -50 }} animate={{ opacity: focusInView ? 1 : 0, x: focusInView ? 0 : -50 }} transition={{ duration: .9, ease: [.23, 1, .32, 1] }} whileHover={{ y: -6 }}
                        style={{ background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(167,139,250,.22)", borderRadius: 28, padding: "36px 32px", boxShadow: "0 20px 60px rgba(124,58,237,.2),inset 0 1px 0 rgba(255,255,255,.05)", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,transparent,rgba(167,139,250,.65),transparent)" }} />
                        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(167,139,250,.1) 0%,transparent 65%)" }} />
                        <IBox icon={Icon.Focus} size={48} br={14} bg="rgba(167,139,250,.12)" />
                        <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, color: "#e2e8f0", margin: "16px 0 10px" }}>Focus Mode</h3>
                        <p style={{ fontFamily: BODY, fontSize: 13, color: "#64748b", lineHeight: 1.75, marginBottom: 24 }}>One click hides every non-urgent email. Only items marked &quot;today&quot;, &quot;urgent&quot;, or &quot;ASAP&quot; appear — numbered, full-screen, ready to be cleared one by one.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                            {[{ num: "#1", title: "Submit Q2 Report", badge: "High", deadline: "Today" }, { num: "#2", title: "Interview: Google 3pm", badge: "Med", deadline: "Today" }, { num: "#3", title: "Confirm attendance", badge: "Low", deadline: "Tonight" }].map((t, i) => (
                                <motion.div key={i} initial={{ opacity: 0, x: 20 }} animate={{ opacity: focusInView ? 1 : 0, x: focusInView ? 0 : 20 }} transition={{ delay: .3 + i * .12 }}
                                    style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(167,139,250,.06)", border: "1px solid rgba(167,139,250,.14)", borderRadius: 12, padding: "10px 14px" }}>
                                    <span style={{ fontFamily: BODY, fontSize: 11, fontWeight: 800, color: "#a78bfa", width: 24 }}>{t.num}</span>
                                    <span style={{ fontFamily: BODY, fontSize: 12, color: "#e2e8f0", flex: 1, fontWeight: 500 }}>{t.title}</span>
                                    <span style={{ fontFamily: BODY, fontSize: 9, color: "#64748b" }}>{t.badge}</span>
                                    <span style={{ fontFamily: BODY, fontSize: 9, fontWeight: 700, color: "#c4b5fd" }}>{t.deadline}</span>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                    {/* Weekly */}
                    <motion.div ref={weekRef} initial={{ opacity: 0, x: 50 }} animate={{ opacity: weekInView ? 1 : 0, x: weekInView ? 0 : 50 }} transition={{ duration: .9, ease: [.23, 1, .32, 1] }} whileHover={{ y: -6 }}
                        style={{ background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(167,139,250,.22)", borderRadius: 28, padding: "36px 32px", boxShadow: "0 20px 60px rgba(124,58,237,.12),inset 0 1px 0 rgba(255,255,255,.05)", position: "relative", overflow: "hidden" }}>
                        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,transparent,rgba(167,139,250,.65),transparent)" }} />
                        <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(167,139,250,.07) 0%,transparent 65%)" }} />
                        <IBox icon={Icon.TrendUp} size={48} br={14} bg="rgba(167,139,250,.12)" />
                        <h3 style={{ fontFamily: DISPLAY, fontWeight: 800, fontSize: 26, color: "#e2e8f0", margin: "16px 0 10px" }}>Weekly Analysis</h3>
                        <p style={{ fontFamily: BODY, fontSize: 13, color: "#64748b", lineHeight: 1.75, marginBottom: 24 }}>Track your email wellbeing over 7 days. Burnout risk, stress score, productivity rate, and personalised recommendations — all in one dashboard.</p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                            {[{ label: "Stress Score", val: 42 }, { label: "Productivity Rate", val: 78 }, { label: "Burnout Risk", val: 28 }].map((m, i) => (
                                <div key={i}>
                                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                                        <span style={{ fontFamily: BODY, fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{m.label}</span>
                                        <span style={{ fontFamily: BODY, fontSize: 10, color: "#a78bfa", fontWeight: 700 }}>{m.val}/100</span>
                                    </div>
                                    <div style={{ height: 6, borderRadius: 3, background: "rgba(255,255,255,.06)" }}>
                                        <motion.div initial={{ width: 0 }} animate={{ width: weekInView ? `${m.val}%` : 0 }} transition={{ delay: .4 + i * .2, duration: 1.3, ease: [.23, 1, .32, 1] }} style={{ height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#7c3aed,#c084fc)", boxShadow: "0 0 10px rgba(124,58,237,.4)" }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════
   TECH STACK + API  (light)
════════════════════════════════════════════════════ */
const apiEndpoints = [
    { method: "GET", path: "/api/gmail", desc: "Fetch paginated inbox" },
    { method: "POST", path: "/api/ai/priority", desc: "Priority score 1–100" },
    { method: "POST", path: "/api/ai/categorize", desc: "Bucket classification" },
    { method: "POST", path: "/api/ai/spam-detect", desc: "Neural spam shield" },
    { method: "POST", path: "/api/ai/extract-deadline", desc: "Natural language dates" },
    { method: "POST", path: "/api/ai/summarize", desc: "3-field smart summary" },
    { method: "POST", path: "/api/ai/explain", desc: "Importance bullets" },
    { method: "POST", path: "/api/ai/reply", desc: "Contextual reply draft" },
    { method: "POST", path: "/api/ai/handle-for-me", desc: "5-step agentic pipeline" },
    { method: "POST", path: "/api/ai/todo-title", desc: "Actionable task titles" },
    { method: "GET", path: "/api/gmail/message", desc: "Full email + attachments" },
    { method: "POST", path: "/api/gmail/reply", desc: "Send via Gmail API" },
    { method: "POST", path: "/api/calendar/extract", desc: "Event JSON extraction" },
    { method: "GET", path: "/api/gmail/attachment", desc: "Download attachments" },
    { method: "POST", path: "/api/team/assignments", desc: "Assign & track emails" },
];
const techPills = [{ Ic: Icon.Code, label: "Next.js 16.1.2" }, { Ic: Icon.Globe, label: "React 19.2" }, { Ic: Icon.Layers, label: "Tailwind CSS" }, { Ic: Icon.Lock, label: "NextAuth.js" }, { Ic: Icon.Mail, label: "Gmail API" }, { Ic: Icon.Bot, label: "Qwen 2.5 Coder" }, { Ic: Icon.Server, label: "OpenRouter" }, { Ic: Icon.Database, label: "TypeScript" }];

function TechSection() {
    const [hovered, setHovered] = useState(null);
    return (
        <section style={{ position: "relative", overflow: "hidden", background: "#ffffff", padding: "90px 40px 80px" }}>
            <NerveCanvas />
            <div style={{ position: "relative", zIndex: 10, maxWidth: 1080, margin: "0 auto" }}>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 62 }}>
                    <Chip label="Under the hood" />
                    <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(32px,4vw,54px)", letterSpacing: "-2px", lineHeight: 1.07, color: "#0f0b24", marginBottom: 14 }}>15 endpoints.<br /><GradText>Enterprise-grade infrastructure.</GradText></h2>
                </motion.div>
                <div style={{ display: "flex", justifyContent: "center", flexWrap: "wrap", gap: 12, marginBottom: 52 }}>
                    {techPills.map((t, i) => (
                        <motion.div key={i} initial={{ opacity: 0, scale: .8 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * .06 }} whileHover={{ y: -4, boxShadow: "0 12px 30px rgba(124,58,237,.2)" }}
                            style={{ display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 100, padding: "10px 20px", boxShadow: "0 4px 16px rgba(0,0,0,.3)" }}>
                            <t.Ic style={{ width: 14, height: 14, color: "rgba(255,255,255,.45)" }} />
                            <span style={{ fontFamily: BODY, fontSize: 12, fontWeight: 700, color: "#c4b5fd" }}>{t.label}</span>
                        </motion.div>
                    ))}
                </div>
                <div style={{ background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
                    <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,.06)", display: "flex", alignItems: "center", gap: 8 }}>
                        {["rgba(255,255,255,.18)", "rgba(255,255,255,.12)", "rgba(255,255,255,.08)"].map((c, i) => (<div key={i} style={{ width: 11, height: 11, borderRadius: "50%", background: c }} />))}
                        <span style={{ fontFamily: BODY, fontSize: 11, color: "#334155", marginLeft: 8, fontWeight: 600 }}>Scasi API — 15 Endpoints</span>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 0 }}>
                        {apiEndpoints.map((ep, i) => (
                            <motion.div key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * .04 }}
                                style={{ padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,.04)", borderRight: i % 3 !== 2 ? "1px solid rgba(255,255,255,.04)" : "none", background: hovered === i ? "rgba(124,58,237,.08)" : "transparent", transition: "background .2s" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                                    <span style={{ fontFamily: BODY, fontSize: 8, fontWeight: 800, letterSpacing: .8, color: ep.method === "GET" ? "rgba(255,255,255,.55)" : "#a78bfa", background: ep.method === "GET" ? "rgba(255,255,255,.07)" : "rgba(167,139,250,.12)", border: `1px solid ${ep.method === "GET" ? "rgba(255,255,255,.1)" : "rgba(167,139,250,.25)"}`, borderRadius: 4, padding: "2px 6px" }}>{ep.method}</span>
                                    <span style={{ fontFamily: "'Courier New',monospace", fontSize: 10, color: "#c4b5fd", fontWeight: 600 }}>{ep.path}</span>
                                </div>
                                <span style={{ fontFamily: BODY, fontSize: 10, color: "#475569" }}>{ep.desc}</span>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════
   SECURITY  (dark)
════════════════════════════════════════════════════ */
const securityPillars = [
    { Ic: Icon.Lock, title: "OAuth 2.0 Only", desc: "Your Google credentials never touch our servers. Token-based auth with automatic refresh." },
    { Ic: Icon.Ban, title: "Zero Email Storage", desc: "Raw email content is never stored server-side. AI processing happens in-session only." },
    { Ic: Icon.Bot, title: "No Training Data", desc: "Your emails are never used to train our models. Every AI call is ephemeral and private." },
    { Ic: Icon.Shield, title: "CSRF Protected", desc: "Built-in NextAuth CSRF protection on every API route. No cross-site forgery possible." },
    { Ic: Icon.Globe, title: "HTTPS Enforced", desc: "All connections are TLS encrypted. No plaintext transmission anywhere in the stack." },
    { Ic: Icon.Database, title: "Local Caching Only", desc: "Priority scores and AI results are cached client-side — never uploaded to our servers." },
];

function SecurityPillarCard({ p, i }) {
    const ref = useRef(null); const inView = useInView(ref, { once: true });
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 30, scale: .96 }} animate={{ opacity: inView ? 1 : 0, y: inView ? 0 : 30, scale: inView ? 1 : .96 }} transition={{ delay: i * .09, duration: .75 }} whileHover={{ y: -6, borderColor: "rgba(167,139,250,.28)" }}
            style={{ background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 20, padding: "26px 24px", boxShadow: "0 10px 30px rgba(0,0,0,.35)", transition: "border-color .3s,transform .3s", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg,transparent,rgba(167,139,250,.45),transparent)" }} />
            <IBox icon={p.Ic} size={40} br={11} bg="rgba(167,139,250,.1)" />
            <div style={{ fontFamily: BODY, fontSize: 14, fontWeight: 800, color: "#e2e8f0", margin: "12px 0 8px" }}>{p.title}</div>
            <p style={{ fontFamily: BODY, fontSize: 12, color: "#64748b", lineHeight: 1.7, margin: 0 }}>{p.desc}</p>
        </motion.div>
    );
}

function SecuritySection() {
    return (
        <section style={{ position: "relative", overflow: "hidden", background: "#0d0922", padding: "90px 40px 100px" }}>
            <NodeCanvas />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at 50% 50%,rgba(124,58,237,.08) 0%,transparent 60%)", zIndex: 1, pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 10, maxWidth: 1060, margin: "0 auto" }}>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 62 }}>
                    <Chip label="Privacy first" dark />
                    <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(32px,4vw,54px)", letterSpacing: "-2px", lineHeight: 1.06, background: "linear-gradient(135deg,#e9d5ff,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 14 }}>Your inbox is yours.<br />Always.</h2>
                    <p style={{ fontFamily: BODY, fontSize: 14, color: "#64748b", maxWidth: 480, margin: "0 auto" }}>Built with a privacy-first architecture. Your emails are processed, never stored.</p>
                </motion.div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 20 }}>
                    {securityPillars.map((p, i) => <SecurityPillarCard key={i} p={p} i={i} />)}
                </div>
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════
   COMPARE  (light)
════════════════════════════════════════════════════ */
const compareRows = [
    { feat: "AI Priority Scoring", gmail: false, outlook: false, mm: true },
    { feat: "Smart To-Do List", gmail: false, outlook: false, mm: true },
    { feat: "Focus Mode", gmail: false, outlook: false, mm: true },
    { feat: "Weekly Burnout Analysis", gmail: false, outlook: false, mm: true },
    { feat: "Agentic AI (Handle For Me)", gmail: false, outlook: false, mm: true },
    { feat: "Deadline Extraction", gmail: false, outlook: false, mm: true },
    { feat: "Neural Spam Shield", gmail: "Basic", outlook: "Basic", mm: "Advanced" },
    { feat: "AI Reply Generation", gmail: "Basic", outlook: "Basic", mm: "Advanced" },
    { feat: "Email Categorisation", gmail: "Manual", outlook: "Manual", mm: "AI-powered" },
    { feat: "Calendar Event Extraction", gmail: false, outlook: false, mm: true },
    { feat: "Stress Score Analytics", gmail: false, outlook: false, mm: true },
    { feat: "Team Collaboration", gmail: false, outlook: "Basic", mm: true },
];

function CompareSection() {
    return (
        <section style={{ position: "relative", overflow: "hidden", background: "#ffffff", padding: "88px 40px 80px" }}>
            <NerveCanvas />
            <div style={{ position: "relative", zIndex: 10, maxWidth: 920, margin: "0 auto" }}>
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 52 }}>
                    <Chip label="Why Scasi" />
                    <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(30px,4vw,52px)", letterSpacing: "-2px", lineHeight: 1.07, color: "#0f0b24" }}>Not just another<br /><GradText>email client.</GradText></h2>
                </motion.div>
                <div style={{ background: "linear-gradient(145deg,#0e0b28,#0b0920)", border: "1px solid rgba(124,58,237,.2)", borderRadius: 24, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,.35)" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                            <tr>
                                <th style={{ textAlign: "left", padding: "18px 24px", fontFamily: BODY, fontSize: 10, color: "#334155", fontWeight: 800, letterSpacing: 2, textTransform: "uppercase", borderBottom: "1px solid rgba(255,255,255,.07)" }}>Feature</th>
                                {["Gmail", "Outlook", "Scasi"].map((h, i) => (
                                    <th key={h} style={{ textAlign: "center", padding: "18px 12px", fontFamily: BODY, fontSize: 12, fontWeight: 800, color: i === 2 ? "#a78bfa" : "#475569", borderBottom: "1px solid rgba(255,255,255,.07)" }}>
                                        {h}{i === 2 && <div style={{ fontFamily: BODY, fontSize: 8, color: "#7c3aed", fontWeight: 600, letterSpacing: .5, marginTop: 2 }}>AI-POWERED</div>}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {compareRows.map((row, i) => {
                                const cells = [row.gmail, row.outlook, row.mm];
                                return (
                                    <motion.tr key={i} initial={{ opacity: 0, x: -16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * .04 }} style={{ borderBottom: "1px solid rgba(255,255,255,.04)", background: i % 2 === 0 ? "transparent" : "rgba(124,58,237,.02)" }}>
                                        <td style={{ padding: "13px 24px", fontFamily: BODY, fontSize: 12, color: "#64748b" }}>{row.feat}</td>
                                        {cells.map((v, j) => (
                                            <td key={j} style={{ textAlign: "center", padding: "13px 12px" }}>
                                                {v === true
                                                    ? <div style={{ display: "flex", justifyContent: "center" }}><div style={{ width: 18, height: 18, borderRadius: 5, background: "rgba(167,139,250,.15)", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon.Check style={{ width: 10, height: 10, color: "#a78bfa" }} /></div></div>
                                                    : v === false
                                                        ? <span style={{ color: "rgba(255,255,255,.18)", fontSize: 14 }}>—</span>
                                                        : <span style={{ fontFamily: BODY, fontSize: 10, fontWeight: 700, color: j === 2 ? "#c4b5fd" : "#64748b" }}>{v}</span>}
                                            </td>
                                        ))}
                                    </motion.tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════
   FINAL CTA  (dark)
════════════════════════════════════════════════════ */
function FinalCTA() {
    return (
        <>
            <WaveDown fromColor="#ffffff" toColor="#0d0922" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0d0922" }}>
                <NodeCanvas />
                <div style={{ position: "absolute", top: "0%", left: "50%", transform: "translateX(-50%)", width: "70%", height: "100%", background: "radial-gradient(ellipse,rgba(124,58,237,.18) 0%,transparent 65%)", pointerEvents: "none", zIndex: 1 }} />
                <div style={{ position: "relative", zIndex: 10, maxWidth: 700, margin: "0 auto", padding: "100px 48px 130px", textAlign: "center" }}>
                    <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: .8 }}>
                        <Chip label="Ready to transform your inbox?" dark />
                        <h2 style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: "clamp(36px,5vw,72px)", letterSpacing: "-3px", lineHeight: 1.03, background: "linear-gradient(160deg,#e9d5ff 0%,#c084fc 35%,#a855f7 65%,#7c3aed 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 20 }}>
                            See it for yourself.<br />Free for 14 days.
                        </h2>
                        <p style={{ fontFamily: BODY, fontSize: 15, color: "rgba(200,188,255,.6)", lineHeight: 1.85, marginBottom: 44, maxWidth: 440, margin: "0 auto 44px" }}>
                            Connect Gmail in under 60 seconds. No credit card. No setup fee. Just an inbox that finally works for you.
                        </p>
                        <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                            <motion.button whileHover={{ scale: 1.05, boxShadow: "0 20px 60px rgba(124,58,237,.55)" }} whileTap={{ scale: .97 }}
                                onClick={() => signIn("google", { callbackUrl: "/" })}
                                style={{ background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", borderRadius: 100, padding: "15px 40px", color: "white", fontWeight: 800, fontSize: 15, fontFamily: BODY, boxShadow: "0 8px 32px rgba(124,58,237,.4)", cursor: "pointer", letterSpacing: .3, display: "flex", alignItems: "center", gap: 8 }}>
                                Connect Gmail — it&apos;s free
                                <Icon.ArrowRight style={{ width: 16, height: 16, color: "white" }} />
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: .97 }}
                                onClick={() => window.location.href = '/pricing'}
                                style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.14)", borderRadius: 100, padding: "15px 32px", color: "#94a3b8", fontWeight: 700, fontSize: 15, fontFamily: BODY, cursor: "pointer" }}>
                                See pricing
                            </motion.button>
                        </div>
                        <p style={{ fontFamily: BODY, fontSize: 11, color: "#334155", marginTop: 22 }}>
                            ✓ 60-second setup &nbsp;·&nbsp; ✓ No credit card &nbsp;·&nbsp; ✓ Cancel anytime
                        </p>
                    </motion.div>
                </div>
            </section>
        </>
    );
}

/* ════════════════════════════════════════════════════
   MAIN EXPORT
════════════════════════════════════════════════════ */
export default function HowItWorks() {
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
            <Hero />
            <WaveDown fromColor="#ffffff" toColor="#0d0922" />
            <ProcessTimeline />
            <WaveUp fromColor="#0d0922" toColor="#ffffff" />
            <AIFeaturesGrid />
            <WaveDown fromColor="#ffffff" toColor="#0d0922" />
            <PowerSections />
            <WaveUp fromColor="#0d0922" toColor="#ffffff" />
            <TechSection />
            <WaveDown fromColor="#ffffff" toColor="#0d0922" />
            <SecuritySection />
            <WaveUp fromColor="#0d0922" toColor="#ffffff" />
            <CompareSection />
            <FinalCTA />
            <Footer />
        </div>
    );
}
