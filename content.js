if (!window.__consentFairScanned) {
  window.__consentFairScanned = true;

  const BANNER_KEYWORDS = ["cookie", "cookies", "consent", "privacy", "gdpr", "data protection", "tracking", "we use cookies", "personaliz", "personalise"];
  const ACCEPT_KEYWORDS = ["accept all", "accept cookies", "allow all", "allow cookies", "i agree", "agree", "enable all", "consent", "ok", "got it", "continue", "i understand"];
  const REJECT_KEYWORDS = ["reject all", "reject cookies", "decline all", "decline cookies", "refuse", "do not agree", "i do not agree", "no thanks", "without cookies", "deny", "opt out", "disagree", "to refuse", "necessary only", "essential only"];
  const MANAGE_KEYWORDS = ["manage", "settings", "options", "preferences", "customize", "customise"];

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findCookieBanner() {
    const selectors = [
      "[id*='cookie']", "[id*='consent']", "[id*='gdpr']",
      "[class*='cookie']", "[class*='consent']",
      "[role='dialog']", "[role='alertdialog']",
      "#onetrust-banner-sdk", ".cc-window", ".cookie-notice",
      "#cookielaw-info-bar", ".CybotCookiebotDialog",
      "[data-testid*='cookie']", "[aria-label*='cookie']"
    ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        if (isVisible(el)) return el;
      }
    }

    const allElements = document.querySelectorAll("div, section, aside");
    for (const el of allElements) {
      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        const text = el.innerText ? el.innerText.toLowerCase() : "";
        if (text.includes("cookie") || text.includes("consent")) {
          if (isVisible(el)) return el;
        }
      }
    }

    for (const el of allElements) {
      const text = el.innerText ? el.innerText.toLowerCase() : "";
      if (text.length > 0 && text.length < 3000) {
        let matches = 0;
        BANNER_KEYWORDS.forEach(kw => { if (text.includes(kw)) matches++; });
        if (matches >= 2 && isVisible(el)) return el;
      }
    }
    return null;
  }

  function getButtonStyle(el) {
    if (!el) return null;
    const style = window.getComputedStyle(el);
    return {
      backgroundColor: style.backgroundColor,
      color: style.color,
      fontWeight: style.fontWeight,
      border: style.border,
      borderRadius: style.borderRadius,
      padding: style.padding,
      fontSize: style.fontSize,
      width: el.offsetWidth,
      height: el.offsetHeight
    };
  }

  function findButton(container, keywordArray) {
    if (!container) return { found: false, text: "", style: null };
    const candidates = container.querySelectorAll("button, a[role='button'], input[type='button'], input[type='submit'], [role='button'], a.btn, a.button");
    
    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const text = (el.innerText || el.value || "").toLowerCase().trim();
      for (const kw of keywordArray) {
        if (text === kw || text.includes(kw)) {
          return { found: true, text: text, style: getButtonStyle(el) };
        }
      }
    }
    return { found: false, text: "", style: null };
  }

  function checkVisualSymmetry(acceptStyle, rejectStyle) {
    if (!acceptStyle || !rejectStyle) return { backgroundDiffers: false, fontWeightDiffers: false, borderDiffers: false, sizeDiffers: false };
    
    const bg1 = acceptStyle.backgroundColor.replace(/\s/g, '');
    const bg2 = rejectStyle.backgroundColor.replace(/\s/g, '');
    const backgroundDiffers = (bg1 !== bg2) && (bg1 !== 'rgba(0,0,0,0)' && bg2 !== 'rgba(0,0,0,0)');
    
    const fw1 = parseInt(acceptStyle.fontWeight) || 400;
    const fw2 = parseInt(rejectStyle.fontWeight) || 400;
    const fontWeightDiffers = Math.abs(fw1 - fw2) >= 200;
    
    const borderDiffers = Math.abs(acceptStyle.border.length - rejectStyle.border.length) > 5;
    
    const sizeDiffers = Math.abs(acceptStyle.width - rejectStyle.width) > 30 || Math.abs(acceptStyle.height - rejectStyle.height) > 10;

    return { backgroundDiffers, fontWeightDiffers, borderDiffers, sizeDiffers };
  }

  function getClicksToReject(container, rejectBtn) {
    if (rejectBtn && rejectBtn.found) return 1;
    const manageBtn = findButton(container, MANAGE_KEYWORDS);
    if (manageBtn.found) return 3; 
    return 99;
  }

  function scanPage() {
    const banner = findCookieBanner();
    const bannerFound = !!banner;
    const textContext = banner ? banner.innerText.toLowerCase() : document.body.innerText.toLowerCase().substring(0, 5000);
    const hasImpliedConsent = textContext.includes("by continuing") || textContext.includes("if you continue");

    let acceptBtn = { found: false, text: "", style: null };
    let rejectBtn = { found: false, text: "", style: null };
    let manageBtn = { found: false, text: "", style: null }; // NEW: Track manage buttons
    let visualSymmetry = null;
    let clicksToReject = 99;

    if (bannerFound) {
      acceptBtn = findButton(banner, ACCEPT_KEYWORDS);
      rejectBtn = findButton(banner, REJECT_KEYWORDS);
      manageBtn = findButton(banner, MANAGE_KEYWORDS);
      
      if (!rejectBtn.found) {
        rejectBtn = findButton(document, REJECT_KEYWORDS); 
      }
      visualSymmetry = checkVisualSymmetry(acceptBtn.style, rejectBtn.style);
      clicksToReject = getClicksToReject(banner, rejectBtn);
    }

    const data = {
      bannerFound,
      acceptBtn,
      rejectBtn,
      manageBtn, // Sent to background
      visualSymmetry,
      clicksToReject,
      hasImpliedConsent,
      url: window.location.href,
      hostname: window.location.hostname
    };

    chrome.runtime.sendMessage({ type: "CONSENT_SCAN_RESULT", data: data }).catch(() => {});
  }

  setTimeout(() => {
    let attempts = 0;
    const maxAttempts = 8; 
    const interval = setInterval(() => {
      attempts++;
      const banner = findCookieBanner();
      if (banner || attempts >= maxAttempts) {
        clearInterval(interval);
        scanPage();
      }
    }, 500);
  }, 800);
}