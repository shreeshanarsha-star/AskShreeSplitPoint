"use client";

import { useEffect, useState } from "react";

const THEMES: { id: string; label: string; swatch: string }[] = [
  { id: "gold", label: "Gold", swatch: "#c9932e" },
  { id: "blue", label: "Blue", swatch: "#2563dc" },
  { id: "dark", label: "Dark", swatch: "#4b2f96" },
  { id: "teal", label: "Teal", swatch: "#149a80" },
  { id: "light", label: "Light", swatch: "linear-gradient(135deg,#ffffff 50%,#18181b 50%)" },
  { id: "onyx", label: "Onyx", swatch: "linear-gradient(135deg,#0b0b0d 50%,#f4f4f5 50%)" },
];

// Rendered inside the top bar's "Appearance" dropdown (TopbarStatus), so this
// is the list of colour swatches with names; six themes no longer fit as a
// row of bare dots.
export default function ThemeSwitcher() {
  const [active, setActive] = useState("gold");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") || "gold";
    setActive(THEMES.some((t) => t.id === current) ? current : "gold");
  }, []);

  function pick(id: string) {
    document.documentElement.setAttribute("data-theme", id);
    try {
      localStorage.setItem("askshree-theme", id);
    } catch {}
    setActive(id);
  }

  return (
    <div className="flex flex-col gap-0.5" role="radiogroup" aria-label="Theme">
      {THEMES.map((t) => {
        const selected = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={`${t.label} theme`}
            onClick={() => pick(t.id)}
            className={`w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-xs font-medium text-ink hover:bg-brand-wash transition-colors cursor-pointer ${
              selected ? "bg-brand-wash" : ""
            }`}
          >
            <span
              className="w-4 h-4 rounded-full border border-black/15 flex-shrink-0"
              style={{ background: t.swatch }}
            />
            <span className="flex-1 text-left">{t.label}</span>
            {selected && (
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                <path
                  d="M2.5 6.5 5 9l4.5-5.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </button>
        );
      })}
    </div>
  );
}
