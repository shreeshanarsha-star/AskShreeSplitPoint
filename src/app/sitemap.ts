import { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

// Lists published, non-confidential talent_job_postings for Google Search Console.
// Excluded: draft/closed postings, and all postings where hide_company_name is true.
// talent_job_postings table may not exist yet (DRAFT migration pending);
// on error we return just the base URLs so builds do not fail.
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://www.askshree.com";

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${base}/jobs`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    { url: `${base}/signup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  ];

  try {
    const admin = createAdminClient();
    const { data: postings } = await admin
      .from("talent_job_postings")
      .select("id, updated_at")
      .eq("status", "published")
      .eq("board", "askshree")
      .eq("hide_company_name", false);

    const jobRoutes: MetadataRoute.Sitemap = (postings ?? []).map((p) => ({
      url: `${base}/jobs/${p.id}`,
      lastModified: p.updated_at ? new Date(p.updated_at) : new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    }));

    return [...staticRoutes, ...jobRoutes];
  } catch {
    // talent_job_postings table not yet created — return base only.
    return staticRoutes;
  }
}