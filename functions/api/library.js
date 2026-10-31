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

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.origin + "/api/library?v=4", request);
  if (!url.searchParams.has("fresh")) { const hit = await cache.match(cacheKey); if (hit) return hit; }

  const key = env.YT_API_KEY;
  let videos = [], source = "rss";
  if (key) {
    try { videos = await viaDataApi(key); source = "api"; } catch (e) { videos = []; }
  }
  if (!videos.length) { videos = await viaRss(); await markShorts(videos); }

  videos.sort((a, b) => (a.published < b.published ? 1 : -1));
  const out = json({ source, count: videos.length, fetched: new Date().toISOString(), videos }, 200, { "cache-control": "public, max-age=1800, s-maxage=10800" });
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

/* בלי מפתח API אין אורך, אז מזהים שורטס לפי התמונה האנכית (oardefault.jpg) שיוטיוב מייצר רק לשורטס,
   ועם גיבוי של בדיקת /shorts/<id> (200 לשורט, הפניה לסרטון רגיל). */
async function markShorts(videos) {
  const todo = videos.filter(v => !v.isShort);
  for (let i = 0; i < todo.length; i += 20) {
    await Promise.all(todo.slice(i, i + 20).map(async v => {
      try {
        const t = await fetch(`https://i.ytimg.com/vi/${v.id}/oardefault.jpg`, { method: "HEAD" });
        if (t.ok) { v.isShort = true; return; }
      } catch (e) {}
      try {
        const r = await fetch(`https://www.youtube.com/shorts/${v.id}`, { redirect: "manual", headers: { "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36", "accept-language": "he,en" } });
        if (r.status === 200) v.isShort = true;
        else if (r.status >= 300 && r.status < 400) { const loc = r.headers.get("location") || ""; if (/\/shorts\//.test(loc)) v.isShort = true; }
      } catch (e) {}
    }));
  }
}

function isoSeconds(iso) { const m = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/.exec(iso || ""); return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0; }
function decode(s) { return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'"); }
function json(obj, status = 200, headers = {}) { return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } }); }
