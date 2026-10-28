const CACHE_NAME = 'tukutoon-a-pintar-v3';
const APP_SHELL = [
  './',
  './index.html',
  './paginas.js',
  './js/script.js',
  './css/style.css',
  './fondo-menu.png',
  './fondo-mesa.png',
  './fondo-dibujo.svg',
  './fondo-dibujo.png',
  './hoja-dibujo.png',
  './logo-tukutoon-horizontal.png',
  './motor/motor.js',
  './motor/motor.css',
  './iconos/borrador.png',
  './iconos/balde.png',
  './iconos/descargar.png',
  './iconos/especial.png',
  './iconos/lapiz.png',
  './iconos/pincel.png',
  './iconos/reiniciar.png',
  './iconos/salir.png',
  './paginas/aida/colorea-tukutoon-aida.html',
  './paginas/aida/aida.png',
  './paginas/ana/colorea-tukutoon-ana.html',
  './paginas/ana/ana.png',
  './paginas/gabo/colorea-tukutoon-gabo.html',
  './paginas/gabo/gabo.png',
  './paginas/tico/colorea-tukutoon-tico.html',
  './paginas/tico/tico.png',
  './paginas/tuku/colorea-tukutoon-tuku.html',
  './paginas/tuku/tuku.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key.startsWith('tukutoon-a-pintar-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (!response.ok) return response;
          return caches.open(CACHE_NAME)
            .then((cache) => cache.put(request, response.clone()))
            .then(() => response);
        })
        .catch(async () => {
          const cached = await caches.match(request, { ignoreSearch: true });
          return cached || caches.match(new URL('./index.html', self.registration.scope).href);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (!response.ok) return response;
        return caches.open(CACHE_NAME)
          .then((cache) => cache.put(request, response.clone()))
          .then(() => response);
      });
    })
  );
});
