/*
 * Service Worker плеера: держит оболочку и медиа в кэше, чтобы экран продолжал работать без интернета.
 * Написан на ES2015 без async/await — его выполняют и старые WebView (Chromium 53).
 */
var SHELL_CACHE = 'dm-shell-v1';
var MEDIA_CACHE = 'dm-media-v1';

self.addEventListener('install', function (event) {
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE).then(function (cache) {
      return cache.addAll(['./']);
    }),
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(self.clients.claim());
});

function isMedia(request, url) {
  return request.destination === 'image' || request.destination === 'video' || url.pathname.indexOf('/media/') === 0;
}

/** Видео запрашивается по Range: отдаём нужный кусок из целого файла в кэше. */
function rangeResponse(request, response) {
  var range = request.headers.get('range');
  if (!range) return response;
  return response.blob().then(function (blob) {
    var m = /bytes=(\d*)-(\d*)/.exec(range);
    var size = blob.size;
    var start = m && m[1] ? parseInt(m[1], 10) : 0;
    var end = m && m[2] ? parseInt(m[2], 10) : size - 1;
    if (start >= size) {
      return new Response('', { status: 416, headers: { 'Content-Range': 'bytes */' + size } });
    }
    end = Math.min(end, size - 1);
    return new Response(blob.slice(start, end + 1), {
      status: 206,
      statusText: 'Partial Content',
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/octet-stream',
        'Content-Range': 'bytes ' + start + '-' + end + '/' + size,
        'Content-Length': String(end - start + 1),
        'Accept-Ranges': 'bytes',
      },
    });
  });
}

function fromMedia(request) {
  return caches.open(MEDIA_CACHE).then(function (cache) {
    return cache.match(request.url).then(function (hit) {
      if (hit) return rangeResponse(request, hit);
      return fetch(request);
    });
  });
}

function networkFirst(request, cacheKey) {
  return caches.open(SHELL_CACHE).then(function (cache) {
    return fetch(request)
      .then(function (response) {
        if (response.ok) cache.put(cacheKey || request, response.clone());
        return response;
      })
      .catch(function () {
        return cache.match(cacheKey || request).then(function (hit) {
          return hit || Response.error();
        });
      });
  });
}

function cacheFirst(request) {
  return caches.open(SHELL_CACHE).then(function (cache) {
    return cache.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (response) {
        if (response.ok) cache.put(request, response.clone());
        return response;
      });
    });
  });
}

self.addEventListener('fetch', function (event) {
  var request = event.request;
  if (request.method !== 'GET') return;
  var url = new URL(request.url);
  if (url.origin === self.location.origin && url.pathname.indexOf('/api/') === 0) return;
  if (isMedia(request, url)) {
    event.respondWith(fromMedia(request));
    return;
  }
  if (url.origin !== self.location.origin) return;
  var scope = new URL(self.registration.scope).pathname;
  if (request.mode === 'navigate' || url.pathname === scope || url.pathname === scope + 'index.html') {
    event.respondWith(networkFirst(request, './'));
    return;
  }
  if (url.pathname.indexOf(scope) === 0) {
    event.respondWith(url.pathname.indexOf(scope + 'assets/') === 0 ? cacheFirst(request) : networkFirst(request));
  }
});

/** Плеер присылает список всех файлов манифеста: докачиваем новые, удаляем ненужные. */
function precache(urls) {
  var wanted = {};
  urls.forEach(function (u) {
    wanted[new URL(u, self.location.origin).href] = true;
  });
  return caches.open(MEDIA_CACHE).then(function (cache) {
    return cache.keys().then(function (keys) {
      var cached = {};
      var removals = keys.map(function (req) {
        cached[req.url] = true;
        return wanted[req.url] ? null : cache.delete(req);
      });
      var missing = Object.keys(wanted).filter(function (u) {
        return !cached[u];
      });
      var failed = 0;
      // По одному файлу: на слабой приставке параллельная загрузка видео мешает воспроизведению.
      var chain = Promise.resolve();
      missing.forEach(function (u) {
        chain = chain.then(function () {
          return fetch(u, { mode: 'cors', credentials: 'omit' })
            .then(function (response) {
              if (response.status === 200) return cache.put(u, response);
              failed++;
            })
            .catch(function () {
              failed++;
            });
        });
      });
      return Promise.all(removals)
        .then(function () {
          return chain;
        })
        .then(function () {
          return { total: Object.keys(wanted).length, downloaded: missing.length - failed, failed: failed };
        });
    });
  });
}

function precacheShell(urls) {
  return caches.open(SHELL_CACHE).then(function (cache) {
    return Promise.all(
      urls.map(function (u) {
        return cache.match(u).then(function (hit) {
          return hit || cache.add(u).catch(function () {});
        });
      }),
    );
  });
}

self.addEventListener('message', function (event) {
  var data = event.data || {};
  if (data.type === 'precache-shell') {
    event.waitUntil(precacheShell(data.urls || []));
    return;
  }
  if (data.type !== 'precache') return;
  var port = event.ports && event.ports[0];
  event.waitUntil(
    precache(data.urls || []).then(function (result) {
      if (port) port.postMessage(result);
    }),
  );
});
