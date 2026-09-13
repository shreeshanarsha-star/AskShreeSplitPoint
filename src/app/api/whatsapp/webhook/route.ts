import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// WhatsApp Cloud API Webhook Verification (GET)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "askshree_webhook_secret";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }

  return NextResponse.json({ error: "Invalid verification token" }, { status: 403 });
}

// WhatsApp Incoming Message Handler (POST)
export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const message = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    const fromNumber = message?.from || "unknown";
    const text = (message?.text?.body || "").trim().toLowerCase();

    let replyText = "";

    if (text.includes("status") || text.includes("application") || text.includes("where do i stand")) {
      replyText = `👋 Hi there! This is Shree, your AI Talent Partner.\n\nYour application for *Senior Full-Stack Engineer* (Req #R-2208261) is currently in *Hiring Manager Review*.\n\n✨ Status: Top calibrated candidate (94% rubric fit)\n📅 Next Step: 45-min Technical Architecture Deep-Dive.\n\nReply *SCHEDULE* to pick an interview slot!`;
    } else if (text.includes("schedule") || text.includes("interview") || text.includes("slot")) {
      replyText = `📅 Let's get your interview scheduled with David Miller (VP Eng) & Priya Patel!\n\nHere are 3 open windows this week:\n1️⃣ Tue, Sep 15 at 2:00 PM PST\n2️⃣ Wed, Sep 16 at 11:00 AM PST\n3️⃣ Thu, Sep 17 at 2:00 PM PST\n\nReply *1*, *2*, or *3* to confirm, or visit: https://askshree.com/schedule/demo`;
    } else if (text === "1" || text === "2" || text === "3") {
      const slots = [
        "Tuesday, Sep 15 at 2:00 PM PST",
        "Wednesday, Sep 16 at 11:00 AM PST",
        "Thursday, Sep 17 at 2:00 PM PST",
      ];
      const chosen = slots[parseInt(text, 10) - 1] || slots[0];
      replyText = `🎉 Confirmed! Your Technical Architecture interview is booked for:\n\n*${chosen}*\n\nWe've sent a Google Meet invite and calendar hold to your email. Best of luck!`;
    } else {
      replyText = `👋 Hello from Shree! I'm your AI Talent Acquisition Partner.\n\nI can help you with:\n• Type *STATUS* to check your application progress\n• Type *SCHEDULE* to pick an interview time slot\n• Type *CULTURE* to learn about our tech stack & team\n\nHow can I help you today?`;
    }

    return NextResponse.json({
      status: "received",
      from: fromNumber,
      reply: replyText,
    });
  } catch (err) {
    console.error("WhatsApp webhook error:", err);
    return NextResponse.json({ status: "ok" });
  }
}
