import fs from "fs";
import path from "path";
import { createAdminClient } from "@/lib/supabase/admin";

export type KnowledgeCategory =
  | "Culture & Team"
  | "Hiring & Rubrics"
  | "Benefits & Perks"
  | "Company Policies"
  | "General FAQ";

export interface KnowledgeDocument {
  id: string;
  filename: string;
  category: KnowledgeCategory;
  sourceKind: string;
  extractedText: string;
  summary: string;
  fileSize: number;
  wordCount: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// Initial pre-seeded knowledge documents for AskShree
const DEFAULT_DOCUMENTS: KnowledgeDocument[] = [
  {
    id: "kb-default-1",
    filename: "AskShree_Company_Culture_and_Principles.pdf",
    category: "Culture & Team",
    sourceKind: "pdf",
    extractedText: `AskShree Company Culture & Operating Principles:
1. "We have to achieve something great. I need your support. We learn and make it happen." This is our founding mantra and guiding beacon across every team.
2. Extreme Craft and Ownership: We do not ship half-baked solutions. Every interface, API, and interaction must demonstrate luxury polish, high responsiveness, and zero regressions.
3. Continuous Learning: When we encounter an obstacle, we analyze the root cause, adapt immediately, and turn challenges into world-class outcomes.
4. Radical Empathy & Collaboration: Hiring is a deeply human experience. Shree exists to empower both hiring teams and candidates with transparent, respectful, and insightful partnership.
5. Zero-Bias Meritocracy: Every candidate is evaluated solely on demonstrated capability, structured problem-solving, and continuous learning appetite.`,
    summary: "Founding mantra, extreme craft, zero regressions, continuous learning, and zero-bias meritocracy.",
    fileSize: 42800,
    wordCount: 135,
    active: true,
    createdAt: new Date("2026-01-15T09:00:00Z").toISOString(),
    updatedAt: new Date("2026-01-15T09:00:00Z").toISOString(),
  },
  {
    id: "kb-default-2",
    filename: "AskShree_Interview_Stages_and_Evaluation_Rubrics.docx",
    category: "Hiring & Rubrics",
    sourceKind: "docx",
    extractedText: `AskShree Standard Interview Stages & Evaluation Rubrics:
- Stage 1: Autonomous AI Pre-Screening with Shree (30-40 min). Real-time conversational interview calibrating fundamental problem-solving, architectural familiarity, and alignment with open role requirements.
- Stage 2: Technical / Functional Deep Dive (60 min). Interactive pair programming, code walkthrough, or functional case analysis with engineering peers. Focus on maintainable code, edge cases, and algorithmic clarity.
- Stage 3: Systems Design & Craft Review (60 min). Real-world scalability, system resilience, data modeling, and user experience tradeoffs.
- Stage 4: Cultural & Executive Alignment (45 min). Deep dive into leadership principles, ownership track record, and founder mission alignment.
Rubric Dimensions: Problem Decomposition (25%), Technical Depth (30%), Communication & Empathy (20%), Learning Agility (25%). Scores are calibrated with zero bias.`,
    summary: "4-stage interview process (AI Pre-screening, Technical Deep Dive, Systems Design, Culture) and scoring rubrics.",
    fileSize: 58200,
    wordCount: 148,
    active: true,
    createdAt: new Date("2026-01-20T11:30:00Z").toISOString(),
    updatedAt: new Date("2026-01-20T11:30:00Z").toISOString(),
  },
  {
    id: "kb-default-3",
    filename: "AskShree_Global_Benefits_Healthcare_and_Perks.pdf",
    category: "Benefits & Perks",
    sourceKind: "pdf",
    extractedText: `AskShree Global Benefits & Perks Summary:
- Comprehensive Healthcare: Top-tier medical, dental, and vision insurance with 100% premium coverage for team members and 80% coverage for eligible dependents.
- Annual Wellness & Fitness: $1,200 annual wellness reimbursement for gym memberships, fitness trackers, or mental wellness platforms.
- Continuous Learning Stipend: $2,500 annual budget for conferences, technical books, certifications, and specialized courses.
- Parental Leave: 16 weeks of fully paid gender-neutral parental leave for birth, adoption, or surrogacy.
- Paid Time Off: 25 days of flexible paid vacation per calendar year plus national holidays and 10 paid sick/recharge days.
- Modern Hardware: Latest Apple MacBook Pro (M3/M4 Max) or high-spec Lenovo ThinkPad plus dual 4K external monitors.`,
    summary: "Comprehensive healthcare, $1,200 wellness, $2,500 learning budget, 16 weeks parental leave, 25 days vacation, and M3/M4 hardware.",
    fileSize: 39400,
    wordCount: 138,
    active: true,
    createdAt: new Date("2026-02-01T14:00:00Z").toISOString(),
    updatedAt: new Date("2026-02-01T14:00:00Z").toISOString(),
  },
  {
    id: "kb-default-4",
    filename: "AskShree_Remote_Work_and_Equal_Pay_Policy.md",
    category: "Company Policies",
    sourceKind: "md",
    extractedText: `AskShree Remote Work, Equal Pay & Compensation Policy:
- Remote-First Hybrid Flexibility: Team members can work from anywhere with reliable high-speed internet. We operate distributed engineering hubs in Bangalore, Mumbai, and San Francisco with optional collaborative flex-spaces.
- Home Office Setup Allowance: One-time $1,000 stipend to furnish ergonomic desks, chairs, and home workspace peripherals.
- Transparent Pay Bands: Every position adheres to transparent compensation bands benchmarked against the 75th-90th percentile of Tier-1 technology companies.
- Equity & Ownership: All full-time roles include equity grants (Stock Options / RSUs) with a standard 4-year vesting schedule and 1-year cliff, ensuring every team member participates in AskShree's long-term enterprise value.`,
    summary: "Remote-first flexibility, $1,000 home office stipend, top-quartile transparent salary bands, and 4-year vesting equity.",
    fileSize: 24500,
    wordCount: 128,
    active: true,
    createdAt: new Date("2026-02-10T16:20:00Z").toISOString(),
    updatedAt: new Date("2026-02-10T16:20:00Z").toISOString(),
  },
];

// Global in-memory fallback store to ensure zero latency and full compatibility on serverless
let memoryDocs: KnowledgeDocument[] = [...DEFAULT_DOCUMENTS];

// Fallback persistence file path (uses /tmp on serverless/Vercel, src/data locally)
const FALLBACK_DIR =
  process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NODE_ENV === "production"
    ? path.join("/tmp", "askshree_kb")
    : path.join(process.cwd(), "src", "data");
const FALLBACK_FILE = path.join(FALLBACK_DIR, "avatar_knowledge_store.json");

function ensureStoreFile(): KnowledgeDocument[] {
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    if (!fs.existsSync(FALLBACK_FILE)) {
      fs.writeFileSync(FALLBACK_FILE, JSON.stringify(memoryDocs, null, 2), "utf-8");
      return memoryDocs;
    }
    const content = fs.readFileSync(FALLBACK_FILE, "utf-8");
    const parsed = JSON.parse(content);
    if (Array.isArray(parsed) && parsed.length > 0) {
      memoryDocs = parsed;
      return memoryDocs;
    }
    return memoryDocs;
  } catch (err) {
    console.warn("[avatarKnowledge] Fallback store read error, using in-memory store:", err);
    return memoryDocs;
  }
}

function writeStoreFile(docs: KnowledgeDocument[]) {
  memoryDocs = docs;
  try {
    if (!fs.existsSync(FALLBACK_DIR)) {
      fs.mkdirSync(FALLBACK_DIR, { recursive: true });
    }
    fs.writeFileSync(FALLBACK_FILE, JSON.stringify(docs, null, 2), "utf-8");
  } catch (err) {
    console.warn("[avatarKnowledge] Fallback store write error, preserved in memory:", err);
  }
}

/**
 * List all knowledge documents, prioritizing Supabase table if it exists,
 * falling back gracefully to persistent JSON store.
 */
export async function listKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("avatar_knowledge_documents")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && Array.isArray(data) && data.length > 0) {
      return data.map((r) => ({
        id: r.id,
        filename: r.filename,
        category: r.category as KnowledgeCategory,
        sourceKind: r.source_kind || "pdf",
        extractedText: r.extracted_text || "",
        summary: r.summary || "",
        fileSize: r.file_size || 0,
        wordCount: r.word_count || 0,
        active: r.active !== false,
        createdAt: r.created_at,
        updatedAt: r.updated_at || r.created_at,
      }));
    }
  } catch (err) {
    // Supabase table may not be migrated yet; fallback cleanly
  }

  return ensureStoreFile();
}

/**
 * Save or update a knowledge document.
 */
export async function saveKnowledgeDocument(doc: KnowledgeDocument): Promise<KnowledgeDocument> {
  // Try Supabase first
  try {
    const admin = createAdminClient();
    await admin.from("avatar_knowledge_documents").upsert({
      id: doc.id,
      filename: doc.filename,
      category: doc.category,
      source_kind: doc.sourceKind,
      extracted_text: doc.extractedText,
      summary: doc.summary,
      file_size: doc.fileSize,
      word_count: doc.wordCount,
      active: doc.active,
      created_at: doc.createdAt,
      updated_at: doc.updatedAt,
    });
  } catch (err) {
    // Non-fatal, proceed with JSON store
  }

  const current = ensureStoreFile();
  const existingIdx = current.findIndex((d) => d.id === doc.id);
  if (existingIdx >= 0) {
    current[existingIdx] = doc;
  } else {
    current.unshift(doc);
  }
  writeStoreFile(current);
  return doc;
}

/**
 * Toggle document active state.
 */
export async function toggleKnowledgeDocumentActive(id: string, active: boolean): Promise<boolean> {
  try {
    const admin = createAdminClient();
    await admin.from("avatar_knowledge_documents").update({ active }).eq("id", id);
  } catch (err) {
    // Non-fatal
  }

  const current = ensureStoreFile();
  const doc = current.find((d) => d.id === id);
  if (doc) {
    doc.active = active;
    doc.updatedAt = new Date().toISOString();
    writeStoreFile(current);
    return true;
  }
  return false;
}

/**
 * Delete a knowledge document.
 */
export async function deleteKnowledgeDocument(id: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    await admin.from("avatar_knowledge_documents").delete().eq("id", id);
  } catch (err) {
    // Non-fatal
  }

  const current = ensureStoreFile();
  const filtered = current.filter((d) => d.id !== id);
  writeStoreFile(filtered);
  return true;
}

/**
 * Retrieve relevant excerpts from active documents for a given candidate query.
 */
export async function findRelevantKnowledge(
  query: string,
  limit: number = 3
): Promise<Array<{ documentTitle: string; category: string; excerpt: string; score: number }>> {
  const docs = await listKnowledgeDocuments();
  const activeDocs = docs.filter((d) => d.active);

  if (!query || activeDocs.length === 0) return [];

  const rawTokens = query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  // Common stop words to deprioritize
  const stopWords = new Set([
    "what", "where", "when", "which", "who", "whom", "whose", "why", "how",
    "the", "and", "for", "with", "about", "are", "can", "you", "tell", "does",
    "have", "from", "that", "this", "our", "your", "they", "will", "would",
  ]);
  const queryTokens = rawTokens.filter((w) => !stopWords.has(w));

  const scoredDocs: Array<{
    documentTitle: string;
    category: string;
    excerpt: string;
    score: number;
  }> = [];

  for (const doc of activeDocs) {
    let docScore = 0;
    const lowerText = doc.extractedText.toLowerCase();
    const lowerCategory = doc.category.toLowerCase();
    const lowerTitle = doc.filename.toLowerCase();

    // Check token matches safely without regex syntax errors
    for (const token of queryTokens) {
      if (!token) continue;
      if (lowerTitle.includes(token)) docScore += 3;
      if (lowerCategory.includes(token)) docScore += 2.5;

      let occurrences = 0;
      let pos = 0;
      while ((pos = lowerText.indexOf(token, pos)) !== -1) {
        occurrences++;
        pos += token.length;
      }
      docScore += Math.min(occurrences * 1.5, 6);
    }

    if (docScore > 0) {
      // Collect lines or sentences that contain the candidate's query tokens
      const rawLines = doc.extractedText
        .split(/\n+/)
        .map((l) => l.trim())
        .filter(Boolean);

      const matchingLines = rawLines.filter((line) => {
        const lowerLine = line.toLowerCase();
        return queryTokens.some((tok) => lowerLine.includes(tok));
      });

      let bestExcerpt = "";
      if (matchingLines.length > 0) {
        bestExcerpt = matchingLines.slice(0, 3).join(" ");
      } else {
        bestExcerpt = doc.extractedText.slice(0, 400).replace(/\n+/g, " ");
      }

      scoredDocs.push({
        documentTitle: doc.filename,
        category: doc.category,
        excerpt: bestExcerpt.slice(0, 450),
        score: docScore + matchingLines.length * 2,
      });
    }
  }

  return scoredDocs.sort((a, b) => b.score - a.score).slice(0, limit);
}

/**
 * Perform real-time web search grounding if the query requests external market data,
 * competitor benchmarks, industry standards, or outside facts.
 */
export async function performAvatarWebSearch(
  query: string
): Promise<{ success: boolean; results: Array<{ title: string; snippet: string; link: string }>; answerBox?: string }> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) {
    return { success: false, results: [] };
  }

  try {
    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ q: `${query} tech hiring benchmark`, num: 4 }),
    });

    if (!res.ok) return { success: false, results: [] };
    const json = await res.json();

    const results = (json.organic || []).slice(0, 3).map((r: { title?: string; snippet?: string; link?: string }) => ({
      title: r.title || "",
      snippet: r.snippet || "",
      link: r.link || "",
    }));

    const answerBox = json.answerBox?.answer || json.answerBox?.snippet || undefined;
    return { success: true, results, answerBox };
  } catch (err) {
    return { success: false, results: [] };
  }
}
