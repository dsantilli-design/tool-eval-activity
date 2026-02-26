(() => {
  "use strict";

  // ── Data ──
  const SCENARIOS = [
    {
      id: "A",
      title: "AI Auto-Generates Report Card Comments",
      description:
        "A teacher uses an AI tool to automatically generate individualized report card comments for each student based on grades, attendance records, and classroom notes.",
    },
    {
      id: "B",
      title: "AI Summarizes District Policy",
      description:
        "An administrator pastes a 40-page district policy document into an AI tool and asks it to produce a concise two-page summary for staff.",
    },
    {
      id: "C",
      title: "AI Suggests Instructional Groupings Based on Performance Data",
      description:
        "A math coach uploads benchmark assessment results for 120 students and asks an AI tool to recommend flexible instructional groupings.",
    },
    {
      id: "D",
      title: "AI Generates Images for a Science Concept",
      description:
        "A science teacher uses an AI image generator to create detailed diagrams of cell mitosis for a student-facing slide deck.",
    },
  ];

  const FIELDS = {
    behavior: {
      label: "AI Behavior Type",
      type: "radio",
      options: ["Generative", "Predictive", "Assistive", "Adaptive"],
    },
    inputs: {
      label: "Inputs Used",
      type: "checkbox",
      options: ["Text", "Image", "Audio", "Structured data", "Student data"],
    },
    output: {
      label: "Output Type",
      type: "radio",
      options: ["Draft", "Decision recommendation", "Analysis", "Public-facing content"],
    },
    risks: {
      label: "Risks",
      type: "checkbox",
      options: ["Hallucination", "Bias", "Privacy", "Overconfidence", "Synthetic realism"],
    },
    oversight: {
      label: "Oversight Required",
      type: "radio",
      options: ["Light review", "Careful fact-checking", "Professional validation", "Not appropriate"],
    },
    useIt: {
      label: "Would you use it?",
      type: "radio",
      options: ["Yes", "No", "Depends"],
    },
  };

  const STORAGE_KEY = "toolEvalData";

  // ── State ──
  let currentIndex = 0;
  let data = loadData();

  // ── DOM refs ──
  const $ = (sel) => document.querySelector(sel);
  const scenarioView = $("#scenario-view");
  const summaryView = $("#summary-view");
  const scenarioLabel = $("#scenario-label");
  const scenarioTitle = $("#scenario-title");
  const scenarioDesc = $("#scenario-description");
  const justification = $("#justification");
  const btnBack = $("#btn-back");
  const btnNext = $("#btn-next");
  const btnSave = $("#btn-save");
  const btnBackToScenarios = $("#btn-back-to-scenarios");
  const btnDownload = $("#btn-download");
  const btnReset = $("#btn-reset");
  const progressSteps = document.querySelectorAll(".progress-step");

  // ── Init ──
  buildFormControls();
  renderScenario();
  attachListeners();

  // ── Build form option groups ──
  function buildFormControls() {
    const groups = {
      behavior: $("#behavior-group"),
      inputs: $("#inputs-group"),
      output: $("#output-group"),
      risks: $("#risks-group"),
      oversight: $("#oversight-group"),
      useIt: $("#use-group"),
    };

    Object.entries(FIELDS).forEach(([key, field]) => {
      const container = groups[key];
      if (!container) return;
      container.innerHTML = "";
      field.options.forEach((opt) => {
        const id = `${key}_${opt.replace(/\s+/g, "_")}`;
        const label = document.createElement("label");
        label.setAttribute("for", id);
        const input = document.createElement("input");
        input.type = field.type;
        input.name = key;
        input.value = opt;
        input.id = id;
        const span = document.createElement("span");
        span.textContent = opt;
        label.appendChild(input);
        label.appendChild(span);
        container.appendChild(label);
      });
    });
  }

  // ── Render current scenario ──
  function renderScenario() {
    const sc = SCENARIOS[currentIndex];
    scenarioLabel.textContent = `Scenario ${sc.id} of ${SCENARIOS.length}`;
    scenarioTitle.textContent = sc.title;
    scenarioDesc.textContent = sc.description;

    const saved = data[sc.id] || {};

    // Restore selections
    Object.entries(FIELDS).forEach(([key, field]) => {
      const inputs = document.querySelectorAll(`[name="${key}"]`);
      inputs.forEach((inp) => {
        if (field.type === "radio") {
          inp.checked = saved[key] === inp.value;
        } else {
          inp.checked = Array.isArray(saved[key]) && saved[key].includes(inp.value);
        }
      });
    });

    justification.value = saved.justification || "";

    // Navigation state
    btnBack.disabled = currentIndex === 0;
    btnNext.textContent = currentIndex === SCENARIOS.length - 1 ? "Summary →" : "Next →";

    updateProgress();
  }

  // ── Collect current form values ──
  function collectValues() {
    const vals = {};
    Object.entries(FIELDS).forEach(([key, field]) => {
      const checked = [...document.querySelectorAll(`[name="${key}"]:checked`)].map((i) => i.value);
      vals[key] = field.type === "radio" ? checked[0] || null : checked;
    });
    vals.justification = justification.value.trim();
    return vals;
  }

  // ── Autosave ──
  function autosave() {
    const sc = SCENARIOS[currentIndex];
    data[sc.id] = collectValues();
    saveData();
  }

  // ── Progress bar ──
  function updateProgress() {
    progressSteps.forEach((btn) => {
      const idx = btn.dataset.index;
      btn.classList.remove("active", "completed");

      if (idx === "summary") {
        if (scenarioView.classList.contains("hidden")) btn.classList.add("active");
      } else {
        const i = parseInt(idx, 10);
        if (i === currentIndex && !scenarioView.classList.contains("hidden")) {
          btn.classList.add("active");
        }
        const scId = SCENARIOS[i].id;
        if (data[scId] && isScenarioComplete(data[scId])) {
          btn.classList.add("completed");
        }
      }
    });
  }

  function isScenarioComplete(d) {
    return d.behavior && d.inputs && d.inputs.length > 0 && d.output && d.risks && d.risks.length > 0 && d.oversight && d.useIt;
  }

  // ── Show / hide views ──
  function showScenarios() {
    scenarioView.classList.remove("hidden");
    summaryView.classList.add("hidden");
    renderScenario();
  }

  function showSummary() {
    autosave();
    scenarioView.classList.add("hidden");
    summaryView.classList.remove("hidden");
    renderSummary();
    updateProgress();
  }

  // ── Summary ──
  function renderSummary() {
    const container = $("#summary-content");
    container.innerHTML = "";

    // Compact overview table
    const overviewTable = document.createElement("table");
    overviewTable.className = "summary-table";
    overviewTable.innerHTML = `<thead><tr>
      <th>Scenario</th><th>Behavior</th><th>Output</th><th>Oversight</th><th>Use?</th>
    </tr></thead>`;
    const tbody = document.createElement("tbody");

    SCENARIOS.forEach((sc) => {
      const d = data[sc.id];
      const tr = document.createElement("tr");
      if (d && d.behavior) {
        tr.innerHTML = `
          <td><strong>${sc.id}</strong></td>
          <td>${d.behavior || "—"}</td>
          <td>${d.output || "—"}</td>
          <td>${d.oversight || "—"}</td>
          <td>${d.useIt || "—"}</td>`;
      } else {
        tr.innerHTML = `<td><strong>${sc.id}</strong></td><td colspan="4" class="no-data">Not yet completed</td>`;
      }
      tbody.appendChild(tr);
    });
    overviewTable.appendChild(tbody);
    container.appendChild(overviewTable);

    // Expandable cards
    SCENARIOS.forEach((sc) => {
      const d = data[sc.id];
      const card = document.createElement("div");
      card.className = "summary-card";

      const header = document.createElement("div");
      header.className = "summary-card-header";
      header.innerHTML = `<h3>Scenario ${sc.id}: ${sc.title}</h3><span class="toggle-icon">▶</span>`;

      const body = document.createElement("div");
      body.className = "summary-card-body";

      if (d && d.behavior) {
        body.innerHTML = `<table class="summary-table">
          <tr><th>Behavior Type</th><td>${badge(d.behavior, "blue")}</td></tr>
          <tr><th>Inputs</th><td>${(d.inputs || []).map((v) => badge(v, "gray")).join(" ") || "—"}</td></tr>
          <tr><th>Output</th><td>${badge(d.output, "green")}</td></tr>
          <tr><th>Risks</th><td>${(d.risks || []).map((v) => badge(v, "red")).join(" ") || "—"}</td></tr>
          <tr><th>Oversight</th><td>${badge(d.oversight, "amber")}</td></tr>
          <tr><th>Would Use?</th><td>${d.useIt || "—"}</td></tr>
          <tr><th>Justification</th><td>${d.justification || "<em>None provided</em>"}</td></tr>
        </table>`;
      } else {
        body.innerHTML = `<p class="no-data">No responses recorded yet.</p>`;
      }

      header.addEventListener("click", () => {
        header.classList.toggle("open");
        body.classList.toggle("open");
      });

      card.appendChild(header);
      card.appendChild(body);
      container.appendChild(card);
    });
  }

  function badge(text, color) {
    return `<span class="badge badge-${color}">${text}</span>`;
  }

  // ── Save / Load ──
  function saveData() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      // storage unavailable
    }
  }

  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  // ── Toast ──
  function showToast(msg) {
    let toast = document.querySelector(".save-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "save-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2000);
  }

  // ── Download JSON ──
  function downloadJSON() {
    const exportData = SCENARIOS.map((sc) => ({
      scenario: sc.id,
      title: sc.title,
      ...(data[sc.id] || {}),
    }));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tool-evaluation-results.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Listeners ──
  function attachListeners() {
    // Autosave on any form change
    document.querySelectorAll('#eval-form input, #eval-form textarea').forEach((el) => {
      el.addEventListener("change", autosave);
      if (el.tagName === "TEXTAREA") {
        el.addEventListener("input", autosave);
      }
    });

    btnBack.addEventListener("click", () => {
      autosave();
      if (currentIndex > 0) {
        currentIndex--;
        renderScenario();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });

    btnNext.addEventListener("click", () => {
      autosave();
      if (currentIndex < SCENARIOS.length - 1) {
        currentIndex++;
        renderScenario();
      } else {
        showSummary();
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    btnSave.addEventListener("click", () => {
      autosave();
      showToast("✓ Scenario saved!");
    });

    // Progress step clicks
    progressSteps.forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = btn.dataset.index;
        if (idx === "summary") {
          showSummary();
        } else {
          autosave();
          currentIndex = parseInt(idx, 10);
          showScenarios();
        }
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    });

    btnBackToScenarios.addEventListener("click", () => {
      showScenarios();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    btnDownload.addEventListener("click", downloadJSON);

    btnReset.addEventListener("click", () => {
      if (confirm("Reset all responses? This cannot be undone.")) {
        localStorage.removeItem(STORAGE_KEY);
        data = {};
        currentIndex = 0;
        showScenarios();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }
})();
