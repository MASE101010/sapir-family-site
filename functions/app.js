// sapirfamily.co.il/app : קישור אחד לכל המכשירים (לסטורי, ביו, קיו-אר).
// אייפון/אייפד → App Store, אנדרואיד (כולל טלוויזיה) → Google Play, מחשב → דף עם שני הכפתורים.
const IOS = "https://apps.apple.com/app/id6832267419";
const ANDROID_MARKET = "market://details?id=il.co.sapirfamily.app";
const ANDROID = "https://play.google.com/store/apps/details?id=il.co.sapirfamily.app";

export async function onRequest({ request }) {
  const ua = request.headers.get("user-agent") || "";
  const url = new URL(request.url);
  const src = url.searchParams.get("s") || "direct"; // למשל ?s=story כדי לדעת מאיפה הגיעו
  const isIOS = /iPhone|iPad|iPod/i.test(ua) || (/Macintosh/i.test(ua) && /Mobile/i.test(ua));
  const isAndroid = /Android/i.test(ua);
  const inApp = /Instagram|FBAN|FBAV|TikTok|musical_ly|BytedanceWebview/i.test(ua);
  const headers = { "cache-control": "no-store", "x-robots-tag": "noindex" };

  if (isIOS && !inApp) return Response.redirect(IOS, 302);
  if (isAndroid && !inApp) return Response.redirect(ANDROID, 302);

  // בתוך אינסטגרם/טיקטוק הפניה ישירה לחנות לפעמים נחסמת, לכן דף קטן שמפעיל את החנות מיד וגם נותן כפתור
  const target = isIOS ? IOS : isAndroid ? ANDROID : "";
  const html = `<!doctype html><html lang="he" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>האפליקציה של משפחת ספיר</title>
<meta property="og:title" content="האפליקציה של משפחת ספיר">
<meta property="og:description" content="כל הסרטונים, השורטס, המשחקים והבלוג של משפחת ספיר במקום אחד. להורדה בחינם.">
<meta property="og:image" content="https://sapirfamily.co.il/store/feature-1024x500.png">
<link rel="icon" href="/assets/img/icon-192.png">
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}body{margin:0;min-height:100vh;display:grid;place-items:center;background:radial-gradient(ellipse at 50% 0%,#2a1a6e 0%,#0b0d2e 60%);color:#fff;font-family:system-ui,-apple-system,"Segoe UI",Heebo,Arial,sans-serif;padding:24px}
.card{max-width:420px;width:100%;text-align:center}
img.logo{width:180px;height:auto;margin-bottom:12px}
h1{font-size:26px;margin:8px 0}
p{opacity:.8;line-height:1.6;margin:0 0 24px}
a.btn{display:flex;align-items:center;justify-content:center;gap:10px;margin:12px 0;padding:16px;border-radius:16px;background:#fff;color:#0b0d2e;font-weight:800;font-size:18px;text-decoration:none}
a.btn.alt{background:rgba(255,255,255,.12);color:#fff;border:1px solid rgba(255,255,255,.25)}
small{display:block;margin-top:20px;opacity:.6}
</style></head><body><div class="card">
<img class="logo" src="/assets/img/logo.png" alt="משפחת ספיר">
<h1>האפליקציה של משפחת ספיר</h1>
<p>כל הסרטונים, השורטס, המשחקים והבלוג במקום אחד. בחינם.</p>
<a class="btn" href="${IOS}"> להורדה ב-App Store (אייפון ואייפד)</a>
<a class="btn" href="${ANDROID}">▶ להורדה ב-Google Play (אנדרואיד וטלוויזיה)</a>
<a class="btn alt" href="/?utm_source=${encodeURIComponent(src)}">או לצפות עכשיו באתר</a>
${inApp ? '<small>אם החנות לא נפתחה, לחצו על שלוש הנקודות למעלה ← "פתח בדפדפן"</small>' : ''}
</div>
${target ? `<script>setTimeout(function(){location.href=${JSON.stringify(isAndroid ? ANDROID_MARKET : target)};},150);${isAndroid ? `setTimeout(function(){location.href=${JSON.stringify(ANDROID)};},1500);` : ""}</script>` : ""}
</body></html>`;
  return new Response(html, { headers: { ...headers, "content-type": "text/html; charset=utf-8" } });
}
