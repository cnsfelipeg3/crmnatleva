function isNatLevaAppCache(name) {
  return /(^|-)precache-v\d+-|(^|-)runtime-|html-cache|app-assets-cache|supabase-api-cache|supabase-storage-cache|google-fonts-cache|workbox/i.test(name);
}

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) =>
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        const appCaches = cacheNames.filter(isNatLevaAppCache);
        await Promise.allSettled(appCaches.map((name) => caches.delete(name)));
        await self.clients.claim();
        const clients = await self.clients.matchAll({ type: "window" });
        await Promise.allSettled(clients.map((client) => client.navigate(client.url)));
      } finally {
        await self.registration.unregister();
      }
    })(),
  ),
);