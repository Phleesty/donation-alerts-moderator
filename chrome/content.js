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
let alertSound = new Audio();
let approveShortcut = { ctrl: false, alt: false, shift: false, key: "Numpad9" };
let skipShortcut = { ctrl: false, alt: false, shift: false, key: "Numpad2" };
const backupApproveShortcut = { ctrl: true, alt: false, shift: true, key: "NumpadDivide" };
const backupSkipShortcut = { ctrl: true, alt: false, shift: true, key: "NumpadMultiply" };
let audioContext;
let audioBuffer;
let source;

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

    // Загрузка настроек звука
    if (data.selectedSound) {
      fetch(data.selectedSound)
        .then((response) => response.arrayBuffer())
        .then((arrayBuffer) => {
          audioContext.decodeAudioData(arrayBuffer, (buffer) => {
            audioBuffer = buffer;
          });
        })
        .catch((error) => console.error("Ошибка загрузки звука:", error));
    }
    if (data.volume) alertSound.volume = data.volume / 100;
  });
};

// === 3. Проверка необходимости проигрывания звука ===
const shouldPlaySound = (alert) => {
  const alertType = alert.dataset.alert_type;
  const showNowButton = alert.querySelector(".action-button-item.show-now");

  return (
    !alert.dataset.soundPlayed &&
    showNowButton &&
    (!showNowButton.hasAttribute("style") || showNowButton.style.display !== "none") &&
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

    // Проверяем необходимость воспроизведения звука
    if (shouldPlaySound(alert)) {
      chrome.storage.local.get(["soundEnabled", "volume"], (data) => {
        if (data.soundEnabled) {
          playSound(data.volume / 100);
          alert.dataset.soundPlayed = "true";
        }
      });
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

// === 7. Регулярная проверка ===
// При старте
loadSettings();
setInterval(() => {
  processAlerts();
}, 1000);

// === 8. Обновление настроек при их изменении ===
chrome.storage.onChanged.addListener(() => {
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

  document.getElementById("enable-sound").addEventListener("click", () => {
    chrome.storage.local.set({ soundEnabled: true });
    removeModalOverlay();
  });

  document.getElementById("disable-sound").addEventListener("click", () => {
    chrome.storage.local.set({ soundEnabled: false });
    removeModalOverlay();
  });
}

// Инициализация AudioContext
audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Функция для воспроизведения звука
const playSound = (volume) => {
  if (audioBuffer) {
    source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode).connect(audioContext.destination);
    source.start(0);
  }
};

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    if (window.location.href.includes("https://www.donationalerts.com/widget/lastdonations")) {
      showSoundAlertModal();
    }
  });
} else if (window.location.href.includes("https://www.donationalerts.com/widget/lastdonations")) {
  showSoundAlertModal();
}
