if (!window.__consentFairScanned) {
  window.__consentFairScanned = true;

  const BANNER_KEYWORDS = ["cookie", "cookies", "consent", "privacy", "gdpr", "data protection", "tracking", "we use cookies", "personaliz", "notice", "policy", "preferences", "agree & continue", "choice"];
  const ACCEPT_KEYWORDS = ["accept all", "accept cookies", "allow all", "i agree", "agree", "enable all", "consent", "ok", "got it", "continue", "allow", "accept", "approve", "confirm", "accept & close"];
  const REJECT_KEYWORDS = ["reject all", "reject cookies", "decline all", "refuse", "do not agree", "i do not agree", "no thanks", "without cookies", "deny", "opt out", "disagree", "necessary only", "essential only", "reject", "decline", "strictly necessary"];
  const MANAGE_KEYWORDS = ["manage", "settings", "options", "preferences", "customize", "cookie settings", "view purposes", "change settings", "more options", "configure"];
  const NEGATIVE_KEYWORDS = ["less secure", "loss of", "limited features", "not recommended", "personalized", "better experience"];

  function isVisible(el) {
    if (!el) return false;
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  }

  function findCookieBanner(doc = document) {
    const selectors = [
      "[id*='cookie']", "[id*='consent']", "[id*='gdpr']", "[id*='notice']", "[id*='sp_message']",
      "[class*='cookie']", "[class*='consent']", "[role='dialog']", "[role='alertdialog']",
      "#onetrust-banner-sdk", ".cc-window", ".cookie-notice", "#cookielaw-info-bar", ".CybotCookiebotDialog", ".qc-cmp2-container"
    ];
    
    // Search in current document
    for (const selector of selectors) {
      try {
        const elements = doc.querySelectorAll(selector);
        for (const el of elements) {
          if (isVisible(el)) {
            const text = el.innerText.toLowerCase();
            if (BANNER_KEYWORDS.some(kw => text.includes(kw))) return el;
          }
        }
      } catch (e) {}
    }

    // Search inside iframes (Recursive)
    const iframes = doc.querySelectorAll("iframe");
    for (const frame of iframes) {
      try {
        const frameDoc = frame.contentDocument || frame.contentWindow.document;
        const result = findCookieBanner(frameDoc);
        if (result) return result;
      } catch (e) {} // Blocked by cross-origin
    }
    return null;
  }

  function getButtonStyle(el) {
    if (!el) return null;
    const style = window.getComputedStyle(el);
    return { backgroundColor: style.backgroundColor, color: style.color, fontWeight: style.fontWeight, fontSize: style.fontSize, width: el.offsetWidth, height: el.offsetHeight };
  }

  function findButton(container, keywordArray) {
    if (!container) return { found: false, text: "", style: null };
    const candidates = container.querySelectorAll("button, a, input[type='button'], [role='button'], .btn, .button");
    for (const el of candidates) {
      if (!isVisible(el)) continue;
      const text = (el.innerText || el.value || "").toLowerCase().trim();
      if (text.length > 50) continue; 
      for (const kw of keywordArray) {
        if (text === kw || text.includes(kw)) return { found: true, text: text, style: getButtonStyle(el) };
      }
    }
    return { found: false, text: "", style: null };
  }

  function checkVisualSymmetry(acceptStyle, rejectStyle) {
    if (!acceptStyle || !rejectStyle) return { backgroundDiffers: false, sizeDiffers: false };
    const bg1 = acceptStyle.backgroundColor.replace(/\s/g, '');
    const bg2 = rejectStyle.backgroundColor.replace(/\s/g, '');
    const backgroundDiffers = (bg1 !== bg2) && (bg1 !== 'rgba(0,0,0,0)' && bg2 !== 'rgba(0,0,0,0)');
    const sizeDiffers = Math.abs(acceptStyle.width - rejectStyle.width) > 40 || Math.abs(acceptStyle.height - rejectStyle.height) > 15;
    return { backgroundDiffers, sizeDiffers };
  }

  async function scanPage() {
    const storage = await chrome.storage.local.get("extensionEnabled");
    if (storage.extensionEnabled === false) return;

    let banner = findCookieBanner();
    
    if (!banner) {
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise(r => setTimeout(r, 1500));
      window.scrollTo(0, 0);
      await new Promise(r => setTimeout(r, 1000));
      for (let i = 0; i < 15; i++) {
        await new Promise(r => setTimeout(r, 1000));
        banner = findCookieBanner();
        if (banner) break;
      }
    }

    if (banner) {
      banner.scrollIntoView({ behavior: "instant", block: "center" });
      await new Promise(r => setTimeout(r, 800));
    }

    const bannerFound = !!banner;
    let acceptBtn = { found: false }, rejectBtn = { found: false }, manageBtn = { found: false };
    let hasPreselected = false, hasNegativeFraming = false, visualSymmetry = null, clicksToReject = 99;

    if (bannerFound) {
      acceptBtn = findButton(banner, ACCEPT_KEYWORDS);
      rejectBtn = findButton(banner, REJECT_KEYWORDS);
      manageBtn = findButton(banner, MANAGE_KEYWORDS);
      
      // If buttons not in banner, search globally in the frame where banner was found
      const searchDoc = banner.ownerDocument || document;
      if (!rejectBtn.found) rejectBtn = findButton(searchDoc, REJECT_KEYWORDS); 
      if (!manageBtn.found) manageBtn = findButton(searchDoc, MANAGE_KEYWORDS);

      const prechecked = banner.querySelectorAll('input[type="checkbox"]:checked');
      if (prechecked.length > 0) hasPreselected = true;
      const text = banner.innerText.toLowerCase();
      NEGATIVE_KEYWORDS.forEach(kw => { if (text.includes(kw)) hasNegativeFraming = true; });
      if (acceptBtn.found && rejectBtn.found) visualSymmetry = checkVisualSymmetry(acceptBtn.style, rejectBtn.style);
      if (rejectBtn.found) clicksToReject = 1;
      else if (manageBtn.found) clicksToReject = 2; 
    }

    const data = { bannerFound, acceptBtn, rejectBtn, manageBtn, visualSymmetry, clicksToReject, hasPreselected, hasNegativeFraming, url: window.location.href, hostname: window.location.hostname };
    chrome.runtime.sendMessage({ type: "CONSENT_SCAN_RESULT", data: data }).catch(() => {});
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "TRIGGER_SCAN") scanPage();
  });

  scanPage();
}