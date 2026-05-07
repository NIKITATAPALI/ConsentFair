# ConsentFair: Forensic Detection Heuristics & Algorithms

This document details the technical detection logic for the 10 Dark Pattern categories identified in the *ConsentFair* framework, mapping them to specific GDPR and DPDP Act violations.

---

## 1. Forced Action (DP-FA)
- **Logic:** Absence of a "Reject" or "Decline" option on the primary and secondary layers of the consent interface.
- **Algorithm:**
  ```pseudocode
  IF (findButton(REJECT_KEYWORDS) == NULL) AND (findButton(MANAGE_KEYWORDS) == NULL)
    RAISE DP-FA_CRITICAL;
  ```
- **Legal Mapping:** Violation of **DPDP Act Section 6** (Consent must be unconditional).

## 2. Visual Misdirection (DP-VM)
- **Logic:** Use of color, contrast, and size to nudge users toward "Accept All."
- **Algorithm:**
  ```pseudocode
  COMPUTE ContrastRatio(AcceptBtn, Background);
  COMPUTE ContrastRatio(RejectBtn, Background);
  IF (ContrastRatio_Accept > ContrastRatio_Reject * 1.5)
    RAISE DP-VM_MEDIUM;
  ```
- **Legal Mapping:** Violation of **GDPR Art. 7** (Consent must be freely given, without steering).

## 3. Roach Motel / Effort Asymmetry (DP-RM)
- **Logic:** The "Accept" path is a single interaction, while "Reject" requires multiple sub-menus or toggles.
- **Algorithm:**
  ```pseudocode
  ka = 1; // Default
  kr = countClicksToState("RejectAll");
  CAI = (kr - ka) / ka;
  IF (CAI > 0)
    RAISE DP-RM_HIGH;
  ```
- **Legal Mapping:** Violation of **GDPR Art. 7(3)** (Withdrawal as easy as giving consent).

## 4. Pre-ticked Boxes (DP-PT)
- **Logic:** Non-essential tracking categories (Analytics, Marketing) are toggled 'ON' by default.
- **Algorithm:**
  ```pseudocode
  FOR EACH checkbox IN ConsentPanel:
    IF (checkbox.category != "Essential") AND (checkbox.state == "checked")
      RAISE DP-PT_CRITICAL;
  ```
- **Legal Mapping:** Violation of **GDPR Recital 32** (Clear affirmative action; no silence/inactivity).

## 5. Purpose Bundling (DP-PB)
- **Logic:** Consent for multiple processing purposes is bundled into a single "Accept" action without granular control.
- **Algorithm:**
  ```pseudocode
  IF (findButton(MANAGE_SETTINGS) == NULL) AND (categoriesFound > 1)
    RAISE DP-PB_HIGH;
  ```
- **Legal Mapping:** Violation of **DPDP Act Section 6** (Consent must be specific).

## 6. False Hierarchy (DP-FH)
- **Logic:** Positioning the "Accept" button in a more favorable location (e.g., bottom right) than the "Reject" or "Settings" option.
- **Algorithm:**
  ```pseudocode
  IF (AcceptBtn.position.index > RejectBtn.position.index) AND (AcceptBtn.visualSaliency > RejectBtn.visualSaliency)
    RAISE DP-FH_MEDIUM;
  ```

## 7. Linguistic Manipulation (DP-LM / DP-UF)
- **Logic:** Using guilt-tripping or confusing language (e.g., "I don't care about my privacy").
- **Algorithm:**
  ```pseudocode
  IF (textMatch(RejectBtn, GUILT_KEYWORDS))
    RAISE DP-UF_MEDIUM;
  ```

## 8. Hidden Information (DP-HI)
- **Logic:** Burying the list of third-party vendors or data purposes in deep sub-layers.
- **Algorithm:**
  ```pseudocode
  depth = countLinkHopsTo("VendorList");
  IF (depth > 2)
    RAISE DP-HI_MEDIUM;
  ```
- **Legal Mapping:** Violation of **GDPR Art. 13** (Transparency).

---
**Verification Protocol:** Every detection event is timestamped and logged with a DOM snapshot of the offending element for forensic evidence.
