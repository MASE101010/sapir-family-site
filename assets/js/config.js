/* =========================================================
   הגדרות האתר - כאן מחליפים את נתוני הדמה בנתונים אמיתיים
   ========================================================= */
window.SAPIR = {
  siteName: "משפחת ספיר",
  domain: "https://www.sapirfamily.co.il",   // דמה - נחליף לדומיין האמיתי
  email: "social@sapirfamily.co.il",
  phone: "053-338-4144",
  contactName: "משפחת ספיר",
  shopUrl: "shop.html",
  shopExternalUrl: "https://www.merchadvice.com/artist/%d7%a1%d7%a4%d7%99%d7%a8/",
  stats: {
    total: "3M+",
    youtube: "1.3M",
    instagram: "112K",
    tiktok: "400K"
  },
  social: [
    { id: "youtube",   label: "יוטיוב",   url: "https://www.youtube.com/@SapirFamily" },
    { id: "instagram", label: "אינסטגרם", url: "https://instagram.com/israelisraeli" },
    { id: "tiktok",    label: "טיקטוק",   url: "https://tiktok.com/@israelisraeli" },
    { id: "facebook",  label: "פייסבוק",  url: "https://facebook.com/israelisraeli" }
  ],
  /* ערוצי יוטיוב - לכל ערוץ מכניסים playlistId (פלייליסט של היוטיוב).
     כשהשדה ריק האתר מציג כרטיס "בקרוב" במקום הנגן. */
  channels: [
    { id: "family",   name: "משפחת ספיר",     who: "הערוץ הראשי",             color: "#7b5cff", initial: "מ", avatar: "assets/img/ch/family.png",  url: "https://www.youtube.com/@SapirFamily",  subs: "",     playlistId: "UU6BbNPu5iGeIWt13nHucI5Q" },
    { id: "michael",  name: "Michael Sapir",  who: "מיכאל ספיר",              color: "#28d7ff", initial: "M", avatar: "assets/img/ch/michael.png", url: "https://www.youtube.com/@MichaelSapir", subs: "416K", playlistId: "UUcF1neMo_jLGqiCVTx9c1eA" },
    { id: "alin",     name: "Alin Sapir",     who: "אלין ספיר",               color: "#ffb84d", initial: "A", avatar: "assets/img/ch/alin.png",    url: "https://www.youtube.com/@AlinSapir",    subs: "317K", playlistId: "UUHo8nq8KJtHaeyaGvkFRbhA" },
    { id: "shiran",   name: "Shiran Sapir",   who: "שירן ספיר",               color: "#ff4fd1", initial: "S", avatar: "assets/img/ch/shiran.png",  url: "https://www.youtube.com/@ShiranSapir",  subs: "238K", playlistId: "UUjh-baaLTpw3vu3nXlln5ZA" },
    { id: "elroei",   name: "Elroey Sapir",   who: "אלרועי ספיר",             color: "#4df5c3", initial: "E", avatar: "assets/img/ch/elroei.png",  url: "https://www.youtube.com/@ElroeySapir",  subs: "139K", playlistId: "UUSvC41R0WhgYh6bYabdVKOQ" },
    { id: "sapirtv",  name: "Sapir TV",       who: "ספיר שורטס",              color: "#ff2d55", initial: "S", avatar: "assets/img/ch/sapirtv.png", url: "https://www.youtube.com/@SapirShorts",  subs: "164K", playlistId: "UU9XD0cOXc-_yXfYw-xbO6vw" },
    { id: "tuli",     name: "תולי האריה",     who: "Tuli the Lion, לילדים",   color: "#ffd166", initial: "ת", avatar: "assets/img/ch/tuli.png",    url: "https://www.youtube.com/@Tulilion",     subs: "",     playlistId: "UUtwxMzw0JZzwz58shhzYLbQ" }
  ],
  /* פלייליסט ההעלאות של הערוץ הראשי: הסרטון הראשון בו הוא תמיד החדש ביותר */
  featuredPlaylistId: "UU6BbNPu5iGeIWt13nHucI5Q",

  /* הסרטון שמוצג בבית ב"חדש היום" - מזהה סרטון יוטיוב (ריק = כרטיס דמה) */
  featuredVideoId: "",
  /* פלייליסטים ביוטיוב שהופכים לשורות ב-VOD: סדרות (לפי סדר הפרקים) ושירים. התוכן נמשך אוטומטית. */
  playlists: [
    { id: "PLJEL3F91QLY0", key: "family-series", title: "המשפחה שלנו, הסדרה", kind: "series" },
    { id: "PLEaiHPi_qoX0", key: "tuli-series", title: "תולי האריה וחבריו הנהדרים", kind: "series" },
    { id: "PLxwc9VGoFHq13HiTsDK_zbMCD1_BwLByZ", key: "songs", title: "השירים שלנו", kind: "songs" }
  ],
  /* משחקים. playUrl = כתובת גרסת הדפדפן (חיצונית או תיקייה באתר: games/<id>/index.html).
     playReady = האם גרסת הדפדפן כבר קיימת. image = תמונה/אייקון של המשחק (ריק = אריח צבעוני). */
  games: [
    {
      id: "mini-fighter", name: "מיני פייטר", kind: "משחק לחימה", tile: "tile-fighter", status: "live", icon: "fist", image: "assets/img/games/mini-fighter.jpg", banner: "assets/img/games/mini-fighter-banner.jpg",
      blurb: "משחק לחימה 2.5D עם יותר מעשרים לוחמים, עשר זירות, מצב סיפור, קרבות אחד על אחד ומולטיפלייר אונליין. מיכאל, שירן, הילדים ותולי בתוך המשחק.",
      play: "https://play.google.com/store/apps/details?id=com.sapirproductions.minifighter",
      playUrl: "https://minifighter.co.il/play/", playReady: true, orientation: "landscape"
    },
    {
      id: "race-top", name: "המירוץ לפסגה", kind: "קפיצות עם תולי", tile: "tile-tower", status: "live", icon: "arrow-up", image: "",
      blurb: "קופצים כמה שיותר גבוה עם תולי וחבריו. פשוט ללמוד, קשה להפסיק. מי יגיע הכי גבוה במשפחה?",
      play: "https://play.google.com/store/apps/details?id=com.base69af0e012f86163366dab407.app", playUrl: "https://tulijump.base44.app", playReady: true, orientation: "portrait"
    },
    {
      id: "race-kingdom", name: "המירוץ לממלכה", kind: "ריצה עם תולי", tile: "tile-run", status: "live", icon: "run", image: "",
      blurb: "תולי בורח מהוירוס דרך הממלכה האבודה. רצים, קופצים, אוספים מטבעות ונזהרים מהמלכודות.",
      play: "", playUrl: "games/race-kingdom/index.html", playReady: false, orientation: "portrait"
    },
    {
      id: "nahesh", name: "נחש את המילה", kind: "מילים", tile: "tile-word", status: "live", icon: "abc", image: "",
      blurb: "מנחשים מילה בעברית בשש ניסיונות ובונים את הרצף הכי ארוך. משחק לכל המשפחה, לכל גיל.",
      play: "", playUrl: "games/nahesh/index.html", playReady: false, orientation: "portrait"
    },
    {
      id: "virus", name: "פלישת הוירוסים", kind: "חלליות", tile: "tile-virus", status: "live", icon: "rocket", image: "",
      blurb: "מאה שלבים בכל כוכבי הלכת, בוסים, נשקים מיוחדים, וחלליות של כל בני המשפחה. הוירוס הגדול מחכה בסוף.",
      play: "", playUrl: "games/virus/index.html", playReady: false, orientation: "portrait"
    }
  ]
};
