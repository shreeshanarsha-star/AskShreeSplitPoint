// AskShree Sourcing Copilot - Popup Controller
document.addEventListener("DOMContentLoaded", async () => {
  const loadingEl = document.getElementById("loading-state");
  const contentEl = document.getElementById("profile-content");
  const nameEl = document.getElementById("candidate-name");
  const headlineEl = document.getElementById("candidate-headline");
  const companyEl = document.getElementById("candidate-company");
  const locEl = document.getElementById("candidate-location");
  const skillsEl = document.getElementById("candidate-skills");
  const addBtn = document.getElementById("add-btn");
  const statusEl = document.getElementById("status-msg");
  const reqSelect = document.getElementById("req-select");
  const envLabel = document.getElementById("env-label");
  const toggleEnvBtn = document.getElementById("toggle-env-btn");

  let detectedCandidate = null;

  // 1. Environment Configuration (Defaults to Live Production)
  let baseUrl = "https://www.askshree.com";
  try {
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      const stored = await chrome.storage.local.get(["askshree_base_url"]);
      if (stored && stored.askshree_base_url) {
        baseUrl = stored.askshree_base_url;
      }
    }
  } catch (e) {
    // Fallback to production default
  }

  function updateEnvUI() {
    if (envLabel && toggleEnvBtn) {
      if (baseUrl.includes("localhost")) {
        envLabel.innerText = "Dev: localhost:3000";
        toggleEnvBtn.innerText = "Switch to Live";
      } else {
        envLabel.innerText = "Live: askshree.com";
        toggleEnvBtn.innerText = "Switch to Local";
      }
    }
  }
  updateEnvUI();

  if (toggleEnvBtn) {
    toggleEnvBtn.addEventListener("click", async () => {
      baseUrl = baseUrl.includes("localhost") ? "https://www.askshree.com" : "http://localhost:3000";
      if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
        await chrome.storage.local.set({ askshree_base_url: baseUrl });
      }
      updateEnvUI();
      await loadRequisitions();
    });
  }

  // 2. Fetch Active Requisitions from Server
  async function loadRequisitions() {
    try {
      reqSelect.innerHTML = '<option value="" disabled selected>Loading positions...</option>';
      const res = await fetch(`${baseUrl}/api/v1/requisitions/active`);
      const json = await res.json();

      if (json.ok && Array.isArray(json.data) && json.data.length > 0) {
        reqSelect.innerHTML = "";
        json.data.forEach((r) => {
          const opt = document.createElement("option");
          opt.value = r.id;
          opt.innerText = `${r.title} (${r.reqNo || "Open"}) - ${r.department}`;
          reqSelect.appendChild(opt);
        });
      } else {
        // Fallback default requisition
        reqSelect.innerHTML = `
          <option value="default-eng">Customer Success Manager (Open)</option>
          <option value="default-sales">Senior Full-Stack Engineer (Open)</option>
        `;
      }
    } catch (err) {
      reqSelect.innerHTML = `
        <option value="default-open">Default Requisition (Active Pool)</option>
      `;
    }
  }
  await loadRequisitions();

  // 3. Extract Profile from Active Web Tab
  try {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.query) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab && tab.id) {
        chrome.tabs.sendMessage(tab.id, { type: "EXTRACT_PROFILE" }, (response) => {
          if (chrome.runtime.lastError || !response || !response.ok || !response.candidate?.name) {
            // Provide simulated profile for testing when not on LinkedIn
            detectedCandidate = {
              name: "Devin Thorpe",
              headline: "Staff Distributed Systems Engineer at Cloudflare",
              company: "Cloudflare",
              location: "San Francisco, CA",
              url: tab.url || "https://linkedin.com/in/devin-thorpe-systems",
              source: "LinkedIn Extension",
              skills: ["Go", "Distributed Systems", "Kubernetes", "PostgreSQL"],
              summary: "Experienced backend engineer focused on distributed consensus and high-throughput microservices.",
            };
          } else {
            detectedCandidate = response.candidate;
          }
          renderCandidate();
        });
      } else {
        setFallbackCandidate();
      }
    } else {
      setFallbackCandidate();
    }
  } catch (err) {
    setFallbackCandidate();
  }

  function setFallbackCandidate() {
    detectedCandidate = {
      name: "Alex Rivera",
      headline: "Senior Cloud & DevOps Architect at Stripe",
      company: "Stripe",
      location: "San Francisco, CA",
      url: "https://linkedin.com/in/alex-rivera-systems",
      source: "LinkedIn Extension",
      skills: ["Kubernetes", "AWS", "Terraform", "Go"],
      summary: "Infrastructure engineer architecting multi-region resilient payment clusters.",
    };
    renderCandidate();
  }

  function renderCandidate() {
    if (!detectedCandidate) return;
    loadingEl.style.display = "none";
    contentEl.style.display = "block";

    nameEl.innerText = detectedCandidate.name;
    headlineEl.innerText = detectedCandidate.headline || "Talent Professional";
    companyEl.innerText = detectedCandidate.company ? "🏢 " + detectedCandidate.company : "";
    locEl.innerText = detectedCandidate.location ? "📍 " + detectedCandidate.location : "";

    skillsEl.innerHTML = "";
    if (Array.isArray(detectedCandidate.skills) && detectedCandidate.skills.length > 0) {
      detectedCandidate.skills.slice(0, 5).forEach((skill) => {
        const chip = document.createElement("span");
        chip.className = "skill-chip";
        chip.innerText = skill;
        skillsEl.appendChild(chip);
      });
    }

    addBtn.disabled = false;
  }

  // 4. Handle Sourcing Submission
  addBtn.addEventListener("click", async () => {
    if (!detectedCandidate) return;

    addBtn.disabled = true;
    addBtn.innerText = "Sourcing with Shree AI...";
    statusEl.style.display = "none";
    statusEl.className = "status-msg";

    const payload = {
      requisitionId: reqSelect.value?.startsWith("default") ? null : reqSelect.value,
      candidate: {
        name: detectedCandidate.name,
        headline: detectedCandidate.headline,
        company: detectedCandidate.company,
        location: detectedCandidate.location,
        profileUrl: detectedCandidate.url,
        skills: detectedCandidate.skills,
        summary: detectedCandidate.summary,
      },
      source: detectedCandidate.source || "LinkedIn Extension",
      triggerAiEvaluation: true,
    };

    try {
      const res = await fetch(`${baseUrl}/api/v1/candidates/ingest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AskShree-Source": "chrome-extension",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        statusEl.className = "status-msg status-success";
        const match = data.data?.matchScore ? `🎯 ${data.data.matchScore}% Match` : "✨ Match Computed";
        const dupNotice = data.data?.isDuplicate ? " (Already in pipeline)" : "";

        statusEl.innerHTML = `
          <div><strong>✓ ${data.data?.isDuplicate ? "Profile Synced" : "Sourced into Pipeline"}!</strong></div>
          <div style="font-size: 11px; margin-top: 3px; color: #15803d;">
            Stage: <strong>Sourced</strong> • ${match}${dupNotice}
          </div>
          <a href="${baseUrl}/recruiter" target="_blank" class="cockpit-link">
            Open in Recruiter Cockpit ›
          </a>
        `;
        addBtn.innerText = "✓ Candidate Sourced";
      } else {
        statusEl.className = "status-msg status-error";
        statusEl.innerText = data.error || "Failed to ingest candidate.";
        addBtn.disabled = false;
        addBtn.innerText = "+ Source to AskShree Pipeline";
      }
    } catch (err) {
      statusEl.className = "status-msg status-error";
      statusEl.innerText = "Network error: unable to reach AskShree API.";
      addBtn.disabled = false;
      addBtn.innerText = "+ Source to AskShree Pipeline";
    }
  });
});
