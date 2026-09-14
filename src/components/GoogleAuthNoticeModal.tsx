"use client";

import { useState } from "react";

interface GoogleAuthNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GoogleAuthNoticeModal({
  isOpen,
  onClose,
}: GoogleAuthNoticeModalProps) {
  const [copied, setCopied] = useState(false);
  const redirectUri = "https://pesqeykpspvjqwljeubc.supabase.co/auth/v1/callback";
  const supabaseProvidersUrl = "https://supabase.com/dashboard/project/pesqeykpspvjqwljeubc/auth/providers";

  if (!isOpen) return null;

  function copyRedirectUri() {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(redirectUri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 selection:bg-brand-wash selection:text-brand">
      <div className="bg-surface border border-border rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-soft flex flex-col justify-between overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 15.9 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4c-7.5 0-14 4.2-17.7 10.7z"/>
                <path fill="#4CAF50" d="M24 44c5.5 0 10.4-1.9 14.1-5.1l-6.5-5.5C29.6 35.1 26.9 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.6 5.1C9.9 39.6 16.4 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.2 5.7l6.5 5.5C39.5 37.6 44 31.5 44 24c0-1.3-.1-2.7-.4-3.5z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink font-display m-0">
                  Google Sign-In Activation
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 border border-amber-500/30">
                  Setup Required
                </span>
              </div>
              <p className="text-xs text-ink-muted mt-0.5 m-0">
                Google provider is not yet enabled in your Supabase backend.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="w-7 h-7 rounded-lg border border-border hover:border-brand/40 text-ink-muted hover:text-ink flex items-center justify-center text-sm transition-all cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="py-3.5 space-y-3">
          <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 text-xs text-ink space-y-1.5">
            <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
              <span>⚡</span> Quick 2-Minute Activation Guide for Owner:
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-ink-muted leading-relaxed">
              <li>
                In <strong>Google Cloud Console</strong> &rarr; Credentials &rarr; Create OAuth Client ID (Web application).
              </li>
              <li>
                Set <strong>Authorized Redirect URI</strong> to:
                <div className="mt-1 flex items-center gap-2 bg-surface p-1.5 rounded-md border border-border">
                  <code className="text-[11px] text-ink font-mono flex-1 truncate select-all">
                    {redirectUri}
                  </code>
                  <button
                    type="button"
                    onClick={copyRedirectUri}
                    className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand text-white hover:bg-brand-dark transition-colors cursor-pointer"
                  >
                    {copied ? "Copied!" : "Copy URI"}
                  </button>
                </div>
              </li>
              <li>
                Open <strong>Supabase Auth &rarr; Providers &rarr; Google</strong>, toggle <strong>Enable</strong> to ON, paste your Google <strong>Client ID</strong> &amp; <strong>Client Secret</strong>, and click <strong>Save</strong>.
              </li>
            </ol>
          </div>

          <div className="p-3 rounded-xl bg-page border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] font-bold text-ink uppercase tracking-wider">
                Supabase Dashboard Direct Link
              </div>
              <div className="text-xs text-ink-muted mt-0.5">
                Project Ref: <span className="font-mono text-ink font-semibold">pesqeykpspvjqwljeubc</span>
              </div>
            </div>
            <a
              href={supabaseProvidersUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-brand/40 bg-brand/10 hover:bg-brand/20 text-brand transition-colors inline-flex items-center gap-1 cursor-pointer"
            >
              <span>Open Providers</span>
              <span className="text-[10px]">↗</span>
            </a>
          </div>

          <div className="text-xs text-ink-muted text-center pt-1">
            <strong>Ready to proceed now?</strong> Use your Email &amp; Password or one of our 1-Click Fast Demo accounts below.
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2 bg-brand text-white text-xs font-bold rounded-lg hover:bg-brand-dark transition-colors shadow-soft-sm cursor-pointer"
          >
            Sign in with Email / Demo Instead
          </button>
        </div>
      </div>
    </div>
  );
}
