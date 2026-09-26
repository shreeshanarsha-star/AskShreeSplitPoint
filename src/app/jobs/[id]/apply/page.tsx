import type { ReactNode } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import StandardApplyClient from "@/components/tools/StandardApplyClient";

export const dynamic = "force-dynamic";

interface AtsPosting {
  id: string;
  status: string;
  board: string;
  requisition_id: string;
}

interface AtsRequisition {
  id: string;
  title: string;
  location: string | null;
  eligibility_criteria: { must_have_skills?: string[] } | null;
  org_id: string | null;
}

function Shell({ id, children }: { id: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-page text-ink flex flex-col">
      <header className="px-6 py-3.5 border-b border-border bg-surface shadow-soft-sm flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="flex items-center hover:opacity-90 transition-opacity">
          <Logo height={28} showPunchline={true} />
        </Link>
        <div className="flex items-center gap-3.5">
          <Link
            href={`/jobs/${id}`}
            className="text-[12px] font-bold text-ink-muted hover:text-brand transition-colors flex items-center gap-1.5"
          >
            <Icon name="chevronLeft" size={13} />
            <span>Back to role</span>
          </Link>
          <span className="w-px h-5 bg-border" />
          <TopbarStatus />
        </div>
      </header>
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-10">{children}</main>
    </div>
  );
}

// Standard Apply -- the proper, account-backed application path. Unlike
// Quick Apply (fast, no login needed), this page requires the candidate
// to sign in or create a candidate account first, so the application is
// permanently tied to something they can log back into. Once signed in,
// it reuses the exact same CV-drop-box + submit flow as Quick Apply
// (QuickApplyModal in "embedded" mode) -- same live talent_* pipeline,
// same AI screening, same success confirmation.
export default async function StandardApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();

  let posting: AtsPosting | null = null;
  let requisition: AtsRequisition | null = null;
  let orgName: string | null = null;

  try {
    const { data: p } = await admin
      .from("talent_job_postings")
      .select("id, status, board, requisition_id")
      .eq("id", id)
      .eq("board", "askshree")
      .eq("status", "published")
      .maybeSingle();
    if (p) posting = p as unknown as AtsPosting;
  } catch {
    // table not yet created -- fall through to the "not accepting" state
  }

  if (posting) {
    try {
      const { data: r } = await admin
        .from("talent_requisitions")
        .select("id, title, location, eligibility_criteria, org_id")
        .eq("id", posting.requisition_id)
        .maybeSingle();
      if (r) requisition = r as unknown as AtsRequisition;

      if (requisition?.org_id) {
        const { data: org } = await admin
          .from("organizations")
          .select("id, name")
          .eq("id", requisition.org_id)
          .maybeSingle();
        orgName = (org as { id: string; name: string } | null)?.name ?? null;
      }
    } catch {
      // ignore -- handled by the not-found state below
    }
  }

  if (!posting || !requisition) {
    return (
      <Shell id={id}>
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft text-center space-y-2">
          <h1 className="text-lg font-bold text-ink font-display m-0">
            This role isn&apos;t accepting applications
          </h1>
          <p className="text-[13px] text-ink-muted m-0">
            It may have closed, or the link is out of date.
          </p>
          <Link
            href="/jobs"
            className="inline-block mt-2 text-[12.5px] font-bold text-brand hover:underline"
          >
            Browse open roles →
          </Link>
        </div>
      </Shell>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let account: { email: string; name?: string } | null = null;
  if (user) {
    const { data: profile } = await admin
      .from("profiles")
      .select("full_name, email, status")
      .eq("id", user.id)
      .maybeSingle();

    const p = profile as { full_name: string | null; email: string | null; status: string | null } | null;

    if (p?.status === "suspended") {
      return (
        <Shell id={id}>
          <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft text-center space-y-2">
            <h1 className="text-lg font-bold text-ink font-display m-0">Account suspended</h1>
            <p className="text-[13px] text-ink-muted m-0">
              Contact the platform owner for help with your account.
            </p>
          </div>
        </Shell>
      );
    }

    account = {
      email: user.email || p?.email || "",
      name: p?.full_name || "",
    };
  }

  const jobInfo = {
    id: posting.id,
    title: requisition.title,
    company: orgName || "AskShree Partner",
    location: requisition.location,
    must_have_skills: requisition.eligibility_criteria?.must_have_skills || [],
  };

  return (
    <Shell id={id}>
      <div className="mb-5">
        <p className="text-[11px] font-bold uppercase tracking-wider text-brand mb-1">Standard Apply</p>
        <h1 className="text-xl font-bold text-ink font-display m-0">{jobInfo.title}</h1>
        <p className="text-[13px] text-ink-muted mt-1">
          {jobInfo.company} • {jobInfo.location || "Remote"}
        </p>
      </div>
      <StandardApplyClient job={jobInfo} account={account} nextPath={`/jobs/${id}/apply`} />
    </Shell>
  );
}
