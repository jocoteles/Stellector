const staticDevCoffee = "hathorStellector-site-v1"
const assets = [
    "/",
    "/index.html",
    "/style.css",
    "/hathor.js",
    "/data/asterisms.js",
    "/data/cbounds.js",
    "/data/clines.js",
    "/data/constellations.js",
    "/data/dso.6.js",
    "/data/dsonames.js",
    "/data/messier.js",
    "/data/starnames.js",
    "/data/stars.6.js",
    "/libs/blas1.js",
    "/libs/nelderMead.js",
    "/libs/orb.v2.min.js",
    "/libs/three.min.js"
]

self.addEventListener("install", installEvent => {
    installEvent.waitUntil(
        caches.open(staticDevCoffee).then(cache => {
            cache.addAll(assets)
        })
    )
})

self.addEventListener("fetch", fetchEvent => {
    fetchEvent.respondWith(
        caches.match(fetchEvent.request).then(res => {
            return res || fetch(fetchEvent.request)
        })
    )
})