"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface UserProfile {
  id: string;
  email: string | null;
  full_name?: string | null;
  is_admin: boolean;
  org_id?: string | null;
  org_role?: string | null;
  status?: string | null;
  persona?: string | null;
  signup_ip?: string | null;
  signup_location?: string | null;
  auth_provider?: string | null;
  company_name?: string | null;
  created_at: string;
}

export const ALL_ASSIGNABLE_TOOLS: { key: string; group: string; desc: string; recruiterOnly?: boolean }[] = [
  { key: "Recruiter Console", group: "Talent Acquisition", desc: "Pipeline overview & candidate stages" },
  { key: "Candidate Hub", group: "Talent Acquisition", desc: "Candidate applications, CVs & milestone tracker" },
  { key: "AI Pre-Screening Room", group: "Talent Acquisition", desc: "Voice & text STAR interview evaluations" },
  { key: "Team Chat", group: "Collaboration", desc: "Real-time internal team messaging" },
];

const RECRUITER_PRESET = [
  "Recruiter Console",
  "Candidate Hub",
  "AI Pre-Screening Room",
  "Team Chat",
];

const ORG_ADMIN_PRESET = [
  "Recruiter Console",
  "Candidate Hub",
  "AI Pre-Screening Room",
  "Team Chat",
];

export default function UserAccessModal({
  user,
  initialGrants,
  onClose,
}: {
  user: UserProfile;
  initialGrants: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set(initialGrants));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleTool(key: string) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function applyPreset(preset: string[]) {
    setSelectedTools(new Set(preset));
  }

  async function handleUpdate(action: "approve" | "save" | "suspend" | "reject") {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${user.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          tools: Array.from(selectedTools),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Failed to update user access.");
      }

      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to execute action.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden">
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-soft overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border flex items-center justify-between flex-shrink-0 bg-page/40">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[17px] font-bold text-ink font-display m-0">
                User Access & Tool Entitlements
              </h2>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${
                  user.status === "active" || user.status === "approved"
                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                    : user.status === "pending_approval"
                    ? "bg-amber-500/10 text-brand border border-amber-500/20"
                    : "bg-critical-wash text-critical border border-critical/30"
                }`}
              >
                {user.status || "active"}
              </span>
            </div>
            <p className="text-[12px] text-ink-muted m-0 mt-0.5">
              {user.full_name || "Applicant"} ({user.email})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg border border-border bg-surface text-ink-muted hover:text-ink flex items-center justify-center text-[14px] cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto scrollbar-none flex-1 space-y-5">
          {error && (
            <div className="bg-critical-wash text-critical text-[12px] rounded-lg px-3 py-2 border border-critical/30">
              {error}
            </div>
          )}

          {/* Applicant Telemetry Grid */}
          <div className="bg-page border border-border rounded-xl p-3.5 grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11.5px]">
            <div>
              <span className="text-ink-muted block text-[10.5px]">Persona</span>
              <span className="font-semibold text-ink capitalize flex items-center gap-1">
                {user.persona === "candidate" ? "👤 Candidate" : user.persona === "recruiter" ? "💼 Recruiter" : "🏢 Organization"}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[10.5px]">Company / Firm</span>
              <span className="font-medium text-ink truncate block">
                {user.company_name || "Independent"}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[10.5px]">IP Address</span>
              <span className="font-mono text-ink text-[11px] block truncate">
                {user.signup_ip || "127.0.0.1"}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[10.5px]">Location</span>
              <span className="font-medium text-ink block truncate" title={user.signup_location || "Local"}>
                📍 {user.signup_location || "Detected via IP"}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[10.5px]">Auth Provider</span>
              <span className="font-semibold text-ink capitalize flex items-center gap-1">
                {user.auth_provider === "google" ? "🟢 Google OAuth" : "✉️ Password (Email)"}
              </span>
            </div>
            <div>
              <span className="text-ink-muted block text-[10.5px]">Password Status</span>
              <span className="text-ink font-mono text-[11px]">
                {user.auth_provider === "google" ? "OAuth Secured" : "Bcrypt Encrypted"}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-ink-muted block text-[10.5px]">Registered Date</span>
              <span className="text-ink">
                {new Date(user.created_at).toLocaleString()}
              </span>
            </div>
          </div>

          {/* Presets Bar */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[12px] font-bold text-ink">Select Granted Tools:</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => applyPreset(RECRUITER_PRESET)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-amber-500/10 text-brand border border-amber-500/20 hover:bg-amber-500/20 transition-colors cursor-pointer"
              >
                💼 Recruiter Preset
              </button>
              <button
                type="button"
                onClick={() => applyPreset(ORG_ADMIN_PRESET)}
                className="text-[11px] font-semibold px-2.5 py-1 rounded bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 transition-colors cursor-pointer"
              >
                🏢 Org Preset
              </button>
              <button
                type="button"
                onClick={() => setSelectedTools(new Set())}
                className="text-[11px] font-medium px-2 py-1 rounded border border-border text-ink-muted hover:text-ink transition-colors cursor-pointer"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Interactive Tool Checklist Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {ALL_ASSIGNABLE_TOOLS.map((tool) => {
              const isChecked = selectedTools.has(tool.key);
              return (
                <label
                  key={tool.key}
                  className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all cursor-pointer select-none ${
                    isChecked
                      ? "bg-brand-wash/20 border-brand/40 shadow-soft-sm"
                      : "bg-surface border-border hover:bg-page"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleTool(tool.key)}
                    className="mt-0.5 accent-brand cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-ink truncate">
                        {tool.key}
                      </span>
                      {tool.recruiterOnly && (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-brand">
                          Recruiter Only
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-ink-muted m-0 line-clamp-1">
                      {tool.desc}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Owner Exclusive Hard-Locked Callout */}
          <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3 flex items-center justify-between text-[11.5px]">
            <div className="flex items-center gap-2">
              <span className="text-[16px]">👑</span>
              <div>
                <span className="font-bold text-ink">Gauri.ai Executive Copilot</span>
                <p className="text-[10.5px] text-ink-muted m-0">
                  Strictly reserved for Platform Owner (Shreesha). Non-delegable.
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 border border-purple-500/20">
              🔒 Owner Exclusive
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3.5 border-t border-border bg-page/40 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {user.status !== "suspended" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleUpdate("suspend")}
                className="text-[11.5px] font-semibold text-critical hover:bg-critical-wash px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Suspend User
              </button>
            )}
            {user.status === "pending_approval" && (
              <button
                type="button"
                disabled={loading}
                onClick={() => handleUpdate("reject")}
                className="text-[11.5px] font-semibold text-ink-muted hover:text-critical px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Reject
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-[12px] font-semibold px-3.5 py-2 rounded-lg border border-border bg-surface text-ink hover:bg-page transition-colors cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              disabled={loading}
              onClick={() => handleUpdate(user.status === "pending_approval" ? "approve" : "save")}
              className="text-[12px] font-bold px-4 py-2 rounded-lg bg-brand text-white hover:bg-brand-dark transition-colors cursor-pointer shadow-soft-sm disabled:opacity-60"
            >
              {loading
                ? "Saving…"
                : user.status === "pending_approval"
                ? `Approve & Grant (${selectedTools.size}) Tools`
                : `Save Tool Access (${selectedTools.size})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
