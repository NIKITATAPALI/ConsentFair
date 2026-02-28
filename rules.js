/**
 * ConsentFair Scoring & Regulatory Mapping Engine
 * Aligned with GDPR (EU) and India DPDP Act 2023
 */

const DP_WEIGHTS = {
  'DP-VM': 10, // Visual Misdirection
  'DP-PT': 20, // Pre-ticked Boxes
  'DP-FA': 25, // Forced Action
  'DP-RM': 15, // Roach Motel (Effort Asymmetry)
  'DP-UF': 10, // Urgency/Fear
  'DP-HI': 10, // Hidden Information
  'DP-CL': 10, // Confusing Language
  'DP-NG': 10, // Nagging
  'DP-PB': 15, // Purpose Bundling
  'DP-FH': 15  // False Hierarchy
};

const LEGAL_MAP = {
  'DP-VM': { gdpr: "Art. 4(11), 7", dpdp: "Section 6", desc: "Biased UI nudging users toward acceptance." },
  'DP-PT': { gdpr: "Art. 4(11), Recital 32", dpdp: "Section 6", desc: "Pre-selected non-essential cookies." },
  'DP-FA': { gdpr: "Art. 7(3)", dpdp: "Section 6, 9", desc: "No explicit option to decline/reject." },
  'DP-RM': { gdpr: "Art. 7(3)", dpdp: "Section 6, 9", desc: "Rejection path significantly harder than acceptance." },
  'DP-UF': { gdpr: "Art. 7", dpdp: "Section 6", desc: "Language implying negative consequences for refusal." },
  'DP-HI': { gdpr: "Art. 13, 14", dpdp: "Section 7", desc: "Privacy details buried in multiple layers." },
  'DP-CL': { gdpr: "Art. 4(11)", dpdp: "Section 6", desc: "Ambiguous language or double negatives." },
  'DP-NG': { gdpr: "Art. 7", dpdp: "Section 6", desc: "Repeated requests after refusal." },
  'DP-PB': { gdpr: "Art. 6(1)(a)", dpdp: "Section 5, 6", desc: "Lack of granular choice across cookie purposes." },
  'DP-FH': { gdpr: "Art. 7", dpdp: "Section 6", desc: "Visual hierarchy favoring 'Accept All' over management." }
};

function calculateScore(scanData) {
  let score = 100;
  const detectedPatterns = [];

  // Default button status to avoid UI crashes
  const buttonStatus = {
    accept: scanData.acceptBtn ? scanData.acceptBtn.found : false,
    reject: scanData.rejectBtn ? scanData.rejectBtn.found : false,
    manage: scanData.manageBtn ? scanData.manageBtn.found : false
  };

  if (!scanData.bannerFound) {
    return {
      score: 0,
      tier: "Non-Compliant",
      tierColor: "#c0392b",
      tierEmoji: "❌",
      issues: [{
        type: "NO_BANNER",
        category: "No Cookie Banner",
        severity: "Critical",
        description: "No cookie consent banner was detected.",
        gdpr: "Art. 13",
        dpdp: "Section 5"
      }],
      buttonStatus,
      timestamp: Date.now(),
      cai: "N/A"
    };
  }

  // 1. DP-FA: Forced Action (No Reject Button)
  if (!buttonStatus.reject) {
    detectedPatterns.push('DP-FA');
  }

  // 2. DP-VM: Visual Misdirection
  if (scanData.visualSymmetry && (scanData.visualSymmetry.backgroundDiffers || scanData.visualSymmetry.sizeDiffers)) {
    detectedPatterns.push('DP-VM');
  }

  // 3. DP-RM: Roach Motel (Effort Asymmetry)
  if (!buttonStatus.reject && buttonStatus.manage) {
    detectedPatterns.push('DP-RM');
  }

  // 4. DP-PT: Pre-ticked Boxes
  if (scanData.hasPreselected) {
    detectedPatterns.push('DP-PT');
  }

  // 5. DP-UF: Urgency/Fear
  if (scanData.hasNegativeFraming) {
    detectedPatterns.push('DP-UF');
  }

  // 6. DP-PB: Purpose Bundling
  if (!buttonStatus.manage && buttonStatus.accept) {
    detectedPatterns.push('DP-PB');
  }

  // Deduct points
  detectedPatterns.forEach(code => {
    score -= (DP_WEIGHTS[code] || 0);
  });

  score = Math.max(0, score);

  const issues = detectedPatterns.map(code => ({
    type: code,
    category: getCategoryName(code),
    severity: DP_WEIGHTS[code] >= 20 ? "Critical" : DP_WEIGHTS[code] >= 15 ? "High" : "Medium",
    description: LEGAL_MAP[code].desc,
    gdpr: LEGAL_MAP[code].gdpr,
    dpdp: LEGAL_MAP[code].dpdp
  }));

  let tier = "Non-Compliant";
  let tierColor = "#c0392b";
  let tierEmoji = "❌";

  if (score >= 70) {
    tier = "Compliant";
    tierColor = "#27ae60";
    tierEmoji = "✅";
  } else if (score >= 40) {
    tier = "Partially Compliant";
    tierColor = "#e67e22";
    tierEmoji = "⚠️";
  }

  return {
    score,
    tier,
    tierColor,
    tierEmoji,
    issues,
    buttonStatus,
    timestamp: Date.now(),
    cai: scanData.clicksToReject === 99 ? "N/A" : ((scanData.clicksToReject - 1) / 1).toFixed(2)
  };
}

function getCategoryName(code) {
  const names = {
    'DP-VM': 'Visual Misdirection',
    'DP-PT': 'Pre-ticked Boxes',
    'DP-FA': 'Forced Action',
    'DP-RM': 'Roach Motel',
    'DP-UF': 'Urgency/Fear',
    'DP-HI': 'Hidden Information',
    'DP-CL': 'Confusing Language',
    'DP-NG': 'Nagging',
    'DP-PB': 'Purpose Bundling',
    'DP-FH': 'False Hierarchy'
  };
  return names[code] || code;
}

if (typeof module !== "undefined") {
  module.exports = { calculateScore };
}