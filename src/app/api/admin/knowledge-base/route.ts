import { NextResponse } from "next/server";
import { requireAdminUser } from "@/lib/supabase/requireAdmin";
import { extractFileText } from "@/lib/jdstudio/extractText";
import {
  listKnowledgeDocuments,
  saveKnowledgeDocument,
  toggleKnowledgeDocumentActive,
  deleteKnowledgeDocument,
  KnowledgeCategory,
  KnowledgeDocument,
} from "@/lib/avatarKnowledge";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// This route reads/writes Shree AI's knowledge base with the admin
// (service-role) client, which bypasses RLS entirely -- so the route
// handler itself is the only thing standing between the open internet and
// every document in it. It previously had no auth check at all: anyone
// could GET the full knowledge base, or POST/PATCH/DELETE to rewrite what
// the AI tells candidates and recruiters. requireAdminUser() below is not
// optional here.

export async function GET() {
  try {
    await requireAdminUser();
    const documents = await listKnowledgeDocuments();
    return NextResponse.json({ documents });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to load knowledge documents." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    await requireAdminUser();
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as KnowledgeCategory) || "General FAQ";

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const extracted = await extractFileText(buffer, file.name, file.type);
    const fullText = extracted.fullText.trim();

    if (!fullText) {
      return NextResponse.json(
        {
          error:
            "Could not extract readable text from this file. Please verify it contains text or try converting to PDF/DOCX/TXT/MD.",
        },
        { status: 422 }
      );
    }

    const words = fullText.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Generate quick summary from the first 2-3 sentences
    const sentences = fullText
      .replace(/\n+/g, " ")
      .split(/(?<=[.?!])\s+/)
      .filter((s) => s.length > 10);
    const summary = sentences.slice(0, 2).join(" ").slice(0, 260) || fullText.slice(0, 200);

    const newDoc: KnowledgeDocument = {
      id: `kb-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      filename: file.name,
      category,
      sourceKind: extracted.sourceKind,
      extractedText: fullText,
      summary,
      fileSize: file.size,
      wordCount,
      active: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveKnowledgeDocument(newDoc);
    return NextResponse.json({ success: true, document: saved });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[knowledge-base POST] Upload error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to process knowledge document." },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    await requireAdminUser();
    const body = await req.json();
    const { id, active } = body;

    if (!id || typeof active !== "boolean") {
      return NextResponse.json({ error: "Missing document id or active state." }, { status: 400 });
    }

    const ok = await toggleKnowledgeDocumentActive(id, active);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to toggle document status." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    await requireAdminUser();
    const body = await req.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "Missing document id." }, { status: 400 });
    }

    const ok = await deleteKnowledgeDocument(id);
    return NextResponse.json({ success: ok });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to delete document." },
      { status: 500 }
    );
  }
}
