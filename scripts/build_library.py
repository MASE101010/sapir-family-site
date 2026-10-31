#!/usr/bin/env python3
"""
בונה את ספריית הסרטונים המלאה (data/library.json) מכל ערוצי יוטיוב של המשפחה, בלי מפתח API ובלי חשבון:
yt-dlp במצב flat-playlist קורא את לשוניות ה-Videos וה-Shorts של כל ערוץ (כל ההיסטוריה), עם אורך, צפיות ותאריך.
רץ ב-GitHub Actions כל כמה שעות (.github/workflows/library.yml) ומתחייב לריפו; האתר מגיש את הקובץ דרך /api/library.
"""
import json, subprocess, sys, datetime, re
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
    url = f"https://www.youtube.com/channel/{channel_id}/{name}"
    cmd = ["yt-dlp", "--flat-playlist", "--dump-single-json", "--no-warnings", "--ignore-errors", "--extractor-args", "youtubetab:approximate_date", url]
    try:
        out = subprocess.run(cmd, capture_output=True, text=True, timeout=900)
        if not out.stdout.strip():
            print(f"  {name}: empty ({out.stderr.strip()[:200]})"); return []
        data = json.loads(out.stdout)
        return data.get("entries") or []
    except Exception as e:
        print(f"  {name}: failed: {e}"); return []

def ts(e):
    if e.get("timestamp"): return datetime.datetime.utcfromtimestamp(e["timestamp"]).strftime("%Y-%m-%dT%H:%M:%SZ")
    d = e.get("upload_date")
    if d and re.fullmatch(r"\d{8}", d): return f"{d[:4]}-{d[4:6]}-{d[6:]}T12:00:00Z"
    return ""

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
            for e in entries:
                vid = e.get("id")
                if not vid or vid in videos: continue
                prev = old.get(vid, {})
                videos[vid] = {
                    "id": vid, "title": e.get("title") or prev.get("title") or "",
                    "channel": key,
                    "published": ts(e) or prev.get("published") or "",
                    "views": int(e.get("view_count") or prev.get("views") or 0),
                    "duration": int(e.get("duration") or prev.get("duration") or 0),
                    "isShort": is_short, "thumb": f"https://i.ytimg.com/vi/{vid}/hqdefault.jpg",
                }
    if len(videos) < 50:
        print(f"only {len(videos)} videos; keeping the previous file"); sys.exit(0 if old else 1)
    # סרטונים שהיו בקובץ הקודם ולא חזרו הפעם (חסימה זמנית וכו') נשמרים
    for vid, v in old.items(): videos.setdefault(vid, v)
    arr = sorted(videos.values(), key=lambda v: v["published"], reverse=True)
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"built": datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%M:%SZ"), "count": len(arr), "videos": arr}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {len(arr)} videos -> {OUT}")

if __name__ == "__main__":
    main()
