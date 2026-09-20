/**
 * JobPostingTemplate.tsx
 *
 * Fixed-section-order job posting template. Renders every posting consistently
 * using AskShree design tokens (alabaster canvas, gold #B45309).
 * Web-only — no PDF/DOCX rendering.
 *
 * Section order (per Phase 3 spec):
 * 1. Header: company logo/name, title | function, location, work mode, type
 * 2. WHO WE ARE
 * 3. OUR SUCCESS STORIES
 * 4. WHY JOIN US
 * 5. WHAT YOU WILL DO (bullets)
 * 6. WHAT YOU WILL BRING: CORE STRENGTHS + ADDITIONAL STRENGTHS boxes
 * 7. HOW YOU GROW WITH US
 * 8. Footer band: tagline, careers email, website, social icons
 *
 * Content rules:
 * - When hide_company_name is true, logo and name are replaced by "Confidential".
 * - Blocks 5 & 6 fill from the requisition's eligibility_criteria JSON.
 * - All blocks are independently editable (isEditable prop) via onChange callbacks.
 *
 * NOTE: organizations table has: id, name, status, plan — NO logo or website
 * columns exist in the live schema (2026-09-19 snapshot). When org profile
 * columns are added in Phase 5, pass companyLogoUrl and companyWebsite here.
 * Until then, sensible editable defaults are used.
 */

import React from "react";
import Icon from "@/components/Icon";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface JobPostingTemplateContent {
  who_we_are?: string;
  success_stories?: string;
  why_join_us?: string;
  what_you_will_do?: string;
  core_strengths?: string;
  additional_strengths?: string;
  how_you_grow?: string;
}

export interface JobPostingTemplateProps {
  // Requisition-level data
  title: string;
  department?: string | null;
  location?: string | null;
  workMode?: string | null;
  employmentType?: string | null;

  // Company / org profile
  companyName?: string | null;
  companyLogoUrl?: string | null; // TODO (Phase 5): populate from org profile
  companyWebsite?: string | null; // TODO (Phase 5): populate from org profile
  careersEmail?: string | null;    // TODO (Phase 5): populate from org profile

  // Skills (from eligibility_criteria JSON)
  coreStrengthsList?: string[];
  additionalStrengthsList?: string[];

  // Posting content blocks
  content?: JobPostingTemplateContent;

  // Confidentiality
  hideCompanyName?: boolean;

  // Editing mode (Recruiter "Post to Boards" preview)
  isEditable?: boolean;
  onContentChange?: (updated: JobPostingTemplateContent) => void;
}

// ---------------------------------------------------------------------------
// Section wrapper
// ---------------------------------------------------------------------------

function Section({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-2.5 ${className}`}>
      <h2 className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.12em] text-brand border-b border-brand/30 pb-1.5 font-display">
        {title}
      </h2>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable block
// ---------------------------------------------------------------------------

function ContentBlock({
  value,
  placeholder,
  isEditable,
  onChange,
  className = "",
  multiline = true,
}: {
  value?: string | null;
  placeholder: string;
  isEditable?: boolean;
  onChange?: (v: string) => void;
  className?: string;
  multiline?: boolean;
}) {
  const baseClass = `w-full text-[13.5px] sm:text-[14px] text-ink-2 leading-relaxed whitespace-pre-wrap ${className}`;

  if (isEditable) {
    return (
      <textarea
        rows={multiline ? 4 : 2}
        value={value ?? ""}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className="w-full text-[13.5px] sm:text-[14px] text-ink leading-relaxed p-2.5 border border-dashed border-brand/30 rounded-xl bg-brand-wash/10 focus:outline-none focus:border-brand/60 resize-none"
      />
    );
  }

  if (!value?.trim()) return null;
  return <p className={baseClass}>{value}</p>;
}

// ---------------------------------------------------------------------------
// Skill pill
// ---------------------------------------------------------------------------

function SkillPill({
  skill,
  variant,
}: {
  skill: string;
  variant: "required" | "preferred";
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
        variant === "required"
          ? "bg-brand-wash text-brand border-brand/30"
          : "bg-page text-ink-2 border-border"
      }`}
    >
      {variant === "required" && (
        <span className="w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />
      )}
      {skill}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Template component
// ---------------------------------------------------------------------------

export default function JobPostingTemplate({
  title,
  department,
  location,
  workMode,
  employmentType,
  companyName,
  companyLogoUrl,
  companyWebsite,
  careersEmail,
  coreStrengthsList = [],
  additionalStrengthsList = [],
  content = {},
  hideCompanyName = false,
  isEditable = false,
  onContentChange,
}: JobPostingTemplateProps) {
  // Resolved company display
  const displayName = hideCompanyName ? "Confidential" : (companyName || "AskShree");
  const displayEmail = hideCompanyName ? null : (careersEmail || "careers@askshree.com");
  const displayWebsite = hideCompanyName ? null : (companyWebsite || "https://www.askshree.com");

  function updateContent(key: keyof JobPostingTemplateContent, val: string) {
    onContentChange?.({ ...content, [key]: val });
  }

  // Parse what_you_will_do into bullet lines
  const doLines = (content.what_you_will_do || "")
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter(Boolean);

  return (
    <article className="bg-surface border border-border rounded-2xl shadow-soft overflow-hidden">
      {/* ── Section 1: Header ── */}
      <header className="px-6 sm:px-8 py-6 bg-gradient-to-br from-brand-wash/30 to-page border-b border-border">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Company logo / confidential badge */}
            {!hideCompanyName && companyLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={companyLogoUrl}
                alt={displayName}
                className="w-12 h-12 rounded-xl object-contain border border-border shadow-soft-sm"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-brand flex items-center justify-center text-white flex-shrink-0">
                {hideCompanyName ? (
                  <Icon name="briefcase" size={22} />
                ) : (
                  <span className="font-bold font-display text-lg leading-none">
                    {displayName.slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-ink-muted m-0">
                {displayName}
              </p>
              <h1 className="text-xl sm:text-2xl font-bold text-ink font-display tracking-tight mt-0.5 m-0">
                {title}
              </h1>
            </div>
          </div>

          {/* Meta tags */}
          <div className="flex flex-wrap gap-1.5">
            {[
              department,
              location,
              workMode && workMode !== location ? workMode : null,
              employmentType,
            ]
              .filter(Boolean)
              .map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-page border border-border text-ink-2"
                >
                  {tag}
                </span>
              ))}
          </div>
        </div>
      </header>

      <div className="px-6 sm:px-8 py-7 space-y-8">
        {/* ── Section 2: WHO WE ARE ── */}
        <Section title="Who We Are">
          <ContentBlock
            value={content.who_we_are}
            placeholder="Describe the company mission, culture, and what makes you unique..."
            isEditable={isEditable}
            onChange={(v) => updateContent("who_we_are", v)}
          />
        </Section>

        {/* ── Section 3: OUR SUCCESS STORIES ── */}
        <Section title="Our Success Stories">
          <ContentBlock
            value={content.success_stories}
            placeholder="Share 2-3 key milestones, customer wins, or team achievements..."
            isEditable={isEditable}
            onChange={(v) => updateContent("success_stories", v)}
          />
        </Section>

        {/* ── Section 4: WHY JOIN US ── */}
        <Section title="Why Join Us">
          <ContentBlock
            value={content.why_join_us}
            placeholder="What makes this opportunity unique? Growth, impact, culture..."
            isEditable={isEditable}
            onChange={(v) => updateContent("why_join_us", v)}
          />
        </Section>

        {/* ── Section 5: WHAT YOU WILL DO ── */}
        <Section title="What You Will Do">
          {isEditable ? (
            <ContentBlock
              value={content.what_you_will_do}
              placeholder={"List responsibilities, one per line:\n- Own end-to-end delivery of...\n- Partner with..."}
              isEditable
              onChange={(v) => updateContent("what_you_will_do", v)}
            />
          ) : doLines.length > 0 ? (
            <ul className="space-y-2 pl-0.5">
              {doLines.map((line, i) => (
                <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-ink-2">
                  <span className="text-brand font-bold mt-0.5 flex-shrink-0">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          ) : null}
        </Section>

        {/* ── Section 6: WHAT YOU WILL BRING ── */}
        {(coreStrengthsList.length > 0 || additionalStrengthsList.length > 0 || isEditable) && (
          <Section title="What You Will Bring">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-page border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-display">
                  Core Strengths{" "}
                  <span className="text-[10px] font-semibold text-brand bg-brand-wash px-1.5 py-0.5 rounded ml-1">
                    Required
                  </span>
                </h3>
                {isEditable ? (
                  <ContentBlock
                    value={content.core_strengths}
                    placeholder={"One skill per line:\n- TypeScript\n- System Design"}
                    isEditable
                    onChange={(v) => updateContent("core_strengths", v)}
                    multiline
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {coreStrengthsList.map((s) => (
                      <SkillPill key={s} skill={s} variant="required" />
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-page border border-border rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-ink font-display">
                  Additional Strengths
                </h3>
                {isEditable ? (
                  <ContentBlock
                    value={content.additional_strengths}
                    placeholder={"One skill per line:\n- GraphQL\n- Docker"}
                    isEditable
                    onChange={(v) => updateContent("additional_strengths", v)}
                    multiline
                  />
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {additionalStrengthsList.map((s) => (
                      <SkillPill key={s} skill={s} variant="preferred" />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </Section>
        )}

        {/* ── Section 7: HOW YOU GROW WITH US ── */}
        <Section title="How You Grow With Us">
          <ContentBlock
            value={content.how_you_grow}
            placeholder="Mentorship, career ladder, learning budget, promotion cadence..."
            isEditable={isEditable}
            onChange={(v) => updateContent("how_you_grow", v)}
          />
        </Section>
      </div>

      {/* ── Section 8: Footer band ── */}
      <footer className="px-6 sm:px-8 py-5 bg-gradient-to-br from-brand/5 to-page border-t border-border">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-0.5">
            <p className="text-xs font-bold text-brand font-display tracking-tight m-0">
              {hideCompanyName ? "Join a great team" : `Join ${displayName}`}
            </p>
            <p className="text-[11px] text-ink-muted m-0">
              AI-powered hiring, human at heart.
            </p>
          </div>

          {!hideCompanyName && (
            <div className="flex items-center gap-3 text-[11.5px] text-ink-muted">
              {displayEmail && (
                <a
                  href={`mailto:${displayEmail}`}
                  className="flex items-center gap-1.5 hover:text-brand transition-colors"
                >
                  <Icon name="chat" size={13} />
                  <span>{displayEmail}</span>
                </a>
              )}
              {displayWebsite && (
                <a
                  href={displayWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 hover:text-brand transition-colors"
                >
                  <Icon name="sparkle" size={13} />
                  <span>askshree.com</span>
                </a>
              )}
            </div>
          )}
        </div>
      </footer>
    </article>
  );
}