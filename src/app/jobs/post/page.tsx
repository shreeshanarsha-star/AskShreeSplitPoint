import Link from "next/link";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";
import PublicJobPostingForm from "@/components/tools/PublicJobPostingForm";

export const dynamic = "force-dynamic";

const VERIFY_BANNER: Record<string, { tone: "good" | "critical"; text: string }> = {
  success: { tone: "good", text: "Email verified — thanks! Your posting(s) now note a confirmed email." },
  invalid: { tone: "critical", text: "That verification link is invalid or has expired." },
  missing_token: { tone: "critical", text: "That verification link is missing its token." },
};

// Job Postings.ai — public, free, unauthenticated. Recreated from the old
// askshree-app repo: anyone can upload JDs and get up to 3 free
// AI-structured postings per IP; signed-in users bypass the limit.
// Deliberately NOT under /tools (middleware gates that to signed-in users
// only) — same reasoning as /apply being its own public surface.
export default async function PostJobPage({
  searchParams,
}: {
  searchParams: Promise<{ verify?: string }>;
}) {
  const { verify } = await searchParams;
  const banner = verify ? VERIFY_BANNER[verify] : undefined;

  return (
    <div className="min-h-screen bg-page">
      <header className="border-b border-border bg-surface px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo height={28} showPunchline={true} />
          </Link>
          <span className="text-border text-sm select-none">/</span>
          <Link href="/jobs" className="text-[12.5px] font-semibold text-ink-muted hover:text-ink transition-colors">
            Job Board
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/jobs" className="text-[12px] font-bold text-ink-muted hover:text-ink transition-colors">
            Browse open roles
          </Link>
          <TopbarStatus />
        </div>
      </header>

      <main className="max-w-[1000px] mx-auto px-6 py-10">
        <h1 className="text-[26px] font-bold m-0">Job Postings.ai</h1>
        <p className="text-[13.5px] text-ink-muted mt-1.5 max-w-xl">
          Post a role free — no account required for your first 3 postings.
        </p>

        {banner && (
          <div
            className={`text-[12.5px] rounded-sm px-3 py-2 mt-4 max-w-2xl ${
              banner.tone === "good" ? "bg-good-wash text-good-text" : "bg-critical-wash text-critical"
            }`}
          >
            {banner.text}
          </div>
        )}

        <div className="mt-8">
          <PublicJobPostingForm />
        </div>
      </main>
    </div>
  );
}
