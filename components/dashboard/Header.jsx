"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useEffect, useState, useRef } from "react";
import {
    motion,
    useMotionValue,
    useSpring,
} from "framer-motion";

/* ───────────────────────────────────────────
   Active Link Hook
─────────────────────────────────────────── */
function useActiveLink() {
    const [active] = useState(() =>
        typeof window !== "undefined" ? window.location.pathname : ""
    );
    return active;
}

/* ───────────────────────────────────────────
   Magnetic Button Hook
─────────────────────────────────────────── */
function useMagnetic(strength = 0.35) {
    const ref = useRef(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const sx = useSpring(x, { stiffness: 200, damping: 18 });
    const sy = useSpring(y, { stiffness: 200, damping: 18 });

    const handleMouseMove = (e) => {
        const el = ref.current;
        if (!el) return;

        const rect = el.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        x.set((e.clientX - cx) * strength);
        y.set((e.clientY - cy) * strength);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return { ref, sx, sy, handleMouseMove, handleMouseLeave };
}

const NAV_LINKS = [
    { name: "Features", href: "/features" },
    { name: "How it Works", href: "/how-it-works" },
    { name: "Testimonials", href: "/testimonials" },
];

export default function Header() {
    const [time, setTime] = useState("");
    const [scrolled, setScrolled] = useState(false);
    const [signingIn, setSigningIn] = useState(false);

    const active = useActiveLink();
    const magnetic = useMagnetic(0.3);

    /* Clock */
    useEffect(() => {
        const tick = () => {
            const t = new Date().toLocaleString("en-IN", {
                weekday: "short",
                day: "2-digit",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
            });
            setTime(t);
        };
        tick();
        const id = setInterval(tick, 60000);
        return () => clearInterval(id);
    }, []);

    /* Scroll detection */
    useEffect(() => {
        const h = () => setScrolled(window.scrollY > 24);
        window.addEventListener("scroll", h, { passive: true });
        return () => window.removeEventListener("scroll", h);
    }, []);

    const handleSignIn = async () => {
        setSigningIn(true);
        await signIn("google", { callbackUrl: "/" });
        setSigningIn(false);
    };

    return (
        <>
            {/* GLOBAL STYLES */}
            <style>{`
        @keyframes mm-shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        @keyframes mm-pulse-ring {
          0% { transform: scale(1); opacity: 0.6; }
          100% { transform: scale(1.9); opacity: 0; }
        }

        .mm-shimmer-text {
          background: linear-gradient(
            120deg,
            #ffffff 0%,
            #c4b5fd 30%,
            #ffffff 50%,
            #a78bfa 70%,
            #ffffff 100%
          );
          background-size: 200% auto;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: mm-shimmer 4s linear infinite;
        }

        .mm-btn-glow:hover {
          box-shadow:
            0 0 0 1px rgba(167,139,250,0.4),
            0 0 24px rgba(124,58,237,0.5),
            0 0 48px rgba(124,58,237,0.2),
            inset 0 1px 0 rgba(255,255,255,0.15);
        }

        .mm-link-hover::after {
          content: '';
          position: absolute;
          bottom: -3px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, #a78bfa, transparent);
          transition: width 0.35s cubic-bezier(0.23,1,0.32,1);
        }

        .mm-link-hover:hover::after {
          width: 100%;
        }
      `}</style>

            <motion.header
                initial={{ y: -80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.9 }}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 1000,
                    padding: scrolled ? "10px 24px" : "18px 24px",
                    transition: "padding 0.4s ease",
                }}
            >
                <motion.div
                    layout
                    style={{
                        maxWidth: 1240,
                        margin: "0 auto",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        background: scrolled
                            ? "rgba(9,6,28,0.9)"
                            : "rgba(15,9,38,0.55)",
                        backdropFilter: "blur(28px)",
                        borderRadius: 20,
                        border: "1px solid rgba(167,139,250,0.15)",
                        padding: "12px 18px",
                    }}
                >
                    {/* LOGO */}
                    <Link href="/" style={{ textDecoration: "none" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                            <div style={{ position: "relative", width: 42, height: 42 }}>
                                <div
                                    style={{
                                        position: "absolute",
                                        inset: -4,
                                        borderRadius: 14,
                                        border: "1px solid rgba(167,139,250,0.35)",
                                        animation: "mm-pulse-ring 2.4s ease-out infinite",
                                    }}
                                />
                                <div
                                    style={{
                                        width: 42,
                                        height: 42,
                                        borderRadius: 13,
                                        background:
                                            "linear-gradient(135deg, #7c3aed 0%, #4f46e5 60%, #312e81 100%)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontWeight: 900,
                                        color: "white",
                                    }}
                                >
                                    S
                                </div>
                            </div>

                            <div>
                                <div className="mm-shimmer-text" style={{ fontWeight: 800 }}>
                                    Scasi
                                </div>
                                <div style={{ fontSize: 10, color: "#94a3b8" }}>
                                    {time}
                                </div>
                            </div>
                        </div>
                    </Link>

                    {/* NAV */}
                    <nav style={{ display: "flex", gap: 20 }}>
                        {NAV_LINKS.map((item) => (
                            <Link key={item.name} href={item.href}>
                                <span
                                    className="mm-link-hover"
                                    style={{
                                        position: "relative",
                                        fontSize: 14,
                                        color:
                                            active === item.href
                                                ? "#c4b5fd"
                                                : "rgba(203,213,225,0.75)",
                                    }}
                                >
                                    {item.name}
                                </span>
                            </Link>
                        ))}
                    </nav>

                    {/* CTA */}
                    {/* eslint-disable react-hooks/refs */}
                    <motion.button
                        ref={magnetic.ref}
                        onMouseMove={magnetic.handleMouseMove}
                        onMouseLeave={magnetic.handleMouseLeave}
                        onClick={handleSignIn}
                        className="mm-btn-glow"
                        style={{
                            x: magnetic.sx,
                            y: magnetic.sy,
                            padding: "12px 24px",
                            borderRadius: 14,
                            border: "1px solid rgba(167,139,250,0.25)",
                            background:
                                "linear-gradient(135deg, #7c3aed 0%, #5b21b6 50%, #4f46e5 100%)",
                            color: "white",
                            fontWeight: 700,
                            cursor: "pointer",
                        }}
                    >
                        {signingIn ? "Signing in…" : "Sign in with Google →"}
                    </motion.button>
                    {/* eslint-enable react-hooks/refs */}
                </motion.div>
            </motion.header>
        </>
    );
}