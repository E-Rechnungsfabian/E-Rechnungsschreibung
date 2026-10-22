const V = 'rechnungen-v5';
const CORE = ['./', './index.html', './config.js', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png',
  './pdf-lib.min.js', './fontkit.umd.min.js', './impressum.html', './datenschutz.html', './hilfe.html'];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.allSettled(CORE.map(u => c.add(u)));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== V) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  const same = u.origin === location.origin;
  // Fremde Adressen (z. B. die Cloud) nie abfangen oder zwischenspeichern; nur Ausweich-CDNs fuer die Bibliotheken
  if (!same && !/^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net)$/.test(u.hostname)) return;
  // Seiten und Einstellungen: erst Netz (damit Updates ankommen), offline aus dem Cache
  if (r.mode === 'navigate' || (same && /\/(index\.html|config\.js)$/.test(u.pathname))) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return res;
      }).catch(() => caches.match(r, { ignoreSearch: true }).then(m => m || caches.match('./index.html')))
    );
    return;
  }
  // Alles andere: erst Cache, sonst Netz und dabei zwischenspeichern
  e.respondWith(
    caches.match(r).then(m => m || fetch(r).then(res => {
      if (res && (res.ok || res.type === 'opaque')) { const cp = res.clone(); caches.open(V).then(c => c.put(r, cp)); }
      return res;
    }))
  );
});
