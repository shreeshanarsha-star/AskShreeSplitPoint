"use client";

import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import GoogleAuthNoticeModal from "@/components/GoogleAuthNoticeModal";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

// One login form for everyone. There is no persona picker here on purpose:
// who you are (candidate / recruiter / hiring manager / org admin / owner)
// is a fact stored on the account, not something you self-select at the
// login screen. After a successful sign-in the server (quick-login route,
// with a client-side fallback below) looks up the account's real role and
// sends the browser to the right place automatically.
function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showGoogleNotice, setShowGoogleNotice] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // 1. Try fast server-side auth route first -- it resolves the
      //    correct destination (owner / recruiter / hiring manager /
      //    candidate / waiting room) from the account's stored role.
      const res = await fetch("/api/auth/quick-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();

      if (res.ok && data.success) {
        const destination = params.get("next") || data.redirectUrl || "/";
        router.push(destination);
        router.refresh();
        return;
      }

      // 2. Client-side fallback if the server route is unavailable.
      const supabase = createClient();
      const { error: clientErr, data: clientData } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (clientErr) {
        setLoading(false);
        setError(clientErr.message);
        return;
      }

      let destination = params.get("next") || "/";
      if (!params.get("next") && clientData.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("is_admin, status, persona")
          .eq("id", clientData.user.id)
          .maybeSingle();

        if (profile?.is_admin) {
          destination = "/admin";
        } else if (profile?.status === "pending_approval") {
          destination = "/waiting-room";
        } else if (profile?.status === "suspended") {
          setLoading(false);
          setError("Your account has been suspended. Please contact the platform owner.");
          return;
        } else if (profile?.persona === "candidate") {
          destination = "/candidate";
        } else if (profile?.persona === "recruiter") {
          destination = "/recruiter";
        }
      }

      setLoading(false);
      router.push(destination);
      router.refresh();
    } catch (err: any) {
      setLoading(false);
      setError(err?.message || "Sign in failed");
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
          redirectTo: `${window.location.origin}/auth/callback`,
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
        <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 sm:p-7 shadow-soft flex flex-col">
          <h1 className="text-[18px] font-bold m-0 mb-1 font-display text-ink">
            Sign in
          </h1>
          <p className="text-[11.5px] text-ink-muted m-0 mb-3.5">
            One login for everyone -- you&apos;ll land on the screen for your role automatically.
          </p>

          {error && (
            <div className="bg-critical-wash text-critical text-[12px] rounded-lg px-3 py-2 mb-3 border border-critical/30">
              {error}
            </div>
          )}

          {showGoogleNotice && (
            <div className="bg-brand-wash/30 border border-brand/40 text-ink text-[12px] rounded-lg p-3 mb-3">
              <div className="font-semibold text-brand mb-1">Google sign-in unavailable</div>
              <p className="m-0 text-ink-muted text-[11.5px] leading-relaxed">
                Google sign-in isn&apos;t enabled right now -- please sign in with your email and password instead.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col">
            <label className="block text-[11.5px] font-bold mb-1 text-ink">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full border border-border rounded-lg px-3 py-2 text-[13px] mb-3 outline-none focus:border-brand bg-surface text-ink placeholder:text-ink-muted"
            />

            <div className="flex items-center justify-between mb-1">
              <label className="block text-[11.5px] font-bold text-ink">Password</label>
              <Link href="/forgot-password" className="text-[11px] text-brand font-bold">
                Forgot password?
              </Link>
            </div>
            <input
              type="password"
              required
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
              {loading ? "Signing in…" : "Sign in"}
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
            New here?{" "}
            <Link href="/signup" className="text-brand font-bold hover:underline">
              Create an account
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
