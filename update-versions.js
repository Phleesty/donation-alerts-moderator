// update-versions.js
const fs = require('fs');
const path = require('path');

const version = process.argv[2];
if (!version) {
    console.error('❌ Ошибка: не указана версия для обновления.');
    process.exit(1);
}

const MANIFEST_CHROME = path.join(__dirname, 'manifests', 'manifest.chrome.json');
const MANIFEST_FIREFOX = path.join(__dirname, 'manifests', 'manifest.firefox.json');
const UPDATES_JSON = path.join(__dirname, 'updates.json');

// 1. Обновляем manifest.chrome.json
if (fs.existsSync(MANIFEST_CHROME)) {
    const data = JSON.parse(fs.readFileSync(MANIFEST_CHROME, 'utf8'));
    data.version = version;
    fs.writeFileSync(MANIFEST_CHROME, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ Версия в manifest.chrome.json обновлена до ${version}`);
} else {
    console.error(`❌ Ошибка: Файл не найден: ${MANIFEST_CHROME}`);
}

// 2. Обновляем manifest.firefox.json
if (fs.existsSync(MANIFEST_FIREFOX)) {
    const data = JSON.parse(fs.readFileSync(MANIFEST_FIREFOX, 'utf8'));
    data.version = version;
    fs.writeFileSync(MANIFEST_FIREFOX, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ Версия в manifest.firefox.json обновлена до ${version}`);
} else {
    console.error(`❌ Ошибка: Файл не найден: ${MANIFEST_FIREFOX}`);
}

// 3. Обновляем updates.json
if (fs.existsSync(UPDATES_JSON)) {
    const data = JSON.parse(fs.readFileSync(UPDATES_JSON, 'utf8'));
    const addonId = "{876fc4ab-d8ad-4efa-bda7-86d463538ee3}";
    
    if (data.addons && data.addons[addonId]) {
        const updates = data.addons[addonId].updates || [];
        
        // Проверяем, существует ли уже такая версия в updates
        const existingUpdateIndex = updates.findIndex(u => u.version === version);
        
        const newUpdateEntry = {
            version: version,
            update_link: "https://github.com/phleesty/donation-alerts-moderator/releases/latest/download/DAModerator-firefox.xpi"
        };
        
        if (existingUpdateIndex !== -1) {
            updates[existingUpdateIndex] = newUpdateEntry;
            console.log(`📌 Обновлена существующая запись версии ${version} в updates.json`);
        } else {
            updates.push(newUpdateEntry);
            console.log(`📌 Добавлена новая запись версии ${version} в updates.json`);
        }
        
        data.addons[addonId].updates = updates;
        fs.writeFileSync(UPDATES_JSON, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`✅ Файл updates.json успешно обновлен`);
    } else {
        console.warn(`⚠️ Не найден аддон с ID ${addonId} в updates.json`);
    }
} else {
    console.error(`❌ Ошибка: Файл не найден: ${UPDATES_JSON}`);
}
