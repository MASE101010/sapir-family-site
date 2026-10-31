#!/usr/bin/env python3
"""
בונה את ספריית הסרטונים המלאה (data/library.json) מכל ערוצי יוטיוב של המשפחה, בלי מפתח API ובלי חשבון:
yt-dlp במצב flat-playlist קורא את לשוניות ה-Videos וה-Shorts של כל ערוץ (כל ההיסטוריה), עם אורך, צפיות ותאריך.
רץ ב-GitHub Actions כל כמה שעות (.github/workflows/library.yml) ומתחייב לריפו; האתר מגיש את הקובץ דרך /api/library.
"""
import json, subprocess, sys, datetime, re, urllib.request, urllib.parse, concurrent.futures
from pathlib import Path

CHANNELS = [
  ("family",  "UC6BbNPu5iGeIWt13nHucI5Q"),
  ("michael", "UCcF1neMo_jLGqiCVTx9c1eA"),
  ("alin",    "UCHo8nq8KJtHaeyaGvkFRbhA"),
  ("shiran",  "UCjh-baaLTpw3vu3nXlln5ZA"),
  ("elroei",  "UCSvC41R0WhgYh6bYabdVKOQ"),
  ("sapirtv", "UC9XD0cOXc-_yXfYw-xbO6vw"),
  ("tuli",    "UCtwxMzw0JZzwz58shhzYLbQ"),
]
OUT = Path(__file__).resolve().parent.parent / "data" / "library.json"

def tab(channel_id, name):
    """לשונית של ערוץ (videos / shorts) במצב flat. קודם בעברית (lang=he); אם נכשל, בלי העדפת שפה."""
    url = f"https://www.youtube.com/channel/{channel_id}/{name}"
    base = ["yt-dlp", "--flat-playlist", "--dump-single-json", "--no-warnings", "--ignore-errors", "--extractor-args", "youtubetab:approximate_date"]
    variants = [base + ["--extractor-args", "youtube:lang=iw", "--add-headers", "Accept-Language:he-IL,he;q=0.9", url], base + [url]]
    for cmd in variants:
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
            data = json.loads(out.stdout) if out.stdout.strip() else None
            if isinstance(data, dict) and data.get("entries"):
                return data["entries"]
            print(f"  {name}: no entries ({out.stderr.strip().splitlines()[-1][:200] if out.stderr.strip() else 'empty output'})")
        except Exception as e:
            print(f"  {name}: failed: {e}")
    return []

def ts(e):
    if e.get("timestamp"): return datetime.datetime.fromtimestamp(e["timestamp"], datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    d = e.get("upload_date")
    if d and re.fullmatch(r"\d{8}", d): return f"{d[:4]}-{d[4:6]}-{d[6:]}T12:00:00Z"
    return ""

HEB = re.compile(r"[\u0590-\u05ff]")

def original_title(vid):
    """כותרת המקור (בעברית) דרך oEmbed, לסרטונים שחזרו עם כותרת מתורגמת לאנגלית."""
    try:
        q = urllib.parse.urlencode({"url": f"https://www.youtube.com/watch?v={vid}", "format": "json"})
        req = urllib.request.Request(f"https://www.youtube.com/oembed?{q}", headers={"Accept-Language": "he-IL,he;q=0.9", "User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            return json.load(r).get("title") or ""
    except Exception:
        return ""

def hebrewize(videos):
    todo = [v for v in videos.values() if v["title"] and not HEB.search(v["title"]) and not v.get("titleChecked")]
    print(f"titles without Hebrew: {len(todo)}")
    with concurrent.futures.ThreadPoolExecutor(8) as ex:
        for v, t in zip(todo, ex.map(lambda v: original_title(v["id"]), todo)):
            v["titleChecked"] = True
            if t and HEB.search(t): v["title"] = t

def rss_dates(videos):
    """תאריכים מה-RSS הרשמי (15 האחרונים לערוץ, כולל שורטס): כך כל שורט חדש מקבל תאריך מדויק תוך שעות."""
    n = 0
    for key, cid in CHANNELS:
        try:
            req = urllib.request.Request(f"https://www.youtube.com/feeds/videos.xml?channel_id={cid}", headers={"User-Agent": "Mozilla/5.0"})
            xml = urllib.request.urlopen(req, timeout=20).read().decode("utf-8")
        except Exception:
            continue
        for m in re.finditer(r"<entry>(.*?)</entry>", xml, re.S):
            e = m.group(1)
            vid = re.search(r"<yt:videoId>([^<]+)", e); pub = re.search(r"<published>([^<]+)", e)
            if vid and pub and vid.group(1) in videos and not videos[vid.group(1)].get("published"):
                videos[vid.group(1)]["published"] = pub.group(1)[:19] + "Z"; n += 1
    print(f"rss dates added: {n}")

def shorts_playlist_dates(videos):
    """ניסיון: פלייליסט השורטס של הערוץ (UUSH...) במצב flat עם approximate_date. אם יש תאריכים, משתמשים בהם."""
    n = 0
    for key, cid in CHANNELS:
        url = f"https://www.youtube.com/playlist?list=UUSH{cid[2:]}"
        cmd = ["yt-dlp", "--flat-playlist", "--dump-single-json", "--no-warnings", "--ignore-errors", "--extractor-args", "youtubetab:approximate_date", url]
        try:
            out = subprocess.run(cmd, capture_output=True, text=True, timeout=600)
            data = json.loads(out.stdout) if out.stdout.strip() else None
            for e in (data or {}).get("entries") or []:
                vid = e.get("id")
                if vid in videos and not videos[vid].get("published") and ts(e):
                    videos[vid]["published"] = ts(e); n += 1
        except Exception as ex:
            print(f"  UUSH {key}: {ex}")
    print(f"shorts playlist dates added: {n}")

def date_shorts(videos, limit=150):
    """לשונית השורטס לא מחזירה תאריכים במצב flat, אז משלימים תאריך ואורך לשורטס בלי תאריך, עד limit בכל ריצה."""
    todo = [v for v in videos.values() if v["isShort"] and not v.get("published") and not v.get("dateChecked")][:limit]
    if not todo: return
    print(f"dating shorts: {len(todo)}")
    cmd = ["yt-dlp", "--skip-download", "--no-warnings", "--ignore-errors", "--print", "%(id)s|%(timestamp)s|%(upload_date)s|%(duration)s|%(view_count)s"] + [f"https://www.youtube.com/shorts/{v['id']}" for v in todo]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=1500)
        for line in out.stdout.splitlines():
            parts = line.strip().split("|")
            if len(parts) != 5 or parts[0] not in videos: continue
            v = videos[parts[0]]; v["dateChecked"] = True
            e = {"timestamp": None if parts[1] in ("NA", "") else float(parts[1]), "upload_date": None if parts[2] == "NA" else parts[2]}
            if ts(e): v["published"] = ts(e)
            if parts[3] not in ("NA", ""): v["duration"] = int(float(parts[3]))
            if parts[4] not in ("NA", ""): v["views"] = max(v.get("views", 0), int(float(parts[4])))
    except Exception as ex:
        print(f"  dating failed: {ex}")
    for v in todo: v["dateChecked"] = True

def main():
    old = {}
    if OUT.exists():
        try: old = {v["id"]: v for v in json.loads(OUT.read_text(encoding="utf-8")).get("videos", [])}
        except Exception: old = {}
    videos = {}
    for key, cid in CHANNELS:
        print(f"{key}:")
        for tabname, is_short in (("videos", False), ("shorts", True)):
            entries = tab(cid, tabname)
            print(f"  {tabname}: {len(entries)}")
            for rank, e in enumerate(entries):
                vid = e.get("id")
                if not vid or vid in videos: continue
                prev = old.get(vid, {})
                videos[vid] = {
                    "id": vid, "title": e.get("title") or prev.get("title") or "",
                    "channel": key,
                    "published": ts(e) or prev.get("published") or "",
                    "views": int(e.get("view_count") or prev.get("views") or 0),
                    "duration": int(e.get("duration") or prev.get("duration") or 0),
                    "isShort": is_short, "rank": rank, "thumb": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                }
    if len(videos) < 50:
        print(f"only {len(videos)} videos; keeping the previous file"); sys.exit(0 if old else 1)
    # סרטונים שהיו בקובץ הקודם ולא חזרו הפעם (חסימה זמנית וכו') נשמרים
    for vid, v in old.items(): videos.setdefault(vid, v)
    for vid, v in videos.items():
        if old.get(vid, {}).get("titleChecked") and not HEB.search(v["title"]) and HEB.search(old[vid].get("title", "")): v["title"] = old[vid]["title"]
        if old.get(vid, {}).get("titleChecked"): v["titleChecked"] = True
        if v["isShort"] and not v.get("published") and old.get(vid, {}).get("published"): v["published"] = old[vid]["published"]
        if old.get(vid, {}).get("dateChecked"): v["dateChecked"] = True
    hebrewize(videos)
    rss_dates(videos)
    shorts_playlist_dates(videos)
    date_shorts(videos, limit=40)
    # סרטונים רגילים לפי תאריך (חדש לראשון); שורטס לפי המיקום בלשונית (חדש לראשון), משולבים בין הערוצים
    vod = sorted([v for v in videos.values() if not v["isShort"]], key=lambda v: v["published"], reverse=True)
    # שורטס: לפי תאריך (חדש לראשון) כשיש, אחרת לפי המיקום בלשונית
    shorts = sorted([v for v in videos.values() if v["isShort"]], key=lambda v: (0 if v.get("published") else 1, -(int(v["published"][:4] + v["published"][5:7] + v["published"][8:10]) if v.get("published") else 0), v["rank"], v["channel"] != "sapirtv"))
    arr = vod + shorts
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"built": datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"), "count": len(arr), "videos": arr}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {len(arr)} videos -> {OUT}")

if __name__ == "__main__":
    main()
