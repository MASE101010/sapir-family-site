/* משפחת ספיר - סקריפט משותף: ניווט, פוטר, נגישות, עזרי בלוג */
(function () {
  const S = window.SAPIR;
  const page = document.body.dataset.page || "";

  /* ---------- האפליקציה (Android TV / טלפון): ?app=tv או User-Agent של SapirApp ---------- */
  (function () {
    const q = new URLSearchParams(location.search).get("app");
    const ua = navigator.userAgent;
    let mode = q || (/SapirApp\/\S+ tv/.test(ua) ? "tv" : /SapirApp\//.test(ua) ? "phone" : "");
    try { if (q) sessionStorage.setItem("sapir-app", q); else if (!mode) mode = sessionStorage.getItem("sapir-app") || ""; } catch (e) {}
    if (!mode) return;
    window.SAPIR_APP = mode;
    document.body.classList.add("in-app", mode === "tv" ? "tv-app" : "phone-app");
    if (mode === "tv") document.body.classList.add("tv-nav");
  })();

  const ICONS = {
    youtube: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M23 7.1a3 3 0 0 0-2.1-2.1C19 4.5 12 4.5 12 4.5s-7 0-8.9.5A3 3 0 0 0 1 7.1 31 31 0 0 0 .5 12 31 31 0 0 0 1 16.9 3 3 0 0 0 3.1 19c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.3.5-4.9s-.1-3.3-.5-4.9zM9.8 15.5v-7l6 3.5-6 3.5z"/></svg>',
    instagram: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
    tiktok: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2.3 1.7 3.9 4 4.1v3.2c-1.5 0-2.9-.5-4-1.3v6.4a5.8 5.8 0 1 1-5.8-5.8c.3 0 .6 0 .9.1v3.3a2.6 2.6 0 1 0 1.7 2.4V3h3.2z"/></svg>',
    facebook: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M14 8h3V4h-3c-2.8 0-4.5 1.7-4.5 4.5V11H7v4h2.5v6h4v-6H17l.5-4h-4V8.8c0-.5.2-.8.5-.8z"/></svg>',
    play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',
    store: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M3.6 2.5 13 12l-9.4 9.5c-.4-.2-.6-.7-.6-1.2V3.7c0-.5.2-1 .6-1.2zm1.3-.4 10.9 6.2-2.3 2.3L4.9 2.1zm0 19.8 8.6-8.5 2.3 2.3L4.9 21.9zM20 10.2c.9.5 .9 1.9 0 2.4l-2.7 1.5L14.5 12l2.8-2.8 2.7 1.5z"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></svg>',
    a11y: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="4.5" r="2"/><path d="M20 8.5c-5.3 1.2-10.7 1.2-16 0l-.5 2c2 .5 4 .8 6 1v3l-2.5 7 2 .7 2.6-6.2h.8l2.6 6.2 2-.7-2.5-7v-3c2-.2 4-.5 6-1z"/></svg>'
  };
  window.SAPIR_ICONS = ICONS;

  /* ---------- ניווט ---------- */
  const NAV = [
    ["index.html", "בית", "home"],
    ["vod.html", "VOD", "vod"],
    ["shorts.html", "שורטס", "shorts"],
    ["videos.html", "הערוצים", "videos"],
    ["games.html", "משחקים", "games"],
    ["blog.html", "הבלוג", "blog"],
    ["tuli.html", "תולי האריה", "tuli"],
    ["shop.html", "החנות", "shop"],
    ["about.html", "מי אנחנו", "about"],
    ["brands.html", "למותגים", "brands"]
  ];

  /* ---------- רקע: אורורה, כוכבים, רעש, וילון מעבר ---------- */
  const bg = document.createElement("div");
  bg.innerHTML = `<div class="bg-aurora" aria-hidden="true"><span></span><span></span><span></span><span></span></div><canvas class="bg-stars" aria-hidden="true"></canvas><div class="bg-noise" aria-hidden="true"></div>`;
  while (bg.firstChild) document.body.prepend(bg.lastChild);

  const header = document.createElement("header");
  header.className = "site-header";
  header.innerHTML = `
    <div class="container nav">
      <a class="nav-logo" href="index.html" aria-label="משפחת ספיר - דף הבית">
        <img src="assets/img/logo-small.png" alt="לוגו משפחת ספיר" width="180" height="96">
      </a>
      <ul class="nav-links">
        ${NAV.map(([href, label, key]) => `<li><a href="${href}" ${page === key ? 'aria-current="page"' : ""}>${label}</a></li>`).join("")}
      </ul>
      <a class="btn btn-holo btn-sm nav-cta" href="shop.html">החנות שלנו</a>
      <button class="nav-toggle" aria-label="פתיחת תפריט" aria-expanded="false"><span></span><span></span><span></span></button>
    </div>`;
  document.body.prepend(header);
  const skip = document.createElement("a"); skip.className = "skip-link"; skip.href = "#main"; skip.textContent = "דילוג לתוכן";
  document.body.prepend(skip);
  const ld = document.createElement("script"); ld.type = "application/ld+json";
  ld.textContent = JSON.stringify({ "@context": "https://schema.org", "@type": "Organization", name: "משפחת ספיר", url: S.domain, logo: S.domain + "/assets/img/logo.png", email: S.email, sameAs: S.social.map(x => x.url) });
  document.head.append(ld);

  /* ניווט תחתון במובייל */
  const TAB_ICONS = {
    home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 11 12 3l9 8v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/></svg>',
    vod: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="3"/><path d="M10 9l5 3-5 3z" fill="currentColor"/></svg>',
    shorts: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="7" y="2" width="10" height="20" rx="3"/><path d="M10.5 9.5l4 2.5-4 2.5z" fill="currentColor"/></svg>',
    games: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="7" width="20" height="11" rx="5"/><path d="M7 11v3M5.5 12.5h3M15.5 11.5h.01M18 13.5h.01"/></svg>',
    blog: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 4h16v16H4zM8 9h8M8 13h8M8 17h5"/></svg>',
    tuli: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="13" r="6"/><path d="M5 8l2-4 3 3M19 8l-2-4-3 3M9.5 13h.01M14.5 13h.01M10.5 16c.8.7 2.2.7 3 0"/></svg>'
  };
  const tabbar = document.createElement("nav"); tabbar.className = "tabbar"; tabbar.setAttribute("aria-label", "ניווט מהיר");
  const TAB_KEYS = ["home", "vod", "shorts", "games", "blog"];
  tabbar.innerHTML = NAV.filter(n => TAB_KEYS.includes(n[2])).map(([href, label, key]) => `<a href="${href}" ${page === key ? 'aria-current="page"' : ""}><span class="ti">${TAB_ICONS[key]}</span><span>${label}</span></a>`).join("");
  document.body.append(tabbar);
  const nav = header.querySelector(".nav");
  header.querySelector(".nav-toggle").addEventListener("click", (e) => {
    const open = nav.classList.toggle("open");
    e.currentTarget.setAttribute("aria-expanded", open);
  });

  /* ---------- פוטר ---------- */
  const footer = document.createElement("footer");
  footer.className = "site-footer";
  footer.innerHTML = `
    <div class="container">
      <div class="footer-grid">
        <div>
          <img class="footer-logo" src="assets/img/logo-small.png" alt="" width="190">
          <p style="color:rgba(255,255,255,.75);max-width:34ch">הבית של משפחת ספיר ברשת: סרטונים, משחקים, תולי האריה ובלוג יומי להורים ולילדים.</p>
          <div class="social-row" style="margin-top:10px">
            ${S.social.map(s => `<a href="${s.url}" target="_blank" rel="noopener" style="background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#fff">${ICONS[s.id]}${s.label}</a>`).join("")}
          </div>
        </div>
        <div>
          <h4>באתר</h4>
          <ul>${NAV.slice(1).map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join("")}</ul>
        </div>
        <div>
          <h4>עוד</h4>
          <ul>
            <li><a href="shop.html">החנות שלנו</a></li>
            <li><a href="contact.html">צור קשר</a></li>
            <li><a href="brands.html">שיתופי פעולה</a></li>
          </ul>
        </div>
        <div>
          <h4>משפטי</h4>
          <ul>
            <li><a href="privacy.html">מדיניות פרטיות</a></li>
            <li><a href="terms.html">תנאי שימוש</a></li>
            <li><a href="accessibility.html">הצהרת נגישות</a></li>
            <li><a href="#" onclick="window.SAPIR_RESET_CONSENT();return false;">הגדרות עוגיות</a></li>
          </ul>
        </div>
      </div>
      <div class="footer-bottom">
        <span>© ${new Date().getFullYear()} משפחת ספיר. כל הזכויות שמורות.</span>
        <span>נבנה באהבה בישראל</span>
      </div>
    </div>`;
  document.body.append(footer);

  /* ---------- נגישות (לפי ת"י 5568 / WCAG 2.1 AA) ---------- */
  const a11yBtn = document.createElement("button");
  a11yBtn.className = "a11y-btn"; a11yBtn.setAttribute("aria-label", "תפריט נגישות"); a11yBtn.setAttribute("aria-expanded", "false"); a11yBtn.setAttribute("aria-controls", "a11y-panel");
  a11yBtn.innerHTML = ICONS.a11y;
  const panel = document.createElement("div");
  panel.className = "a11y-panel"; panel.id = "a11y-panel"; panel.setAttribute("role", "dialog"); panel.setAttribute("aria-label", "אפשרויות נגישות");
  const OPTS = [["a11y-big", "הגדלת טקסט"], ["a11y-bigger", "טקסט גדול מאוד"], ["a11y-contrast", "ניגודיות גבוהה"], ["a11y-gray", "גווני אפור"], ["a11y-links", "הדגשת קישורים"], ["a11y-font", "גופן קריא"], ["a11y-cursor", "סמן גדול"], ["a11y-nomotion", "עצירת אנימציות"]];
  panel.innerHTML = `<div class="a11y-head"><strong>נגישות</strong><button class="a11y-close" aria-label="סגירת תפריט נגישות">✕</button></div>` +
    OPTS.map(([c, l]) => `<button data-cls="${c}" aria-pressed="false">${l}</button>`).join("") +
    `<button data-reset style="color:#ff9ae6">איפוס הגדרות</button><a href="accessibility.html">הצהרת נגישות</a>`;
  document.body.append(a11yBtn, panel);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem("sapir-a11y") || "{}"); } catch (e) {}
  const applyA11y = () => { OPTS.forEach(([c]) => document.body.classList.toggle(c, !!saved[c])); panel.querySelectorAll("button[data-cls]").forEach(b => b.setAttribute("aria-pressed", !!saved[b.dataset.cls])); };
  applyA11y();
  panel.addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.cls) { const c = b.dataset.cls; saved[c] = !saved[c]; if (c === "a11y-big" && saved[c]) saved["a11y-bigger"] = false; if (c === "a11y-bigger" && saved[c]) saved["a11y-big"] = false; }
    else if (b.hasAttribute("data-reset")) saved = {};
    else if (b.classList.contains("a11y-close")) { panel.classList.remove("open"); a11yBtn.setAttribute("aria-expanded", "false"); a11yBtn.focus(); return; }
    applyA11y();
    try { localStorage.setItem("sapir-a11y", JSON.stringify(saved)); } catch (err) {}
  });
  a11yBtn.addEventListener("click", () => { const open = panel.classList.toggle("open"); a11yBtn.setAttribute("aria-expanded", open); if (open) panel.querySelector("button[data-cls]").focus(); });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && panel.classList.contains("open")) { panel.classList.remove("open"); a11yBtn.setAttribute("aria-expanded", "false"); } });

  /* ---------- הסכמה לעוגיות (חוק הגנת הפרטיות, תיקון 13 + פרסומות) ---------- */
  let consent = null;
  try { consent = JSON.parse(localStorage.getItem("sapir-consent") || "null"); } catch (e) {}
  window.SAPIR_CONSENT = consent;
  const loadAds = () => { if (window.SAPIR_CONSENT && window.SAPIR_CONSENT.ads && typeof window.SAPIR_LOAD_ADS === "function") window.SAPIR_LOAD_ADS(); };
  if (!consent) {
    const cb = document.createElement("div"); cb.className = "cookie-bar"; cb.setAttribute("role", "region"); cb.setAttribute("aria-label", "הודעה על שימוש בעוגיות");
    cb.innerHTML = `<div class="cookie-text"><strong>עוגיות באתר</strong> אנחנו משתמשים בעוגיות הכרחיות לתפעול האתר, ובהסכמתכם גם בעוגיות של YouTube ושל פרסומות מותאמות. אפשר לשנות את הבחירה בכל זמן בתחתית העמוד. <a href="privacy.html">למדיניות הפרטיות</a></div>
      <div class="cookie-actions"><button class="btn btn-ink btn-sm" data-c="all">מאשר/ת הכול</button><button class="btn btn-ghost btn-sm" data-c="essential">רק הכרחיות</button></div>`;
    document.body.append(cb);
    cb.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-c]"); if (!b) return;
      consent = { ads: b.dataset.c === "all", media: b.dataset.c === "all", date: new Date().toISOString() };
      window.SAPIR_CONSENT = consent;
      try { localStorage.setItem("sapir-consent", JSON.stringify(consent)); } catch (err) {}
      cb.classList.add("bye"); setTimeout(() => cb.remove(), 400); loadAds();
    });
  } else loadAds();
  window.SAPIR_RESET_CONSENT = () => { try { localStorage.removeItem("sapir-consent"); } catch (e) {} location.reload(); };

  /* ---------- אפקטים ---------- */
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // כוכבים נוצצים
  const canvas = document.querySelector(".bg-stars");
  const lowPower = matchMedia("(max-width: 900px)").matches || navigator.hardwareConcurrency <= 4;
  if (canvas && !reduced && page !== "shorts") {
    const ctx = canvas.getContext("2d");
    let stars = [], w, h;
    const resize = () => {
      w = canvas.width = innerWidth; h = canvas.height = innerHeight;
      stars = Array.from({ length: Math.min(160, Math.floor(w * h / 9000)) }, () => ({
        x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.4 + 0.3,
        t: Math.random() * Math.PI * 2, s: Math.random() * 0.02 + 0.005, v: Math.random() * 0.15 + 0.03
      }));
    };
    resize(); addEventListener("resize", resize);
    let last = 0;
    const tick = (now) => {
      requestAnimationFrame(tick);
      if (document.hidden || now - last < (lowPower ? 50 : 16)) return; last = now; // 20fps בנייד, 60 במחשב
      ctx.clearRect(0, 0, w, h);
      for (const s of stars) {
        s.t += s.s; s.y -= s.v; if (s.y < -4) { s.y = h + 4; s.x = Math.random() * w; }
        const a = 0.35 + Math.sin(s.t) * 0.35;
        ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fill();
      }
    };
    requestAnimationFrame(tick);
  }

  // זיקוקים קטנים סביב הסמן + לוגו SWOOSH במעבר עמוד
  const fx = document.createElement("canvas"); fx.className = "fx-canvas"; fx.setAttribute("aria-hidden", "true");
  document.body.append(fx);
  const fctx = fx.getContext("2d");
  let parts = [], fw = 0, fh = 0, fxRunning = false;
  const fxResize = () => { fw = fx.width = innerWidth; fh = fx.height = innerHeight; };
  fxResize(); addEventListener("resize", fxResize);
  const COLORS = ["#28d7ff", "#7b5cff", "#ff4fd1", "#ffe14d", "#4df5c3", "#ffffff"];
  const fxLoop = () => {
    fctx.clearRect(0, 0, fw, fh);
    parts = parts.filter(p => p.life > 0);
    for (const p of parts) {
      p.life -= p.decay; p.x += p.vx; p.y += p.vy; p.vy += p.g; p.vx *= 0.96; p.vy *= 0.96; p.rot += p.vr;
      fctx.save(); fctx.globalAlpha = Math.max(0, p.life); fctx.translate(p.x, p.y); fctx.rotate(p.rot);
      fctx.fillStyle = p.c; fctx.shadowColor = p.c; fctx.shadowBlur = 10;
      if (p.shape) { // כוכב קטן
        fctx.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? p.r * 0.4 : p.r, a = i * Math.PI / 4; fctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); } fctx.closePath(); fctx.fill();
      } else { fctx.beginPath(); fctx.arc(0, 0, p.r, 0, Math.PI * 2); fctx.fill(); }
      fctx.restore();
    }
    if (parts.length) requestAnimationFrame(fxLoop); else fxRunning = false;
  };
  const spawn = (x, y, n, power) => {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = (Math.random() * 0.7 + 0.3) * power;
      parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * 0.25, g: 0.06, r: Math.random() * 3 + 1.5,
        rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3, life: 1, decay: Math.random() * 0.025 + 0.015,
        c: COLORS[Math.floor(Math.random() * COLORS.length)], shape: Math.random() < 0.5 });
    }
    if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
  };
  if (!reduced) {
    // שובל עדין אחרי העכבר
    let last = 0;
    addEventListener("pointermove", (e) => {
      if (e.pointerType !== "mouse") return;
      const t = performance.now(); if (t - last < 70) return; last = t;
      parts.push({ x: e.clientX + (Math.random() - 0.5) * 10, y: e.clientY + (Math.random() - 0.5) * 10, vx: (Math.random() - 0.5) * 0.6, vy: -Math.random() * 0.8 - 0.2, g: 0.01,
        r: Math.random() * 1.6 + 0.8, rot: 0, vr: 0.1, life: 0.9, decay: 0.03, c: COLORS[Math.floor(Math.random() * COLORS.length)], shape: Math.random() < 0.3 });
      if (!fxRunning) { fxRunning = true; requestAnimationFrame(fxLoop); }
    }, { passive: true });
    // זיקוק קטן בכל לחיצה
    addEventListener("pointerdown", (e) => spawn(e.clientX, e.clientY, 22, 5), { passive: true });
  }

  // חשיפה בגלילה
  const io = new IntersectionObserver((entries) => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
  const observeReveals = () => {
    document.querySelectorAll(".section-head, .tuli-band, .cta-band, .stats-strip, .with-side, .page-head, .prose, .post-body, .post-hero").forEach(el => { if (!el.classList.contains("reveal")) { el.classList.add("reveal"); io.observe(el); } });
    document.querySelectorAll(".grid, .games-list, .series, .steps, .audience, .timeline, .kv").forEach(el => { if (!el.classList.contains("reveal-stagger")) { el.classList.add("reveal-stagger"); io.observe(el); } });
  };
  observeReveals();
  // רשת ביטחון: שום דבר לא נשאר שקוף אם ה-observer לא הספיק (טאב ברקע, דפדפנים ישנים)
  const revealVisible = () => document.querySelectorAll(".reveal:not(.in), .reveal-stagger:not(.in)").forEach(el => { const r = el.getBoundingClientRect(); if (r.top < innerHeight + 40 && r.bottom > -40) el.classList.add("in"); });
  setTimeout(revealVisible, 1500); setTimeout(revealVisible, 4000);
  addEventListener("scroll", () => { if (!revealVisible.t) revealVisible.t = setTimeout(() => { revealVisible.t = 0; revealVisible(); }, 400); }, { passive: true });
  new MutationObserver(observeReveals).observe(document.querySelector("main") || document.body, { childList: true, subtree: true });

  // זרקור והטיה בהירו
  const hero = document.querySelector(".hero");
  if (hero && !reduced && matchMedia("(pointer: fine)").matches) {
    const spot = document.createElement("div"); spot.className = "spot"; hero.prepend(spot);
    const frame = hero.querySelector(".hero-photo .frame");
    hero.addEventListener("mousemove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
      hero.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      if (frame) {
        const fr = frame.getBoundingClientRect();
        const dx = (e.clientX - (fr.left + fr.width / 2)) / fr.width, dy = (e.clientY - (fr.top + fr.height / 2)) / fr.height;
        frame.style.transform = `rotate(-2.5deg) rotateY(${dx * 14}deg) rotateX(${-dy * 14}deg)`;
      }
    });
    hero.addEventListener("mouseleave", () => { if (frame) frame.style.transform = ""; });
  }

  // מונים שעולים
  const countUp = (el) => {
    const raw = el.textContent.trim(); const m = raw.match(/^([^\d]*)([\d.]+)(.*)$/); if (!m) return;
    const [, pre, numStr, suf] = m; const target = parseFloat(numStr); const dec = (numStr.split(".")[1] || "").length;
    const t0 = performance.now(), dur = 1400;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = pre + (target * e).toFixed(dec) + suf;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };
  const cio = new IntersectionObserver((entries) => { entries.forEach(en => { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } }); }, { threshold: 0.5 });
  const observeNums = () => document.querySelectorAll(".stat .num, .kv .num, .audience .num, .float-badge b, .numbers .num").forEach(el => { if (!el.dataset.c) { el.dataset.c = 1; if (!reduced) cio.observe(el); } });
  observeNums(); setTimeout(observeNums, 500);

  // כותרת בגלילה + חזרה למעלה
  const toTop = document.createElement("button"); toTop.className = "to-top"; toTop.setAttribute("aria-label", "חזרה למעלה");
  toTop.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
  toTop.addEventListener("click", () => scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" }));
  document.body.append(toTop);
  const onScroll = () => { header.classList.toggle("scrolled", scrollY > 30); toTop.classList.toggle("show", scrollY > 600); };
  addEventListener("scroll", onScroll, { passive: true }); onScroll();

  // הטיית תלת-ממד לכרטיסים (דסקטופ בלבד)
  if (!reduced && matchMedia("(pointer: fine)").matches) {
    document.addEventListener("pointermove", (e) => {
      const c = e.target.closest(".card.tilt, a.card, .game-row, .float-badge");
      if (!c || c.classList.contains("channel-card")) return;
      const r = c.getBoundingClientRect();
      const dx = (e.clientX - r.left) / r.width - 0.5, dy = (e.clientY - r.top) / r.height - 0.5;
      c.style.setProperty("--rx", (-dy * 8) + "deg"); c.style.setProperty("--ry", (dx * 10) + "deg");
      c.style.setProperty("--gx", (dx * 100 + 50) + "%"); c.style.setProperty("--gy", (dy * 100 + 50) + "%");
      c.classList.add("tilting");
    }, { passive: true });
    document.addEventListener("pointerout", (e) => { const c = e.target.closest(".tilting"); if (c && !c.contains(e.relatedTarget)) { c.classList.remove("tilting"); c.style.removeProperty("--rx"); c.style.removeProperty("--ry"); } }, { passive: true });
  }

  // פס התקדמות קריאה
  const prog = document.createElement("div"); prog.className = "scroll-progress"; prog.setAttribute("aria-hidden", "true");
  document.body.append(prog);
  const upd = () => { const h = document.documentElement; const p = h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight); prog.style.transform = `scaleX(${p})`; };
  addEventListener("scroll", upd, { passive: true }); upd();

  /* ---------- סרטונים: RSS של יוטיוב דרך /api/videos ---------- */
  const vcache = {};
  window.channelIdOf = (c) => c.channelId || (c.playlistId && c.playlistId.startsWith("UU") ? "UC" + c.playlistId.slice(2) : "");
  window.fetchChannelVideos = async function (channelId) {
    if (!channelId) throw new Error("no channel");
    if (vcache[channelId]) return vcache[channelId];
    const res = await fetch(`/api/videos?channel=${encodeURIComponent(channelId)}`, { cache: "no-store" });
    if (!res.ok) throw new Error("api " + res.status);
    const data = await res.json();
    if (!data.videos || !data.videos.length) throw new Error("empty");
    vcache[channelId] = data.videos;
    return data.videos;
  };
  window.fmtViews = (n) => !n ? "" : n >= 1e6 ? (n / 1e6).toFixed(1).replace(/\.0$/, "") + "M צפיות" : n >= 1e3 ? Math.round(n / 1e3) + "K צפיות" : n + " צפיות";
  window.videoCard = (v, cls = "") => `
    <button class="vcard ${cls}" type="button" data-video="${v.id}" data-title="${(v.title || "").replace(/"/g, "&quot;")}" aria-label="נגן: ${(v.title || "").replace(/"/g, "&quot;")}">
      <span class="vthumb">${(() => { const p = window.videoPos && window.videoPos(v.id); return p ? `<span class="vprog" style="width:${Math.round(p.t / p.d * 100)}%"></span>` : ""; })()}${cls.includes("vshort") ? `<img src="https://i.ytimg.com/vi/${v.id}/oardefault.jpg" onerror="this.onerror=null;this.src='${v.thumb}'" alt="" loading="lazy">` : `<img src="${v.thumb}" alt="" loading="lazy">`}<span class="vplay">${ICONS.play}</span>${v.views ? `<small>${window.fmtViews(v.views)}</small>` : ""}</span>
      <span class="vtitle">${v.title || ""}</span>
      ${v.published ? `<span class="vdate">${window.fmtDate(v.published.slice(0, 10))}</span>` : ""}
    </button>`;
  /* פוסטר עם כפתור נגינה: התמונה עולה מיד, נגן יוטיוב נטען רק בלחיצה (מהיר, ועובד גם כשההטמעה איטית) */
  window.posterPlayer = (v) => `
    <div class="poster-play" role="button" tabindex="0" data-video="${v.id}" data-title="${(v.title || "").replace(/"/g, "&quot;")}" aria-label="נגן: ${(v.title || "").replace(/"/g, "&quot;")}">
      <img src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" srcset="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg 480w, https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg 1280w" sizes="(max-width: 900px) 100vw, 60vw" alt="">
      <span class="pp-btn">${ICONS.play}</span>
    </div>`;
  document.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.classList && e.target.classList.contains("poster-play")) e.target.click(); });
  document.addEventListener("click", (e) => {
    const b = e.target.closest(".poster-play"); if (!b) return;
    const frame = b.parentElement;
    frame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${b.dataset.video}?autoplay=1&rel=0&playsinline=1" title="${b.dataset.title}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
  });
  /* מועדפים: נשמרים במכשיר (localStorage), בלי חשבון */
  const FAV_KEY = "sapir-favs";
  const readFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); } catch (e) { return []; } };
  window.favs = {
    list: readFavs,
    has: (id) => readFavs().includes(id),
    toggle: (id) => { const f = readFavs().filter(x => x !== id); const on = !readFavs().includes(id); if (on) f.unshift(id); try { localStorage.setItem(FAV_KEY, JSON.stringify(f.slice(0, 200))); } catch (e) {} document.dispatchEvent(new CustomEvent("favs:changed", { detail: { id, on } })); return on; }
  };
  const HEART = '<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9A5.3 5.3 0 0 1 12 6.3 5.3 5.3 0 0 1 21.5 12c-2 4.4-9.5 9-9.5 9z"/></svg>';
  window.favButton = (id, cls = "") => `<span class="fav-btn ${cls} ${window.favs.has(id) ? "on" : ""}" role="button" tabindex="0" data-fav="${id}" aria-label="${window.favs.has(id) ? "הסרה מהמועדפים" : "שמירה במועדפים"}" aria-pressed="${window.favs.has(id)}">${HEART}</span>`; // span ולא button: יושב גם בתוך כפתורי כרטיסים
  document.addEventListener("keydown", (e) => { if ((e.key === "Enter" || e.key === " ") && e.target.classList && e.target.classList.contains("fav-btn")) { e.preventDefault(); e.stopPropagation(); e.target.click(); } }, true);
  document.addEventListener("click", (e) => { const b = e.target.closest(".fav-btn"); if (!b) return; e.preventDefault(); e.stopPropagation(); const on = window.favs.toggle(b.dataset.fav); b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); b.setAttribute("aria-label", on ? "הסרה מהמועדפים" : "שמירה במועדפים"); b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop"); }, true);

  // נגן צף
  const modal = document.createElement("div"); modal.className = "vmodal"; modal.setAttribute("role", "dialog"); modal.setAttribute("aria-modal", "true"); modal.setAttribute("aria-label", "נגן וידאו"); modal.hidden = true;
  modal.innerHTML = `<div class="vmodal-box"><button class="vclose" aria-label="סגירה">✕</button><div class="video-frame" id="vmodal-frame"></div><div class="vmodal-bar"><div class="vmodal-title" id="vmodal-title"></div><div class="vmodal-acts"><button class="btn btn-ink btn-sm" id="vmodal-next" hidden>הפרק הבא ◀</button><span id="vmodal-fav"></span><button class="btn btn-ghost btn-sm" id="vmodal-share">שיתוף</button><a class="btn btn-ghost btn-sm" id="vmodal-yt" href="#" target="_blank" rel="noopener">${ICONS.youtube} ביוטיוב</a></div></div><div class="vmodal-more" id="vmodal-more"></div></div>`;
  document.body.append(modal);
  /* המשך מאותה נקודה: הזמן נשמר במכשיר כל 5 שניות, ומתחילים ממנו בפעם הבאה (לא בשורטס) */
  const POS_KEY = "sapir-pos";
  const readPos = () => { try { return JSON.parse(localStorage.getItem(POS_KEY) || "{}"); } catch (e) { return {}; } };
  window.videoPos = (id) => { const p = readPos()[id]; return p && p.d ? p : null; };
  const savePos = (id, t, d) => { try { const all = readPos(); if (!d) return; if (t > d - 20 || t < 8) delete all[id]; else all[id] = { t: Math.floor(t), d: Math.floor(d) }; const keys = Object.keys(all); if (keys.length > 60) delete all[keys[0]]; localStorage.setItem(POS_KEY, JSON.stringify(all)); } catch (e) {} };
  let ytApi = null;
  const ensureYT = () => ytApi || (ytApi = new Promise(res => { if (window.YT && YT.Player) return res(); const prev = window.onYouTubeIframeAPIReady; window.onYouTubeIframeAPIReady = () => { prev && prev(); res(); }; if (!document.querySelector('script[src*="iframe_api"]')) { const sc = document.createElement("script"); sc.src = "https://www.youtube.com/iframe_api"; sc.async = true; document.head.append(sc); } const poll = setInterval(() => { if (window.YT && YT.Player) { clearInterval(poll); res(); } }, 300); }));
  let mPlayer = null, mId = null, mTimer = 0;
  const flushPos = () => { if (!mPlayer || !mId) return; try { savePos(mId, mPlayer.getCurrentTime(), mPlayer.getDuration()); } catch (e) {} };
  window.__sapirBack = () => { if (!modal.hidden) { closeV(); return true; } const g = document.getElementById("sgrid"); if (g && !g.hidden && window.__closeGrid) { window.__closeGrid(); return true; } return false; };
  window.__sapirMedia = (what) => { if (!mPlayer || modal.hidden) return false; try { const st = mPlayer.getPlayerState(); if (what === "toggle") st === 1 ? mPlayer.pauseVideo() : mPlayer.playVideo(); else if (what === "ff") mPlayer.seekTo(mPlayer.getCurrentTime() + 10, true); else if (what === "rw") mPlayer.seekTo(Math.max(0, mPlayer.getCurrentTime() - 10), true); } catch (e) {} return true; };
  const closeV = () => { flushPos(); clearInterval(mTimer); mTimer = 0; try { mPlayer && mPlayer.destroy(); } catch (e) {} mPlayer = null; mId = null; modal.hidden = true; document.getElementById("vmodal-frame").innerHTML = ""; document.body.style.overflow = ""; };
  const fmtT = (sec) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  window.openVideo = (id, title) => {
    if (mPlayer) { flushPos(); clearInterval(mTimer); try { mPlayer.destroy(); } catch (e) {} mPlayer = null; }
    try { const seen = JSON.parse(localStorage.getItem("sapir-seen") || "[]").filter(x => x !== id); seen.unshift(id); localStorage.setItem("sapir-seen", JSON.stringify(seen.slice(0, 12))); } catch (e) {}
    const frame = document.getElementById("vmodal-frame"); frame.innerHTML = `<div id="vmodal-yt"></div>`;
    const pos = window.videoPos(id); mId = id;
    ensureYT().then(() => {
      if (mId !== id) return;
      mPlayer = new YT.Player("vmodal-yt", { host: "https://www.youtube.com", videoId: id, width: "100%", height: "100%",
        playerVars: { autoplay: 1, rel: 0, playsinline: 1, modestbranding: 1, start: pos ? pos.t : 0, origin: location.origin },
        events: { onReady: () => { try { mPlayer.playVideo(); } catch (e) {} }, onStateChange: (e) => { if (e.data === 0) savePos(id, 1e9, 1e9 + 1); } } });
      clearInterval(mTimer); mTimer = setInterval(flushPos, 5000);
      if (pos) { const tip = document.createElement("div"); tip.className = "resume-tip"; tip.innerHTML = `ממשיכים מ-${fmtT(pos.t)} <button type="button">מההתחלה</button>`; frame.append(tip); tip.querySelector("button").addEventListener("click", () => { try { mPlayer.seekTo(0, true); } catch (e) {} tip.remove(); }); setTimeout(() => tip.remove(), 6000); }
    });
    document.getElementById("vmodal-title").textContent = title || "";
    document.getElementById("vmodal-yt").href = `https://www.youtube.com/watch?v=${id}`;
    document.getElementById("vmodal-fav").innerHTML = window.favButton(id, "fav-pill");
    const more = document.getElementById("vmodal-more"); more.innerHTML = ""; delete more.dataset.series;
    const nextBtn = document.getElementById("vmodal-next"); nextBtn.hidden = true;
    if (window.loadPlaylists) window.loadPlaylists().then(() => { // סדרה: כפתור לפרק הבא + שאר הפרקים
      const sr = window.seriesOf && window.seriesOf(id); if (!sr) return;
      const idx = sr.items.findIndex(i => i.id === id), nx = sr.items[idx + 1];
      document.getElementById("vmodal-title").textContent = `${sr.title}, ${sr.items[idx].label}: ${title || ""}`;
      if (nx) { nextBtn.hidden = false; nextBtn.onclick = () => window.openVideo(nx.id, nx.title); }
      const rest = sr.items.filter((_, k) => k !== idx).slice(Math.max(0, idx - 2), Math.max(0, idx - 2) + 8);
      more.innerHTML = `<div class="vmodal-more-title">עוד פרקים מ${sr.title}</div><div class="vmodal-strip">${rest.map(i => window.videoCard({ id: i.id, title: `${i.label}: ${i.title}`, thumb: `https://i.ytimg.com/vi/${i.id}/hqdefault.jpg` }, "vmini")).join("")}</div>`;
      more.dataset.series = "1";
    });
    if (window.loadLibrary) window.loadLibrary().then(lib => { // עוד מאותו ערוץ
      const cur = lib.find(v => v.id === id); if (!cur) return;
      const rel = lib.filter(v => v.channel === cur.channel && !v.isShort && v.id !== id).slice(0, 6);
      if (rel.length && !more.dataset.series) more.innerHTML = `<div class="vmodal-more-title">עוד סרטונים</div><div class="vmodal-strip">${rel.map(v => window.videoCard(v, "vmini")).join("")}</div>`;
      modal.querySelector(".vmodal-box").scrollTop = 0;
    }).catch(() => {});
    modal.hidden = false; document.body.style.overflow = "hidden"; modal.querySelector(".vclose").focus();
  };
  modal.addEventListener("click", (e) => { if (e.target === modal || e.target.closest(".vclose")) closeV(); });
  document.getElementById("vmodal-share").addEventListener("click", async () => {
    const vid = mId; if (!vid) return;
    const url = `${location.origin}${location.pathname.replace(/[^/]*$/, "")}vod.html?v=${vid}`, title = document.getElementById("vmodal-title").textContent;
    try { if (navigator.share) await navigator.share({ title, url }); else { await navigator.clipboard.writeText(url); const b = document.getElementById("vmodal-share"); b.textContent = "הקישור הועתק"; setTimeout(() => b.textContent = "שיתוף", 1500); } } catch (e) {}
  });
  addEventListener("keydown", (e) => { if (e.key === "Escape" && !modal.hidden) closeV(); });
  addEventListener("pagehide", flushPos); document.addEventListener("visibilitychange", () => { if (document.hidden) flushPos(); });
  document.addEventListener("click", (e) => { const b = e.target.closest(".vcard"); if (!b) return; if (b.classList.contains("vshort")) location.href = `shorts.html?v=${b.dataset.video}`; else window.openVideo(b.dataset.video, b.dataset.title); });

  // "הוסיפו למסך הבית": הצעה עדינה פעם אחת, אחרי שני ביקורים, רק כשהדפדפן מאפשר התקנה
  let installEvt = null;
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); installEvt = e;
    try {
      const visits = (+localStorage.getItem("sapir-visits") || 0) + 1; localStorage.setItem("sapir-visits", visits);
      if (visits < 2 || localStorage.getItem("sapir-install-dismissed") || page === "shorts" || window.SAPIR_APP) return;
    } catch (x) { return; }
    const bar = document.createElement("div"); bar.className = "install-bar"; bar.setAttribute("role", "dialog"); bar.setAttribute("aria-label", "התקנת האפליקציה");
    bar.innerHTML = `<img src="assets/img/icon-192.png" alt=""><div><b>משפחת ספיר כאפליקציה</b><small>מסך מלא, פתיחה מהירה, בלי חנות</small></div><button class="btn btn-ink btn-sm" id="install-yes">הוספה</button><button class="install-x" id="install-no" aria-label="לא עכשיו">✕</button>`;
    document.body.append(bar);
    document.getElementById("install-yes").addEventListener("click", async () => { bar.remove(); if (installEvt) { installEvt.prompt(); try { await installEvt.userChoice; } catch (x) {} installEvt = null; } });
    document.getElementById("install-no").addEventListener("click", () => { bar.remove(); try { localStorage.setItem("sapir-install-dismissed", "1"); } catch (x) {} });
  });

  // Service Worker: קבצי האתר נשמרים במכשיר, כניסה חוזרת מיידית (כמו אפליקציה)
  if ("serviceWorker" in navigator && location.protocol === "https:") addEventListener("load", () => {
    if (location.search.includes("nosw")) { navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister())); return; } // לאבחון
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });

  /* ---------- ניווט בשלט / מקלדת (טלוויזיות חכמות): חצים בין כרטיסים, Enter פותח ---------- */
  (function () {
    const FOCUSABLE = ".tile, .vcard, a.card, .btn, .tab, .nav-links a, .tabbar a, .poster-play, .post-card, .channel-card";
    let tv = false;
    const enableTv = () => { if (!tv) { tv = true; document.body.classList.add("tv-nav"); } };
    const items = () => [...document.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null && !el.closest("[hidden]"));
    const center = (r) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    const pick = (dir) => { // הכרטיס הקרוב ביותר בכיוון המבוקש
      const cur = document.activeElement; if (!cur || cur === document.body) return items()[0];
      const cr = cur.getBoundingClientRect(), c = center(cr); let best = null, bestD = Infinity;
      for (const el of items()) { if (el === cur) continue; const r = el.getBoundingClientRect(), p = center(r);
        const dx = p.x - c.x, dy = p.y - c.y;
        const ok = dir === "left" ? dx < -8 && Math.abs(dy) < Math.max(cr.height, r.height) : dir === "right" ? dx > 8 && Math.abs(dy) < Math.max(cr.height, r.height) : dir === "up" ? dy < -8 : dy > 8;
        if (!ok) continue;
        const d = (dir === "up" || dir === "down") ? Math.abs(dy) * 1 + Math.abs(dx) * 2.2 : Math.abs(dx) + Math.abs(dy) * 3;
        if (d < bestD) { bestD = d; best = el; } }
      return best;
    };
    addEventListener("keydown", (e) => {
      if (page === "shorts" || e.target.matches("input, textarea, select") || e.altKey || e.metaKey || e.ctrlKey) return;
      const modal = document.querySelector(".vmodal:not([hidden])");
      const map = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" };
      if (map[e.key]) {
        enableTv();
        if (modal && !modal.contains(document.activeElement)) { const f = modal.querySelector(".vcard, .btn"); if (f) f.focus(); e.preventDefault(); return; }
        const n = pick(map[e.key]); if (n) { e.preventDefault(); n.focus({ preventScroll: true }); n.scrollIntoView({ block: "center", inline: "center", behavior: "smooth" }); }
      } else if (e.key === "Enter" && document.activeElement && document.activeElement.matches(FOCUSABLE)) { if (document.activeElement.tagName !== "A") { e.preventDefault(); document.activeElement.click(); } }
      else if (e.key === "Backspace" && modal) { e.preventDefault(); modal.querySelector(".vclose").click(); }
    });
    if (window.SAPIR_APP === "tv") { enableTv(); addEventListener("DOMContentLoaded", () => { const f = items()[0]; if (f && document.activeElement === document.body) f.focus({ preventScroll: true }); }); }
    else addEventListener("pointerdown", () => { if (tv) { tv = false; document.body.classList.remove("tv-nav"); } }, { passive: true });
  })();

  /* ---------- עזרי בלוג ---------- */
  const HE_MONTHS = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
  window.fmtDate = (iso) => {
    const [y, m, d] = iso.split("-").map(Number);
    return `${d} ב${HE_MONTHS[m - 1]} ${y}`;
  };
  window.todayISO = () => {
    const now = new Date();
    const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
  };
  /* מחזיר רק פוסטים שתאריכם הגיע ושאושרו - כך אפשר להכין פוסטים מראש וכל יום עולה אחד */
  window.loadPosts = async function () {
    const res = await fetch("data/posts.json", { cache: "no-store" });
    const all = await res.json();
    const today = window.todayISO();
    return all
      .filter(p => p.status === "published" && p.date <= today)
      .sort((a, b) => (a.date < b.date ? 1 : -1));
  };
  window.postCard = function (p) {
    const cover = p.audience === "kids" ? "cover-kids" : "cover-parents";
    const badge = p.audience === "kids" ? '<span class="badge badge-kids">לילדים</span>' : '<span class="badge badge-parents">להורים</span>';
    return `
      <a class="card post-card" href="post.html?id=${encodeURIComponent(p.id)}">
        <div class="cover ${cover}"><span class="emoji" aria-hidden="true">${p.emoji || "✨"}</span></div>
        <div class="card-body">
          <div class="meta">${badge}<span>${window.fmtDate(p.date)}</span><span>${p.readMinutes || 3} דקות קריאה</span></div>
          <h3 data-emoji="${p.emoji || ""}">${p.title}</h3>
          <p>${p.excerpt}</p>
        </div>
      </a>`;
  };
})();
