"use client";

import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import GoogleAuthNoticeModal from "@/components/GoogleAuthNoticeModal";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// This page is for recruiters. Candidates never need it -- applying to a
// job creates their account for them (see the optional "save your
// application" step on the apply flow). Every recruiter account created
// here is held for Owner approval before it can sign in for real, same as
// before; the only change is there's no persona picker -- this page
// always creates a recruiter account. Leaving "Company name" blank makes
// it an independent/standalone recruiter, which is the primary path right
// now (see build decision D7).
export default function SignupPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();

    try {
      // 1. Sign up with Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            persona: "recruiter",
            company_name: companyName.trim() || undefined,
          },
        },
      });

      if (authErr) {
        throw authErr;
      }

      if (!authData.user) {
        throw new Error("Could not create user account.");
      }

      // 2. Register persona details and telemetry via server route --
      //    this is what puts the account into the pending-approval queue
      //    and emails the owner.
      await fetch("/api/auth/register-persona", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          persona: "recruiter",
          fullName: fullName.trim(),
          companyName: companyName.trim() || undefined,
        }),
      });

      setLoading(false);
      router.push("/waiting-room");
      router.refresh();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Failed to create account.");
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback?persona=recruiter`,
          skipBrowserRedirect: true,
        },
      });

      if (error || !data?.url) {
        setGoogleLoading(false);
        setShowGoogleNotice(true);
        return;
      }

      // Pre-flight probe to detect if provider is active without dumping user onto a raw 400 JSON page
      try {
        const probe = await fetch(data.url, { method: "GET", redirect: "manual" });
        if (probe.status >= 400) {
          const body = await probe.json().catch(() => ({}));
          if (
            body?.msg?.includes("provider is not enabled") ||
            body?.error_code === "validation_failed" ||
            probe.status === 400
          ) {
            setGoogleLoading(false);
            setShowGoogleNotice(true);
            return;
          }
        }
      } catch {
        // Any probe error, fall back safely to modal
      }

      setGoogleLoading(false);
      window.location.href = data.url;
    } catch {
      setGoogleLoading(false);
      setShowGoogleNotice(true);
    }
  }

  return (
    <div className="min-h-screen max-h-screen flex flex-col bg-page overflow-hidden">
      <header className="px-6 py-3.5 border-b border-border bg-surface flex items-center justify-between flex-shrink-0">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo height={28} showPunchline={true} />
        </Link>
        <TopbarStatus />
      </header>

      <div className="flex-1 flex items-center justify-center px-4 py-4 overflow-y-auto scrollbar-none">
        <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 sm:p-7 shadow-soft flex flex-col">
          <h1 className="text-[19px] font-bold m-0 mb-1 font-display text-ink text-center">
            Create your recruiter account
          </h1>
          <p className="text-[12px] text-ink-muted m-0 mb-4 text-center">
            Post jobs and manage candidates. New accounts are reviewed by the platform owner before you can sign in.
          </p>

          {error && (
            <div className="bg-critical-wash text-critical text-[12px] rounded-lg px-3 py-2 mb-3 border border-critical/30">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col">
            <label className="block text-[11.5px] font-bold mb-1 text-ink">Full Name</label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex Mercer"
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] mb-3 outline-none focus:border-brand bg-surface text-ink placeholder:text-ink-muted"
            />

            <label className="block text-[11.5px] font-bold mb-1 text-ink">
              Company name <span className="font-normal text-ink-muted">(optional -- leave blank if you&apos;re an independent recruiter)</span>
            </label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Technologies Inc."
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] mb-3 outline-none focus:border-brand bg-surface text-ink placeholder:text-ink-muted"
            />

            <label className="block text-[11.5px] font-bold mb-1 text-ink">Work Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="alex@company.com"
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] mb-3 outline-none focus:border-brand bg-surface text-ink placeholder:text-ink-muted"
            />

            <label className="block text-[11.5px] font-bold mb-1 text-ink">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] mb-4 outline-none focus:border-brand bg-surface text-ink placeholder:text-ink-muted"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand text-white font-bold text-[13px] rounded-lg py-2.5 disabled:opacity-60 shadow-soft-sm cursor-pointer hover:bg-brand-dark transition-colors"
            >
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>

          <div className="flex items-center gap-3 my-3">
            <div className="h-px bg-border flex-1" />
            <span className="text-[11px] text-ink-muted">or</span>
            <div className="h-px bg-border flex-1" />
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading || googleLoading}
            className="w-full flex items-center justify-center gap-2 border border-border rounded-lg py-2 text-[12.5px] font-bold text-ink hover:bg-page transition-colors cursor-pointer disabled:opacity-60"
          >
            {googleLoading ? (
              <span className="flex items-center gap-2 text-ink-muted">
                <span className="w-3.5 h-3.5 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                Connecting to Google…
              </span>
            ) : (
              <>
                <svg width="15" height="15" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                  <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
                  <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.6 35.1 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.9 39.6 16.4 44 24 44z"/>
                  <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C39.5 37.6 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <p className="text-[11.5px] text-ink-muted text-center mt-3 mb-0">
            Already have an account?{" "}
            <Link href="/login" className="text-brand font-bold hover:underline">
              Sign in
            </Link>
          </p>
          <p className="text-[11px] text-ink-muted text-center mt-2 mb-0">
            Looking to apply for a job instead?{" "}
            <Link href="/jobs" className="text-brand font-bold hover:underline">
              Browse open roles
            </Link>
          </p>
        </div>
      </div>

      <GoogleAuthNoticeModal
        isOpen={showGoogleNotice}
        onClose={() => setShowGoogleNotice(false)}
      />
    </div>
  );
}
