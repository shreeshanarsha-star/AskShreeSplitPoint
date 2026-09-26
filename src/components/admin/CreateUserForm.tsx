"use client";

import { useEffect, useState } from "react";
import { DEPARTMENTS, PERSONAL_TOOLS } from "@/lib/departments";

const STANDARD_PASSWORD = "Welcome@1982#";

// Kept as plain string literals (not imported from lib/talentRoles) so this
// client component doesn't need to import server-oriented helpers -- the
// values must stay in sync with TALENT_ROLE_LABELS / RECRUITER_TEAM_ROLES /
// ORGANIZATION_TEAM_ROLES in src/lib/talentRoles.ts.
const RECRUITER_ACCESS_LEVELS: { value: string; label: string }[] = [
  { value: "recruiter", label: "Recruiter" },
  { value: "lead_recruiter", label: "Lead Recruiter" },
  { value: "ta_head", label: "TA Head" },
  { value: "hiring_manager", label: "Hiring Manager (HM)" },
  { value: "reporting_manager", label: "Reporting Manager" },
];
const ORGANIZATION_ACCESS_LEVELS: { value: string; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "hr_ops", label: "HR Ops" },
  { value: "hr_approver", label: "L1 Approver (HR Approver)" },
  { value: "l2_approver", label: "L2 Approver" },
  { value: "hr_head", label: "HR Head" },
  { value: "chro", label: "CHRO" },
  { value: "ceo", label: "CEO" },
  { value: "cfo", label: "CFO" },
  { value: "bu_head", label: "BU Head" },
];

// Same rule the org-admin invite panel and /admin/organizations grant
// checklist already use: bundled tools are free/automatic for any approved
// org member, so ticking them would be a no-op -- only non-bundled, live
// tools are offered here.
const GRANTABLE_TOOLS = [...DEPARTMENTS, PERSONAL_TOOLS]
  .flatMap((d) => d.tools.map((t) => ({ ...t, dept: d.name })))
  .filter((t) => t.s === "live" && !t.bundled);

interface OrgOption {
  id: string;
  name: string;
  status: string;
}

type Result = {
  ok: boolean;
  userId?: string;
  orgId?: string;
  orgName?: string;
  emailSent?: boolean;
  emailError?: string;
  waLink?: string | null;
  error?: string;
};

export default function CreateUserForm() {
  const [orgMode, setOrgMode] = useState<"new" | "existing">("new");
  const [userType, setUserType] = useState<"recruiter" | "organization">("organization");
  const [orgs, setOrgs] = useState<OrgOption[]>([]);
  const [orgsLoading, setOrgsLoading] = useState(false);

  const [companyName, setCompanyName] = useState("");
  const [existingOrgId, setExistingOrgId] = useState("");
  const [orgRole, setOrgRole] = useState<"member" | "org_admin">("member");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState(STANDARD_PASSWORD);
  const [contactNumber, setContactNumber] = useState("");
  const [accessLevel, setAccessLevel] = useState("recruiter");
  const [selectedTools, setSelectedTools] = useState<Set<string>>(new Set());

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const accessLevels = userType === "recruiter" ? RECRUITER_ACCESS_LEVELS : ORGANIZATION_ACCESS_LEVELS;

  useEffect(() => {
    // Keep accessLevel valid whenever userType flips.
    if (!accessLevels.some((l) => l.value === accessLevel)) {
      setAccessLevel(accessLevels[0].value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userType]);

  useEffect(() => {
    if (orgMode !== "existing" || orgs.length > 0 || orgsLoading) return;
    setOrgsLoading(true);
    fetch("/api/admin/organizations")
      .then((res) => res.json())
      .then((data) => {
        const list: OrgOption[] = (data.organizations || [])
          .filter((o: any) => o.status === "approved")
          .map((o: any) => ({ id: o.id, name: o.name, status: o.status }));
        setOrgs(list);
      })
      .catch(() => {})
      .finally(() => setOrgsLoading(false));
  }, [orgMode, orgs.length, orgsLoading]);

  function toggleTool(key: string) {
    setSelectedTools((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orgMode,
          companyName,
          existingOrgId,
          orgRole,
          fullName,
          email,
          password,
          contactNumber,
          accessLevel,
          toolKeys: Array.from(selectedTools),
        }),
      });
      const data: Result = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || "Could not create the account.");
      }
      setResult(data);
      // Reset the per-person fields but keep org selection so the owner can
      // add several people into the same (now-existing) org back to back.
      setFullName("");
      setEmail("");
      setPassword(STANDARD_PASSWORD);
      setContactNumber("");
      setSelectedTools(new Set());
      if (orgMode === "new" && data.orgId) {
        setOrgMode("existing");
        setOrgs((prev) => (prev.some((o) => o.id === data.orgId) ? prev : [...prev, { id: data.orgId!, name: data.orgName!, status: "approved" }]));
        setExistingOrgId(data.orgId);
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl">
      {result?.ok && (
        <div className="bg-good-wash border border-good/30 rounded-xl p-4 mb-5">
          <p className="m-0 font-bold text-[13.5px] text-ink">🎉 Account created for {result.orgName}.</p>
          <p className="m-0 mt-1 text-[12.5px] text-ink-muted">
            {result.emailSent
              ? "Welcome email sent."
              : `Email was not sent (${result.emailError || "unknown error"}) — you can still hand over the WhatsApp message or share the credentials directly.`}
          </p>
          {result.waLink && (
            <a
              href={result.waLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-3 text-[12.5px] font-bold px-3 py-1.5 rounded-lg bg-[#25D366] text-white hover:opacity-90"
            >
              Send via WhatsApp
            </a>
          )}
        </div>
      )}

      {error && (
        <div className="bg-critical-wash text-critical text-[12.5px] rounded-lg px-3 py-2 mb-4 border border-critical/30">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* Organization target */}
        <div>
          <div className="text-[12px] font-bold text-ink mb-1.5">Organization</div>
          <div className="flex gap-2 mb-3">
            <ModeButton active={orgMode === "new"} onClick={() => setOrgMode("new")}>
              New organization
            </ModeButton>
            <ModeButton active={orgMode === "existing"} onClick={() => setOrgMode("existing")}>
              Existing organization
            </ModeButton>
          </div>

          {orgMode === "new" ? (
            <Field label="Company name">
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Acme Corp"
                className={inputClass}
              />
              <p className="m-0 mt-1 text-[11px] text-ink-muted">
                This person becomes the new organization&apos;s first Admin automatically.
              </p>
            </Field>
          ) : (
            <div className="flex flex-col gap-3">
              <Field label="Select organization">
                <select
                  required
                  value={existingOrgId}
                  onChange={(e) => setExistingOrgId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">{orgsLoading ? "Loading…" : "Choose an organization"}</option>
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Org role">
                <select value={orgRole} onChange={(e) => setOrgRole(e.target.value as "member" | "org_admin")} className={inputClass}>
                  <option value="member">Member</option>
                  <option value="org_admin">Org Admin</option>
                </select>
              </Field>
            </div>
          )}
        </div>

        {/* User type */}
        <div>
          <div className="text-[12px] font-bold text-ink mb-1.5">Create User</div>
          <div className="flex gap-2">
            <ModeButton active={userType === "organization"} onClick={() => setUserType("organization")}>
              Organization
            </ModeButton>
            <ModeButton active={userType === "recruiter"} onClick={() => setUserType("recruiter")}>
              Recruiter
            </ModeButton>
          </div>
        </div>

        {/* Person fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Name">
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Email ID">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
          </Field>
          <Field label="Password">
            <div className="flex gap-2">
              <input
                type="text"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setPassword(STANDARD_PASSWORD)}
                className="text-[11px] font-semibold px-2.5 rounded-lg border border-border text-ink-muted hover:text-ink whitespace-nowrap"
              >
                Use standard
              </button>
            </div>
          </Field>
          <Field label="Contact number">
            <input
              type="tel"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className={inputClass}
            />
          </Field>
          <Field label="Access level">
            <select value={accessLevel} onChange={(e) => setAccessLevel(e.target.value)} className={inputClass}>
              {accessLevels.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {/* Tools/features checklist */}
        <div>
          <div className="text-[12px] font-bold text-ink mb-1.5">Tools & features to grant ({selectedTools.size})</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-72 overflow-y-auto border border-border rounded-xl p-2.5 bg-page">
            {GRANTABLE_TOOLS.map((tool) => {
              const checked = selectedTools.has(tool.n);
              return (
                <label
                  key={tool.n}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer text-[12px] ${
                    checked ? "bg-brand-wash/30 border-brand/40" : "bg-surface border-border hover:bg-page"
                  }`}
                >
                  <input type="checkbox" checked={checked} onChange={() => toggleTool(tool.n)} className="accent-brand" />
                  <span className="truncate">
                    <span className="font-semibold text-ink">{tool.n}</span>
                    <span className="text-ink-muted"> · {tool.dept}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="self-start text-[13px] font-bold px-5 py-2.5 rounded-lg bg-brand text-white hover:bg-brand-dark disabled:opacity-60 shadow-soft-sm"
        >
          {submitting ? "Creating…" : "Create account"}
        </button>
      </form>
    </div>
  );
}

const inputClass =
  "w-full border border-border rounded-lg px-3 py-2 text-[13px] outline-none focus:border-brand bg-surface text-ink";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11.5px] font-bold mb-1 text-ink">{label}</label>
      {children}
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-[12px] font-bold px-3 py-1.5 rounded-lg border ${
        active ? "bg-brand text-white border-brand" : "bg-surface text-ink-muted border-border hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}
