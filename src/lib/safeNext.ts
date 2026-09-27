// Only allow same-site relative paths as a post-login "next" target, so a
// crafted ?next= can't bounce a freshly signed-in user to another site.
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
