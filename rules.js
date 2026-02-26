function calculateScore(bannerData) {
  let score = 0;
  const issues = [];

  // Export explicit button status for the report
  const buttonStatus = {
    accept: bannerData.acceptBtn && bannerData.acceptBtn.found,
    reject: bannerData.rejectBtn && bannerData.rejectBtn.found,
    manage: bannerData.manageBtn && bannerData.manageBtn.found
  };

  // CHECK 1: BANNER PRESENCE (20 points)
  if (bannerData.bannerFound) {
    score += 20;
  } else {
    issues.push({
      type: "No Cookie Banner",
      severity: "Critical",
      description: "No cookie consent banner was detected on this page.",
      gdpr: "Art. 13 — Transparency & Notice",
      dpdp: "Sec. 5 — Notice Obligation"
    });
  }

  // CHECK 2: ACCEPT BUTTON (15 points)
  if (bannerData.bannerFound && buttonStatus.accept) {
    score += 15;
  } else if (bannerData.bannerFound) {
    issues.push({
      type: "No Accept Button",
      severity: "High",
      description: "A banner was found, but a clear 'Accept' button is missing.",
      gdpr: "Art. 4(11) — Unambiguous consent",
      dpdp: "Sec. 6(1) — Voluntary & Accessible Consent"
    });
  }

  // CHECK 3: REJECT BUTTON (25 points)
  if (buttonStatus.reject) {
    if (bannerData.clicksToReject <= 1) {
      score += 25;
    } else if (bannerData.clicksToReject === 2) {
      score += 15;
      issues.push({
        type: "Effort Asymmetry",
        severity: "High",
        description: "Rejecting cookies takes more clicks than accepting them.",
        gdpr: "Art. 7(3) — Withdrawal as Easy as Consent",
        dpdp: "Sec. 6(1) — Voluntary & Accessible Consent"
      });
    } else {
      score += 5;
      issues.push({
        type: "Effort Asymmetry",
        severity: "High",
        description: "Rejecting cookies requires excessive navigation (3+ clicks).",
        gdpr: "Art. 7(3) — Withdrawal as Easy as Consent",
        dpdp: "Sec. 6(1) — Voluntary & Accessible Consent"
      });
    }
  } else {
    if (bannerData.hasImpliedConsent) {
      issues.push({
        type: "Implied Consent",
        severity: "Critical",
        description: "Site uses implied consent (e.g., 'by continuing to use') without an explicit reject option.",
        gdpr: "Art. 4(11) — Unambiguous consent",
        dpdp: "Sec. 6(2) — Informed consent"
      });
    } else if (bannerData.bannerFound) {
      issues.push({
        type: "No Reject Button",
        severity: "Critical",
        description: "No option to reject or decline cookies was found on the first layer.",
        gdpr: "Art. 7(3) — Withdrawal as Easy as Consent",
        dpdp: "Sec. 6(1) — Voluntary & Accessible Consent"
      });
    }
  }

  // CHECK 4: VISUAL SYMMETRY (25 points)
  let symmetryScore = 25;
  if (bannerData.visualSymmetry) {
    if (bannerData.visualSymmetry.backgroundDiffers) symmetryScore -= 10;
    if (bannerData.visualSymmetry.fontWeightDiffers) symmetryScore -= 5;
    if (bannerData.visualSymmetry.borderDiffers) symmetryScore -= 5;
    if (bannerData.visualSymmetry.sizeDiffers) symmetryScore -= 5;
    
    symmetryScore = Math.max(0, symmetryScore);
    score += symmetryScore;

    if (symmetryScore < 25 && bannerData.bannerFound) {
      let severity = "Low";
      if (symmetryScore <= 5) severity = "High";
      else if (symmetryScore <= 15) severity = "Medium";

      issues.push({
        type: "Visual Asymmetry",
        severity: severity,
        description: "Accept and Reject buttons have differing visual weights (colors, sizes, borders), nudging users to accept.",
        gdpr: "Art. 7 — Freely Given Consent (biased UI)",
        dpdp: "Sec. 6(1) — Voluntary & Accessible Consent"
      });
    }
  } else {
    score += 25; 
  }

  // CHECK 5: LANGUAGE CLARITY (15 points)
  let languageScore = 15;
  if (buttonStatus.reject && bannerData.rejectBtn.text) {
    const rText = bannerData.rejectBtn.text.toLowerCase();
    let unclear = true;
    
    if (rText.includes("i do not agree") || rText.includes("do not agree")) languageScore -= 8;
    if (rText.includes("to refuse")) languageScore -= 8;
    if (rText.includes("without cookies")) languageScore -= 5;
    if (rText.includes("no thanks")) languageScore -= 5;
    
    const clearTerms = ["reject", "decline", "refuse", "no", "opt-out", "opt out", "necessary", "essential"];
    for (const term of clearTerms) {
      if (rText.includes(term)) {
        unclear = false;
        break;
      }
    }
    
    if (unclear) languageScore -= 5;
    languageScore = Math.max(0, languageScore);
    score += languageScore;

    if (languageScore < 15) {
      issues.push({
        type: "Negative/Misleading Framing",
        severity: "Low",
        description: "The language used for declining cookies is emotionally manipulative or unclear.",
        gdpr: "Art. 7 — Freely Given Consent (manipulative language)",
        dpdp: "Sec. 6(2) — Informed consent"
      });
    }
  } else {
    score += 15; 
  }

  // TIER CLASSIFICATION
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
    buttonStatus, // Exported for the report
    timestamp: Date.now()
  };
}

if (typeof module !== "undefined") {
  module.exports = { calculateScore };
}