"use client";

import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function WaitingRoomPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<{
    full_name?: string | null;
    email?: string | null;
    persona?: string | null;
    status?: string | null;
    signup_location?: string | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function checkStatus() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data } = await supabase
        .from("profiles")
        .select("full_name, email, persona, status, signup_location, is_admin")
        .eq("id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (data?.is_admin) {
        router.push("/admin");
        return;
      }

      if (data?.status === "active" || data?.status === "approved") {
        if (data?.persona === "candidate") router.push("/candidate");
        else if (data?.persona === "recruiter") router.push("/recruiter");
        else router.push("/");
        return;
      }

      setProfile(data || { email: user.email, status: "pending_approval" });
      setLoading(false);
    }

    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [router]);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen max-h-screen flex flex-col bg-page overflow-hidden">
      <header className="px-6 py-3.5 border-b border-border bg-surface flex items-center justify-between flex-shrink-0">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo height={28} showPunchline={true} />
        </Link>
        <TopbarStatus />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-6 overflow-y-auto scrollbar-none">
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-7 shadow-soft text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-2xl bg-brand/10 border border-brand/20 flex items-center justify-center text-[26px] mb-4">
            ⏳
          </div>

          <h1 className="text-[20px] font-bold font-display text-ink m-0 mb-2">
            Application Under Review
          </h1>
          
          <p className="text-[13px] text-ink-muted leading-relaxed m-0 mb-6">
            Thank you for registering. Since you signed up as a{" "}
            <span className="font-semibold text-brand capitalize">
              {profile?.persona || "Partner"}
            </span>
            , access to enterprise AI tools requires approval by the platform owner (Shreesha).
          </p>

          <div className="w-full bg-page border border-border rounded-xl p-4 text-left mb-6 space-y-2 text-[12px]">
            <div className="flex justify-between items-center text-ink-muted">
              <span>Account Email:</span>
              <span className="font-medium text-ink">{profile?.email || "Loading…"}</span>
            </div>
            <div className="flex justify-between items-center text-ink-muted">
              <span>Account Type:</span>
              <span className="font-medium capitalize text-ink">{profile?.persona || "Recruiter / Organization"}</span>
            </div>
            <div className="flex justify-between items-center text-ink-muted">
              <span>Current Status:</span>
              <span className="inline-flex items-center gap-1.5 font-bold px-2 py-0.5 rounded-full text-[11px] bg-amber-500/10 text-brand border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
                Pending Owner Review
              </span>
            </div>
          </div>

          <p className="text-[11.5px] text-ink-muted mb-6">
            Approvals are usually reviewed within 1-2 hours. You will receive an automated email notification as soon as your account and tool licenses are approved.
          </p>

          <div className="flex items-center gap-3 w-full">
            <button
              onClick={() => window.location.reload()}
              className="flex-1 py-2.5 px-4 rounded-lg bg-surface border border-border text-[12.5px] font-semibold text-ink hover:bg-page transition-colors cursor-pointer"
            >
              Refresh Status
            </button>
            <button
              onClick={handleSignOut}
              className="flex-1 py-2.5 px-4 rounded-lg bg-brand text-white text-[12.5px] font-semibold hover:bg-brand-dark transition-colors cursor-pointer shadow-soft-sm"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
