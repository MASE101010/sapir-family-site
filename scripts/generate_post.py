#!/usr/bin/env python3
"""
מייצר פוסט יומי לבלוג של משפחת ספיר.

איך זה עובד:
1. קורא את blog/GUIDELINES.md (הכללים) ואת data/posts.json (הפוסטים הקיימים).
2. מוצא את התאריך הבא שחסר לו פוסט, עד BUFFER_DAYS ימים קדימה (ברירת מחדל 3),
   כך שתמיד יש כמה פוסטים מוכנים מראש וכל יום עולה אחד.
3. מבקש מ-Claude לכתוב פוסט לפי הכללים ולפי הקהל של אותו יום.
4. מבקש מ-Claude (בשיחה נפרדת, כ"עורך") לבדוק שהפוסט עומד בכללים. אם לא, מנסה שוב.
5. בודק טכנית (אורך, תגיות HTML מותרות, מבנה JSON) ושומר ל-posts.json.
   AUTO_PUBLISH=true  -> status "published" (עולה לבד בתאריך שלו)
   AUTO_PUBLISH=false -> status "draft" (לא מוצג עד שמשנים ידנית ל-published)

הרצה: ANTHROPIC_API_KEY=... python3 scripts/generate_post.py
"""
import json, os, re, sys, datetime, html
from pathlib import Path

try:
    import anthropic
except ImportError:
    sys.exit("pip install anthropic")

ROOT = Path(__file__).resolve().parent.parent
POSTS = ROOT / "data" / "posts.json"
GUIDE = ROOT / "blog" / "GUIDELINES.md"
MODEL = os.environ.get("BLOG_MODEL", "claude-sonnet-4-5")
BUFFER_DAYS = int(os.environ.get("BUFFER_DAYS", "3"))
AUTO_PUBLISH = os.environ.get("AUTO_PUBLISH", "true").lower() == "true"
ALLOWED_TAGS = {"p", "h2", "ul", "ol", "li", "blockquote", "strong", "em"}
MIN_WORDS, MAX_WORDS = 130, 520

HE_DAYS = ["שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת", "ראשון"]  # weekday(): Monday=0

def audience_for(d: datetime.date) -> str:
    # ראשון(6), שלישי(1), חמישי(3) -> הורים
    return "parents" if d.weekday() in (6, 1, 3) else "kids"

def load_posts():
    return json.loads(POSTS.read_text(encoding="utf-8")) if POSTS.exists() else []

def next_missing_date(posts):
    have = {p["date"] for p in posts}
    today = datetime.date.today()
    for i in range(0, BUFFER_DAYS + 1):
        d = today + datetime.timedelta(days=i)
        if d.isoformat() not in have:
            return d
    return None

def strip_tags(s): return re.sub(r"<[^>]+>", " ", s)

def tech_check(post):
    errs = []
    for k in ("title", "excerpt", "emoji", "body"):
        if not post.get(k): errs.append(f"חסר שדה {k}")
    if errs: return errs
    tags = set(t.lower() for t in re.findall(r"</?([a-zA-Z0-9]+)", post["body"]))
    bad = tags - ALLOWED_TAGS
    if bad: errs.append(f"תגיות לא מותרות: {bad}")
    words = len(strip_tags(post["body"]).split())
    if not (MIN_WORDS <= words <= MAX_WORDS): errs.append(f"אורך {words} מילים, מחוץ לטווח")
    if len(post["title"]) > 80: errs.append("כותרת ארוכה מדי")
    if len(post["excerpt"]) > 180: errs.append("תקציר ארוך מדי")
    if "—" in post["body"] or "—" in post["title"]: errs.append("יש מקף ארוך")
    if re.search(r"https?://", post["body"]): errs.append("אין להכניס קישורים חיצוניים")
    return errs

def extract_json(text):
    m = re.search(r"\{.*\}", text, re.S)
    return json.loads(m.group(0)) if m else None

def main():
    client = anthropic.Anthropic()
    guide = GUIDE.read_text(encoding="utf-8")
    posts = load_posts()
    target = next_missing_date(posts)
    if not target:
        print("יש פוסטים לכל הימים הקרובים, אין מה לייצר."); return
    aud = audience_for(target)
    recent = [p["title"] for p in sorted(posts, key=lambda p: p["date"], reverse=True)[:30]]
    aud_he = "הורים" if aud == "parents" else "ילדים"

    system = f"אתה כותב הבלוג היומי של משפחת ספיר. אלה הכללים המחייבים:\n\n{guide}"
    user = (f"כתוב את הפוסט לתאריך {target.isoformat()} (יום {HE_DAYS[target.weekday()]}). הקהל: {aud_he}.\n"
            f"אל תחזור על נושאים של פוסטים קודמים. כותרות אחרונות:\n- " + "\n- ".join(recent) +
            "\n\nהחזר JSON בלבד, בלי טקסט לפניו או אחריו.")

    for attempt in range(1, 4):
        print(f"ניסיון {attempt}: מייצר פוסט ל-{target} ({aud_he})")
        r = client.messages.create(model=MODEL, max_tokens=2500, system=system,
                                   messages=[{"role": "user", "content": user}])
        post = extract_json(r.content[0].text)
        if not post:
            print("  לא התקבל JSON תקין"); continue
        errs = tech_check(post)
        if errs:
            print("  בדיקה טכנית נכשלה:", errs); continue

        # עורך: בדיקת עמידה בכללים
        review = client.messages.create(
            model=MODEL, max_tokens=400,
            system="אתה עורך קפדן. בדוק אם הפוסט עומד בכל הכללים, במיוחד ברשימת הנושאים האסורים ובהתאמה לקהל. "
                   "ענה JSON בלבד: {\"approved\": true/false, \"reason\": \"סיבה קצרה\"}",
            messages=[{"role": "user", "content": f"הכללים:\n{guide}\n\nהקהל: {aud_he}\n\nהפוסט:\n{json.dumps(post, ensure_ascii=False)}"}])
        verdict = extract_json(review.content[0].text) or {"approved": False, "reason": "no verdict"}
        if not verdict.get("approved"):
            print("  העורך דחה:", verdict.get("reason")); continue

        slug = re.sub(r"[^a-z0-9]+", "-", post.get("slug", "post").lower()).strip("-") or "post"
        new = {
            "id": f"{target.isoformat()}-{aud}-{slug}-{len(posts) + 1}",
            "date": target.isoformat(),
            "status": "published" if AUTO_PUBLISH else "draft",
            "audience": aud,
            "emoji": post["emoji"][:2],
            "title": post["title"].strip(),
            "excerpt": post["excerpt"].strip(),
            "readMinutes": int(post.get("readMinutes", 3)),
            "source": "auto",
            "body": post["body"].strip(),
        }
        posts.append(new)
        posts.sort(key=lambda p: p["date"], reverse=True)
        POSTS.write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
        print(f"נשמר: {new['id']} | {new['title']}")
        return
    sys.exit("לא הצלחתי לייצר פוסט תקין אחרי 3 ניסיונות")

if __name__ == "__main__":
    main()
