/* כפתור "התראות על סרטון חדש": מנוי Web Push דרך ה-Service Worker של האתר. בלי שירות צד שלישי. */
(function () {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  const btns = [...document.querySelectorAll("[data-push-btn]")];
  if (!btns.length) return;
  const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent), standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
  if (!supported) { btns.forEach(b => { if (isIOS && !standalone) { b.textContent = "להתראות: הוסיפו למסך הבית"; b.title = "באייפון התראות עובדות אחרי הוספה למסך הבית (שיתוף ← הוסף למסך הבית)"; b.disabled = false; b.addEventListener("click", () => alert("באייפון: לחצו על כפתור השיתוף בספארי ובחרו 'הוסף למסך הבית'. אחרי הפתיחה מהמסך הראשי אפשר להפעיל התראות.")); } else b.hidden = true; }); return; }
  const toB = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
  let sub = null;
  const paint = () => btns.forEach(b => { b.classList.toggle("on", !!sub); b.innerHTML = (sub ? "🔔 התראות פועלות" : "🔔 התראה על סרטון חדש"); b.setAttribute("aria-pressed", !!sub); b.disabled = Notification.permission === "denied"; if (Notification.permission === "denied") b.title = "ההתראות חסומות בהגדרות הדפדפן לאתר הזה"; });
  navigator.serviceWorker.ready.then(async reg => { try { sub = await reg.pushManager.getSubscription(); } catch (e) {} paint(); }).catch(() => {});
  const subscribe = async () => {
    const reg = await navigator.serviceWorker.ready;
    const perm = await Notification.requestPermission(); if (perm !== "granted") { paint(); return; }
    const key = (await (await fetch("/api/push/key")).json()).key; if (!key) throw new Error("no key");
    sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toB(key) });
    const r = await fetch("/api/push/subscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ subscription: sub.toJSON() }) });
    if (!r.ok) throw new Error("subscribe failed");
    paint(); toast("מעולה! נעדכן אתכם כשעולה סרטון חדש");
  };
  const unsubscribe = async () => {
    const endpoint = sub.endpoint; try { await sub.unsubscribe(); } catch (e) {}
    await fetch("/api/push/unsubscribe", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint }) }).catch(() => {});
    sub = null; paint(); toast("ההתראות בוטלו");
  };
  const toast = (t) => { const d = document.createElement("div"); d.textContent = t; d.style.cssText = "position:fixed;bottom:90px;left:50%;transform:translateX(-50%);background:#fff;color:#000;padding:10px 18px;border-radius:999px;font-weight:700;z-index:99;box-shadow:0 8px 30px rgba(0,0,0,.5)"; document.body.append(d); setTimeout(() => d.remove(), 2200); };
  btns.forEach(b => b.addEventListener("click", async () => { b.disabled = true; try { if (sub) await unsubscribe(); else await subscribe(); } catch (e) { toast("לא הצלחנו להפעיל התראות כרגע"); } b.disabled = false; paint(); }));
  paint();
})();
