"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import QuickApplyModal, {
  type QuickApplyJobInfo,
  type QuickApplyAccount,
} from "./QuickApplyModal";

interface Props {
  job: QuickApplyJobInfo;
  account: QuickApplyAccount | null;
  nextPath: string;
}

export default function StandardApplyClient({ job, account, nextPath }: Props) {
  const router = useRouter();

  if (account) {
    return (
      <QuickApplyModal
        isOpen
        onClose={() => router.push("/jobs")}
        job={job}
        account={account}
        variant="embedded"
        badgeLabel="Standard Apply"
      />
    );
  }

  return <CandidateAuthGate nextPath={nextPath} />;
}

function CandidateAuthGate({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<"choose" | "register">("choose");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !email.trim() || password.length < 6) {
      setError("Name, email and a password of at least 6 characters are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/candidate/quick-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create your account.");
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });
      if (signInError) {
        setError(signInError.message);
        return;
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-surface border border-border rounded-2xl p-6 shadow-soft space-y-5">
      <div>
        <h2 className="text-base font-bold text-ink font-display m-0">
          Sign in or create your candidate account
        </h2>
        <p className="text-[12.5px] text-ink-muted mt-1">
          Standard Apply keeps your application tied to your own account, so you can check status and come back anytime -- takes under a minute.
        </p>
      </div>

      {mode === "choose" ? (
        <div className="space-y-2.5">
          <Link
            href={`/login?next=${encodeURIComponent(nextPath)}`}
            className="block w-full text-center px-4 py-2.5 rounded-xl text-[13px] font-bold border border-border hover:border-brand/40 text-ink hover:text-brand bg-page transition-all"
          >
            Sign in
          </Link>
          <button
            type="button"
            onClick={() => setMode("register")}
            className="block w-full text-center px-4 py-2.5 rounded-xl text-[13px] font-bold bg-brand hover:bg-brand-dark text-white shadow-button transition-all"
          >
            Create a candidate account
          </button>
          <p className="text-[11px] text-ink-muted text-center pt-1">
            Want the fastest path instead? <span className="font-semibold text-ink">Use Quick Apply on the role page</span> -- no account needed.
          </p>
        </div>
      ) : (
        <form onSubmit={handleRegister} className="space-y-3">
          {error && (
            <div className="p-2.5 rounded-lg bg-critical-wash text-critical border border-critical/20 text-[12px]">
              {error}
            </div>
          )}
          <div>
            <label className="block text-[11.5px] font-bold text-ink-2 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-ink-2 mb-1">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11.5px] font-bold text-ink-2 mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="w-full text-[13px] px-3 py-2.5 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setMode("choose")}
              className="px-4 py-2 text-[12.5px] font-bold text-ink-muted hover:text-ink"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 rounded-xl text-[13px] font-bold bg-brand hover:bg-brand-dark disabled:opacity-50 text-white shadow-button transition-all"
            >
              {submitting ? "Creating account..." : "Create account & continue"}
            </button>
          </div>
          <p className="text-[11px] text-ink-muted text-center pt-1">
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-bold text-brand hover:underline">
              Sign in
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}
