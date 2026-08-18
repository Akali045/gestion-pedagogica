// ===== Service Worker para Gestión Pedagógica (PWA Offline) =====

const CACHE_NAME = 'gestion-pedagogica-v1.0.1';

const STATIC_ASSETS = [
    './',
    './Index.html',
    './manifest.json',
    './css/base.css',
    './css/layout.css',
    './css/components.css',
    './css/modules.css',
    './lib/d3.min.js',
    './lib/html2pdf.bundle.min.js',
    './js/crypto.js',
    './js/data.js',
    './js/auth.js',
    './js/groups.js',
    './js/students.js',
    './js/observations.js',
    './js/sociogram.js',
    './js/teams.js',
    './js/trash.js',
    './js/ui.js',
    './icons/icon.svg',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Instalación: Pre-cachear todos los activos estáticos de la app
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[Service Worker] Pre-cacheando recursos para funcionamiento offline...');
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activación: Limpiar versiones antiguas de caché
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cache) => {
                    if (cache !== CACHE_NAME) {
                        console.log('[Service Worker] Eliminando caché obsoleta:', cache);
                        return caches.delete(cache);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Estrategia Stale-While-Revalidate / Cache-First para velocidad instantánea y soporte offline
self.addEventListener('fetch', (event) => {
    // Solo interceptar peticiones HTTP/HTTPS GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Servir desde caché y actualizar en segundo plano si hay red
                fetch(event.request).then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(event.request, networkResponse.clone());
                        });
                    }
                }).catch(() => {
                    // Sin conexión: la respuesta en caché ya está sirviendo la app
                });

                return cachedResponse;
            }

            // Si no estaba en caché, buscar en la red y guardar en caché
            return fetch(event.request).then((networkResponse) => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            }).catch(() => {
                // Si la navegación falla y no hay red, servir Index.html
                if (event.request.mode === 'navigate') {
                    return caches.match('./Index.html');
                }
            });
        })
    );
});
