// content.js

// === 0. Фиксация позиций кнопок ===
(function injectButtonPositionFix() {
    'use strict';
    
    // Проверяем, не добавлен ли уже стиль
    if (document.getElementById('button-position-fix')) {
        return;
    }
    
    const style = document.createElement('style');
    style.id = 'button-position-fix';
    
    style.textContent = `
        /* Контейнеры с отступом сверху */
        .action-buttons-container-group,
        .action-buttons-container {
            position: relative !important;
            display: inline-block !important;
            padding-top: 10px !important;
        }
        
        /* Фиксируем размеры контейнеров */
        .action-buttons-container {
            min-width: 52px !important;
            min-height: 26px !important;
        }
        
        .action-buttons-container-group {
            min-width: 26px !important;
            min-height: 26px !important;
        }
        
        /* Заглушка для "Повторить" */
        .action-buttons-container-group:has(.s-repeat-alert[style*="display: none"])::before,
        .action-buttons-container-group:has(.s-repeat-alert[style*="display:none"])::before {
            content: '';
            position: absolute !important;
            left: 0 !important;
            top: 10px !important;
            width: 16px;
            height: 16px;
            pointer-events: none;
            background: url('/img/icons/repeat_alert_2.svg') center center no-repeat;
            background-size: 16px 16px;
            opacity: 0.05;
            filter: grayscale(100%);
        }
        
        /* Заглушка для "Показать" */
        .action-buttons-container:has(.show-now[style*="display: none"])::before,
        .action-buttons-container:has(.show-now[style*="display:none"])::before {
            content: '';
            position: absolute !important;
            left: 0 !important;
            top: 10px !important;
            width: 16px;
            height: 16px;
            pointer-events: none;
            background: url('/img/icons/play_alert.svg') center center no-repeat;
            background-size: 13px 14px;
            opacity: 0.05;
            filter: grayscale(100%);
        }
        
        /* Заглушка для "Пропустить" */
        .action-buttons-container:has(.skip[style*="display: none"])::after,
        .action-buttons-container:has(.skip[style*="display:none"])::after {
            content: '';
            position: absolute !important;
            left: 26px !important;
            top: 10px !important;
            width: 16px;
            height: 16px;
            pointer-events: none;
            background: url('/img/icons/skip_alert.svg') center center no-repeat;
            background-size: 12px 12px;
            opacity: 0.05;
            filter: grayscale(100%);
        }
        
        /* Кнопки с отступом сверху */
        .action-button-item.s-repeat-alert {
            position: absolute !important;
            left: 0 !important;
            top: 10px !important;
        }
        
        .action-button-item.show-now {
            position: absolute !important;
            left: 0 !important;
            top: 10px !important;
        }
        
        .action-button-item.skip {
            position: absolute !important;
            left: 26px !important;
            top: 10px !important;
        }
    `;
    
    // Добавляем в head как можно раньше
    (document.head || document.documentElement).appendChild(style);
    
    console.log('✅ Button position fix injected');
})();

// === 1. Глобальные переменные ===
let autoApproveSettings = {};
let autoSkipSettings = {};
let approveShortcut = { ctrl: false, alt: false, shift: false, key: "Numpad9" };
let skipShortcut = { ctrl: false, alt: false, shift: false, key: "Numpad2" };
const backupApproveShortcut = { ctrl: true, alt: false, shift: true, key: "NumpadDivide" };
const backupSkipShortcut = { ctrl: true, alt: false, shift: true, key: "NumpadMultiply" };

// Кэш настроек звука для уменьшения задержек при чтении
let soundEnabledCache = false;
let volumeCache = 0.5; // 0..1
let selectedSoundUrlCache = "";
const DEFAULT_SOUND_URL = "sounds/doorbell.mp3";

// Инициализация AudioContext — до загрузки настроек, чтобы избежать гонок
let audioContext = (() => {
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return new Ctor({ latencyHint: "interactive" });
  } catch (_) {
    const Ctor = window.AudioContext || window.webkitAudioContext;
    return new Ctor();
  }
})();
let audioBuffer;
let sharedGainNode; // создаём один gain и переподключаем новые источники для минимизации накладных расходов
let pendingSoundPlays = 0; // если звук ещё не готов, отметим, что нужно проиграть при готовности

// Функция для получения абсолютного URL звука (внешнего или локального из расширения)
const getAbsoluteSoundUrl = (url) => {
  if (!url) return chrome.runtime.getURL(DEFAULT_SOUND_URL);
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("chrome-extension://") || url.startsWith("moz-extension://")) {
    return url;
  }
  return chrome.runtime.getURL(url);
};

// Функция удержания вкладки и AudioContext в активном состоянии
const keepAudioAlive = () => {
  const preventSleep = () => {
    if (audioContext) {
      if (audioContext.state === "suspended") {
        audioContext.resume().catch(() => {});
      }
      // Проигрываем микро-тишину для предотвращения троттлинга таймеров браузером
      try {
        const buffer = audioContext.createBuffer(1, 1, 22050);
        const node = audioContext.createBufferSource();
        node.buffer = buffer;
        node.connect(audioContext.destination);
        node.start(0);
      } catch (_) {}
    }
  };
  // Каждые 15 секунд воспроизводим микро-звук тишины
  setInterval(preventSleep, 15000);
};

// Запускаем удержание активности
keepAudioAlive();

// Предзагрузка и декодирование выбранного звука
let currentSoundAbortController;
const preloadSelectedSound = (rawSoundUrl) => {
  const soundUrl = getAbsoluteSoundUrl(rawSoundUrl);
  if (!soundUrl || soundUrl === selectedSoundUrlCache) return;
  selectedSoundUrlCache = soundUrl;

  if (currentSoundAbortController) {
    currentSoundAbortController.abort();
  }
  currentSoundAbortController = new AbortController();

  const viaBg = () => {
    // Встроенные локальные звуки не требуют проксирования через фоновый скрипт
    if (soundUrl.startsWith("chrome-extension://") || soundUrl.startsWith("moz-extension://")) {
      return Promise.reject(new Error("Local resource"));
    }
    return new Promise((resolve, reject) => {
      try {
        chrome.runtime.sendMessage(
          { type: "FETCH_SOUND_ARRAYBUFFER", url: soundUrl },
          (res) => {
            if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
            if (!res || !res.ok || !res.buffer) return reject(new Error(res && res.error || "No data"));
            resolve(res.buffer);
          }
        );
      } catch (e) {
        reject(e);
      }
    });
  };

  const direct = () => fetch(soundUrl, { signal: currentSoundAbortController.signal, cache: "force-cache" })
    .then((response) => response.arrayBuffer());

  (viaBg().catch(() => direct()))
    .then((arrayBuffer) => audioContext.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      audioBuffer = buffer;
      // если был запрос на воспроизведение в ожидании загрузки — воспроизведём теперь
      if (pendingSoundPlays > 0) {
        const playsToDo = pendingSoundPlays;
        pendingSoundPlays = 0;
        for (let i = 0; i < playsToDo; i++) {
          playSound(volumeCache);
        }
      }
    })
    .catch((error) => {
      if (error.name !== "AbortError") {
        console.error("Ошибка загрузки звука:", error);
      }
    });
};

// Функция для миграции старых ссылок на GitHub на новые локальные пути звуков
const migrateSoundUrl = (url) => {
  if (!url) return "sounds/doorbell.mp3";
  if (url.startsWith("https://raw.githubusercontent.com/")) {
    const filename = url.substring(url.lastIndexOf("/") + 1);
    return `sounds/${filename}`;
  }
  return url;
};

// === 2. Загрузка настроек ===
const loadSettings = () => {
  chrome.storage.local.get(null, (data) => {
    autoApproveSettings = {};
    autoSkipSettings = {};

    Object.keys(data).forEach((key) => {
      const isApprove = key.includes("show-now");
      const isSkip = key.includes("skip");

      // Получаем alert_type из сохраненного маппинга
      const relatedAlertTypes = data[`related-${key}`] || [];
      relatedAlertTypes.forEach((alertType) => {
        if (isApprove && data[key]) autoApproveSettings[alertType] = true;
        if (isSkip && data[key]) autoSkipSettings[alertType] = true;
      });
    });

    // Загрузка горячих клавиш
    if (data.approveKey) approveShortcut = data.approveKey;
    if (data.skipKey) skipShortcut = data.skipKey;

    // Загрузка настроек звука (в кэш) и предзагрузка звука
    if (typeof data.soundEnabled !== "undefined") soundEnabledCache = !!data.soundEnabled;
    if (typeof data.volume !== "undefined") volumeCache = Number(data.volume) / 100;
    
    const targetSound = data.selectedSound ? migrateSoundUrl(data.selectedSound) : DEFAULT_SOUND_URL;
    preloadSelectedSound(targetSound);
  });
};

// === 3. Проверка необходимости проигрывания звука ===
const shouldPlaySound = (alert) => {
  const alertType = alert.dataset.alert_type;
  const showNowButton = alert.querySelector(".action-button-item.show-now");
  const isShowNowVisible = !!(showNowButton && showNowButton.offsetParent !== null && showNowButton.style.display !== "none");

  return (
    !alert.dataset.soundPlayed &&
    isShowNowVisible &&
    !autoApproveSettings[alertType] &&
    !autoSkipSettings[alertType]
  );
};

// === 4. Клик с задержкой ===
const clickWithDelay = async (buttons, delay = 200) => {
  for (const button of buttons) {
    button.click();
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
};

// === 5. Обработка уведомлений ===
const processAlerts = async () => {
  const alerts = Array.from(document.querySelectorAll(".event.b-last-events-widget__item.moderated")).reverse();
  const approveButtons = [];
  const skipButtons = [];
  const processedAlerts = new Set();

  alerts.forEach((alert) => {
    const alertType = alert.dataset.alert_type;
    const alertId = alert.dataset.alert_id;

    // Автоподтверждение
    if (autoApproveSettings[alertType] && !processedAlerts.has(alertId)) {
      const approveButton = alert.querySelector(".action-button-item.show-now");
      if (approveButton && approveButton.offsetParent !== null && approveButton.style.display !== "none") {
        approveButtons.push(approveButton);
        processedAlerts.add(alertId);
      }
    }

    // Автопропуск
    if (autoSkipSettings[alertType] && !processedAlerts.has(alertId)) {
      const skipButton = alert.querySelector(".action-button-item.skip");
      const showNowButton = alert.querySelector(".action-button-item.show-now");
      if (skipButton && skipButton.offsetParent !== null && skipButton.style.display !== "none" &&
          (!showNowButton || showNowButton.style.display !== "none")) {
        skipButtons.push(skipButton);
        processedAlerts.add(alertId);
      }
    }

    // Проверяем необходимость воспроизведения звука (без чтения из storage на каждом тике)
    if (shouldPlaySound(alert) && soundEnabledCache) {
      playSound(volumeCache);
      alert.dataset.soundPlayed = "true";
    }
  });

  // Кликаем кнопки
  await clickWithDelay(skipButtons);
  await clickWithDelay(approveButtons);
};

// === 6. Обработка горячих клавиш ===
const isShortcutPressed = (event, shortcut) =>
  event.ctrlKey === shortcut.ctrl && event.altKey === shortcut.alt && event.shiftKey === shortcut.shift && event.code === shortcut.key;

const handleApprove = () => {
  console.log("Approve action triggered");
  const buttons = [...document.querySelectorAll(".action-button-item.show-now")];
  const visibleButtons = buttons.filter((btn) => btn.offsetParent !== null && btn.style.display !== "none");
  if (visibleButtons.length) {
    const targetButton = visibleButtons[visibleButtons.length - 1];
    targetButton.click();
    console.log("Clicked Approve button:", targetButton);
  } else {
    console.log("No visible 'show-now' buttons found.");
  }
};

const handleSkip = () => {
  console.log("Skip action triggered");
  const buttons = [...document.querySelectorAll(".action-button-item.skip")];
  const visibleButtons = buttons.filter((btn) => {
    const showNowButton = btn.parentElement.querySelector(".action-button-item.show-now");
    return btn.offsetParent !== null && btn.style.display !== "none" &&
           (!showNowButton || showNowButton.style.display !== "none");
  });
  if (visibleButtons.length) {
    const targetButton = visibleButtons[visibleButtons.length - 1];
    targetButton.click();
    console.log("Clicked Skip button:", targetButton);
  } else {
    console.log("No visible 'skip' buttons found.");
  }
};

// Слушатель для горячих клавиш
document.addEventListener("keydown", (event) => {
  if (isShortcutPressed(event, approveShortcut) || isShortcutPressed(event, backupApproveShortcut)) handleApprove();
  if (isShortcutPressed(event, skipShortcut) || isShortcutPressed(event, backupSkipShortcut)) handleSkip();
});

// === 6.5. YouTube Превью (без API-ключа) ===
const processedYoutubeElements = new WeakSet();
const youtubeCache = new Map();

function extractVideoId(url) {
  if (!url) return null;
  const patterns = [
    /[?&]v=([a-zA-Z0-9_-]{11})/,
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function formatNumber(n) {
  if (!n) return "?";
  n = Number(String(n).replace(/[^\d]/g, ""));
  if (n >= 1e9) return (n / 1e9).toFixed(1) + "B";
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "K";
  return n.toString();
}

// Функция отправки JSON-запросов через фоновый скрипт (CORS-прокси)
async function fetchJsonViaBg(url) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type: "FETCH_JSON", url: url }, (res) => {
        if (chrome.runtime.lastError) return reject(chrome.runtime.lastError);
        if (!res || !res.ok) return reject(new Error(res && res.error || "No response"));
        resolve(res.data);
      });
    } catch (e) {
      reject(e);
    }
  });
}

async function fetchYoutubeOembed(videoId) {
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    return await fetchJsonViaBg(url);
  } catch (e) {
    console.error("YouTube oEmbed load error via BG:", e);
    return null;
  }
}

async function fetchYoutubeDislikes(videoId) {
  try {
    const url = `https://returnyoutubedislikeapi.com/votes?videoId=${videoId}`;
    return await fetchJsonViaBg(url);
  } catch (e) {
    console.error("Dislikes load error via BG:", e);
    return null;
  }
}

function createPreviewContainer() {
  const el = document.createElement("div");
  el.classList.add("yt-preview-container");
  Object.assign(el.style, {
    marginTop: "8px",
    padding: "8px 10px",
    borderRadius: "8px",
    background: "rgba(0,0,0,0.25)",
    fontSize: "12px",
    display: "flex",
    gap: "10px",
    alignItems: "center",
    border: "1px solid rgba(255,255,255,0.1)"
  });
  return el;
}

async function processYoutubePreviews(eventEl) {
  if (processedYoutubeElements.has(eventEl)) return;
  processedYoutubeElements.add(eventEl);

  const link = eventEl.querySelector(".message-container a");
  if (!link) return;

  const videoId = extractVideoId(link.href);
  if (!videoId) return;

  const container = createPreviewContainer();

  const thumb = document.createElement("img");
  thumb.classList.add("yt-preview-thumbnail");
  Object.assign(thumb.style, {
    width: "96px",
    height: "54px",
    objectFit: "cover",
    borderRadius: "6px",
    flexShrink: "0"
  });

  const info = document.createElement("div");
  info.classList.add("yt-preview-info");
  Object.assign(info.style, {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    minWidth: "0",
    flex: "1"
  });

  const title = document.createElement("div");
  title.classList.add("yt-preview-title");
  Object.assign(title.style, {
    fontWeight: "600",
    lineHeight: "1.25",
    wordBreak: "break-word"
  });
  title.innerText = "Загрузка...";

  const meta = document.createElement("div");
  meta.classList.add("yt-preview-meta");
  Object.assign(meta.style, {
    opacity: "0.8",
    whiteSpace: "nowrap"
  });
  meta.innerText = "Получение статистики...";

  info.appendChild(title);
  info.appendChild(meta);

  container.appendChild(thumb);
  container.appendChild(info);

  link.parentElement.appendChild(container);

  try {
    let ytData = youtubeCache.get(videoId);

    if (!ytData) {
      const [oembed, dislikesData] = await Promise.all([
        fetchYoutubeOembed(videoId),
        fetchYoutubeDislikes(videoId)
      ]);

      if (!oembed) {
        meta.innerText = "Видео не найдено";
        return;
      }

      ytData = {
        title: oembed.title,
        channel: oembed.author_name,
        thumbnail: oembed.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
        views: dislikesData ? dislikesData.viewCount : null,
        likes: dislikesData ? dislikesData.likes : null,
        dislikes: dislikesData ? dislikesData.dislikes : null
      };

      youtubeCache.set(videoId, ytData);
    }

    thumb.src = ytData.thumbnail;
    title.innerText = ytData.title;

    meta.innerText =
      `${ytData.channel}      ` +
      `▶️ ${formatNumber(ytData.views)}   ` +
      `👍 ${formatNumber(ytData.likes)}   ` +
      `👎 ${formatNumber(ytData.dislikes)}`;

  } catch (e) {
    console.error("Preview load error:", e);
    meta.innerText = "Ошибка загрузки";
  }
}

function scanYoutube() {
  document.querySelectorAll(".event").forEach(processYoutubePreviews);
}

// === 7. Регулярная проверка + мгновенное реагирование через MutationObserver ===
// При старте
loadSettings();

// Мгновенная реакция на появление новых алертов
const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (!(node instanceof HTMLElement)) continue;
      const candidate = node.matches?.(".event")
        ? node
        : node.querySelector?.(".event");
      if (candidate) {
        // Быстрый обработчик только для звука + метки, чтобы уменьшить задержку
        if (shouldPlaySound(candidate) && soundEnabledCache) {
          playSound(volumeCache);
          candidate.dataset.soundPlayed = "true";
        }
        // Обработка YouTube превью
        processYoutubePreviews(candidate);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });

// Запускаем первичное сканирование превью при старте
scanYoutube();

// Лёгкий интервал как резервный механизм для авто-кликов, пропущенных мутаций и YouTube превью
const PROCESS_INTERVAL_MS = 1000;
setInterval(() => {
  processAlerts();
  scanYoutube();
}, PROCESS_INTERVAL_MS);

// === 8. Обновление настроек при их изменении ===
chrome.storage.onChanged.addListener((changes) => {
  // Обновляем кэш максимально быстро
  if (changes.soundEnabled) soundEnabledCache = !!changes.soundEnabled.newValue;
  if (changes.volume) volumeCache = Number(changes.volume.newValue) / 100;
  if (changes.selectedSound) preloadSelectedSound(changes.selectedSound.newValue);
  loadSettings();
});

// === 9. Модальное окно для включения звука ===
// Функция для отображения модального окна
function showSoundAlertModal() {
  console.log("Showing sound alert modal");

  // Создаём затемнённый фон
  const modalOverlay = document.createElement("div");
  modalOverlay.classList.add("modal-overlay");

  console.log("Modal overlay created:", modalOverlay);

  // Создаём модальное окно
  const modal = document.createElement("div");
  modal.classList.add("modal");
  modal.innerHTML = `
    <p>Включить звуковые уведомления?</p>
    <div class="button-place">
      <button id="enable-sound">
        <span class="btn_icon"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="10" viewBox="0 0 11 10">
          <path fill="none" fill-rule="evenodd" stroke="#FFF" stroke-width="1.8" d="M.982 4.507l3.99 3.596L10.676.578"></path>
        </svg></span>
        <span class="b-btn__text">Включить</span>
      </button>
      <button id="disable-sound">
        <span class="b-btn__text">Отключить</span>
      </button>
    </div>
  `;

  // Добавляем затемнённый фон в документ
  modalOverlay.appendChild(modal);
  document.body.appendChild(modalOverlay);
  console.log("Modal overlay appended to body:", modalOverlay);

  const enableSoundButton = document.getElementById("enable-sound");
  const disableSoundButton = document.getElementById("disable-sound");

  const removeModalOverlay = () => {
    if (document.body.contains(modalOverlay)) {
      document.body.removeChild(modalOverlay);
    }
  };

  enableSoundButton.addEventListener("click", () => {
    chrome.storage.local.set({ soundEnabled: true });
    removeModalOverlay();
  });

  disableSoundButton.addEventListener("click", () => {
    chrome.storage.local.set({ soundEnabled: false });
    removeModalOverlay();
  });

  // Обработчик для закрытия модального окна при клике вне его рамок
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) {
      chrome.storage.local.set({ soundEnabled: true });
      removeModalOverlay();
    }
  });

  // Обработчик для закрытия модального окна при нажатии клавиши Esc
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      chrome.storage.local.set({ soundEnabled: true });
      removeModalOverlay();
    }
  });

  // Слушатели уже назначены выше (enableSoundButton/disableSoundButton)
}

// Функция для воспроизведения звука (низкая задержка)
const playSound = (volume) => {
  // если буфер ещё не готов — отметим, что нужно проиграть, когда он появится
  if (!audioBuffer) {
    pendingSoundPlays = Math.min(pendingSoundPlays + 1, 2);
    return;
  }
  const ensureRunning = () => {
    if (audioContext.state !== "running") {
      return audioContext.resume().catch(() => {});
    }
    return Promise.resolve();
  };
  ensureRunning().finally(() => {
    try {
      if (!sharedGainNode) {
        sharedGainNode = audioContext.createGain();
        sharedGainNode.connect(audioContext.destination);
      }
      sharedGainNode.gain.value = volume;
      const src = audioContext.createBufferSource();
      src.buffer = audioBuffer;
      src.connect(sharedGainNode);
      src.start(0);
    } catch (_) {}
  });
};

// Разблокировка аудио по первым жестам пользователя (минимизирует проблемы в фоне)
const userGestureEvents = ["click", "keydown", "pointerdown", "touchstart"]; 
const unlockAudio = () => {
  if (audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
};
userGestureEvents.forEach((evt) => document.addEventListener(evt, unlockAudio, { once: false, passive: true }));

// Восстанавливаем аудио при возвращении во вкладку
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && audioContext.state === "suspended") {
    audioContext.resume().catch(() => {});
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (window.location.href.includes("https://www.donationalerts.com/widget/lastdonations")) {
      showSoundAlertModal();
    }
  });
} else if (window.location.href.includes("https://www.donationalerts.com/widget/lastdonations")) {
  showSoundAlertModal();
}
