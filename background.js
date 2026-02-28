importScripts("rules.js");

let extensionEnabled = true;
chrome.storage.local.get("extensionEnabled", (data) => {
  if (data.extensionEnabled !== undefined) extensionEnabled = data.extensionEnabled;
});

function updateBadge(tabId, result) {
  if (!extensionEnabled) {
    chrome.action.setBadgeText({ tabId: tabId, text: "" });
    return;
  }
  let color = result.score >= 70 ? "#27ae60" : (result.score >= 40 ? "#e67e22" : "#c0392b");
  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color });
  chrome.action.setBadgeText({ tabId: tabId, text: result.score.toString() });
}

const pendingBulkResults = new Map();

async function clearSiteData(url) {
  try {
    await chrome.browsingData.remove({
      "origins": [new URL(url).origin]
    }, {
      "cache": true,
      "cookies": true,
      "localStorage": true
    });
  } catch (e) {
    console.warn("Wipe failed:", e);
  }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TOGGLE_EXTENSION") {
    extensionEnabled = message.enabled;
    chrome.storage.local.set({ extensionEnabled: extensionEnabled });
    return;
  }

  if (message.type === "CONSENT_SCAN_RESULT" && sender.tab) {
    const tabId = sender.tab.id;
    const windowId = sender.tab.windowId;
    const storageKey = "tab_" + tabId;

    chrome.storage.local.get([storageKey], (existing) => {
      const existingResult = existing[storageKey];
      if (existingResult && existingResult.bannerFound && !message.data.bannerFound) return;

      const evaluation = calculateScore(message.data);
      
      chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 40 }, (dataUrl) => {
        if (chrome.runtime.lastError) dataUrl = null; 
        if (!dataUrl && existingResult && existingResult.screenshot) dataUrl = existingResult.screenshot;

        const finalResult = {
          ...evaluation,
          hostname: new URL(sender.tab.url).hostname,
          url: sender.tab.url,
          bannerFound: message.data.bannerFound,
          screenshot: dataUrl
        };

        chrome.storage.local.set({ [storageKey]: finalResult }, () => {
          updateBadge(tabId, finalResult);
          if (pendingBulkResults.has(tabId)) {
             chrome.runtime.sendMessage({ type: "BULK_ITEM_RESULT", tabId: tabId, data: finalResult });
          }
        });
      });
    });
  }
  return true; 
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "START_BULK_SCAN") {
    processBulkUrls(message.urls, message.timeout || 30000);
  }
});

async function processBulkUrls(urls, timeout) {
  for (const url of urls) {
    try {
      await clearSiteData(url);
      const tab = await chrome.tabs.create({ url: url, active: true });
      
      const scanComplete = new Promise((resolve) => {
        pendingBulkResults.set(tab.id, resolve);
        // Use manual timeout from user
        setTimeout(() => {
          if (pendingBulkResults.has(tab.id)) {
            pendingBulkResults.delete(tab.id);
            resolve();
          }
        }, timeout);
      });

      await scanComplete;
      
      chrome.storage.local.get(["tab_" + tab.id], (res) => {
         if (res["tab_" + tab.id]) {
            chrome.runtime.sendMessage({ type: "BULK_ITEM_FINALIZED", tabId: tab.id, data: res["tab_" + tab.id] });
         }
      });

      chrome.tabs.remove(tab.id);
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.error("Bulk scan error:", e);
    }
  }
  chrome.runtime.sendMessage({ type: "BULK_SCAN_FINISHED" });
}

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (!extensionEnabled) return;
  if (changeInfo.status === "loading" && tab.url && !tab.url.startsWith("chrome://")) {
    chrome.action.setBadgeText({ tabId: tabId, text: "..." });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove("tab_" + tabId);
  pendingBulkResults.delete(tabId);
});