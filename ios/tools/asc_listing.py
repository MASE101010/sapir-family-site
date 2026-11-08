#!/usr/bin/env python3
"""ממלא את דף האפליקציה ב-App Store Connect מתוך ios/store/listing.json: שמות, תיאורים, מילות מפתח,
צילומי מסך, דירוג גיל, פרטי הביקורת, מחיר (חינם), הבילד האחרון; עם --submit גם שולח לביקורת.
שימוש: asc_listing.py [--submit] [--no-screenshots]   (משתני סביבה כמו asc.py, ועוד ASC_REVIEW_PHONE)"""
import hashlib, json, os, sys, urllib.request, urllib.error, urllib.parse
sys.path.insert(0, os.path.dirname(__file__))
from asc import call, API, token

ROOT = os.path.join(os.path.dirname(__file__), "..", "store")
L = json.load(open(os.path.join(ROOT, "listing.json"), encoding="utf-8"))
SUBMIT = "--submit" in sys.argv
SHOTS = "--no-screenshots" not in sys.argv

def try_call(method, path, data=None):
    try: return call(method, path, data)
    except urllib.error.HTTPError as e: return None

def patch_attrs(path, typ, ident, attrs):
    """PATCH שמוריד שדות שהשרת לא מכיר (הודעת השגיאה מצביעה עליהם) ומנסה שוב"""
    attrs = dict(attrs)
    for _ in range(12):
        try:
            return call("PATCH", path, {"data": {"type": typ, "id": ident, "attributes": attrs}})
        except urllib.error.HTTPError as e:
            body = getattr(e, "body", ""); bad = None
            try:
                for err in json.loads(body)["errors"]:
                    if "REQUIRED" in err.get("code", ""): sys.stderr.write(body + "\n"); raise
                    p = err.get("source", {}).get("pointer", "")
                    if "/attributes/" in p: bad = p.split("/attributes/")[1].split("/")[0]; break
                    for k in attrs:
                        if k in err.get("detail", "") + err.get("title", ""): bad = k; break
                    if bad: break
            except Exception: pass
            if not bad or bad not in attrs: sys.stderr.write(body + "\n"); raise
            print("  (השרת לא קיבל את", bad, "- ממשיכים בלעדיו)"); attrs.pop(bad)

def upload(path_, set_id):
    data = open(path_, "rb").read()
    r = call("POST", "/appScreenshots", {"data": {"type": "appScreenshots", "attributes": {"fileName": os.path.basename(path_), "fileSize": len(data)},
             "relationships": {"appScreenshotSet": {"data": {"type": "appScreenshotSets", "id": set_id}}}}})
    sid = r["data"]["id"]
    for op in r["data"]["attributes"]["uploadOperations"]:
        chunk = data[op["offset"]:op["offset"] + op["length"]]
        req = urllib.request.Request(op["url"], method=op["method"], data=chunk, headers={h["name"]: h["value"] for h in op["requestHeaders"]})
        urllib.request.urlopen(req).read()
    call("PATCH", f"/appScreenshots/{sid}", {"data": {"type": "appScreenshots", "id": sid, "attributes": {"uploaded": True, "sourceFileChecksum": hashlib.md5(data).hexdigest()}}})
    print("   ↑", os.path.basename(path_))

def main():
    app = call("GET", f"/apps?filter[bundleId]={L['bundleId']}")["data"][0]; app_id = app["id"]
    print("app", app_id, app["attributes"]["name"])
    patch_attrs(f"/apps/{app_id}", "apps", app_id, {"contentRightsDeclaration": L["contentRightsDeclaration"]})

    # --- פרטי האפליקציה (שם, כותרת משנה, פרטיות, קטגוריה)
    infos = call("GET", f"/apps/{app_id}/appInfos")["data"]
    info = next((i for i in infos if i["attributes"].get("appStoreState") in ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED")), infos[0])
    call("PATCH", f"/appInfos/{info['id']}", {"data": {"type": "appInfos", "id": info["id"], "relationships": {
        "primaryCategory": {"data": {"type": "appCategories", "id": L["primaryCategory"]}}}}})
    existing = {x["attributes"]["locale"]: x for x in call("GET", f"/appInfos/{info['id']}/appInfoLocalizations")["data"]}
    for loc, t in L["locales"].items():
        attrs = {"name": t["name"], "subtitle": t["subtitle"], "privacyPolicyUrl": t["privacyPolicyUrl"]}
        if loc in existing: patch_attrs(f"/appInfoLocalizations/{existing[loc]['id']}", "appInfoLocalizations", existing[loc]["id"], attrs)
        else: call("POST", "/appInfoLocalizations", {"data": {"type": "appInfoLocalizations", "attributes": {"locale": loc, **attrs},
                   "relationships": {"appInfo": {"data": {"type": "appInfos", "id": info["id"]}}}}})
        print("info", loc, "ok")

    # --- הגרסה
    vers = call("GET", f"/apps/{app_id}/appStoreVersions?filter[platform]=IOS&limit=5")["data"]
    ver = next((v for v in vers if v["attributes"].get("appVersionState", v["attributes"].get("appStoreState")) in
                ("PREPARE_FOR_SUBMISSION", "DEVELOPER_REJECTED", "REJECTED", "METADATA_REJECTED", "INVALID_BINARY")), vers[0])
    vid = ver["id"]; print("version", ver["attributes"]["versionString"], ver["attributes"].get("appVersionState"))
    patch_attrs(f"/appStoreVersions/{vid}", "appStoreVersions", vid, {"versionString": L["version"], "releaseType": L["releaseType"], "copyright": L.get("copyright", "")})
    vlocs = {x["attributes"]["locale"]: x for x in call("GET", f"/appStoreVersions/{vid}/appStoreVersionLocalizations")["data"]}
    for loc, t in L["locales"].items():
        attrs = {k: t[k] for k in ("description", "keywords", "promotionalText", "supportUrl", "marketingUrl", "whatsNew") if t.get(k)}
        if loc in vlocs: patch_attrs(f"/appStoreVersionLocalizations/{vlocs[loc]['id']}", "appStoreVersionLocalizations", vlocs[loc]["id"], attrs)
        else:
            try:
                r = call("POST", "/appStoreVersionLocalizations", {"data": {"type": "appStoreVersionLocalizations", "attributes": {"locale": loc, **attrs},
                         "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": vid}}}}})
            except urllib.error.HTTPError:
                attrs.pop("whatsNew", None)
                r = call("POST", "/appStoreVersionLocalizations", {"data": {"type": "appStoreVersionLocalizations", "attributes": {"locale": loc, **attrs},
                         "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": vid}}}}})
            vlocs[loc] = r["data"]
        print("version text", loc, "ok")

    # --- צילומי מסך (לכל שפה אותם צילומים)
    if SHOTS:
        for loc, vl in vlocs.items():
            sets = {s["attributes"]["screenshotDisplayType"]: s for s in call("GET", f"/appStoreVersionLocalizations/{vl['id']}/appScreenshotSets")["data"]}
            for dtype, files in L["screenshots"].items():
                if dtype in sets:
                    sid = sets[dtype]["id"]
                    olds = call("GET", f"/appScreenshotSets/{sid}/appScreenshots")["data"]
                    if [o["attributes"]["fileName"] for o in olds] == files and all(o["attributes"].get("assetDeliveryState", {}).get("state") != "FAILED" for o in olds):
                        print("screenshots", loc, dtype, "(כבר שם)"); continue
                    for old in olds: call("DELETE", f"/appScreenshots/{old['id']}")
                else:
                    sid = call("POST", "/appScreenshotSets", {"data": {"type": "appScreenshotSets", "attributes": {"screenshotDisplayType": dtype},
                          "relationships": {"appStoreVersionLocalization": {"data": {"type": "appStoreVersionLocalizations", "id": vl["id"]}}}}})["data"]["id"]
                print("screenshots", loc, dtype)
                for f in files: upload(os.path.join(ROOT, "screenshots", f), sid)

    # --- דירוג גיל
    ar = call("GET", f"/appInfos/{info['id']}/ageRatingDeclaration")["data"]
    patch_attrs(f"/ageRatingDeclarations/{ar['id']}", "ageRatingDeclarations", ar["id"], L["ageRating"]); print("age rating ok")

    # --- פרטי קשר לביקורת
    rv = dict(L["review"]); rv["contactPhone"] = os.environ.get("ASC_REVIEW_PHONE") or rv["contactPhone"]
    if not rv["contactPhone"]: print("::warning::אין טלפון לפרטי הביקורת (הסוד ASC_REVIEW_PHONE), אפל דורשת אותו לפני השליחה, מדלגים")
    else:
        det = try_call("GET", f"/appStoreVersions/{vid}/appStoreReviewDetail")
        if det and det.get("data"): patch_attrs(f"/appStoreReviewDetails/{det['data']['id']}", "appStoreReviewDetails", det["data"]["id"], rv)
        else: call("POST", "/appStoreReviewDetails", {"data": {"type": "appStoreReviewDetails", "attributes": rv, "relationships": {"appStoreVersion": {"data": {"type": "appStoreVersions", "id": vid}}}}})
        print("review details ok")

    # --- מחיר: חינם
    sched = try_call("GET", f"/apps/{app_id}/appPriceSchedule/manualPrices")
    print("price schedule:", "exists" if sched and sched.get("data") else "none")
    if not (sched and sched.get("data")):
        pts = call("GET", f"/apps/{app_id}/appPricePoints?filter[territory]=USA&limit=200")["data"]
        free = next(p for p in pts if float(p["attributes"]["customerPrice"]) == 0)
        call("POST", "/appPriceSchedules", {"data": {"type": "appPriceSchedules", "relationships": {"app": {"data": {"type": "apps", "id": app_id}},
            "baseTerritory": {"data": {"type": "territories", "id": "USA"}}, "manualPrices": {"data": [{"type": "appPrices", "id": "${p0}"}]}}},
            "included": [{"type": "appPrices", "id": "${p0}", "attributes": {"startDate": None}, "relationships": {"appPricePoint": {"data": {"type": "appPricePoints", "id": free["id"]}}}}]})
        print("price: free")

    # --- זמינות בכל המדינות
    av = try_call("GET", f"/apps/{app_id}/appAvailabilityV2")
    if not (av and av.get("data")):
        terrs = []; nxt = "/territories?limit=200"
        while nxt:
            d = call("GET", nxt); terrs += [t["id"] for t in d["data"]]; nxt = d.get("links", {}).get("next"); nxt = nxt.replace(API, "") if nxt else None
        r = try_call("POST", "https://api.appstoreconnect.apple.com/v2/appAvailabilities", {"data": {"type": "appAvailabilities", "attributes": {"availableInNewTerritories": True},
            "relationships": {"app": {"data": {"type": "apps", "id": app_id}}, "territoryAvailabilities": {"data": [{"type": "territoryAvailabilities", "id": f"${{t{i}}}"} for i in range(len(terrs))]}}},
            "included": [{"type": "territoryAvailabilities", "id": f"${{t{i}}}", "attributes": {"available": True}, "relationships": {"territory": {"data": {"type": "territories", "id": t}}}} for i, t in enumerate(terrs)]})
        print("availability:", len(terrs), "territories", "ok" if r else "FAILED")

    # --- הבילד האחרון שעבר עיבוד
    builds = call("GET", f"/builds?filter[app]={app_id}&filter[processingState]=VALID&sort=-uploadedDate&limit=1")["data"]
    if builds:
        b = builds[0]
        call("PATCH", f"/appStoreVersions/{vid}/relationships/build", {"data": {"type": "builds", "id": b["id"]}})
        patch_attrs(f"/builds/{b['id']}", "builds", b["id"], {"usesNonExemptEncryption": False})
        print("build", b["attributes"]["version"], "attached")
    else:
        print("::warning::אין עדיין בילד מעובד, הגרסה נשארת בלי בילד")

    # --- TestFlight: קבוצה פנימית עם כל חברי הצוות, שמקבלת כל בילד אוטומטית
    groups = call("GET", f"/apps/{app_id}/betaGroups")["data"]
    g = next((x for x in groups if x["attributes"].get("isInternalGroup")), None)
    if not g:
        g = call("POST", "/betaGroups", {"data": {"type": "betaGroups", "attributes": {"name": "המשפחה", "isInternalGroup": True, "hasAccessToAllBuilds": True},
             "relationships": {"app": {"data": {"type": "apps", "id": app_id}}}}})["data"]
    have = {t["attributes"].get("email") for t in call("GET", f"/betaGroups/{g['id']}/betaTesters")["data"]}
    for u in call("GET", "/users?limit=50")["data"]:
        a = u["attributes"]
        if a.get("username") and a["username"] not in have:
            try_call("POST", "/betaTesters", {"data": {"type": "betaTesters", "attributes": {"email": a["username"], "firstName": a.get("firstName") or "", "lastName": a.get("lastName") or ""},
                     "relationships": {"betaGroups": {"data": [{"type": "betaGroups", "id": g["id"]}]}}}})
            print("testflight tester", a["username"])
    print("testflight group ok")

    if SUBMIT:
        if not builds: sys.exit("אי אפשר לשלוח בלי בילד")
        rs = call("POST", "/reviewSubmissions", {"data": {"type": "reviewSubmissions", "attributes": {"platform": "IOS"}, "relationships": {"app": {"data": {"type": "apps", "id": app_id}}}}})["data"]["id"]
        call("POST", "/reviewSubmissionItems", {"data": {"type": "reviewSubmissionItems", "relationships": {"reviewSubmission": {"data": {"type": "reviewSubmissions", "id": rs}},
             "appStoreVersion": {"data": {"type": "appStoreVersions", "id": vid}}}}})
        call("PATCH", f"/reviewSubmissions/{rs}", {"data": {"type": "reviewSubmissions", "id": rs, "attributes": {"submitted": True}}})
        print("נשלח לביקורת!")

if __name__ == "__main__":
    main()
