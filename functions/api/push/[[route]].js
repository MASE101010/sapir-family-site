/**
 * התראות על סרטונים חדשים (Web Push) בלי שירות צד שלישי:
 *  GET  /api/push/key          מפתח VAPID ציבורי (ליצירת המנוי בדפדפן)
 *  POST /api/push/subscribe    שומר מנוי (PushSubscription) ב-KV
 *  POST /api/push/unsubscribe  מוחק מנוי
 *  GET  /api/push/latest       הסרטון האחרון שהוכרז (ה-Service Worker קורא אותו כשמגיעה דחיפה)
 *  POST /api/push/send         (עם כותרת x-push-secret) מכריז על סרטון ושולח דחיפה לכל המנויים, 40 בכל קריאה (cursor)
 * הנתונים: KV בשם PUSH. המפתחות: vapid, secret, latest, sub:<hash>.
 */
const json = (o, s = 200, h = {}) => new Response(JSON.stringify(o), { status: s, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...h } });
const b64u = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64uDecode = (s) => { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), c => c.charCodeAt(0)); };
const te = new TextEncoder();

export async function onRequest({ request, env, params }) {
  const route = (params.route || []).join("/");
  if (!env.PUSH) return json({ error: "push storage not configured" }, 503);
  try {
    if (request.method === "GET" && route === "key") { const v = await env.PUSH.get("vapid", "json"); return v ? json({ key: v.pub }) : json({ error: "no vapid key yet" }, 503); }
    if (request.method === "GET" && route === "latest") { const l = await env.PUSH.get("latest", "json"); return json(l || {}); }
    if (request.method === "POST" && route === "subscribe") {
      const body = await request.json().catch(() => null); const sub = body && body.subscription;
      if (!sub || !sub.endpoint || !/^https:\/\//.test(sub.endpoint) || !sub.keys || !sub.keys.p256dh) return json({ error: "bad subscription" }, 400);
      const id = await hash(sub.endpoint);
      await env.PUSH.put("sub:" + id, JSON.stringify({ endpoint: sub.endpoint, keys: sub.keys, t: Date.now(), ua: (request.headers.get("user-agent") || "").slice(0, 120) }));
      return json({ ok: true });
    }
    if (request.method === "POST" && route === "unsubscribe") {
      const body = await request.json().catch(() => null); if (!body || !body.endpoint) return json({ error: "bad request" }, 400);
      await env.PUSH.delete("sub:" + await hash(body.endpoint)); return json({ ok: true });
    }
    if (request.method === "POST" && route === "send") {
      const secret = await env.PUSH.get("secret");
      if (!secret || request.headers.get("x-push-secret") !== secret) return json({ error: "forbidden" }, 403);
      const url = new URL(request.url);
      const body = await request.json().catch(() => ({}));
      if (body.video) await env.PUSH.put("latest", JSON.stringify({ ...body.video, at: new Date().toISOString() }));
      const vapid = await env.PUSH.get("vapid", "json"); if (!vapid) return json({ error: "no vapid" }, 503);
      const list = await env.PUSH.list({ prefix: "sub:", limit: 40, cursor: url.searchParams.get("cursor") || undefined });
      const jwts = new Map(); // JWT אחד לכל שירות דחיפה (לפי origin)
      let sent = 0, removed = 0, failed = 0;
      await Promise.all(list.keys.map(async k => {
        const sub = await env.PUSH.get(k.name, "json"); if (!sub) return;
        try {
          const aud = new URL(sub.endpoint).origin;
          if (!jwts.has(aud)) jwts.set(aud, await vapidJwt(vapid, aud));
          const r = await fetch(sub.endpoint, { method: "POST", headers: { TTL: "86400", Urgency: "normal", "Content-Length": "0", Authorization: `vapid t=${jwts.get(aud)}, k=${vapid.pub}` } });
          if (r.status === 404 || r.status === 410) { await env.PUSH.delete(k.name); removed++; }
          else if (r.ok) sent++; else failed++;
        } catch (e) { failed++; }
      }));
      return json({ sent, removed, failed, cursor: list.list_complete ? null : list.cursor });
    }
    return json({ error: "not found" }, 404);
  } catch (e) { return json({ error: String(e && e.message || e) }, 500); }
}

async function hash(s) { const d = await crypto.subtle.digest("SHA-256", te.encode(s)); return b64u(d).slice(0, 32); }

/* JWT חתום ב-ES256 לפי תקן VAPID (RFC 8292) */
async function vapidJwt(vapid, aud) {
  const key = await crypto.subtle.importKey("jwk", { kty: "EC", crv: "P-256", x: vapid.jwk.x, y: vapid.jwk.y, d: vapid.jwk.d }, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  const header = b64u(te.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64u(te.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: "mailto:social@sapirfamily.co.il" })));
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, te.encode(`${header}.${claims}`));
  return `${header}.${claims}.${b64u(sig)}`;
}
