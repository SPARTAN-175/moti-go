const CACHE_NAME = "moti-go-v2";

const FILES_TO_CACHE = [

    // ==========================================
    // MOTI GO
    // ==========================================

    "./",
    "./index.html",
    "./manifest.json",

    "./assets/branding/moti-go-logo.png",
    "./assets/branding/icon-192.png",
    "./assets/branding/icon-512.png",
    "./assets/branding/favicon.png",
    "./assets/branding/apple-touch-icon.png",


    // ==========================================
    // 🎮 MOTI OFFLINE
    // ==========================================

    "./moti_offline/index.html",

    "./moti_offline/css/game.css",

    "./moti_offline/js/audio.js",
    "./moti_offline/js/game.js",
    "./moti_offline/js/missions.js",
    "./moti_offline/js/pedestrians.js",
    "./moti_offline/js/player.js",
    "./moti_offline/js/traffic.js",
    "./moti_offline/js/ui.js",
    "./moti_offline/js/world.js"

];


// ==========================================
// INSTALACIÓN
// ==========================================

self.addEventListener(
    "install",
    (event) => {

        event.waitUntil(

            caches
                .open(CACHE_NAME)
                .then(
                    (cache) => {

                        console.log(
                            "🎮 MOTI GO: preparando archivos offline..."
                        );

                        return cache.addAll(
                            FILES_TO_CACHE
                        );

                    }
                )

        );

        self.skipWaiting();

    }
);


// ==========================================
// ACTIVACIÓN
// ==========================================

self.addEventListener(
    "activate",
    (event) => {

        event.waitUntil(

            caches
                .keys()
                .then(
                    (cacheNames) => {

                        return Promise.all(

                            cacheNames
                                .filter(
                                    (cacheName) =>
                                        cacheName !==
                                        CACHE_NAME
                                )
                                .map(
                                    (cacheName) =>
                                        caches.delete(
                                            cacheName
                                        )
                                )

                        );

                    }
                )

        );

        self.clients.claim();

    }
);


// ==========================================
// PETICIONES
// ==========================================

self.addEventListener(
    "fetch",
    (event) => {

        event.respondWith(

            caches
                .match(
                    event.request
                )
                .then(
                    (response) => {

                        if (response) {

                            return response;

                        }

                        return fetch(
                            event.request
                        );

                    }
                )

        );

    }
);
