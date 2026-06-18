// background.js

// === 1. Инициализация настроек по умолчанию ===
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(["selectedSound", "volume"], (data) => {
    // В качестве дефолтного звука используем встроенный локальный файл
    if (!data.selectedSound) {
      chrome.storage.local.set({
        selectedSound: "sounds/doorbell.mp3"
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

// === 2. Защита вкладки виджета от выгрузки из памяти (засыпания) ===
const disableAutoDiscard = (tabId, url) => {
  if (url && url.includes("donationalerts.com/widget/lastdonations")) {
    // Проверяем наличие метода chrome.tabs.update (на случай специфичных платформ)
    if (chrome.tabs && chrome.tabs.update) {
      chrome.tabs.update(tabId, { autoDiscardable: false }, () => {
        if (chrome.runtime.lastError) {
          console.warn("Не удалось установить autoDiscardable: false:", chrome.runtime.lastError.message);
        } else {
          console.log(`Вкладка виджета ${tabId} защищена от автоматической выгрузки из памяти.`);
        }
      });
    }
  }
};

// Отслеживаем обновление адреса во вкладках
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    disableAutoDiscard(tabId, changeInfo.url);
  }
});

// При запуске расширения проверяем все открытые вкладки
chrome.tabs.query({}, (tabs) => {
  if (tabs && tabs.length) {
    tabs.forEach((tab) => {
      disableAutoDiscard(tab.id, tab.url);
    });
  }
});

// === 3. CORS-прокси для сетевых запросов (для совместимости с Firefox) ===
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  // Обрабатываем асинхронно
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
        case "FETCH_JSON": {
          const resp = await fetch(message.url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const json = await resp.json();
          sendResponse({ ok: true, data: json });
          break;
        }
        case "OPEN_LINK": {
          chrome.windows.create({
            url: message.url,
            state: "maximized"
          });
          sendResponse({ ok: true });
          break;
        }
        default:
          break;
      }
    } catch (e) {
      sendResponse({ ok: false, error: String(e && e.message || e) });
    }
  })();
  return true; // Держим канал связи открытым для асинхронного sendResponse
});