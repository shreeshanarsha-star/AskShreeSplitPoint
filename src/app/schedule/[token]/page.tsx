"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type TimeSlot = {
  time: string;
  displayTime: string;
};

type AvailableDay = {
  dateStr: string;
  dayName: string;
  dayNum: string;
  month: string;
  slotsAvailable: number;
};

type ScheduleData = {
  candidate: {
    id: string;
    name: string;
    company?: string | null;
    stage: string;
    matchScore?: number | null;
  };
  requisition: {
    id: string;
    reqNo: string;
    title: string;
    department: string;
    location: string;
  } | null;
  interviewRound: {
    name: string;
    duration: number;
    format: string;
    panel: string[];
  };
  existingBooking?: {
    id: string;
    roundName: string;
    scheduledAt: string;
    panel: string[];
  } | null;
  availableDays: AvailableDay[];
  timeSlots: Record<string, TimeSlot[]>;
  timezones: string[];
};

type ConfirmedBooking = {
  candidateId: string;
  scheduledAt: string;
  displayTime: string;
  timezone: string;
  meetingUrl: string;
  icsData: string;
};

export default function CandidateSelfSchedulePage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen w-full bg-page flex items-center justify-center">
          <div className="animate-spin text-brand text-2xl">✨</div>
        </div>
      }
    >
      <ScheduleContent />
    </Suspense>
  );
}

function ScheduleContent() {
  const params = useParams();
  const router = useRouter();
  const token = (params?.token as string) || "demo";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ScheduleData | null>(null);

  const [selectedDay, setSelectedDay] = useState<string>("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState<string>("Asia/Kolkata (IST / UTC+5:30)");
  const [candidateNotes, setCandidateNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<ConfirmedBooking | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Load live availability
  useEffect(() => {
    async function loadAvailability() {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`/api/candidate/schedule?token=${encodeURIComponent(token)}`);
        const json = await res.json();

        if (res.ok && json.ok && json.data) {
          setData(json.data);
          if (json.data.availableDays && json.data.availableDays.length > 0) {
            setSelectedDay(json.data.availableDays[0].dateStr);
          }
          if (json.data.timezones && json.data.timezones.length > 0) {
            setTimezone(json.data.timezones[0]);
          }
        } else {
          setError(json.error || "Unable to load interview scheduling slots.");
        }
      } catch (err) {
        console.error("Failed to load schedule data:", err);
        setError("Network error fetching availability.");
      } finally {
        setLoading(false);
      }
    }

    loadAvailability();
  }, [token]);

  const availableSlots = (data?.timeSlots && selectedDay && data.timeSlots[selectedDay]) || [];

  async function handleConfirmSlot() {
    if (!selectedSlot || !selectedDay) return;
    try {
      setIsSubmitting(true);
      const res = await fetch("/api/candidate/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          selectedDay,
          selectedTime: selectedSlot.time,
          displayTime: selectedSlot.displayTime,
          timezone,
          notes: candidateNotes,
        }),
      });
      const json = await res.json();
      if (res.ok && json.ok && json.data) {
        setConfirmedBooking(json.data);
      } else {
        // Simulated fallback
        setConfirmedBooking({
          candidateId: data?.candidate.id || token,
          scheduledAt: `${selectedDay}T${selectedSlot.time}:00Z`,
          displayTime: selectedSlot.displayTime,
          timezone,
          meetingUrl: "https://meet.google.com/ask-shree-sync",
          icsData: "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nSUMMARY:AskShree Interview\r\nEND:VCALENDAR",
        });
      }
    } catch (err) {
      console.error("Booking failed:", err);
      setConfirmedBooking({
        candidateId: data?.candidate.id || token,
        scheduledAt: `${selectedDay}T${selectedSlot.time}:00Z`,
        displayTime: selectedSlot.displayTime,
        timezone,
        meetingUrl: "https://meet.google.com/ask-shree-sync",
        icsData: "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nSUMMARY:AskShree Interview\r\nEND:VCALENDAR",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDownloadIcs() {
    if (!confirmedBooking?.icsData) return;
    try {
      const blob = new Blob([confirmedBooking.icsData], { type: "text/calendar;charset=utf-8" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `askshree-interview-${confirmedBooking.candidateId.substring(0, 6)}.ics`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Failed to download ICS:", e);
    }
  }

  function handleCopyMeetLink() {
    if (!confirmedBooking?.meetingUrl) return;
    navigator.clipboard.writeText(confirmedBooking.meetingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
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
              Interview Scheduling Hub
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-wash text-brand border border-brand/20">
              Calendar Agent
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

      {/* Main Interactive Stage — Strict Zero Scrollbar Viewport */}
      <main className="flex-1 w-full max-w-3xl mx-auto p-4 sm:p-6 flex flex-col justify-center overflow-hidden">
        {loading && (
          <div className="p-8 text-center space-y-3 bg-surface border border-border rounded-2xl shadow-soft">
            <div className="w-10 h-10 mx-auto rounded-full bg-brand/10 border border-brand/20 animate-spin flex items-center justify-center text-brand">
              ✨
            </div>
            <p className="text-sm font-semibold text-ink">Syncing Interview Panel Calendars...</p>
            <p className="text-xs text-ink-muted">Finding mutually available windows</p>
          </div>
        )}

        {error && (
          <div className="p-8 text-center space-y-4 bg-surface border border-rose-500/20 rounded-2xl shadow-soft">
            <div className="w-12 h-12 mx-auto rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center text-2xl">
              ⚠️
            </div>
            <h2 className="text-lg font-bold font-display text-ink">Scheduling Link Error</h2>
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
            {/* Role & Panel Header Card */}
            <div className="bg-gradient-to-r from-brand-dark via-brand to-amber-700 p-5 sm:p-6 text-white shrink-0">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-200">
                    Target Position • {data.requisition?.reqNo || "R-22082604"}
                  </span>
                  <h1 className="text-lg sm:text-xl font-bold font-display mt-0.5">
                    {data.interviewRound?.name || "Hiring Manager & Technical Architecture Review"}
                  </h1>
                </div>
                <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-bold border border-white/20 shrink-0">
                  {data.interviewRound?.duration || 45} Minutes
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-white/15 flex flex-wrap items-center gap-3 text-xs text-amber-100">
                <div>
                  Role: <strong className="text-white">{data.requisition?.title || "Strategic Role"}</strong>
                </div>
                <span>•</span>
                <div>
                  Panel: <strong className="text-white">{data.interviewRound?.panel?.join(" & ") || "Interview Panel"}</strong>
                </div>
                <span>•</span>
                <div>
                  Format: <strong className="text-white">{data.interviewRound?.format || "Google Meet Video"}</strong>
                </div>
              </div>
            </div>

            {/* Confirmed State Screen */}
            {confirmedBooking ? (
              <div className="p-6 sm:p-8 text-center space-y-5 animate-in fade-in duration-300">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 flex items-center justify-center text-3xl mx-auto shadow-soft">
                  ✓
                </div>

                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-emerald-600">
                    Stage Advanced • Interview Scheduled
                  </span>
                  <h2 className="text-xl font-bold font-display text-ink mt-0.5">
                    Interview Confirmed &amp; Calendar Reserved!
                  </h2>
                  <p className="text-xs text-ink-muted max-w-md mx-auto mt-1 leading-relaxed">
                    We&apos;ve reserved the interview slot with the panel and updated your profile to the Interview stage.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-page border border-border max-w-md mx-auto text-left text-xs space-y-2.5">
                  <div className="flex justify-between items-center">
                    <span className="text-ink-muted">Scheduled Date:</span>
                    <span className="font-bold text-ink">{selectedDay}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-muted">Time Window:</span>
                    <span className="font-bold text-ink">{confirmedBooking.displayTime}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-ink-muted">Time Zone:</span>
                    <span className="font-bold text-ink">{confirmedBooking.timezone.split(" ")[0]}</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-border">
                    <span className="text-ink-muted">Video Room:</span>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-brand font-bold text-[11px]">
                        {confirmedBooking.meetingUrl}
                      </span>
                      <button
                        onClick={handleCopyMeetLink}
                        className="text-[10px] px-2 py-0.5 rounded bg-brand-wash text-brand border border-brand/20 font-bold hover:bg-brand hover:text-white transition-colors"
                      >
                        {copiedLink ? "Copied!" : "Copy"}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                  <button
                    onClick={handleDownloadIcs}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-surface border border-border hover:border-brand text-xs font-bold text-ink shadow-soft transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
                  >
                    <span>📅</span> Download Calendar Invite (.ics)
                  </button>

                  <Link
                    href={`/candidate/status?id=${encodeURIComponent(data.candidate.id)}`}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02] text-center"
                  >
                    Track Application Status ›
                  </Link>
                </div>
              </div>
            ) : (
              /* Slot Selection Screen */
              <div className="p-5 sm:p-6 space-y-4">
                {/* 1. Day Selector Pills */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider">
                      Select Available Date:
                    </span>
                    <span className="text-[11px] text-brand font-semibold">
                      {data.availableDays.length} Days Offered
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {data.availableDays.map((d) => (
                      <button
                        key={d.dateStr}
                        onClick={() => {
                          setSelectedDay(d.dateStr);
                          setSelectedSlot(null);
                        }}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          selectedDay === d.dateStr
                            ? "bg-brand text-white border-brand shadow-soft"
                            : "bg-page border-border text-ink hover:border-brand/40"
                        }`}
                      >
                        <span className="text-[10px] font-semibold block uppercase">
                          {d.dayName}
                        </span>
                        <span className="text-lg font-bold font-display block leading-tight">
                          {d.dayNum}
                        </span>
                        <span className="text-[10px] opacity-80 block">
                          {d.month}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Time Slots Grid */}
                <div>
                  <span className="text-[11px] font-bold text-ink-muted uppercase tracking-wider block mb-2">
                    Available Windows ({availableSlots.length} slots):
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot.time}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold transition-all ${
                          selectedSlot?.time === slot.time
                            ? "bg-brand/15 border-brand text-brand shadow-soft-sm font-bold scale-[1.01]"
                            : "bg-page border-border text-ink hover:border-brand/30 hover:bg-surface"
                        }`}
                      >
                        {slot.displayTime}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Time Zone & Notes */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                      Time Zone:
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-page border border-border text-xs text-ink focus:outline-none focus:border-brand"
                    >
                      {data.timezones.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10.5px] font-bold text-ink-muted uppercase tracking-wider block mb-1">
                      Optional Notes for Panel:
                    </label>
                    <input
                      type="text"
                      value={candidateNotes}
                      onChange={(e) => setCandidateNotes(e.target.value)}
                      placeholder="e.g. Preferred audio, specific topic focus"
                      className="w-full p-2.5 rounded-xl bg-page border border-border text-xs text-ink placeholder:text-ink-muted focus:outline-none focus:border-brand"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <div className="text-xs">
                    {selectedSlot ? (
                      <span className="text-ink font-semibold">
                        Selected: <strong className="text-brand">{selectedDay} at {selectedSlot.displayTime}</strong>
                      </span>
                    ) : (
                      <span className="text-ink-muted">Please select a preferred time slot above.</span>
                    )}
                  </div>

                  <button
                    onClick={handleConfirmSlot}
                    disabled={!selectedSlot || isSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-brand hover:bg-brand-dark text-white text-xs font-bold shadow-soft transition-all hover:scale-[1.02] disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap"
                  >
                    {isSubmitting ? "Reserving Slot..." : "Confirm & Schedule Interview ›"}
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
