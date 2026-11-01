#!/usr/bin/env python3
"""מדפיס JSON של הסרטון הארוך החדש ביותר בספרייה (להכרזת התראה). שימוש: python3 scripts/latest_video.py data/library.json"""
import json, sys
d = json.load(open(sys.argv[1], encoding="utf-8"))
vod = [v for v in d["videos"] if not v["isShort"] and v.get("published")]
vod.sort(key=lambda v: v["published"], reverse=True)
v = vod[0]
CH = {"family": "משפחת ספיר", "michael": "Michael Sapir", "alin": "Alin Sapir", "shiran": "Shiran Sapir", "elroei": "Elroey Sapir", "sapirtv": "Sapir TV", "tuli": "תולי האריה"}
print(json.dumps({"id": v["id"], "title": v["title"], "thumb": f"https://i.ytimg.com/vi/{v['id']}/hqdefault.jpg", "channel": CH.get(v["channel"], ""), "url": "/vod.html?v=" + v["id"]}, ensure_ascii=False))
