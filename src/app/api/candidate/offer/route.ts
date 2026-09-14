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

type SignOfferPayload = {
  token: string;
  signatureType: "typed" | "drawn";
  signatureValue: string;
  legalConsent: boolean;
};

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

    if (token === "demo") {
      return NextResponse.json(
        {
          ok: true,
          data: {
            candidate: {
              id: "demo",
              name: "Alex Rivera",
              email: "alex.rivera@example.com",
              stage: "offer",
              matchScore: 94,
              currentCompany: "Stripe",
            },
            requisition: {
              id: "demo-req-1",
              reqNo: "R-2208261",
              title: "Senior Full-Stack Engineer",
              department: "Product Engineering",
              location: "San Francisco / Remote",
            },
            offer: {
              id: "demo-offer-1",
              status: "sent",
              proposedCtcAnnual: 3600000,
              currency: "INR",
              components: [
                { label: "Annual Base Salary", annual: 3200000 },
                { label: "Performance Incentive (Target 15%)", annual: 480000 },
                { label: "One-Time Signing Bonus", annual: 300000 },
                { label: "Equity Stock Option Grants", annual: "25,000 Units" },
                { label: "Executive Health & Wellness Cover", annual: "Comprehensive" },
              ],
              joiningDate: "2026-10-15",
              noticePeriod: "30 days",
              letterText: `ASKSHREE TECHNOLOGIES INC. - EMPLOYMENT OFFER & EXECUTIVE AGREEMENT\n\nPosition: Senior Full-Stack Engineer\nTarget Start Date: October 15, 2026\nAnnual Guaranteed Base: INR 32,00,000\nSigning Bonus: INR 3,00,000\nStock Units: 25,000 Units (4-Year Vesting)\n\nWe are thrilled to extend this formal offer of employment to join AskShree Technologies. Your track record of shipping resilient systems and thoughtful engineering craftsmanship will be instrumental in scaling our autonomous hiring platform.`,
              signedAt: null,
            },
            onboarding: {
              manager: "David Miller (VP Engineering)",
              reportingTime: "09:30 AM IST",
              orientationSchedule: "Day 1: Platform Architecture & Executive Welcome",
              itEquipment: "Apple MacBook Pro M3 Max (36GB Unified RAM) + Ergonomic Setup",
            },
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    const admin = createAdminClient();

    // Query candidate
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, email, stage, match_score, current_company, requisition_id, experience_years, created_by")
      .eq("id", token)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json(
        { ok: false, error: "Candidate offer session not found or link has expired." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Query requisition
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

    // Query existing offer
    const { data: existingOffer } = await admin
      .from("offers")
      .select("*")
      .eq("talent_candidate_id", candidate.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const roleTitle = requisitionData?.title || "Strategic Lead";
    const baseSalary = 3200000;
    const bonus = 480000;
    const defaultJoiningDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const offerData = existingOffer
      ? {
          id: existingOffer.id,
          status: existingOffer.status || "sent",
          proposedCtcAnnual: Number(existingOffer.proposed_ctc_annual) || baseSalary + bonus,
          currency: existingOffer.currency || "INR",
          components: Array.isArray(existingOffer.components) && existingOffer.components.length > 0
            ? existingOffer.components
            : [
                { label: "Annual Base Salary", annual: baseSalary },
                { label: "Performance Incentive (Target 15%)", annual: bonus },
                { label: "One-Time Signing Bonus", annual: 300000 },
                { label: "Equity Stock Option Grants", annual: "20,000 Units" },
                { label: "Executive Health Cover", annual: "Comprehensive Family" },
              ],
          joiningDate: existingOffer.joining_date || defaultJoiningDate,
          noticePeriod: existingOffer.notice_period || "30 days",
          letterText: existingOffer.ai_polished_letter || `EMPLOYMENT OFFER & EXECUTIVE AGREEMENT\n\nPosition: ${roleTitle}\nTarget Start Date: ${defaultJoiningDate}\nAnnual Guaranteed Base: INR 32,00,000\nSigning Bonus: INR 3,00,000\n\nWe are delighted to extend this formal offer of employment to join AskShree Technologies.`,
          signedAt: existingOffer.status === "accepted" ? existingOffer.updated_at : null,
        }
      : {
          id: "pending-gen",
          status: candidate.stage === "hired" ? "accepted" : "sent",
          proposedCtcAnnual: baseSalary + bonus,
          currency: "INR",
          components: [
            { label: "Annual Base Salary", annual: baseSalary },
            { label: "Performance Incentive (Target 15%)", annual: bonus },
            { label: "One-Time Signing Bonus", annual: 300000 },
            { label: "Equity Stock Option Grants", annual: "20,000 Units" },
            { label: "Executive Health Cover", annual: "Comprehensive Family" },
          ],
          joiningDate: defaultJoiningDate,
          noticePeriod: "30 days",
          letterText: `EMPLOYMENT OFFER & EXECUTIVE AGREEMENT\n\nPosition: ${roleTitle}\nTarget Start Date: ${defaultJoiningDate}\nAnnual Guaranteed Base: INR 32,00,000\nSigning Bonus: INR 3,00,000\n\nWe are delighted to extend this formal offer of employment to join AskShree Technologies.`,
          signedAt: null,
        };

    return NextResponse.json(
      {
        ok: true,
        data: {
          candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
            stage: candidate.stage,
            matchScore: candidate.match_score,
            currentCompany: candidate.current_company,
          },
          requisition: requisitionData,
          offer: offerData,
          onboarding: {
            manager: "Executive Leadership & General Counsel",
            reportingTime: "09:30 AM IST",
            orientationSchedule: "Day 1: Platform Immersion, Architecture Overview & Team Introduction",
            itEquipment: "Enterprise Hardware Provisioning (MacBook Pro + Peripheral Suite)",
          },
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[candidate/offer/get] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error retrieving offer package." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as SignOfferPayload | null;

    if (!body || !body.token || !body.signatureValue) {
      return NextResponse.json(
        { ok: false, error: "Candidate token and signature are required to execute agreement." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { token, signatureType, signatureValue, legalConsent } = body;

    if (!legalConsent) {
      return NextResponse.json(
        { ok: false, error: "You must acknowledge and accept the statutory terms before submitting." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    if (token === "demo") {
      return NextResponse.json(
        {
          ok: true,
          data: {
            candidateId: "demo",
            stage: "hired",
            status: "accepted",
            signedAt: new Date().toISOString(),
            signatureType,
            message: "Congratulations! In demo mode, your offer has been digitally signed and status moved to HIRED.",
          },
        },
        { headers: CORS_HEADERS }
      );
    }

    const admin = createAdminClient();

    // Query candidate
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, email, stage, requisition_id, created_by")
      .eq("id", token)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json(
        { ok: false, error: "Candidate session not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    const signedTimestamp = new Date().toISOString();

    // 1. Update `offers` table
    const { error: offerUpdateErr } = await admin
      .from("offers")
      .update({
        status: "accepted",
        updated_at: signedTimestamp,
      })
      .eq("talent_candidate_id", candidate.id);

    if (offerUpdateErr) {
      console.warn("[candidate/offer/sign] offer status update warning:", offerUpdateErr.message);
    }

    // 2. Advance candidate stage from "offer" to "hired"!
    const { error: candUpdateErr } = await admin
      .from("talent_candidates")
      .update({
        stage: "hired",
        updated_at: signedTimestamp,
      })
      .eq("id", candidate.id);

    if (candUpdateErr) {
      console.error("[candidate/offer/sign] candidate stage update error:", candUpdateErr.message);
      return NextResponse.json(
        { ok: false, error: "Failed to update candidate hired stage." },
        { status: 500, headers: CORS_HEADERS }
      );
    }

    // 3. Log statutory audit trail in `talent_audit_log`
    await admin.from("talent_audit_log").insert({
      actor_id: candidate.created_by,
      action: "candidate_offer_accepted_hired",
      target_type: "candidate",
      target_id: candidate.id,
      metadata: {
        signedAt: signedTimestamp,
        signatureType,
        signatureSnippet: signatureType === "typed" ? signatureValue.slice(0, 50) : "canvas_drawn_vector",
        legalConsent: true,
        candidateName: candidate.name,
        candidateEmail: candidate.email,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          candidateId: candidate.id,
          stage: "hired",
          status: "accepted",
          signedAt: signedTimestamp,
          message: `Congratulations ${candidate.name}! Your offer is digitally signed and your profile is officially HIRED.`,
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[candidate/offer/sign] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal server error confirming digital offer execution." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
