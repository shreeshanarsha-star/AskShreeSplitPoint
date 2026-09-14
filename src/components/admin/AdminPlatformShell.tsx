"use client";

import { usePathname, useRouter } from "next/navigation";
import UniversalPlatformShell from "../UniversalPlatformShell";

export default function AdminPlatformShell({
  children,
  pendingCount = 0,
}: {
  children: React.ReactNode;
  pendingCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    {
      id: "approvals",
      label: "Approvals Queue",
      icon: "checkCircle",
      badge: pendingCount > 0 ? pendingCount : null,
      badgeColor: "rose" as const,
      active: pathname === "/admin",
      onClick: () => router.push("/admin"),
    },
    {
      id: "overview",
      label: "Platform Overview",
      icon: "barChart",
      active: pathname === "/admin/overview",
      onClick: () => router.push("/admin/overview"),
    },
    {
      id: "organizations",
      label: "Organizations & Tenants",
      icon: "briefcase",
      active: pathname.startsWith("/admin/organizations"),
      onClick: () => router.push("/admin/organizations"),
    },
    {
      id: "users",
      label: "Users & Clearances",
      icon: "users",
      active: pathname.startsWith("/admin/users"),
      onClick: () => router.push("/admin/users"),
    },
    {
      id: "knowledge-base",
      label: "Avatar Knowledge Base",
      icon: "fileText",
      active: pathname.startsWith("/admin/knowledge-base"),
      onClick: () => router.push("/admin/knowledge-base"),
    },
    {
      id: "activity",
      label: "Audit & Activity Log",
      icon: "clock",
      active: pathname.startsWith("/admin/activity"),
      onClick: () => router.push("/admin/activity"),
    },
  ];

  return (
    <UniversalPlatformShell
      portalTitle="Owner & Admin Console"
      leftTitle="Governance Suite"
      leftSubtitle="Tenant Security & System Guardrails"
      navItems={navItems}
      avatarConfig={{
        title: "Shree AI Platform Governance Partner",
        subtitle: "Audit Logging • Tenant Security • Compliance Guardrails",
        badgeText: "Owner Clearance Active",
      }}
      searchPlaceholder="Ask Shree or execute admin commands, audit tenant logs, or query user clearances..."
      suggestedQuestions={[
        "Show all pending job approvals across tenants",
        "Audit guest trial conversion funnel",
        "Check recently failed outbound email logs",
        "Inspect organization subscription statuses",
      ]}
      onSearchSubmit={(q) => {
        if (q.toLowerCase().includes("org")) {
          router.push("/admin/organizations");
        } else if (q.toLowerCase().includes("user")) {
          router.push("/admin/users");
        } else if (q.toLowerCase().includes("log") || q.toLowerCase().includes("activity")) {
          router.push("/admin/activity");
        } else if (q.toLowerCase().includes("overview") || q.toLowerCase().includes("stat")) {
          router.push("/admin/overview");
        } else {
          router.push("/admin");
        }
      }}
    >
      {children}
    </UniversalPlatformShell>
  );
}
