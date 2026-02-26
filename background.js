importScripts("rules.js");

function updateBadge(tabId, result) {
  let color = "#c0392b"; 
  if (result.score >= 70) color = "#27ae60";
  else if (result.score >= 40) color = "#e67e22";

  chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: color });
  chrome.action.setBadgeText({ tabId: tabId, text: result.score.toString() });
  chrome.action.setTitle({ tabId: tabId, title: `ConsentFair Score: ${result.score}` });
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CONSENT_SCAN_RESULT" && sender.tab) {
    const tabId = sender.tab.id;
    const windowId = sender.tab.windowId;
    const evaluation = calculateScore(message.data);
    
    // Autonomously take a screenshot of the visible tab
    chrome.tabs.captureVisibleTab(windowId, { format: "jpeg", quality: 60 }, (dataUrl) => {
      
      // If the user switched tabs too fast, Chrome blocks the screenshot. Handled gracefully.
      if (chrome.runtime.lastError) {
        console.warn("Could not capture screenshot:", chrome.runtime.lastError.message);
        dataUrl = null; 
      }

      const finalResult = {
        ...evaluation,
        hostname: message.data.hostname,
        url: message.data.url,
        bannerFound: message.data.bannerFound,
        screenshot: dataUrl // Store the image data
      };

      const storageKey = "tab_" + tabId;
      chrome.storage.local.set({ [storageKey]: finalResult }, () => {
        if (!chrome.runtime.lastError) {
          updateBadge(tabId, finalResult);
        }
      });
    });
  }
  return true; 
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "loading" && tab.url && !tab.url.startsWith("chrome://")) {
    chrome.action.setBadgeBackgroundColor({ tabId: tabId, color: "#7f8c8d" });
    chrome.action.setBadgeText({ tabId: tabId, text: "..." });
  }
});

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove("tab_" + tabId);
});