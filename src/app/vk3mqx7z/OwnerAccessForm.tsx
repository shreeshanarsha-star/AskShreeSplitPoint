"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

// Unlisted owner-only sign-in. Not linked from anywhere in the app --
// reachable only by knowing this exact URL. See
// api/auth/owner-session/route.ts for why this can't just reuse
// /api/auth/quick-login: a correct password on a non-owner account here
// must fail exactly like a wrong one, so this page never confirms
// anything about an account or about its own purpose to anyone who
// isn't the owner.
export default function OwnerAccessForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/owner-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.success) {
        router.push("/admin");
        router.refresh();
        return;
      }

      setLoading(false);
      setError("Invalid credentials.");
    } catch {
      setLoading(false);
      setError("Invalid credentials.");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm bg-surface border border-border rounded-2xl p-6 sm:p-7 shadow-soft">
        <h1 className="text-[18px] font-bold m-0 mb-4 font-display text-ink">Sign in</h1>

        {error && (
          <div className="bg-critical-wash text-critical text-[12px] rounded-lg px-3 py-2 mb-3 border border-critical/30">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col">
          <label className="block text-[11.5px] font-bold mb-1 text-ink">Email</label>
          <input
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full border border-border rounded-lg px-3 py-2 text-[13px] mb-3 outline-none focus:border-brand bg-surface text-ink placeholder:text-ink-muted"
          />

          <label className="block text-[11.5px] font-bold mb-1 text-ink">Password</label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
      </div>
    </div>
  );
}
