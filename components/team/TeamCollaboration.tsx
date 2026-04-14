"use client";

import { useState, useEffect } from "react";

type TeamMember = {
  id: string;
  name: string;
  email: string;
  role: string;
  status: "active" | "pending";
  activeTasksCount: number;
  responseRate: number;
};

type AssignedEmail = {
  emailId: string;
  assignedTo: string;
  assignedBy: string;
  deadline?: string;
  status: "assigned" | "in-progress" | "waiting-on-client" | "completed";
  notes: { text: string; author: string; timestamp: number }[];
  priority: number;
};

type TeamProject = {
  id: string;
  name: string;
  members: string[]; // member IDs
  notes: { text: string; author: string; timestamp: number; isAi?: boolean }[];
};

type Props = {
  teamMembers?: TeamMember[];
  assignedEmails?: AssignedEmail[];
  onAssignEmail?: (assignment: AssignedEmail) => void;
  onUpdateStatus?: (emailId: string, status: string) => void;
  onAddNote?: (emailId: string, note: string) => void;
  onInviteMember?: (email: string) => void;
  onEmailClick?: (id: string) => void;
};

const DEFAULT_TEAM: TeamMember[] = [
  { id: "me", name: "You (Admin)", email: "admin@scasi.ai", role: "Admin", status: "active", activeTasksCount: 0, responseRate: 100 },
];

export default function TeamCollaboration({ teamMembers: externalTeamMembers, assignedEmails: externalAssignedEmails, onAssignEmail, onUpdateStatus, onAddNote, onInviteMember, onEmailClick }: Props) {
  const [activeTab, setActiveTab] = useState<"overview" | "projects" | "assignments">("overview");
  const [internalTeamMembers, setInternalTeamMembers] = useState<TeamMember[]>([]);
  const [internalAssignedEmails, setInternalAssignedEmails] = useState<AssignedEmail[]>([]);

  // Use external data when provided, otherwise fall back to internal localStorage data
  const teamMembers = externalTeamMembers ?? internalTeamMembers;
  const assignedEmails = externalAssignedEmails ?? internalAssignedEmails;
  const [teamProjects, setTeamProjects] = useState<TeamProject[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Workspace Create State
  const [newProjectName, setNewProjectName] = useState("");
  const [newProjectMembers, setNewProjectMembers] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<TeamProject | null>(null);
  const [projectNote, setProjectNote] = useState("");
  const [aiTyping, setAiTyping] = useState(false);
  const [quickInviteEmail, setQuickInviteEmail] = useState("");

  // Workspace Task Assignment State
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskAssignTo, setNewTaskAssignTo] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");

  const loadData = () => {
    try {
      const tm = localStorage.getItem("scasi_team_members");
      const te = localStorage.getItem("scasi_team_tasks");
      const tw = localStorage.getItem("scasi_team_workspaces");

      if (tm) setInternalTeamMembers(JSON.parse(tm));
      else {
        setInternalTeamMembers(DEFAULT_TEAM);
        localStorage.setItem("scasi_team_members", JSON.stringify(DEFAULT_TEAM));
      }
      if (te) setInternalAssignedEmails(JSON.parse(te));
      if (tw) {
        setTeamProjects(JSON.parse(tw));
      } else {
        const tg = localStorage.getItem("scasi_team_groups");
        if (tg) setTeamProjects(JSON.parse(tg));
      }
    } catch (e) {
      console.error("Failed to load team data from localStorage:", e);
      setInternalTeamMembers(DEFAULT_TEAM);
    }
  };

  useEffect(() => {
    // Only load from localStorage when no external data is provided
    if (!externalTeamMembers && !externalAssignedEmails) {
      loadData();
      const handleSync = () => loadData();
      window.addEventListener("teamSync", handleSync);
      setLoading(false);
      return () => window.removeEventListener("teamSync", handleSync);
    }
    setLoading(false);
  }, [externalTeamMembers, externalAssignedEmails]);

  const saveTasks = (newTasks: AssignedEmail[]) => {
    setInternalAssignedEmails(newTasks);
    localStorage.setItem("scasi_team_tasks", JSON.stringify(newTasks));
    window.dispatchEvent(new Event("teamSync"));
  };

  const saveMembers = (newMembers: TeamMember[]) => {
    setInternalTeamMembers(newMembers);
    localStorage.setItem("scasi_team_members", JSON.stringify(newMembers));
    window.dispatchEvent(new Event("teamSync"));
  };

  const saveProjects = (newProjects: TeamProject[]) => {
    setTeamProjects(newProjects);
    localStorage.setItem("scasi_team_workspaces", JSON.stringify(newProjects));
    window.dispatchEvent(new Event("teamSync"));
  };

  const executeInviteApi = async (email: string, name: string) => {
    try {
      const res = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });
      if (!res.ok) console.error("Invite API error:", res.status);
    } catch(e) {
      console.error('Failed to send team invite:', e);
    }
  };

  const handleQuickInvite = async (forceWorkspaceAdd: boolean = false) => {
    if (!quickInviteEmail) return;
    
    let existingId = teamMembers.find(m => m.email.toLowerCase() === quickInviteEmail.toLowerCase())?.id;
    let finalMembers = [...teamMembers];
    
    if (!existingId) {
      executeInviteApi(quickInviteEmail, quickInviteEmail.split('@')[0]);
      existingId = "usr_" + Date.now();
      const newMember: TeamMember = {
        id: existingId,
        name: quickInviteEmail.split('@')[0],
        email: quickInviteEmail,
        role: "Collaborator",
        status: "pending",
        activeTasksCount: 0,
        responseRate: 100
      };
      finalMembers.push(newMember);
      saveMembers(finalMembers);
    }
    
    if (forceWorkspaceAdd && selectedProject) {
      if (!selectedProject.members.includes(existingId)) {
        const updated = { ...selectedProject, members: [...selectedProject.members, existingId] };
        saveProjects(teamProjects.map(w => w.id === updated.id ? updated : w));
        setSelectedProject(updated);
      } else {
        alert("This person is already in this project!");
      }
    } else if (!forceWorkspaceAdd) {
       if (!newProjectMembers.includes(existingId)) {
         setNewProjectMembers([...newProjectMembers, existingId]);
       }
    }
    setQuickInviteEmail("");
    return existingId;
  };

  const handleCreateProject = async () => {
    if (!newProjectName) return alert("Please name your project.");
    
    let extraId = null;
    if (quickInviteEmail.trim()) {
      extraId = await handleQuickInvite(false);
    }

    const finalMembers = ["me", ...newProjectMembers];
    if (extraId && !finalMembers.includes(extraId)) finalMembers.push(extraId);
    
    const newProject: TeamProject = {
      id: "ws_" + Date.now(),
      name: newProjectName,
      members: finalMembers,
      notes: [{ text: `Welcome to the ${newProjectName} Project! You can type @ai to ask Scasi for insight.`, author: "System", timestamp: Date.now(), isAi: true }]
    };
    
    saveProjects([newProject, ...teamProjects]);
    setNewProjectName("");
    setNewProjectMembers([]);
    setQuickInviteEmail("");
    alert("Project Created! Switch to the 'Global Overview' tab to view its Dashboard.");
    setActiveTab("overview");
  };

  const handleSendProjectNote = () => {
    if (!projectNote.trim() || !selectedProject) return;
    
    const isAiTarget = projectNote.toLowerCase().includes("@ai");
    const updatedProject = { 
      ...selectedProject, 
      notes: [...selectedProject.notes, { text: projectNote, author: "You", timestamp: Date.now() }]
    };
    
    const updatedProjects = teamProjects.map(w => w.id === selectedProject.id ? updatedProject : w);
    saveProjects(updatedProjects);
    setSelectedProject(updatedProject);
    setProjectNote("");

    if (isAiTarget) {
      setAiTyping(true);
      setTimeout(() => {
        const aiResponse = { text: `AI: I've analyzed the recent updates for ${updatedProject.name}. Workload seems stable. Need me to generate any specific task reports?`, author: "Scasi AI", timestamp: Date.now(), isAi: true };
        const finalProject = { ...updatedProject, notes: [...updatedProject.notes, aiResponse] };
        setTeamProjects(prev => {
          const updated = prev.map(w => w.id === finalProject.id ? finalProject : w);
          localStorage.setItem("scasi_team_workspaces", JSON.stringify(updated));
          window.dispatchEvent(new Event("teamSync"));
          return updated;
        });
        setSelectedProject(finalProject);
        setAiTyping(false);
      }, 1500);
    }
  };

  const handleAssignProjectTask = () => {
    if (!newTaskDesc || !newTaskAssignTo) return;
    const task: AssignedEmail = {
      emailId: "task_" + Date.now() + "_" + Math.floor(Math.random()*1000),
      assignedTo: newTaskAssignTo,
      assignedBy: "me",
      status: "assigned",
      priority: 50,
      notes: [{ text: newTaskDesc, author: "You", timestamp: Date.now() }]
    };
    saveTasks([task, ...assignedEmails]);
    setShowTaskModal(false);
    setNewTaskDesc("");
  };

  const updateTaskStatus = (emailId: string, newStatus: AssignedEmail["status"]) => {
    const updated = assignedEmails.map(t => t.emailId === emailId ? { ...t, status: newStatus } : t);
    saveTasks(updated);
  };

  if (loading) return null;

  return (
    <div style={{ padding: "32px 40px", background: "#FAF8FF", minHeight: "100%", fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        .team-tab { transition: all 0.2s; position: relative; }
        .team-tab:hover { color: #7C3AED !important; }
        .team-tab.active::after { content: ''; position: absolute; bottom: -2px; left: 0; right: 0; height: 3px; background: #7C3AED; border-radius: 3px 3px 0 0; }
        .team-card { transition: all 0.2s cubic-bezier(0.2, 0.8, 0.2, 1); }
        .team-card:hover { transform: translateY(-3px); box-shadow: 0 12px 30px rgba(124,58,237,0.06); border-color: rgba(124,58,237,0.3); }
        .badge { padding: 4px 10px; border-radius: 8px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
        .badge-assigned { background: #EFF6FF; color: #2563EB; border: 1px solid #BFDBFE; }
        .badge-in-progress { background: #FFFBEB; color: #D97706; border: 1px solid #FDE68A; }
        .badge-waiting-on-client { background: #F5F3FF; color: #7C3AED; border: 1px solid #DDD6FE; }
        .badge-completed { background: #F0FDF4; color: #059669; border: 1px solid #BBF7D0; }
        
        .chat-scroll::-webkit-scrollbar { width: 6px; }
        .chat-scroll::-webkit-scrollbar-track { background: transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background: rgba(124,58,237,0.2); border-radius: 10px; }
        
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: "#18103A", letterSpacing: "-0.5px", marginBottom: 4 }}>
          👥 Team Collaboration
        </h2>
        <p style={{ color: "#7a72a8", fontSize: 14 }}>Create strictly isolated Projects and inspect specific burnout and workload dashboards per project.</p>
      </div>

      <div style={{ display: "flex", gap: 32, marginBottom: 32, borderBottom: "2px solid #E2D9F3" }}>
        {[
          { id: "overview", label: "📊 Global Overview" },
          { id: "projects", label: "🚀 Create Project" },
          { id: "assignments", label: "📋 Shared Inbox" },
        ].map(tab => (
          <button
            key={tab.id}
            className={`team-tab ${activeTab === tab.id ? "active" : ""}`}
            onClick={() => { setActiveTab(tab.id as any); setSelectedProject(null); }}
            style={{
              padding: "12px 16px", background: "transparent", border: "none",
              fontSize: 14, fontWeight: activeTab === tab.id ? 800 : 600,
              color: activeTab === tab.id ? "#7C3AED" : "#7a72a8", cursor: "pointer"
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 📊 TAB 1: GLOBAL OVERVIEW (Dashboards View) */}
      {activeTab === "overview" && (
        <div className="anim">
          {!selectedProject ? (
            /* PROJECTS LIST */
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#18103A", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>📂 Your Active Projects</h3>
              <p style={{ fontSize: 13, color: "#7a72a8", marginBottom: 24 }}>Click on a project below to securely access its encapsulated Burnout, Workload, and Chat dashboards.</p>
              {teamProjects.length === 0 ? ( <div style={{ padding: 40, borderRadius: 16, border: "2px dashed #BFDBFE", color: "#60A5FA", fontSize: 15, fontWeight: 600, textAlign: "center" }}>You have no open projects. Head to the 'Projects' tab to create one!</div> ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20 }}>
                  {teamProjects.map(w => (
                     <div key={w.id} className="team-card" onClick={() => setSelectedProject(w)} style={{ padding: 24, borderRadius: 20, background: "white", border: "1px solid #E2D9F3", cursor: "pointer", borderTop: "4px solid #7C3AED" }}>
                       <div style={{ fontSize: 20, fontWeight: 800, color: "#18103A", marginBottom: 12 }}>{w.name}</div>
                       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                         <div style={{ fontSize: 13, color: "#7a72a8", fontWeight: 600 }}>{w.members.length} Collaborators Tracked</div>
                         <div style={{ padding: "6px 14px", borderRadius: 12, background: "#F5F3FF", color: "#7C3AED", fontWeight: 800, fontSize: 12 }}>Open Dashboard →</div>
                       </div>
                     </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ════ ISOLATED PROJECT DASHBOARD VIEW ════ */
            <div className="anim">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button onClick={() => setSelectedProject(null)} style={{ background: "white", border: "1px solid #E2D9F3", color: "#18103A", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13, boxShadow: "0 4px 10px rgba(0,0,0,0.03)" }}>← Back to Overview</button>
                  <h3 style={{ fontSize: 24, fontWeight: 900, margin: 0, color: "#18103A" }}>{selectedProject.name} Dashboard</h3>
                </div>
                <div style={{ display: "flex", gap: 10 }}>
                  <input 
                    value={quickInviteEmail} onChange={e => setQuickInviteEmail(e.target.value)} 
                    placeholder="Invite via email..." 
                    style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #E2D9F3", fontSize: 13, outline: "none", width: 200 }} 
                  />
                  <button onClick={() => handleQuickInvite(true)} style={{ background: "#10B981", border: "none", color: "white", padding: "10px 20px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13, boxShadow: "0 4px 10px rgba(16,185,129,0.3)" }}>
                    + Invite
                  </button>
                </div>
              </div>

              {/* ISOLATED PROJECT METRICS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24, marginBottom: 24 }}>
                {(() => {
                  const projectTasks = assignedEmails.filter(t => selectedProject.members.includes(t.assignedTo) && t.status !== "completed");
                  const totalPending = projectTasks.length;
                  const avgResponseRate = teamMembers.filter(m => selectedProject.members.includes(m.id)).reduce((sum, m) => sum + m.responseRate, 0) / (selectedProject.members.length || 1);
                  return (
                    <>
                      <MetricCard title="Project Pending Tasks" value={totalPending} icon="🎯" gradient="linear-gradient(135deg, #FF9A9E 0%, #FECFEF 99%, #FECFEF 100%)" />
                      <MetricCard title="Project Member Load" value={selectedProject.members.length} icon="👨‍💻" gradient="linear-gradient(135deg, #A8EDEA 0%, #FED6E3 100%)" />
                      <MetricCard title="Project Responsiveness" value={`${avgResponseRate.toFixed(0)}%`} icon="🚀" gradient="linear-gradient(135deg, #84FAB0 0%, #8FD3F4 100%)" />
                    </>
                  );
                })()}
              </div>

              <div style={{ display: "flex", gap: 24 }}>
                
                {/* CHAT / NOTES SECTION (45%) */}
                <div style={{ flex: 1.2, background: "white", borderRadius: 24, border: "1px solid #E2D9F3", display: "flex", flexDirection: "column", overflow: "hidden", height: 600 }}>
                  <div style={{ padding: "18px 24px", background: "#FAF8FF", borderBottom: "1px solid #E2D9F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#18103A" }}>Live Project Hub & AI</h4>
                  </div>
                  
                  <div className="chat-scroll" style={{ flex: 1, padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16, background: "white" }}>
                    {selectedProject.notes.map((note, i) => {
                      const isMe = note.author === "You";
                      const isAi = note.isAi;
                      return (
                        <div key={`${note.timestamp}-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", opacity: 0, animation: "fadeIn 0.3s forwards" }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#A78BFA", marginBottom: 4, padding: "0 4px" }}>
                            {isAi ? "🤖 Scasi AI" : note.author} · {new Date(note.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                          <div style={{ 
                            padding: "12px 16px", borderRadius: isMe ? "16px 16px 0 16px" : "16px 16px 16px 0",
                            background: isMe ? "linear-gradient(135deg, #7C3AED, #4F46E5)" : isAi ? "linear-gradient(135deg, #4C1D95, #312E81)" : "#FAF8FF",
                            color: isMe || isAi ? "white" : "#18103A",
                            fontSize: 14, lineHeight: 1.5,
                            border: (!isMe && !isAi) ? "1px solid #E2D9F3" : "none",
                            boxShadow: isMe ? "0 4px 10px rgba(124,58,237,0.2)" : "none",
                            maxWidth: "85%"
                          }}>
                            {note.text}
                          </div>
                        </div>
                      );
                    })}
                    {aiTyping && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#A78BFA", marginBottom: 4, padding: "0 4px" }}>🤖 Scasi AI</div>
                        <div style={{ padding: "12px 16px", borderRadius: "16px 16px 16px 0", background: "white", fontSize: 14, color: "#18103A", border: "1px solid #E2D9F3" }}>
                          Thinking...
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ padding: 20, background: "white", borderTop: "1px solid #E2D9F3", display: "flex", gap: 12 }}>
                    <input 
                      value={projectNote} onChange={e => setProjectNote(e.target.value)} 
                      onKeyDown={e => e.key === "Enter" && handleSendProjectNote()}
                      placeholder="Type @ai to ask Scasi questions..." 
                      style={{ flex: 1, padding: "14px 16px", borderRadius: 12, border: "1px solid #E2D9F3", fontSize: 14, outline: "none", background: "#FAF8FF" }} 
                    />
                    <button onClick={handleSendProjectNote} style={{ padding: "0 24px", borderRadius: 12, background: "#18103A", color: "white", fontWeight: 800, border: "none", cursor: "pointer" }}>Send</button>
                  </div>
                </div>
                
                {/* PROJECT WORKLOAD / BURNOUT SECTION (55%) */}
                <div style={{ flex: 1.5, display: "flex", flexDirection: "column", gap: 24, height: 600, overflowY: "auto" }} className="chat-scroll">
                  
                  <div style={{ background: "white", padding: 32, borderRadius: 24, border: "1px solid #E2D9F3", boxShadow: "0 8px 30px rgba(24,16,58,0.03)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                      <h3 style={{ fontSize: 18, fontWeight: 800, color: "#18103A" }}>🔥 Internal Workload & Burnout</h3>
                      <button onClick={() => setShowTaskModal(true)} style={{ background: "#F5F3FF", border: "none", color: "#7C3AED", padding: "8px 16px", borderRadius: 10, cursor: "pointer", fontWeight: 800, fontSize: 13 }}>+ Assign Specific Task</button>
                    </div>

                    {showTaskModal && (
                       <div className="anim" style={{ background: "#FAF8FF", padding: 16, borderRadius: 16, border: "1px dashed #A78BFA", marginBottom: 20 }}>
                         <input value={newTaskDesc} onChange={e => setNewTaskDesc(e.target.value)} placeholder="Task description..." style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #E2D9F3", marginBottom: 12, fontSize: 13, outline: "none" }} />
                         <select value={newTaskAssignTo} onChange={e => setNewTaskAssignTo(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid #E2D9F3", marginBottom: 12, fontSize: 13, outline: "none", fontWeight: 600 }}>
                           <option value="">Select Assignee from this Project</option>
                           {selectedProject.members.map(mId => {
                             const m = teamMembers.find(t => t.id === mId);
                             return m ? <option key={m.id} value={m.id}>{m.name}</option> : null;
                           })}
                         </select>
                         <div style={{ display: "flex", gap: 10 }}>
                           <button onClick={handleAssignProjectTask} style={{ flex: 1, padding: "10px", background: "#7C3AED", color: "white", borderRadius: 10, border: "none", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>Assign</button>
                           <button onClick={() => setShowTaskModal(false)} style={{ flex: 1, padding: "10px", background: "white", color: "#18103A", borderRadius: 10, border: "1px solid #E2D9F3", fontWeight: 800, cursor: "pointer", fontSize: 13 }}>Cancel</button>
                         </div>
                       </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      {selectedProject.members.map(mId => {
                        const member = teamMembers.find(m => m.id === mId);
                        if (!member) return null;
                        
                        const count = assignedEmails.filter(t => t.assignedTo === member.id && t.status !== "completed").length;
                        return (
                          <div key={member.id} className="team-card" style={{ padding: 20, borderRadius: 16, border: `1px solid ${count > 5 ? "#FECACA" : "#E2D9F3"}`, background: count > 5 ? "#FEF2F2" : "#FAF8FF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                              <div style={{ width: 44, height: 44, borderRadius: 14, background: count > 5 ? "#EF4444" : "linear-gradient(135deg, #7C3AED, #A78BFA)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 18, fontWeight: 900 }}>
                                {member.name.charAt(0)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 800, fontSize: 14, color: count > 5 ? "#DC2626" : "#18103A", marginBottom: 2 }}>{member.name}</div>
                                <div style={{ fontSize: 12, color: count > 5 ? "#EF4444" : "#7a72a8", fontWeight: 700 }}>{count} Active Tasks</div>
                              </div>
                            </div>
                            <div style={{ width: 40, height: 40 }}>
                               <svg viewBox="0 0 36 36"><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={count > 5 ? "#FCA5A5" : "#E2D9F3"} strokeWidth="5" /><path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={count > 5 ? "#DC2626" : "#10B981"} strokeWidth="5" strokeDasharray={`${Math.min(100, count * 15)}, 100`} strokeLinecap="round" /></svg>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ background: "linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)", padding: 24, borderRadius: 24, border: "1px solid #DDD6FE" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#4C1D95", marginBottom: 12, display: "flex", gap: 8 }}><span style={{fontSize: 20}}>🤖</span> Smart Balancing (Project Context)</h3>
                    {(() => {
                      const overloaded = selectedProject.members.some(mId => assignedEmails.filter(t => t.assignedTo === mId && t.status !== "completed").length > 4);
                      return overloaded ? (
                        <div style={{ fontSize: 13, color: "#4C1D95", lineHeight: 1.6, fontWeight: 600 }}>
                          ⚠️ Warning: A collaborator inside this project has reached critical task mass. Consider typing `@ai` in the chat to automatically draft delegation notices, or intervene directly.
                        </div>
                      ) : (
                        <div style={{ fontSize: 13, color: "#4C1D95", lineHeight: 1.6, fontWeight: 600 }}>
                          ✅ Project timeline looks perfectly stable. No internal burnout vectors detected!
                        </div>
                      )
                    })()}
                  </div>
                  
                  {/* PROJECT ASSIGNMENTS LIST */}
                  <div style={{ background: "white", padding: 24, borderRadius: 24, border: "1px solid #E2D9F3" }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, color: "#18103A", marginBottom: 16 }}>Project Tracking Log</h3>
                    <div className="chat-scroll" style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 300, overflowY: "auto", paddingRight: 6 }}>
                      {assignedEmails.filter(t => selectedProject.members.includes(t.assignedTo)).length === 0 && (
                        <div style={{ fontSize: 13, color: "#A78BFA", textAlign: "center", padding: 20, fontWeight: 600 }}>No tasks tracked in this project.</div>
                      )}
                      {assignedEmails.filter(t => selectedProject.members.includes(t.assignedTo)).map(task => {
                        const m = teamMembers.find(mm => mm.id === task.assignedTo);
                        return (
                          <div key={task.emailId} style={{ padding: 16, borderRadius: 16, border: "1px solid #E2D9F3", background: "#FAF8FF" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                              <span className={`badge badge-${task.status}`} style={{ fontSize: 10 }}>{task.status.replace("-", " ")}</span>
                              <span style={{ fontSize: 10, fontWeight: 800, color: "#7a72a8" }}>Priority {task.priority}</span>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 800, color: "#18103A", marginBottom: 8 }}>{task.notes[0]?.text || "Task: " + task.emailId.substring(0,8)}</div>
                            <div style={{ fontSize: 11, color: "#7a72a8", display: "flex", gap: 8, alignItems: "center" }}>
                              <div style={{ width: 20, height: 20, borderRadius: 6, background: "#7C3AED", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 800 }}>{m?.name.charAt(0)}</div>
                              <span style={{ fontWeight: 700 }}>{m?.name}</span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 🚀 TAB 2: PROJECTS (Creation View) */}
      {activeTab === "projects" && (
        <div className="anim">
          <div style={{ width: "100%", maxWidth: 700, margin: "0 auto" }}>
            <div className="team-card" style={{ padding: 32, borderRadius: 24, background: "white", border: "1px solid #E2D9F3", boxShadow: "0 10px 40px rgba(124,58,237,0.05)" }}>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#18103A", marginBottom: 6 }}>Create New Project</h3>
              <p style={{ fontSize: 13, color: "#7a72a8", marginBottom: 24 }}>Make groups with specific collaborators to isolate their dashboards.</p>
              
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#4C1D95", textTransform: "uppercase", marginBottom: 8, display: "block" }}>Project Name</label>
                <input 
                  value={newProjectName} onChange={e => setNewProjectName(e.target.value)} 
                  placeholder="e.g., Q4 Marketing Expansion" 
                  style={{ width: "100%", padding: "14px 16px", borderRadius: 12, border: "2px solid #E2D9F3", fontSize: 15, outline: "none", fontWeight: 600, color: "#18103A" }} 
                />
              </div>
              
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#7C3AED", textTransform: "uppercase", marginBottom: 8, display: "block" }}>
                  ✉️ Invite Collaborators via Email
                </label>
                <div style={{ display: "flex", gap: 10 }}>
                  <input 
                    value={quickInviteEmail} onChange={e => setQuickInviteEmail(e.target.value)} 
                    onKeyDown={e => e.key === "Enter" && handleQuickInvite(false)}
                    placeholder="email@example.com" 
                    style={{ flex: 1, padding: "14px 16px", borderRadius: 12, border: "1px solid #E2D9F3", fontSize: 14, outline: "none", background: "#FAF8FF" }} 
                  />
                  <button onClick={() => handleQuickInvite(false)} style={{ padding: "0 24px", borderRadius: 12, background: "#18103A", color: "white", fontWeight: 800, border: "none", cursor: "pointer" }}>Add</button>
                </div>
              </div>

              {/* LIST PENDING COLLABORATORS */}
              <div style={{ marginBottom: 24 }}>
                <label style={{ fontSize: 12, fontWeight: 800, color: "#18103A", textTransform: "uppercase", marginBottom: 8, display: "block" }}>Select Existing Collaborators ({newProjectMembers.length} selected)</label>
                <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #E2D9F3", borderRadius: 12, padding: 8 }}>
                  {teamMembers.length === 1 && <div style={{ fontSize: 12, padding: 10, color: "#7a72a8", textAlign: "center" }}>You have no collaborators yet. Invite someone above!</div>}
                  {teamMembers.filter(m => m.id !== "me").map(m => (
                     <div 
                       key={m.id} 
                       onClick={() => {
                         if(newProjectMembers.includes(m.id)) setNewProjectMembers(newProjectMembers.filter(id => id !== m.id));
                         else setNewProjectMembers([...newProjectMembers, m.id]);
                       }}
                       style={{ padding: "10px 14px", borderRadius: 8, background: newProjectMembers.includes(m.id) ? "#F5F3FF" : "transparent", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", marginBottom: 4 }}
                     >
                       <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                         <div style={{ width: 32, height: 32, borderRadius: 8, background: "#7C3AED", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>{m.name.charAt(0)}</div>
                         <div>
                           <div style={{ fontSize: 13, fontWeight: 800, color: "#18103A", display: "flex", gap: 6, alignItems: "center" }}>{m.name}</div>
                           <div style={{ fontSize: 11, color: "#A78BFA" }}>{m.email}</div>
                         </div>
                       </div>
                       <div style={{ width: 20, height: 20, borderRadius: "50%", border: `2px solid ${newProjectMembers.includes(m.id) ? "#7C3AED" : "#E2D9F3"}`, background: newProjectMembers.includes(m.id) ? "#7C3AED" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                         {newProjectMembers.includes(m.id) && <span style={{ color: "white", fontSize: 12 }}>✓</span>}
                       </div>
                     </div>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={handleCreateProject}
                style={{ width: "100%", padding: "14px", borderRadius: 12, background: "linear-gradient(135deg, #7C3AED, #4F46E5)", color: "white", fontWeight: 800, fontSize: 15, border: "none", cursor: "pointer", boxShadow: "0 8px 20px rgba(124,58,237,0.3)" }}
              >
                🚀 Launch Project
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📋 TAB 3: SHARED INBOX */}
      {activeTab === "assignments" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }} className="anim">
          {assignedEmails.length === 0 && (
            <div style={{ textAlign: "center", padding: 60, color: "#7a72a8", fontSize: 15, fontWeight: 600 }}>
               No emails logically shared yet.
            </div>
          )}
          {assignedEmails.map(task => {
            const assignee = teamMembers.find(m => m.id === task.assignedTo);
            return (
              <div key={task.emailId} className="team-card" style={{ padding: 24, borderRadius: 20, background: "white", border: "1px solid #E2D9F3", display: "flex", gap: 24, alignItems: "flex-start" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 14 }}>
                    <select 
                      value={task.status} 
                      onChange={(e) => updateTaskStatus(task.emailId, e.target.value)}
                      className={`badge badge-${task.status}`}
                      style={{ outline: "none", cursor: "pointer", appearance: "none", paddingRight: 24 }}
                    >
                      <option value="assigned">ASSIGNED</option>
                      <option value="in-progress">IN PROGRESS</option>
                      <option value="waiting-on-client">WAITING ON CLIENT</option>
                      <option value="completed">COMPLETED</option>
                    </select>
                    {task.deadline && (
                      <span style={{ fontSize: 11, color: "#DC2626", fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: "#FEF2F2", border: "1px solid #FECACA" }}>
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: "#18103A", marginBottom: 6 }}>{task.emailId.startsWith("task_") ? "Manual Task" : `Email Tracker [${task.emailId.substring(0, 16)}]`}</div>
                  <div style={{ fontSize: 13, color: "#7a72a8", fontWeight: 600 }}>
                    Delegated to <span style={{ color: "#7C3AED", fontWeight: 800 }}>{assignee?.name || "Unknown Collaborator"}</span>
                  </div>
                  
                  {task.notes && task.notes.length > 0 && (
                    <div style={{ marginTop: 16, padding: 16, background: "#FAF8FF", borderRadius: 14, border: "1px dashed rgba(167,139,250,0.4)" }}>
                      <div style={{ fontSize: 11, fontWeight: 800, color: "#A78BFA", textTransform: "uppercase", marginBottom: 10 }}>Thread</div>
                      {task.notes.map((note, i) => (
                        <div key={`${note.timestamp}-${i}`} style={{ fontSize: 13, color: "#18103A", marginBottom: 6, fontWeight: 600 }}>
                          <strong style={{ color: "#7C3AED" }}>{note.author}:</strong> {note.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {!task.emailId.startsWith("task_") && (
                  <button onClick={() => onEmailClick?.(task.emailId)} style={{ padding: "12px 20px", borderRadius: 12, background: "#F5F3FF", color: "#7C3AED", fontWeight: 800, border: "none", cursor: "pointer", whiteSpace: "nowrap" }}>
                    View Original Source →
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

function MetricCard({ title, value, icon, gradient }: any) {
  return (
    <div className="team-card" style={{ padding: 24, borderRadius: 24, background: "white", border: "1px solid #E2D9F3", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, background: gradient, opacity: 0.15, borderRadius: "50%", filter: "blur(20px)" }} />
      <div style={{ fontSize: 32, marginBottom: 16 }}>{icon}</div>
      <div style={{ fontSize: 36, fontWeight: 900, color: "#18103A", marginBottom: 4, letterSpacing: "-1px" }}>{value}</div>
      <div style={{ fontSize: 13, color: "#7a72a8", fontWeight: 800, textTransform: "uppercase", letterSpacing: "1px" }}>{title}</div>
    </div>
  );
}
