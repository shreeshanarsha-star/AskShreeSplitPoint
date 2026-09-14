// AskShree Content Script: Resilient Multi-Tier Profile Extractor for LinkedIn & GitHub
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXTRACT_PROFILE") {
    try {
      const url = window.location.href;
      let candidate = {
        url,
        source: "LinkedIn Extension",
        name: "",
        headline: "",
        company: "",
        location: "",
        skills: [],
        summary: "",
      };

      if (url.includes("linkedin.com")) {
        candidate.source = "LinkedIn Extension";

        // 1. Candidate Name (Semantic H1 -> Obfuscated classes -> Title fallback)
        const nameEl =
          document.querySelector("main h1") ||
          document.querySelector("h1.text-heading-xlarge") ||
          document.querySelector("div[data-view-name] h1") ||
          document.querySelector(".pv-top-card--list h1") ||
          document.querySelector("h1");
        candidate.name = nameEl ? nameEl.innerText.trim() : "";

        // Fallback name from page title if DOM was not rendered yet
        if (!candidate.name && document.title) {
          const rawTitle = document.title.split("|")[0].split("—")[0].split("-")[0].trim();
          if (rawTitle && !rawTitle.toLowerCase().includes("linkedin")) {
            candidate.name = rawTitle;
          }
        }

        // 2. Headline
        const headlineEl =
          document.querySelector(".text-body-medium.break-words") ||
          document.querySelector("[data-field='headline']") ||
          document.querySelector(".pv-top-card-section__headline") ||
          document.querySelector(".text-body-medium");
        candidate.headline = headlineEl ? headlineEl.innerText.trim() : "";

        // 3. Location
        const locEl =
          document.querySelector(".text-body-small.inline.t-black--light.break-words") ||
          document.querySelector(".pv-top-card--list-bullet > li") ||
          document.querySelector("[data-field='location']") ||
          document.querySelector(".text-body-small");
        candidate.location = locEl ? locEl.innerText.trim() : "";

        // 4. Current Company extraction
        if (candidate.headline.includes(" at ")) {
          candidate.company = candidate.headline.split(" at ")[1].split(/[\•|,|\-]/)[0].trim();
        } else if (candidate.headline.includes(" @ ")) {
          candidate.company = candidate.headline.split(" @ ")[1].split(/[\•|,|\-]/)[0].trim();
        }

        // Check experience section if headline didn't yield company
        if (!candidate.company) {
          const expSection = document.querySelector("#experience");
          if (expSection) {
            const firstCompanyEl = expSection.closest("section")?.querySelector(".t-14.t-normal");
            if (firstCompanyEl) candidate.company = firstCompanyEl.innerText.split("·")[0].trim();
          }
        }

        // 5. Skills extraction from DOM badges
        const skillEls = document.querySelectorAll(
          ".pv-skill-category-entity__name-node, [data-field='skill_card_title'] span[aria-hidden='true'], .hoverable-link-text span[aria-hidden='true']"
        );
        const collectedSkills = new Set();
        skillEls.forEach((el) => {
          const text = el.innerText.trim();
          if (text && text.length < 35 && !text.toLowerCase().includes("endorse")) {
            collectedSkills.add(text);
          }
        });
        candidate.skills = Array.from(collectedSkills).slice(0, 10);

        // 6. Summary / About section
        const aboutEl =
          document.querySelector("#about")?.closest("section")?.querySelector(".inline-show-more-text") ||
          document.querySelector(".pv-about__summary-text");
        candidate.summary = aboutEl ? aboutEl.innerText.trim() : "";

      } else if (url.includes("github.com")) {
        candidate.source = "GitHub Extension";

        const nameEl = document.querySelector(".p-name") || document.querySelector("h1.vcard-names span");
        candidate.name = nameEl ? nameEl.innerText.trim() : "";

        const bioEl = document.querySelector(".p-note.user-profile-bio") || document.querySelector(".user-profile-bio");
        candidate.headline = bioEl ? bioEl.innerText.trim() : "Software Engineer";

        const companyEl = document.querySelector(".p-org") || document.querySelector("[itemprop='worksFor']");
        candidate.company = companyEl ? companyEl.innerText.trim() : "";

        const locEl = document.querySelector(".p-label") || document.querySelector("[itemprop='homeLocation']");
        candidate.location = locEl ? locEl.innerText.trim() : "";

        // Extract languages / top repo topics as skills
        const langEls = document.querySelectorAll("[itemprop='programmingLanguage'], .topic-tag");
        const langs = new Set();
        langEls.forEach((el) => {
          const t = el.innerText.trim();
          if (t) langs.add(t);
        });
        candidate.skills = Array.from(langs).slice(0, 8);
      }

      sendResponse({ ok: true, candidate });
    } catch (err) {
      sendResponse({ ok: false, error: err instanceof Error ? err.message : String(err) });
    }
  }
  return true;
});
