"use client";

import { useState, useEffect } from "react";

type PanelMember = { id: string; name: string; status?: string };
type PanelNote = { text: string; author: string; timestamp: number };
type PanelTask = {
  emailId: string;
  assignedTo: string;
  assignedBy: string;
  deadline: string | null;
  status: string;
  notes: PanelNote[];
  priority: number;
};

export default function EmailTeamPanel({ emailId, onAssigned }: { emailId: string, onAssigned?: () => void }) {
  const [members, setMembers] = useState<PanelMember[]>([]);
  const [tasks, setTasks] = useState<PanelTask[]>([]);
  const [activeTask, setActiveTask] = useState<PanelTask | null>(null);
  
  const [assignTo, setAssignTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [newNote, setNewNote] = useState("");

  const loadData = () => {
    try {
      const tm = localStorage.getItem("scasi_team_members");
      const te = localStorage.getItem("scasi_team_tasks");
      const parsedMembers = tm ? JSON.parse(tm) : [{ id: "me", name: "You" }];
      const parsedTasks = te ? JSON.parse(te) : [];

      setMembers(parsedMembers);
      setTasks(parsedTasks);

      const task = parsedTasks.find((t: PanelTask) => t.emailId === emailId);
      setActiveTask(task);
      if (!task) setAssignTo(parsedMembers[0]?.id ?? "");
    } catch (e) {
      console.error("Failed to load team panel data:", e);
      setMembers([{ id: "me", name: "You" }]);
      setTasks([]);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener("teamSync", handleSync);
    return () => window.removeEventListener("teamSync", handleSync);
  }, [emailId]);

  const saveTasks = (newTasks: any[]) => {
    localStorage.setItem("scasi_team_tasks", JSON.stringify(newTasks));
    window.dispatchEvent(new Event("teamSync"));
  };

  const handleAssign = () => {
    const task = {
      emailId,
      assignedTo: assignTo,
      assignedBy: "me",
      deadline: deadline || null,
      status: "assigned",
      notes: [],
      priority: 50
    };
    saveTasks([...tasks.filter(t => t.emailId !== emailId), task]);
    onAssigned?.();
  };

  const handleAddNote = () => {
    if (!newNote.trim() || !activeTask) return;
    const noteObj = { text: newNote, author: "You", timestamp: Date.now() };
    const updatedTask = { ...activeTask, notes: [...(activeTask.notes || []), noteObj] };
    const newTasks = tasks.map((t: PanelTask) => t.emailId === emailId ? updatedTask : t);
    setActiveTask(updatedTask);
    setTasks(newTasks);
    saveTasks(newTasks);
    setNewNote("");
  };

  return (
    <div style={{ marginTop: 24, borderTop: "2px solid #F3F0FF", paddingTop: 24 }}>
      <h3 style={{ fontSize: 14, fontWeight: 800, color: "#4C1D95", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
        <span>👥</span> Team Workspace
      </h3>
      
      {!activeTask ? (
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", background: "#FAF8FF", padding: 16, borderRadius: 16, border: "1px dashed rgba(167,139,250,0.4)" }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#7a72a8", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Assign Owner</label>
            <select value={assignTo} onChange={e => setAssignTo(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #E2D9F3", fontSize: 13, outline: "none", fontWeight: 600 }}>
               {members.map(m => <option key={m.id} value={m.id}>{m.name} {m.status==='pending' ? '(Invited)' : ''}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#7a72a8", display: "block", marginBottom: 6, textTransform: "uppercase" }}>Deadline (Opt)</label>
            <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #E2D9F3", fontSize: 13, outline: "none" }} />
          </div>
          <button onClick={handleAssign} style={{ padding: "10px 24px", height: 40, borderRadius: 10, background: "#7C3AED", color: "white", fontWeight: 800, border: "none", cursor: "pointer", boxShadow: "0 4px 10px rgba(124,58,237,0.2)" }}>
            Assign Email
          </button>
        </div>
      ) : (
        <div style={{ background: "#FAF8FF", borderRadius: 16, border: "1px solid #E2D9F3", overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E2D9F3", background: "white" }}>
             <div style={{ fontSize: 13, fontWeight: 600, color: "#18103A" }}>
               Owned by: <span style={{ color: "#7C3AED", fontWeight: 800 }}>{members.find(m => m.id === activeTask.assignedTo)?.name || "Unknown"}</span>
             </div>
             <div style={{ fontSize: 11, fontWeight: 800, color: "#D97706", background: "#FFFBEB", padding: "4px 10px", borderRadius: 6, border: "1px solid #FDE68A", textTransform: "uppercase" }}>
               {activeTask.status.replace("-", " ")}
             </div>
          </div>
          
          <div style={{ padding: 20 }}>
            {activeTask.notes && activeTask.notes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
                {activeTask.notes.map((n: any, i: number) => (
                  <div key={`${n.timestamp}-${i}`} style={{ display: "flex", gap: 12 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#E2D9F3", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, color: "#7C3AED", flexShrink: 0 }}>
                      {n.author.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#7a72a8", marginBottom: 2 }}>{n.author} • {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                      <div style={{ fontSize: 13, color: "#18103A", background: "white", padding: "10px 14px", borderRadius: "0 14px 14px 14px", border: "1px solid #E2D9F3", display: "inline-block" }}>
                         {n.text}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div style={{ display: "flex", gap: 10 }}>
              <input 
                value={newNote} 
                onChange={e => setNewNote(e.target.value)} 
                placeholder="Type @name to notify team members..." 
                style={{ flex: 1, padding: "12px 16px", borderRadius: 12, border: "1px solid #E2D9F3", fontSize: 13, outline: "none" }} 
                onKeyDown={e => { if (e.key === 'Enter') handleAddNote() }}
              />
              <button onClick={handleAddNote} style={{ padding: "0 20px", borderRadius: 12, background: "#18103A", color: "white", fontWeight: 700, border: "none", cursor: "pointer" }}>
                Send Note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
