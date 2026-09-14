import AppShell from "@/components/AppShell";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";
import UsersList from "@/components/admin/UsersList";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const supabase = await createClient();

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, is_admin, org_id, org_role, status, persona, signup_ip, signup_location, auth_provider, company_name, created_at")
    .order("created_at", { ascending: false });

  const { data: orgs } = await supabase.from("organizations").select("id, name");
  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  // Fetch all user tool grants
  const { data: userGrants } = await supabase
    .from("user_feature_access")
    .select("user_id, feature_key");

  const grantsByUserId = new Map<string, string[]>();
  for (const g of userGrants || []) {
    if (!grantsByUserId.has(g.user_id)) {
      grantsByUserId.set(g.user_id, []);
    }
    grantsByUserId.get(g.user_id)!.push(g.feature_key);
  }

  const pendingCount = (profiles ?? []).filter((p) => p.status === "pending_approval").length;

  return (
    <AppShell title="Admin — Users & RBAC">
      <AdminNav />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="m-0 text-[19px] font-bold font-display text-ink">Users & RBAC</h2>
            {pendingCount > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20 animate-pulse">
                {pendingCount} Pending Review
              </span>
            )}
          </div>
          <p className="m-0 mt-1 text-[13px] text-ink-muted">
            Manage user approval states, applicant telemetry, and granular tool access. Company licenses are managed from{" "}
            <Link href="/admin/organizations" className="text-brand font-bold hover:underline">
              Organizations
            </Link>
            .
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-critical-wash text-critical text-[12.5px] rounded-sm px-3 py-2 mb-4">
          Could not load users: {error.message}
        </div>
      )}

      {(profiles ?? []).length === 0 ? (
        <div className="border border-dashed border-border rounded-md px-4 py-6 text-center text-[13px] text-ink-muted">
          No one has registered yet.
        </div>
      ) : (
        <UsersList
          profiles={profiles ?? []}
          orgNameById={orgNameById}
          grantsByUserId={grantsByUserId}
        />
      )}
    </AppShell>
  );
}
