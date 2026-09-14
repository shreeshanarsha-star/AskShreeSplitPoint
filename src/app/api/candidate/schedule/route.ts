import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

type ScheduleBookingPayload = {
  token: string;
  selectedDay: string; // YYYY-MM-DD
  selectedTime: string; // HH:MM
  displayTime: string; // e.g. "02:00 PM – 03:00 PM"
  timezone?: string;
  notes?: string;
};

// Generate dynamically available business days for next 4-5 weekdays
function getUpcomingAvailableDays() {
  const days = [];
  const today = new Date();
  let cursor = new Date(today);
  cursor.setDate(cursor.getDate() + 1); // Start tomorrow

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  while (days.length < 4) {
    const dayOfWeek = cursor.getDay();
    // Exclude weekends (0=Sun, 6=Sat)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const year = cursor.getFullYear();
      const month = String(cursor.getMonth() + 1).padStart(2, "0");
      const date = String(cursor.getDate()).padStart(2, "0");
      const dateStr = `${year}-${month}-${date}`;

      days.push({
        dateStr,
        dayName: dayNames[dayOfWeek],
        dayNum: String(cursor.getDate()),
        month: monthNames[cursor.getMonth()],
        slotsAvailable: 4 + (days.length % 2),
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

// Generate slot options per date
function getSlotsForDate(dateStr: string) {
  return [
    { time: "10:00", displayTime: "10:00 AM – 10:45 AM" },
    { time: "11:30", displayTime: "11:30 AM – 12:15 PM" },
    { time: "14:00", displayTime: "02:00 PM – 02:45 PM" },
    { time: "15:30", displayTime: "03:30 PM – 04:15 PM" },
    { time: "17:00", displayTime: "05:00 PM – 05:45 PM" },
  ];
}

// Generate RFC 5545 iCalendar data
function generateIcsContent(params: {
  title: string;
  description: string;
  location: string;
  startTime: Date;
  durationMinutes: number;
}) {
  const formatDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  };

  const startStr = formatDate(params.startTime);
  const end = new Date(params.startTime.getTime() + params.durationMinutes * 60000);
  const endStr = formatDate(end);
  const nowStr = formatDate(new Date());
  const uid = `askshree-${Date.now()}-${Math.random().toString(36).substring(2, 7)}@askshree.com`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//AskShree Autonomous Hiring Partner//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${nowStr}`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${params.title}`,
    `DESCRIPTION:${params.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${params.location}`,
    "STATUS:CONFIRMED",
    "BEGIN:VALARM",
    "TRIGGER:-PT15M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Reminder: AskShree Interview in 15 minutes",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token") || "";

    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Candidate token or ID is required." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const availableDays = getUpcomingAvailableDays();
    const timeSlots: Record<string, ReturnType<typeof getSlotsForDate>> = {};
    for (const d of availableDays) {
      timeSlots[d.dateStr] = getSlotsForDate(d.dateStr);
    }

    const timezones = [
      "Asia/Kolkata (IST / UTC+5:30)",
      "America/Los_Angeles (PST / UTC-8)",
      "America/New_York (EST / UTC-5)",
      "Europe/London (GMT / UTC+0)",
      "Asia/Singapore (SGT / UTC+8)",
    ];

    if (token === "demo") {
      return NextResponse.json(
        {
          ok: true,
          data: {
            candidate: {
              id: "demo",
              name: "Alex Rivera",
              company: "Stripe",
              stage: "hm_review",
              matchScore: 94,
            },
            requisition: {
              id: "demo-req-1",
              reqNo: "R-2208261",
              title: "Senior Full-Stack Engineer",
              department: "Product Engineering",
              location: "San Francisco / Remote",
            },
            interviewRound: {
              name: "Hiring Manager & Technical Architecture Review",
              duration: 45,
              format: "Google Meet Video Conference",
              panel: ["David Miller (VP Engineering)", "Priya Patel (Lead Architect)"],
            },
            availableDays,
            timeSlots,
            timezones,
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    const admin = createAdminClient();

    // Query candidate
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, stage, match_score, current_company, current_location, requisition_id")
      .eq("id", token)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json(
        { ok: false, error: "Candidate scheduling session not found or link has expired." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Query target requisition
    let requisitionData: {
      id: string;
      reqNo: string;
      title: string;
      department: string;
      location: string;
    } | null = null;

    if (candidate.requisition_id) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("id, req_no, title, department, location")
        .eq("id", candidate.requisition_id)
        .maybeSingle();

      if (req) {
        requisitionData = {
          id: req.id,
          reqNo: req.req_no || "REQ-LIVE",
          title: req.title || "Strategic Opening",
          department: req.department || "General",
          location: req.location || "Remote",
        };
      }
    }

    // Check if an interview is already booked
    const { data: existingInterview } = await admin
      .from("talent_interviews")
      .select("id, round_name, scheduled_at, status, panel")
      .eq("candidate_id", candidate.id)
      .eq("status", "scheduled")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    return NextResponse.json(
      {
        ok: true,
        data: {
          candidate: {
            id: candidate.id,
            name: candidate.name,
            company: candidate.current_company,
            stage: candidate.stage,
            matchScore: candidate.match_score,
          },
          requisition: requisitionData,
          interviewRound: {
            name: "Hiring Manager & Technical Architecture Review",
            duration: 45,
            format: "Google Meet Video Conference",
            panel: ["Hiring Manager", "Lead Technical Architect"],
          },
          existingBooking: existingInterview
            ? {
                id: existingInterview.id,
                roundName: existingInterview.round_name,
                scheduledAt: existingInterview.scheduled_at,
                panel: existingInterview.panel,
              }
            : null,
          availableDays,
          timeSlots,
          timezones,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[schedule/get] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error fetching scheduling availability." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as ScheduleBookingPayload | null;

    if (!body || !body.token || !body.selectedDay || !body.selectedTime) {
      return NextResponse.json(
        { ok: false, error: "Missing required booking details: token, selectedDay, or selectedTime." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { token, selectedDay, selectedTime, displayTime, timezone, notes } = body;
    const admin = createAdminClient();

    // Demo fallback
    if (token === "demo") {
      const scheduledDate = new Date(`${selectedDay}T${selectedTime}:00`);
      const meetUrl = "https://meet.google.com/ask-shree-sync";
      const ics = generateIcsContent({
        title: "AskShree Interview — Senior Full-Stack Engineer",
        description: `Technical Architecture Deep-Dive with David Miller and Priya Patel.\nGoogle Meet: ${meetUrl}`,
        location: meetUrl,
        startTime: scheduledDate,
        durationMinutes: 45,
      });

      return NextResponse.json(
        {
          ok: true,
          data: {
            candidateId: "demo",
            stage: "interview",
            scheduledAt: scheduledDate.toISOString(),
            displayTime: displayTime || `${selectedTime}`,
            timezone: timezone || "America/Los_Angeles (PST)",
            meetingUrl: meetUrl,
            icsData: ics,
            message: "Interview successfully scheduled in demo mode.",
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    // Query candidate
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, stage, requisition_id, created_by, current_company")
      .eq("id", token)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json(
        { ok: false, error: "Candidate session not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Target requisition
    let roleTitle = "Key Role";
    if (candidate.requisition_id) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("title")
        .eq("id", candidate.requisition_id)
        .maybeSingle();
      if (req?.title) roleTitle = req.title;
    }

    // Construct Datetime & Meeting Link
    const scheduledDate = new Date(`${selectedDay}T${selectedTime}:00`);
    const randomHash = Math.random().toString(36).substring(2, 5) + "-" + Math.random().toString(36).substring(2, 6);
    const meetingUrl = `https://meet.google.com/ask-${randomHash}`;

    // 1. Insert/Update talent_interviews
    const { data: interview, error: intvError } = await admin
      .from("talent_interviews")
      .insert({
        candidate_id: candidate.id,
        requisition_id: candidate.requisition_id,
        round_name: "Hiring Manager & Technical Architecture Review",
        scheduled_at: scheduledDate.toISOString(),
        mode: "video",
        status: "scheduled",
        panel: ["Hiring Manager", "Lead Technical Architect"],
        created_by: candidate.created_by,
      })
      .select("id")
      .single();

    if (intvError) {
      console.warn("[schedule/book] talent_interviews insert warning:", intvError.message);
    }

    // 2. Advance candidate stage to "interview"!
    const { error: updateError } = await admin
      .from("talent_candidates")
      .update({
        stage: "interview",
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);

    if (updateError) {
      console.error("[schedule/book] candidate stage update error:", updateError.message);
    }

    // 3. Log audit event
    await admin.from("talent_audit_log").insert({
      actor_id: candidate.created_by,
      action: "candidate_interview_scheduled",
      target_type: "candidate",
      target_id: candidate.id,
      metadata: {
        scheduled_at: scheduledDate.toISOString(),
        selectedDay,
        selectedTime,
        timezone: timezone || "UTC",
        meetingUrl,
        interviewId: interview?.id || null,
        candidateNotes: notes || null,
      },
    });

    // 4. Generate ICS calendar invite
    const icsContent = generateIcsContent({
      title: `AskShree Interview — ${roleTitle} (${candidate.name})`,
      description: `Interview Round: Hiring Manager & Technical Architecture Review\nCandidate: ${candidate.name}\nMeeting URL: ${meetingUrl}\nNotes: ${notes || "None"}`,
      location: meetingUrl,
      startTime: scheduledDate,
      durationMinutes: 45,
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          candidateId: candidate.id,
          interviewId: interview?.id,
          stage: "interview",
          scheduledAt: scheduledDate.toISOString(),
          displayTime: displayTime || `${selectedTime}`,
          timezone: timezone || "Asia/Kolkata (IST / UTC+5:30)",
          meetingUrl,
          icsData: icsContent,
          message: `Interview confirmed. Candidate successfully moved to INTERVIEW stage.`,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[schedule/book] unexpected failure:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error confirming interview schedule." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
