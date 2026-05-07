# Research Progress Log: ConsentFair Investigative Timeline

**Student:** Nikita Tapali (A059169824043)  
**Project:** Evaluating Cookie Consent Interfaces and Developing a Legal Behavioural Dark Pattern Detection Tool  
**Duration:** 18 Weeks (Dec 2025 – May 2026)

| Week | Phase | Key Milestone | Deliverable |
| :--- | :--- | :--- | :--- |
| **W01-W02** | **Phase 1: Foundation** | Literature review & Legal mapping (GDPR vs DPDP Act) | Comparative Legal Framework Document |
| **W03-W04** | **Phase 1: Heuristics** | Establishing Dark Pattern Taxonomy & Manual Observation Protocols | Dark Pattern Classification Sheet |
| **W05-W06** | **Phase 1: Forensic Audit** | Clean-room manual audit of 4 global platforms (BBC, Hyundai, etc.) | [manual_audit_logs.csv](./manual_audit_logs.csv) |
| **W07-W08** | **Phase 2: Architecture** | Designing the *ConsentFair* Detection Engine logic (Heuristics + CSS Saliency) | Tool Architecture Diagram (Fig 3.1) |
| **W09-W10** | **Phase 2: Engineering** | Development of the Chrome Extension service worker and content scripts | ConsentFair Beta Build |
| **W11-W12** | **Phase 2: Validation** | Pilot testing on 100 domains; Refining CAI and DPSS weighting | Pilot Data Report |
| **W13-W15** | **Phase 3: Scaled Audit** | Execution of Large-Scale Automated Scan (5,284 websites) | [consentfair_master_results_5284.csv](./consentfair_master_results_5284.csv) |
| **W16-W17** | **Phase 3: Analysis** | Sector-wise stratification and sectoral friction calculation | [sectoral_compliance_summary.csv](./sectoral_compliance_summary.csv) |
| **W18** | **Finalization** | Thesis compilation and regulatory recommendation drafting | Final Thesis (PDF) |

---
**Verification Status:**  
- **Manual Data:** Validated against Table 4.1 & 4.2.  
- **Automated Data:** Validated against Sectoral Mean CAI (Table 4.4).  
- **Compliance Bands:** Aligned with Figure 4.1 Distribution.  
- **Forensic Logs:** Reports generated for BBC/Puma match case study findings in Chapter 4.
