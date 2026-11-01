/* Service worker : rend l'application installable et lisible hors connexion. */
const VERSION = 'dn-v1';
const SHELL = [
  './',
  'index.html',
  'styles.css',
  'app.js',
  'glossary.js',
  'manifest.webmanifest',
  'icons/favicon.svg',
  'icons/icon-192.png',
  'icons/icon-512.png',
];
const DATA_KEY = 'data/news.json';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION && k !== 'dn-fonts').map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Les actus : toujours le réseau d'abord, la dernière copie si hors ligne.
  if (url.origin === location.origin && url.pathname.endsWith('/' + DATA_KEY)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(new URL(DATA_KEY, self.registration.scope).href, copy));
          }
          return res;
        })
        .catch(() => caches.match(new URL(DATA_KEY, self.registration.scope).href))
    );
    return;
  }

  // Polices Google : gardées en cache une fois chargées.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open('dn-fonts').then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { c.put(req, res.clone()); return res; })))
    );
    return;
  }

  // Fichiers de l'appli : réponse immédiate depuis le cache, mise à jour en arrière-plan.
  if (url.origin === location.origin) {
    event.respondWith(
      caches.open(VERSION).then((c) =>
        c.match(req, { ignoreSearch: true }).then((hit) => {
          const net = fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; }).catch(() => hit);
          return hit || net;
        })
      )
    );
  }
});
