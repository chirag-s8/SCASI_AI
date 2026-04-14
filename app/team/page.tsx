"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import TeamCollaboration from "@/components/team/TeamCollaboration";

export default function TeamPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [assignedEmails, setAssignedEmails] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) {
      router.push("/");
      return;
    }
    loadTeamData();
  }, [session]);

  const loadTeamData = async () => {
    try {
      const res = await fetch("/api/team/assignments");
      const data = await res.json();
      setTeamMembers(data.members || []);
      setAssignedEmails(data.assignments || []);
    } catch (error) {
      console.error("Failed to load team data:", error);
    }
    setLoading(false);
  };

  const handleAssignEmail = async (assignment: {
    emailId: string;
    assignedTo: string;
    assignedBy: string;
    deadline?: string;
    status: "assigned" | "in-progress" | "waiting-on-client" | "completed";
    notes: { text: string; author: string; timestamp: number }[];
    priority: number;
  }) => {
    try {
      const res = await fetch("/api/team/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: assignment.emailId,
          assignedTo: assignment.assignedTo,
          deadline: assignment.deadline,
          notes: assignment.notes,
          priority: assignment.priority,
        }),
      });
      const data = await res.json();
      setAssignedEmails([...assignedEmails, data.assignment]);
      await loadTeamData(); // Refresh to update counts
    } catch (error) {
      console.error("Failed to assign email:", error);
    }
  };

  const handleUpdateStatus = async (emailId: string, status: string) => {
    try {
      const res = await fetch("/api/team/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, status }),
      });
      const data = await res.json();
      setAssignedEmails(
        assignedEmails.map(a => (a.emailId === emailId ? data.assignment : a))
      );
      await loadTeamData(); // Refresh to update counts
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleAddNote = async (emailId: string, note: string) => {
    try {
      const res = await fetch("/api/team/assignments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailId, note }),
      });
      const data = await res.json();
      setAssignedEmails(
        assignedEmails.map(a => (a.emailId === emailId ? data.assignment : a))
      );
    } catch (error) {
      console.error("Failed to add note:", error);
    }
  };

  const handleInviteMember = async (email: string) => {
    try {
      // Send real email via Gmail API
      const inviteRes = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const inviteData = await inviteRes.json();
      
      if (inviteData.error) {
        alert("Failed to send email: " + inviteData.error);
        return;
      }
      
      // Add member to internal list
      const res = await fetch("/api/team/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      
      setTeamMembers([...teamMembers, data.member]);
      alert("✅ Invitation securely sent to " + email);
    } catch (err) {
      console.error("Invite failed:", err);
      alert("Failed to send invitation.");
    }
  };

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <div style={{ fontSize: 18, color: "#6B7280" }}>Loading team data...</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F9FAFB", padding: 20 }}>
      {/* Header */}
      <div style={{ maxWidth: 1400, margin: "0 auto", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 32, fontWeight: 800, color: "#111827", marginBottom: 8 }}>
              👥 Team Collaboration
            </h1>
            <p style={{ fontSize: 14, color: "#6B7280" }}>
              Shared email intelligence workspace for your team
            </p>
          </div>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => router.push("/calendar")}
              style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #E5E7EB", background: "#F5F3FF", color: "#4C1D95", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
            >
              📅 Calendar
            </button>
            <button
              onClick={() => router.push("/team")}
              style={{ padding: "12px 16px", borderRadius: 12, border: "1px solid #E5E7EB", background: "#F5F3FF", color: "#4C1D95", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
            >
              👥 Team
            </button>
            <button
              onClick={() => router.push("/")}
              style={{ padding: "12px 24px", borderRadius: 12, border: "1px solid #E5E7EB", background: "white", cursor: "pointer", fontWeight: 700, fontSize: 14 }}
            >
              ← Inbox
            </button>
          </div>
        </div>
      </div>

      {/* Team Collaboration Component */}
      <div style={{ maxWidth: 1400, margin: "0 auto" }}>
        <TeamCollaboration
          teamMembers={teamMembers}
          assignedEmails={assignedEmails}
          onAssignEmail={handleAssignEmail}
          onUpdateStatus={handleUpdateStatus}
          onAddNote={handleAddNote}
          onInviteMember={handleInviteMember}
        />
      </div>
    </div>
  );
}
