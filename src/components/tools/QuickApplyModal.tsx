"use client";

import { useState, useRef } from "react";
import Icon from "@/components/Icon";
import { createClient } from "@/lib/supabase/client";

export interface QuickApplyJobInfo {
  id: string;
  title: string;
  company?: string | null;
  location?: string | null;
  must_have_skills?: string[] | null;
}

interface QuickApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: QuickApplyJobInfo | null;
  onAppliedSuccess?: (jobId: string) => void;
}

type Step = "drop_cv" | "analyzing" | "edit_fields" | "submitting" | "success";

interface FormFields {
  fullName: string;
  phone: string;
  email: string;
  location: string;
  presentSalary: string;
  noticePeriod: string;
  qualification: string;
  currentOrganization: string;
  switchingReason: string;
}

const INITIAL_FIELDS: FormFields = {
  fullName: "",
  phone: "",
  email: "",
  location: "",
  presentSalary: "",
  noticePeriod: "30 Days",
  qualification: "",
  currentOrganization: "",
  switchingReason: "Career growth & new challenges",
};

export default function QuickApplyModal({
  isOpen,
  onClose,
  job,
  onAppliedSuccess,
}: QuickApplyModalProps) {
  const [step, setStep] = useState<Step>("drop_cv");
  const [fileName, setFileName] = useState<string>("");
  const [rawCvText, setRawCvText] = useState<string>("");
  const [resumeBase64, setResumeBase64] = useState<string>("");
  const [fields, setFields] = useState<FormFields>(INITIAL_FIELDS);
  const [error, setError] = useState<string | null>(null);

  // Result state
  const [matchScore, setMatchScore] = useState<number>(0);
  const [matchedSkills, setMatchedSkills] = useState<string[]>([]);

  // Optional post-apply account creation -- lets a candidate track this
  // application later without any separate signup flow. Purely optional;
  // skipping it just means they applied without a way to log back in.
  const [submittedCandidateId, setSubmittedCandidateId] = useState<string>("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);
  const [accountCreated, setAccountCreated] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen || !job) return null;

  async function handleFileProcess(file: File) {
    setError(null);
    setFileName(file.name);
    setStep("analyzing");

    try {
      // Read base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const res = reader.result as string;
          const base64 = res.split(",")[1] || "";
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);
      const base64Data = await base64Promise;
      setResumeBase64(base64Data);

      // Call Parse CV API
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/candidate/quick-apply/parse-cv", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Could not parse CV.");
      }

      const p = data.profile;
      setRawCvText(p.rawText || "");
      setFields({
        fullName: p.fullName || "",
        phone: p.phone || "",
        email: p.email || "",
        location: p.location || "",
        presentSalary: p.presentSalary || "",
        noticePeriod: p.noticePeriod || "30 Days",
        qualification: p.qualification || "",
        currentOrganization: p.currentOrganization || "",
        switchingReason: p.switchingReason || "Career growth & new challenges",
      });

      setStep("edit_fields");
    } catch (err) {
      setError(err instanceof Error ? err.message : "CV extraction failed. You can enter details manually.");
      setStep("edit_fields");
    }
  }

  async function handleSubmitApplication(e: React.FormEvent) {
    e.preventDefault();
    if (!fields.fullName.trim() || !fields.email.trim()) {
      setError("Full Name and Email are required.");
      return;
    }

    setStep("submitting");
    setError(null);

    try {
      const res = await fetch("/api/candidate/quick-apply/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobPostingId: job?.id,
          ...fields,
          resumeText: rawCvText,
          resumeBase64,
          fileName,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Submission failed.");
      }

      setMatchScore(data.matchScore || 80);
      setMatchedSkills(data.matchedSkills || []);
      setSubmittedCandidateId(data.applicationId || "");
      setStep("success");
      if (job?.id && onAppliedSuccess) {
        onAppliedSuccess(job.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit application.");
      setStep("edit_fields");
    }
  }

  async function handleCreateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!accountPassword || accountPassword.length < 6 || !fields.email) return;
    setAccountSubmitting(true);
    setAccountError(null);

    try {
      const res = await fetch("/api/candidate/quick-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: fields.email,
          password: accountPassword,
          name: fields.fullName,
          candidateId: submittedCandidateId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAccountError(data.error || "Failed to create your account.");
        return;
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: fields.email.toLowerCase().trim(),
        password: accountPassword,
      });
      if (signInError) {
        setAccountError(signInError.message);
        return;
      }
      setAccountCreated(true);
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : "Failed to create your account.");
    } finally {
      setAccountSubmitting(false);
    }
  }

  function handleReset() {
    setStep("drop_cv");
    setFields(INITIAL_FIELDS);
    setFileName("");
    setRawCvText("");
    setResumeBase64("");
    setError(null);
    setSubmittedCandidateId("");
    setAccountPassword("");
    setAccountError(null);
    setAccountCreated(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-border rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-subtle/30">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-brand-wash text-brand border border-brand/20">
                Quick Apply
              </span>
              <h3 className="text-[17px] font-bold text-ink m-0 truncate max-w-md">
                {job.title}
              </h3>
            </div>
            <p className="text-[12px] text-ink-muted mt-0.5">
              {job.company || "AskShree Partner"} • {job.location || "Remote"}
            </p>
          </div>
          <button
            onClick={handleReset}
            className="text-ink-muted hover:text-ink p-1 rounded-md transition-colors"
            title="Close"
          >
            <Icon name="x" className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto scrollbar-none flex-1">
          {error && (
            <div className="mb-4 p-3 text-[12.5px] rounded bg-critical-wash text-critical border border-critical/20 flex items-center gap-2">
              <Icon name="alert-triangle" className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: DROP CV */}
          {step === "drop_cv" && (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files?.[0];
                  if (file) handleFileProcess(file);
                }}
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-border hover:border-brand/60 rounded-xl p-8 bg-subtle/20 hover:bg-brand-wash/10 cursor-pointer transition-all flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-full bg-brand-wash text-brand flex items-center justify-center shadow-soft-sm">
                  <Icon name="sparkle" className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-[15px] font-bold text-ink m-0">
                    Drop your CV / Resume here
                  </p>
                  <p className="text-[12.5px] text-ink-muted mt-1">
                    Supports PDF, DOCX, or TXT up to 10MB
                  </p>
                </div>
                <button
                  type="button"
                  className="mt-2 bg-brand text-white text-[12.5px] font-bold px-4 py-2 rounded-lg shadow-sm hover:opacity-95 transition-opacity"
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileProcess(file);
                  }}
                />
              </div>

              <div className="mt-6 flex items-center gap-2 text-[12px] text-ink-muted">
                <Icon name="check" className="w-4 h-4 text-emerald-500" />
                <span>AI will automatically extract your 9 profile details for instant verification</span>
              </div>
            </div>
          )}

          {/* STEP 2: ANALYZING SPINNER */}
          {step === "analyzing" && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border-3 border-brand/30 border-t-brand rounded-full animate-spin mb-4" />
              <h4 className="text-[16px] font-bold text-ink m-0">
                Shree AI is extracting your profile details...
              </h4>
              <p className="text-[13px] text-ink-muted mt-1 max-w-sm">
                Parsing name, contact, salary, notice period, qualification & current company from <span className="font-semibold text-ink">{fileName}</span>
              </p>
            </div>
          )}

          {/* STEP 3: EDIT 9 FIELDS */}
          {step === "edit_fields" && (
            <form onSubmit={handleSubmitApplication} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-border">
                <span className="text-[12px] font-semibold text-ink-muted">
                  Auto-extracted from <span className="text-ink font-bold">{fileName || "CV"}</span>. Please review & verify:
                </span>
                <button
                  type="button"
                  onClick={() => setStep("drop_cv")}
                  className="text-[11.5px] font-bold text-brand hover:underline"
                >
                  Re-upload CV
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Full Name */}
                <div>
                  <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={fields.fullName}
                    onChange={(e) => setFields({ ...fields, fullName: e.target.value })}
                    placeholder="e.g. John Doe"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {/* 2. Phone */}
                <div>
                  <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={fields.phone}
                    onChange={(e) => setFields({ ...fields, phone: e.target.value })}
                    placeholder="e.g. +1 555-0199"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {/* 3. Email */}
                <div>
                  <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={fields.email}
                    onChange={(e) => setFields({ ...fields, email: e.target.value })}
                    placeholder="e.g. john@example.com"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {/* 4. Location */}
                <div>
                  <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                    Current Location
                  </label>
                  <input
                    type="text"
                    value={fields.location}
                    onChange={(e) => setFields({ ...fields, location: e.target.value })}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {/* 5. Present Salary */}
                <div>
                  <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                    Present Salary / CTC
                  </label>
                  <input
                    type="text"
                    value={fields.presentSalary}
                    onChange={(e) => setFields({ ...fields, presentSalary: e.target.value })}
                    placeholder="e.g. $130,000 / 18 LPA"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {/* 6. Notice Period */}
                <div>
                  <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                    Notice Period
                  </label>
                  <input
                    type="text"
                    value={fields.noticePeriod}
                    onChange={(e) => setFields({ ...fields, noticePeriod: e.target.value })}
                    placeholder="e.g. Immediate / 30 Days"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {/* 7. Qualification */}
                <div>
                  <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                    Highest Qualification
                  </label>
                  <input
                    type="text"
                    value={fields.qualification}
                    onChange={(e) => setFields({ ...fields, qualification: e.target.value })}
                    placeholder="e.g. B.Tech Computer Science"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                  />
                </div>

                {/* 8. Current Organization */}
                <div>
                  <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                    Current Organization
                  </label>
                  <input
                    type="text"
                    value={fields.currentOrganization}
                    onChange={(e) => setFields({ ...fields, currentOrganization: e.target.value })}
                    placeholder="e.g. Acme Corp"
                    className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                  />
                </div>
              </div>

              {/* 9. Switching Reason */}
              <div>
                <label className="block text-[11.5px] font-bold text-ink uppercase tracking-wide mb-1">
                  Reason for Switching
                </label>
                <textarea
                  rows={2}
                  value={fields.switchingReason}
                  onChange={(e) => setFields({ ...fields, switchingReason: e.target.value })}
                  placeholder="e.g. Seeking high-impact engineering ownership and career progression"
                  className="w-full text-[13px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none resize-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-border">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 text-[12.5px] font-bold text-ink-muted hover:text-ink transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-brand text-white text-[12.5px] font-bold px-6 py-2.5 rounded-lg shadow-sm hover:opacity-95 transition-opacity flex items-center gap-2"
                >
                  <Icon name="sparkle" className="w-4 h-4" />
                  <span>Submit Application</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUBMITTING */}
          {step === "submitting" && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 border-3 border-brand/30 border-t-brand rounded-full animate-spin mb-4" />
              <h4 className="text-[16px] font-bold text-ink m-0">
                Evaluating match against {job.title}...
              </h4>
              <p className="text-[13px] text-ink-muted mt-1">
                Calculating skill alignment, qualification score, and saving your application.
              </p>
            </div>
          )}

          {/* STEP 5: SUCCESS & INSTANT MATCH SCORE */}
          {step === "success" && (
            <div className="py-6 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-3">
                <Icon name="check" className="w-8 h-8" />
              </div>

              <h4 className="text-[20px] font-bold text-ink m-0">
                Application Submitted!
              </h4>
              <p className="text-[13.5px] text-ink-muted mt-1 max-w-md">
                Your application has landed in the hiring team&apos;s requisition dashboard.
              </p>

              {/* Match Score Card */}
              <div className="mt-5 p-4 rounded-xl border border-brand/30 bg-brand-wash/20 w-full max-w-md text-left">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-bold uppercase tracking-wider text-ink-muted">
                    AI Calibration Score
                  </span>
                  <span className="text-[18px] font-bold text-brand">
                    {matchScore}% Match
                  </span>
                </div>
                {matchedSkills.length > 0 && (
                  <div className="mt-2">
                    <span className="text-[11px] font-semibold text-ink-muted block mb-1">
                      Matched Skills:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {matchedSkills.map((sk) => (
                        <span
                          key={sk}
                          className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                        >
                          {sk}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Optional: track this application later. Skipping is fine --
                  applying doesn't require an account. */}
              {!accountCreated ? (
                <form
                  onSubmit={handleCreateAccount}
                  className="mt-5 p-4 rounded-xl border border-border bg-subtle/20 w-full max-w-md text-left space-y-2"
                >
                  <span className="text-[12px] font-bold text-ink block">
                    Want to track this application?
                  </span>
                  <p className="text-[11.5px] text-ink-muted m-0">
                    Set a password for {fields.email} to check status anytime -- optional, you can skip this.
                  </p>
                  {accountError && (
                    <p className="text-[11.5px] text-critical m-0">{accountError}</p>
                  )}
                  <div className="flex gap-2">
                    <input
                      type="password"
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      placeholder="Set a password"
                      minLength={6}
                      className="flex-1 text-[12.5px] px-3 py-2 rounded-lg border border-border bg-page text-ink focus:border-brand focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={accountSubmitting || accountPassword.length < 6}
                      className="text-[12px] font-bold text-white bg-brand px-3 py-2 rounded-lg disabled:opacity-50 hover:opacity-95 transition-opacity"
                    >
                      {accountSubmitting ? "…" : "Save"}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="mt-5 p-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950/20 dark:border-emerald-800 text-[12.5px] text-emerald-700 dark:text-emerald-300 w-full max-w-md">
                  You&apos;re logged in -- you can check this application anytime from your candidate hub.
                </div>
              )}

              <button
                type="button"
                onClick={handleReset}
                className="mt-4 bg-ink text-surface text-[12.5px] font-bold px-6 py-2.5 rounded-lg shadow-sm hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
