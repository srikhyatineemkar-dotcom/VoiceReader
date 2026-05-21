chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "voicereader-play",
    title: "▶ Play with VoiceReader",
    contexts: ["selection"]
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "voicereader-play" && info.selectionText) {
    chrome.storage.local.get(["voiceGender", "speechRate", "toneMode"], (prefs) => {
      chrome.tabs.sendMessage(tab.id, {
        action: "playText",
        text: info.selectionText,
        gender: prefs.voiceGender || "female",
        rate: prefs.speechRate || 1.0,
        toneMode: prefs.toneMode || "natural"
      });
    });
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getStatus") {
    sendResponse({ ok: true });
  }
  return true;
});
