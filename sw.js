/* Service Worker של משפחת ספיר: קבצי האתר נשמרים במכשיר, דפים נטענים מהרשת עם גיבוי מהמטמון.
   העלאת הגרסה כאן מנקה מטמונים ישנים. */
const VERSION = "sapir-v15";
const ASSETS = ["/assets/css/style.css", "/assets/js/config.js", "/assets/js/site.js", "/assets/js/library.js", "/assets/fonts/SapirPop.ttf", "/assets/img/logo-small.png", "/assets/img/logo.webp"];
self.addEventListener("install", (e) => { self.skipWaiting(); e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS).catch(() => {}))); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== "ytimg").map(k => caches.delete(k)))).then(() => self.clients.claim())
  // גרסה חדשה: כל החלונות הפתוחים (גם אפליקציה מותקנת) נטענים מחדש פעם אחת כדי לא להישאר עם ממשק ישן
  .then(() => self.clients.matchAll({ type: "window" })).then(cs => cs.forEach(c => c.postMessage({ type: "sapir-reload", version: VERSION })))); });
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

/* התראות: הדחיפה מגיעה בלי תוכן; שולפים את הסרטון האחרון שהוכרז ומציגים הודעה */
self.addEventListener("push", (e) => {
  e.waitUntil((async () => {
    let v = {};
    try { v = await (await fetch("/api/push/latest", { cache: "no-store" })).json(); } catch (x) {}
    const title = v.title ? "סרטון חדש: " + v.title : "סרטון חדש של משפחת ספיר";
    await self.registration.showNotification(title, {
      body: v.channel ? `עלה עכשיו בערוץ ${v.channel}. לחצו לצפייה` : "עלה עכשיו. לחצו לצפייה",
      icon: "/assets/img/icon-192.png", badge: "/assets/img/icon-192.png", image: v.thumb || undefined,
      tag: "sapir-new-video", renotify: true, dir: "rtl", lang: "he",
      data: { url: v.url || (v.id ? `/vod.html?v=${v.id}` : "/") }
    });
  })());
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL((e.notification.data && e.notification.data.url) || "/", self.location.origin).href;
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => { for (const c of list) { if ("focus" in c) { c.navigate(url); return c.focus(); } } return clients.openWindow(url); }));
});
self.addEventListener("pushsubscriptionchange", (e) => {
  e.waitUntil((async () => { try { const key = (await (await fetch("/api/push/key")).json()).key; const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }); await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub }) }); } catch (x) {} })());
});
