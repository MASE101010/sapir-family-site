#!/usr/bin/env python3
"""מוסיף ?v=<חותמת> לכל קובצי ה-CSS וה-JS של האתר בכל דפי ה-HTML, כדי שדפדפנים לא יישארו עם גרסה ישנה אחרי עדכון."""
import re, sys, time
from pathlib import Path
root = Path(__file__).resolve().parent.parent
stamp = sys.argv[1] if len(sys.argv) > 1 else time.strftime("%Y%m%d%H%M")
pat = re.compile(r'((?:href|src)="assets/(?:css|js)/[^"?]+\.(?:css|js))(?:\?v=[^"]*)?"')
n = 0
for f in root.glob("*.html"):
    s = f.read_text(encoding="utf-8"); t = pat.sub(lambda m: f'{m.group(1)}?v={stamp}"', s)
    if t != s: f.write_text(t, encoding="utf-8"); n += 1
print(f"stamped {n} pages with v={stamp}")
