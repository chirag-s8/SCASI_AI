"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import { signIn } from "next-auth/react";
import Header from "@/components/dashboard/Header";
import Footer from "@/components/Footer";

/* ─────────────────────────────────────────────
   ELEGANT CURSOR — ring + dot (matches screenshot)
───────────────────────────────────────────── */
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
                border: "1.5px solid rgba(124,58,237,0.55)", zIndex: 99999, pointerEvents: "none", willChange: "transform",
                transform: "translate(-300px,-300px)", transition: "border-color .2s"
            }} />
            <div ref={dotRef} style={{
                position: "fixed", top: 0, left: 0, width: 6, height: 6, borderRadius: "50%",
                background: "#7c3aed", zIndex: 100000, pointerEvents: "none", willChange: "transform",
                transform: "translate(-300px,-300px)", boxShadow: "0 0 8px rgba(124,58,237,.7)"
            }} />
        </>
    );
}

/* ─────────────────────────────────────────────
   BG-A  Hero — soft lavender gradient mesh
───────────────────────────────────────────── */
function HeroCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext("2d");
        let W = (c.width = c.offsetWidth);
        let H = (c.height = c.offsetHeight);
        const orbs = [
            { x: .78, y: .28, r: 380, h: 265, a: .13, ph: 0 },
            { x: .18, y: .72, r: 310, h: 280, a: .09, ph: 1.6 },
            { x: .88, y: .82, r: 240, h: 250, a: .07, ph: 2.8 },
            { x: .08, y: .12, r: 200, h: 272, a: .06, ph: .9 },
            { x: .5, y: .5, r: 260, h: 258, a: .05, ph: 2.1 },
        ];
        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .006;
            ctx.clearRect(0, 0, W, H);
            for (const o of orbs) {
                const px = o.x * W + Math.sin(t * .5 + o.ph) * 40;
                const py = o.y * H + Math.cos(t * .4 + o.ph) * 28;
                const sc = 1 + Math.sin(t * .7 + o.ph) * .07;
                const g = ctx.createRadialGradient(px, py, 0, px, py, o.r * sc);
                g.addColorStop(0, `hsla(${o.h},78%,72%,${o.a})`);
                g.addColorStop(.55, `hsla(${o.h},65%,66%,${o.a * .35})`);
                g.addColorStop(1, `hsla(${o.h},60%,60%,0)`);
                ctx.beginPath(); ctx.arc(px, py, o.r * sc, 0, Math.PI * 2);
                ctx.fillStyle = g; ctx.fill();
            }
        };
        draw();
        const onR = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
        window.addEventListener("resize", onR);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
    }, []);
    return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ─────────────────────────────────────────────
   BG-B  White sections — nerve paths + dot grid
───────────────────────────────────────────── */
function NerveCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext("2d");
        let W = (c.width = c.offsetWidth);
        let H = (c.height = c.offsetHeight);
        const paths = Array.from({ length: 12 }, () => ({
            pts: Array.from({ length: 4 }, () => ({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - .5) * .2, vy: (Math.random() - .5) * .16,
            })),
            hue: 255 + Math.random() * 50,
            opa: .04 + Math.random() * .07,
            w: .7 + Math.random() * 1.3,
            ph: Math.random() * Math.PI * 2,
        }));
        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .006;
            ctx.clearRect(0, 0, W, H);
            // dot grid
            for (let gx = 0; gx < W; gx += 54)
                for (let gy = 0; gy < H; gy += 54) {
                    ctx.beginPath(); ctx.arc(gx, gy, .9, 0, Math.PI * 2);
                    ctx.fillStyle = "rgba(124,58,237,.045)"; ctx.fill();
                }
            for (const p of paths) {
                for (const pt of p.pts) {
                    pt.x += pt.vx + Math.sin(t * .3 + p.ph) * .05;
                    pt.y += pt.vy + Math.cos(t * .25 + p.ph) * .04;
                    if (pt.x < -60) pt.x = W + 60; if (pt.x > W + 60) pt.x = -60;
                    if (pt.y < -60) pt.y = H + 60; if (pt.y > H + 60) pt.y = -60;
                }
                const pulse = (Math.sin(t * .9 + p.ph) + 1) * .5;
                const first = p.pts[0]; const last = p.pts[p.pts.length - 1];
                const g = ctx.createLinearGradient(first.x, first.y, last.x, last.y);
                const a = p.opa * (.4 + pulse * .6);
                g.addColorStop(0, `hsla(${p.hue},80%,62%,0)`);
                g.addColorStop(.35, `hsla(${p.hue},80%,65%,${a})`);
                g.addColorStop(.7, `hsla(${p.hue + 14},76%,68%,${a * .85})`);
                g.addColorStop(1, `hsla(${p.hue},72%,62%,0)`);
                ctx.beginPath(); ctx.moveTo(first.x, first.y);
                for (let i = 1; i < p.pts.length - 1; i++) {
                    const mx = (p.pts[i].x + p.pts[i + 1].x) / 2;
                    const my = (p.pts[i].y + p.pts[i + 1].y) / 2;
                    ctx.quadraticCurveTo(p.pts[i].x, p.pts[i].y, mx, my);
                }
                ctx.lineTo(last.x, last.y);
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

/* ─────────────────────────────────────────────
   BG-C  Dark sections — node network
───────────────────────────────────────────── */
function NodeCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext("2d");
        let W = (c.width = c.offsetWidth);
        let H = (c.height = c.offsetHeight);
        const nodes = Array.from({ length: 55 }, () => ({
            x: Math.random() * W, y: Math.random() * H,
            vx: (Math.random() - .5) * .38, vy: (Math.random() - .5) * .28,
            ph: Math.random() * Math.PI * 2,
        }));
        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .007;
            ctx.clearRect(0, 0, W, H);
            for (let i = 0; i < nodes.length; i++) {
                const a = nodes[i];
                a.x += a.vx + Math.sin(t * .5 + a.ph) * .055;
                a.y += a.vy + Math.cos(t * .4 + a.ph) * .045;
                if (a.x < 0) a.x = W; if (a.x > W) a.x = 0;
                if (a.y < 0) a.y = H; if (a.y > H) a.y = 0;
                for (let j = i + 1; j < nodes.length; j++) {
                    const b = nodes[j];
                    const dx = b.x - a.x; const dy = b.y - a.y;
                    const d = Math.sqrt(dx * dx + dy * dy);
                    if (d < 165) {
                        const alpha = (1 - d / 165) * .18;
                        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
                        ctx.strokeStyle = `rgba(167,139,250,${alpha})`;
                        ctx.lineWidth = .65; ctx.stroke();
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

/* ─────────────────────────────────────────────
   BG-D  Comparison section — diagonal lines
───────────────────────────────────────────── */
function DiagonalCanvas() {
    const ref = useRef(null);
    useEffect(() => {
        const c = ref.current; if (!c) return;
        const ctx = c.getContext("2d");
        let W = (c.width = c.offsetWidth);
        let H = (c.height = c.offsetHeight);
        const lines = Array.from({ length: 18 }, () => ({
            x1: Math.random() * W, y1: Math.random() * H,
            x2: Math.random() * W, y2: Math.random() * H,
            ph: Math.random() * Math.PI * 2,
            speed: .0007 + Math.random() * .0012,
            opa: .03 + Math.random() * .07,
            hue: 255 + Math.random() * 50,
        }));
        let t = 0, raf;
        const draw = () => {
            raf = requestAnimationFrame(draw); t += .01;
            ctx.clearRect(0, 0, W, H);
            for (const ln of lines) {
                const prog = (t * ln.speed + ln.ph) % 1;
                const fade = Math.sin(prog * Math.PI);
                const cx = ln.x1 + (ln.x2 - ln.x1) * prog;
                const cy = ln.y1 + (ln.y2 - ln.y1) * prog;
                const g = ctx.createLinearGradient(ln.x1, ln.y1, ln.x2, ln.y2);
                g.addColorStop(0, `hsla(${ln.hue},80%,65%,0)`);
                g.addColorStop(.4, `hsla(${ln.hue},80%,68%,${ln.opa * fade})`);
                g.addColorStop(1, `hsla(${ln.hue},70%,62%,0)`);
                ctx.beginPath(); ctx.moveTo(ln.x1, ln.y1); ctx.lineTo(cx, cy);
                ctx.strokeStyle = g; ctx.lineWidth = .8; ctx.stroke();
                ctx.beginPath(); ctx.arc(cx, cy, 2, 0, Math.PI * 2);
                ctx.fillStyle = `hsla(${ln.hue},80%,72%,${fade * .4})`; ctx.fill();
            }
        };
        draw();
        const onR = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
        window.addEventListener("resize", onR);
        return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", onR); };
    }, []);
    return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />;
}

/* ─────────────────────────────────────────────
   VIDEO SLOT
───────────────────────────────────────────── */
function VideoSlot({ label, sub }) {
    const [hov, setHov] = useState(false);
    return (
        <motion.div
            onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}
            whileHover={{ scale: 1.01 }} transition={{ duration: .3 }}
            style={{
                position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 22, overflow: "hidden",
                background: "linear-gradient(145deg,#0d0820 0%,#160d30 45%,#0a0818 100%)",
                border: "1px solid rgba(124,58,237,.22)",
                boxShadow: "0 32px 72px rgba(76,29,149,.22),0 2px 0 rgba(124,58,237,.14)",
                cursor: "none"
            }}>
            {/* scan lines */}
            <div style={{ position: "absolute", inset: 0, background: "repeating-linear-gradient(0deg,transparent,transparent 2px,rgba(124,58,237,.013) 2px,rgba(124,58,237,.013) 3px)", zIndex: 2, pointerEvents: "none" }} />
            {/* grid */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(124,58,237,.03) 1px,transparent 1px),linear-gradient(90deg,rgba(124,58,237,.03) 1px,transparent 1px)", backgroundSize: "50px 50px", pointerEvents: "none" }} />
            {/* glow orbs */}
            <div style={{ position: "absolute", top: "18%", left: "22%", width: 220, height: 220, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(124,58,237,.25) 0%,transparent 70%)", filter: "blur(40px)", animation: "voA 9s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "12%", right: "18%", width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(ellipse,rgba(168,85,247,.22) 0%,transparent 70%)", filter: "blur(32px)", animation: "voB 11s ease-in-out infinite" }} />
            {/* chrome bar */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 36, background: "rgba(255,255,255,.03)", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", padding: "0 16px", gap: 7, zIndex: 4 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((col, i) => <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: col, opacity: .7 }} />)}
                <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
                    <div style={{ background: "rgba(124,58,237,.2)", border: "1px solid rgba(124,58,237,.3)", borderRadius: 6, padding: "2px 10px", fontSize: 9, color: "rgba(192,132,252,.9)", fontFamily: "'Outfit',sans-serif", fontWeight: 700, letterSpacing: .9 }}>LIVE DEMO</div>
                </div>
            </div>
            {/* play center */}
            <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, zIndex: 3 }}>
                <motion.div
                    animate={{ scale: hov ? 1.14 : 1, boxShadow: hov ? "0 0 0 14px rgba(124,58,237,.12),0 0 0 28px rgba(124,58,237,.06)" : "0 0 0 6px rgba(124,58,237,.1)" }}
                    transition={{ duration: .3 }}
                    style={{ width: 70, height: 70, borderRadius: "50%", background: "linear-gradient(135deg,#7c3aed,#a855f7)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 10px 36px rgba(124,58,237,.5)" }}>
                    <svg width="20" height="20" viewBox="0 0 24 24"><path d="M8 5.14v14l11-7-11-7z" fill="white" /></svg>
                </motion.div>
                <div style={{ textAlign: "center" }}>
                    <div style={{ color: "rgba(255,255,255,.92)", fontWeight: 700, fontSize: 14, fontFamily: "'Outfit',sans-serif" }}>{label}</div>
                    <div style={{ color: "rgba(192,132,252,.6)", fontSize: 12, fontFamily: "'Outfit',sans-serif", marginTop: 4 }}>{sub ?? "Video demo · Coming soon"}</div>
                </div>
            </div>
            <style>{`@keyframes voA{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(18px,-14px) scale(1.06)}}@keyframes voB{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-14px,12px) scale(1.05)}}`}</style>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   REUSABLE ATOMS
───────────────────────────────────────────── */
function Chip({ label, dark }) {
    return (
        <div style={{
            display: "inline-flex", alignItems: "center", gap: 7, borderRadius: 100, padding: "5px 15px", marginBottom: 20,
            background: dark ? "rgba(192,132,252,.12)" : "rgba(124,58,237,.07)",
            border: dark ? "1px solid rgba(192,132,252,.22)" : "1px solid rgba(124,58,237,.16)"
        }}>
            <motion.div animate={{ scale: [1, 1.55, 1] }} transition={{ duration: 2.2, repeat: Infinity }}
                style={{ width: 6, height: 6, borderRadius: "50%", background: dark ? "#c084fc" : "#7c3aed" }} />
            <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif",
                color: dark ? "#c084fc" : "#7c3aed"
            }}>{label}</span>
        </div>
    );
}

function Heading({ children, dark }) {
    return (
        <h2 style={{
            fontSize: "clamp(30px,3vw,50px)", fontWeight: 900, letterSpacing: "-1.8px", lineHeight: 1.08,
            fontFamily: "'Outfit',sans-serif", marginBottom: 16,
            color: dark ? "rgba(255,255,255,.95)" : "#1e1b4b"
        }}>{children}</h2>
    );
}

function Sub({ children, dark, center }) {
    return (
        <p style={{
            fontSize: 16, lineHeight: 1.8, fontFamily: "'Outfit',sans-serif", marginBottom: 52,
            color: dark ? "rgba(200,188,255,.7)" : "#6b7280",
            maxWidth: center ? 540 : 440,
            margin: center ? "0 auto 52px" : "0 0 52px"
        }}>{children}</p>
    );
}

function GradText({ children }) {
    return (
        <span style={{
            background: "linear-gradient(135deg,#7c3aed 0%,#a855f7 45%,#c084fc 85%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
        }}>
            {children}
        </span>
    );
}

function Check({ text, dark, accent = "#7c3aed", delay = 0, show }) {
    return (
        <motion.div initial={{ opacity: 0, x: -14 }} animate={show ? { opacity: 1, x: 0 } : {}} transition={{ delay, duration: .45 }}
            style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
            <div style={{
                width: 22, height: 22, borderRadius: "50%", flexShrink: 0, marginTop: 1, display: "flex", alignItems: "center", justifyContent: "center",
                background: `${accent}18`, border: `1px solid ${accent}32`
            }}>
                <svg width="11" height="11" viewBox="0 0 12 12">
                    <path d="M2 6l3 3 5-5" stroke={accent} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </div>
            <span style={{
                fontSize: 14.5, lineHeight: 1.72, fontFamily: "'Outfit',sans-serif",
                color: dark ? "rgba(215,205,255,.82)" : "#4b5563"
            }}>{text}</span>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   SECTION WRAPPERS
───────────────────────────────────────────── */
const W_MAX = { maxWidth: 1160, margin: "0 auto", padding: "0 52px" };

/* ─────────────────────────────────────────────
   FEATURE ROW — alternating, light bg
───────────────────────────────────────────── */
function FRow({ chip, head, sub, bullets, vLabel, vSub, flip, accent = "#7c3aed" }) {
    const ref = useRef(null);
    const iv = useInView(ref, { once: true, margin: "-80px" });
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 48 }} animate={iv ? { opacity: 1, y: 0 } : {}} transition={{ duration: .82, ease: [.23, 1, .32, 1] }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
            <div style={{ order: flip ? 2 : 1 }}>
                <Chip label={chip} />
                <h3 style={{ fontSize: "clamp(24px,2.3vw,38px)", fontWeight: 900, letterSpacing: "-1.2px", color: "#1e1b4b", lineHeight: 1.1, marginBottom: 16, fontFamily: "'Outfit',sans-serif" }}>{head}</h3>
                <p style={{ fontSize: 15, color: "#6b7280", lineHeight: 1.82, marginBottom: 28, fontFamily: "'Outfit',sans-serif" }}>{sub}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                    {bullets.map((b, i) => <Check key={i} text={b} accent={accent} delay={.08 + i * .08} show={iv} />)}
                </div>
            </div>
            <div style={{ order: flip ? 1 : 2 }}>
                <VideoSlot label={vLabel} sub={vSub} />
            </div>
        </motion.div>
    );
}

/* Feature row — dark bg */
function FRowDark({ chip, head, sub, bullets, vLabel, vSub, flip, accent = "#c084fc" }) {
    const ref = useRef(null);
    const iv = useInView(ref, { once: true, margin: "-80px" });
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 48 }} animate={iv ? { opacity: 1, y: 0 } : {}} transition={{ duration: .82, ease: [.23, 1, .32, 1] }}
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
            <div style={{ order: flip ? 2 : 1 }}>
                <Chip label={chip} dark />
                <h3 style={{ fontSize: "clamp(24px,2.3vw,38px)", fontWeight: 900, letterSpacing: "-1.2px", color: "rgba(255,255,255,.95)", lineHeight: 1.1, marginBottom: 16, fontFamily: "'Outfit',sans-serif" }}>{head}</h3>
                <p style={{ fontSize: 15, color: "rgba(200,188,255,.7)", lineHeight: 1.82, marginBottom: 28, fontFamily: "'Outfit',sans-serif" }}>{sub}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                    {bullets.map((b, i) => <Check key={i} text={b} dark accent={accent} delay={.08 + i * .08} show={iv} />)}
                </div>
            </div>
            <div style={{ order: flip ? 1 : 2 }}>
                <VideoSlot label={vLabel} sub={vSub} />
            </div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   MINI CARD
───────────────────────────────────────────── */
function Card({ icon, title, desc, delay = 0, dark }) {
    const ref = useRef(null);
    const iv = useInView(ref, { once: true, margin: "-30px" });
    const [hov, setHov] = useState(false);
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 32 }} animate={iv ? { opacity: 1, y: 0 } : {}} transition={{ delay, duration: .6, ease: [.23, 1, .32, 1] }}
            onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}
            style={{
                position: "relative", borderRadius: 20, padding: "26px 22px", cursor: "none", overflow: "hidden", transition: "all .28s ease",
                background: dark ? (hov ? "rgba(167,139,250,.1)" : "rgba(255,255,255,.035)") : (hov ? "rgba(124,58,237,.04)" : "#ffffff"),
                border: dark ? (hov ? "1px solid rgba(192,132,252,.3)" : "1px solid rgba(255,255,255,.07)") : (hov ? "1px solid rgba(124,58,237,.22)" : "1px solid rgba(0,0,0,.07)"),
                boxShadow: hov ? (dark ? "0 0 40px rgba(124,58,237,.12)" : "0 14px 44px rgba(124,58,237,.09)") : (dark ? "none" : "0 2px 10px rgba(0,0,0,.04)")
            }}>
            {hov && <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, borderRadius: "20px 20px 0 0", background: "linear-gradient(90deg,#7c3aed,#a855f7,#c084fc)" }} />}
            <motion.div animate={hov ? { y: -3 } : { y: 0 }} transition={{ duration: .28 }}>
                <div style={{
                    width: 46, height: 46, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, marginBottom: 14,
                    background: dark ? "rgba(124,58,237,.15)" : "rgba(124,58,237,.07)",
                    border: dark ? "1px solid rgba(124,58,237,.22)" : "1px solid rgba(124,58,237,.12)"
                }}>{icon}</div>
                <div style={{
                    fontSize: 15, fontWeight: 800, marginBottom: 8, fontFamily: "'Outfit',sans-serif", letterSpacing: "-.2px",
                    color: dark ? "rgba(255,255,255,.9)" : "#1e1b4b"
                }}>{title}</div>
                <div style={{
                    fontSize: 13.5, lineHeight: 1.7, fontFamily: "'Outfit',sans-serif",
                    color: dark ? "rgba(200,188,255,.62)" : "#6b7280"
                }}>{desc}</div>
            </motion.div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   STAT BAR
───────────────────────────────────────────── */
function StatBar() {
    const ref = useRef(null); const iv = useInView(ref, { once: true });
    const stats = [
        { v: "60%", l: "Time saved daily" },
        { v: "14+", l: "AI features built-in" },
        { v: "0.8s", l: "Average reply drafted" },
        { v: "99%", l: "Priority accuracy" },
    ];
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 24 }} animate={iv ? { opacity: 1, y: 0 } : {}} transition={{ duration: .7 }}
            style={{
                display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 1, borderRadius: 20, overflow: "hidden",
                border: "1px solid rgba(124,58,237,.12)", background: "rgba(124,58,237,.08)"
            }}>
            {stats.map((s, i) => (
                <motion.div key={i} initial={{ opacity: 0 }} animate={iv ? { opacity: 1 } : {}} transition={{ delay: .1 + i * .08 }}
                    style={{ background: "#ffffff", padding: "30px 20px", textAlign: "center" }}>
                    <div style={{
                        fontSize: "clamp(28px,3.4vw,46px)", fontWeight: 900, letterSpacing: "-2.5px", fontFamily: "'Outfit',sans-serif",
                        background: "linear-gradient(135deg,#7c3aed,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text"
                    }}>{s.v}</div>
                    <div style={{ fontSize: 13, color: "#6b7280", marginTop: 5, fontFamily: "'Outfit',sans-serif", fontWeight: 500 }}>{s.l}</div>
                </motion.div>
            ))}
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   COMPARISON TABLE
───────────────────────────────────────────── */
const TABLE_ROWS = [
    ["AI Priority Scoring", false, false, true],
    ["Smart To-Do List", false, false, true],
    ["Focus Mode", false, false, true],
    ["Burnout Analysis", false, false, true],
    ["Agentic AI (5 Steps)", false, false, true],
    ["Reply Generation", "Basic", "Basic", "Advanced"],
    ["Spam Detection", "Basic", "Basic", "AI-powered"],
    ["Deadline Extraction", false, false, true],
    ["Email Categorization", "Manual", "Manual", "AI-powered"],
];
function CompareTable() {
    const ref = useRef(null); const iv = useInView(ref, { once: true, margin: "-60px" });
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 40 }} animate={iv ? { opacity: 1, y: 0 } : {}} transition={{ duration: .75 }}
            style={{ borderRadius: 24, overflow: "hidden", border: "1px solid rgba(124,58,237,.12)", boxShadow: "0 8px 48px rgba(109,40,217,.07)" }}>
            {/* header */}
            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr", background: "linear-gradient(135deg,#1e1b4b,#2d1f63)", padding: "22px 32px" }}>
                {["Feature", "Gmail", "Outlook", "Scasi"].map((h, i) => (
                    <div key={i} style={{
                        fontSize: 11, fontWeight: 700, letterSpacing: .9, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif",
                        color: i === 3 ? "#c084fc" : "rgba(255,255,255,.5)", textAlign: i > 0 ? "center" : "left"
                    }}>{h}</div>
                ))}
            </div>
            {TABLE_ROWS.map((row, ri) => (
                <motion.div key={ri} initial={{ opacity: 0, x: -18 }} animate={iv ? { opacity: 1, x: 0 } : {}} transition={{ delay: ri * .05, duration: .4 }}
                    style={{
                        display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr", padding: "15px 32px",
                        background: ri % 2 === 0 ? "#f9f9fb" : "#ffffff", borderBottom: "1px solid rgba(0,0,0,.04)", alignItems: "center"
                    }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#1e1b4b", fontFamily: "'Outfit',sans-serif" }}>{row[0]}</div>
                    {[row[1], row[2], row[3]].map((v, ci) => (
                        <div key={ci} style={{ textAlign: "center" }}>
                            {v === false
                                ? <span style={{ color: "#d1d5db", fontSize: 20, fontWeight: 200 }}>—</span>
                                : v === true
                                    ? <span style={{
                                        display: "inline-flex", width: 22, height: 22, borderRadius: "50%", alignItems: "center", justifyContent: "center",
                                        background: ci === 2 ? "linear-gradient(135deg,#7c3aed,#a855f7)" : "rgba(124,58,237,.08)"
                                    }}>
                                        <svg width="11" height="11" viewBox="0 0 12 12">
                                            <path d="M2 6l3 3 5-5" stroke={ci === 2 ? "white" : "#7c3aed"} strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                    : <span style={{
                                        fontSize: 11, fontWeight: 600, padding: "2px 9px", borderRadius: 20, fontFamily: "'Outfit',sans-serif",
                                        color: ci === 2 ? "#7c3aed" : "#9ca3af", background: ci === 2 ? "rgba(124,58,237,.08)" : "transparent"
                                    }}>{v}</span>}
                        </div>
                    ))}
                </motion.div>
            ))}
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   TECH PILL — each in its own component so hooks work
───────────────────────────────────────────── */
const TECH = [
    { l: "Next.js 16", s: "Framework" }, { l: "TypeScript", s: "Language" }, { l: "Gmail API", s: "Email Layer" },
    { l: "Qwen 2.5 AI", s: "Intelligence" }, { l: "NextAuth", s: "Security" },
    { l: "15 Endpoints", s: "API Surface" }, { l: "0 Errors", s: "Build Quality" },
    { l: "OAuth 2.0", s: "Auth Standard" }, { l: "Turbopack", s: "Build Speed" }, { l: "WCAG AA", s: "Accessibility" },
];
function TechPill({ l, s, i }) {
    const ref = useRef(null); const iv = useInView(ref, { once: true });
    const [hov, setHov] = useState(false);
    return (
        <motion.div ref={ref} initial={{ opacity: 0, y: 18 }} animate={iv ? { opacity: 1, y: 0 } : {}} transition={{ delay: i * .05, duration: .44 }}
            onHoverStart={() => setHov(true)} onHoverEnd={() => setHov(false)}
            style={{
                borderRadius: 16, padding: "20px 16px", textAlign: "center", cursor: "none", transition: "all .25s",
                background: hov ? "rgba(167,139,250,.12)" : "rgba(255,255,255,.04)",
                border: hov ? "1px solid rgba(192,132,252,.3)" : "1px solid rgba(255,255,255,.07)",
                boxShadow: hov ? "0 0 32px rgba(124,58,237,.12)" : "none"
            }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: "rgba(255,255,255,.9)", fontFamily: "'Outfit',sans-serif" }}>{l}</div>
            <div style={{ fontSize: 11, color: "#a855f7", fontWeight: 600, marginTop: 5, fontFamily: "'Outfit',sans-serif", letterSpacing: .4 }}>{s}</div>
        </motion.div>
    );
}

/* ─────────────────────────────────────────────
   WAVE DIVIDER between light and dark
───────────────────────────────────────────── */
function WaveDown({ fromColor = "#ffffff", toColor = "#120c28" }) {
    return (
        <div style={{ background: fromColor, lineHeight: 0, display: "block" }}>
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}>
                <path d="M0,0 C480,70 960,70 1440,0 L1440,70 L0,70 Z" fill={toColor} />
            </svg>
        </div>
    );
}
function WaveUp({ fromColor = "#120c28", toColor = "#ffffff" }) {
    return (
        <div style={{ background: fromColor, lineHeight: 0, display: "block" }}>
            <svg viewBox="0 0 1440 70" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 70 }}>
                <path d="M0,70 C480,0 960,0 1440,70 L1440,0 L0,0 Z" fill={toColor} />
            </svg>
        </div>
    );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function FeaturesPage() {
    return (
        <div style={{ background: "#fafafa", fontFamily: "'Outfit',sans-serif", color: "#1e1b4b", overflowX: "hidden" }}>
            <Header />
            <ElegantCursor />
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html{scroll-behavior:smooth}
        body{background:#fafafa;overflow-x:hidden}
        ::-webkit-scrollbar{width:3px}
        ::-webkit-scrollbar-thumb{background:linear-gradient(#7c3aed,#a855f7);border-radius:10px}
        ::selection{background:rgba(124,58,237,.15);color:#4c1d95}
      `}</style>

            {/* ╔══════════════════════════════════════════════════
          §1  HERO  —  lavender mesh BG, warm white
      ══════════════════════════════════════════════════╗ */}
            <section style={{
                position: "relative", overflow: "hidden",
                background: "linear-gradient(165deg,#faf8ff 0%,#f2ecff 55%,#ebe4ff 100%)",
                paddingTop: 80, paddingBottom: 0
            }}>
                <HeroCanvas />
                {/* Decorative rings */}
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 70, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", top: "4%", right: "4%", width: 280, height: 280, borderRadius: "50%", border: "1px solid rgba(124,58,237,.07)", pointerEvents: "none", zIndex: 1 }} />
                <motion.div animate={{ rotate: -360 }} transition={{ duration: 110, repeat: Infinity, ease: "linear" }}
                    style={{ position: "absolute", top: "1%", right: "1%", width: 420, height: 420, borderRadius: "50%", border: "1px dashed rgba(124,58,237,.05)", pointerEvents: "none", zIndex: 1 }} />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 0, paddingBottom: 80 }}>
                    {/* badge */}
                    <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, ease: [.23, 1, .32, 1] }}
                        style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" }}>
                        <Chip label="15 AI-Powered Features" />
                        <h1 style={{
                            fontSize: "clamp(44px,5.8vw,82px)", fontWeight: 900, letterSpacing: "-3.5px", lineHeight: 1.03,
                            color: "#1e1b4b", marginBottom: 22, fontFamily: "'Outfit',sans-serif"
                        }}>
                            Everything you need.<br />
                            <GradText>Nothing you don&apos;t.</GradText>
                        </h1>
                        <p style={{ fontSize: 17, color: "#6b7280", lineHeight: 1.82, maxWidth: 520, marginBottom: 44, fontFamily: "'Outfit',sans-serif" }}>
                            Scasi ranks urgency, drafts replies, extracts tasks, and prevents burnout —
                            so your most important work always comes first.
                        </p>
                        <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
                            <motion.button whileHover={{ scale: 1.04, boxShadow: "0 16px 48px rgba(124,58,237,.4)" }} whileTap={{ scale: .97 }}
                                onClick={() => signIn("google", { callbackUrl: "/" })}
                                style={{
                                    background: "linear-gradient(135deg,#7c3aed,#a855f7)", border: "none", borderRadius: 100,
                                    padding: "13px 32px", color: "white", fontWeight: 800, fontSize: 14, fontFamily: "'Outfit',sans-serif",
                                    boxShadow: "0 6px 24px rgba(124,58,237,.32)", cursor: "pointer"
                                }}>
                                Start free · Sign in with Google
                            </motion.button>
                            <motion.button whileHover={{ scale: 1.03 }}
                                style={{
                                    background: "rgba(124,58,237,.07)", border: "1.5px solid rgba(124,58,237,.22)", borderRadius: 100,
                                    padding: "13px 28px", color: "#7c3aed", fontSize: 14, fontWeight: 600, fontFamily: "'Outfit',sans-serif"
                                }}>
                                View live demo →
                            </motion.button>
                        </div>
                    </motion.div>
                    <div style={{ marginTop: 72 }}>
                        <StatBar />
                    </div>
                </div>
                <WaveDown fromColor="transparent" toColor="#ffffff" />
            </section>

            {/* ╔══════════════════════════════════════════════════
          §2  PRIORITY ENGINE  —  white + nerve paths
      ══════════════════════════════════════════════════╗ */}
            <section style={{ position: "relative", overflow: "hidden", background: "#ffffff", paddingTop: 24 }}>
                <NerveCanvas />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 72, paddingBottom: 96 }}>
                    {/* section label */}
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 52 }}>
                        <div style={{ width: 3, height: 52, borderRadius: 99, background: "linear-gradient(180deg,#7c3aed,#a855f7)" }} />
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#7c3aed", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Feature 01 — Priority Engine</div>
                            <Heading><GradText>Intelligently ranked</GradText> before you open it.</Heading>
                        </div>
                    </div>
                    <Sub>The AI reads every email and assigns a priority score 0–100 in milliseconds. Red is urgent, green is low — you never second-guess again.</Sub>
                    <FRow
                        chip="AI Priority Scoring"
                        head={<>From chaos to <span style={{ color: "#7c3aed" }}>crystal clarity.</span></>}
                        sub="Qwen 2.5 analyzes sender patterns, urgency language, deadlines, and thread context to rank emails with human-like judgment — before you open a single one."
                        bullets={[
                            "Priority score 0–100 with red / amber / green visual coding",
                            "AI reasoning panel explains exactly why each email was ranked",
                            "Smart categories: Do Now · Needs Decision · Waiting · Low Energy",
                            "Confidence scores on every prediction — complete transparency",
                        ]}
                        vLabel="See Priority Scoring Live"
                        vSub="Feature walkthrough · 2 min"
                        accent="#7c3aed"
                    />
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════
          §3  REPLY & TASKS  —  deep dark navy + node network
      ══════════════════════════════════════════════════╗ */}
            <WaveDown fromColor="#ffffff" toColor="#0f0b24" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0f0b24", paddingTop: 16 }}>
                <NodeCanvas />
                {/* horizon glow */}
                <div style={{
                    position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "70%", height: 220,
                    background: "radial-gradient(ellipse,rgba(124,58,237,.16) 0%,transparent 68%)", pointerEvents: "none"
                }} />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 72, paddingBottom: 96 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 52 }}>
                        <div style={{ width: 3, height: 52, borderRadius: 99, background: "linear-gradient(180deg,#c084fc,#a855f7)" }} />
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#c084fc", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Feature 02 — Reply & Tasks</div>
                            <h2 style={{ fontSize: "clamp(30px,3vw,50px)", fontWeight: 900, letterSpacing: "-1.8px", lineHeight: 1.08, fontFamily: "'Outfit',sans-serif", color: "rgba(255,255,255,.95)", marginBottom: 0 }}>
                                Reply in seconds. <span style={{ background: "linear-gradient(135deg,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Act without thinking.</span>
                            </h2>
                        </div>
                    </div>
                    <p style={{ fontSize: 16, color: "rgba(200,188,255,.7)", lineHeight: 1.8, maxWidth: 480, marginBottom: 52, fontFamily: "'Outfit',sans-serif" }}>
                        Stop composing from scratch. Scasi generates polished replies and extracts every task, meeting, and deadline — automatically.
                    </p>
                    <FRowDark
                        chip="Reply Generator"
                        head={<>Professional replies, <span style={{ color: "#c084fc" }}>zero effort.</span></>}
                        sub="AI drafts professional, editable replies in under a second. Copy to clipboard or send directly from Scasi — with full Gmail integration and thread awareness."
                        bullets={[
                            "Context-aware replies drawn from full email thread history",
                            "Fully editable before sending — you always have the final say",
                            "One-click task extraction: meetings, payments, deadlines auto-detected",
                            "To-do titles in 3–6 actionable words — e.g. \"Pay invoice by Friday\"",
                        ]}
                        vLabel="Watch AI Reply in Action"
                        vSub="Feature walkthrough · 90 sec"
                        flip accent="#c084fc"
                    />
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════
          §4  FOCUS MODE  —  soft lavender tint + nerve
      ══════════════════════════════════════════════════╗ */}
            <WaveUp fromColor="#0f0b24" toColor="#f7f4ff" />
            <section style={{ position: "relative", overflow: "hidden", background: "#f7f4ff", paddingTop: 24 }}>
                <NerveCanvas />
                {/* accent stripe */}
                <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg,transparent,#7c3aed 20%,#a855f7 50%,#c084fc 80%,transparent)", opacity: .3, pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 72, paddingBottom: 96 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 52 }}>
                        <div style={{ width: 3, height: 52, borderRadius: 99, background: "linear-gradient(180deg,#9333ea,#7c3aed)" }} />
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#9333ea", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Feature 03 — Focus Mode</div>
                            <Heading>One screen. <GradText>Zero distractions.</GradText></Heading>
                        </div>
                    </div>
                    <Sub>Enter Focus Mode and see only what needs your attention today. Full-screen, numbered, prioritized — your most important work, nothing else.</Sub>
                    <FRow
                        chip="Deep Focus"
                        head={<>Today&apos;s tasks, <span style={{ color: "#9333ea" }}>only today&apos;s tasks.</span></>}
                        sub="Focus Mode strips out everything that isn't urgent right now — no Re:, no Fwd:, no next week. Just the emails demanding action today, presented beautifully."
                        bullets={[
                            "Strict today-only filter: urgent, tonight, ASAP, deadline keywords",
                            "Numbered task cards with AI-generated concise, actionable titles",
                            "One-click Mark as Done — archives email automatically",
                            "Smart To-Do list with category tabs and batch AI title generation",
                        ]}
                        vLabel="Experience Focus Mode"
                        vSub="Live demo · 2 min"
                        flip accent="#9333ea"
                    />
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════
          §5  BURNOUT / WELLBEING  —  very dark + warm purple
      ══════════════════════════════════════════════════╗ */}
            <WaveDown fromColor="#f7f4ff" toColor="#0d0922" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0d0922", paddingTop: 16 }}>
                <NodeCanvas />
                <div style={{
                    position: "absolute", top: "8%", right: "6%", width: 420, height: 420, borderRadius: "50%",
                    background: "radial-gradient(ellipse,rgba(124,58,237,.14) 0%,transparent 65%)", filter: "blur(70px)", pointerEvents: "none"
                }} />
                <div style={{
                    position: "absolute", bottom: "5%", left: "3%", width: 300, height: 300, borderRadius: "50%",
                    background: "radial-gradient(ellipse,rgba(168,85,247,.1) 0%,transparent 65%)", filter: "blur(55px)", pointerEvents: "none"
                }} />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 72, paddingBottom: 96 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 52 }}>
                        <div style={{ width: 3, height: 52, borderRadius: 99, background: "linear-gradient(180deg,#a855f7,#c084fc)" }} />
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#a855f7", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Feature 04 — Wellbeing</div>
                            <h2 style={{ fontSize: "clamp(30px,3vw,50px)", fontWeight: 900, letterSpacing: "-1.8px", lineHeight: 1.08, fontFamily: "'Outfit',sans-serif", color: "rgba(255,255,255,.95)", marginBottom: 0 }}>
                                Your inbox shouldn{"'"}t{" "}
                                <span style={{ background: "linear-gradient(135deg,#a855f7,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>burn you out.</span>
                            </h2>
                        </div>
                    </div>
                    <p style={{ fontSize: 16, color: "rgba(200,188,255,.7)", lineHeight: 1.8, maxWidth: 480, marginBottom: 52, fontFamily: "'Outfit',sans-serif" }}>
                        Scasi tracks email patterns to detect stress signals before they become burnout — the only AI email assistant that genuinely cares about you.
                    </p>
                    <FRowDark
                        chip="Burnout Prevention"
                        head={<>Weekly insight. <span style={{ color: "#c084fc" }}>Lasting balance.</span></>}
                        sub="The Weekly Analysis Dashboard studies your last 7 days — urgent count, late-night activity, productivity rate — and delivers a personalized stress score with clear recommendations."
                        bullets={[
                            "Stress score 0–100 based on urgency signals and after-hours activity",
                            "Burnout risk: Low / Medium / High with animated visual indicators",
                            "Productivity rate: (completed ÷ received) × 100 with trend tracking",
                            "Personalised tips: \"Set email limits after 9 PM\", \"Delegate low-priority tasks\"",
                        ]}
                        vLabel="See Burnout Dashboard"
                        vSub="Feature walkthrough · 2 min"
                        accent="#c084fc"
                    />
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════
          §6  AGENTIC AI  —  white tint, bold left border
      ══════════════════════════════════════════════════╗ */}
            <WaveUp fromColor="#0d0922" toColor="#faf8ff" />
            <section style={{ position: "relative", overflow: "hidden", background: "#faf8ff", paddingTop: 24 }}>
                <NerveCanvas />
                <div style={{ position: "absolute", top: 0, left: 0, width: 3, height: "100%", background: "linear-gradient(180deg,transparent,#4c1d95 15%,#7c3aed 45%,#a855f7 75%,transparent)", opacity: .5, pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 72, paddingBottom: 96 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 52 }}>
                        <div style={{ width: 3, height: 52, borderRadius: 99, background: "linear-gradient(180deg,#4c1d95,#7c3aed)" }} />
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#4c1d95", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Feature 05 — Agentic AI</div>
                            <Heading><span style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Handle For Me.</span> The future of email.</Heading>
                        </div>
                    </div>
                    <Sub>One command triggers a 5-step AI agent that analyzes, creates tasks, checks your calendar, and drafts a reply — every action awaits your approval.</Sub>
                    <FRow
                        chip="5-Step AI Agent"
                        head={<>Your AI executive <span style={{ color: "#4c1d95" }}>assistant. Finally.</span></>}
                        sub="Handle For Me runs a full agentic pipeline. Every action surfaces for your review — Scasi never sends or modifies anything without your explicit sign-off."
                        bullets={[
                            "Step 1: Deep email analysis — identifies key info and required action",
                            "Step 2: Creates an actionable task with priority level and deadline",
                            "Step 3: Checks for calendar events — extracts date, time, location",
                            "Step 4: Drafts a professional reply, never sends without your approval",
                        ]}
                        vLabel="Watch Handle For Me"
                        vSub="Full agent demo · 3 min"
                        accent="#4c1d95"
                    />
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════
          §7  INTELLIGENCE LAYER  —  deepest dark, dense grid
      ══════════════════════════════════════════════════╗ */}
            <WaveDown fromColor="#faf8ff" toColor="#100c26" />
            <section style={{ position: "relative", overflow: "hidden", background: "#100c26", paddingTop: 16 }}>
                <NodeCanvas />
                {/* dot pattern overlay */}
                <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(circle,rgba(124,58,237,.07) 1px,transparent 1px)", backgroundSize: "34px 34px", pointerEvents: "none" }} />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 72, paddingBottom: 96 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 52 }}>
                        <div style={{ width: 3, height: 52, borderRadius: 99, background: "linear-gradient(180deg,#c084fc,#7c3aed)" }} />
                        <div>
                            <div style={{ fontSize: 11, fontWeight: 700, color: "#c084fc", letterSpacing: 1.2, textTransform: "uppercase", fontFamily: "'Outfit',sans-serif", marginBottom: 4 }}>Feature 06 — Intelligence Layer</div>
                            <h2 style={{ fontSize: "clamp(30px,3vw,50px)", fontWeight: 900, letterSpacing: "-1.8px", lineHeight: 1.08, fontFamily: "'Outfit',sans-serif", color: "rgba(255,255,255,.95)", marginBottom: 0 }}>
                                Every smart feature,{" "}
                                <span style={{ background: "linear-gradient(135deg,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>under one roof.</span>
                            </h2>
                        </div>
                    </div>
                    <p style={{ fontSize: 16, color: "rgba(200,188,255,.7)", lineHeight: 1.8, maxWidth: 560, marginBottom: 52, fontFamily: "'Outfit',sans-serif", textAlign: "center" }}>
                        From AI spam detection to deadline extraction, smart notifications to advanced sorting — the intelligence layer that powers everything beneath.
                    </p>
                    {/* 8-card grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16, marginBottom: 64 }}>
                        {[
                            { icon: "🚫", title: "AI Spam Detection", desc: "Detects phishing, promotional, and suspicious emails with AI confidence scores — beyond basic pattern rules." },
                            { icon: "📅", title: "Deadline Extraction", desc: "Detects 'Today', 'Tomorrow', 'DD MMM', 'This Week' and urgency levels from email content automatically." },
                            { icon: "⚡", title: "Priority Sort", desc: "Sort by AI score, deadline urgency, received date, or sender — with ascending / descending toggle." },
                            { icon: "🔔", title: "Smart Notifications", desc: "Bell icon with unread count, dropdown preview, and persistent last-seen tracking across sessions." },
                            { icon: "⭐", title: "Starred & Snoozed", desc: "Star important emails for permanent quick access. Snooze to revisit later without losing context." },
                            { icon: "📦", title: "Folder System", desc: "Inbox, Starred, Snoozed, Done, Archive, Drafts — each with live counts and smart auto-routing." },
                            { icon: "🔍", title: "Advanced Filters", desc: "Filter by Today / Tomorrow / This Week / Overdue. Active filter badges with one-click clear all." },
                            { icon: "📊", title: "Summarize & Explain", desc: "One click for a 3-line AI summary or bullet-point explanation of exactly why any email matters." },
                        ].map((f, i) => <Card key={i} {...f} delay={i * .05} dark />)}
                    </div>
                    <VideoSlot label="See the Intelligence Layer" sub="All 8 features · Full walkthrough" />
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════
          §8  COMPARISON  —  clean white
      ══════════════════════════════════════════════════╗ */}
            <WaveUp fromColor="#100c26" toColor="#ffffff" />
            <section style={{ position: "relative", overflow: "hidden", background: "#ffffff", paddingTop: 24 }}>
                <DiagonalCanvas />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 72, paddingBottom: 96 }}>
                    <div style={{ textAlign: "center", marginBottom: 60 }}>
                        <Chip label="Why Scasi" />
                        <Heading>The only email client <GradText>built for AI-first work.</GradText></Heading>
                        <p style={{ fontSize: 16, color: "#6b7280", lineHeight: 1.8, maxWidth: 500, margin: "0 auto", fontFamily: "'Outfit',sans-serif" }}>
                            Compare Scasi against Gmail and Outlook across every dimension that matters in 2026.
                        </p>
                    </div>
                    <CompareTable />
                </div>
            </section>

            {/* ╔══════════════════════════════════════════════════
          §9  TECH STACK  —  dark, minimal
      ══════════════════════════════════════════════════╗ */}
            <WaveDown fromColor="#ffffff" toColor="#0e0b22" />
            <section style={{ position: "relative", overflow: "hidden", background: "#0e0b22", paddingTop: 16 }}>
                <NodeCanvas />
                <div style={{ position: "relative", zIndex: 2, ...W_MAX, paddingTop: 64, paddingBottom: 88 }}>
                    <div style={{ textAlign: "center", marginBottom: 52 }}>
                        <Chip label="Built to Last" dark />
                        <h2 style={{ fontSize: "clamp(28px,2.8vw,46px)", fontWeight: 900, letterSpacing: "-1.8px", lineHeight: 1.1, fontFamily: "'Outfit',sans-serif", color: "rgba(255,255,255,.95)", marginBottom: 14 }}>
                            Enterprise-grade.{" "}
                            <span style={{ background: "linear-gradient(135deg,#c084fc,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Zero compromise.</span>
                        </h2>
                        <p style={{ fontSize: 15, color: "rgba(200,188,255,.65)", lineHeight: 1.8, maxWidth: 480, margin: "0 auto", fontFamily: "'Outfit',sans-serif" }}>
                            15 API endpoints, TypeScript throughout, 0 build errors. Google OAuth with no email storage — your data never touches our servers.
                        </p>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 14 }}>
                        {TECH.map((t, i) => <TechPill key={i} l={t.l} s={t.s} i={i} />)}
                    </div>
                </div>
            </section>

            <Footer />
        </div>
    );
}