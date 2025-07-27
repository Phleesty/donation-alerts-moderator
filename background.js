chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["selectedSound", "volume"], (data) => {
    if (!data.selectedSound) {
      chrome.storage.local.set({
        selectedSound: "https://raw.githubusercontent.com/phleesty/sound-alerts/main/doorbell.mp3"
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