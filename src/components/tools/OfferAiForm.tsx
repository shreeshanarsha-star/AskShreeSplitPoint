"use client";

import { useCallback, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import { useRegisterToolHome } from "@/components/ToolHomeContext";

type Component = { label: string; annual: string };
type Step = "draft" | "polishing" | "review" | "submitting" | "done";

export default function OfferAiForm() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("draft");

  // Topbar's clickable "Offer.ai" title (ToolHomeContext) restarts the
  // wizard from the draft step.
  useRegisterToolHome(useCallback(() => setStep("draft"), []));
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [proposedCtc, setProposedCtc] = useState("");
  const [talentCandidateId, setTalentCandidateId] = useState<string | null>(null);

  // Talent.ai links here from a candidate at the Offer stage with these
  // params pre-filled, so recruiters don't retype what's already on file.
  // talentCandidateId (not user-editable) round-trips back to /api/offers
  // so the created offer can be traced to its ATS pipeline record.
  useEffect(() => {
    const name = searchParams.get("candidateName");
    const email = searchParams.get("candidateEmail");
    const role = searchParams.get("roleTitle");
    const ctc = searchParams.get("proposedCtc");
    const cid = searchParams.get("talentCandidateId");
    if (name) setCandidateName(name);
    if (email) setCandidateEmail(email);
    if (role) setRoleTitle(role);
    if (ctc) setProposedCtc(ctc);
    if (cid) setTalentCandidateId(cid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [currency, setCurrency] = useState("INR");
  const [components, setComponents] = useState<Component[]>([{ label: "Basic", annual: "" }]);
  const [noticePeriod, setNoticePeriod] = useState("");
  const [joiningDate, setJoiningDate] = useState("");
  const [draftNotes, setDraftNotes] = useState("");
  const [polished, setPolished] = useState("");
  const [error, setError] = useState<string | null>(null);
  const isSubmitting: boolean = step === "submitting";
  const [isHandshaking, setIsHandshaking] = useState(false);
  const [handshakeResult, setHandshakeResult] = useState<{
    envelopeId: string;
    signUrl: string;
    token: string;
  } | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  async function handleHandshakeToContracts() {
    setError(null);
    setIsHandshaking(true);
    try {
      const cleanComponents = components
        .filter((c) => c.label && c.annual)
        .map((c) => ({ label: c.label, annual: Number(c.annual) }));
      const res = await fetch("/api/talent-ai/offer-to-contract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName,
          candidateEmail,
          roleTitle,
          proposedCtcAnnual: proposedCtc ? Number(proposedCtc) : null,
          currency,
          components: cleanComponents,
          noticePeriod,
          joiningDate: joiningDate || null,
          aiPolishedLetter: polished || draftNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate e-sign contract.");
      setHandshakeResult({
        envelopeId: data.envelopeId,
        signUrl: data.signUrl,
        token: data.token,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Handshake to Contracts failed.");
    } finally {
      setIsHandshaking(false);
    }
  }

  function updateComponent(idx: number, field: keyof Component, value: string) {
    setComponents((prev) => prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  }
  function addComponent() {
    setComponents((prev) => [...prev, { label: "", annual: "" }]);
  }
  function removeComponent(idx: number) {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handlePolish() {
    setError(null);
    setStep("polishing");
    try {
      const cleanComponents = components
        .filter((c) => c.label && c.annual)
        .map((c) => ({ label: c.label, annual: Number(c.annual) }));
      const res = await fetch("/api/offers/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName,
          roleTitle,
          proposedCtcAnnual: proposedCtc ? Number(proposedCtc) : null,
          currency,
          components: cleanComponents,
          noticePeriod,
          joiningDate,
          draftNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI polish failed.");
      setPolished(data.polished);
      setStep("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI polish failed.");
      setStep("draft");
    }
  }

  async function handleSubmit() {
    setError(null);
    setStep("submitting");
    try {
      const cleanComponents = components
        .filter((c) => c.label && c.annual)
        .map((c) => ({ label: c.label, annual: Number(c.annual) }));
      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          candidateName,
          candidateEmail,
          roleTitle,
          proposedCtcAnnual: proposedCtc ? Number(proposedCtc) : null,
          currency,
          components: cleanComponents,
          noticePeriod,
          joiningDate: joiningDate || null,
          draftNotes,
          aiPolishedLetter: polished || null,
          talentCandidateId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save the offer.");
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the offer.");
      setStep("review");
    }
  }

  if (step === "done") {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-center gap-3">
        <div className="w-11 h-11 rounded-full bg-good-wash text-good-text flex items-center justify-center">
          <Icon name="check" className="w-5 h-5" />
        </div>
        <h2 className="m-0 text-[18px] font-bold">Sent for approval</h2>
        <p className="m-0 mt-2 text-[13px] text-ink-muted max-w-sm">
          This offer is waiting in the admin&rsquo;s approval queue.
        </p>
        <Link href="/" className="bg-brand text-white text-[13px] font-bold px-4 py-2.5 rounded-sm mt-2 shadow-soft-sm">
          Back to Overview
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <p className="text-[13px] text-ink-2 mb-5">
        Draft an offer, let AI turn it into a formal letter, then submit — it goes to the admin&rsquo;s
        approval queue before it&rsquo;s sent.
      </p>

      {error && (
        <div className="bg-critical-wash text-critical text-[12.5px] rounded-sm px-3 py-2 mb-4">
          {error}
        </div>
      )}

      {step !== "review" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Candidate name">
              <input value={candidateName} onChange={(e) => setCandidateName(e.target.value)} className="input" />
            </Field>
            <Field label="Candidate email">
              <input
                type="email"
                value={candidateEmail}
                onChange={(e) => setCandidateEmail(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <Field label="Role">
            <input value={roleTitle} onChange={(e) => setRoleTitle(e.target.value)} className="input" />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Proposed total CTC (annual)">
              <input
                type="number"
                value={proposedCtc}
                onChange={(e) => setProposedCtc(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Currency">
              <input value={currency} onChange={(e) => setCurrency(e.target.value)} className="input" />
            </Field>
          </div>

          <div>
            <span className="block text-[12px] font-bold mb-1.5">Compensation breakdown</span>
            <div className="flex flex-col gap-2">
              {components.map((c, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    value={c.label}
                    onChange={(e) => updateComponent(idx, "label", e.target.value)}
                    className="input flex-1"
                    placeholder="e.g. Basic"
                  />
                  <input
                    type="number"
                    value={c.annual}
                    onChange={(e) => updateComponent(idx, "annual", e.target.value)}
                    className="input w-36"
                    placeholder="Annual"
                  />
                  {components.length > 1 && (
                    <button onClick={() => removeComponent(idx)} className="text-ink-muted p-1" aria-label="Remove">
                      <Icon name="x" className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={addComponent}
                className="border border-dashed border-border text-[12px] font-bold text-ink-muted rounded-sm px-3 py-1.5 self-start"
              >
                + Add component
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Notice period">
              <input value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} className="input" />
            </Field>
            <Field label="Proposed joining date">
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                className="input"
              />
            </Field>
          </div>
          <Field label="Notes for AI (optional)">
            <textarea
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              className="input min-h-[70px]"
              placeholder="Anything specific to mention in the letter…"
            />
          </Field>

          <button
            onClick={handlePolish}
            disabled={!candidateName || !roleTitle || step === "polishing"}
            className="bg-brand text-white text-[13px] font-bold px-4 py-2.5 rounded-sm disabled:opacity-50 self-start shadow-soft-sm"
          >
            {step === "polishing" ? "Polishing…" : "Polish with AI"}
          </button>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-4">
          {handshakeResult && (
            <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0 font-bold">
                  <Icon name="check" className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-emerald-950">
                      Employment Agreement & Digital Envelope Created
                    </h3>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold uppercase tracking-wider">
                      Ready to Sign
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    Formal legal contract envelope generated in Contracts &amp; eSign for <strong>{candidateName}</strong> ({candidateEmail}).
                  </p>

                  <div className="mt-3 flex items-center gap-2 bg-white border border-emerald-200 rounded-md p-2 text-xs">
                    <span className="text-slate-500 shrink-0 font-semibold">Sign URL:</span>
                    <span className="font-mono text-[11px] truncate flex-1 text-slate-800">
                      {handshakeResult.signUrl}
                    </span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(handshakeResult.signUrl);
                        setCopiedLink(true);
                        setTimeout(() => setCopiedLink(false), 2000);
                      }}
                      className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shrink-0 transition-colors"
                    >
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </button>
                  </div>

                  <div className="mt-3 flex items-center gap-2">
                    <a
                      href={`/sign/${handshakeResult.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 shadow-xs transition-colors"
                    >
                      <span>Open Candidate E-Sign Page</span>
                    </a>
                    <Link
                      href="/tools/contracts-esign"
                      className="px-3 py-1.5 rounded-md border border-emerald-300 text-emerald-900 hover:bg-emerald-100/60 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                    >
                      View in Contracts &amp; eSign
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="bg-surface border border-border rounded-md p-4 shadow-soft-sm">
            <div className="text-[11px] font-bold uppercase tracking-wider text-ink-muted mb-2">
              AI-drafted offer letter
            </div>
            <textarea
              value={polished}
              onChange={(e) => setPolished(e.target.value)}
              className="input min-h-[260px]"
            />
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <button
              onClick={handleHandshakeToContracts}
              disabled={isHandshaking || !candidateName || !candidateEmail}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-bold px-4 py-2.5 rounded-sm disabled:opacity-50 shadow-soft-sm flex items-center gap-1.5 transition-colors"
            >
              {isHandshaking ? "Generating Envelope…" : "✨ Send to Contracts & eSign"}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-brand text-white text-[13px] font-bold px-4 py-2.5 rounded-sm disabled:opacity-50 shadow-soft-sm"
            >
              {isSubmitting ? "Submitting…" : "Submit for approval"}
            </button>
            <button
              onClick={() => setStep("draft")}
              className="border border-border text-[13px] font-bold px-4 py-2.5 rounded-sm bg-surface"
            >
              Back to draft
            </button>
          </div>
        </div>
      )}

      <style jsx global>{`
        .input {
          width: 100%;
          border: 1px solid #e1e0d9;
          border-radius: 7px;
          padding: 10px 12px;
          font-size: 13.5px;
          outline: none;
          background: #fcfcfb;
        }
        .input:focus {
          border-color: #2a78d6;
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-bold mb-1.5">{label}</span>
      {children}
    </label>
  );
}
