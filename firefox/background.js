chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["selectedSound", "volume"], (data) => {
    if (!data.selectedSound) {
      chrome.storage.local.set({
        selectedSound: "https://raw.githubusercontent.com/phleesty/donation-alerts-moderator/main/sounds/doorbell.mp3"
      });
    }
    if (typeof data.volume === "undefined") {
      chrome.storage.local.set({
        volume: 50
      });
    }
  });
  console.log("Extension installed or updated.");
});

// Proxy network fetches from content script to avoid CORS/network hiccups
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;
  (async () => {
    try {
      switch (message.type) {
        case "FETCH_SOUND_ARRAYBUFFER": {
          const resp = await fetch(message.url, { cache: "force-cache" });
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buf = await resp.arrayBuffer();
          sendResponse({ ok: true, buffer: buf });
          break;
        }
        default:
          break;
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message || e) });
    }
  })();
  return true; // async
});