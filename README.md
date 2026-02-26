# ⚖️ ConsentFair: Cookie Consent Compliance Auditor

**Author:** Nikita Tapali | Amity University (2026)  
**Version:** 1.0.0  
**Platform:** Google Chrome / Chromium Browsers (Manifest V3)

## 📖 Overview
ConsentFair is an autonomous, locally-run browser extension designed for academic research. It acts as a compliance auditing tool that systematically evaluates website cookie consent banners against the **General Data Protection Regulation (GDPR)** and **India's Digital Personal Data Protection (DPDP) Act 2023**.

Most consent blockers simply hide banners or auto-accept them. ConsentFair acts as a forensic security tool, performing heuristics on UI symmetry, click-path friction, and manipulative language to generate an objective compliance score and a standalone HTML audit report.

## ✨ Key Features
* **Automated Heuristic Scanning:** Detects cookie banners across 25+ common DOM selectors and localized keywords.
* **Visual Asymmetry Detection:** Analyzes the CSS properties (color, border, font-weight, size) of 'Accept' vs. 'Reject' buttons to identify deceptive dark patterns.
* **Click-Path Friction Analysis:** Calculates the navigational effort required to decline tracking compared to accepting it.
* **Language Sentiment Check:** Flags manipulative, confusing, or negative framing (e.g., "I do not agree", "Without cookies").
* **Forensic Report Generation:** Locally compiles a professional `.html` audit report containing the compliance score, regulatory violations, a UI element inventory, and a native viewport screenshot of the exact banner state.
* **Privacy-First Architecture:** 100% vanilla JavaScript. Zero external dependencies. Zero data leaves the browser. 

## ⚖️ Regulatory Framework Matrix
ConsentFair calculates a compliance score (0-100) based on specific legal requirements:

* **Notice Obligation:** Checks for baseline banner presence. *(GDPR Art. 13 / DPDP Sec. 5)*
* **Unambiguous Consent:** Validates explicit 'Accept' button availability. *(GDPR Art. 4(11) / DPDP Sec. 6(1))*
* **Withdrawal Symmetry:** Penalizes implied consent and excessive clicks to reject. *(GDPR Art. 7(3) / DPDP Sec. 6(1))*
* **Freely Given Consent:** Deducts points for biased UI (dark patterns) that nudge users toward acceptance. *(GDPR Art. 7)*
* **Informed Consent:** Flags confusing or misleading opt-out language. *(DPDP Sec. 6(2))*

## 🚀 Installation Guide (Developer Mode)
Because this tool is used for independent academic auditing, it is sideloaded directly into Chrome.

1. Download or clone this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions`.
3. Toggle **Developer mode** to **ON** (top right corner).
4. Click **Load unpacked** (top left corner).
5. Select the `consentfair-extension` directory.
6. The extension is now active. Pin the ConsentFair icon (⚖️) to your toolbar for easy access.

## 🛠️ How to Execute an Audit
1. Navigate to any target website (e.g., `youtube.com`).
2. Allow the page and cookie banner to fully load.
3. Click the ConsentFair extension icon in your toolbar.
4. The tool will calculate the compliance score and display a breakdown of any identified violations.
5. Click **Download Audit Report** to generate a forensic HTML document containing your results and photographic evidence.

## 📁 File Structure
* `manifest.json`: Extension architecture and Manifest V3 permissions.
* `background.js`: Service worker handling screenshot capture and badge updates.
* `content.js`: Injected DOM scanner executing the heuristic analysis.
* `rules.js`: The isolated scoring engine and regulatory matrix.
* `popup.html` / `popup.js` / `styles.css`: The UI and document export generator.

## 📄 Disclaimer
This software was developed for academic research purposes. The generated audit reports are informational and do not constitute formal legal counsel.
