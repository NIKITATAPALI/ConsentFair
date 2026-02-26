document.addEventListener("DOMContentLoaded", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs || !tabs[0]) {
      showPanel("state-no-data");
      return;
    }
    
    const tabId = tabs[0].id;
    const storageKey = "tab_" + tabId;

    const checkStorage = (retries = 4) => {
      chrome.storage.local.get([storageKey], (data) => {
        if (chrome.runtime.lastError || !data[storageKey]) {
          if (retries > 0) {
            setTimeout(() => checkStorage(retries - 1), 1000);
          } else {
            showPanel("state-no-data");
          }
        } else {
          renderResult(data[storageKey]);
        }
      });
    };

    checkStorage();

    document.getElementById("export-btn").addEventListener("click", () => {
      chrome.storage.local.get([storageKey], (data) => {
        if (data[storageKey]) {
          generateAndDownloadReport(data[storageKey]);
        }
      });
    });
  });
});

function showPanel(id) {
  document.getElementById("state-loading").classList.add("hidden");
  document.getElementById("state-no-data").classList.add("hidden");
  document.getElementById("state-result").classList.add("hidden");
  document.getElementById(id).classList.remove("hidden");
}

function renderResult(result) {
  showPanel("state-result");

  document.getElementById("site-name").textContent = result.hostname;
  document.getElementById("score-value").textContent = result.score;
  document.getElementById("banner-status").textContent = result.bannerFound ? "Cookie banner detected." : "No cookie banner found.";
  
  const tierBadge = document.getElementById("tier-badge");
  tierBadge.textContent = `${result.tierEmoji} ${result.tier}`;
  tierBadge.className = "tier-badge";
  
  const circle = document.getElementById("score-circle-border");
  if (result.score >= 70) {
    tierBadge.classList.add("tier-compliant");
    circle.style.borderColor = "#27ae60";
  } else if (result.score >= 40) {
    tierBadge.classList.add("tier-partial");
    circle.style.borderColor = "#e67e22";
  } else {
    tierBadge.classList.add("tier-noncompliant");
    circle.style.borderColor = "#c0392b";
  }

  let bannerPts = result.bannerFound ? 20 : 0;
  let acceptPts = (result.bannerFound && result.buttonStatus.accept) ? 15 : 0;
  
  let rejectPts = 25;
  const rejectIssue = result.issues.find(i => i.type === "Effort Asymmetry" || i.type === "No Reject Button" || i.type === "Implied Consent");
  if (rejectIssue) {
    if (rejectIssue.type === "No Reject Button" || rejectIssue.type === "Implied Consent") rejectPts = 0;
    else if (rejectIssue.description.includes("3+ clicks")) rejectPts = 5;
    else rejectPts = 15;
  }

  let symmetryPts = 25;
  const symIssue = result.issues.find(i => i.type === "Visual Asymmetry");
  if (symIssue) {
    if (symIssue.severity === "High") symmetryPts = 5;
    else if (symIssue.severity === "Medium") symmetryPts = 15;
    else symmetryPts = 20; 
  }

  let langPts = 15;
  if (result.issues.some(i => i.type === "Negative/Misleading Framing")) langPts = 5;

  renderBar("bar-banner", "pts-banner", bannerPts, 20);
  renderBar("bar-accept", "pts-accept", acceptPts, 15);
  renderBar("bar-reject", "pts-reject", rejectPts, 25);
  renderBar("bar-symmetry", "pts-symmetry", symmetryPts, 25);
  renderBar("bar-language", "pts-language", langPts, 15);

  const issuesSection = document.getElementById("issues-section");
  const noIssuesSection = document.getElementById("no-issues");
  const issuesList = document.getElementById("issues-list");

  if (result.issues && result.issues.length > 0) {
    issuesSection.classList.remove("hidden");
    noIssuesSection.classList.add("hidden");
    issuesList.innerHTML = "";
    
    result.issues.forEach(issue => {
      const card = document.createElement("div");
      card.className = `issue-card severity-${issue.severity.toLowerCase()}`;
      
      const header = document.createElement("div");
      header.className = "issue-header";
      header.innerHTML = `<strong>${issue.type}</strong> <span class="severity-badge">${issue.severity}</span>`;
      
      const body = document.createElement("div");
      body.className = "issue-body hidden";
      body.innerHTML = `
        <p>${issue.description}</p>
        <div class="citation"><strong>GDPR:</strong> ${issue.gdpr}</div>
        <div class="citation"><strong>DPDP:</strong> ${issue.dpdp}</div>
      `;
      
      header.addEventListener("click", () => {
        body.classList.toggle("hidden");
      });

      card.appendChild(header);
      card.appendChild(body);
      issuesList.appendChild(card);
    });
  } else {
    issuesSection.classList.add("hidden");
    noIssuesSection.classList.remove("hidden");
  }

  document.getElementById("export-btn").classList.remove("hidden");
}

function renderBar(barId, ptsId, score, max) {
  const percent = (score / max) * 100;
  const bar = document.getElementById(barId);
  bar.style.width = `${percent}%`;
  
  if (percent >= 80) bar.style.backgroundColor = "#27ae60";
  else if (percent >= 50) bar.style.backgroundColor = "#e67e22";
  else bar.style.backgroundColor = "#c0392b";

  document.getElementById(ptsId).textContent = `${score}/${max}`;
}

// The Report Generator Engine
function generateAndDownloadReport(result) {
  const date = new Date(result.timestamp).toLocaleString();
  
  // 1. Generate Issues HTML
  let issuesHtml = "";
  if (result.issues.length === 0) {
    issuesHtml = `<p style="color: #27ae60; font-weight: bold;">✅ No compliance issues detected. The site meets baseline requirements.</p>`;
  } else {
    result.issues.forEach(issue => {
      let color = issue.severity === "Critical" ? "#c0392b" : issue.severity === "High" ? "#e74c3c" : "#e67e22";
      issuesHtml += `
        <div style="border-left: 4px solid ${color}; padding: 10px; margin-bottom: 15px; background: #f8f9fa;">
          <h4 style="margin: 0 0 5px 0; color: ${color};">${issue.type} (${issue.severity})</h4>
          <p style="margin: 0 0 10px 0; font-size: 14px;">${issue.description}</p>
          <div style="font-size: 12px; color: #555;">
            <strong>GDPR Violation:</strong> ${issue.gdpr}<br>
            <strong>DPDP Act Violation:</strong> ${issue.dpdp}
          </div>
        </div>
      `;
    });
  }

  // 2. Generate Button Inventory Matrix HTML
  const btnHtml = `
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 14px;">
      <tr style="background: #2c3e50; color: white;">
        <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: left;">UI Element</th>
        <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">Detected</th>
        <th style="padding: 10px; border: 1px solid #bdc3c7; text-align: left;">Regulatory Requirement</th>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #bdc3c7;"><strong>Accept Button</strong></td>
        <td style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">${result.buttonStatus.accept ? '✅ Yes' : '❌ No'}</td>
        <td style="padding: 10px; border: 1px solid #bdc3c7;">Unambiguous consent required. (GDPR Art. 4)</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #bdc3c7;"><strong>Reject Button</strong></td>
        <td style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">${result.buttonStatus.reject ? '✅ Yes' : '❌ No'}</td>
        <td style="padding: 10px; border: 1px solid #bdc3c7;">Must be as easy to withdraw consent as to give it. (GDPR Art. 7(3), DPDP Sec. 6(1))</td>
      </tr>
      <tr>
        <td style="padding: 10px; border: 1px solid #bdc3c7;"><strong>Manage / Settings</strong></td>
        <td style="padding: 10px; border: 1px solid #bdc3c7; text-align: center;">${result.buttonStatus.manage ? '✅ Yes' : '⚠️ No'}</td>
        <td style="padding: 10px; border: 1px solid #bdc3c7;">Granular control over specific cookie categories. (GDPR Recital 32)</td>
      </tr>
    </table>
  `;

  // 3. Generate Screenshot HTML
  let screenshotHtml = "";
  if (result.screenshot) {
    screenshotHtml = `
      <h3>Forensic Evidence Capture</h3>
      <p style="font-size: 12px; color: #7f8c8d;">Viewport screenshot taken at the moment of automated banner detection.</p>
      <div style="border: 2px solid #bdc3c7; padding: 5px; background: #ecf0f1; margin-bottom: 30px;">
        <img src="${result.screenshot}" style="max-width: 100%; height: auto; display: block;" alt="Screenshot of the target page">
      </div>
    `;
  }

  // 4. Build Final Document
  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Compliance Audit: ${result.hostname}</title>
      <style>
        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 800px; margin: 40px auto; padding: 20px; }
        h1 { border-bottom: 2px solid #2c3e50; padding-bottom: 10px; color: #2c3e50; }
        .header-meta { background: #ecf0f1; padding: 15px; border-radius: 5px; margin-bottom: 30px; }
        .score-box { text-align: center; padding: 20px; border: 2px solid ${result.tierColor}; border-radius: 8px; margin-bottom: 30px; }
        .score-box h2 { font-size: 48px; margin: 0; color: ${result.tierColor}; }
        .score-box p { font-size: 18px; font-weight: bold; margin: 5px 0 0 0; text-transform: uppercase; }
        .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #7f8c8d; border-top: 1px solid #ccc; padding-top: 20px; }
        @media print { body { margin: 0; padding: 0; } .no-print { display: none; } }
      </style>
    </head>
    <body>
      <div class="no-print" style="text-align: right; margin-bottom: 20px;">
        <button onclick="window.print()" style="padding: 10px 20px; background: #2c3e50; color: white; border: none; border-radius: 4px; cursor: pointer;">🖨️ Print to PDF</button>
      </div>

      <h1>Cookie Consent Compliance Audit</h1>
      
      <div class="header-meta">
        <strong>Target Hostname:</strong> ${result.hostname}<br>
        <strong>Target URL:</strong> <a href="${result.url}">${result.url}</a><br>
        <strong>Audit Timestamp:</strong> ${date}<br>
        <strong>Audit Tool:</strong> ConsentFair v1.0.0<br>
        <strong>Developed By:</strong> Nikita Tapali
      </div>

      <div class="score-box">
        <h2>${result.score} / 100</h2>
        <p>${result.tierEmoji} ${result.tier}</p>
      </div>

      <h3>Executive Summary</h3>
      <p>This automated audit evaluates the target website's cookie consent mechanisms against the requirements of the General Data Protection Regulation (GDPR) and India's Digital Personal Data Protection (DPDP) Act 2023.</p>

      <h3>Interface Element Inventory</h3>
      ${btnHtml}

      <h3>Identified Vulnerabilities & Violations</h3>
      ${issuesHtml}

      ${screenshotHtml}

      <div class="footer">
        Generated autonomously by ConsentFair. This report is for informational purposes and does not constitute formal legal counsel.
      </div>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  
  chrome.downloads.download({
    url: url,
    filename: `ConsentFair_Audit_${result.hostname.replace(/[^a-z0-9]/gi, '_')}.html`,
    saveAs: true 
  });
}