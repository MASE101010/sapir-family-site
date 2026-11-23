package il.co.sapirfamily.app;

import android.app.Activity;
import android.os.Handler;
import android.os.Looper;
import android.view.ViewGroup;

import com.google.android.gms.ads.AdRequest;
import com.google.android.gms.ads.AdSize;
import com.google.android.gms.ads.AdView;
import com.google.android.gms.ads.FullScreenContentCallback;
import com.google.android.gms.ads.LoadAdError;
import com.google.android.gms.ads.MobileAds;
import com.google.android.gms.ads.interstitial.InterstitialAd;
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback;
import com.google.android.ump.ConsentInformation;
import com.google.android.ump.ConsentRequestParameters;
import com.google.android.ump.UserMessagingPlatform;

/**
 * פרסומות AdMob (חשבון 7msapsap7, אפליקציה "משפחת ספיר" Android): באנר אדפטיבי בתחתית בטלפונים,
 * ומודעת ביניים במעבר בין דפים, לא בדקה הראשונה ולא יותר מפעם ב-3 דקות (5 בטלוויזיה), אף פעם לא בזמן וידאו במסך מלא.
 * ההסכמה (UMP) מוצגת רק איפה שהחוק דורש (האיחוד האירופי).
 */
final class Ads {
    static final String BANNER = "ca-app-pub-4952145100186285/4900776683";
    static final String INTERSTITIAL = "ca-app-pub-4952145100186285/3246069188";

    private final Activity activity;
    private final boolean isTv;
    private final ViewGroup bannerHost;
    private final long launchedAt = System.currentTimeMillis();
    private long lastInterstitial = 0;
    private boolean ready = false;
    private InterstitialAd interstitial;
    private AdView banner;

    Ads(Activity activity, boolean isTv, ViewGroup bannerHost) {
        this.activity = activity; this.isTv = isTv; this.bannerHost = bannerHost;
    }

    void start() {
        if (isTv) return; // בטלוויזיה אין פרסומות בכלל: צפייה נקייה ורציפה
        ConsentInformation info = UserMessagingPlatform.getConsentInformation(activity);
        ConsentRequestParameters params = new ConsentRequestParameters.Builder().setTagForUnderAgeOfConsent(false).build();
        info.requestConsentInfoUpdate(activity, params,
                () -> UserMessagingPlatform.loadAndShowConsentFormIfRequired(activity, formError -> { if (info.canRequestAds()) init(); }),
                requestError -> { if (info.canRequestAds()) init(); });
        if (info.canRequestAds()) init();
        // אם אין רשת לא נתקעים: מתחילים בכל מקרה אחרי כמה שניות (בלי הסכמה לא תהיה הגשה באירופה, וזה בסדר)
        new Handler(Looper.getMainLooper()).postDelayed(() -> { if (!ready && info.canRequestAds()) init(); }, 6000);
    }

    private void init() {
        if (ready) return;
        ready = true;
        MobileAds.initialize(activity, status -> {
            loadInterstitial();
            if (!isTv) loadBanner();
        });
    }

    /** באנר קטן וקבוע (320x50) מתחת לכל האפליקציה, מחוץ לדף: אף פעם לא מעל התוכן ולא גדל */
    private void loadBanner() {
        banner = new AdView(activity);
        banner.setAdUnitId(BANNER);
        banner.setAdSize(AdSize.BANNER);
        banner.setAdListener(new com.google.android.gms.ads.AdListener() {
            @Override public void onAdLoaded() { bannerHost.setVisibility(android.view.View.VISIBLE); }
            @Override public void onAdFailedToLoad(LoadAdError e) { bannerHost.setVisibility(android.view.View.GONE); }
        });
        bannerHost.removeAllViews();
        float d = activity.getResources().getDisplayMetrics().density;
        android.widget.FrameLayout.LayoutParams lp = new android.widget.FrameLayout.LayoutParams((int) (320 * d), (int) (50 * d));
        lp.gravity = android.view.Gravity.CENTER_HORIZONTAL;
        bannerHost.addView(banner, lp);
        banner.loadAd(new AdRequest.Builder().build());
    }

    private void loadInterstitial() {
        InterstitialAd.load(activity, INTERSTITIAL, new AdRequest.Builder().build(), new InterstitialAdLoadCallback() {
            @Override public void onAdLoaded(InterstitialAd ad) {
                interstitial = ad;
                ad.setFullScreenContentCallback(new FullScreenContentCallback() {
                    @Override public void onAdDismissedFullScreenContent() { interstitial = null; loadInterstitial(); }
                    @Override public void onAdFailedToShowFullScreenContent(com.google.android.gms.ads.AdError e) { interstitial = null; loadInterstitial(); }
                });
            }
            @Override public void onAdFailedToLoad(LoadAdError e) {
                interstitial = null;
                new Handler(Looper.getMainLooper()).postDelayed(Ads.this::loadInterstitial, 60000);
            }
        });
    }

    /** נקרא במעבר בין דפים באתר; מציג מודעה רק אם עבר מספיק זמן ואין וידאו במסך מלא */
    void maybeShowInterstitial(boolean videoFullscreen) {
        if (!ready || interstitial == null || videoFullscreen) return;
        long now = System.currentTimeMillis();
        long gap = isTv ? 5 * 60_000 : 3 * 60_000;
        if (now - launchedAt < 60_000 || now - lastInterstitial < gap) return;
        lastInterstitial = now;
        InterstitialAd ad = interstitial; interstitial = null;
        ad.show(activity);
    }

    void onPause() { if (banner != null) banner.pause(); }
    void onResume() { if (banner != null) banner.resume(); }
    void onDestroy() { if (banner != null) banner.destroy(); }
}
