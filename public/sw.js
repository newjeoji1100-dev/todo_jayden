// 인터넷이 없어도 화면이 열리도록 파일을 폰에 저장해 두는 파일
var CACHE = 'jeju-checklist-v1';

// 설치할 때: 첫 화면과 그 화면이 쓰는 파일(css, js)을 저장한다
self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return fetch('/', { cache: 'reload' }).then(function (res) {
        var copy = res.clone();
        return res.text().then(function (html) {
          var urls = ['/'];
          var re = /(?:src|href)="([^"]+)"/g;
          var m;
          while ((m = re.exec(html))) {
            if (m[1].charAt(0) === '/' || !/^[a-z]+:/.test(m[1])) urls.push(m[1]);
          }
          return cache.put('/', copy).then(function () {
            return cache.addAll(urls.slice(1));
          });
        });
      });
    })
  );
  self.skipWaiting();
});

// 새 버전이 켜질 때: 옛 저장본을 지운다
self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// 파일을 불러올 때: 인터넷이 되면 최신 것을 받아 저장하고, 안 되면 저장해 둔 것을 쓴다
self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || (req.mode === 'navigate' ? caches.match('/') : undefined);
      });
    })
  );
});
