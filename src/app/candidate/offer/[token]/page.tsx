"use client";

import { useEffect, useState, Suspense, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type ComponentItem = {
  label: string;
  annual: string | number;
};

type OfferData = {
  candidate: {
    id: string;
    name: string;
    email: string;
    stage: string;
    matchScore?: number | null;
    currentCompany?: string | null;
  };
  requisition: {
    id: string;
    reqNo: string;
    title: string;
    department: string;
    location: string;
  } | null;
  offer: {
    id: string;
    status: string;
    proposedCtcAnnual: number;
    currency: string;
    components: ComponentItem[];
    joiningDate: string;
    noticePeriod: string;
    letterText: string;
    signedAt?: string | null;
  };
  onboarding: {
    manager: string;
    reportingTime: string;
    orientationSchedule: string;
    itEquipment: string;
  };
};

export default function CandidateOfferPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full bg-page flex items-center justify-center">
          <div className="animate-spin text-brand text-2xl">✨</div>
        </div>
      }
    >
      <OfferContent />
    </Suspense>
  );
}

function OfferContent() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || "demo";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<OfferData | null>(null);

  const [activeView, setActiveView] = useState<"summary" | "agreement" | "sign">("summary");
  const [signatureType, setSignatureType] = useState<"typed" | "drawn">("typed");
  const [typedName, setTypedName] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSigned, setIsSigned] = useState(false);

  // Canvas drawing ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Load offer details
  useEffect(() => {
    async function loadOffer() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/candidate/offer?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (res.ok && json.ok && json.data) {
          setData(json.data);
          setTypedName(json.data.candidate.name);
          if (json.data.candidate.stage === "hired" || json.data.offer.status === "accepted") {
            setIsSigned(true);
          }
        } else {
          setError(json.error || "Unable to load executive offer package.");
        }
      } catch (err) {
        console.error("Failed to load offer data:", err);
        setError("Network error fetching offer package.");
      } finally {
        setLoading(false);
      }
    }

    loadOffer();
  }, [token]);

  // Canvas Drawing Handlers
  function startDrawing(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawn(true);

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#B45309"; // Luxury brand gold
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  }

  function stopDrawing() {
    setIsDrawing(false);
  }

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
  }

  async function handleAcceptAndSign() {
    if (!data) return;

    let signatureValue = typedName;
    if (signatureType === "drawn") {
      const canvas = canvasRef.current;
      if (!canvas || !hasDrawn) {
        alert("Please draw your signature on the pad before submitting.");
        return;
      }
      signatureValue = canvas.toDataURL("image/png");
    } else {
      if (!typedName.trim()) {
        alert("Please enter your full legal name.");
        return;
      }
    }

    if (!legalConsent) {
      alert("Please check the statutory acknowledgment box before submitting.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch("/api/candidate/offer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          signatureType,
          signatureValue,
          legalConsent: true,
        }),
      });

      const json = await res.json();
      if (res.ok && json.ok) {
        setIsSigned(true);
        setActiveView("summary");
      } else {
        alert(json.error || "Failed to submit signature.");
      }
    } catch (err) {
      console.error("Signing failed:", err);
      alert("Network error executing agreement.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDownloadOffer() {
    if (!data?.offer?.letterText) return;
    try {
      const content = `${data.offer.letterText}\n\n========================================\nDIGITAL EXECUTION CONFIRMATION\nStatus: ACCEPTED & DIGITALLY SIGNED\nSigner: ${typedName || data.candidate.name}\nTimestamp: ${new Date().toISOString()}\nPlatform: AskShree Autonomous Hiring Partner (https://www.askshree.com/)\n========================================\n`;
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `AskShree-Offer-${data.candidate.name.replace(/\s+/g, "_")}.txt`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Download failed:", e);
    }
  }

  return (
    <div className="h-screen w-full bg-page text-ink flex flex-col font-sans overflow-hidden select-none">
      {/* Universal Top Header */}
      <header className="h-14 border-b border-border bg-surface/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Logo height={26} showPunchline={true} />
          <span className="text-border">/</span>
          <div className="flex items-center gap-2">
            <span className="font-bold text-xs sm:text-sm text-ink font-display">
              Executive Offer &amp; Digital Acceptance
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
              Offer Agent
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data?.requisition && (
            <span className="text-[11px] text-ink-muted hidden md:inline font-medium">
              Role: <strong className="text-ink">{data.requisition.title}</strong>
            </span>
          )}
          <TopbarStatus />
        </div>
      </header>

      {/* Main Interactive Viewport — Zero Scrollbars Guaranteed */}
      <main className="flex-1 w-full max-w-4xl mx-auto p-4 sm:p-5 flex flex-col justify-center overflow-hidden">
        {loading && (
          <div className="p-8 text-center space-y-3 bg-surface border border-border rounded-2xl shadow-soft">
            <div className="w-10 h-10 mx-auto rounded-full bg-brand/10 border border-brand/20 animate-spin flex items-center justify-center text-brand">
              ✨
            </div>
            <p className="text-sm font-semibold text-ink">Retrieving Executive Offer Package...</p>
            <p className="text-xs text-ink-muted">Generating calibrated compensation specifications</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center space-y-4 bg-surface border border-rose-500/20 rounded-2xl shadow-soft">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold font-display text-ink">Offer Session Unavailable</h2>
            <p className="text-xs text-ink-muted max-w-md mx-auto">{error}</p>
            <Link
              href="/"
              className="inline-block px-4 py-2 rounded-xl bg-brand text-white text-xs font-bold shadow-soft hover:bg-brand-dark transition-colors"
            >
              Return to AskShree Home
            </Link>
          </div>
        )}

        {!loading && !error && data && (
          <div className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden flex flex-col justify-between max-h-[88vh]">
            {/* Offer Executive Banner */}
            <div className="bg-gradient-to-r from-brand-dark via-brand to-amber-700 p-4 sm:p-5 text-white shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                      Official Offer of Employment • {data.requisition?.reqNo || "R-22082604"}
                    </span>
                    {isSigned && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/40">
                        ✓ Digitally Signed &amp; Accepted
                      </span>
                    )}
                  </div>
                  <h1 className="text-base sm:text-lg font-bold font-display mt-0.5">
                    {data.requisition?.title || "Legal Counsel"}
                  </h1>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[10px] text-amber-200 block font-medium">Guaranteed Annual CTC</span>
                  <span className="text-base sm:text-lg font-bold font-display text-white">
                    {data.offer.currency} {Number(data.offer.proposedCtcAnnual).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* View Switcher Tabs */}
              <div className="mt-3 pt-3 border-t border-white/15 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveView("summary")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      activeView === "summary"
                        ? "bg-white text-brand font-bold shadow-soft-sm"
                        : "text-amber-100 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    1. Compensation &amp; Perks
                  </button>
                  <button
                    onClick={() => setActiveView("agreement")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                      activeView === "agreement"
                        ? "bg-white text-brand font-bold shadow-soft-sm"
                        : "text-amber-100 hover:text-white hover:bg-white/10"
                    }`}
                  >
                    2. Employment Agreement
                  </button>
                  {!isSigned && (
                    <button
                      onClick={() => setActiveView("sign")}
                      className={`px-3 py-1 rounded-lg font-semibold transition-all ${
                        activeView === "sign"
                          ? "bg-white text-brand font-bold shadow-soft-sm"
                          : "text-amber-100 hover:text-white hover:bg-white/10"
                      }`}
                    >
                      3. Digital Signature ✍️
                    </button>
                  )}
                </div>

                <div className="hidden sm:flex items-center gap-2 text-[11px] text-amber-200">
                  <span>Start Date: <strong className="text-white">{data.offer.joiningDate}</strong></span>
                  <span>•</span>
                  <span>Location: <strong className="text-white">{data.requisition?.location || "Remote"}</strong></span>
                </div>
              </div>
            </div>

            {/* View 1: Compensation & Onboarding Summary */}
            {activeView === "summary" && (
              <div className="p-4 sm:p-5 space-y-4">
                {isSigned && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl text-emerald-600 font-bold">🎉</span>
                      <div>
                        <h3 className="text-xs font-bold text-ink">
                          Welcome to AskShree! You are officially hired.
                        </h3>
                        <p className="text-[11px] text-ink-muted">
                          Your signed offer agreement has been counter-signed and archived in the company records.
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={handleDownloadOffer}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-[11px] font-bold shadow-soft hover:bg-emerald-700 transition-colors shrink-0"
                    >
                      📥 Download Agreement
                    </button>
                  </div>
                )}

                {/* Compensation Cards Grid */}
                <div>
                  <span className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider block mb-2">
                    Itemized Compensation Structure:
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {data.offer.components.map((comp, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-page border border-border flex flex-col justify-between"
                      >
                        <span className="text-[10px] text-ink-muted font-medium">{comp.label}</span>
                        <span className="text-xs sm:text-sm font-bold font-display text-ink mt-1">
                          {typeof comp.annual === "number"
                            ? `${data.offer.currency} ${comp.annual.toLocaleString()}`
                            : comp.annual}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits & Culture Badges */}
                <div>
                  <span className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider block mb-1.5">
                    Executive Perks &amp; Provisions:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "🏥 Comprehensive Family Medical Cover",
                      "📚 ₹1,50,000 Annual Learning Budget",
                      "💻 Apple M3 Max Hardware Setup",
                      "🌴 24 Days Flexible Annual Leave",
                      "🧘 Wellness & Mental Health Stipend",
                      "☕ Home Connectivity & Fiber Allowance",
                    ].map((perk, i) => (
                      <span
                        key={i}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-surface border border-border text-ink-2 shadow-soft-sm"
                      >
                        {perk}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Onboarding Briefing Card */}
                <div className="p-3.5 rounded-xl bg-brand-wash/40 border border-brand/20 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-brand block">
                      Day-One Briefing:
                    </span>
                    <span className="text-ink font-medium">
                      Reporting Time: <strong>{data.onboarding.reportingTime}</strong> • Reporting to: <strong>{data.onboarding.manager}</strong>
                    </span>
                  </div>

                  {!isSigned ? (
                    <button
                      onClick={() => setActiveView("sign")}
                      className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02]"
                    >
                      Proceed to Sign Offer ›
                    </button>
                  ) : (
                    <Link
                      href={`/candidate/status?id=${encodeURIComponent(data.candidate.id)}`}
                      className="px-4 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02]"
                    >
                      View Live Status in Portal ›
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* View 2: Full Formal Employment Agreement Letter */}
            {activeView === "agreement" && (
              <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider">
                    Formal Contract Stipulations:
                  </span>
                  <button
                    onClick={handleDownloadOffer}
                    className="text-[11px] text-brand font-bold hover:underline"
                  >
                    Download Copy (.txt)
                  </button>
                </div>

                <div className="p-4 rounded-xl bg-page border border-border text-xs text-ink font-mono whitespace-pre-wrap leading-relaxed max-h-[42vh] overflow-hidden select-text">
                  {data.offer.letterText}
                </div>

                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <button
                    onClick={() => setActiveView("summary")}
                    className="text-xs font-bold text-ink-muted hover:text-ink"
                  >
                    ‹ Back to Summary
                  </button>
                  {!isSigned && (
                    <button
                      onClick={() => setActiveView("sign")}
                      className="px-5 py-2 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02]"
                    >
                      Ready to Sign Digitally ›
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* View 3: Interactive Digital Signature Pad */}
            {activeView === "sign" && !isSigned && (
              <div className="p-4 sm:p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider">
                    Electronic Execution Pad:
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setSignatureType("typed")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        signatureType === "typed"
                          ? "bg-brand text-white shadow-soft-sm"
                          : "text-ink-muted hover:text-ink bg-page border border-border"
                      }`}
                    >
                      Type Name
                    </button>
                    <button
                      onClick={() => setSignatureType("drawn")}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        signatureType === "drawn"
                          ? "bg-brand text-white shadow-soft-sm"
                          : "text-ink-muted hover:text-ink bg-page border border-border"
                      }`}
                    >
                      Draw Signature
                    </button>
                  </div>
                </div>

                {/* Signature Box */}
                {signatureType === "typed" ? (
                  <div className="p-4 rounded-xl bg-page border border-border space-y-2">
                    <label className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider block">
                      Legal Signer Full Name:
                    </label>
                    <input
                      type="text"
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      className="w-full p-2.5 rounded-xl bg-surface border border-border text-sm text-ink focus:outline-none focus:border-brand font-semibold"
                    />
                    <div className="pt-2">
                      <span className="text-[10px] text-ink-muted block">Signature Preview:</span>
                      <p className="font-serif italic text-2xl text-brand py-1 px-2">
                        {typedName || data.candidate.name}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-page border border-border space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider block">
                        Draw your signature with mouse or finger:
                      </label>
                      <button
                        onClick={clearCanvas}
                        className="text-[10.5px] text-rose-500 font-bold hover:underline"
                      >
                        Clear Canvas
                      </button>
                    </div>
                    <div className="border border-dashed border-border rounded-xl bg-surface overflow-hidden">
                      <canvas
                        ref={canvasRef}
                        width={600}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-[120px] cursor-crosshair touch-none"
                      />
                    </div>
                  </div>
                )}

                {/* Statutory Acknowledgment Checkbox */}
                <label className="flex items-start gap-2.5 p-3 rounded-xl bg-surface border border-border cursor-pointer select-none text-xs">
                  <input
                    type="checkbox"
                    checked={legalConsent}
                    onChange={(e) => setLegalConsent(e.target.checked)}
                    className="mt-0.5 rounded border-border text-brand focus:ring-brand accent-brand cursor-pointer"
                  />
                  <span className="text-ink-2 leading-relaxed text-[11px]">
                    I, <strong>{typedName || data.candidate.name}</strong>, hereby formally accept the offer of employment with AskShree Technologies Inc. I acknowledge that my digital signature constitutes a legally valid and binding execution under applicable digital transactions and statutory directives.
                  </span>
                </label>

                {/* Execution Buttons */}
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <button
                    onClick={() => setActiveView("summary")}
                    className="text-xs font-bold text-ink-muted hover:text-ink"
                  >
                    ‹ Back to Offer Details
                  </button>

                  <button
                    onClick={handleAcceptAndSign}
                    disabled={!legalConsent || isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                  >
                    {isSubmitting ? "Executing Agreement..." : "Accept Employment Offer & Sign Digitally ›"}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
