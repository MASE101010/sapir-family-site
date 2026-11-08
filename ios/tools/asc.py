#!/usr/bin/env python3
"""עזר קטן ל-App Store Connect API: מפתח JWT מהמפתח של הצוות ומבצע כמה פעולות.
שימוש: asc.py team | ensure-bundle <id> <name> | app <bundle-id> | status <bundle-id>
משתני סביבה: ASC_KEY_ID, ASC_ISSUER_ID, ASC_KEY_P8 (תוכן הקובץ .p8)."""
import base64, json, os, sys, time, urllib.request, urllib.error, urllib.parse
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature

API = "https://api.appstoreconnect.apple.com/v1"

def b64(x): return base64.urlsafe_b64encode(x).rstrip(b"=").decode()

def token():
    kid, iss, p8 = os.environ["ASC_KEY_ID"], os.environ["ASC_ISSUER_ID"], os.environ["ASC_KEY_P8"]
    key = serialization.load_pem_private_key(p8.encode(), password=None)
    head = b64(json.dumps({"alg": "ES256", "kid": kid, "typ": "JWT"}).encode())
    now = int(time.time())
    body = b64(json.dumps({"iss": iss, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"}).encode())
    sig = key.sign(f"{head}.{body}".encode(), ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(sig)
    return f"{head}.{body}." + b64(r.to_bytes(32, "big") + s.to_bytes(32, "big"))

def call(method, path, data=None):
    req = urllib.request.Request(API + path, method=method, data=json.dumps(data).encode() if data else None,
                                 headers={"Authorization": "Bearer " + token(), "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req) as r: return json.load(r) if r.status != 204 else {}
    except urllib.error.HTTPError as e:
        e.body = e.read().decode(); sys.stderr.write(e.body + "\n"); raise

def team():
    d = call("GET", "/bundleIds?limit=200")
    seeds = {b["attributes"].get("seedId") for b in d.get("data", []) if b["attributes"].get("seedId")}
    if not seeds: sys.exit("no bundle ids yet, set APPLE_TEAM_ID")
    print(sorted(seeds)[0])

def ensure_bundle(ident, name):
    d = call("GET", f"/bundleIds?filter[identifier]={ident}")
    for b in d.get("data", []):
        if b["attributes"]["identifier"] == ident: print("exists", b["id"]); return
    r = call("POST", "/bundleIds", {"data": {"type": "bundleIds", "attributes": {"identifier": ident, "name": name, "platform": "IOS"}}})
    print("created", r["data"]["id"])

def app(bundle):
    d = call("GET", f"/apps?filter[bundleId]={bundle}")
    for a in d.get("data", []): print(a["id"]); return
    print("")

def status(bundle):
    d = call("GET", f"/apps?filter[bundleId]={bundle}&include=appStoreVersions&fields[appStoreVersions]=versionString,appStoreState,appVersionState")
    for inc in d.get("included", []): print(inc["attributes"].get("versionString"), inc["attributes"].get("appVersionState") or inc["attributes"].get("appStoreState"))
    b = call("GET", f"/builds?filter[app]={d['data'][0]['id']}&sort=-uploadedDate&limit=3") if d.get("data") else {"data": []}
    for x in b["data"]: print("build", x["attributes"]["version"], x["attributes"]["processingState"])

def cert(csr_path, out_cer):
    """יוצר תעודת Apple Distribution מ-CSR, כותב את ה-DER ומדפיס את המזהה"""
    csr = open(csr_path).read()
    r = call("POST", "/certificates", {"data": {"type": "certificates", "attributes": {"certificateType": "DISTRIBUTION", "csrContent": csr}}})
    open(out_cer, "wb").write(base64.b64decode(r["data"]["attributes"]["certificateContent"]))
    print(r["data"]["id"])

def cert_ok(cert_id):
    """0 אם התעודה קיימת ובתוקף, אחרת 1"""
    try:
        d = call("GET", f"/certificates/{cert_id}")
        exp = d["data"]["attributes"].get("expirationDate", "")
        ok = exp > time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(time.time() + 7 * 86400))
        print("valid until", exp); sys.exit(0 if ok else 1)
    except urllib.error.HTTPError:
        sys.exit(1)

def profile(bundle, cert_id, name, out_path):
    """מוחק פרופיל ישן באותו שם ויוצר פרופיל App Store חדש עם התעודה"""
    b = call("GET", f"/bundleIds?filter[identifier]={bundle}")["data"]
    bid = next(x["id"] for x in b if x["attributes"]["identifier"] == bundle)
    for p in call("GET", f"/profiles?filter[name]={urllib.parse.quote(name)}")["data"]:
        if p["attributes"]["name"] == name: call("DELETE", f"/profiles/{p['id']}")
    r = call("POST", "/profiles", {"data": {"type": "profiles", "attributes": {"name": name, "profileType": "IOS_APP_STORE"},
        "relationships": {"bundleId": {"data": {"type": "bundleIds", "id": bid}}, "certificates": {"data": [{"type": "certificates", "id": cert_id}]}}}})
    open(out_path, "wb").write(base64.b64decode(r["data"]["attributes"]["profileContent"]))
    print(r["data"]["attributes"]["uuid"])

if __name__ == "__main__":
    cmd, *args = sys.argv[1:]
    {"team": team, "ensure-bundle": ensure_bundle, "app": app, "status": status, "cert": cert, "cert-ok": cert_ok, "profile": profile}[cmd](*args)
