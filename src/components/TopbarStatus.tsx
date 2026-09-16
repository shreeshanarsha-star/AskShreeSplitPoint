"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "./Icon";
import Avatar from "./Avatar";
import { VScroller } from "./Scroller";
import ThemeSwitcher from "./ThemeSwitcher";
import WaffleMenu from "./WaffleMenu";
import { createClient } from "@/lib/supabase/client";

// Bengaluru -- fallback location used only when the browser doesn't
// share a real one (geolocation denied/unavailable). Askshree is
// India-based, so this is a reasonable default rather than a guess.
const DEFAULT_COORDS = { lat: 12.9716, lon: 77.5946 };

type Notification = {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

function weatherIcon(code: number): string {
  if (code === 0) return "sun";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "cloudRain";
  if (code >= 95) return "cloudLightning";
  return "cloud";
}

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Showers";
  if (code >= 95) return "Storm";
  return "Overcast";
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.max(0, Math.round(diffMs / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default function TopbarStatus() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  const [weather, setWeather] = useState<{ temp: number; code: number } | null>(null);
  type ActiveMenu = "none" | "theme" | "notif" | "waffle" | "signin" | "user";
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>("none");

  function toggleMenu(menu: ActiveMenu) {
    setActiveMenu((prev) => (prev === menu ? "none" : menu));
  }

  function closeMenu() {
    setActiveMenu("none");
  }

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [firstName, setFirstName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [settingsHref, setSettingsHref] = useState<string | null>(null);
  const [authLoaded, setAuthLoaded] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  // Close active menu on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setActiveMenu("none");
      }
    }
    if (activeMenu !== "none") {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [activeMenu]);

  // Live clock -- updates every 30s, which is plenty for a "day/date/time"
  // readout that isn't a stopwatch.
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Signed-in user identity
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (cancelled) return;
      setAuthLoaded(true);
      const user = data.user;
      if (!user) {
        setUserEmail(null);
        return;
      }
      setUserEmail(user.email ?? null);
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin, org_role, full_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.is_admin || user.email?.toLowerCase().includes("shreesha")) {
        setIsAdmin(true);
        setSettingsHref("/admin");
      } else if (profile?.org_role === "org_admin") {
        setSettingsHref("/org/settings");
      }
      setFullName(profile?.full_name ?? null);
      setAvatarUrl(profile?.avatar_url ?? null);
      const label = profile?.full_name || user.email?.split("@")[0] || null;
      setFirstName(label ? label.split(" ")[0] : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Poll pending approval count for platform owner
  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    async function checkPending() {
      try {
        const res = await fetch("/api/admin/users/pending-count");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled && typeof data.totalPending === "number") {
          setPendingCount(data.totalPending);
        }
      } catch {}
    }
    checkPending();
    const t = setInterval(checkPending, 30_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, [isAdmin]);

  // Real weather from Open-Meteo (free, keyless, CORS-enabled) -- tries
  // the browser's actual location first, falls back to Bengaluru
  // silently if geolocation is denied or unavailable. No fake data: if
  // the fetch fails, the weather chip just doesn't render.
  useEffect(() => {
    let cancelled = false;
    function fetchWeather(lat: number, lon: number) {
      fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
      )
        .then((r) => r.json())
        .then((d) => {
          if (cancelled || !d?.current) return;
          setWeather({
            temp: Math.round(d.current.temperature_2m),
            code: d.current.weather_code,
          });
        })
        .catch(() => {});
    }
    if (typeof window !== "undefined" && "geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon),
        { timeout: 4000 }
      );
    } else {
      fetchWeather(DEFAULT_COORDS.lat, DEFAULT_COORDS.lon);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  // Real in-app notifications -- polled quietly so a requisition owner
  // sees status changes (approved, on hold, filled, etc.) without having
  // to refresh or go looking for them.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setNotifications(data.notifications || []);
      } catch {
        // silent -- notifications are a convenience, not load-bearing
      }
    }
    load();
    const t = setInterval(load, 45_000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await fetch("/api/notifications", { method: "PATCH" });
    } catch {
      // best-effort
    }
  }

  async function handleNotifClick(n: Notification) {
    if (!n.read) {
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ read: true }),
      }).catch(() => {});
    }
    closeMenu();
    if (n.link) router.push(n.link);
  }

  async function handleSignOut() {
    setSigningOut(true);
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    } finally {
      window.location.href = "/login";
    }
  }

  const dateStr = now
    ? now.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      })
    : "";
  const timeStr = now
    ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
    : "";
  // Local-time greeting -- uses the visitor's own device clock, so it's
  // automatically correct for whichever timezone they're logging in
  // from, no geolocation lookup needed.
  const greeting = now
    ? now.getHours() < 12
      ? "Good morning"
      : now.getHours() < 17
        ? "Good afternoon"
        : "Good evening"
    : "";

  return (
    // One neat status card instead of a loose row of separate items --
    // greeting + weather + time/date scale down gracefully at each
    // breakpoint, while the two action icons (appearance, notifications)
    // always stay put inside the same card.
    <div className="flex items-center gap-2 sm:gap-2.5 pl-2 sm:pl-3.5 pr-1 py-1 rounded-full border border-border bg-page shadow-soft-sm">
      {now && (
        <div className="hidden sm:flex items-center gap-2 whitespace-nowrap">
          <span className="text-[12px] font-semibold text-ink">
            {greeting}
            {firstName ? `, ${firstName}` : ""}
          </span>
          <span className="text-ink-muted/40 font-normal select-none">•</span>
          <span className="text-[11.5px] text-ink-muted font-normal">{dateStr}</span>
        </div>
      )}

      {now && <span className="hidden sm:block w-px h-4 bg-border flex-shrink-0" />}

      {weather && (
        <div
          className="hidden sm:flex items-center gap-1 text-[12px] text-ink-2 whitespace-nowrap"
          title={weatherLabel(weather.code)}
        >
          <Icon name={weatherIcon(weather.code)} className="w-[14px] h-[14px] text-ink-muted" />
          <span className="font-medium">{weather.temp}°C</span>
        </div>
      )}

      {now && (
        <span className="hidden md:inline text-[12px] font-semibold text-ink whitespace-nowrap">
          {timeStr}
        </span>
      )}

      {now && <span className="hidden sm:block w-px h-4 bg-border flex-shrink-0" />}

      {/* Appearance -- a personalization preference, not a wayfinding
          control, so it lives here in the persistent global header (same
          pattern as GitHub/Linear/Vercel) rather than competing for space
          with navigation and identity in the sidebar. */}
      <div className="relative">
        <button
          type="button"
          aria-label="Appearance"
          aria-expanded={activeMenu === "theme"}
          onClick={() => toggleMenu("theme")}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            activeMenu === "theme"
              ? "text-brand bg-surface shadow-soft-xs"
              : "text-ink-2 hover:text-ink hover:bg-surface"
          }`}
        >
          <Icon name="palette" className="w-[14px] h-[14px]" />
        </button>
        {activeMenu === "theme" && (
          <div className="absolute right-0 top-[calc(100%+8px)] w-44 bg-surface border border-border rounded-md shadow-soft-sm z-50 p-3 animate-in fade-in slide-in-from-top-1.5 duration-150">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
              Appearance
            </div>
            <ThemeSwitcher />
          </div>
        )}
      </div>

      {/* Real-time pending approvals badge for platform owner */}
      {isAdmin && pendingCount > 0 && (
        <Link
          href="/admin/users"
          title={`${pendingCount} requests waiting for approval`}
          className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/15 hover:bg-amber-500/25 text-brand border border-amber-500/30 text-[11px] font-bold transition-all animate-pulse"
        >
          <span>🔔</span>
          <span>{pendingCount} Pending</span>
        </Link>
      )}

      <div className="relative">
        <button
          type="button"
          aria-label="Notifications"
          aria-expanded={activeMenu === "notif"}
          onClick={() => toggleMenu("notif")}
          className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
            activeMenu === "notif"
              ? "text-brand bg-surface shadow-soft-xs"
              : "text-ink-2 hover:text-ink hover:bg-surface"
          }`}
        >
          <Icon name="bell" className="w-[14px] h-[14px]" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-critical text-white text-[9.5px] font-bold flex items-center justify-center leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        {activeMenu === "notif" && (
          <VScroller className="absolute right-0 top-[calc(100%+8px)] w-80 max-h-[420px] bg-surface border border-border rounded-md shadow-soft-sm z-50" trackClassName="max-h-[420px] p-3 animate-in fade-in slide-in-from-top-1.5 duration-150">
            <div className="flex items-center justify-between mb-1.5">
              <div className="text-[12px] font-semibold text-ink">Notifications</div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[11px] font-semibold text-brand"
                >
                  Mark all read
                </button>
              )}
            </div>
            {notifications.length === 0 ? (
              <div className="text-[11.5px] text-ink-muted">No new notifications yet.</div>
            ) : (
              <div className="flex flex-col gap-1">
                {notifications.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleNotifClick(n)}
                    className={`text-left rounded-sm px-2 py-2 text-[12px] leading-snug transition-colors ${
                      n.read ? "text-ink-2 hover:bg-page" : "bg-brand-wash text-ink font-medium hover:opacity-90"
                    }`}
                  >
                    <div className="flex items-start gap-1.5">
                      {!n.read && <span className="mt-1 w-1.5 h-1.5 rounded-full bg-brand flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="truncate">{n.title}</div>
                        {n.body && <div className="text-[11px] text-ink-muted truncate">{n.body}</div>}
                        <div className="text-[10px] text-ink-muted mt-0.5">{timeAgo(n.created_at)}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </VScroller>
        )}
      </div>

      <WaffleMenu
        isOpen={activeMenu === "waffle"}
        onToggle={() => toggleMenu("waffle")}
        onClose={closeMenu}
      />

      {/* User Auth Pill / Dropdown */}
      {authLoaded && (
        <div className="relative">
          {!userEmail ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => toggleMenu("signin")}
                aria-expanded={activeMenu === "signin"}
                aria-haspopup="menu"
                className={`text-[11.5px] font-bold px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 shadow-soft-sm whitespace-nowrap cursor-pointer select-none ${
                  activeMenu === "signin"
                    ? "bg-brand text-white border-brand shadow-soft"
                    : "text-brand hover:text-brand-dark bg-brand-wash border-brand/20 hover:border-brand/40"
                }`}
              >
                <span>Sign in</span>
                <span
                  className={`text-[8.5px] transition-transform duration-200 ${
                    activeMenu === "signin" ? "rotate-180 opacity-100" : "opacity-70"
                  }`}
                >
                  ▾
                </span>
              </button>

              {activeMenu === "signin" && (
                <div
                  className="absolute right-0 top-[calc(100%+8px)] w-64 bg-surface border border-border rounded-xl shadow-xl z-50 p-2 flex flex-col gap-1 animate-in fade-in slide-in-from-top-1.5 duration-150 selection:bg-brand-wash selection:text-brand"
                  role="menu"
                  aria-orientation="vertical"
                >
                  <div className="px-2 pt-1 pb-1.5 border-b border-border flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">
                      Sign in as:
                    </span>
                    <Link
                      href="/login"
                      onClick={closeMenu}
                      className="text-[10px] text-brand hover:underline font-bold"
                    >
                      All options →
                    </Link>
                  </div>

                  <div className="flex flex-col gap-1 pt-1">
                    {/* Candidate */}
                    <Link
                      href="/login?persona=candidate"
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-page border border-transparent hover:border-emerald-500/20 transition-all group/item"
                    >
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center justify-center text-sm flex-shrink-0 group-hover/item:scale-105 transition-transform">
                        👤
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-ink flex items-center justify-between">
                          <span>Candidate</span>
                          <span className="text-[9px] font-semibold text-emerald-500 bg-emerald-500/10 px-1.5 py-0.2 rounded">Instant</span>
                        </div>
                        <div className="text-[10px] text-ink-muted truncate">
                          Jobs, ATS optimizer & offers
                        </div>
                      </div>
                    </Link>

                    {/* Recruiter */}
                    <Link
                      href="/login?persona=recruiter"
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-page border border-transparent hover:border-blue-500/20 transition-all group/item"
                    >
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-500 flex items-center justify-center text-sm flex-shrink-0 group-hover/item:scale-105 transition-transform">
                        💼
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-ink flex items-center justify-between">
                          <span>Recruiter</span>
                          <span className="text-[9px] font-semibold text-blue-500 bg-blue-500/10 px-1.5 py-0.2 rounded">Console</span>
                        </div>
                        <div className="text-[10px] text-ink-muted truncate">
                          Sourcing, JD Studio & pipeline
                        </div>
                      </div>
                    </Link>

                    {/* Organization */}
                    <Link
                      href="/login?persona=organization"
                      onClick={closeMenu}
                      className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-page border border-transparent hover:border-purple-500/20 transition-all group/item"
                    >
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-500 flex items-center justify-center text-sm flex-shrink-0 group-hover/item:scale-105 transition-transform">
                        🏢
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[12px] font-bold text-ink flex items-center justify-between">
                          <span>Organization</span>
                          <span className="text-[9px] font-semibold text-purple-500 bg-purple-500/10 px-1.5 py-0.2 rounded">Suite</span>
                        </div>
                        <div className="text-[10px] text-ink-muted truncate">
                          Team licenses & enterprise hiring
                        </div>
                      </div>
                    </Link>
                  </div>

                  <div className="border-t border-border mt-1 pt-1.5 flex items-center justify-between px-1.5 text-[10.5px]">
                    <Link
                      href="/signup"
                      onClick={closeMenu}
                      className="text-brand hover:underline font-bold"
                    >
                      Create account →
                    </Link>
                    <Link
                      href="/login?persona=owner"
                      onClick={closeMenu}
                      className="text-ink-muted hover:text-ink flex items-center gap-1"
                    >
                      <span>👑</span>
                      <span>Owner</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                aria-label="User profile menu"
                aria-expanded={activeMenu === "user"}
                onClick={() => toggleMenu("user")}
                className="w-7 h-7 rounded-full flex items-center justify-center transition-transform hover:scale-105 flex-shrink-0"
              >
                <Avatar
                  name={fullName}
                  email={userEmail}
                  avatarUrl={avatarUrl}
                  size={26}
                  className="shadow-emblem"
                />
              </button>
              {activeMenu === "user" && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-56 bg-surface border border-border rounded-xl shadow-soft z-50 p-3 flex flex-col gap-2 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="border-b border-border/70 pb-2">
                    <div className="text-[12px] font-bold text-ink truncate">
                      {fullName || userEmail}
                    </div>
                    <div className="text-[10.5px] text-ink-muted truncate">
                      {userEmail}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 text-[11.5px]">
                    <Link
                      href="/candidate/status"
                      onClick={closeMenu}
                      className="px-2 py-1.5 rounded-lg hover:bg-page text-ink flex items-center gap-2 font-medium transition-colors"
                    >
                      <Icon name="check" className="w-3.5 h-3.5 text-brand" />
                      <span>My Applications (Candidate)</span>
                    </Link>
                    <Link
                      href="/agent"
                      onClick={closeMenu}
                      className="px-2 py-1.5 rounded-lg hover:bg-page text-ink flex items-center gap-2 font-medium transition-colors"
                    >
                      <Icon name="sparkle" className="w-3.5 h-3.5 text-brand" />
                      <span>Master Agent Mission Control</span>
                    </Link>
                    <Link
                      href="/recruiter"
                      onClick={closeMenu}
                      className="px-2 py-1.5 rounded-lg hover:bg-page text-ink flex items-center gap-2 font-medium transition-colors"
                    >
                      <Icon name="briefcase" className="w-3.5 h-3.5 text-brand" />
                      <span>Recruiter Cockpit</span>
                    </Link>
                    <Link
                      href="/hm"
                      onClick={closeMenu}
                      className="px-2 py-1.5 rounded-lg hover:bg-page text-ink flex items-center gap-2 font-medium transition-colors"
                    >
                      <Icon name="users" className="w-3.5 h-3.5 text-brand" />
                      <span>Hiring Manager Portal</span>
                    </Link>
                    <Link
                      href="/recruiter/extension"
                      onClick={closeMenu}
                      className="px-2 py-1.5 rounded-lg hover:bg-page text-ink flex items-center gap-2 font-medium transition-colors"
                    >
                      <Icon name="sparkle" className="w-3.5 h-3.5 text-brand" />
                      <span>Sourcing Extension</span>
                    </Link>
                    {settingsHref ? (
                      <Link
                        href={settingsHref}
                        onClick={closeMenu}
                        className="px-2 py-1.5 rounded-lg hover:bg-page text-ink flex items-center gap-2 font-medium transition-colors"
                      >
                        <Icon name="gear" className="w-3.5 h-3.5 text-ink-muted" />
                        <span>{settingsHref === "/admin" ? "Platform Owner Console" : "Org Settings"}</span>
                      </Link>
                    ) : (
                      <Link
                        href="/org/settings"
                        onClick={closeMenu}
                        className="px-2 py-1.5 rounded-lg hover:bg-page text-ink flex items-center gap-2 font-medium transition-colors"
                      >
                        <Icon name="gear" className="w-3.5 h-3.5 text-ink-muted" />
                        <span>Org Settings</span>
                      </Link>
                    )}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      disabled={signingOut}
                      className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-page text-critical flex items-center gap-2 font-medium transition-colors disabled:opacity-50"
                    >
                      <Icon name="logout" className="w-3.5 h-3.5 text-critical" />
                      <span>Sign out</span>
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Universal Outside Click Backdrop */}
      {activeMenu !== "none" && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={closeMenu}
          className="fixed inset-0 z-40 bg-transparent cursor-default border-0 p-0 m-0 outline-none select-none"
        />
      )}
    </div>
  );
}
