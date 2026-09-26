import type { Metadata } from "next";
import OwnerAccessForm from "./OwnerAccessForm";

// Unlisted owner-only sign-in page. Deliberately not linked from any nav,
// footer, the "Sign in as..." switcher, or sitemap.ts -- reachable only by
// knowing this exact URL. Kept out of robots.txt on purpose too: a
// Disallow entry there would publish this exact path in a file every
// scanner fetches, which defeats the point. noindex/nofollow below is
// the safe version of the same idea -- it stops a search engine from
// listing this page IF it's ever found, without announcing it anywhere.
//
// This page's own real security is unchanged from /login: a real
// Supabase password check, gated to accounts with profiles.is_admin =
// true (see /api/auth/owner-session). The URL being unguessable only
// reduces who stumbles onto the door in the first place.
export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function OwnerAccessPage() {
  return <OwnerAccessForm />;
}
