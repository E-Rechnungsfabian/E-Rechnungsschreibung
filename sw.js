const V = 'rechnungen-v1';
const CORE = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const CDN = [
  'https://cdnjs.cloudflare.com/ajax/libs/pdf-lib/1.17.1/pdf-lib.min.js',
  'https://cdn.jsdelivr.net/npm/@pdf-lib/fontkit@1.1.1/dist/fontkit.umd.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const c = await caches.open(V);
    await Promise.allSettled([
      ...CORE.map(u => c.add(u)),
      ...CDN.map(async u => { const r = await fetch(u, { mode: 'no-cors' }); await c.put(u, r); })
    ]);
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
  // Die App-Seite selbst: erst Netz (damit Updates ankommen), offline aus dem Cache
  if (r.mode === 'navigate' || (u.origin === location.origin && u.pathname.endsWith('/index.html'))) {
    e.respondWith(
      fetch(r).then(res => {
        if (res.ok) { const cp = res.clone(); caches.open(V).then(c => c.put('./index.html', cp)); }
        return res;
      }).catch(() => caches.match('./index.html').then(m => m || caches.match('./')))
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
