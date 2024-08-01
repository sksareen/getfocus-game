chrome.action.onClicked.addListener((tab) => {
  if (!tab || !tab.url || tab.url.startsWith('chrome://')) {
    chrome.tabs.create({ url: 'https://www.google.com' }, (newTab) => {
      setTimeout(() => {
        chrome.tabs.sendMessage(newTab.id, { action: "showOverlay" });
      }, 1000); // Wait for the page to load
    });
  } else {
    chrome.tabs.sendMessage(tab.id, { action: "showOverlay" });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "updateState") {
    chrome.storage.local.set(request.state);
  }
});