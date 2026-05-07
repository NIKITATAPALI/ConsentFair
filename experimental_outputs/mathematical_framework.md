# Mathematical Framework: ConsentFair Scoring & Interaction Metrics

This document formalizes the mathematical logic implemented in the *ConsentFair* detection tool and the associated research paper. These metrics are designed to provide a quantitative baseline for regulatory compliance under the GDPR and the Indian DPDP Act 2023.

---

## 1. Consent Asymmetry Index (CAI)

The CAI measures the "Interactional Friction" penalty imposed on users who wish to exercise their right to refuse non-essential tracking. It quantifies the effort gap between the path of least resistance (Acceptance) and the path of privacy protection (Rejection).

### Formula
$$ \text{CAI} = \frac{k_r - k_a}{k_a} $$

Where:
- **$k_a$**: Minimum interaction steps (clicks) to achieve "Complete Acceptance."
- **$k_r$**: Minimum interaction steps (clicks) to achieve "Complete Rejection."

### Interpretation
- **CAI = 0**: Perfectly symmetric interface (Accept and Reject take equal effort).
- **CAI > 0**: Asymmetric interface. A CAI of 2.0 means it takes 200% more effort to reject than to accept.
- **CAI = 99 (Special Case)**: Used in the tool to denote "Forced Action" (No Reject option available).

---

## 2. Dark Pattern Severity Score (DPSS)

The DPSS is a weighted scoring model that evaluates the overall manipulative intensity of a consent interface. It transitions the audit from qualitative description to a 0–100 compliance scale.

### Formula
$$ \text{DPSS} = 100 - \sum (P_i \times W_i) $$

Where:
- **$P_i$**: Binary presence (0 or 1) of a specific Dark Pattern.
- **$W_i$**: The assigned weight of that pattern based on its regulatory impact.

### Weighting Matrix (Extension Logic)
| Pattern Code | Pattern Name | Weight ($W_i$) | Primary Violation |
| :--- | :--- | :--- | :--- |
| **DP-FA** | Forced Action | 25 | DPDP Sec. 6 (Unconditional) |
| **DP-PT** | Pre-ticked Boxes | 20 | GDPR Recital 32 (Affirmative) |
| **DP-RM** | Roach Motel | 15 | GDPR Art. 7(3) (Easily Withdrawn) |
| **DP-PB** | Purpose Bundling | 15 | DPDP Sec. 6 (Specific) |
| **DP-FH** | False Hierarchy | 15 | GDPR Art. 7 (Freely Given) |
| **DP-VM** | Visual Misdirection | 10 | Choice Architecture Bias |
| **DP-UF** | Urgency/Fear | 10 | Cognitive Coercion |
| **DP-CL** | Confusing Language| 10 | Informed Consent |

---

## 3. Compliance Tiers

The final DPSS is mapped to three distinct tiers used in the *ConsentFair* dashboard:

1. **Compliant (High)**: $DPSS \geq 70$
   - *Requirement:* Symmetrical UI, no pre-ticked boxes, transparent purpose list.
2. **Partially Compliant (Moderate)**: $40 \leq DPSS < 70$
   - *Warning:* Minor visual nudges or slight interactional asymmetry.
3. **Non-Compliant (Poor)**: $DPSS < 40$
   - *Critical:* Missing reject button, forced bundling, or severe "Roach Motel" patterns.

---

## 4. Pseudocode Implementation (Core Logic)

```javascript
function evaluateCompliance(domainData) {
    let baseScore = 100;
    let detectedPatterns = [];

    // Evaluate Interaction Asymmetry
    if (domainData.k_r > domainData.k_a) {
        detectedPatterns.push('DP-RM'); // Roach Motel
    }

    // Evaluate Visual Saliency
    if (domainData.visualBiasDetected) {
        detectedPatterns.push('DP-VM'); // Visual Misdirection
    }

    // Evaluate Functional Bundling
    if (domainData.isBundled) {
        detectedPatterns.push('DP-PB'); // Purpose Bundling
    }

    // Final Weighted Deduction
    detectedPatterns.forEach(pattern => {
        baseScore -= WEIGHTS[pattern];
    });

    return {
        finalDPSS: Math.max(0, baseScore),
        caiScore: (domainData.k_r - domainData.k_a) / domainData.k_a,
        status: getTier(baseScore)
    };
}
```
