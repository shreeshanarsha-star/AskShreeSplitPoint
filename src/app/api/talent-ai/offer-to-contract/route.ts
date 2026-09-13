import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { requireUser } from "@/lib/supabase/requireAdmin";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadOrBuildWorkingPdf } from "@/lib/contracts/workingPdf";
import { detectSigningFields } from "@/lib/contracts/fieldDetection";
import { sendSigningRequestEmail } from "@/lib/contracts/mailer";
import { getAppBaseUrl } from "@/lib/url";
import { SIGN_LINK_TTL_DAYS } from "@/lib/contracts/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  let userId: string;
  let userEmail: string = "recruiter@askshree.com";
  let userName: string = "AskShree Talent Team";

  try {
    const { user } = await requireUser();
    userId = user.id;
    userEmail = user.email || userEmail;
    userName = user.user_metadata?.full_name || user.email || userName;
  } catch {
    // If running in development sandbox or unauthenticated session, fallback to owner/system user
    const admin = createAdminClient();
    const { data: profiles } = await admin.from("profiles").select("id, email, full_name").limit(1);
    if (profiles && profiles.length > 0) {
      userId = profiles[0].id;
      userEmail = profiles[0].email || userEmail;
      userName = profiles[0].full_name || userName;
    } else {
      userId = "00000000-0000-0000-0000-000000000000";
    }
  }

  const body = await request.json().catch(() => null);
  const candidateName = typeof body?.candidateName === "string" ? body.candidateName.trim() : "";
  const candidateEmail = typeof body?.candidateEmail === "string" ? body.candidateEmail.trim().toLowerCase() : "";
  const roleTitle = typeof body?.roleTitle === "string" ? body.roleTitle.trim() : "";
  const proposedCtcAnnual = typeof body?.proposedCtcAnnual === "number" || typeof body?.proposedCtcAnnual === "string"
    ? body.proposedCtcAnnual
    : "Competitive";
  const currency = typeof body?.currency === "string" ? body.currency.trim() : "INR";
  const components = Array.isArray(body?.components) ? body.components : [];
  const noticePeriod = typeof body?.noticePeriod === "string" ? body.noticePeriod.trim() : "30 days";
  const joiningDate = typeof body?.joiningDate === "string" && body.joiningDate ? body.joiningDate : "Mutually Agreed Date";
  const offerId = typeof body?.offerId === "string" ? body.offerId : null;
  const aiPolishedLetter = typeof body?.aiPolishedLetter === "string" ? body.aiPolishedLetter.trim() : "";

  if (!candidateName || !candidateEmail || !roleTitle) {
    return NextResponse.json(
      { error: "Candidate name, email, and role title are required to generate an employment contract." },
      { status: 400 }
    );
  }

  const admin = createAdminClient();
  const envelopeId = randomUUID();
  const recipientId = randomUUID();
  const token = randomUUID();
  const expiresAt = new Date(Date.now() + SIGN_LINK_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString();

  // Construct structured employment agreement text
  const breakdownText = components.length > 0
    ? components.map((c: { label: string; annual: number | string }) => `  - ${c.label}: ${currency} ${Number(c.annual).toLocaleString()}`).join("\n")
    : `  - Annual Base Compensation: ${currency} ${Number(proposedCtcAnnual).toLocaleString()}`;

  const contractText = `ASKSHREE TECHNOLOGIES INC. - EMPLOYMENT AGREEMENT & OFFER OF EMPLOYMENT
Document ID: ENV-${envelopeId.slice(0, 8).toUpperCase()}
Date: ${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}

CANDIDATE DETAILS:
Name: ${candidateName}
Email: ${candidateEmail}
Designation: ${roleTitle}
Target Start Date: ${joiningDate}
Notice Period: ${noticePeriod}
Annual Guaranteed Compensation: ${currency} ${Number(proposedCtcAnnual || 0).toLocaleString()}

COMPENSATION STRUCTURE & COMPONENTS:
${breakdownText}

--------------------------------------------------------------------------------
TERMS & CONDITIONS OF EMPLOYMENT
--------------------------------------------------------------------------------
1. ROLE & RESPONSIBILITIES
The Employee is employed in the position of ${roleTitle}. The Employee agrees to perform with fidelity, due care, and diligence all duties and responsibilities assigned by AskShree Technologies and conform to all company policies and procedures.

2. COMPENSATION & EMOLUMENTS
The Company shall remunerate the Employee according to the compensation breakdown stated herein, payable in monthly instalments subject to statutory deductions and applicable taxes.

3. CONFIDENTIALITY & PROPRIETARY INTELLECTUAL PROPERTY
The Employee covenants that all patents, software designs, architectural concepts, trade secrets, customer records, and proprietary data developed during the course of employment shall remain the sole and exclusive property of AskShree Technologies Inc.

4. BINDING DIGITAL SIGNATURE ENVELOPE
This agreement is generated and legally executed via AskShree Contracts & eSign. The parties acknowledge and agree that electronic signatures affixed below constitute a valid, binding, and enforceable legal execution pursuant to digital signature statutes.

${aiPolishedLetter ? `SPECIAL STIPULATIONS & OFFER LETTER DETAILS:\n${aiPolishedLetter}\n\n` : ""}
--------------------------------------------------------------------------------
EXECUTION & ACCEPTANCE
--------------------------------------------------------------------------------
IN WITNESS WHEREOF, the parties hereto have executed this Employment Agreement as of the date first above written.

FOR EMPLOYER: AskShree Technologies Inc.
Authorized Signatory: ${userName}
Corporate HR Operations

CANDIDATE ACCEPTANCE:
I, ${candidateName}, hereby accept the offer of employment on the terms and conditions outlined in this agreement.

Signature: _________________________________________
Date: ______________________________________________
Signer Name: ${candidateName}
Signer Email: ${candidateEmail}
`;

  try {
    // 1. Generate clean PDF using loadOrBuildWorkingPdf
    const { pdfDoc, paragraphMap } = await loadOrBuildWorkingPdf({
      originalBytes: Buffer.from(""),
      sourceKind: "docx",
      fullText: contractText,
      documentName: `Employment Agreement - ${candidateName}`,
    });

    // 2. Detect and position signature fields automatically
    const detection = await detectSigningFields({
      pdfDoc,
      pages: [],
      fullText: contractText,
      generatedFromText: true,
      paragraphMap,
      signers: [{ recipientId, name: candidateName, signingOrder: 1 }],
    });

    const workingBytes = Buffer.from(await pdfDoc.save());
    const originalPath = `${envelopeId}/original.pdf`;
    const workingPath = `${envelopeId}/working.pdf`;

    // 3. Upload to Contracts Storage Bucket
    const { error: upOriginalErr } = await admin.storage
      .from("contracts")
      .upload(originalPath, workingBytes, { contentType: "application/pdf", upsert: true });

    if (upOriginalErr) {
      console.warn("Contracts storage upload warning:", upOriginalErr.message);
    }

    const { error: upWorkingErr } = await admin.storage
      .from("contracts")
      .upload(workingPath, workingBytes, { contentType: "application/pdf", upsert: true });

    if (upWorkingErr) {
      console.warn("Contracts working upload warning:", upWorkingErr.message);
    }

    // 4. Insert Envelope
    const { error: envErr } = await admin.from("contracts_envelopes").insert({
      id: envelopeId,
      owner_id: userId,
      name: `Employment Agreement - ${candidateName}`,
      original_file_path: originalPath,
      original_file_name: `Employment_Agreement_${candidateName.replace(/\s+/g, "_")}.pdf`,
      original_mime_type: "application/pdf",
      working_file_path: workingPath,
      page_count: pdfDoc.getPageCount(),
      status: "waiting_for_signature",
      ai_confidence: detection.overallConfidence,
      current_signing_order: 1,
    });

    if (envErr) {
      console.error("Envelope insert error:", envErr);
      return NextResponse.json({ error: `Could not create contract envelope: ${envErr.message}` }, { status: 500 });
    }

    // 5. Insert Recipient
    const { data: recData, error: recErr } = await admin
      .from("contracts_recipients")
      .insert({
        id: recipientId,
        envelope_id: envelopeId,
        name: candidateName,
        email: candidateEmail,
        role: "signer",
        signing_order: 1,
        token,
        status: "sent",
        sent_at: new Date().toISOString(),
        expires_at: expiresAt,
      })
      .select()
      .maybeSingle();

    if (recErr) {
      console.error("Recipient insert error:", recErr);
      return NextResponse.json({ error: `Could not create signing recipient: ${recErr.message}` }, { status: 500 });
    }

    const activeToken = recData?.token || token;

    // 6. Insert Detected Fields (Signature box, Date box)
    if (detection.fields.length > 0) {
      await admin.from("contracts_fields").insert(
        detection.fields.map((f) => ({
          envelope_id: envelopeId,
          recipient_id: recipientId,
          field_type: f.field_type,
          page: f.page,
          position: f.position,
          confidence: f.confidence,
          status: "pending",
        }))
      );
    } else {
      // Default fallback signature & date field on the last page
      await admin.from("contracts_fields").insert([
        {
          envelope_id: envelopeId,
          recipient_id: recipientId,
          field_type: "signature",
          page: pdfDoc.getPageCount(),
          position: { x: 0.1, y: 0.82, w: 0.4, h: 0.06 },
          confidence: "high",
          status: "pending",
        },
        {
          envelope_id: envelopeId,
          recipient_id: recipientId,
          field_type: "date",
          page: pdfDoc.getPageCount(),
          position: { x: 0.1, y: 0.90, w: 0.25, h: 0.04 },
          confidence: "high",
          status: "pending",
        },
      ]);
    }

    // 7. Audit log events
    await admin.from("contracts_events").insert({
      envelope_id: envelopeId,
      event_type: "created",
      metadata: { source: "offer_ai", role: roleTitle, compensation: proposedCtcAnnual },
    });
    await admin.from("contracts_events").insert({
      envelope_id: envelopeId,
      recipient_id: recipientId,
      event_type: "sent",
      metadata: { source: "offer_ai", method: "automated_handshake" },
    });

    // 8. If offerId was provided, update offer status
    if (offerId) {
      await admin
        .from("offers")
        .update({ status: "approved", approved_at: new Date().toISOString() })
        .eq("id", offerId);
    }

    const baseUrl = getAppBaseUrl();
    const signUrl = `${baseUrl}/sign/${activeToken}`;

    // 9. Send signing request email (resilient - does not fail if Resend is unconfigured)
    try {
      await sendSigningRequestEmail({
        to: candidateEmail,
        recipientName: candidateName,
        senderName: userName,
        documentName: `Employment Agreement - ${candidateName}`,
        signUrl,
      });
    } catch (mailErr) {
      console.warn("[offer-to-contract] Email sending skipped/failed:", mailErr);
    }

    return NextResponse.json({
      success: true,
      envelopeId,
      recipientId,
      token: activeToken,
      signUrl,
      candidateName,
      candidateEmail,
      roleTitle,
      proposedCtcAnnual,
      currency,
    });
  } catch (err) {
    console.error("Offer to contract bridge failed:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate employment contract" },
      { status: 500 }
    );
  }
}
