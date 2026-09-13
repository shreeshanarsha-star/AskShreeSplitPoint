// AskShree Content Script: Safe DOM Extraction from LinkedIn & GitHub
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXTRACT_PROFILE") {
    try {
      const url = window.location.href;
      let candidate = {
        url,
        source: "web",
        name: "",
        headline: "",
        company: "",
        location: "",
        skills: [],
      };

      if (url.includes("linkedin.com/in")) {
        candidate.source = "linkedin";
        // LinkedIn extraction
        const nameEl = document.querySelector("h1.text-heading-xlarge") || document.querySelector("h1");
        candidate.name = nameEl ? nameEl.innerText.trim() : "";

        const headlineEl = document.querySelector(".text-body-medium.break-words") || document.querySelector(".text-body-medium");
        candidate.headline = headlineEl ? headlineEl.innerText.trim() : "";

        const locEl = document.querySelector(".text-body-small.inline.t-black--light.break-words") || document.querySelector(".text-body-small");
        candidate.location = locEl ? locEl.innerText.trim() : "";

        // Extract company from headline or experience if present
        if (candidate.headline.includes(" at ")) {
          candidate.company = candidate.headline.split(" at ")[1].split("•")[0].trim();
        }
      } else if (url.includes("github.com")) {
        candidate.source = "github";
        // GitHub extraction
        const nameEl = document.querySelector(".p-name") || document.querySelector("h1");
        candidate.name = nameEl ? nameEl.innerText.trim() : "";

        const bioEl = document.querySelector(".p-note.user-profile-bio") || document.querySelector(".user-profile-bio");
        candidate.headline = bioEl ? bioEl.innerText.trim() : "";

        const companyEl = document.querySelector(".p-org") || document.querySelector("[itemprop='worksFor']");
        candidate.company = companyEl ? companyEl.innerText.trim() : "";

        const locEl = document.querySelector(".p-label") || document.querySelector("[itemprop='homeLocation']");
        candidate.location = locEl ? locEl.innerText.trim() : "";
      }

      sendResponse({ ok: true, candidate });
    } catch (err) {
      sendResponse({ ok: false, error: err.message });
    }
  }
  return true;
});
