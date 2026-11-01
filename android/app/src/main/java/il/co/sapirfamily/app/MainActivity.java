package il.co.sapirfamily.app;

import android.annotation.SuppressLint;
import android.app.UiModeManager;
import android.content.Context;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;

import androidx.appcompat.app.AppCompatActivity;

/**
 * האפליקציה של משפחת ספיר לטלוויזיות חכמות (Google TV / Android TV) ולטלפונים:
 * מעטפת WebView מעל האתר החי, כך שכל סרטון חדש ביוטיוב מופיע מיד בלי עדכון בחנות.
 * השלט: חצים ו-OK מגיעים לאתר כמקלדת, והאתר (site.js) מנווט בין הכרטיסים.
 */
public class MainActivity extends AppCompatActivity {
    private static final String HOME = "https://sapirfamily.co.il/";
    private static final String[] INSIDE = { "sapirfamily.co.il", "sapir-family-site.pages.dev", "youtube.com", "youtube-nocookie.com", "google.com" };

    private WebView web;
    private View offline;
    private FrameLayout fullscreen;
    private View customView;
    private WebChromeClient.CustomViewCallback customCallback;
    private boolean isTv;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        UiModeManager ui = (UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
        isTv = ui != null && ui.getCurrentModeType() == Configuration.UI_MODE_TYPE_TELEVISION;
        if (!isTv) setRequestedOrientation(android.content.pm.ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED);

        setContentView(R.layout.activity_main);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        hideSystemBars();

        web = findViewById(R.id.web);
        offline = findViewById(R.id.offline);
        fullscreen = findViewById(R.id.fullscreen);
        findViewById(R.id.retry).setOnClickListener(v -> { offline.setVisibility(View.GONE); web.reload(); });

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setLoadWithOverviewMode(true);
        s.setUseWideViewPort(true);
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setUserAgentString(s.getUserAgentString() + " SapirApp/" + BuildConfig.VERSION_NAME + (isTv ? " tv" : " phone"));
        web.setBackgroundColor(0xFF0B0D2E);
        web.setFocusable(true);
        web.setFocusableInTouchMode(true);

        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                String host = u.getHost() == null ? "" : u.getHost();
                for (String h : INSIDE) if (host.equals(h) || host.endsWith("." + h)) return false;
                if (isTv) return false; // בטלוויזיה אין דפדפן אחר, נשארים באפליקציה
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) {}
                return true;
            }
            @Override
            public void onPageStarted(WebView view, String url, Bitmap favicon) { if (url.startsWith(HOME) || url.contains("pages.dev")) offline.setVisibility(View.GONE); }
            @Override
            public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) offline.setVisibility(View.VISIBLE);
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {
                if (customView != null) { callback.onCustomViewHidden(); return; }
                customView = view; customCallback = callback;
                fullscreen.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                fullscreen.setVisibility(View.VISIBLE);
                web.setVisibility(View.INVISIBLE);
                hideSystemBars();
            }
            @Override
            public void onHideCustomView() {
                if (customView == null) return;
                fullscreen.removeView(customView);
                fullscreen.setVisibility(View.GONE);
                web.setVisibility(View.VISIBLE);
                customView = null;
                if (customCallback != null) customCallback.onCustomViewHidden();
                customCallback = null;
                hideSystemBars();
            }
        });

        String url = HOME + "?app=" + (isTv ? "tv" : "phone");
        Uri data = getIntent() == null ? null : getIntent().getData();
        if (data != null && "https".equals(data.getScheme())) url = data.toString() + (data.getQuery() == null ? "?" : "&") + "app=" + (isTv ? "tv" : "phone");
        if (savedInstanceState != null) web.restoreState(savedInstanceState); else web.loadUrl(url);
        web.requestFocus();
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) { super.onSaveInstanceState(outState); web.saveState(outState); }

    private void hideSystemBars() {
        Window w = getWindow();
        View d = w.getDecorView();
        d.setSystemUiVisibility(View.SYSTEM_UI_FLAG_LAYOUT_STABLE | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY);
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) { super.onWindowFocusChanged(hasFocus); if (hasFocus) hideSystemBars(); }

    @Override
    public boolean onKeyDown(int keyCode, KeyEvent event) {
        if (keyCode == KeyEvent.KEYCODE_BACK) {
            if (customView != null) { web.getWebChromeClient(); runOnUiThread(() -> { WebChromeClient c = web.getWebChromeClient(); if (c != null) c.onHideCustomView(); }); return true; }
            // קודם האתר: אם פתוח נגן או תפריט הוא סוגר אותם, אחרת חוזרים עמוד אחורה, ובדף הבית יוצאים
            web.evaluateJavascript("(function(){try{return window.__sapirBack?String(window.__sapirBack()):'false'}catch(e){return 'false'}})()", r -> {
                if ("\"true\"".equals(r)) return;
                if (web.canGoBack()) web.goBack(); else finish();
            });
            return true;
        }
        if (keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE || keyCode == KeyEvent.KEYCODE_MEDIA_PLAY || keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE) {
            web.evaluateJavascript("window.__sapirMedia&&window.__sapirMedia('toggle')", null); return true;
        }
        if (keyCode == KeyEvent.KEYCODE_MEDIA_FAST_FORWARD) { web.evaluateJavascript("window.__sapirMedia&&window.__sapirMedia('ff')", null); return true; }
        if (keyCode == KeyEvent.KEYCODE_MEDIA_REWIND) { web.evaluateJavascript("window.__sapirMedia&&window.__sapirMedia('rw')", null); return true; }
        return super.onKeyDown(keyCode, event);
    }

    @Override
    protected void onPause() { super.onPause(); web.onPause(); }
    @Override
    protected void onResume() { super.onResume(); web.onResume(); hideSystemBars(); }
    @Override
    protected void onDestroy() { if (web != null) web.destroy(); super.onDestroy(); }
}
