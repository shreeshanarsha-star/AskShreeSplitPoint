import type { SupabaseClient } from "@supabase/supabase-js";
import { DEPARTMENTS } from "@/lib/departments";

// -----------------------------------------------------------------------
// Owner -> org admin -> users, for tools.
//
// The platform owner decides which tools an org gets (feature_access rows
// with org_id, or every live tool on a bulk plan). Inside that set, the
// org admin can switch individual tools OFF for individual members
// (org_member_tool_blocks). A block can only remove access -- an org admin
// can never give a member a tool the owner didn't grant the org.
// -----------------------------------------------------------------------

export function allLiveToolNames(excludeOwnerOnly = true): string[] {
  return DEPARTMENTS.filter((d) => !excludeOwnerOnly || d.id !== "support")
    .flatMap((d) => d.tools)
    .filter((t) => t.s === "live")
    .map((t) => t.n);
}

// The tools the owner granted this org (the org admin's ceiling).
export async function getOrgGrantedTools(admin: SupabaseClient, orgId: string): Promise<string[]> {
  const { data: org } = await admin.from("organizations").select("plan").eq("id", orgId).maybeSingle();
  if (org?.plan === "bulk") return allLiveToolNames();
  const { data } = await admin.from("feature_access").select("feature_key").eq("org_id", orgId);
  return Array.from(new Set((data || []).map((r: { feature_key: string }) => r.feature_key)));
}

// Tools the org admin has switched off for this member.
export async function getBlockedTools(admin: SupabaseClient, orgId: string, userId: string): Promise<string[]> {
  const { data } = await admin
    .from("org_member_tool_blocks")
    .select("feature_key")
    .eq("org_id", orgId)
    .eq("user_id", userId);
  return (data || []).map((r: { feature_key: string }) => r.feature_key);
}
