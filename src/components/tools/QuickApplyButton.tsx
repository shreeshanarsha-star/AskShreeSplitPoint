"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import QuickApplyModal, { type QuickApplyJobInfo } from "./QuickApplyModal";

interface QuickApplyButtonProps {
  job: QuickApplyJobInfo;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  label?: string;
}

export default function QuickApplyButton({
  job,
  className = "",
  variant = "primary",
  label = "Quick Apply (Drop CV)",
}: QuickApplyButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const baseStyle =
    variant === "primary"
      ? "bg-brand hover:bg-brand-dark text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-button transition-all flex items-center gap-2"
      : variant === "secondary"
      ? "bg-brand-wash text-brand hover:bg-brand hover:text-white border border-brand/20 text-xs font-bold px-4 py-2 rounded-lg transition-all flex items-center gap-1.5"
      : "border border-border hover:border-brand/40 text-ink hover:text-brand bg-page text-xs font-semibold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5";

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`${baseStyle} ${className}`}
      >
        <Icon name="sparkle" size={13} />
        <span>{label}</span>
      </button>

      <QuickApplyModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        job={job}
      />
    </>
  );
}
