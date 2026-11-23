/* משפחת ספיר לטלוויזיה: שני מסכים (סרטונים ושורטס) ונגן מסך מלא, שליטה מלאה בשלט.
   אין כאן פרסומות, אין קישורים החוצה ואין גלילה של הדף: כל תזוזה היא transform מחושב, כך שהכל חלק גם בטלוויזיות חלשות. */
(function () {
  "use strict";
  const $ = (id) => document.getElementById(id);
  const CH = { family: "משפחת ספיר", michael: "מיכאל ספיר", alin: "אלין ספיר", shiran: "שירן ספיר", elroei: "אלרועי ספיר", sapirtv: "Sapir TV", tuli: "תולי האריה" };
  const PROG_KEY = "sapir-tv-progress";
  const store = {
    get() { try { return JSON.parse(localStorage.getItem(PROG_KEY)) || {}; } catch (e) { return {}; } },
    set(o) { try { localStorage.setItem(PROG_KEY, JSON.stringify(o)); } catch (e) {} }
  };
  const fmt = (s) => { s = Math.max(0, Math.floor(s || 0)); const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, x = String(s % 60).padStart(2, "0"); return h ? `${h}:${String(m).padStart(2, "0")}:${x}` : `${m}:${x}`; };
  const views = (n) => !n ? "" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M צפיות" : n >= 1e3 ? Math.round(n / 1e3) + "K צפיות" : n + " צפיות";
  const thumb = (id, q) => `https://i.ytimg.com/vi/${id}/${q || "mqdefault"}.jpg`;
  const esc = (s) => String(s || "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  let toastT;
  const toast = (msg, ms) => { const t = $("toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), ms || 2600); };

  /* ---------- נתונים ---------- */
  const RX = {
    comedy: /מצחיק|צחוק|פראנק|מתיח|אתגר|מי ינצח|נגד|מסתתר|מחבוא|הפתע|בדיחה|24 שעות|טעימ|אוכל|ממתק/,
    action: /מפחיד|רכבת|קפיצ|מגלש|אקסטרים|מהיר|מרוץ|קארטינג|פארק|הכי גבוה|הכי גדול|טיס|צניח|גלישה|בריכה|שלג|סקי|אופנוע|מכונית|אקשן/,
    travel: /דובאי|טיול|חו"ל|חופשה|מלון|טיסה|תאילנד|יוון|קפריסין|לונדון|פריז|ניו יורק|דיסני|אירופה|איטליה/,
    edu: /לומד|לימוד|אנגלית|האות |מלמד|ניסוי|חינוכ|מדע|שיעור|צבעים|מספרים|אותיות/
  };
  let byId = {}, rows = [], shorts = [];

  async function getJson(url) { const r = await fetch(url, { cache: "no-cache" }); if (!r.ok) throw new Error(url); return r.json(); }

  function buildRows(videos, playlists) {
    const vod = videos.filter((v) => !v.isShort && !(v.duration && v.duration <= 180) && !/#shorts/i.test(v.title));
    vod.forEach((v) => (byId[v.id] = v));
    const now = Date.now(), MONTH = 30 * 864e5;
    let recent = vod.filter((v) => now - Date.parse(v.published) < MONTH);
    if (recent.length < 10) recent = vod.slice(0, 40);
    const out = [];
    const prog = store.get();
    const cont = Object.keys(prog).map((id) => ({ id, ...prog[id] })).filter((p) => p.t > 20 && p.t < p.d - 45 && (byId[p.id] || p.title))
      .sort((a, b) => b.at - a.at).slice(0, 20).map((p) => byId[p.id] || { id: p.id, title: p.title, duration: p.d, channel: p.ch });
    if (cont.length) out.push({ key: "continue", title: "המשך צפייה", items: cont });
    out.push({ key: "top10", title: "טופ 10 החודש", top: true, items: [...recent].sort((a, b) => b.views - a.views).slice(0, 10) });
    out.push({ key: "new", title: "חדש על המסך", items: vod.slice(0, 30) });
    for (const p of playlists || []) {
      if (!p.items || p.items.length < 2) continue;
      let items = p.items.map((it, i) => ({ id: it.id, title: it.title, duration: it.duration, channel: (byId[it.id] || {}).channel || (p.key === "tuli-series" ? "tuli" : "family"), views: (byId[it.id] || {}).views, published: (byId[it.id] || {}).published, ep: p.kind === "series" ? epLabel(it.title, i) : "" }));
      if (p.kind === "series") items = sortEpisodes(items);
      out.push({ key: "pl-" + (p.key || p.id), title: p.title, series: p.kind === "series", items });
    }
    out.push({ key: "views", title: "הנצפים ביותר בכל הזמנים", items: [...vod].sort((a, b) => b.views - a.views).slice(0, 30) });
    out.push({ key: "tuli", title: "תולי האריה, לקטנטנים", items: vod.filter((v) => v.channel === "tuli").slice(0, 30) });
    out.push({ key: "comedy", title: "קומדיה ואתגרים", items: vod.filter((v) => RX.comedy.test(v.title)).slice(0, 30) });
    out.push({ key: "action", title: "אקשן ואקסטרים", items: vod.filter((v) => RX.action.test(v.title)).slice(0, 30) });
    out.push({ key: "travel", title: "טיולים ברחבי העולם", items: vod.filter((v) => RX.travel.test(v.title)).slice(0, 30) });
    out.push({ key: "edu", title: "לומדים עם המשפחה", items: vod.filter((v) => RX.edu.test(v.title)).slice(0, 30) });
    for (const ch of ["family", "michael", "alin", "shiran", "elroei"]) {
      const items = vod.filter((v) => v.channel === ch).slice(0, 30);
      if (items.length >= 4) out.push({ key: "ch-" + ch, title: ch === "family" ? "הערוץ הראשי" : `הערוץ של ${CH[ch]}`, items });
    }
    return out.filter((r) => r.items.length >= 3 || r.key === "continue");
  }
  function epLabel(title, i) {
    const m = /פרק(?:ים)?\s*(\d+)(?:\s*\+\s*(\d+))?/.exec(title || "");
    if (m) return m[2] ? `פרקים ${m[1]}+${m[2]}` : `פרק ${m[1]}`;
    return /סרט/.test(title || "") ? "הסרט המלא" : `פרק ${i + 1}`;
  }
  function sortEpisodes(items) {
    const n = (it) => { const m = /פרק(?:ים)?\s*(\d+)/.exec(it.title || ""), s = /עונה\s*(\d+)/.exec(it.title || ""); return m ? (s ? +s[1] : 1) * 100 + +m[1] : 999; };
    return items.map((it, i) => ({ it, i })).sort((a, b) => n(a.it) - n(b.it) || a.i - b.i).map((x) => x.it);
  }

  /* ---------- ציור ---------- */
  const rowsEl = $("rows");
  function renderRows() {
    const prog = store.get();
    rowsEl.innerHTML = rows.map((r, ri) => `<div class="row" data-r="${ri}"><h3>${esc(r.title)}<small>${r.items.length}</small></h3><div class="strip">${
      r.items.map((v, ci) => {
        const p = prog[v.id], pct = p && p.d ? Math.min(100, (p.t / p.d) * 100) : 0;
        return `<div class="card" data-c="${ci}"><img data-src="${thumb(v.id)}" alt="">${r.top ? `<span class="rank">${ci + 1}</span>` : ""}${v.ep ? `<span class="ep">${esc(v.ep)}</span>` : ""}${v.duration ? `<span class="dur">${fmt(v.duration)}</span>` : ""}${pct > 2 ? `<span class="prog"><i style="width:${pct}%"></i></span>` : ""}<div class="cardTitle">${esc(v.title)}</div></div>`;
      }).join("")}</div></div>`).join("");
    rows.forEach((r) => (r.col = Math.min(r.col || 0, r.items.length - 1)));
  }
  const rowEl = (r) => rowsEl.children[r];
  function loadImages(r) {
    for (let k = Math.max(0, r - 1); k <= Math.min(rows.length - 1, r + 2); k++) {
      const el = rowEl(k); if (!el) continue;
      const from = Math.max(0, (rows[k].col || 0) - 2), to = (rows[k].col || 0) + 8;
      const imgs = el.querySelectorAll("img[data-src]");
      imgs.forEach((img) => { const c = +img.parentNode.dataset.c; if (c >= from && c <= to) { img.src = img.dataset.src; img.removeAttribute("data-src"); } });
    }
  }

  /* ---------- מצב ומיקוד ---------- */
  const S = { tab: "vod", area: "rows", tabIdx: 0, r: 0, player: false };
  const tabsEls = [...document.querySelectorAll(".tab")];
  const ROW_H = () => rowEl(0) ? rowEl(0).offsetHeight : 1;
  const CARD_STEP = () => { const c = rowsEl.querySelector(".card"); return c ? c.offsetWidth + parseFloat(getComputedStyle(c.parentNode).columnGap || getComputedStyle(c.parentNode).gap || 0) : 1; };

  function paint() {
    tabsEls.forEach((t, i) => { t.classList.toggle("on", t.dataset.tab === S.tab); t.classList.toggle("focus", S.area === "tabs" && i === S.tabIdx); });
    if (S.tab !== "vod" || !rows.length) return;
    rowsEl.querySelectorAll(".card.focus").forEach((c) => c.classList.remove("focus"));
    rowsEl.querySelectorAll(".row.cur").forEach((c) => c.classList.remove("cur"));
    const re = rowEl(S.r); if (!re) return;
    re.classList.add("cur");
    rowsEl.style.transform = `translateY(${-S.r * ROW_H()}px)`;
    const row = rows[S.r], strip = re.querySelector(".strip");
    // הכרטיס הממוקד נשאר בשליש הימני של המסך; הפס זז מתחתיו
    const first = Math.max(0, row.col - 1);
    strip.style.transform = `translateX(${first * CARD_STEP()}px)`;
    if (S.area === "rows") { const card = strip.children[row.col]; if (card) card.classList.add("focus"); }
    loadImages(S.r);
    heroFor(row.items[row.col], row);
  }

  /* הירו: התמונה והטקסט של הכרטיס הממוקד, עם השהיה קטנה כדי שגלילה מהירה לא תטען עשרות תמונות */
  let heroT, heroFlip = false, heroId = "";
  function heroFor(v, row) {
    if (!v || v.id === heroId) return;
    heroId = v.id;
    $("heroTitle").textContent = v.title;
    $("heroTag").textContent = row.top ? `טופ 10 החודש, מקום ${row.col + 1}` : v.ep ? `${row.title}, ${v.ep}` : row.key === "continue" ? "המשך צפייה" : "";
    const p = store.get()[v.id];
    $("heroMeta").innerHTML = [CH[v.channel] ? `<b>${esc(CH[v.channel])}</b>` : "", views(v.views), v.duration ? fmt(v.duration) + " דקות" : "", p && p.t > 20 ? `נצפה עד ${fmt(p.t)}` : ""].filter(Boolean).map((x) => `<span>${x}</span>`).join("");
    clearTimeout(heroT);
    heroT = setTimeout(() => {
      const next = heroFlip ? $("heroA") : $("heroB"), prev = heroFlip ? $("heroB") : $("heroA");
      heroFlip = !heroFlip;
      next.onload = () => {
        if (next.naturalWidth && next.naturalWidth < 200 && /maxresdefault/.test(next.src)) { next.src = thumb(v.id, "hqdefault"); return; }
        next.classList.add("on"); prev.classList.remove("on");
      };
      next.onerror = () => { if (/maxresdefault/.test(next.src)) next.src = thumb(v.id, "hqdefault"); };
      next.src = thumb(v.id, "maxresdefault");
    }, 220);
  }

  function setTab(tab) {
    if (S.tab === tab) return;
    S.tab = tab;
    $("vod").hidden = tab !== "vod";
    $("shorts").hidden = tab !== "shorts";
    document.body.classList.toggle("mode-shorts", tab === "shorts");
    if (tab === "shorts") { S.area = "shorts"; openShorts(); }
    else { closePlayer(true); S.area = "rows"; }
    paint();
  }

  /* ---------- מקשים ---------- */
  const KEY = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", Enter: "ok", " ": "ok", NumpadEnter: "ok", Select: "ok",
    Escape: "back", Backspace: "back", GoBack: "back", BrowserBack: "back", MediaPlayPause: "toggle", MediaPlay: "toggle", MediaPause: "toggle",
    MediaFastForward: "ff", MediaRewind: "rw", MediaTrackNext: "next", MediaTrackPrevious: "prev" };
  const CODES = { 38: "up", 40: "down", 37: "left", 39: "right", 13: "ok", 23: "ok", 27: "back", 8: "back", 461: "back", 10009: "back", 179: "toggle", 415: "toggle", 19: "toggle", 417: "ff", 412: "rw" };
  document.addEventListener("keydown", (e) => {
    const k = KEY[e.key] || CODES[e.keyCode]; if (!k) return;
    e.preventDefault(); e.stopPropagation();
    if (k === "back") { if (!back()) { /* בדפדפן רגיל אין לאן לצאת */ } return; }
    if (!booted) return;
    if (S.player || S.tab === "shorts") { if (playerKey(k, e.repeat)) return; }
    nav(k);
  }, true);
  document.addEventListener("keyup", (e) => { const k = KEY[e.key] || CODES[e.keyCode]; if ((k === "left" || k === "right") && S.player) commitSeekSoon(); }, true);

  function nav(k) {
    if (S.tab === "shorts") { if (S.area === "tabs") { if (k === "down") { S.area = "shorts"; paint(); } else if (k === "left" || k === "right") moveTab(k); else if (k === "ok") pickTab(); } return; }
    if (S.area === "tabs") {
      if (k === "down" && rows.length) { S.area = "rows"; }
      else if (k === "left" || k === "right") return moveTab(k);
      else if (k === "ok") return pickTab();
      return paint();
    }
    const row = rows[S.r];
    if (k === "up") { if (S.r === 0) S.area = "tabs"; else S.r--; }
    else if (k === "down") { if (S.r < rows.length - 1) S.r++; }
    else if (k === "left") { if (row.col < row.items.length - 1) row.col++; }   // RTL: שמאלה = הבא בשורה
    else if (k === "right") { if (row.col > 0) row.col--; }
    else if (k === "ok") return playFromRow(S.r, row.col);
    paint();
  }
  function moveTab(k) { S.tabIdx = Math.max(0, Math.min(tabsEls.length - 1, S.tabIdx + (k === "left" ? 1 : -1))); paint(); }
  function pickTab() { const t = tabsEls[S.tabIdx].dataset.tab; if (t !== S.tab) setTab(t); S.area = t === "vod" ? "rows" : "shorts"; paint(); }

  /* חזרה: נגן פתוח, נסגר; בשורטס, חוזרים לסרטונים; בשורות, עולים לסרגל; בסרגל, יוצאים מהאפליקציה */
  function back() {
    if (S.player && S.tab === "vod") { closePlayer(); return true; }
    if (S.tab === "shorts") { setTab("vod"); S.area = "rows"; paint(); return true; }
    if (S.area === "rows" && (S.r > 0 || rows[S.r].col > 0)) { S.r = 0; rows[0].col = 0; paint(); return true; }
    if (S.area === "rows") { S.area = "tabs"; S.tabIdx = 0; paint(); return true; }
    return false;
  }
  window.__sapirBack = back;
  window.__sapirMedia = (what) => { if (S.player || S.tab === "shorts") { playerKey(what === "toggle" ? "toggle" : what, false); return true; } return false; };

  /* ---------- נגן ---------- */
  let shortsIdx = 0;
  let yt = null, ytReady = false, ytQueued = null, list = [], idx = 0, mode = "vod", tick = null, osdT = null, lastSave = 0, ended = false, nextT = null, nextLeft = 0;
  function loadYT() {
    if (window.YT && window.YT.Player) return Promise.resolve();
    return new Promise((res) => { window.onYouTubeIframeAPIReady = res; const s = document.createElement("script"); s.src = "https://www.youtube.com/iframe_api"; document.head.appendChild(s); });
  }
  async function ensurePlayer(id, start) {
    await loadYT();
    if (yt) { ytReady ? yt.loadVideoById({ videoId: id, startSeconds: start || 0 }) : (ytQueued = { id, start }); return; }
    yt = new YT.Player("yt", {
      host: "https://www.youtube-nocookie.com", videoId: id,
      playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, rel: 0, modestbranding: 1, playsinline: 1, iv_load_policy: 3, cc_load_policy: 0, start: Math.floor(start || 0), origin: location.origin, hl: "he" },
      events: {
        onReady: () => { ytReady = true; try { yt.getIframe().setAttribute("tabindex", "-1"); } catch (e) {} if (ytQueued) { yt.loadVideoById({ videoId: ytQueued.id, startSeconds: ytQueued.start || 0 }); ytQueued = null; } else yt.playVideo(); },
        onStateChange: onState,
        onError: (e) => { toast("הסרטון הזה לא זמין כרגע, עוברים לבא"); setTimeout(() => go(1, true), 1200); }
      }
    });
  }
  function onState(e) {
    const st = e.data;
    $("pLoading").hidden = !(st === 3 || st === -1);
    if (st === 1) { ended = false; $("pState").textContent = ""; if (mode === "shorts") $("shPoster").style.opacity = 0; }
    if (st === 2) { $("pState").textContent = "❚❚ בהשהיה"; showOsd(true); }
    if (st === 0) { ended = true; save(true); if (mode === "shorts") go(1); else autoNext(); }
  }
  function playFromRow(r, c) {
    const row = rows[r];
    list = row.items; idx = c; mode = "vod";
    openPlayer();
  }
  function openPlayer() {
    S.player = true;
    $("player").hidden = false;
    $("pLoading").hidden = false;
    hideNext();
    const v = list[idx];
    $("pTitle").textContent = v.title; $("pChan").textContent = CH[v.channel] || "";
    $("pFill").style.width = "0%"; $("pKnob").style.left = "0%"; $("pCur").textContent = "0:00"; $("pDur").textContent = fmt(v.duration);
    const p = store.get()[v.id];
    const start = mode === "vod" && p && p.t > 20 && p.t < (p.d || v.duration || 1e9) - 45 ? p.t : 0;
    if (start) toast(`ממשיכים מ-${fmt(start)}`);
    ensurePlayer(v.id, start);
    if (mode === "vod") showOsd();
    clearInterval(tick); tick = setInterval(update, 500);
  }
  function closePlayer(silent) {
    if (!S.player && !yt) return;
    save(true);
    try { yt && yt.stopVideo(); } catch (e) {}
    clearInterval(tick); hideNext();
    S.player = false;
    $("player").hidden = true;
    $("pOsd").classList.remove("show");
    if (!silent && S.tab === "vod") { const keep = { r: S.r, col: rows[S.r] && rows[S.r].col }; refreshContinue(); if (rows[keep.r]) rows[keep.r].col = keep.col; paint(); }
  }
  function refreshContinue() {
    const had = rows[0] && rows[0].key === "continue";
    const fresh = buildRows(window.__lib || [], window.__pl || []);
    const has = fresh[0] && fresh[0].key === "continue";
    const cols = {}; rows.forEach((r) => (cols[r.key] = r.col));
    rows = fresh; rows.forEach((r) => (r.col = Math.min(cols[r.key] || 0, r.items.length - 1)));
    if (has && !had) S.r++; else if (!has && had) S.r = Math.max(0, S.r - 1);
    renderRows();
  }
  function update() {
    if (!ytReady || !yt.getDuration) return;
    let d = yt.getDuration() || (list[idx] && list[idx].duration) || 0, t = pendingSeek != null ? pendingSeek : yt.getCurrentTime() || 0;
    const pct = d ? Math.min(100, (t / d) * 100) : 0;
    $("pFill").style.width = pct + "%"; $("pKnob").style.left = pct + "%";
    $("pBuf").style.width = Math.min(100, (yt.getVideoLoadedFraction() || 0) * 100) + "%";
    $("pCur").textContent = fmt(t); $("pDur").textContent = fmt(d);
    if (Date.now() - lastSave > 5000) save();
  }
  function save(force) {
    if (mode !== "vod" || !ytReady || !list[idx]) return;
    lastSave = Date.now();
    let t = 0, d = 0; try { t = yt.getCurrentTime(); d = yt.getDuration(); } catch (e) {}
    if (!d || (!force && t < 5)) return;
    const v = list[idx], all = store.get();
    if (ended || t > d - 30) delete all[v.id]; else all[v.id] = { t: Math.floor(t), d: Math.floor(d), at: Date.now(), title: v.title, ch: v.channel };
    const keys = Object.keys(all); if (keys.length > 60) keys.sort((a, b) => all[a].at - all[b].at).slice(0, keys.length - 60).forEach((k) => delete all[k]);
    store.set(all);
  }
  function showOsd(stay) {
    if (mode !== "vod") return;
    $("pOsd").classList.add("show"); clearTimeout(osdT);
    if (!stay) osdT = setTimeout(() => { if (yt && ytReady && yt.getPlayerState() === 1) $("pOsd").classList.remove("show"); }, 4000);
  }

  /* קדימה ואחורה: כל לחיצה 10 שניות; החזקה מאיצה ל-30 ואז ל-60. הקפיצה עצמה קורית כשעוזבים את המקש */
  let pendingSeek = null, seekRep = 0, seekT = null;
  function seekBy(dir, repeat) {
    if (!ytReady) return;
    seekRep = repeat ? seekRep + 1 : 0;
    const step = seekRep > 14 ? 60 : seekRep > 5 ? 30 : 10;
    const d = yt.getDuration() || 0, base = pendingSeek != null ? pendingSeek : yt.getCurrentTime();
    pendingSeek = Math.max(0, Math.min(d - 1, base + dir * step));
    const delta = pendingSeek - yt.getCurrentTime();
    $("pSeek").hidden = false; $("pSeek").textContent = (delta >= 0 ? "▶▶ +" : "◀◀ −") + fmt(Math.abs(delta));
    showOsd(); update(); commitSeekSoon();
  }
  function commitSeekSoon() { clearTimeout(seekT); seekT = setTimeout(commitSeek, 450); }
  function commitSeek() { if (pendingSeek == null) return; try { yt.seekTo(pendingSeek, true); } catch (e) {} pendingSeek = null; seekRep = 0; setTimeout(() => ($("pSeek").hidden = true), 300); }

  function toggle() { if (!ytReady) return; const st = yt.getPlayerState(); if (st === 1 || st === 3) yt.pauseVideo(); else { yt.playVideo(); $("pState").textContent = ""; showOsd(); } }
  function go(step, auto) {
    const n = idx + step;
    if (n < 0) { toast("זה הראשון ברשימה"); return; }
    if (n >= list.length) { if (mode === "vod") { toast("סיימתם את כל הרשימה"); closePlayer(); } else { idx = -1; go(1); } return; }
    save(true); idx = n;
    if (mode === "shorts") showShort(); else openPlayer();
  }
  function autoNext() {
    if (idx + 1 >= list.length) { showOsd(true); $("pState").textContent = "הסרטון הסתיים"; return; }
    showNext(true);
  }
  function showNext(countdown) {
    const v = list[idx + 1]; if (!v) { toast("זה האחרון ברשימה"); return; }
    $("pNextImg").src = thumb(v.id); $("pNextTitle").textContent = v.title;
    $("pNext").hidden = false; clearInterval(nextT);
    if (countdown) {
      nextLeft = 8; $("pNextCount").textContent = `מתחיל בעוד ${nextLeft} שניות, OK להתחיל עכשיו`;
      nextT = setInterval(() => { nextLeft--; $("pNextCount").textContent = `מתחיל בעוד ${nextLeft} שניות, OK להתחיל עכשיו`; if (nextLeft <= 0) { clearInterval(nextT); go(1, true); } }, 1000);
    } else $("pNextCount").textContent = "OK לצפייה, ▼ לביטול";
  }
  function hideNext() { clearInterval(nextT); $("pNext").hidden = true; }

  function playerKey(k, repeat) {
    if (S.tab === "shorts" && !S.player) return false;
    if (S.tab === "shorts" && S.area === "tabs") return false;
    if (mode === "shorts") {
      if (k === "down" || k === "next") { go(1); return true; }
      if (k === "up" || k === "prev") { if (idx === 0) { S.area = "tabs"; S.tabIdx = 1; paint(); return true; } go(-1); return true; }
      if (k === "ok" || k === "toggle") { toggle(); return true; }
      if (k === "left" || k === "right") { S.area = "tabs"; S.tabIdx = 1; paint(); return true; }
      if (k === "ff") { seekBy(1); return true; }
      if (k === "rw") { seekBy(-1); return true; }
      return true;
    }
    const nextOpen = !$("pNext").hidden;
    if (k === "ok") { if (nextOpen) { hideNext(); go(1); } else toggle(); return true; }
    if (k === "toggle") { toggle(); return true; }
    if (k === "right" || k === "ff") { seekBy(1, repeat); return true; }   // ציר הזמן תמיד משמאל לימין, כמו בכל נגן
    if (k === "left" || k === "rw") { seekBy(-1, repeat); return true; }
    if (k === "up" || k === "next") { if (k === "next") go(1); else { showOsd(); showNext(false); } return true; }
    if (k === "prev") { go(-1); return true; }
    if (k === "down") { if (nextOpen) hideNext(); else $("pOsd").classList.remove("show"); return true; }
    return true;
  }

  /* ---------- שורטס ---------- */
  function openShorts() {
    if (!shorts.length) { toast("השורטס נטענים..."); return; }
    mode = "shorts"; list = shorts; idx = Math.min(shortsIdx, list.length - 1);
    S.player = true; $("player").hidden = false; hideNext();
    showShort();
    clearInterval(tick); tick = setInterval(update, 1000);
  }
  function showShort() {
    shortsIdx = idx;
    const v = list[idx];
    $("shTitle").textContent = v.title.replace(/#\S+/g, "").trim() || v.title;
    $("shChan").textContent = CH[v.channel] || "";
    $("shCount").innerHTML = `<span>${idx + 1} מתוך ${list.length}</span>${v.views ? `<span>${views(v.views)}</span>` : ""}`;
    $("shPoster").style.opacity = 1; $("shPoster").src = thumb(v.id, "hqdefault"); $("shBg").src = thumb(v.id, "mqdefault");
    $("pLoading").hidden = false;
    ensurePlayer(v.id, 0);
    // טעינה מוקדמת של התמונה של הבא
    const n = list[idx + 1]; if (n) new Image().src = thumb(n.id, "hqdefault");
  }

  /* ---------- שעון ---------- */
  const clock = () => { const d = new Date(); $("clock").textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`; };
  clock(); setInterval(clock, 20000);

  /* ---------- עלייה ---------- */
  let booted = false;
  (async function boot() {
    let lib = [], pl = [];
    try { lib = (await getJson("/data/library.json")).videos || []; } catch (e) { try { lib = (await getJson("/api/library")).videos || []; } catch (e2) {} }
    try { pl = (await getJson("/data/playlists.json")).playlists || []; } catch (e) {}
    window.__lib = lib; window.__pl = pl;
    if (!lib.length) { $("boot").innerHTML = '<div style="font-size:2rem;text-align:center">אין חיבור לאינטרנט כרגע.<br>בדקו את החיבור ונסו שוב.</div>'; return; }
    rows = buildRows(lib, pl);
    const day = Math.floor(Date.now() / 864e5);
    const sh = lib.filter((v) => v.isShort);
    // שורטס: החדשים קודם, ואחריהם ערבוב יומי של כל השאר
    shorts = sh.slice(0, 20).concat(shuffle(sh.slice(20), day));
    renderRows();
    S.area = "rows"; paint();
    booted = true;
    $("boot").classList.add("gone"); setTimeout(() => ($("boot").hidden = true), 500);
    loadYT(); // מכינים את הנגן מראש כדי שהסרטון הראשון ייפתח מהר
  })();
  function shuffle(a, seed) { a = a.slice(); let s = seed >>> 0 || 1; const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  addEventListener("resize", () => paint());
  addEventListener("visibilitychange", () => { if (document.hidden) save(true); });
})();
