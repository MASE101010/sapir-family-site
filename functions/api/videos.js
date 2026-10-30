/**
 * Cloudflare Pages Function: /api/videos?channel=UC...
 * מושך את ה-RSS הרשמי של ערוץ יוטיוב (15 הסרטונים האחרונים) ומחזיר JSON.
 * אין צורך במפתח API ואין צורך בפלייליסטים. נשמר במטמון של Cloudflare ל-20 דקות.
 */
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const channel = url.searchParams.get("channel") || "";
  if (!/^UC[\w-]{22}$/.test(channel)) return json({ error: "bad channel id" }, 400);

  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel}`;
  const res = await fetch(feedUrl, { headers: { "user-agent": "Mozilla/5.0 (sapirfamily.co.il feed reader)" } });
  if (!res.ok) return json({ error: "feed unavailable", status: res.status }, 502);
  const xml = await res.text();

  const title = (xml.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const videos = [];
  const entryRe = /<entry>([\s\S]*?)<\/entry>/g;
  let m;
  while ((m = entryRe.exec(xml))) {
    const e = m[1];
    const id = (e.match(/<yt:videoId>([^<]+)<\/yt:videoId>/) || [])[1];
    if (!id) continue;
    videos.push({
      id,
      title: decode((e.match(/<title>([^<]*)<\/title>/) || [])[1] || ""),
      published: (e.match(/<published>([^<]+)<\/published>/) || [])[1] || "",
      views: Number((e.match(/<media:statistics views="(\d+)"/) || [])[1] || 0),
      thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    });
  }
  const out = json({ channel, title: decode(title), videos, fetched: new Date().toISOString() }, 200, {
    "cache-control": "public, max-age=600, s-maxage=1200"
  });
  await cache.put(cacheKey, out.clone());
  return out;
}

function decode(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/<!\[CDATA\[|\]\]>/g, "");
}
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", ...headers } });
}
