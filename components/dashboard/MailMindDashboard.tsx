"use client";

import { useEffect } from "react";

interface MailMindDashboardProps {
    onNavigate: (view: string) => void;
}

function MailMindDashboard({ onNavigate }: { onNavigate: (folder: string) => void }) {

    useEffect(() => {
        // ── Google Fonts (DM Serif / DM Sans / JetBrains Mono) ──
        const link = document.createElement("link");
        link.href =
            "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=JetBrains+Mono:wght@400;500&display=swap";
        link.rel = "stylesheet";
        document.head.appendChild(link);

        // ── Bar / ring animations ──
        setTimeout(() => {
            document.querySelectorAll<HTMLElement>(".mm-brf").forEach((el) => {
                const w = el.style.width;
                el.style.width = "0%";
                requestAnimationFrame(() => {
                    el.style.width = w;
                });
            });
            const ring = document.getElementById("mm-ring") as SVGCircleElement | null;
            if (ring) {
                const full = 2 * Math.PI * 24;
                ring.style.strokeDashoffset = String(full);
                ring.style.transition =
                    "stroke-dashoffset 1.5s cubic-bezier(.23,1,.32,1) .4s";
                requestAnimationFrame(() => {
                    ring.style.strokeDashoffset = String(full - (55 / 100) * full);
                });
            }
        }, 120);

        // ── Sidebar nav active state ──
        document.querySelectorAll<HTMLElement>(".mm-ni").forEach((n) =>
            n.addEventListener("click", () => {
                document
                    .querySelectorAll<HTMLElement>(".mm-ni")
                    .forEach((x) => x.classList.remove("mm-active"));
                n.classList.add("mm-active");
            })
        );

        // ── Command palette data ──
        const ITEMS = [
            { s: "Navigation", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 17.76 4H6.24a2 2 0 0 0-1.79 1.11z"/></svg>`, l: "Go to Inbox", d: "134 unread" },
            { s: "Navigation", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`, l: "Starred emails", d: "" },
            { s: "Navigation", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/></svg>`, l: "Drafts", d: "11 drafts" },
            { s: "Navigation", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>`, l: "Done / Archived", d: "" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`, l: "Priority Scoring", d: "Score 1–100" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`, l: "AI Categorisation", d: "Do Now / Waiting…" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`, l: "Spam Neural Shield", d: "99.4% accuracy" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`, l: "Deadline Extraction", d: "Never miss a date" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, l: "Generate Reply", d: "Context-aware draft" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><line x1="16" y1="13" x2="8" y2="13"/></svg>`, l: "Email Summarise", d: "3-field summary" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>`, l: "Focus Mode", d: "Urgent tasks only" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/></svg>`, l: "Weekly Analysis", d: "Burnout + productivity" },
            { s: "AI Features", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`, l: "Handle For Me", d: "5-step agentic AI" },
            { s: "Actions", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`, l: "Compose new email", d: "⌘N" },
            { s: "Actions", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/></svg>`, l: "Refresh inbox", d: "⌘R" },
            { s: "Actions", i: `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/></svg>`, l: "Settings", d: "" },
        ];

        let po = false, pi = 0, pf = [...ITEMS];

        function renderPal(items: typeof ITEMS) {
            const c = document.getElementById("mm-palRes");
            if (!c) return;
            if (!items.length) {
                c.innerHTML = '<div style="padding:22px;text-align:center;font-size:11.5px;color:var(--mm-text3)">No results found</div>';
                return;
            }
            let h = "", last = "";
            items.forEach((it, i) => {
                if (it.s !== last) {
                    h += `<div class="mm-pal-sec">${it.s}</div>`;
                    last = it.s;
                }
                h += `<div class="mm-pal-it${i === pi ? " mm-hi" : ""}" onclick="document.getElementById('mm-pal').classList.remove('mm-open')">${it.i}<span class="mm-pal-il">${it.l}</span>${it.d ? `<span class="mm-pal-id">${it.d}</span>` : ""}</div>`;
            });
            c.innerHTML = h;
        }

        const palEl = document.getElementById("mm-pal");
        const palIn = document.getElementById("mm-palIn") as HTMLInputElement | null;

        function openPal() {
            palEl?.classList.add("mm-open");
            palIn?.focus();
            po = true;
            renderPal(ITEMS);
        }
        function closePal(e: Event) {
            if ((e as MouseEvent).target !== palEl) return;
            palEl?.classList.remove("mm-open");
            po = false;
            if (palIn) palIn.value = "";
        }

        palEl?.addEventListener("click", closePal);
        document.getElementById("mm-searchWrap")?.addEventListener("click", openPal);

        palIn?.addEventListener("input", () => {
            if (!palIn) return;
            const q = palIn.value.toLowerCase();
            pf = ITEMS.filter(
                (i) =>
                    i.l.toLowerCase().includes(q) ||
                    i.s.toLowerCase().includes(q) ||
                    (i.d && i.d.toLowerCase().includes(q))
            );
            pi = 0;
            renderPal(pf);
        });

        const kd = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") {
                e.preventDefault();
                openPal();
                return;
            }
            if (!po) return;
            if (e.key === "Escape") {
                palEl?.classList.remove("mm-open");
                po = false;
                return;
            }
            if (e.key === "ArrowDown") { pi = Math.min(pi + 1, pf.length - 1); renderPal(pf); }
            if (e.key === "ArrowUp") { pi = Math.max(pi - 1, 0); renderPal(pf); }
            if (e.key === "Enter") { palEl?.classList.remove("mm-open"); po = false; }
        };
        document.addEventListener("keydown", kd);

        // ── Notification panel ──
        const nbtn = document.getElementById("mm-nbtn");
        const np = document.getElementById("mm-np");
        function toggleN() {
            if (!nbtn || !np) return;
            const r = nbtn.getBoundingClientRect();
            np.style.top = r.bottom + 4 + "px";
            np.style.right = window.innerWidth - r.right + "px";
            np.classList.toggle("mm-open");
        }
        function clearN() {
            np?.classList.remove("mm-open");
            const b = document.getElementById("mm-nbadge");
            if (b) b.style.display = "none";
        }
        nbtn?.addEventListener("click", toggleN);
        document.getElementById("mm-clearN")?.addEventListener("click", clearN);

        const docClick = (e: Event) => {
            const t = e.target as HTMLElement;
            if (!t.closest("#mm-np") && !t.closest("#mm-nbtn"))
                np?.classList.remove("mm-open");
        };
        document.addEventListener("click", docClick);

        return () => {
            document.removeEventListener("keydown", kd);
            document.removeEventListener("click", docClick);
        };
    }, []);

    return (
        <>
            {/* ── Scoped styles — all prefixed mm- so they never clash with inbox ── */}
            <style>{`
        .mm-root *,.mm-root *::before,.mm-root *::after{box-sizing:border-box;margin:0;padding:0;}
        .mm-root{
          --mm-bg:#1c1535;--mm-bg2:#251d45;--mm-bg3:#2e2455;--mm-bg4:#372c65;
          --mm-glass:rgba(255,255,255,0.055);--mm-glass2:rgba(255,255,255,0.09);
          --mm-border:rgba(180,160,255,0.14);--mm-border2:rgba(180,160,255,0.24);
          --mm-text:#edeaff;--mm-text2:#b8b0da;--mm-text3:#7a72a8;
          --mm-accent:#7c3aed;--mm-accent2:#a78bfa;--mm-accent3:rgba(124,58,237,0.20);
          --mm-green:#34d399;--mm-red:#f87171;--mm-amber:#fbbf24;
          --mm-sw:224px;--mm-rw:340px;
          font-family:'DM Sans',sans-serif;font-size:13px;color:var(--mm-text);
          overflow:hidden;
          background:
            radial-gradient(ellipse 80% 70% at 10% 0%,rgba(139,92,246,.35) 0%,transparent 55%),
            radial-gradient(ellipse 60% 55% at 90% 85%,rgba(109,40,217,.28) 0%,transparent 55%),
            radial-gradient(ellipse 45% 40% at 65% 15%,rgba(196,181,253,.18) 0%,transparent 50%),
            radial-gradient(ellipse 50% 45% at 30% 90%,rgba(124,58,237,.20) 0%,transparent 55%),
            linear-gradient(160deg,#1c1535 0%,#20183e 45%,#241c42 100%);
          height:100vh;width:100vw;
        }
        .mm-root ::-webkit-scrollbar{width:3px;}
        .mm-root ::-webkit-scrollbar-thumb{background:rgba(167,139,250,.22);border-radius:3px;}
        .mm-root button{cursor:pointer;border:none;background:none;font-family:inherit;color:inherit;}
.mm-shell{
  display:grid;
grid-template-columns: 40% 60%;
  grid-template-rows:50px 1fr;
  height:100vh;
}
          /* topbar */
        .mm-topbar{grid-column:1/-1;display:flex;align-items:center;border-bottom:1px solid var(--mm-border);background:rgba(28,21,53,0.78);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);z-index:100;position:relative;}
        .mm-t-brand{width:var(--mm-sw);flex-shrink:0;display:flex;align-items:center;gap:9px;padding:0 18px;height:100%;border-right:1px solid var(--mm-border);}
        .mm-brand-name{font-family:'DM Serif Display',serif;font-size:15.5px;letter-spacing:-0.3px;color:var(--mm-text);}
        .mm-brand-dot{width:5px;height:5px;border-radius:50%;background:var(--mm-accent2);display:inline-block;box-shadow:0 0 10px var(--mm-accent2);margin-left:1px;animation:mm-pulse 2.5s ease-in-out infinite;}
        @keyframes mm-pulse{0%,100%{opacity:1;}50%{opacity:.45;}}
        .mm-t-center{flex:1;display:flex;align-items:center;justify-content:center;padding:0 24px;}
        .mm-search-wrap{width:100%;max-width:500px;display:flex;align-items:center;gap:8px;background:var(--mm-glass);border:1px solid var(--mm-border2);border-radius:9px;padding:0 12px;height:31px;cursor:text;transition:border-color .2s,box-shadow .2s,background .2s;}
        .mm-search-wrap:hover{background:var(--mm-glass2);border-color:rgba(167,139,250,.4);}
        .mm-search-wrap:focus-within{border-color:var(--mm-accent2);box-shadow:0 0 0 3px rgba(124,58,237,.18);}
        .mm-si{flex:1;background:none;border:none;outline:none;font-family:'DM Sans',sans-serif;font-size:12px;color:var(--mm-text);}
        .mm-si::placeholder{color:var(--mm-text3);}
        .mm-skbd{font-family:'JetBrains Mono',monospace;font-size:10px;color:var(--mm-text3);background:rgba(255,255,255,.06);border:1px solid var(--mm-border);border-radius:4px;padding:1px 5px;}
        .mm-t-right{width:var(--mm-rw);flex-shrink:0;display:flex;align-items:center;gap:2px;padding:0 14px;border-left:1px solid var(--mm-border);height:100%;justify-content:flex-end;}
        .mm-ib{width:28px;height:28px;border-radius:7px;display:flex;align-items:center;justify-content:center;color:var(--mm-text2);transition:background .15s,color .15s;position:relative;}
        .mm-ib:hover{background:var(--mm-glass2);color:var(--mm-text);}
        .mm-nbadge{position:absolute;top:3px;right:3px;width:13px;height:13px;border-radius:50%;background:var(--mm-red);font-size:7.5px;font-weight:700;color:#fff;display:flex;align-items:center;justify-content:center;border:1.5px solid var(--mm-bg);}
        .mm-avatar{width:26px;height:26px;border-radius:50%;background:linear-gradient(135deg,#7c3aed,#a78bfa);display:flex;align-items:center;justify-content:center;font-size:9.5px;font-weight:700;color:#fff;margin-left:6px;cursor:pointer;box-shadow:0 0 12px rgba(124,58,237,.5);}
        /* palette */
        .mm-pal-overlay{display:none;position:fixed;inset:0;z-index:1000;background:rgba(14,10,30,0.75);backdrop-filter:blur(6px);align-items:flex-start;justify-content:center;padding-top:88px;}
        .mm-pal-overlay.mm-open{display:flex;}
        .mm-pal-box{width:540px;background:rgba(37,29,69,0.96);border:1px solid var(--mm-border2);border-radius:14px;overflow:hidden;box-shadow:0 32px 90px rgba(10,6,25,.8),0 0 0 1px rgba(167,139,250,.15);animation:mm-pdrop .17s ease;}
        @keyframes mm-pdrop{from{opacity:0;transform:translateY(-10px) scale(.98);}to{opacity:1;transform:none;}}
        .mm-pal-sr{display:flex;align-items:center;gap:10px;padding:0 16px;height:48px;border-bottom:1px solid var(--mm-border);}
        .mm-pal-in{flex:1;background:none;border:none;outline:none;font-family:'DM Sans',sans-serif;font-size:14px;color:var(--mm-text);}
        .mm-pal-res{max-height:320px;overflow-y:auto;padding:6px;}
        .mm-pal-sec{padding:6px 10px 3px;font-size:9.5px;font-weight:700;letter-spacing:.9px;text-transform:uppercase;color:var(--mm-text3);}
        .mm-pal-it{display:flex;align-items:center;gap:10px;padding:7px 10px;border-radius:7px;cursor:pointer;transition:background .1s;}
        .mm-pal-it:hover,.mm-pal-it.mm-hi{background:var(--mm-accent3);color:var(--mm-accent2);}
        .mm-pal-il{font-size:12.5px;color:var(--mm-text);}
        .mm-pal-id{font-size:10.5px;color:var(--mm-text3);margin-left:auto;}
        .mm-pal-ft{padding:8px 14px;border-top:1px solid var(--mm-border);display:flex;gap:16px;}
        .mm-pal-ht{display:flex;align-items:center;gap:4px;font-size:10px;color:var(--mm-text3);}
        .mm-kk{background:rgba(255,255,255,.06);border:1px solid var(--mm-border);border-radius:4px;padding:1px 5px;font-family:'JetBrains Mono',monospace;font-size:9.5px;}
        /* notif */
        .mm-np{display:none;position:fixed;z-index:200;width:286px;background:rgba(37,29,69,0.97);border:1px solid var(--mm-border2);border-radius:11px;box-shadow:0 20px 60px rgba(10,6,25,.7);overflow:hidden;}
        .mm-np.mm-open{display:block;}
        .mm-np-hd{padding:10px 14px;border-bottom:1px solid var(--mm-border);font-size:11.5px;font-weight:600;display:flex;justify-content:space-between;}
        .mm-np-mk{font-size:10.5px;color:var(--mm-accent2);cursor:pointer;font-weight:400;}
        .mm-np-it{padding:9px 14px;border-bottom:1px solid var(--mm-border);display:flex;gap:9px;cursor:pointer;transition:background .1s;}
        .mm-np-it:hover{background:var(--mm-glass);}
        .mm-np-dot{width:6px;height:6px;border-radius:50%;background:var(--mm-accent2);margin-top:4px;flex-shrink:0;}
        .mm-np-fr{font-size:11px;font-weight:600;margin-bottom:1px;}
        .mm-np-sb{font-size:10.5px;color:var(--mm-text3);}
        /* sidebar */
        .mm-sidebar{background:rgba(28,21,53,0.70);backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);border-right:1px solid var(--mm-border);display:flex;flex-direction:column;overflow-y:auto;padding:10px 0;}
        .mm-compose-btn{margin:0 10px 12px;display:flex;align-items:center;gap:8px;background:linear-gradient(135deg,#7c3aed 0%,#6d28d9 100%);color:#fff;border-radius:9px;padding:0 14px;height:32px;font-size:12px;font-weight:500;transition:all .18s;box-shadow:0 3px 18px rgba(124,58,237,.45);}
        .mm-compose-btn:hover{background:linear-gradient(135deg,#8b47ff,#7c3aed);box-shadow:0 5px 24px rgba(124,58,237,.6);transform:translateY(-1px);}
        .mm-ns{padding:10px 18px 3px;font-size:9px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:var(--mm-text3);}
        .mm-ni{display:flex;align-items:center;gap:8px;padding:5px 10px 5px 13px;margin:1px 6px;border-radius:7px;cursor:pointer;transition:background .12s,color .12s;color:var(--mm-text2);font-size:11.5px;}
        .mm-ni svg{width:13px;height:13px;flex-shrink:0;}
        .mm-ni:hover{background:var(--mm-glass2);color:var(--mm-text);}
        .mm-ni.mm-active{background:rgba(124,58,237,.25);color:var(--mm-accent2);border:1px solid rgba(167,139,250,.2);}
        .mm-nb{margin-left:auto;font-size:9.5px;font-weight:600;background:rgba(255,255,255,.07);color:var(--mm-text3);border-radius:10px;padding:1px 6px;}
        .mm-nb.mm-new{background:rgba(124,58,237,.3);color:var(--mm-accent2);}
        .mm-nd{height:1px;background:var(--mm-border);margin:7px 13px;}
        .mm-ai{display:flex;align-items:center;gap:7px;padding:4px 8px 4px 13px;border-radius:6px;cursor:pointer;transition:background .12s;font-size:11px;color:var(--mm-text2);margin:1px 6px;}
        .mm-ai:hover{background:var(--mm-glass2);color:var(--mm-text);}
        .mm-ai svg{width:12px;height:12px;flex-shrink:0;color:var(--mm-text3);transition:color .12s;}
        .mm-ai:hover svg{color:var(--mm-accent2);}
        .mm-aidot{width:5px;height:5px;border-radius:50%;margin-left:auto;flex-shrink:0;}
        .mm-sbftr{margin-top:auto;padding:10px 13px 4px;border-top:1px solid var(--mm-border);}
        .mm-stbar{height:2.5px;background:rgba(167,139,250,.1);border-radius:2px;overflow:hidden;margin:5px 0 3px;}
        .mm-stfill{width:38%;height:100%;background:linear-gradient(90deg,#7c3aed,#a78bfa);}
        .mm-stlbl{font-size:9.5px;color:var(--mm-text3);}
        /* middle */
        .mm-mid::after{content:'';position:absolute;inset:0;background:repeating-linear-gradient(-45deg,transparent,transparent 28px,rgba(167,139,250,.025) 28px,rgba(167,139,250,.025) 29px);pointer-events:none;}
        /* right */
        .mm-right{background:rgba(28,21,53,0.68);width:100%;backdrop-filter:blur(22px);-webkit-backdrop-filter:blur(22px);overflow-y:auto;display:flex;flex-direction:column;}
        .mm-ps{padding:13px 15px;border-bottom:1px solid var(--mm-border);}
        .mm-ps:last-child{border-bottom:none;flex:1;padding-bottom:22px;}
        .mm-ph2{display:flex;align-items:center;justify-content:space-between;margin-bottom:9px;}
        .mm-pt{font-size:9.5px;font-weight:700;letter-spacing:.8px;text-transform:uppercase;color:var(--mm-text3);}
        .mm-pl{font-size:10.5px;color:var(--mm-accent2);cursor:pointer;}
        .mm-pl:hover{text-decoration:underline;}
        .mm-sg{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:12px;}
        .mm-sc{background:var(--mm-glass);border:1px solid var(--mm-border2);border-radius:9px;padding:9px 11px;display:flex;flex-direction:column;gap:3px;}
        .mm-sc-l{font-size:9.5px;color:var(--mm-text3);font-weight:500;}
        .mm-sc-v{font-family:'DM Serif Display',serif;font-size:22px;line-height:1;color:var(--mm-text);}
        .mm-sc-d{font-size:9.5px;font-weight:500;}
        .mm-du{color:var(--mm-green);}.mm-dd{color:var(--mm-red);}.mm-dw{color:var(--mm-amber);}
        .mm-cw{height:100px;position:relative;}
        svg.mm-ch{width:100%;height:100px;overflow:visible;}
        .mm-cl{fill:none;stroke:var(--mm-accent2);stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round;stroke-dasharray:620;animation:mm-cdraw 1.8s cubic-bezier(.23,1,.32,1) .3s both;}
        @keyframes mm-cdraw{from{stroke-dashoffset:620;}to{stroke-dashoffset:0;}}
        .mm-cd{fill:var(--mm-accent2);stroke:var(--mm-bg);stroke-width:2;animation:mm-cpop .3s ease both;}
        @keyframes mm-cpop{from{opacity:0;transform:scale(0);}to{opacity:1;transform:scale(1);}}
        .mm-clbl{font-family:'DM Sans',sans-serif;font-size:8.5px;fill:var(--mm-text3);}
        .mm-brow{display:flex;align-items:center;gap:11px;margin-top:10px;}
        .mm-bringw{position:relative;flex-shrink:0;}
        .mm-bring{transform:rotate(-90deg);}
        .mm-rbg{fill:none;stroke:rgba(167,139,250,.1);stroke-width:5;}
        .mm-rfg{fill:none;stroke-width:5;stroke-linecap:round;}
        .mm-rlbl{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
        .mm-rv{font-family:'DM Serif Display',serif;font-size:15px;line-height:1;color:var(--mm-text);}
        .mm-rs{font-size:8.5px;color:var(--mm-text3);}
        .mm-bm{flex:1;}
        .mm-blv{font-size:11.5px;font-weight:600;margin-bottom:2px;}
        .mm-bds{font-size:10px;color:var(--mm-text3);line-height:1.5;}
        .mm-bars{display:flex;flex-direction:column;gap:5px;margin-top:10px;}
        .mm-br{display:flex;align-items:center;gap:7px;}
        .mm-brl{font-size:10px;color:var(--mm-text2);width:72px;flex-shrink:0;}
        .mm-brt{flex:1;height:3.5px;background:rgba(167,139,250,.1);border-radius:2px;overflow:hidden;}
        .mm-brf{height:100%;border-radius:2px;transition:width 1.3s cubic-bezier(.23,1,.32,1);}
        .mm-brn{font-size:9.5px;font-family:'JetBrains Mono',monospace;color:var(--mm-text3);width:22px;text-align:right;flex-shrink:0;}
        .mm-prodr{display:flex;align-items:flex-end;justify-content:space-between;margin-top:10px;}
        .mm-prodp{font-family:'DM Serif Display',serif;font-size:27px;line-height:1;color:var(--mm-text);}
        .mm-trend{font-size:10px;padding:2px 7px;border-radius:4px;font-weight:600;}
        .mm-tu{background:rgba(52,211,153,.12);color:var(--mm-green);}
        .mm-rec{display:flex;align-items:flex-start;gap:8px;padding:7px 0;border-bottom:1px solid var(--mm-border);}
        .mm-rec:last-child{border-bottom:none;}
        .mm-ri{width:20px;height:20px;border-radius:5px;background:var(--mm-glass2);flex-shrink:0;display:flex;align-items:center;justify-content:center;color:var(--mm-accent2);}
        .mm-rt{font-size:10.5px;color:var(--mm-text2);line-height:1.5;}
        .mm-tadd{display:flex;align-items:center;gap:7px;padding:6px 9px;border-radius:7px;border:1px dashed rgba(167,139,250,.2);cursor:text;color:var(--mm-text3);font-size:11px;margin-bottom:7px;transition:border-color .15s;}
        .mm-tadd:hover{border-color:var(--mm-accent2);color:var(--mm-text2);}
        .mm-tscroll{max-height:230px;overflow-y:auto;}
        .mm-ti{display:flex;align-items:flex-start;gap:7px;padding:6px 5px;border-radius:6px;cursor:pointer;transition:background .1s;}
        .mm-ti:hover{background:var(--mm-glass);}
        .mm-tpri{width:5px;height:5px;border-radius:50%;flex-shrink:0;margin-top:5px;}
        .mm-ph-c{background:var(--mm-red);}.mm-pm-c{background:var(--mm-amber);}.mm-pl2-c{background:var(--mm-green);}
        .mm-tchk{width:13px;height:13px;border-radius:3.5px;border:1.5px solid rgba(167,139,250,.25);flex-shrink:0;margin-top:1px;display:flex;align-items:center;justify-content:center;transition:all .15s;}
        .mm-ti.mm-done .mm-tchk{background:var(--mm-green);border-color:var(--mm-green);}
        .mm-ti.mm-done .mm-ttxt{text-decoration:line-through;color:var(--mm-text3);}
        .mm-ttxt{font-size:11px;color:var(--mm-text);line-height:1.4;flex:1;}
        .mm-tmeta{font-size:9.5px;color:var(--mm-text3);margin-top:1px;}
        .mm-aich{font-size:8.5px;font-family:'JetBrains Mono',monospace;color:var(--mm-accent2);background:var(--mm-accent3);border:1px solid rgba(167,139,250,.2);border-radius:3px;padding:0 4px;flex-shrink:0;margin-top:2px;line-height:14px;}
        .mm-chip{display:inline-flex;align-items:center;gap:3px;font-size:9.5px;font-family:'JetBrains Mono',monospace;padding:1px 6px;border-radius:4px;background:var(--mm-glass);color:var(--mm-text3);border:1px solid var(--mm-border);}
        [data-mmtip]{position:relative;}
        [data-mmtip]:hover::after{content:attr(data-mmtip);position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);background:rgba(37,29,69,.97);border:1px solid var(--mm-border2);color:var(--mm-text2);font-size:10px;white-space:nowrap;padding:3px 8px;border-radius:5px;pointer-events:none;z-index:200;}
        /* mid welcome */
      `}</style>

            <div className="mm-root">
                {/* COMMAND PALETTE */}
                <div className="mm-pal-overlay" id="mm-pal">
                    <div className="mm-pal-box">
                        <div className="mm-pal-sr">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mm-text3)" }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                            <input className="mm-pal-in" id="mm-palIn" placeholder="Search features, emails, AI actions…" />
                        </div>
                        <div className="mm-pal-res" id="mm-palRes"></div>
                        <div className="mm-pal-ft">
                            <span className="mm-pal-ht"><span className="mm-kk">↑↓</span> navigate</span>
                            <span className="mm-pal-ht"><span className="mm-kk">↵</span> select</span>
                            <span className="mm-pal-ht"><span className="mm-kk">Esc</span> close</span>
                        </div>
                    </div>
                </div>

                {/* NOTIFICATION PANEL */}
                <div className="mm-np" id="mm-np">
                    <div className="mm-np-hd">Notifications <span className="mm-np-mk" id="mm-clearN">Mark all seen</span></div>
                    <div className="mm-np-it"><div className="mm-np-dot"></div><div><div className="mm-np-fr">Google</div><div className="mm-np-sb">Security alert — new sign-in detected</div></div></div>
                    <div className="mm-np-it"><div className="mm-np-dot"></div><div><div className="mm-np-fr">Zoom</div><div className="mm-np-sb">Generative AI Mastermind starts in 1 hour</div></div></div>
                    <div className="mm-np-it"><div className="mm-np-dot"></div><div><div className="mm-np-fr">Naukri Campus</div><div className="mm-np-sb">Quiz is open for registration!</div></div></div>
                </div>

                <div className="mm-shell">
                    {/* ── TOPBAR ── */}
                    <header className="mm-topbar">
                        <div className="mm-t-brand">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--mm-accent2)" strokeWidth="1.6"><rect x="2" y="4" width="20" height="16" rx="3" /><path d="m2 7 10 7 10-7" /></svg>
                            <span className="mm-brand-name">Scasi<span className="mm-brand-dot"></span></span>
                        </div>
                        <div className="mm-t-center">
                            <div className="mm-search-wrap" id="mm-searchWrap">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--mm-text3)" }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                                <input className="mm-si" placeholder="Search features, emails, AI actions…" readOnly />
                                <span className="mm-skbd">⌘K</span>
                            </div>
                        </div>
                        <div className="mm-t-right">
                            <button className="mm-ib" data-mmtip="Refresh"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg></button>
                            <button className="mm-ib" data-mmtip="Focus Mode"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg></button>
                            <button className="mm-ib" data-mmtip="Weekly Analysis"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg></button>
                            <button className="mm-ib" data-mmtip="Settings"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg></button>
                            <div style={{ width: 1, height: 20, background: "var(--mm-border)", margin: "0 4px" }}></div>
                            <button className="mm-ib" data-mmtip="Notifications" id="mm-nbtn" style={{ position: "relative" }}>
                                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
                                <span className="mm-nbadge" id="mm-nbadge">3</span>
                            </button>
                            <div className="mm-avatar" data-mmtip="Saloni K.">S</div>
                        </div>
                    </header>

                    {/* ── SIDEBAR ── */}
                    <aside className="mm-sidebar">
                        <button className="mm-compose-btn" onClick={() => onNavigate("compose")}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>
                            Compose
                        </button>

                        <span className="mm-ns">Mail</span>
                        <div className="mm-ni mm-active" onClick={() => onNavigate("inbox")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M22 12h-6l-2 3H10l-2-3H2" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 17.76 4H6.24a2 2 0 0 0-1.79 1.11z" /></svg>
                            Inbox <span className="mm-nb mm-new">134</span>
                        </div>
                        <div className="mm-ni" onClick={() => onNavigate("starred")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" /></svg>
                            Starred
                        </div>
                        <div className="mm-ni" onClick={() => onNavigate("snoozed")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                            Snoozed
                        </div>
                        <div className="mm-ni" onClick={() => onNavigate("done")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="20 6 9 17 4 12" /></svg>
                            Done
                        </div>
                        <div className="mm-ni" onClick={() => onNavigate("sent")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>
                            Sent
                        </div>
                        <div className="mm-ni" onClick={() => onNavigate("drafts")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>
                            Drafts <span className="mm-nb">11</span>
                        </div>
                        <div className="mm-ni" onClick={() => onNavigate("archive")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 17.76 4H6.24a2 2 0 0 0-1.79 1.11z" /></svg>
                            Archive
                        </div>
                        <div className="mm-ni" onClick={() => onNavigate("spam")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>
                            Spam
                        </div>
                        <div className="mm-ni" onClick={() => onNavigate("trash")}>
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /></svg>
                            Trash
                        </div>

                        <div className="mm-nd"></div>
                        <span className="mm-ns">Categories</span>
                        <div className="mm-ni" onClick={() => onNavigate("primary")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>Primary</div>
                        <div className="mm-ni" onClick={() => onNavigate("social")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>Social</div>
                        <div className="mm-ni" onClick={() => onNavigate("promotions")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /></svg>Promotions</div>
                        <div className="mm-ni" onClick={() => onNavigate("updates")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>Updates</div>

                        <div className="mm-nd"></div>
                        <span className="mm-ns">AI Features</span>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" /></svg>Priority Scoring <span className="mm-aidot" style={{ background: "#f87171" }}></span></div>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>Categorisation <span className="mm-aidot" style={{ background: "#a78bfa" }}></span></div>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg>Spam Shield <span className="mm-aidot" style={{ background: "#fbbf24" }}></span></div>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="3" y1="10" x2="21" y2="10" /></svg>Deadline Extract <span className="mm-aidot" style={{ background: "#34d399" }}></span></div>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>Handle For Me <span className="mm-aidot" style={{ background: "#7c3aed" }}></span></div>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg>Focus Mode <span className="mm-aidot" style={{ background: "#c084fc" }}></span></div>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" /></svg>Weekly Analysis <span className="mm-aidot" style={{ background: "#34d399" }}></span></div>

                        <div className="mm-nd"></div>
                        <span className="mm-ns">Labels</span>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>Work <span className="mm-aidot" style={{ background: "#7c3aed", marginLeft: "auto" }}></span></div>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>Finance <span className="mm-aidot" style={{ background: "#34d399", marginLeft: "auto" }}></span></div>
                        <div className="mm-ai"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>Personal <span className="mm-aidot" style={{ background: "#fbbf24", marginLeft: "auto" }}></span></div>

                        <div className="mm-sbftr">
                            <div className="mm-stlbl">5.8 GB of 15 GB used</div>
                            <div className="mm-stbar"><div className="mm-stfill"></div></div>
                            <div className="mm-stlbl" style={{ color: "var(--mm-text3)" }}>Manage storage</div>
                        </div>
                    </aside>


                    {/* ── RIGHT PANEL ── */}
                    <aside className="mm-right">
                        {/* BURNOUT DASHBOARD */}
                        <div className="mm-ps">
                            <div className="mm-ph2" style={{ marginBottom: 8 }}>
                                <span className="mm-pt">Last 7 Days</span>
                                <span className="mm-pl" onClick={() => onNavigate("inbox")}>Full report →</span>
                            </div>
                            <div className="mm-sg">
                                <div className="mm-sc"><div className="mm-sc-l">Received</div><div className="mm-sc-v">156</div><div className="mm-sc-d mm-du">↑ 12% vs prev</div></div>
                                <div className="mm-sc"><div className="mm-sc-l">Completed</div><div className="mm-sc-v">38</div><div className="mm-sc-d mm-du">↑ 8% vs prev</div></div>
                                <div className="mm-sc"><div className="mm-sc-l">Urgent</div><div className="mm-sc-v">24</div><div className="mm-sc-d mm-dd">↑ 6 vs avg</div></div>
                                <div className="mm-sc"><div className="mm-sc-l">Late Night</div><div className="mm-sc-v">7</div><div className="mm-sc-d mm-dw">⚠ After 10 pm</div></div>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                                <span className="mm-pt">Burnout Score — Weekly</span>
                                <span className="mm-chip">⚠ Medium Risk</span>
                            </div>
                            <div className="mm-cw">
                                <svg className="mm-ch" viewBox="0 0 310 96" preserveAspectRatio="none">
                                    <defs><linearGradient id="mm-ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#a78bfa" stopOpacity={0.3} /><stop offset="100%" stopColor="#a78bfa" stopOpacity={0} /></linearGradient></defs>
                                    <line x1="0" y1="18" x2="310" y2="18" stroke="rgba(167,139,250,.07)" strokeWidth="1" />
                                    <line x1="0" y1="48" x2="310" y2="48" stroke="rgba(167,139,250,.07)" strokeWidth="1" />
                                    <line x1="0" y1="78" x2="310" y2="78" stroke="rgba(167,139,250,.07)" strokeWidth="1" />
                                    <path d="M0,68 C46,64 68,54 104,48 C140,42 158,58 207,34 C231,22 276,40 310,34 L310,96 L0,96 Z" fill="url(#mm-ag)" />
                                    <path className="mm-cl" d="M0,68 C46,64 68,54 104,48 C140,42 158,58 207,34 C231,22 276,40 310,34" />
                                    <circle className="mm-cd" cx="0" cy="68" r="3" style={{ animationDelay: ".55s" }} />
                                    <circle className="mm-cd" cx="52" cy="60" r="3" style={{ animationDelay: ".70s" }} />
                                    <circle className="mm-cd" cx="104" cy="48" r="3" style={{ animationDelay: ".85s" }} />
                                    <circle className="mm-cd" cx="155" cy="52" r="3" style={{ animationDelay: "1.0s" }} />
                                    <circle className="mm-cd" cx="207" cy="34" r="4" style={{ animationDelay: "1.15s", fill: "#c084fc" }} />
                                    <circle className="mm-cd" cx="258" cy="42" r="3" style={{ animationDelay: "1.3s" }} />
                                    <circle className="mm-cd" cx="310" cy="34" r="3" style={{ animationDelay: "1.45s" }} />
                                    <text className="mm-clbl" x="0" y="94" textAnchor="middle">Mon</text>
                                    <text className="mm-clbl" x="52" y="94" textAnchor="middle">Tue</text>
                                    <text className="mm-clbl" x="104" y="94" textAnchor="middle">Wed</text>
                                    <text className="mm-clbl" x="155" y="94" textAnchor="middle">Thu</text>
                                    <text className="mm-clbl" x="207" y="94" textAnchor="middle" style={{ fill: "#c084fc", fontWeight: 600 }}>Fri</text>
                                    <text className="mm-clbl" x="258" y="94" textAnchor="middle">Sat</text>
                                    <text className="mm-clbl" x="310" y="94" textAnchor="middle">Sun</text>
                                </svg>
                            </div>
                            <div className="mm-brow">
                                <div className="mm-bringw">
                                    <svg width="60" height="60" className="mm-bring" viewBox="0 0 60 60">
                                        <circle className="mm-rbg" cx="30" cy="30" r="24" />
                                        <circle className="mm-rfg" cx="30" cy="30" r="24" stroke="#fbbf24" strokeDasharray="150.8" strokeDashoffset="67.9" id="mm-ring" />
                                    </svg>
                                    <div className="mm-rlbl"><span className="mm-rv">55</span><span className="mm-rs">/100</span></div>
                                </div>
                                <div className="mm-bm">
                                    <div className="mm-blv" style={{ color: "var(--mm-amber)" }}>Medium Risk</div>
                                    <div className="mm-bds">High urgent load + 7 late-night emails. Set inbox boundaries after 9 pm.</div>
                                </div>
                            </div>
                            <div className="mm-bars">
                                <div className="mm-br"><span className="mm-brl">Stress</span><div className="mm-brt"><div className="mm-brf" style={{ width: "62%", background: "linear-gradient(90deg,#fbbf24,#f87171)" }}></div></div><span className="mm-brn">62</span></div>
                                <div className="mm-br"><span className="mm-brl">Productivity</span><div className="mm-brt"><div className="mm-brf" style={{ width: "74%", background: "linear-gradient(90deg,#7c3aed,#34d399)" }}></div></div><span className="mm-brn">74</span></div>
                                <div className="mm-br"><span className="mm-brl">Late Night</span><div className="mm-brt"><div className="mm-brf" style={{ width: "47%", background: "linear-gradient(90deg,#a78bfa,#c084fc)" }}></div></div><span className="mm-brn">47</span></div>
                                <div className="mm-br"><span className="mm-brl">Completion</span><div className="mm-brt"><div className="mm-brf" style={{ width: "82%", background: "linear-gradient(90deg,#34d399,#6ee7b7)" }}></div></div><span className="mm-brn">82</span></div>
                            </div>
                            <div className="mm-prodr">
                                <div><div style={{ fontSize: "9.5px", color: "var(--mm-text3)", marginBottom: 2 }}>Productivity Rate</div><span className="mm-prodp">74%</span></div>
                                <div style={{ textAlign: "right" }}><div style={{ fontSize: "9.5px", color: "var(--mm-text3)", marginBottom: 4 }}>Trend</div><span className="mm-trend mm-tu">↑ Increasing</span></div>
                            </div>
                            <div style={{ marginTop: 12 }}>
                                <div className="mm-pt" style={{ marginBottom: 7 }}>AI Recommendations</div>
                                <div className="mm-rec"><div className="mm-ri"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg></div><div className="mm-rt">Set email boundaries after 9 PM — 7 late-night emails this week.</div></div>
                                <div className="mm-rec"><div className="mm-ri"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /></svg></div><div className="mm-rt">Delegate promotional emails using Archive rules.</div></div>
                                <div className="mm-rec"><div className="mm-ri"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></svg></div><div className="mm-rt">Focus Mode in mornings improves completion by ~22%.</div></div>
                            </div>
                        </div>

                        {/* TO-DO LIST */}
                        <div className="mm-ps">
                            <div className="mm-ph2">
                                <span className="mm-pt">To-Do</span>
                                <div style={{ display: "flex", gap: 6, alignItems: "center" }}><span className="mm-chip">AI</span><span className="mm-pl">+ Add</span></div>
                            </div>
                            <div className="mm-tadd"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>Add a task…</div>
                            <div className="mm-tscroll">
                                <div className="mm-ti"><div className="mm-tpri mm-ph-c"></div><div className="mm-tchk"></div><div style={{ flex: 1 }}><div className="mm-ttxt">Join GWY PRECONF 2026 session NOW</div><div className="mm-tmeta">Today · Do Now</div></div><span className="mm-aich">AI</span></div>
                                <div className="mm-ti"><div className="mm-tpri mm-ph-c"></div><div className="mm-tchk"></div><div style={{ flex: 1 }}><div className="mm-ttxt">Attend Generative AI Mastermind — 10 am</div><div className="mm-tmeta">Today · Zoom</div></div><span className="mm-aich">AI</span></div>
                                <div className="mm-ti"><div className="mm-tpri mm-pm-c"></div><div className="mm-tchk"></div><div style={{ flex: 1 }}><div className="mm-ttxt">Confirm PM counselling session</div><div className="mm-tmeta">Tomorrow · Reminder</div></div><span className="mm-aich">AI</span></div>
                                <div className="mm-ti"><div className="mm-tpri mm-pm-c"></div><div className="mm-tchk"></div><div style={{ flex: 1 }}><div className="mm-ttxt">Review security alert from Google</div><div className="mm-tmeta">Today · Important</div></div><span className="mm-aich">AI</span></div>
                                <div className="mm-ti"><div className="mm-tpri mm-pl2-c"></div><div className="mm-tchk"></div><div style={{ flex: 1 }}><div className="mm-ttxt">Register for Naukri Campus Quiz</div><div className="mm-tmeta">This week · Naukri</div></div><span className="mm-aich">AI</span></div>
                                <div className="mm-ti mm-done"><div className="mm-tpri mm-pl2-c"></div><div className="mm-tchk"><svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg></div><div style={{ flex: 1 }}><div className="mm-ttxt">Submit NLP Lab Assignment L19+L20</div><div className="mm-tmeta">Done · 27 Feb</div></div></div>
                                <div className="mm-ti mm-done"><div className="mm-tpri mm-pl2-c"></div><div className="mm-tchk"><svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5"><polyline points="20 6 9 17 4 12" /></svg></div><div style={{ flex: 1 }}><div className="mm-ttxt">Register for AI Mastermind event</div><div className="mm-tmeta">Done · 28 Feb</div></div></div>
                            </div>
                        </div>
                    </aside>
                </div>
            </div>
        </>
    );
}

export default MailMindDashboard;