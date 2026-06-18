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

    // Синхронизируем звуковые чекбоксы с автопропуском при любом изменении автоподтверждения/автопропуска
    const categories = ["all", "1", "6", "13", "17", "19"];
    categories.forEach(id => syncSoundWithSkipChange(id));
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

    // Синхронизируем звуковые чекбоксы с автопропуском после изменения всех автопропусков
    const categories = ["all", "1", "6", "13", "17", "19"];
    categories.forEach(id => syncSoundWithSkipChange(id));
  };

  // --- Обработчики для звуков категорий ---
  const soundCheckboxes = document.querySelectorAll("input[type='checkbox'][id^='sound-alert_type-']");
  const soundAllCheckbox = document.getElementById("sound-alert_type-all");
  const soundCategoryCheckboxes = document.querySelectorAll("input[type='checkbox'][id^='sound-alert_type-']:not([id*='all'])");

  const saveSoundCheckboxState = (cb) => {
    chrome.storage.local.set({ [cb.id]: cb.checked });
  };

  const handleSoundCheckboxChange = (event) => {
    const changed = event.target;
    saveSoundCheckboxState(changed);

    // Проверяем "Все"
    const allChecked = Array.from(soundCategoryCheckboxes).every(cb => cb.checked);
    soundAllCheckbox.checked = allChecked;
    saveSoundCheckboxState(soundAllCheckbox);
  };

  const handleSoundAllCheckboxChange = (event) => {
    const checked = soundAllCheckbox.checked;
    soundCategoryCheckboxes.forEach(cb => {
      cb.checked = checked;
      saveSoundCheckboxState(cb);
    });
    saveSoundCheckboxState(soundAllCheckbox);
  };

  // Синхронизация при инициализации (восстановление блокировки и сохраненных звуков)
  const syncSoundWithSkipInit = (id) => {
    const skipCb = document.getElementById(`data-alert_type-${id}-skip`);
    const soundCb = document.getElementById(`sound-alert_type-${id}`);
    if (!skipCb || !soundCb) return;

    const wrapper = soundCb.closest(".wrapper");

    if (skipCb.checked) {
      soundCb.checked = false;
      soundCb.disabled = true;
      if (wrapper) {
        wrapper.classList.add("disabled-sound");
      }
      chrome.storage.local.set({ [soundCb.id]: false });
    } else {
      soundCb.disabled = false;
      if (wrapper) {
        wrapper.classList.remove("disabled-sound");
      }
    }
  };

  // Синхронизация при изменении настроек пользователем
  const syncSoundWithSkipChange = (id) => {
    const skipCb = document.getElementById(`data-alert_type-${id}-skip`);
    const soundCb = document.getElementById(`sound-alert_type-${id}`);
    if (!skipCb || !soundCb) return;

    const wrapper = soundCb.closest(".wrapper");

    if (skipCb.checked) {
      soundCb.checked = false;
      soundCb.disabled = true;
      if (wrapper) {
        wrapper.classList.add("disabled-sound");
      }
      chrome.storage.local.set({ [soundCb.id]: false });
    } else {
      soundCb.disabled = false;
      soundCb.checked = true;
      if (wrapper) {
        wrapper.classList.remove("disabled-sound");
      }
      chrome.storage.local.set({ [soundCb.id]: true });
    }
  };

  // Инициализация состояния чекбоксов
  chrome.storage.local.get(null, (data) => {
    // 1. Инициализируем чекбоксы автоподтверждения и автопропуска
    const autoCheckboxes = document.querySelectorAll("input[type='checkbox'][id^='data-alert_type-']");
    autoCheckboxes.forEach((checkbox) => {
      if (data.hasOwnProperty(checkbox.id)) {
        checkbox.checked = data[checkbox.id];
      }
      if (checkbox.id.includes("all")) {
        checkbox.addEventListener("change", handleAllCheckboxChange);
      } else {
        checkbox.addEventListener("change", handleCheckboxChange);
      }
    });

    // 2. Инициализируем звуковые чекбоксы (по умолчанию true)
    soundCheckboxes.forEach((cb) => {
      if (data.hasOwnProperty(cb.id)) {
        cb.checked = data[cb.id];
      } else {
        cb.checked = true; // По умолчанию включено
        chrome.storage.local.set({ [cb.id]: true });
      }
      if (cb.id.includes("all")) {
        cb.addEventListener("change", handleSoundAllCheckboxChange);
      } else {
        cb.addEventListener("change", handleSoundCheckboxChange);
      }
    });

    // 3. Инициализируем чекбокс дополнительных настроек (по умолчанию false)
    const openLinksCb = document.getElementById("open-links-new-window");
    if (data.hasOwnProperty("openLinksInNewWindow")) {
      openLinksCb.checked = data.openLinksInNewWindow;
    } else {
      openLinksCb.checked = false;
      chrome.storage.local.set({ openLinksInNewWindow: false });
    }
    openLinksCb.addEventListener("change", (e) => {
      chrome.storage.local.set({ openLinksInNewWindow: e.target.checked });
    });

    // 4. Инициализируем чекбокс включения превью YouTube (по умолчанию true)
    const ytPreviewsCb = document.getElementById("enable-youtube-previews");
    if (data.hasOwnProperty("enableYoutubePreviews")) {
      ytPreviewsCb.checked = data.enableYoutubePreviews;
    } else {
      ytPreviewsCb.checked = true;
      chrome.storage.local.set({ enableYoutubePreviews: true });
    }
    ytPreviewsCb.addEventListener("change", (e) => {
      chrome.storage.local.set({ enableYoutubePreviews: e.target.checked });
    });

    // 5. Синхронизируем состояние звуков с автопропуском при инициализации
    const categories = ["all", "1", "6", "13", "17", "19"];
    categories.forEach(id => syncSoundWithSkipInit(id));
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

  // Функция для миграции старых ссылок на GitHub на новые локальные пути звуков
  const migrateSoundUrl = (url) => {
    if (!url) return "sounds/doorbell.mp3";
    if (url.startsWith("https://raw.githubusercontent.com/")) {
      const filename = url.substring(url.lastIndexOf("/") + 1);
      return `sounds/${filename}`;
    }
    return url;
  };

  // Логика для кастомного селекта выбора звука
  const customContainer = document.querySelector(".custom-select-container");
  const customTrigger = document.getElementById("custom-sound-select-trigger");
  const customOptionsContainer = document.getElementById("custom-sound-select-options");
  const customOptions = document.querySelectorAll(".custom-select-option");
  const customText = customContainer.querySelector(".custom-select-text");

  // Открыть/закрыть список по клику
  customTrigger.addEventListener("click", (e) => {
    e.stopPropagation();
    customContainer.classList.toggle("open");
  });

  // Клик вне селекта закрывает его
  document.addEventListener("click", () => {
    customContainer.classList.remove("open");
  });

  // Синхронизация кастомного селекта с нативным
  const syncCustomSelect = () => {
    const currentVal = soundSelect.value;
    const selectedOpt = Array.from(customOptions).find(opt => opt.getAttribute("data-value") === currentVal);
    if (selectedOpt) {
      customText.textContent = selectedOpt.textContent;
      customOptions.forEach(o => o.classList.remove("selected"));
      selectedOpt.classList.add("selected");
    }
  };

  // Выбор опции в кастомном меню
  customOptions.forEach(opt => {
    opt.addEventListener("click", (e) => {
      e.stopPropagation();
      const val = opt.getAttribute("data-value");
      const text = opt.textContent;

      // Обновляем текст в триггере
      customText.textContent = text;
      customContainer.classList.remove("open");

      // Обновляем выделение класса
      customOptions.forEach(o => o.classList.remove("selected"));
      opt.classList.add("selected");

      // Обновляем нативный скрытый селект и триггерим событие
      soundSelect.value = val;
      soundSelect.dispatchEvent(new Event("change"));
    });
  });

  // Загрузка сохраненных настроек
  const loadSoundSettings = () => {
    chrome.storage.local.get(["selectedSound", "volume"], (data) => {
      if (data.selectedSound) {
        const migratedSound = migrateSoundUrl(data.selectedSound);
        // Если звук мигрировал, перезаписываем в storage
        if (migratedSound !== data.selectedSound) {
          chrome.storage.local.set({ selectedSound: migratedSound });
        }
        soundSelect.value = migratedSound;
      } else {
        // Если звука нет вовсе, ставим doorbell
        soundSelect.value = "sounds/doorbell.mp3";
      }
      if (data.volume) {
        volumeRange.value = data.volume;
        volumeInput.value = data.volume;
      }
      // Синхронизируем кастомный селект после загрузки значения
      syncCustomSelect();
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
    // Если это локальный звук (относительный путь), получаем его полный URL через runtime.getURL
    const soundUrl = selectedSound.startsWith("http") ? selectedSound : chrome.runtime.getURL(selectedSound);
    const audio = new Audio(soundUrl);
    audio.volume = volume;
    audio.play().catch((error) => console.error("Ошибка воспроизведения звука:", error));
  });

  // Инициализация настроек
  loadSoundSettings();
});
