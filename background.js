chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.sendMessage(tab.id, {action: "toggleBreather"});
  console.log("background loaded");
});