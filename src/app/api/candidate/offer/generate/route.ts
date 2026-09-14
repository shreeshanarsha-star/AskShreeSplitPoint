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

type OfferGeneratePayload = {
  candidateId: string;
  customSalary?: number;
  customJoiningDate?: string;
  customNotes?: string;
  currency?: string;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => null)) as OfferGeneratePayload | null;

    if (!body || !body.candidateId) {
      return NextResponse.json(
        { ok: false, error: "Candidate ID is required to generate an executive offer." },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const { candidateId, customSalary, customJoiningDate, customNotes, currency = "INR" } = body;
    const admin = createAdminClient();

    // Query candidate
    const { data: candidate, error: candError } = await admin
      .from("talent_candidates")
      .select("id, name, email, stage, requisition_id, current_company, experience_years, created_by")
      .eq("id", candidateId)
      .maybeSingle();

    if (candError || !candidate) {
      return NextResponse.json(
        { ok: false, error: "Candidate not found." },
        { status: 404, headers: CORS_HEADERS }
      );
    }

    // Query requisition
    let roleTitle = "Key Role";
    let department = "General";
    let location = "Remote / Hybrid";
    let reqNo = "REQ-LIVE";

    if (candidate.requisition_id) {
      const { data: req } = await admin
        .from("talent_requisitions")
        .select("id, req_no, title, department, location")
        .eq("id", candidate.requisition_id)
        .maybeSingle();

      if (req) {
        roleTitle = req.title || roleTitle;
        department = req.department || department;
        location = req.location || location;
        reqNo = req.req_no || reqNo;
      }
    }

    // Determine calibrated compensation
    const exp = Number(candidate.experience_years) || 6;
    const baseCompensation = customSalary || (currency === "USD" ? 165000 : 3200000);
    const performanceBonus = Math.round(baseCompensation * 0.15);
    const signOnBonus = currency === "USD" ? 15000 : 300000;
    const equityUnits = currency === "USD" ? 12000 : 25000;
    const totalCtc = baseCompensation + performanceBonus;

    // Target joining date: 30 days out if not specified
    const joiningDate = customJoiningDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

    const components = [
      { label: "Annual Base Salary", annual: baseCompensation },
      { label: "Performance Incentive (Target 15%)", annual: performanceBonus },
      { label: "One-Time Signing Bonus", annual: signOnBonus },
      { label: "Equity Stock Option Grants (4-Year Vesting)", annual: `${equityUnits} Units` },
      { label: "Executive Health & Wellness Comprehensive Cover", annual: "Family Included" },
    ];

    const formalLetterText = `# EMPLOYMENT OFFER & EXECUTIVE AGREEMENT

**Document ID:** ASK-OFFER-${candidate.id.slice(0, 8).toUpperCase()}  
**Date:** ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}  

**To:** ${candidate.name}  
**Email:** ${candidate.email}  
**Position:** ${roleTitle} (${department})  
**Requisition No:** ${reqNo}  
**Target Start Date:** ${joiningDate}  
**Work Location:** ${location}  

---

### 1. Executive Summary & Compensation Structure
AskShree Technologies is delighted to extend this formal offer of employment for the position of **${roleTitle}**.

We are excited about the deep domain expertise, leadership, and craft you will bring to our team. Below is the itemized summary of your total remuneration package:

- **Guaranteed Annual Base Salary:** ${currency} ${Number(baseCompensation).toLocaleString()}
- **Annual Performance Incentive:** ${currency} ${Number(performanceBonus).toLocaleString()} (subject to organizational and personal milestones)
- **Total Guaranteed Annual CTC:** ${currency} ${Number(totalCtc).toLocaleString()}
- **Signing Bonus:** ${currency} ${Number(signOnBonus).toLocaleString()} (payable on the first payroll cycle)
- **Long-Term Equity Incentive:** ${equityUnits} AskShree Stock Units subject to standard 4-year vesting with a 1-year cliff.

---

### 2. Benefits & Working Culture
- **Executive Health Cover:** Comprehensive medical, dental, and vision insurance covering employee, spouse, and dependents.
- **Continuous Learning Stipend:** Annual budget of ${currency === "USD" ? "$2,500" : "₹1,50,000"} for professional certifications, conferences, and tooling.
- **Ergonomic Workspace Allowance:** First-month grant for dedicated home-office equipment and high-speed enterprise connectivity.
- **Flexible Paid Time Off:** 24 days annual paid leave plus statutory public holidays and restorative wellness days.

---

### 3. Terms of Employment & Acceptance
1. **Duties & Confidentiality:** You will devote your professional energies and best efforts to the performance of your responsibilities and abide by AskShree's standard Non-Disclosure and IP Assignment agreements.
2. **Digital Signature Validity:** Pursuant to the Information Technology Act and applicable electronic transaction directives, an electronic or typed signature submitted through the AskShree portal constitutes a legally valid and binding execution.

${customNotes ? `\n### Special Addendum:\n${customNotes}\n` : ""}

We eagerly anticipate welcoming you aboard to make great things happen together.

**For AskShree Technologies Inc.**  
*Corporate Talent Operations & Executive Leadership*
`;

    // 1. Insert or update in \`offers\` table
    const { data: existingOffer } = await admin
      .from("offers")
      .select("id")
      .eq("talent_candidate_id", candidate.id)
      .maybeSingle();

    let offerId = existingOffer?.id;

    if (existingOffer) {
      await admin
        .from("offers")
        .update({
          candidate_name: candidate.name,
          candidate_email: candidate.email,
          role_title: roleTitle,
          proposed_ctc_annual: totalCtc,
          currency,
          components,
          notice_period: "30 days",
          joining_date: joiningDate,
          draft_notes: customNotes || null,
          ai_polished_letter: formalLetterText,
          status: "sent",
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOffer.id);
    } else {
      const { data: newOffer, error: offerError } = await admin
        .from("offers")
        .insert({
          created_by: candidate.created_by,
          talent_candidate_id: candidate.id,
          candidate_name: candidate.name,
          candidate_email: candidate.email,
          role_title: roleTitle,
          proposed_ctc_annual: totalCtc,
          currency,
          components,
          notice_period: "30 days",
          joining_date: joiningDate,
          draft_notes: customNotes || null,
          ai_polished_letter: formalLetterText,
          status: "sent",
        })
        .select("id")
        .single();

      if (offerError) {
        console.warn("[offer/generate] offers table insert warning:", offerError.message);
      }
      offerId = newOffer?.id;
    }

    // 2. Advance candidate stage to "offer"!
    const { error: updateError } = await admin
      .from("talent_candidates")
      .update({
        stage: "offer",
        updated_at: new Date().toISOString(),
      })
      .eq("id", candidate.id);

    if (updateError) {
      console.error("[offer/generate] candidate stage update error:", updateError.message);
    }

    // 3. Log audit trail
    await admin.from("talent_audit_log").insert({
      actor_id: candidate.created_by,
      action: "candidate_offer_extended",
      target_type: "candidate",
      target_id: candidate.id,
      metadata: {
        offerId,
        roleTitle,
        totalCtc,
        currency,
        joiningDate,
      },
    });

    const offerUrl = `/candidate/offer/${candidate.id}`;

    return NextResponse.json(
      {
        ok: true,
        data: {
          offerId,
          candidateId: candidate.id,
          stage: "offer",
          roleTitle,
          totalCtc,
          currency,
          joiningDate,
          offerUrl,
          message: "Executive offer successfully orchestrated and dispatched to candidate.",
        },
      },
      { headers: CORS_HEADERS }
    );
  } catch (err) {
    console.error("[offer/generate] unexpected error:", err);
    return NextResponse.json(
      { ok: false, error: "Internal error orchestrating offer." },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}
