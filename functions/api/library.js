/**
 * Cloudflare Pages Function: /api/library
 * הספרייה המלאה של כל הערוצים: כל הסרטונים (לא רק 15 האחרונים), עם אורך, צפיות ותאריך.
 *  - עם YT_API_KEY (משתנה סביבה בפרויקט ב-Cloudflare Pages): YouTube Data API v3, כל ההעלאות של כל ערוץ.
 *  - בלי מפתח: נופל חזרה ל-RSS (15 אחרונים לערוץ), בלי אורך; שורטס מזוהים לפי הערוץ והכותרת.
 * נשמר במטמון 3 שעות.
 */
const CHANNELS = [
  { id: "family",  name: "משפחת ספיר",    channelId: "UC6BbNPu5iGeIWt13nHucI5Q" },
  { id: "michael", name: "Michael Sapir", channelId: "UCcF1neMo_jLGqiCVTx9c1eA" },
  { id: "alin",    name: "Alin Sapir",    channelId: "UCHo8nq8KJtHaeyaGvkFRbhA" },
  { id: "shiran",  name: "Shiran Sapir",  channelId: "UCjh-baaLTpw3vu3nXlln5ZA" },
  { id: "elroei",  name: "Elroey Sapir",  channelId: "UCSvC41R0WhgYh6bYabdVKOQ" },
  { id: "sapirtv", name: "Sapir TV",      channelId: "UC9XD0cOXc-_yXfYw-xbO6vw", shorts: true },
  { id: "tuli",    name: "תולי האריה",    channelId: "UCtwxMzw0JZzwz58shhzYLbQ" }
];
const MAX_PER_CHANNEL = 600;

export async function onRequestGet(ctx) {
  try { return await handle(ctx); } catch (e) { return json({ error: String(e && e.message || e) }, 500); }
}
async function handle({ request, env }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.origin + "/api/library?v=10", request);
  if (!url.searchParams.has("fresh")) { const hit = await cache.match(cacheKey); if (hit) return hit; }

  const key = env.YT_API_KEY;
  let videos = [], source = "rss", pending = 0;
  if (key) {
    try { videos = await viaDataApi(key); source = "api"; } catch (e) { videos = []; }
  }
  if (!videos.length) {
    // הקובץ הסטטי שנבנה ב-GitHub Actions (כל ההיסטוריה), בתוספת הסרטונים הטריים מה-RSS שעוד לא בתוכו
    let built = [];
    try { const r = await env.ASSETS.fetch(new URL("/data/library.json", url.origin)); if (r.ok) built = (await r.json()).videos || []; } catch (e) {}
    const fresh = await viaRss();
    if (built.length) {
      source = "built";
      const have = new Set(built.map(v => v.id));
      const extra = fresh.filter(v => !have.has(v.id)); extra.forEach(v => { v.fresh = true; });
      pending = await markShorts(extra, url.origin);
      const byId = new Map(fresh.map(v => [v.id, v]));
      for (const v of built) { const f = byId.get(v.id); if (!f) continue; if (f.views) v.views = Math.max(v.views || 0, f.views); if (f.title && /[֐-׿]/.test(f.title)) v.title = f.title; } // ה-RSS מחזיר את כותרת המקור בעברית
      videos = [...built, ...extra];
    } else { videos = fresh; pending = await markShorts(videos, url.origin); }
  }

  if (source !== "built") videos.sort((a, b) => (a.published < b.published ? 1 : -1));
  else { // שומרים על סדר הקובץ; הסרטונים הטריים מה-RSS נכנסים בהתחלה
    const freshIds = new Set(videos.filter(v => v.fresh).map(v => v.id));
    videos.sort((a, b) => (freshIds.has(b.id) ? 1 : 0) - (freshIds.has(a.id) ? 1 : 0));
  }
  const ttl = pending ? 60 : 10800;
  const out = json({ source, count: videos.length, pending, fetched: new Date().toISOString(), videos }, 200, { "cache-control": `public, max-age=${Math.min(ttl, 1800)}, s-maxage=${ttl}` });
  await cache.put(cacheKey, out.clone());
  return out;
}

async function viaDataApi(key) {
  const all = [];
  for (const c of CHANNELS) {
    const uploads = "UU" + c.channelId.slice(2);
    let pageToken = "", ids = [];
    while (ids.length < MAX_PER_CHANNEL) {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/playlistItems?part=contentDetails&maxResults=50&playlistId=${uploads}&key=${key}${pageToken ? "&pageToken=" + pageToken : ""}`);
      if (!r.ok) break;
      const d = await r.json();
      ids.push(...(d.items || []).map(i => i.contentDetails.videoId));
      pageToken = d.nextPageToken || "";
      if (!pageToken) break;
    }
    for (let i = 0; i < ids.length; i += 50) {
      const r = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${ids.slice(i, i + 50).join(",")}&key=${key}`);
      if (!r.ok) continue;
      const d = await r.json();
      for (const v of d.items || []) {
        const dur = isoSeconds(v.contentDetails.duration);
        const title = v.snippet.title;
        const isShort = c.shorts || dur <= 180 || /#shorts/i.test(title) || /#shorts/i.test(v.snippet.description || "");
        all.push({ id: v.id, title, channel: c.id, published: v.snippet.publishedAt, views: Number(v.statistics.viewCount || 0), duration: dur, isShort, thumb: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg` });
      }
    }
  }
  return all;
}

async function viaRss() {
  const all = [];
  await Promise.all(CHANNELS.map(async c => {
    try {
      const r = await fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${c.channelId}`, { headers: { "user-agent": "Mozilla/5.0 (sapirfamily.co.il)" } });
      if (!r.ok) return;
      const xml = await r.text();
      const re = /<entry>([\s\S]*?)<\/entry>/g; let m;
      while ((m = re.exec(xml))) {
        const e = m[1], id = (e.match(/<yt:videoId>([^<]+)/) || [])[1]; if (!id) continue;
        const title = decode((e.match(/<title>([^<]*)<\/title>/) || [])[1] || "");
        all.push({ id, title, channel: c.id, published: (e.match(/<published>([^<]+)/) || [])[1] || "", views: Number((e.match(/views="(\d+)"/) || [])[1] || 0), duration: 0, isShort: !!c.shorts || /#shorts/i.test(title), thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` });
      }
    } catch (e) {}
  }));
  return all;
}

/* בלי מפתח API אין אורך, אז מזהים שורטס לפי התמונה האנכית (oardefault.jpg) שיוטיוב מייצר רק לשורטס.
   מגבלת Cloudflare: 50 בקשות משנה לכל קריאה, לכן בודקים עד 36 סרטונים בכל פעם; התוצאות נשמרות יחד
   במסמך אחד במטמון (30 יום). אחרי כמה קריאות כל הספרייה מסומנת. מחזיר כמה סרטונים נשארו לא בדוקים. */
async function markShorts(videos, origin) {
  const cache = caches.default;
  const flagsReq = new Request(`${origin}/__short-flags`);
  let flags = {};
  try { const hit = await cache.match(flagsReq); if (hit) flags = await hit.json(); } catch (e) { flags = {}; }
  const todo = [];
  for (const v of videos) {
    if (v.isShort) continue;
    if (v.id in flags) v.isShort = flags[v.id] === 1; else todo.push(v);
  }
  const batch = todo.slice(0, 36);
  todo.slice(36).forEach(v => { v.unknown = true; });
  await Promise.all(batch.map(async v => {
    try { const t = await fetch(`https://i.ytimg.com/vi/${v.id}/oardefault.jpg`, { method: "HEAD" }); flags[v.id] = t.ok ? 1 : 0; v.isShort = t.ok; } catch (e) { v.unknown = true; }
  }));
  try { await cache.put(flagsReq, new Response(JSON.stringify(flags), { headers: { "content-type": "application/json", "cache-control": "public, max-age=2592000" } })); } catch (e) {}
  return todo.length - batch.length;
}

function isoSeconds(iso) { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || ""); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; }
function decode(s) { return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }
function json(obj, status = 200, headers = {}) { return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } }); }
