document.addEventListener("DOMContentLoaded", () => {
  const toggle = document.getElementById("extension-toggle");
  const toggleLabel = document.getElementById("toggle-label");

  chrome.storage.local.get("extensionEnabled", (data) => {
    const isEnabled = data.extensionEnabled !== false;
    toggle.checked = isEnabled;
    updateToggleUI(isEnabled);
    if (!isEnabled) showPanel("state-disabled");
  });

  toggle.addEventListener("change", () => {
    const isEnabled = toggle.checked;
    updateToggleUI(isEnabled);
    chrome.runtime.sendMessage({ type: "TOGGLE_EXTENSION", enabled: isEnabled });
    if (!isEnabled) {
      showPanel("state-disabled");
    } else {
      location.reload();
    }
  });

  function updateToggleUI(enabled) {
    toggleLabel.textContent = enabled ? "Active" : "Dormant";
    toggleLabel.style.color = enabled ? "#27ae60" : "#c0392b";
  }

  document.getElementById("open-dashboard").addEventListener("click", () => {
    chrome.tabs.create({ url: chrome.runtime.getURL("dashboard.html") });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) return;
    const tabId = tabs[0].id;
    const storageKey = "tab_" + tabId;

    chrome.storage.local.get(["extensionEnabled", storageKey], (data) => {
      if (data.extensionEnabled === false) {
        showPanel("state-disabled");
        return;
      }
      if (!data[storageKey]) {
        setTimeout(() => {
          chrome.storage.local.get([storageKey], (retryData) => {
            if (retryData[storageKey]) renderResult(retryData[storageKey]);
            else showPanel("state-no-data");
          });
        }, 3000);
      } else {
        renderResult(data[storageKey]);
      }
    });

    document.getElementById("export-btn").addEventListener("click", () => {
      chrome.storage.local.get([storageKey], (data) => {
        if (data[storageKey]) generateAndDownloadReport(data[storageKey]);
      });
    });
  });
});

function showPanel(id) {
  ["state-loading", "state-no-data", "state-result", "state-disabled"].forEach(p => {
    document.getElementById(p).classList.add("hidden");
  });
  document.getElementById(id).classList.remove("hidden");
}

function renderResult(result) {
  showPanel("state-result");
  document.getElementById("site-name").textContent = result.hostname;
  document.getElementById("score-value").textContent = result.score;
  if (result.cai && result.cai !== "N/A" && result.cai > 0) {
    document.getElementById("banner-status").innerHTML = `CAI Score: <strong>${result.cai}</strong>`;
  } else {
    document.getElementById("banner-status").textContent = result.bannerFound ? "Banner detected." : "No banner found.";
  }
  const tierBadge = document.getElementById("tier-badge");
  tierBadge.textContent = `${result.tierEmoji} ${result.tier}`;
  tierBadge.className = "tier-badge " + (result.score >= 70 ? "tier-compliant" : result.score >= 40 ? "tier-partial" : "tier-noncompliant");
  document.getElementById("score-circle-border").style.borderColor = result.tierColor;
  updateUIBars(result);
  const issuesList = document.getElementById("issues-list");
  if (result.issues && result.issues.length > 0 && result.issues[0].type !== "NO_BANNER") {
    document.getElementById("issues-section").classList.remove("hidden");
    document.getElementById("no-issues").classList.add("hidden");
    issuesList.innerHTML = "";
    result.issues.forEach(issue => {
      const card = document.createElement("div");
      card.className = `issue-card severity-${issue.severity.toLowerCase()}`;
      card.innerHTML = `
        <div class="issue-header"><strong>[${issue.type}] ${issue.category}</strong> <span class="severity-badge">${issue.severity}</span></div>
        <div class="issue-body hidden"><p>${issue.description}</p>
        <div class="citation"><strong>GDPR:</strong> ${issue.gdpr} | <strong>DPDP:</strong> ${issue.dpdp}</div></div>
      `;
      card.querySelector(".issue-header").onclick = () => card.querySelector(".issue-body").classList.toggle("hidden");
      issuesList.appendChild(card);
    });
  } else {
    document.getElementById("issues-section").classList.add("hidden");
    if (result.bannerFound && result.score === 100) document.getElementById("no-issues").classList.remove("hidden");
  }
  document.getElementById("export-btn").classList.remove("hidden");
}

function updateUIBars(result) {
  const codes = result.issues.map(i => i.type);
  renderBar("bar-banner", "pts-banner", result.bannerFound ? 20 : 0, 20);
  let acceptPenalty = 0;
  if (codes.includes('DP-VM')) acceptPenalty += 5;
  if (codes.includes('DP-FA')) acceptPenalty += 10;
  renderBar("bar-accept", "pts-accept", result.buttonStatus.accept ? 15 - acceptPenalty : 0, 15);
  let rejectPenalty = 0;
  if (codes.includes('DP-RM')) rejectPenalty += 10;
  if (codes.includes('DP-PB')) rejectPenalty += 10;
  renderBar("bar-reject", "pts-reject", result.buttonStatus.reject ? 25 - rejectPenalty : 0, 25);
  let symPenalty = 0;
  if (codes.includes('DP-VM')) symPenalty += 10;
  if (codes.includes('DP-FH')) symPenalty += 10;
  renderBar("bar-symmetry", "pts-symmetry", (result.buttonStatus.accept && result.buttonStatus.reject) ? 25 - symPenalty : 0, 25);
  let langPenalty = 0;
  if (codes.includes('DP-UF')) langPenalty += 5;
  if (codes.includes('DP-CL')) langPenalty += 5;
  if (codes.includes('DP-HI')) langPenalty += 5;
  renderBar("bar-language", "pts-language", result.bannerFound ? 15 - langPenalty : 0, 15);
}

function renderBar(barId, ptsId, score, max) {
  score = Math.max(0, score);
  const bar = document.getElementById(barId);
  bar.style.width = `${(score / max) * 100}%`;
  bar.style.backgroundColor = (score/max >= 0.8) ? "#27ae60" : (score/max >= 0.5) ? "#e67e22" : "#c0392b";
  document.getElementById(ptsId).textContent = `${score}/${max}`;
}

function generateAndDownloadReport(result) {
  const date = new Date(result.timestamp).toLocaleString();
  let issuesHtml = "";
  if (result.issues.length === 0 || (result.issues.length === 1 && result.issues[0].type === "NO_BANNER" && result.score === 0)) {
    if (result.score === 0) {
        issuesHtml = `<p style="color: #c0392b; font-weight: bold;">❌ Critical: No cookie consent banner detected.</p>`;
    } else {
        issuesHtml = `<p style="color: #27ae60; font-weight: bold;">✅ No compliance issues detected. The site meets baseline requirements.</p>`;
    }
  } else {
    result.issues.forEach(issue => {
      let color = issue.severity === "Critical" ? "#c0392b" : issue.severity === "High" ? "#e74c3c" : "#e67e22";
      issuesHtml += `
        <div style="border-left: 4px solid ${color}; padding: 10px; margin-bottom: 15px; background: #f8f9fa;">
          <h4 style="margin: 0 0 5px 0; color: ${color};">[${issue.type}] ${issue.category} (${issue.severity})</h4>
          <p style="margin: 0 0 10px 0; font-size: 14px;">${issue.description}</p>
          <div style="font-size: 12px; color: #555;">
            <strong>GDPR Violation:</strong> ${issue.gdpr}<br>
            <strong>DPDP Act Violation:</strong> ${issue.dpdp}
          </div>
        </div>
      `;
    });
  }

  const btnInventoryHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
      <tr style="background: #2c3e50; color: white;">
        <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: left;">UI Element</th>
        <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">Detected</th>
        <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: left;">Regulatory Requirement</th>
      </tr>
      <tr><td style="padding: 10px; border: 1px solid #bdc3c7;"><strong>Accept Button</strong></td><td style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">${result.buttonStatus.accept ? '✅ Yes' : '❌ No'}</td><td style="padding: 10px; border: 1px solid #bdc3c7;">Unambiguous consent required. (GDPR Art. 4)</td></tr>
      <tr><td style="padding: 10px; border: 1px solid #bdc3c7;"><strong>Reject Button</strong></td><td style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">${result.buttonStatus.reject ? '✅ Yes' : '❌ No'}</td><td style="padding: 10px; border: 1px solid #bdc3c7;">Must be as easy to withdraw consent as to give it. (GDPR Art. 7(3), DPDP Sec. 6(1))</td></tr>
      <tr><td style="padding: 10px; border: 1px solid #bdc3c7;"><strong>Manage / Settings</strong></td><td style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">${result.buttonStatus.manage ? '✅ Yes' : '⚠️ No'}</td><td style="padding: 10px; border: 1px solid #bdc3c7;">Granular control over specific cookie categories. (GDPR Recital 32)</td></tr>
    </table>
  `;

  let screenshotHtml = result.screenshot ? `
    <h3>Forensic Evidence Capture</h3>
    <p style="font-size: 12px; color: #7f8c8d;">Viewport screenshot taken at the moment of automated banner detection.</p>
    <div style="border: 2px solid #bdc3c7; padding: 5px; background: #ecf0f1; margin-bottom: 30px;">
      <img src="${result.screenshot}" style="max-width: 100%; height: auto; display: block;" alt="Forensic Screenshot">
    </div>` : "";

  const htmlContent = `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Compliance Audit: ${result.hostname}</title>
    <style>
      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
      h1 { border-bottom: 2px solid #2c3e50; padding-bottom: 10px; color: #2c3e50; }
      .header-meta { background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
      .score-box { text-align: center; padding: 20px; border: 2px solid ${result.tierColor}; border-radius: 8px; margin-bottom: 30px; }
      .score-box h2 { font-size: 48px; margin: 0; color: ${result.tierColor}; }
      .score-box p { font-size: 18px; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; }
      .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #ccc; padding-top: 20px; }
      @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
    </style></head>
    <body>
      <div class="no-print" style="text-align: right; margin-bottom: 20px;"><button onclick="window.print()" style="padding: 10px 20px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer;">🖨️ Print to PDF</button></div>
      <h1>Cookie Consent Compliance Audit</h1>
      <div class="header-meta">
        <strong>Target Hostname:</strong> ${result.hostname}<br>
        <strong>CAI Score:</strong> ${result.cai || "N/A"}<br>
        <strong>Audit Timestamp:</strong> ${date}<br>
        <strong>Audit Tool:</strong> ConsentFair Research v1.2.0<br>
        <strong>Developed By:</strong> Nikita Tapali
      </div>
      <div class="score-box"><h2>${result.score} / 100</h2><p>${result.tierEmoji} ${result.tier}</p></div>
      <h3>Executive Summary</h3>
      <p>This automated audit evaluates the target website's cookie consent mechanisms against the requirements of the General Data Protection Regulation (GDPR) and India's Digital Personal Data Protection (DPDP) Act 2023.</p>
      <h3>Interface Element Inventory</h3>${btnInventoryHtml}
      <h3>Identified Vulnerabilities & Violations</h3>${issuesHtml}
      ${screenshotHtml}
      <div class="footer">Generated autonomously by ConsentFair. This report is for informational purposes and does not constitute formal legal counsel.</div>
    </body></html>`;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  chrome.downloads.download({ url: URL.createObjectURL(blob), filename: `ConsentFair_Audit_${result.hostname.replace(/\./g,'_')}.html`, saveAs: true });
}