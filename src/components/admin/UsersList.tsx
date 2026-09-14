"use client";

import { useMemo, useState } from "react";
import UserAccessModal, { type UserProfile } from "./UserAccessModal";

export default function UsersList({
  profiles,
  orgNameById,
  grantsByUserId,
}: {
  profiles: UserProfile[];
  orgNameById: Map<string, string>;
  grantsByUserId: Map<string, string[]>;
}) {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [personaFilter, setPersonaFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return profiles.filter((p) => {
      const orgName = p.org_id ? orgNameById.get(p.org_id) || "" : "";
      const matchesSearch =
        !needle ||
        (p.email || "").toLowerCase().includes(needle) ||
        (p.full_name || "").toLowerCase().includes(needle) ||
        (p.company_name || "").toLowerCase().includes(needle) ||
        orgName.toLowerCase().includes(needle);

      if (!matchesSearch) return false;

      if (statusFilter !== "all") {
        if (statusFilter === "pending" && p.status !== "pending_approval") return false;
        if (statusFilter === "active" && p.status !== "active" && p.status !== "approved") return false;
        if (statusFilter === "suspended" && p.status !== "suspended") return false;
      }

      if (personaFilter !== "all") {
        if (personaFilter === "candidate" && p.persona !== "candidate") return false;
        if (personaFilter === "recruiter" && p.persona !== "recruiter") return false;
        if (personaFilter === "organization" && p.persona !== "organization") return false;
      }

      return true;
    });
  }, [profiles, orgNameById, q, statusFilter, personaFilter]);

  const pendingUsers = useMemo(
    () => profiles.filter((p) => p.status === "pending_approval"),
    [profiles]
  );

  return (
    <>
      {/* Dedicated Pending Approvals Section if any exist */}
      {pendingUsers.length > 0 && statusFilter !== "active" && (
        <div className="mb-8 border border-amber-500/30 bg-amber-500/5 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-[15px]">🔔</span>
              <h3 className="m-0 text-[14px] font-bold text-ink">
                Pending Approval Queue ({pendingUsers.length})
              </h3>
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
              Needs Owner Review
            </span>
          </div>
          <p className="text-[12px] text-ink-muted m-0 mb-3">
            These recruiters and organizations have registered and are waiting for your approval and tool assignments.
          </p>
          <div className="flex flex-col gap-2">
            {pendingUsers.map((p) => {
              const grants = grantsByUserId.get(p.id) || [];
              return (
                <div
                  key={p.id}
                  className="border border-brand/30 rounded-lg bg-surface px-4 py-3 flex items-center justify-between gap-3 flex-wrap shadow-soft-sm"
                >
                  <div className="flex items-center gap-3 min-w-[240px] flex-1">
                    <div className="w-9 h-9 rounded-full bg-brand/10 text-brand text-[12px] font-bold flex items-center justify-center flex-shrink-0 border border-brand/20">
                      {p.persona === "recruiter" ? "💼" : "🏢"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13.5px] font-bold text-ink truncate">
                          {p.full_name || p.email}
                        </span>
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-brand capitalize">
                          {p.persona}
                        </span>
                        {p.company_name && (
                          <span className="text-[11px] text-ink-muted truncate">
                            • {p.company_name}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-ink-muted flex items-center gap-2 mt-0.5">
                        <span>{p.email}</span>
                        <span>•</span>
                        <span>IP: {p.signup_ip || "127.0.0.1"}</span>
                        <span>•</span>
                        <span>📍 {p.signup_location || "Local"}</span>
                        <span>•</span>
                        <span className="capitalize">{p.auth_provider || "email"}</span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setSelectedUser(p)}
                    className="bg-brand text-white text-[12px] font-bold px-3.5 py-1.5 rounded-lg hover:bg-brand-dark transition-colors cursor-pointer shadow-soft-sm flex items-center gap-1.5"
                  >
                    <span>Review & Grant Tools</span>
                    <span>→</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name, email, company…"
          className="input flex-1 min-w-[200px] max-w-[320px] text-[13px]"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input max-w-[150px] text-[13px]"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending Review</option>
          <option value="active">Active / Approved</option>
          <option value="suspended">Suspended</option>
        </select>
        <select
          value={personaFilter}
          onChange={(e) => setPersonaFilter(e.target.value)}
          className="input max-w-[150px] text-[13px]"
        >
          <option value="all">All Personas</option>
          <option value="candidate">Candidates</option>
          <option value="recruiter">Recruiters</option>
          <option value="organization">Organizations</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="border border-dashed border-border rounded-md px-4 py-6 text-center text-[13px] text-ink-muted">
          No users match the search filters.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((profile) => {
            const userGrants = grantsByUserId.get(profile.id) || [];
            const isPending = profile.status === "pending_approval";
            const isSuspended = profile.status === "suspended";

            return (
              <div
                key={profile.id}
                className="border border-border rounded-lg bg-surface px-4 py-3 flex items-center justify-between gap-3 flex-wrap hover:border-border-strong transition-colors"
              >
                <div className="flex items-center gap-3 min-w-[260px] flex-1">
                  <div className="w-8 h-8 rounded-full bg-ink text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                    {(profile.email || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-ink truncate">
                        {profile.full_name || profile.email}
                      </span>
                      {profile.is_admin ? (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-brand-wash text-brand">
                          👑 Platform Owner
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-page text-ink-muted capitalize">
                          {profile.persona || "User"}
                        </span>
                      )}
                      <span
                        className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded-full capitalize ${
                          isPending
                            ? "bg-amber-500/10 text-brand border border-amber-500/20"
                            : isSuspended
                            ? "bg-critical-wash text-critical border border-critical/30"
                            : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                        }`}
                      >
                        {profile.status || "active"}
                      </span>
                    </div>

                    <div className="text-[11px] text-ink-muted flex items-center gap-2 mt-0.5 flex-wrap">
                      <span>{profile.email}</span>
                      {profile.company_name && (
                        <>
                          <span>•</span>
                          <span>{profile.company_name}</span>
                        </>
                      )}
                      <span>•</span>
                      <span>IP: {profile.signup_ip || "127.0.0.1"}</span>
                      <span>•</span>
                      <span>📍 {profile.signup_location || "Local"}</span>
                      <span>•</span>
                      <span className="capitalize">{profile.auth_provider || "email"}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {!profile.is_admin && (
                    <div className="text-[11.5px] text-ink-muted text-right">
                      <span className="font-semibold text-ink">{userGrants.length}</span> tools granted
                    </div>
                  )}

                  {!profile.is_admin && (
                    <button
                      onClick={() => setSelectedUser(profile)}
                      className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-colors cursor-pointer ${
                        isPending
                          ? "bg-brand text-white border-brand hover:bg-brand-dark"
                          : "bg-surface border-border hover:bg-page text-ink"
                      }`}
                    >
                      {isPending ? "Review & Approve" : "Access & Tools"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* User Access Modal */}
      {selectedUser && (
        <UserAccessModal
          user={selectedUser}
          initialGrants={grantsByUserId.get(selectedUser.id) || []}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </>
  );
}
