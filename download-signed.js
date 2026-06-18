// download-signed.js
const crypto = require('crypto');
const https = require('https');
const fs = require('fs');

const version = process.argv[2];
const destPath = process.argv[3] || 'DAModerator-firefox.xpi';

const issuer = process.env.AMO_JWT_ISSUER;
const secret = process.env.AMO_JWT_SECRET;
const addonId = "{876fc4ab-d8ad-4efa-bda7-86d463538ee3}";

if (!version) {
    console.error('❌ Ошибка: не указана версия для скачивания.');
    process.exit(1);
}

if (!issuer || !secret) {
    console.error('❌ Ошибка: не заданы переменные окружения AMO_JWT_ISSUER и AMO_JWT_SECRET.');
    process.exit(1);
}

// Генерация JWT токена для авторизации в AMO API
function generateJWT(issuer, secret) {
    const header = {
        typ: 'JWT',
        alg: 'HS256'
    };
    const payload = {
        iss: issuer,
        jti: crypto.randomBytes(16).toString('hex'),
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 300 // 5 минут
    };

    const base64UrlEncode = (obj) => {
        return Buffer.from(JSON.stringify(obj))
            .toString('base64')
            .replace(/=/g, '')
            .replace(/\+/g, '-')
            .replace(/\//g, '_');
    };

    const headerB64 = base64UrlEncode(header);
    const payloadB64 = base64UrlEncode(payload);

    const signature = crypto
        .createHmac('sha256', secret)
        .update(`${headerB64}.${payloadB64}`)
        .digest('base64')
        .replace(/=/g, '')
        .replace(/\+/g, '-')
        .replace(/\//g, '_');

    return `${headerB64}.${payloadB64}.${signature}`;
}

function fetchUrl(url, headers) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            let data = '';
            if (res.statusCode === 301 || res.statusCode === 302) {
                fetchUrl(res.headers.location, headers).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return reject(new Error(`Status Code: ${res.statusCode}`));
            }
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function downloadFile(url, dest, headers) {
    return new Promise((resolve, reject) => {
        https.get(url, { headers }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                downloadFile(res.headers.location, dest, headers).then(resolve).catch(reject);
                return;
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`Status Code: ${res.statusCode}`));
            }
            const fileStream = fs.createWriteStream(dest);
            res.pipe(fileStream);
            fileStream.on('finish', () => {
                fileStream.close();
                resolve();
            });
        }).on('error', reject);
    });
}

async function run() {
    try {
        console.log(`🔑 Генерация токена доступа для AMO API...`);
        const token = generateJWT(issuer, secret);
        const headers = {
            'Authorization': `JWT ${token}`,
            'User-Agent': 'DA-Moderator-Builder/1.0'
        };

        const apiUrl = `https://addons.mozilla.org/api/v5/addons/addon/${encodeURIComponent(addonId)}/versions/?filter=all_with_unlisted`;
        console.log(`🌐 Запрос списка версий аддона...`);
        
        const responseData = await fetchUrl(apiUrl, headers);
        const json = JSON.parse(responseData);

        if (!json.results || json.results.length === 0) {
            throw new Error('Не найдено ни одной версии дополнения.');
        }

        // Ищем нужную версию
        const foundVersion = json.results.find(v => v.version === version);
        if (!foundVersion) {
            throw new Error(`Версия ${version} не найдена в панели разработчика Mozilla AMO.`);
        }

        if (!foundVersion.file || !foundVersion.file.url) {
            throw new Error(`Для версии ${version} отсутствует файл для скачивания (возможно, она еще на проверке).`);
        }

        const downloadUrl = foundVersion.file.url;
        console.log(`📥 Версия ${version} найдена. Скачивание подписанного файла...`);
        
        await downloadFile(downloadUrl, destPath, headers);
        console.log(`✅ Файл успешно скачан и сохранен в ${destPath}`);
    } catch (error) {
        console.error('❌ Ошибка при скачивании подписанной версии:', error.message);
        process.exit(1);
    }
}

run();
