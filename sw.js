/**
 * Service Worker para Truco Uruguayo (PWA)
 * Versión 2.7.0
 * Soporte Offline, Caché de Cartas, Sonidos y Motor de Juego.
 */

const CACHE_NAME = 'truco-uy-v2.7.0';

const PRECACHE_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/css/style.css',
    '/js/soundmanager.js',
    '/js/uimanager.js',
    '/js/gamestatemanager.js',
    '/js/firebasemanager.js',
    '/js/app.js',
    '/assets/icons/favicon-64.png',
    '/assets/icons/icon-192.png',
    '/assets/icons/icon-512.png',
    '/assets/thumb.jpg',
    '/assets/cards_tatu/carta_reverso.png',
    '/assets/audio_voices/truco.mp3',
    '/assets/audio_voices/retruco.mp3',
    '/assets/audio_voices/vale_4.mp3',
    '/assets/audio_voices/envido.mp3',
    '/assets/audio_voices/real_envido.mp3',
    '/assets/audio_voices/falta_envido.mp3',
    '/assets/audio_voices/flor.mp3',
    '/assets/audio_voices/contra_flor.mp3',
    '/assets/audio_voices/contra_flor_al_resto.mp3',
    '/assets/audio_voices/con_flor_me_achico.mp3',
    '/assets/audio_voices/quiero.mp3',
    '/assets/audio_voices/no_quiero.mp3',
    '/assets/audio_voices/son_buenas.mp3',
    '/assets/audio_voices/me_voy_al_mazo.mp3'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_ASSETS).catch((err) => {
                console.warn('[SW] Algunos recursos no pudieron precachearse:', err);
            });
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // No interceptar peticiones de Firebase en tiempo real ni llamadas no-GET
    if (request.method !== 'GET' || url.hostname.includes('firebaseio.com') || url.hostname.includes('googleapis.com')) {
        return;
    }

    // Navegación (HTML): Network-first con fallback a caché para soporte offline
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request).catch(() => {
                return caches.match('/index.html') || caches.match('/');
            })
        );
        return;
    }

    // Recursos estáticos locales (imágenes de cartas, audios, estilos, scripts): Cache-first
    if (url.origin === self.location.origin) {
        event.respondWith(
            caches.match(request).then((cachedResponse) => {
                if (cachedResponse) {
                    return cachedResponse;
                }
                return fetch(request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                }).catch(() => {
                    // Fallback para imágenes si fallan offline
                    if (request.destination === 'image') {
                        return caches.match('/assets/cards_tatu/carta_reverso.png');
                    }
                });
            })
        );
        return;
    }

    // CDN u otros recursos de terceros: Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
