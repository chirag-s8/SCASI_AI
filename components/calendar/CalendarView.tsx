"use client";
import { useState, useEffect, useRef } from "react";

type CalendarEvent = {
  id: string; title: string; date: Date; time?: string;
  type: "deadline"|"meeting"|"appointment"|"reminder"|"emergency"|"task";
  emailId?: string; description?: string; reminderMinutes?: number;
  priority?: "critical"|"high"|"normal"; aiDetected?: boolean; from?: string;
};
type Props = {
  events?: CalendarEvent[];
  onAddEvent?: (e: CalendarEvent) => Promise<void>;
  onDeleteEvent?: (id: string) => Promise<void>;
  onEventClick?: (e: CalendarEvent) => void;
};

const STORAGE_KEY = "scasi_cal_v3";
const EVENT_COLORS = [
  "linear-gradient(135deg,#3B82F6,#2563EB)",
  "linear-gradient(135deg,#EF4444,#DC2626)",
  "linear-gradient(135deg,#10B981,#059669)",
  "linear-gradient(135deg,#F59E0B,#D97706)",
  "linear-gradient(135deg,#8B5CF6,#7C3AED)",
  "linear-gradient(135deg,#EC4899,#DB2777)",
  "linear-gradient(135deg,#06B6D4,#0891B2)",
  "linear-gradient(135deg,#F97316,#EA580C)",
];

function saveToStorage(evts: CalendarEvent[]) {
  try {
    const today = new Date(); today.setHours(0,0,0,0);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(evts.filter(e => new Date(e.date) >= today)));
  } catch {}
}
function loadFromStorage(): CalendarEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const today = new Date(); today.setHours(0,0,0,0);
    return JSON.parse(raw).map((e: any) => ({...e, date: new Date(e.date)})).filter((e: CalendarEvent) => new Date(e.date) >= today);
  } catch { return []; }
}
function mergeEvts(existing: CalendarEvent[], incoming: CalendarEvent[]): CalendarEvent[] {
  const ids = new Set(existing.map(e => e.id));
  const titles = new Set(existing.map(e => e.title.toLowerCase().trim()));
  const merged = [...existing];
  for (const e of incoming) {
    if (!ids.has(e.id) && !titles.has(e.title.toLowerCase().trim())) {
      merged.push(e); ids.add(e.id); titles.add(e.title.toLowerCase().trim());
    }
  }
  return merged;
}

export default function CalendarView({ events: externalEvents, onAddEvent, onDeleteEvent, onEventClick }: Props) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [internalEvents, setInternalEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiStatus, setAiStatus] = useState<"idle"|"scanning"|"done">("idle");
  const scannedRef = useRef(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState(new Date().toISOString().split("T")[0]);
  const [newTime, setNewTime] = useState("");
  const [newType, setNewType] = useState("meeting");

  const events = externalEvents ?? internalEvents;

  useEffect(() => {
    if (externalEvents) { setLoading(false); return; }
    loadAndScan();
    const onSync = () => loadFromAPI();
    window.addEventListener("calendarSync", onSync);
    return () => window.removeEventListener("calendarSync", onSync);
  }, [externalEvents]);

  const loadFromAPI = async () => {
    try {
      const res = await fetch("/api/calendar/events");
      if (!res.ok) return;
      const data = await res.json();
      if (data.events?.length) {
        const apiEvts = data.events.map((e: any) => ({...e, date: new Date(e.date), type: e.type||"meeting"}));
        setInternalEvents(prev => { const m = mergeEvts(prev, apiEvts); saveToStorage(m); return m; });
      }
    } catch {}
  };

  const loadAndScan = async () => {
    setLoading(true);
    const stored = loadFromStorage();
    if (stored.length > 0) setInternalEvents(stored);
    await loadFromAPI();
    setLoading(false);
    if (scannedRef.current) return;
    scannedRef.current = true;
    autoScan();
  };

  const autoScan = async () => {
    setAiStatus("scanning");
    try {
      const gRes = await fetch("/api/gmail");
      const gData = await gRes.json();
      const emails: any[] = gData.emails || [];
      if (!emails.length) { setAiStatus("done"); return; }

      const today = new Date(); today.setHours(0,0,0,0);
      const newEvts: CalendarEvent[] = [];

      for (const email of emails) {
        const subject = email.subject || "";
        const snippet = email.snippet || "";
        const from = email.from || "";
        const text = (subject + " " + snippet).toLowerCase();

        let type: CalendarEvent["type"] = "reminder";
        if (/meeting|call|zoom|teams|sync|standup|interview|webinar|conference/i.test(text)) type = "meeting";
        else if (/deadline|due|submit|submission|deliver|complete by|finish by|send by|by \d/i.test(text)) type = "deadline";
        else if (/appointment|schedule|book|slot|session/i.test(text)) type = "appointment";
        else if (/task|todo|action|required|need to|please|can you|could you/i.test(text)) type = "task";
        else if (/urgent|emergency|asap|critical|immediately/i.test(text)) type = "emergency";
        else if (/reminder|follow.?up|check.?in|don.?t forget/i.test(text)) type = "reminder";
        else continue;

        let eventDate: Date | null = null;
        const now = new Date();
        if (/tomorrow/i.test(text)) { eventDate = new Date(now); eventDate.setDate(eventDate.getDate()+1); }
        else if (/\btoday\b/i.test(text)) { eventDate = new Date(now); }
        else if (/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(text)) {
          const m = text.match(/next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
          if (m) { const days=["sunday","monday","tuesday","wednesday","thursday","friday","saturday"]; const t=days.indexOf(m[1].toLowerCase()); const d=new Date(now); d.setDate(d.getDate()+((t-d.getDay()+7)%7||7)); eventDate=d; }
        }
        else if (/in\s+(\d+)\s+(day|week)/i.test(text)) {
          const m=text.match(/in\s+(\d+)\s+(day|week)/i); if(m){const n=parseInt(m[1]);const d=new Date(now);d.setDate(d.getDate()+(m[2].startsWith("week")?n*7:n));eventDate=d;}
        }
        else if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+\d{1,2}/i.test(text)) {
          const m=text.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})/i);
          if(m){const mo:Record<string,number>={jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};const d=new Date(now.getFullYear(),mo[m[1].toLowerCase().slice(0,3)],parseInt(m[2]));if(d>=today)eventDate=d;}
        }
        else if (/\d{4}-\d{2}-\d{2}/.test(text)) {
          const m=text.match(/(\d{4})-(\d{2})-(\d{2})/);if(m){const d=new Date(parseInt(m[1]),parseInt(m[2])-1,parseInt(m[3]));if(d>=today)eventDate=d;}
        }
        else if (/\b(noon|midnight|morning|evening|tonight)\b/i.test(text)) {
          eventDate=new Date(now); if(/tomorrow/i.test(text))eventDate.setDate(eventDate.getDate()+1);
        }
        else if (/end of (the )?(week|month)/i.test(text)) {
          const d=new Date(now);if(/month/i.test(text))d.setDate(new Date(d.getFullYear(),d.getMonth()+1,0).getDate());else{const diff=5-d.getDay();d.setDate(d.getDate()+(diff<0?diff+7:diff));}eventDate=d;
        }
        if (!eventDate) continue;

        let time: string|undefined;
        const tm=text.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);
        if(tm){let h=parseInt(tm[1]);const min=parseInt(tm[2]||"0");if(/pm/i.test(tm[3])&&h<12)h+=12;if(/am/i.test(tm[3])&&h===12)h=0;time=`${h.toString().padStart(2,"0")}:${min.toString().padStart(2,"0")}`;}
        else if(/noon/i.test(text))time="12:00";
        else if(/morning/i.test(text))time="09:00";
        else if(/evening/i.test(text))time="18:00";

        const title = subject.length > 5 ? subject : `${type} from ${from.split("<")[0].trim()||"inbox"}`;
        const isCritical=/urgent|emergency|asap|critical|immediately/i.test(title+" "+snippet);
        const isHigh=/deadline|due|submit|required|important/i.test(title+" "+snippet);

        newEvts.push({
          id:"ai_"+Date.now()+"_"+Math.random().toString(36).slice(2),
          title, date: eventDate, time, type,
          description: snippet.slice(0,120), emailId: email.id, from,
          aiDetected: true,
          priority: isCritical?"critical":isHigh?"high":"normal",
          reminderMinutes: type==="deadline"?60:15,
        });
      }

      if (newEvts.length) {
        setInternalEvents(prev => { const m=mergeEvts(prev,newEvts); saveToStorage(m); return m; });
        for (const ev of newEvts) {
          try {
            await fetch("/api/calendar/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:ev.title,date:ev.date instanceof Date?ev.date.toISOString():ev.date,time:ev.time,description:(ev.description||"")+" [Auto-extracted by Scasi AI]",reminderMinutes:ev.reminderMinutes,type:ev.type})});
          } catch {}
        }
      }
    } catch {}
    setAiStatus("done");
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle || !newDate) return;
    const ev: CalendarEvent = { id:"evt_"+Date.now(), title:newTitle, date:new Date(newDate), time:newTime||undefined, type:newType as any };
    if (onAddEvent) { await onAddEvent(ev); }
    else {
      setInternalEvents(prev => { const u=[...prev,ev]; saveToStorage(u); return u; });
      try {
        const res=await fetch("/api/calendar/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:ev.title,date:ev.date.toISOString(),time:ev.time,type:ev.type})});
        if(res.ok){const d=await res.json();setInternalEvents(prev=>{const u=prev.map(x=>x.id===ev.id?{...d.event,date:new Date(d.event.date)}:x);saveToStorage(u);return u;});}
      } catch {}
    }
    setShowAddModal(false); setNewTitle(""); setNewTime("");
  };

  const monthNames=["January","February","March","April","May","June","July","August","September","October","November","December"];
  const year=currentDate.getFullYear(), month=currentDate.getMonth();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();

  const getEventsForDate=(day:number)=>events.filter(ev=>{const d=new Date(ev.date);return d.getDate()===day&&d.getMonth()===month&&d.getFullYear()===year;});

  const upcomingEvents=events.filter(e=>new Date(e.date)>=new Date(new Date().setHours(0,0,0,0))).sort((a,b)=>{const pa=a.priority==="critical"?0:a.priority==="high"?1:2;const pb=b.priority==="critical"?0:b.priority==="high"?1:2;return pa!==pb?pa-pb:new Date(a.date).getTime()-new Date(b.date).getTime();});

  const icon=(type:string,priority?:string)=>{if(priority==="critical")return"🚨";if(type==="deadline")return"⏰";if(type==="meeting")return"📹";if(type==="appointment")return"📌";if(type==="task")return"✅";if(type==="emergency")return"🚨";return"🔔";};

  if (loading) return (
    <div style={{display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",height:"100vh",gap:16,background:"#0f0a1e"}}>
      <style>{`@keyframes spin{100%{transform:rotate(360deg)}}`}</style>
      <div style={{width:40,height:40,borderRadius:"50%",border:"3px solid rgba(167,139,250,0.2)",borderTopColor:"#a78bfa",animation:"spin 1s linear infinite"}}/>
      <div style={{fontSize:14,color:"#a78bfa",fontWeight:600}}>Loading calendar...</div>
    </div>
  );

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#0f0a1e 0%,#1a1035 50%,#0f0a1e 100%)",fontFamily:"'DM Sans',sans-serif",color:"#edeaff"}}>
      <style>{`
        @keyframes spin{100%{transform:rotate(360deg)}}
        @keyframes fadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
        .cv-day:hover{background:rgba(124,58,237,0.12)!important;border-color:rgba(167,139,250,0.4)!important;}
        .cv-day{transition:all 0.15s;}
        .cv-evt:hover{opacity:0.82;} .cv-evt{transition:opacity 0.1s;}
        .cv-card:hover{background:rgba(255,255,255,0.07)!important;} .cv-card{transition:background 0.15s;}
        .cv-btn:hover{opacity:0.85;transform:translateY(-1px);} .cv-btn{transition:all 0.15s;}
      `}</style>

      <div style={{display:"grid",gridTemplateColumns:"1fr 340px",gridTemplateRows:"auto 1fr",minHeight:"100vh"}}>

        {/* HEADER */}
        <div style={{gridColumn:"1/-1",padding:"20px 28px 16px",borderBottom:"1px solid rgba(167,139,250,0.1)",display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,255,255,0.02)"}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:3}}>
              <span style={{fontSize:24}}>📅</span>
              <h1 style={{fontSize:22,fontWeight:800,color:"#edeaff",margin:0}}>Intelligent Calendar</h1>
              {aiStatus==="scanning"&&<span style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#a78bfa",fontWeight:700,background:"rgba(124,58,237,0.2)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(167,139,250,0.3)"}}>
                <span style={{width:8,height:8,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.4)",borderTopColor:"#a78bfa",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>Scanning inbox...
              </span>}
              {aiStatus==="done"&&<span style={{fontSize:11,color:"#34d399",fontWeight:700,background:"rgba(52,211,153,0.1)",padding:"3px 10px",borderRadius:20,border:"1px solid rgba(52,211,153,0.2)"}}>✦ Synced</span>}
            </div>
            <p style={{color:"#7a72a8",fontSize:12,margin:0}}>Events auto-extracted from inbox · persisted until completed</p>
          </div>
          <button className="cv-btn" onClick={()=>setShowAddModal(true)} style={{padding:"10px 20px",borderRadius:10,border:"none",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",color:"white",fontWeight:700,cursor:"pointer",fontSize:13,boxShadow:"0 4px 16px rgba(124,58,237,0.4)"}}>+ Add Event</button>
        </div>

        {/* CALENDAR */}
        <div style={{padding:"20px 28px 28px",overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <button className="cv-btn" onClick={()=>setCurrentDate(new Date(year,month-1))} style={{width:34,height:34,borderRadius:8,border:"1px solid rgba(167,139,250,0.2)",background:"rgba(255,255,255,0.05)",cursor:"pointer",color:"#a78bfa",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>‹</button>
            <h2 style={{fontSize:20,fontWeight:800,color:"#edeaff",margin:0}}>{monthNames[month]} <span style={{color:"#a78bfa"}}>{year}</span></h2>
            <button className="cv-btn" onClick={()=>setCurrentDate(new Date(year,month+1))} style={{width:34,height:34,borderRadius:8,border:"1px solid rgba(167,139,250,0.2)",background:"rgba(255,255,255,0.05)",cursor:"pointer",color:"#a78bfa",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>›</button>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3,marginBottom:3}}>
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(
              <div key={d} style={{textAlign:"center",fontWeight:700,fontSize:10,color:"#7a72a8",padding:"5px 0",letterSpacing:"0.8px",textTransform:"uppercase"}}>{d}</div>
            ))}
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gridAutoRows:"120px",gap:3}}>
            {Array.from({length:firstDay}).map((_,i)=>(
              <div key={`e${i}`} style={{borderRadius:8,background:"rgba(255,255,255,0.01)",border:"1px solid rgba(167,139,250,0.04)"}}/>
            ))}
            {Array.from({length:daysInMonth}).map((_,i)=>{
              const day=i+1;
              const dayEvts=getEventsForDate(day);
              const isToday=new Date().getDate()===day&&new Date().getMonth()===month&&new Date().getFullYear()===year;
              const hasCrit=dayEvts.some(e=>e.priority==="critical");
              const isSel=selectedDate?.getDate()===day&&selectedDate?.getMonth()===month;
              return (
                <div key={day} className="cv-day" onClick={()=>setSelectedDate(new Date(year,month,day))}
                  style={{padding:"7px 6px 5px",borderRadius:8,cursor:"pointer",overflow:"hidden",display:"flex",flexDirection:"column",
                    border:isToday?"2px solid #7C3AED":hasCrit?"1.5px solid rgba(239,68,68,0.35)":isSel?"1.5px solid rgba(167,139,250,0.35)":"1px solid rgba(167,139,250,0.1)",
                    background:isToday?"rgba(124,58,237,0.14)":hasCrit?"rgba(239,68,68,0.05)":"rgba(255,255,255,0.03)"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5,flexShrink:0}}>
                    <span style={{fontWeight:800,fontSize:13,lineHeight:1,color:isToday?"white":"#edeaff",
                      ...(isToday?{background:"#7C3AED",borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11}:{})}}>
                      {day}
                    </span>
                    {dayEvts.length>0&&<span style={{fontSize:9,fontWeight:700,color:hasCrit?"#f87171":"#a78bfa",background:hasCrit?"rgba(239,68,68,0.15)":"rgba(167,139,250,0.15)",padding:"1px 4px",borderRadius:6}}>{dayEvts.length}</span>}
                  </div>
                  <div style={{display:"flex",flexDirection:"column",gap:2,overflow:"hidden",flex:1}}>
                    {dayEvts.slice(0,3).map((ev,ei)=>(
                      <div key={ev.id} className="cv-evt" onClick={e=>{e.stopPropagation();onEventClick?.(ev);}}
                        style={{fontSize:9,padding:"2px 5px",borderRadius:4,background:EVENT_COLORS[ei%EVENT_COLORS.length],color:"white",fontWeight:600,wordBreak:"break-word",whiteSpace:"normal",lineHeight:1.3,boxShadow:"0 1px 3px rgba(0,0,0,0.25)"}}>
                        {icon(ev.type,ev.priority)} {ev.title}{ev.aiDetected&&<span style={{marginLeft:2,fontSize:7,opacity:0.8}}>✦</span>}
                      </div>
                    ))}
                    {dayEvts.length>3&&<div style={{fontSize:9,color:"#a78bfa",fontWeight:700,paddingLeft:2}}>+{dayEvts.length-3} more</div>}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{display:"flex",gap:12,marginTop:14,flexWrap:"wrap"}}>
            {[{l:"Meeting",c:"#3B82F6"},{l:"Deadline",c:"#EF4444"},{l:"Task",c:"#F59E0B"},{l:"Appointment",c:"#8B5CF6"},{l:"Reminder",c:"#10B981"},{l:"✦ AI",c:"#a78bfa"}].map(({l,c})=>(
              <div key={l} style={{display:"flex",alignItems:"center",gap:4}}>
                <span style={{width:7,height:7,borderRadius:2,background:c,display:"inline-block"}}/>
                <span style={{fontSize:10,color:"#7a72a8",fontWeight:500}}>{l}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SIDEBAR */}
        <div style={{borderLeft:"1px solid rgba(167,139,250,0.1)",display:"flex",flexDirection:"column",overflowY:"auto",background:"rgba(255,255,255,0.02)"}}>
          <div style={{padding:"18px 18px 14px",borderBottom:"1px solid rgba(167,139,250,0.08)"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#7a72a8",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:6}}>Today</div>
            <div style={{fontSize:16,fontWeight:800,color:"#edeaff",marginBottom:10}}>{new Date().toLocaleDateString("en-US",{weekday:"long",month:"long",day:"numeric"})}</div>
            <div style={{display:"flex",gap:6}}>
              {[{l:"Upcoming",v:upcomingEvents.length,c:"#a78bfa"},{l:"Urgent",v:upcomingEvents.filter(e=>e.priority==="critical").length,c:"#f87171"},{l:"Today",v:events.filter(e=>{const d=new Date(e.date);const t=new Date();return d.getDate()===t.getDate()&&d.getMonth()===t.getMonth()&&d.getFullYear()===t.getFullYear();}).length,c:"#34d399"}].map(({l,v,c})=>(
                <div key={l} style={{flex:1,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(167,139,250,0.1)",borderRadius:8,padding:"7px 4px",textAlign:"center"}}>
                  <div style={{fontSize:18,fontWeight:800,color:c}}>{v}</div>
                  <div style={{fontSize:9,color:"#7a72a8",fontWeight:600,textTransform:"uppercase",letterSpacing:"0.4px"}}>{l}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{flex:1,padding:"14px 18px",overflowY:"auto"}}>
            <div style={{fontSize:10,fontWeight:700,color:"#7a72a8",textTransform:"uppercase",letterSpacing:"0.8px",marginBottom:10}}>Upcoming Events</div>
            {upcomingEvents.length===0?(
              <div style={{textAlign:"center",padding:"28px 0",color:"#7a72a8",fontSize:12}}>
                {aiStatus==="scanning"?<div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8}}><span style={{width:20,height:20,borderRadius:"50%",border:"2px solid rgba(167,139,250,0.3)",borderTopColor:"#a78bfa",display:"inline-block",animation:"spin 0.8s linear infinite"}}/>Scanning inbox...</div>:"No upcoming events"}
              </div>
            ):(
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                {upcomingEvents.map((ev,idx)=>(
                  <div key={ev.id+idx} className="cv-card" style={{padding:"10px 11px",borderRadius:10,background:"rgba(255,255,255,0.04)",border:ev.priority==="critical"?"1px solid rgba(239,68,68,0.25)":"1px solid rgba(167,139,250,0.1)",cursor:"pointer",animation:"fadeIn 0.3s ease both",animationDelay:`${idx*0.03}s`}}>
                    <div style={{display:"flex",gap:8,alignItems:"flex-start"}}>
                      <div style={{width:3,borderRadius:3,background:EVENT_COLORS[idx%EVENT_COLORS.length],alignSelf:"stretch",flexShrink:0}}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:3}}>
                          <span style={{fontSize:11}}>{icon(ev.type,ev.priority)}</span>
                          <span style={{fontWeight:700,fontSize:11,color:"#edeaff",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{ev.title}</span>
                        </div>
                        <div style={{fontSize:10,color:"#7a72a8",marginBottom:3}}>
                          {new Date(ev.date).toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"})}
                          {ev.time&&<span style={{color:"#a78bfa",fontWeight:600}}> · {ev.time}</span>}
                        </div>
                        {ev.description&&<div style={{fontSize:9,color:"#5a5280",lineHeight:1.4,marginBottom:4,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical" as any}}>{ev.description.replace("[Auto-extracted by Scasi AI]","").trim()}</div>}
                        <div style={{display:"flex",gap:3,flexWrap:"wrap"}}>
                          {ev.aiDetected&&<span style={{fontSize:8,background:"rgba(124,58,237,0.2)",color:"#a78bfa",padding:"1px 4px",borderRadius:3,fontWeight:700}}>✦ AI</span>}
                          {ev.priority==="critical"&&<span style={{fontSize:8,background:"rgba(239,68,68,0.15)",color:"#f87171",padding:"1px 4px",borderRadius:3,fontWeight:700}}>URGENT</span>}
                          {ev.priority==="high"&&<span style={{fontSize:8,background:"rgba(251,191,36,0.12)",color:"#fbbf24",padding:"1px 4px",borderRadius:3,fontWeight:700}}>HIGH</span>}
                          <span style={{fontSize:8,background:"rgba(255,255,255,0.06)",color:"#7a72a8",padding:"1px 4px",borderRadius:3,fontWeight:600,textTransform:"capitalize"}}>{ev.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{padding:"12px 18px",borderTop:"1px solid rgba(167,139,250,0.08)",background:"rgba(124,58,237,0.06)"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#a78bfa",marginBottom:2}}>✨ Smart Notifications</div>
            <div style={{fontSize:10,color:"#7a72a8",lineHeight:1.5}}>Browser alerts fire 30 min and 5 min before each timed event.</div>
          </div>
        </div>
      </div>

      {showAddModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(5,3,15,0.85)",backdropFilter:"blur(16px)",zIndex:10000,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <div style={{background:"#1a1035",padding:28,borderRadius:20,width:"100%",maxWidth:420,boxShadow:"0 32px 80px rgba(0,0,0,0.6)",border:"1px solid rgba(167,139,250,0.2)"}}>
            <h3 style={{fontSize:18,fontWeight:800,marginBottom:20,color:"#edeaff"}}>✨ New Event</h3>
            <form onSubmit={handleSave}>
              <div style={{marginBottom:14}}>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:"#7a72a8",marginBottom:5,textTransform:"uppercase",letterSpacing:"1px"}}>Title</label>
                <input value={newTitle} onChange={e=>setNewTitle(e.target.value)} required placeholder="e.g. Team Sync" style={{width:"100%",padding:"11px 13px",borderRadius:9,border:"1px solid rgba(167,139,250,0.2)",background:"rgba(255,255,255,0.05)",outline:"none",fontSize:13,color:"#edeaff",boxSizing:"border-box"}}/>
              </div>
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                <div style={{flex:1}}>
                  <label style={{display:"block",fontSize:10,fontWeight:700,color:"#7a72a8",marginBottom:5,textTransform:"uppercase"}}>Date</label>
                  <input type="date" value={newDate} onChange={e=>setNewDate(e.target.value)} required style={{width:"100%",padding:"11px 13px",borderRadius:9,border:"1px solid rgba(167,139,250,0.2)",background:"rgba(255,255,255,0.05)",outline:"none",fontSize:13,color:"#edeaff",boxSizing:"border-box"}}/>
                </div>
                <div style={{flex:1}}>
                  <label style={{display:"block",fontSize:10,fontWeight:700,color:"#7a72a8",marginBottom:5,textTransform:"uppercase"}}>Time</label>
                  <input type="time" value={newTime} onChange={e=>setNewTime(e.target.value)} style={{width:"100%",padding:"11px 13px",borderRadius:9,border:"1px solid rgba(167,139,250,0.2)",background:"rgba(255,255,255,0.05)",outline:"none",fontSize:13,color:"#edeaff",boxSizing:"border-box"}}/>
                </div>
              </div>
              <div style={{marginBottom:20}}>
                <label style={{display:"block",fontSize:10,fontWeight:700,color:"#7a72a8",marginBottom:5,textTransform:"uppercase"}}>Type</label>
                <select value={newType} onChange={e=>setNewType(e.target.value)} style={{width:"100%",padding:"11px 13px",borderRadius:9,border:"1px solid rgba(167,139,250,0.2)",background:"#1a1035",outline:"none",fontSize:13,color:"#edeaff"}}>
                  <option value="meeting">📹 Meeting</option>
                  <option value="deadline">⏰ Deadline</option>
                  <option value="task">✅ Task</option>
                  <option value="appointment">📌 Appointment</option>
                  <option value="reminder">🔔 Reminder</option>
                </select>
              </div>
              <div style={{display:"flex",gap:10}}>
                <button type="button" onClick={()=>setShowAddModal(false)} style={{flex:1,padding:"11px",background:"rgba(255,255,255,0.05)",color:"#7a72a8",borderRadius:9,fontWeight:700,border:"1px solid rgba(167,139,250,0.15)",cursor:"pointer"}}>Cancel</button>
                <button type="submit" style={{flex:1,padding:"11px",background:"linear-gradient(135deg,#7C3AED,#4F46E5)",color:"white",borderRadius:9,fontWeight:700,border:"none",cursor:"pointer",boxShadow:"0 4px 14px rgba(124,58,237,0.4)"}}>Save Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
