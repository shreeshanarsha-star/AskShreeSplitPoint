import AppShell from "@/components/AppShell";
import AdminNav from "@/components/admin/AdminNav";
import SignOutButton from "@/components/admin/SignOutButton";
import CreateUserForm from "@/components/admin/CreateUserForm";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Owner-only "create credentials directly" tool. See
// /api/admin/create-user/route.ts for why this route exists: the org-admin
// invite flow can't be used by the owner (their own account has no
// org_id), so this is the owner-specific path -- new org or existing org,
// any access level, any tools ticked, password set directly, with an
// option to email and/or hand off a pre-filled WhatsApp message.
export default async function AdminCreateUserPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = user
    ? await supabase.from("profiles").select("is_admin").eq("id", user.id).single()
    : { data: null };

  if (!profile?.is_admin) {
    return (
      <AppShell title="Admin — Create User">
        <div className="border border-dashed border-border rounded-md px-4 py-6 text-center text-[13px] text-ink-muted">
          Owner access required.
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Admin — Create User">
      <AdminNav />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="m-0 text-[19px] font-bold">Create login credentials</h2>
          <p className="m-0 mt-1 text-[13px] text-ink-muted">
            Stand up a new organization or add someone into an existing one, set their access
            level and tools, and hand them their login directly.
          </p>
        </div>
        <SignOutButton />
      </div>
      <CreateUserForm />
    </AppShell>
  );
}
