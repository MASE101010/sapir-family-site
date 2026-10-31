/* Service Worker של משפחת ספיר: קבצי האתר נשמרים במכשיר, דפים נטענים מהרשת עם גיבוי מהמטמון.
   העלאת הגרסה כאן מנקה מטמונים ישנים. */
const VERSION = "sapir-v3";
const ASSETS = ["/assets/css/style.css", "/assets/js/config.js", "/assets/js/site.js", "/assets/js/library.js", "/assets/fonts/SapirPop.ttf", "/assets/img/logo-small.png", "/assets/img/logo.webp"];
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS).catch(() => {}))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) {
    // תמונות של יוטיוב: מהמטמון אם יש, אחרת מהרשת ושמירה
    if (url.hostname === "i.ytimg.com") e.respondWith(caches.open("ytimg").then(async c => { const hit = await c.match(req); if (hit) return hit; const r = await fetch(req); if (r.ok) c.put(req, r.clone()); return r; }).catch(() => fetch(req)));
    return;
  }
  if (url.pathname.startsWith("/api/")) return; // תמיד מהרשת
  const isPage = req.mode === "navigate" || url.pathname.endsWith(".html") || url.pathname === "/";
  if (isPage || url.pathname.startsWith("/data/")) {
    // דפים ונתונים: רשת קודם, גיבוי מהמטמון (עובד גם בלי אינטרנט)
    e.respondWith(fetch(req).then(r => { if (r.ok) caches.open(VERSION).then(c => c.put(req, r.clone())); return r; }).catch(() => caches.match(req).then(h => h || caches.match("/index.html"))));
    return;
  }
  // נכסים (CSS, JS, גופנים, תמונות): מהמטמון מיד, ורענון ברקע
  e.respondWith(caches.open(VERSION).then(async c => {
    const hit = await c.match(req);
    const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
