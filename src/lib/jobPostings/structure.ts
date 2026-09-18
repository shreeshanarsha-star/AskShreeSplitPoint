import { callTextModel } from "@/lib/aiClient";

// Structures a raw JD into a listing. Ported from the old askshree-app
// repo's lib/aiScreen.js structureJD(). Deliberately exactly 3 must-have +
// 3 good-to-have skills (not 5) — kept short and forced-priority rather
// than a padded-out five.
const STRUCTURE_PROMPT = `You structure a raw job description into a listing for a job board.
Read the JD text and extract, as JSON only (no markdown fences, no prose):
{
  "title": string,
  "company": string,
  "company_url": string or null (only if explicitly present in the text, never invented),
  "location": string,
  "must_have_skills": array of exactly 3 short strings — the single most important, truly
    non-negotiable technical skills. If the JD lists more than 3, pick the 3 most critical.
    If it lists fewer, infer the most reasonable adjacent ones from context.
  "good_to_have_skills": array of exactly 3 short strings — same rule, for nice-to-haves.
  "qualification": string (one line — the required degree/qualification),
  "min_years_experience": number or null (minimum years of experience required, if stated
    or clearly implied — e.g. "5+ years" -> 5; leave null if genuinely not indicated),
  "industry": string or null (the industry/domain this role sits in, if the JD indicates one —
    e.g. "FMCG", "SaaS", "Healthcare"; null if not clear),
  "ctc_budget": string or null (compensation/budget for the role, only if explicitly stated in
    the JD text — never invented, null if not mentioned)
}
Never fabricate a company name, URL, or location that isn't in the text. If company_url truly
isn't present, use null.

--- Job description text ---
`;

export interface StructuredJD {
  title: string;
  company: string;
  company_url: string | null;
  location: string;
  must_have_skills: string[];
  good_to_have_skills: string[];
  qualification: string;
  min_years_experience: number | null;
  industry: string | null;
  ctc_budget: string | null;
}

function extractHeuristicJD(jdText: string): StructuredJD {
  const text = jdText || "";
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Title Extraction
  let title = "";
  const titleLine = lines.find((l) => /^(?:job\s+title|title|role|position|opening)\s*[:\-]\s*(.+)/i.test(l));
  if (titleLine) {
    const match = titleLine.match(/^(?:job\s+title|title|role|position|opening)\s*[:\-]\s*(.+)/i);
    if (match?.[1]) title = match[1].trim();
  }
  if (!title && lines.length > 0) {
    // Pick first clean line that looks like a title (under 60 chars, not starting with about/company)
    const candidate = lines.find((l) => l.length >= 4 && l.length <= 60 && !/^(about|company|overview|summary|http|www)/i.test(l));
    if (candidate) title = candidate.replace(/^#+\s*/, "").trim();
  }
  if (!title) title = "Requisition Specialist";

  // 2. Location
  let location = "Remote / Flexible";
  const locLine = lines.find((l) => /^(?:location|workplace|work\s+location|job\s+location)\s*[:\-]\s*(.+)/i.test(l));
  if (locLine) {
    const match = locLine.match(/^(?:location|workplace|work\s+location|job\s+location)\s*[:\-]\s*(.+)/i);
    if (match?.[1]) location = match[1].trim();
  } else if (/remote/i.test(text)) {
    location = "Remote";
  } else if (/hybrid/i.test(text)) {
    location = "Hybrid";
  } else {
    const cities = ["Bengaluru", "Bangalore", "Mumbai", "Pune", "Hyderabad", "Delhi", "Gurgaon", "Noida", "Chennai", "San Francisco", "New York", "London", "Singapore", "Austin", "Seattle"];
    const foundCity = cities.find((c) => new RegExp(`\\b${c}\\b`, "i").test(text));
    if (foundCity) location = foundCity;
  }

  // 3. Department / Industry
  let industry = "Engineering & Technology";
  if (/(?:sales|account\s+exec|bdr|sdr)/i.test(title + " " + text)) industry = "Sales & Commercial";
  else if (/(?:marketing|growth|content|seo)/i.test(title + " " + text)) industry = "Marketing & Growth";
  else if (/(?:product\s+manager|product\s+lead|cpo)/i.test(title + " " + text)) industry = "Product Management";
  else if (/(?:design|ui\/ux|ux|figma)/i.test(title + " " + text)) industry = "Design & Creative";
  else if (/(?:hr|talent|recruiter|people)/i.test(title + " " + text)) industry = "Human Resources";
  else if (/(?:finance|accounting|audit)/i.test(title + " " + text)) industry = "Finance & Legal";
  else if (/(?:legal|counsel|compliance)/i.test(title + " " + text)) industry = "Legal & Compliance";

  // 4. Skills extraction
  const explicitSkillsLine = lines.find((l) => /^(?:required\s+skills|must\s+have\s+skills|core\s+skills|skills|technologies)\s*[:\-]\s*(.+)/i.test(l));
  let matchedSkills: string[] = [];
  if (explicitSkillsLine) {
    const raw = explicitSkillsLine.replace(/^(?:required\s+skills|must\s+have\s+skills|core\s+skills|skills|technologies)\s*[:\-]\s*/i, "");
    matchedSkills = raw.split(/[,;|•·/]/).map((s) => s.trim()).filter((s) => s.length >= 2 && s.length <= 35);
  }

  if (matchedSkills.length === 0) {
    const techSkills = [
      "React", "TypeScript", "JavaScript", "Next.js", "Node.js", "Python", "Java", "Go", "C++",
      "SQL", "PostgreSQL", "MongoDB", "Redis", "AWS", "GCP", "Azure", "Docker", "Kubernetes",
      "GraphQL", "REST", "CI/CD", "Tailwind CSS", "Microservices", "System Design",
      "Product Strategy", "User Research", "Agile", "Scrum", "Data Analysis", "Machine Learning"
    ];
    for (const skill of techSkills) {
      if (new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(text)) {
        matchedSkills.push(skill);
      }
    }
  }

  const must_have_skills = matchedSkills.slice(0, 3);
  const good_to_have_skills = matchedSkills.slice(3, 6);
  if (must_have_skills.length === 0) {
    must_have_skills.push("Problem Solving", "Communication", "Domain Expertise");
  }

  // 5. Min Years Experience
  let min_years_experience: number | null = null;
  const expMatch = text.match(/(\d+)\+?\s*(?:-\s*\d+)?\s*(?:years?|yrs?)(?:\s+of)?\s+(?:experience|exp)/i)
    || text.match(/(?:minimum|min|at least)\s+(\d+)\+?\s*(?:years?|yrs?)/i);
  if (expMatch?.[1]) {
    min_years_experience = parseInt(expMatch[1], 10);
  }

  // 6. CTC / Budget
  let ctc_budget: string | null = null;
  const ctcMatch = text.match(/(\$\s*\d+[\d,]*(?:\s*k|\s*m)?(?:\s*-\s*\$?\s*\d+[\d,]*(?:\s*k|\s*m)?)?)/i)
    || text.match(/(\d+(?:\.\d+)?\s*(?:-\s*\d+(?:\.\d+)?\s*)?\s*LPA)/i)
    || text.match(/(?:salary|ctc|compensation|budget)\s*[:\-]\s*([^\n,;]+)/i);
  if (ctcMatch?.[1]) {
    ctc_budget = ctcMatch[1].trim();
  }

  // 7. Qualification
  let qualification = "Bachelor's degree or equivalent experience";
  const qualLine = lines.find((l) => /^(?:qualification|education|degree)\s*[:\-]\s*(.+)/i.test(l));
  if (qualLine) {
    const match = qualLine.match(/^(?:qualification|education|degree)\s*[:\-]\s*(.+)/i);
    if (match?.[1]) qualification = match[1].trim();
  } else {
    const qualMatch = text.match(/\b(b\.?tech|b\.?e\b|bachelor'?s|master'?s|m\.?tech|mba|b\.?sc|m\.?sc|bs\b|ms\b|phd\b)[^\n,;]*/i);
    if (qualMatch?.[0]) {
      qualification = qualMatch[0].trim();
    }
  }

  // 8. Company
  let company = "AskShree Partner";
  const compLine = lines.find((l) => /^(?:company|organization|employer)\s*[:\-]\s*(.+)/i.test(l));
  if (compLine) {
    const match = compLine.match(/^(?:company|organization|employer)\s*[:\-]\s*(.+)/i);
    if (match?.[1]) company = match[1].trim();
  }

  return {
    title,
    company,
    company_url: null,
    location,
    must_have_skills,
    good_to_have_skills,
    qualification,
    min_years_experience,
    industry,
    ctc_budget,
  };
}

export async function structureJD(jdText: string): Promise<StructuredJD> {
  try {
    const raw = await callTextModel(`${STRUCTURE_PROMPT}${jdText.slice(0, 4000)}`, 1200);
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<StructuredJD>;

    return {
      title: parsed.title || "Untitled role",
      company: parsed.company || "Confidential",
      company_url: parsed.company_url ?? null,
      location: parsed.location || "Not specified",
      must_have_skills: Array.isArray(parsed.must_have_skills) && parsed.must_have_skills.length > 0
        ? parsed.must_have_skills.slice(0, 3)
        : ["Problem Solving", "Communication"],
      good_to_have_skills: Array.isArray(parsed.good_to_have_skills)
        ? parsed.good_to_have_skills.slice(0, 3)
        : [],
      qualification: parsed.qualification || "Bachelor's degree or equivalent",
      min_years_experience:
        typeof parsed.min_years_experience === "number" ? parsed.min_years_experience : null,
      industry: parsed.industry ?? "Engineering & Technology",
      ctc_budget: parsed.ctc_budget ?? null,
    };
  } catch (err) {
    console.warn("AI JD structuring failed, falling back to deterministic extraction:", err);
    return extractHeuristicJD(jdText);
  }
}
