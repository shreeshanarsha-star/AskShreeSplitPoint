"use client";

import { useState } from "react";
import ShareToEarnModal, { ShareJob } from "./ShareToEarnModal";

interface JobShareButtonProps {
  job: ShareJob;
  variant?: "pill" | "button" | "card";
  className?: string;
}

export default function JobShareButton({
  job,
  variant = "button",
  className = "",
}: JobShareButtonProps) {
  const [showModal, setShowModal] = useState(false);

  if (variant === "pill") {
    return (
      <>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          title="Share to earn credits for AI CV consultation, ATS builder, and more"
          className={`h-7 px-2.5 text-[11.5px] font-semibold rounded-xl border bg-surface hover:bg-brand-wash/40 border-border hover:border-brand/40 text-ink-2 hover:text-brand transition-all flex items-center gap-1 shadow-soft-sm cursor-pointer ${className}`}
        >
          <span>🎁 Share & Earn</span>
        </button>
        <ShareToEarnModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          job={job}
        />
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setShowModal(true);
        }}
        title="Share role with peers to earn credits for AI CV Consultation, ATS Builder, and more"
        className={`px-4 py-2 rounded-xl text-xs font-bold border border-brand/30 bg-brand-wash hover:bg-brand/25 text-brand hover:text-brand-dark transition-all flex items-center gap-1.5 shadow-soft-sm ${className}`}
      >
        <span>🎁 Share & Earn Credits</span>
      </button>
      <ShareToEarnModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        job={job}
      />
    </>
  );
}
