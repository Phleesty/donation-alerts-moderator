// build.js
const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(__dirname, 'dist');
const SRC_DIR = path.join(__dirname, 'src');
const MANIFESTS_DIR = path.join(__dirname, 'manifests');

// Функция рекурсивного удаления директории
function cleanDirectory(dirPath) {
    if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach((file) => {
            const curPath = path.join(dirPath, file);
            if (fs.lstatSync(curPath).isDirectory()) {
                cleanDirectory(curPath);
            } else {
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(dirPath);
    }
}

// Функция рекурсивного копирования
function copyDirectory(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDirectory(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

function build() {
    console.log('🧹 Очистка папки dist...');
    cleanDirectory(DIST_DIR);

    console.log('📂 Создание структуры папок...');
    fs.mkdirSync(path.join(DIST_DIR, 'chrome'), { recursive: true });
    fs.mkdirSync(path.join(DIST_DIR, 'firefox'), { recursive: true });

    console.log('📦 Копирование исходников (src) в dist/chrome...');
    copyDirectory(SRC_DIR, path.join(DIST_DIR, 'chrome'));

    console.log('📦 Копирование исходников (src) в dist/firefox...');
    copyDirectory(SRC_DIR, path.join(DIST_DIR, 'firefox'));

    console.log('📝 Подстановка манифеста для Chrome...');
    fs.copyFileSync(
        path.join(MANIFESTS_DIR, 'manifest.chrome.json'),
        path.join(DIST_DIR, 'chrome', 'manifest.json')
    );

    console.log('📝 Подстановка манифеста для Firefox...');
    fs.copyFileSync(
        path.join(MANIFESTS_DIR, 'manifest.firefox.json'),
        path.join(DIST_DIR, 'firefox', 'manifest.json')
    );

    console.log('🔧 Настройка popup.html для Chrome...');
    const chromePopupPath = path.join(DIST_DIR, 'chrome', 'popup.html');
    let chromePopupHtml = fs.readFileSync(chromePopupPath, 'utf8');
    chromePopupHtml = chromePopupHtml
        .replace('{{AHK_LINK}}', 'https://github.com/phleesty/donation-alerts-moderator/releases/latest/download/DAModerator.ahk')
        .replace('{{EXE_LINK}}', 'https://github.com/phleesty/donation-alerts-moderator/releases/latest/download/DAModerator.exe');
    fs.writeFileSync(chromePopupPath, chromePopupHtml, 'utf8');

    console.log('🔧 Настройка popup.css для Chrome...');
    const chromeCssPath = path.join(DIST_DIR, 'chrome', 'popup.css');
    let chromeCss = fs.readFileSync(chromeCssPath, 'utf8');
    chromeCss = chromeCss
        .replace('{{BODY_WIDTH}}', '450px')
        .replace('{{BODY_STYLE_EXTRA}}', '')
        .replace('{{FIREFOX_ONLY_STYLE}}', '')
        .replace('{{H2_STYLE}}', ''); // В Chrome H2 по умолчанию отображается корректно
    fs.writeFileSync(chromeCssPath, chromeCss, 'utf8');

    console.log('🔧 Настройка popup.html для Firefox...');
    const firefoxPopupPath = path.join(DIST_DIR, 'firefox', 'popup.html');
    let firefoxPopupHtml = fs.readFileSync(firefoxPopupPath, 'utf8');
    firefoxPopupHtml = firefoxPopupHtml
        .replace('{{AHK_LINK}}', 'https://github.com/phleesty/donation-alerts-moderator/releases/latest/download/DAModerator.ahk')
        .replace('{{EXE_LINK}}', 'https://github.com/phleesty/donation-alerts-moderator/releases/latest/download/DAModerator.exe');
    fs.writeFileSync(firefoxPopupPath, firefoxPopupHtml, 'utf8');

    console.log('🔧 Настройка popup.css для Firefox...');
    const firefoxCssPath = path.join(DIST_DIR, 'firefox', 'popup.css');
    let firefoxCss = fs.readFileSync(firefoxCssPath, 'utf8');
    firefoxCss = firefoxCss
        .replace('{{BODY_WIDTH}}', '460px')
        .replace('{{BODY_STYLE_EXTRA}}', 'height: 540px; overflow-y: auto;')
        .replace('{{FIREFOX_ONLY_STYLE}}', 'body::after { content: ""; display: block; height: 20px; width: 100%; }')
        .replace('{{H2_STYLE}}', 'h2 { all: unset; font-size: 18px; font-weight: 600; line-height: 1; }');
    fs.writeFileSync(firefoxCssPath, firefoxCss, 'utf8');

    console.log('✨ Сборка успешно завершена!');
}

try {
    build();
} catch (err) {
    console.error('❌ Ошибка сборки:', err);
    process.exit(1);
}
