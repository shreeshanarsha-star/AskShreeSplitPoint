"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";

interface CandidateResult {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  current_company: string | null;
  current_location: string | null;
  qualification: string | null;
  requisition: { req_no: string; title: string; location: string | null } | null;
  matchedKeywords: string[];
  resumeSnippet: string | null;
  hasResume: boolean;
  otherApplicationsCount: number;
}

// Search your own candidate database by name, skill, company, location or
// qualification. Scoped server-side to your own org (or your own
// requisitions if you're a standalone recruiter) -- you only ever see
// candidates you're allowed to see.
export default function CandidateSearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CandidateResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    setSearched(true);
    try {
      const res = await fetch(`/api/ats/candidates/search?q=${encodeURIComponent(query.trim())}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed.");
      setResults(data.candidates ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed.");
      setResults([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white flex flex-col">
      <header className="px-6 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 sticky top-0 z-30 shadow-2xs">
        <Link
          href="/recruiter"
          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-slate-500 flex-shrink-0"
          title="Back to Recruiter Console"
        >
          <Icon name="chevronLeft" size={16} />
        </Link>
        <Link href="/" className="group flex-shrink-0">
          <Logo height={28} showPunchline={true} />
        </Link>
        <span className="text-slate-300 dark:text-slate-700 flex-shrink-0">/</span>
        <span className="font-bold text-sm tracking-tight">Candidate Search</span>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-6 space-y-4">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your candidates -- name, skill, company, location, qualification…"
            className="flex-1 text-[13px] px-3.5 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-brand focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="text-[12.5px] font-bold text-white bg-brand px-4 py-2.5 rounded-lg disabled:opacity-50 hover:opacity-95 transition-opacity"
          >
            {loading ? "Searching…" : "Search"}
          </button>
        </form>

        {error && (
          <div className="p-3 rounded-xl border border-rose-300 bg-rose-50 dark:bg-rose-950/20 text-xs text-rose-700 dark:text-rose-300">
            {error}
          </div>
        )}

        {searched && !loading && !error && results.length === 0 && (
          <div className="py-12 text-center text-xs text-slate-500">
            No candidates matched &quot;{query}&quot;.
          </div>
        )}

        <div className="space-y-2.5">
          {results.map((c) => (
            <div
              key={c.id}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-soft space-y-1.5"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-bold text-sm truncate">{c.name || "Unnamed candidate"}</span>
                  {c.hasResume && (
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                      CV on file
                    </span>
                  )}
                  {c.otherApplicationsCount > 0 && (
                    <span className="text-[10px] font-semibold text-slate-400">
                      +{c.otherApplicationsCount} other application{c.otherApplicationsCount > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
                {c.requisition && (
                  <span className="text-[10.5px] font-semibold text-brand bg-brand-wash/40 border border-brand/20 px-2 py-0.5 rounded">
                    {c.requisition.req_no} · {c.requisition.title}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                {c.email && <span>{c.email}</span>}
                {c.phone && <span>{c.phone}</span>}
                {c.current_company && <span>{c.current_company}</span>}
                {c.current_location && <span>{c.current_location}</span>}
                {c.qualification && <span>{c.qualification}</span>}
              </div>

              {c.resumeSnippet && (
                <p className="text-[11.5px] text-slate-600 dark:text-slate-300 italic">
                  &quot;…{c.resumeSnippet}…&quot;
                </p>
              )}

              {c.matchedKeywords?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {c.matchedKeywords.map((k) => (
                    <span
                      key={k}
                      className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
