const CACHE_NAME = "moti-go-v1";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./manifest.json",
    "./assets/branding/moti-go-logo.png",
    "./assets/branding/icon-192.png",
    "./assets/branding/icon-512.png",
    "./assets/branding/favicon.png",
    "./assets/branding/apple-touch-icon.png"
];


// ================================
// INSTALACIÓN
// ================================

self.addEventListener("install", (event) => {

    event.waitUntil(

        caches.open(CACHE_NAME)

            .then((cache) => {

                return cache.addAll(
                    FILES_TO_CACHE
                );

            })

    );

    self.skipWaiting();

});


// ================================
// ACTIVACIÓN
// ================================

self.addEventListener("activate", (event) => {

    event.waitUntil(

        caches.keys()

            .then((cacheNames) => {

                return Promise.all(

                    cacheNames

                        .filter(
                            (cacheName) =>
                                cacheName !== CACHE_NAME
                        )

                        .map(
                            (cacheName) =>
                                caches.delete(cacheName)
                        )

                );

            })

    );

    self.clients.claim();

});


// ================================
// PETICIONES
// ================================

self.addEventListener("fetch", (event) => {

    event.respondWith(

        caches.match(event.request)

            .then((response) => {

                if (response) {

                    return response;

                }

                return fetch(event.request);

            })

    );

});
