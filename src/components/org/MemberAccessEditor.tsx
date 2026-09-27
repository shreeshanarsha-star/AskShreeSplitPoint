"use client";

import { useEffect, useState } from "react";

type AccessData = {
  orgRole: string;
  roles: string[];
  assignableRoles: string[];
  roleLabels: Record<string, string>;
  orgTools: string[];
  enabledTools: string[];
};

// Org admin's per-member controls: roles, org-admin switch, and which of
// the org's owner-granted tools this member can use.
export default function MemberAccessEditor({
  userId,
  isSelf,
  onSaved,
}: {
  userId: string;
  isSelf: boolean;
  onSaved: () => void;
}) {
  const [data, setData] = useState<AccessData | null>(null);
  const [roles, setRoles] = useState<Set<string>>(new Set());
  const [tools, setTools] = useState<Set<string>>(new Set());
  const [isOrgAdmin, setIsOrgAdmin] = useState(false);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/org/members/${userId}/access`)
      .then(async (r) => {
        const d = await r.json();
        if (cancelled) return;
        if (!r.ok) {
          setMsg({ ok: false, text: d.error || "Could not load access." });
          return;
        }
        setData(d);
        setRoles(new Set(d.roles));
        setTools(new Set(d.enabledTools));
        setIsOrgAdmin(d.orgRole === "org_admin");
      })
      .catch(() => !cancelled && setMsg({ ok: false, text: "Could not load access." }));
    return () => {
      cancelled = true;
    };
  }, [userId]);

  function toggle(set: Set<string>, key: string, update: (s: Set<string>) => void) {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    update(next);
  }

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/org/members/${userId}/access`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roles: Array.from(roles),
        orgRole: isOrgAdmin ? "org_admin" : "member",
        enabledTools: Array.from(tools),
      }),
    });
    const d = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMsg({ ok: false, text: d.error || "Could not save." });
      return;
    }
    setMsg({ ok: true, text: "Saved." });
    onSaved();
  }

  if (!data) {
    return <div className="text-[11.5px] text-ink-muted px-1 py-2">{msg ? msg.text : "Loading access…"}</div>;
  }

  return (
    <div className="flex flex-col gap-3 border-t border-border mt-2 pt-3">
      <label className="flex items-center gap-2 text-[12px] cursor-pointer select-none">
        <input
          type="checkbox"
          checked={isOrgAdmin}
          disabled={isSelf}
          onChange={(e) => setIsOrgAdmin(e.target.checked)}
          className="accent-brand cursor-pointer"
        />
        <span className="font-bold">Org admin</span>
        <span className="text-ink-muted">-- can manage members and access for this organization</span>
      </label>

      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">Roles</div>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5">
          {data.assignableRoles.map((r) => (
            <label key={r} className="flex items-center gap-1.5 text-[12px] cursor-pointer select-none">
              <input
                type="checkbox"
                checked={roles.has(r)}
                onChange={() => toggle(roles, r, setRoles)}
                className="accent-brand cursor-pointer"
              />
              {data.roleLabels[r] || r}
            </label>
          ))}
        </div>
      </div>

      <div>
        <div className="text-[10.5px] font-bold uppercase tracking-wider text-ink-muted mb-1.5">
          Tools <span className="normal-case font-normal">(only tools the platform owner granted your organization)</span>
        </div>
        {data.orgTools.length === 0 ? (
          <p className="m-0 text-[12px] text-ink-muted">Your organization has no tools yet -- ask the platform owner.</p>
        ) : (
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {data.orgTools.map((t) => (
              <label key={t} className="flex items-center gap-1.5 text-[12px] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={tools.has(t)}
                  onChange={() => toggle(tools, t, setTools)}
                  className="accent-brand cursor-pointer"
                />
                {t}
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="bg-brand text-white text-[12px] font-bold px-3.5 py-1.5 rounded-sm disabled:opacity-50 cursor-pointer"
        >
          {saving ? "Saving…" : "Save access"}
        </button>
        {msg && <span className={`text-[11.5px] ${msg.ok ? "text-good-text" : "text-critical"}`}>{msg.text}</span>}
      </div>
    </div>
  );
}
