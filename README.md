# האתר של משפחת ספיר

אתר סטטי (HTML/CSS/JS, בלי בנייה), מיועד לפריסה ב-Cloudflare Pages מתוך GitHub.

## מבנה
- `index.html` בית, `videos.html` סרטונים, `games.html` משחקים, `blog.html` + `post.html` בלוג,
  `tuli.html` תולי, `about.html` מי אנחנו, `brands.html` מותגים, `contact.html` קשר,
  `privacy.html` / `terms.html` / `accessibility.html` משפטי.
- `assets/js/config.js` כל הנתונים שמתחלפים: סושיאל, מייל, חנות, ערוצים (playlistId), משחקים, מספרי עוקבים.
- `assets/js/site.js` תפריט, פוטר, נגישות, טעינת בלוג.
- `data/posts.json` הפוסטים. מוצגים רק פוסטים עם `status: "published"` שתאריכם הגיע.
- `blog/GUIDELINES.md` הכללים של הבלוג האוטומטי.
- `scripts/generate_post.py` + `.github/workflows/daily-post.yml` הייצור היומי.

## חלקים חיים (Cloudflare Pages Functions, בתיקיית `functions/`)
- `functions/api/videos.js` מושך את ה-RSS הרשמי של כל ערוץ יוטיוב (15 הסרטונים האחרונים) ומחזיר JSON. האתר מציג מזה את רשתות הסרטונים, השורטס ו"חדש היום". בלי מפתח API ובלי פלייליסטים. אם ה-API לא זמין (למשל בתצוגה מקדימה), האתר נופל חזרה לנגן פלייליסט ההעלאות.
- `functions/api/shop.js` קורא את עמוד האמן בחנות merchadvice ומחזיר את המוצרים (שם, מחיר, תמונה, קישור) ל-`shop.html`. גיבוי: `data/products.json`, ואז החנות עצמה ב-iframe.
- `play.html?game=<id>` מריץ כל משחק בדפדפן בתוך האתר. לכל משחק ב-config יש `playUrl` (קישור חיצוני או `games/<id>/index.html`) ו-`playReady`.

## העלאה (הכול מהדפדפן)
1. GitHub: ריפו חדש, "upload files", גוררים את כל התיקייה.
2. Cloudflare: Workers & Pages > Create > Pages > Connect to Git > בוחרים את הריפו. Build command ריק, Output directory `/`.
3. Custom domains: מוסיפים את הדומיין, Cloudflare מסדר את ה-DNS. (הפונקציות ב-`functions/` נפרסות אוטומטית עם האתר.)
4. GitHub > Settings > Secrets > Actions: מוסיפים `ANTHROPIC_API_KEY`. מהרגע הזה עולה פוסט כל בוקר.

## יוטיוב
הערוצים כבר מוגדרים ב-`config.js` עם מזהי הערוצים. להוספת ערוץ: שורה חדשה ב-`channels` עם `playlistId` = "UU" + מזהה הערוץ בלי "UC".
