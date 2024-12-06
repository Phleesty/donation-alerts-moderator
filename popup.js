document.addEventListener("DOMContentLoaded", () => {
  // Маппинг чекбоксов к связанным alert_type
  const alertTypeMapping = {
    "data-alert_type-all-show-now": ["1", "4", "6", "13", "15", "11", "19", "18", "17", "16", "14", "7", "10", "32", "12"],
    "data-alert_type-1-show-now": ["1", "11", "32", "12"],
    "data-alert_type-6-show-now": ["6"],
    "data-alert_type-19-show-now": ["19"],
    "data-alert_type-17-show-now": ["17", "18"],
    "data-alert_type-13-show-now": ["13", "4", "14", "15", "16", "7", "10"],
    "data-alert_type-all-skip": ["1", "4", "6", "13", "15", "11", "19", "18", "17", "16", "14", "7", "10", "32", "12"],
    "data-alert_type-1-skip": ["1", "11", "32", "12"],
    "data-alert_type-6-skip": ["6"],
    "data-alert_type-19-skip": ["19"],
    "data-alert_type-17-skip": ["17", "18"],
    "data-alert_type-13-skip": ["13", "4", "14", "15", "16", "7", "10"],
  };

  // Кнопки для выбора горячих клавиш
  const approveKeyBtn = document.getElementById("choose-approve-key");
  const skipKeyBtn = document.getElementById("choose-skip-key");
  const selectedApproveKey = document.getElementById("selected-approve-key");
  const selectedSkipKey = document.getElementById("selected-skip-key");

  // Настройки по умолчанию для горячих клавиш
  const defaultKeys = {
    approveKey: { ctrl: false, alt: false, shift: false, key: "Numpad9" },
    skipKey: { ctrl: false, alt: false, shift: false, key: "Numpad2" },
  };

  // Форматирование горячих клавиш для отображения
  const getReadableKeyName = (key) => {
    if (key.startsWith("Key")) return key.replace("Key", "");
    if (key.startsWith("Digit")) return key.replace("Digit", "");
    if (key.startsWith("Numpad")) return "Num" + key.replace("Numpad", "");
    return key;
  };

  const formatShortcut = (shortcut) => {
    const keys = [];
    if (shortcut.ctrl) keys.push("Ctrl");
    if (shortcut.alt) keys.push("Alt");
    if (shortcut.shift) keys.push("Shift");
    keys.push(getReadableKeyName(shortcut.key));
    return keys.join("+");
  };

  // Обновление отображения горячих клавиш
  const updateKeyDisplay = () => {
    chrome.storage.local.get(defaultKeys, (result) => {
      selectedApproveKey.textContent = formatShortcut(result.approveKey);
      selectedSkipKey.textContent = formatShortcut(result.skipKey);
    });
  };

  // Инициализация отображения
  updateKeyDisplay();

  // Сохранение состояния чекбокса
  const saveCheckboxState = (checkbox) => {
    const key = checkbox.id;
    const value = checkbox.checked;

    // Сохраняем связанные alert_type
    const relatedAlertTypes = alertTypeMapping[key] || [];
    chrome.storage.local.set({ [key]: value, [`related-${key}`]: relatedAlertTypes });
  };

  // Обработка изменения состояния чекбокса
  const handleCheckboxChange = (event) => {
    const changedCheckbox = event.target;
    const isShowNow = changedCheckbox.id.includes("show-now");
    const oppositeCategory = isShowNow ? "skip" : "show-now";

    // Обеспечиваем взаимное исключение
    if (changedCheckbox.checked) {
      const relatedAlertTypes = alertTypeMapping[changedCheckbox.id] || [];
      relatedAlertTypes.forEach((alertType) => {
        const oppositeCheckboxes = document.querySelectorAll(`input[type='checkbox'][id*='${oppositeCategory}']`);
        oppositeCheckboxes.forEach((checkbox) => {
          if (alertTypeMapping[checkbox.id].includes(alertType)) {
            checkbox.checked = false;
            saveCheckboxState(checkbox);
          }
        });
      });
    }

    saveCheckboxState(changedCheckbox);

    // Проверяем "Все"
    const allCheckbox = document.querySelector(`input[type='checkbox'][id*='${isShowNow ? "show-now" : "skip"}'][data-id='all']`);
    const categoryCheckboxes = document.querySelectorAll(`input[type='checkbox'][id*='${isShowNow ? "show-now" : "skip"}']:not([data-id='all'])`);
    const allChecked = Array.from(categoryCheckboxes).every((checkbox) => checkbox.checked);
    allCheckbox.checked = allChecked;
    saveCheckboxState(allCheckbox);
  };

  // Обработка изменения состояния чекбокса "Все"
  const handleAllCheckboxChange = (event) => {
    const allCheckbox = event.target;
    const isShowNow = allCheckbox.id.includes("show-now");
    const categoryCheckboxes = document.querySelectorAll(`input[type='checkbox'][id*='${isShowNow ? "show-now" : "skip"}']`);
    const oppositeAllCheckbox = document.querySelector(`input[type='checkbox'][id*='${isShowNow ? "skip" : "show-now"}'][data-id='all']`);
    const oppositeCategoryCheckboxes = document.querySelectorAll(`input[type='checkbox'][id*='${isShowNow ? "skip" : "show-now"}']`);

    categoryCheckboxes.forEach((checkbox) => {
      if (checkbox !== allCheckbox) {
        checkbox.checked = allCheckbox.checked;
        saveCheckboxState(checkbox);
      }
    });
    saveCheckboxState(allCheckbox);

    // Обеспечиваем взаимное исключение
    if (allCheckbox.checked) {
      oppositeAllCheckbox.checked = false;
      oppositeCategoryCheckboxes.forEach((checkbox) => {
        checkbox.checked = false;
        saveCheckboxState(checkbox);
      });
    }
    saveCheckboxState(oppositeAllCheckbox);
  };

  // Инициализация состояния чекбоксов
  const checkboxes = document.querySelectorAll("input[type='checkbox']");
  chrome.storage.local.get(null, (data) => {
    checkboxes.forEach((checkbox) => {
      if (data.hasOwnProperty(checkbox.id)) {
        checkbox.checked = data[checkbox.id];
      }
      if (checkbox.id.includes("all")) {
        checkbox.addEventListener("change", handleAllCheckboxChange);
      } else {
        checkbox.addEventListener("change", handleCheckboxChange);
      }
    });
  });

  // Выбор горячей клавиши
  const chooseKey = (keyType) => {
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");
    overlay.innerHTML = `<div class="overlay-content">Нажмите любую клавишу или сочитаение клавиш на клавиатуре</div>`;
    document.body.appendChild(overlay);

    const shortcut = { ctrl: false, alt: false, shift: false, key: "" };

    const onKeyDown = (event) => {
      event.preventDefault();

      shortcut.ctrl = event.ctrlKey;
      shortcut.alt = event.altKey;
      shortcut.shift = event.shiftKey;

      if (
        ["ControlLeft", "ControlRight", "ShiftLeft", "ShiftRight", "AltLeft", "AltRight"].includes(
          event.code
        )
      ) {
        return;
      }

      shortcut.key = event.code;

      // Проверка на уникальность
      chrome.storage.local.get(defaultKeys, (result) => {
        const otherKey = keyType === "approveKey" ? result.skipKey : result.approveKey;
        if (
          shortcut.ctrl === otherKey.ctrl &&
          shortcut.alt === otherKey.alt &&
          shortcut.shift === otherKey.shift &&
          shortcut.key === otherKey.key
        ) {
          overlay.querySelector(".overlay-content").textContent =
            "Клавиши для подтверждения и пропуска не могут быть одинаковыми";
          return;
        }

        chrome.storage.local.set({ [keyType]: shortcut }, () => {
          updateKeyDisplay();
          document.body.removeChild(overlay);
          document.removeEventListener("keydown", onKeyDown);
          document.removeEventListener("keyup", onKeyUp);
        });
      });
    };

    const onKeyUp = () => {
      if (!shortcut.key) {
        return;
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("keyup", onKeyUp);
  };

  approveKeyBtn.addEventListener("click", () => chooseKey("approveKey"));
  skipKeyBtn.addEventListener("click", () => chooseKey("skipKey"));

  // Элементы для выбора звука и громкости
  const soundSelect = document.getElementById("sound-select");
  const volumeRange = document.getElementById("volume-range");
  const volumeInput = document.getElementById("volume-input");
  const playSoundButton = document.getElementById("play-sound");

  // Загрузка сохраненных настроек
  const loadSoundSettings = () => {
    chrome.storage.local.get(["selectedSound", "volume"], (data) => {
      if (data.selectedSound) soundSelect.value = data.selectedSound;
      if (data.volume) {
        volumeRange.value = data.volume;
        volumeInput.value = data.volume;
      }
    });
  };

  // Сохранение выбранного звука
  soundSelect.addEventListener("change", (event) => {
    const selectedSound = event.target.value;
    chrome.storage.local.set({ selectedSound });
  });

  // Сохранение громкости
  volumeRange.addEventListener("input", (event) => {
    const volume = event.target.value;
    volumeInput.value = volume;
    chrome.storage.local.set({ volume });
  });

  volumeInput.addEventListener("input", (event) => {
    const volume = event.target.value;
    volumeRange.value = volume;
    chrome.storage.local.set({ volume });
  });

  // Прослушивание выбранного звука
  playSoundButton.addEventListener("click", () => {
    const selectedSound = soundSelect.value;
    const volume = volumeRange.value / 100;
    const audio = new Audio(selectedSound);
    audio.volume = volume;
    audio.play();
  });

  // Инициализация настроек
  loadSoundSettings();
});
