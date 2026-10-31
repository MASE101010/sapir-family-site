/* ספריית הסרטונים: טעינה מ-/api/library, סיווג לקטגוריות, עזרים לשורטס ול-VOD */
(function () {
  /* טעינה מהירה: קודם העותק השמור בדפדפן (מיידי), אחרת הקובץ הסטטי מה-CDN; ברקע מרעננים מה-API (RSS טרי) ושומרים. */
  let cache = null, refreshing = null;
  const KEY = "sapir-library-v1", MAX_AGE = 3 * 3600 * 1000;
  const readLocal = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); if (d && d.videos && d.videos.length) return d; } catch (e) {} return null; };
  const writeLocal = (videos) => { try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), videos })); } catch (e) {} };
  const fetchJson = async (url) => { const r = await fetch(url, { cache: "no-store" }); if (!r.ok) throw new Error(url + " " + r.status); const d = await r.json(); if (!d.videos || !d.videos.length) throw new Error("empty"); return d.videos; };
  const refresh = () => refreshing || (refreshing = fetchJson("/api/library").then(v => { cache = v; writeLocal(v); document.dispatchEvent(new CustomEvent("library:updated", { detail: v })); return v; }).catch(() => null));
  window.loadLibrary = async function () {
    if (cache) return cache;
    const local = readLocal();
    if (local) { cache = local.videos; if (Date.now() - local.t > MAX_AGE) refresh(); return cache; }
    try { cache = await fetchJson("/data/library.json"); } catch (e) { cache = await fetchJson("/api/library"); writeLocal(cache); return cache; }
    writeLocal(cache); refresh();
    return cache;
  };

  const RX = {
    series:   /פרק|עונה|חלק \d|סדרה|סדרת|יום \d|חידון|תולי|הממלכה|ריינג|עיר החלומות/,
    edu:      /לומד|לימוד|אנגלית|האות |מלמד|למה |איך |ניסוי|טיפ|חינוכ|מדע|ספר|בית הספר|שיעור|צבעים|מספרים|אותיות/,
    comedy:   /מצחיק|צחוק|פראנק|מתיח|אתגר|מי ינצח|נגד|מסתתר|מחבוא|הפתע|הפתעה|\?!|בדיחה|מביך|24 שעות|טעימ|אוכל|מתכון|פיצה|סוכריות|ממתק/,
    action:   /מפחיד|רכבת|קפיצ|מגלש|אקסטרים|מהיר|מרוץ|קארטינג|פארק|הכי גבוה|הכי גדול|הכי ארוך|טיס|שייט|צניח|גלישה|מים|בריכה|שלג|סקי|רכיב|אופנוע|מכונית|ג'יפ|אקשן|קרב|נינג/,
    travel:   /דובאי|טיול|חו"ל|חופשה|מלון|טיסה|תאילנד|יוון|קפריסין|לונדון|פריז|ניו יורק|דיסני|אירופה|איטליה|ים/
  };
  const MONTH = 30 * 24 * 3600 * 1000;

  /* מחלק את הספרייה לשורות בסגנון נטפליקס. VOD בלבד (בלי שורטס). */
  window.buildRows = function (videos, channels) {
    const vod = videos.filter(v => !v.isShort && !v.unknown && !(v.duration && v.duration <= 180) && !/#shorts/i.test(v.title));
    const byViews = [...vod].sort((a, b) => b.views - a.views);
    const now = Date.now();
    let recent = vod.filter(v => now - Date.parse(v.published) < MONTH);
    if (recent.length < 10) recent = vod.filter(v => now - Date.parse(v.published) < 2 * MONTH);
    if (recent.length < 10) recent = vod.slice(0, 40);
    const top10 = [...recent].sort((a, b) => b.views - a.views).slice(0, 10);
    const chName = id => (channels.find(c => c.id === id) || {}).name || id;
    const rows = [
      { key: "top10",  title: "טופ 10 החודש", kind: "top10", items: top10 },
      { key: "new",    title: "חדש על המסך", items: vod.slice(0, 24) },
      { key: "views",  title: "הנצפים ביותר בכל הזמנים", items: byViews.slice(0, 24) },
      { key: "series", title: "הסדרות שלנו", items: vod.filter(v => RX.series.test(v.title) || v.channel === "tuli") },
      { key: "comedy", title: "קומדיה ואתגרים", items: vod.filter(v => RX.comedy.test(v.title)) },
      { key: "action", title: "אקשן ואקסטרים", items: vod.filter(v => RX.action.test(v.title)) },
      { key: "travel", title: "טיולים ברחבי העולם", items: vod.filter(v => RX.travel.test(v.title)) },
      { key: "edu",    title: "חינוכי: לומדים עם תולי ועם המשפחה", items: vod.filter(v => RX.edu.test(v.title) || v.channel === "tuli") }
    ];
    for (const c of channels) {
      const items = vod.filter(v => v.channel === c.id);
      if (items.length) rows.push({ key: "ch-" + c.id, title: `הערוץ של ${chName(c.id)}`, items: items.slice(0, 30), channel: c });
    }
    return rows.filter(r => r.items.length >= 3);
  };

  window.shortsOf = (videos) => videos.filter(v => v.isShort);
  window.shuffled = (arr, seed) => { // ערבוב דטרמיניסטי לפי seed (מספר)
    const a = [...arr]; let s = seed >>> 0 || 1;
    const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  };
  window.fmtDuration = (s) => !s ? "" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
})();
