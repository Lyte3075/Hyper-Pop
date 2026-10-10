// Scramjet STATIC — Service Worker
// Engine: Scramjet v1.1.0 (MercuryWorkshop)
// Transport: libcurl over wss://anura.pro/wisp/

importScripts('./scramjet-engine/scramjet-all.js')

const { ScramjetServiceWorker } = $scramjetLoadWorker()
const scramjet = new ScramjetServiceWorker()

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

async function handleRequest(event) {
  await scramjet.loadConfig()
  if (!scramjet.route(event)) return fetch(event.request)
  return scramjet.fetch(event)
}

self.addEventListener('fetch', (event) => {
  if (new URL(event.request.url).origin !== self.location.origin) return
  event.respondWith(handleRequest(event))
})
