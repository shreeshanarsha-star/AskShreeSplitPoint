"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import Logo from "@/components/Logo";
import TopbarStatus from "@/components/TopbarStatus";

type TimeSlot = {
  time: string;
  displayTime: string;
};

const AVAILABLE_DAYS = [
  { dateStr: "2026-09-15", dayName: "Tue", dayNum: "15", month: "Sep", slotsAvailable: 4 },
  { dateStr: "2026-09-16", dayName: "Wed", dayNum: "16", month: "Sep", slotsAvailable: 5 },
  { dateStr: "2026-09-17", dayName: "Thu", dayNum: "17", month: "Sep", slotsAvailable: 3 },
  { dateStr: "2026-09-18", dayName: "Fri", dayNum: "18", month: "Sep", slotsAvailable: 6 },
];

const TIME_SLOTS: Record<string, TimeSlot[]> = {
  "2026-09-15": [
    { time: "10:00", displayTime: "10:00 AM – 11:00 AM" },
    { time: "11:30", displayTime: "11:30 AM – 12:30 PM" },
    { time: "14:00", displayTime: "02:00 PM – 03:00 PM" },
    { time: "16:00", displayTime: "04:00 PM – 05:00 PM" },
  ],
  "2026-09-16": [
    { time: "09:30", displayTime: "09:30 AM – 10:30 AM" },
    { time: "11:00", displayTime: "11:00 AM – 12:00 PM" },
    { time: "13:30", displayTime: "01:30 PM – 02:30 PM" },
    { time: "15:00", displayTime: "03:00 PM – 04:00 PM" },
    { time: "16:30", displayTime: "04:30 PM – 05:30 PM" },
  ],
  "2026-09-17": [
    { time: "10:30", displayTime: "10:30 AM – 11:30 AM" },
    { time: "14:00", displayTime: "02:00 PM – 03:00 PM" },
    { time: "15:30", displayTime: "03:30 PM – 04:30 PM" },
  ],
  "2026-09-18": [
    { time: "09:00", displayTime: "09:00 AM – 10:00 AM" },
    { time: "10:30", displayTime: "10:30 AM – 11:30 AM" },
    { time: "12:00", displayTime: "12:00 PM – 01:00 PM" },
    { time: "14:00", displayTime: "02:00 PM – 03:00 PM" },
    { time: "15:30", displayTime: "03:30 PM – 04:30 PM" },
    { time: "17:00", displayTime: "05:00 PM – 06:00 PM" },
  ],
};

export default function CandidateSelfSchedulePage() {
  const params = useParams();
  const token = params?.token as string;

  const [selectedDay, setSelectedDay] = useState("2026-09-15");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timezone, setTimezone] = useState("America/Los_Angeles (PST / UTC-8)");
  const [candidateNotes, setCandidateNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);

  const availableSlots = TIME_SLOTS[selectedDay] || [];

  function handleConfirmSlot() {
    if (!selectedSlot) return;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setIsConfirmed(true);
    }, 1000);
  }

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col justify-center py-8 px-4 sm:px-6">
      <div className="max-w-3xl w-full mx-auto mb-4 flex items-center justify-between">
        <Link href="/" className="hover:opacity-90 transition-opacity">
          <Logo height={28} showPunchline={true} />
        </Link>
        <TopbarStatus />
      </div>

      <div className="max-w-3xl w-full mx-auto bg-surface border border-border rounded-2xl shadow-soft overflow-hidden">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-brand-dark via-brand to-amber-700 p-6 sm:p-8 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/askshree-emblem.png"
                alt="AskShree"
                className="w-10 h-10 rounded-[22%] shadow-emblem flex-shrink-0"
              />
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-100">
                  AskShree Candidate Experience
                </span>
                <h1 className="text-xl sm:text-2xl font-bold">
                  Schedule Your Technical Architecture Deep-Dive
                </h1>
              </div>
            </div>
            <span className="hidden sm:inline-block px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-xs font-medium border border-white/20">
              60 Minutes
            </span>
          </div>

          <div className="mt-4 pt-4 border-t border-white/10 flex flex-wrap items-center gap-4 text-xs text-indigo-100">
            <div>
              Role: <strong className="text-white font-semibold">Senior Full-Stack Engineer</strong>
            </div>
            <span>•</span>
            <div>
              Interviewers: <strong className="text-white font-semibold">David Miller (VP Eng) &amp; Priya Patel (Staff Architect)</strong>
            </div>
            <span>•</span>
            <div>
              Format: <strong className="text-white font-semibold">Google Meet Video</strong>
            </div>
          </div>
        </div>

        {isConfirmed ? (
          /* Confirmation State */
          <div className="p-8 sm:p-12 text-center space-y-5">
            <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 mx-auto flex items-center justify-center text-2xl font-bold">
              ✓
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Interview Confirmed!
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 leading-relaxed">
                We&apos;ve sent the calendar invite and Google Meet details to your email. We look forward to speaking with you!
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 max-w-md mx-auto text-left text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">Date:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedDay}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{selectedSlot?.displayTime}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Time Zone:</span>
                <span className="font-semibold text-slate-900 dark:text-white">{timezone.split(" ")[0]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Link:</span>
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">meet.google.com/ask-shree-sync</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <Link
                href="/candidate/status"
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                View My Application Status
              </Link>
              <button
                onClick={() => alert("Downloading calendar .ics invite...")}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-50 text-xs font-medium transition-colors"
              >
                Download .ICS
              </button>
            </div>
          </div>
        ) : (
          /* Slot Selection State */
          <div className="p-6 sm:p-8 space-y-6">
            
            {/* Timezone Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-850 border border-slate-200 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Icon name="globe" size={14} className="text-indigo-600" />
                Select Your Time Zone:
              </span>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-medium focus:outline-none"
              >
                <option value="America/Los_Angeles (PST / UTC-8)">America/Los_Angeles (PST / UTC-8)</option>
                <option value="America/New_York (EST / UTC-5)">America/New_York (EST / UTC-5)</option>
                <option value="Asia/Kolkata (IST / UTC+5:30)">Asia/Kolkata (IST / UTC+5:30)</option>
                <option value="Europe/London (GMT / UTC+0)">Europe/London (GMT / UTC+0)</option>
                <option value="Europe/Berlin (CET / UTC+1)">Europe/Berlin (CET / UTC+1)</option>
              </select>
            </div>

            {/* Day Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                1. Select Available Day
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {AVAILABLE_DAYS.map((day) => {
                  const isSelected = selectedDay === day.dateStr;
                  return (
                    <button
                      key={day.dateStr}
                      type="button"
                      onClick={() => {
                        setSelectedDay(day.dateStr);
                        setSelectedSlot(null);
                      }}
                      className={`p-3.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                          : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      <span className={`text-[11px] font-semibold block ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
                        {day.dayName}, {day.month}
                      </span>
                      <span className="text-xl font-bold block my-0.5">
                        {day.dayNum}
                      </span>
                      <span className={`text-[10px] font-medium block ${isSelected ? "text-indigo-100" : "text-emerald-600 dark:text-emerald-400"}`}>
                        {day.slotsAvailable} slots
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Slot Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                2. Select Time Window
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {availableSlots.map((slot) => {
                  const isSelected = selectedSlot?.time === slot.time;
                  return (
                    <button
                      key={slot.time}
                      type="button"
                      onClick={() => setSelectedSlot(slot)}
                      className={`p-3 rounded-xl border text-left text-xs font-semibold transition-all flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-50/80 dark:bg-indigo-950/50 border-indigo-600 text-indigo-900 dark:text-indigo-200 shadow-2xs"
                          : "bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-800 hover:border-slate-300 text-slate-700 dark:text-slate-300"
                      }`}
                    >
                      <span>{slot.displayTime}</span>
                      {isSelected && <span className="text-indigo-600 dark:text-indigo-400 font-bold">✓ Selected</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Notes */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Any topics or portfolio links you&apos;d like to share beforehand? (Optional)
              </label>
              <textarea
                value={candidateNotes}
                onChange={(e) => setCandidateNotes(e.target.value)}
                placeholder="e.g. GitHub architecture link, questions regarding team structure..."
                rows={2}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 focus:border-indigo-500 focus:outline-none"
              />
            </div>

            {/* Action Bar */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Token: <strong className="font-mono text-slate-600 dark:text-slate-300">{token || "demo"}</strong>
              </span>
              <button
                type="button"
                disabled={!selectedSlot || isSubmitting}
                onClick={handleConfirmSlot}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <span>{isSubmitting ? "Confirming..." : "Confirm My Interview Slot"}</span>
                <span>→</span>
              </button>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
