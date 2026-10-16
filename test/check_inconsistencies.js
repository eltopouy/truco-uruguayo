const fs = require('fs');
const path = require('path');

console.log('🔍 INICIANDO AUDITORÍA ESTÁTICA Y DE INTEGRIDAD DEL CÓDIGO...\n');

// 1. Verificar IDs en index.html
const indexHtml = fs.readFileSync('index.html', 'utf8');
const idRegex = /id=["']([^"']+)["']/g;
const ids = {};
let match;
while ((match = idRegex.exec(indexHtml)) !== null) {
    const id = match[1];
    ids[id] = (ids[id] || 0) + 1;
}

let duplicates = 0;
for (let id in ids) {
    if (ids[id] > 1) {
        console.warn(`⚠️ ID duplicado en index.html: "${id}" (aparece ${ids[id]} veces)`);
        duplicates++;
    }
}
if (duplicates === 0) {
    console.log(`✅ Cero IDs duplicados en index.html (${Object.keys(ids).length} IDs únicos).`);
}

// 2. Verificar que todos los document.getElementById en los archivos JS existan en index.html o se creen dinámicamente
const jsFiles = ['js/app.js', 'js/chatmanager.js', 'js/firebasemanager.js', 'js/gamestatemanager.js', 'js/soundmanager.js', 'js/uimanager.js'];
const dynamicCreatedIds = new Set([
    'lobby-espera', 'lobby-codigo', 'lobby-tipo', 'estado-rival', 'chat-remote-typing',
    'modal-game-context', 'info-text-extra', 'btn-info-extra', 'btn-info-context'
]);

let missingCount = 0;
jsFiles.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const getElemRegex = /getElementById\(['"]([^'"]+)['"]\)/g;
    let m;
    while ((m = getElemRegex.exec(content)) !== null) {
        const id = m[1];
        if (!ids[id] && !dynamicCreatedIds.has(id)) {
            console.warn(`⚠️ ID no encontrado en HTML: "${id}" referenciado en ${file}`);
            missingCount++;
        }
    }
});
if (missingCount === 0) {
    console.log('✅ Todos los getElementById referenciados en JS existen en index.html o son creados dinámicamente.');
}

// 3. Verificar referencias a audios y assets en js/ y css/
const assetFiles = [
    'assets/thumb.jpg',
    'assets/cards_tatu/carta_reverso.png',
    'assets/audio_voices/truco.mp3',
    'assets/audio_voices/retruco.mp3',
    'assets/audio_voices/vale_4.mp3',
    'assets/audio_voices/envido.mp3',
    'assets/audio_voices/real_envido.mp3',
    'assets/audio_voices/falta_envido.mp3',
    'assets/audio_voices/flor.mp3',
    'assets/audio_voices/contra_flor.mp3',
    'assets/audio_voices/contra_flor_al_resto.mp3',
    'assets/audio_voices/con_flor_me_achico.mp3',
    'assets/audio_voices/quiero.mp3',
    'assets/audio_voices/no_quiero.mp3',
    'assets/audio_voices/son_buenas.mp3',
    'assets/audio_voices/me_voy_al_mazo.mp3'
];

let missingAssets = 0;
assetFiles.forEach(asset => {
    if (!fs.existsSync(asset)) {
        console.error(`❌ Asset faltante en disco: ${asset}`);
        missingAssets++;
    }
});
if (missingAssets === 0) {
    console.log('✅ Todos los assets de audio y tarjetas clave existen en disco.');
}

console.log('\n🏁 Auditoría estática finalizada.');
