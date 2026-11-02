/* פרוקסי זמני ל-API של Cloudflare (DNS): הטוקן מגיע בכותרת מהדפדפן, לא נשמר בשום מקום. */
export async function onRequest({ request }) {
  const auth = request.headers.get("authorization");
  const url = new URL(request.url);
  const path = url.searchParams.get("path") || "";
  if (!auth || !/^\/zones\/[a-f0-9]+\/dns_records/.test(path)) return new Response(JSON.stringify({ error: "bad request" }), { status: 400, headers: { "content-type": "application/json" } });
  const method = url.searchParams.get("method") || "GET";
  const body = method === "GET" || method === "DELETE" ? undefined : await request.text();
  const r = await fetch("https://api.cloudflare.com/client/v4" + path, { method, headers: { authorization: auth, "content-type": "application/json" }, body });
  return new Response(await r.text(), { status: r.status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
}
