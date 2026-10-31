/**
 * Cloudflare Pages Function: /api/shop
 * מושך את עמוד האמן בחנות המרצ' (WooCommerce) ומחזיר רשימת מוצרים כ-JSON (שם, מחיר, תמונה, קישור).
 * כך החנות מוצגת בתוך האתר, והרכישה עצמה נעשית בעמוד המוצר בחנות.
 */
export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const cache = caches.default;
  const cacheKey = new Request(url.toString(), request);
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const src = "https://www.merchadvice.com/artist/%d7%a1%d7%a4%d7%99%d7%a8/";
  const res = await fetch(src, { headers: { "user-agent": "Mozilla/5.0 (sapirfamily.co.il)" } });
  if (!res.ok) return json({ error: "shop unavailable" }, 502);
  const html = await res.text();
  const products = [];
  const liRe = /<li[^>]*class="[^"]*\bproduct\b[^"]*"[\s\S]*?<\/li>/g;
  let m;
  while ((m = liRe.exec(html))) {
    const li = m[0];
    const link = (li.match(/href="(https:\/\/www\.merchadvice\.com\/product\/[^"]+)"/) || [])[1];
    const name = strip((li.match(/<h2[^>]*>([\s\S]*?)<\/h2>/) || li.match(/<h3[^>]*>([\s\S]*?)<\/h3>/) || [])[1] || "");
    const img = (li.match(/<img[^>]+(?:data-src|src)="([^"]+)"/) || [])[1];
    const prices = [...li.matchAll(/<bdi>([\s\S]*?)<\/bdi>/g)].map(x => strip(x[1]));
    const soldOut = /out-of-stock|outofstock|אזל/.test(li);
    if (link && name) products.push({ name, link, img: img || "", price: prices[prices.length - 1] || "", oldPrice: prices.length > 1 ? prices[0] : "", soldOut });
  }
  const out = json({ products, source: src, fetched: new Date().toISOString() }, 200, { "cache-control": "public, max-age=900, s-maxage=1800" });
  await cache.put(cacheKey, out.clone());
  return out;
}
function strip(s) { return s.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8211;|&ndash;|&#8212;/g, ", ").replace(/&#8362;/g, "₪").replace(/&#(\d+);/g, (m, n) => String.fromCodePoint(Number(n))).replace(/&quot;/g, '"').replace(/&#039;|&#8217;/g, "'").replace(/\s+,/g, ",").replace(/\s+/g, " ").trim(); }
function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
}
