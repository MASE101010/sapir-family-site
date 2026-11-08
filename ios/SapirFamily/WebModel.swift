import Foundation
import WebKit
import SafariServices
import UIKit

let SITE_HOME = URL(string: "https://sapirfamily.co.il/")!
/// דומיינים שנשארים בתוך האפליקציה (האתר, הנגן של יוטיוב); כל השאר נפתח בספארי
let INSIDE_HOSTS = ["sapirfamily.co.il", "sapir-family-site.pages.dev", "youtube.com", "youtube-nocookie.com", "google.com", "googlevideo.com", "ytimg.com"]

/// WKWebView אחד לכל טאב, עם המצב שלו (טוען, אופליין), נשמר בין מעברים בין הטאבים.
final class WebModel: NSObject, ObservableObject {
    @Published var isLoading = false
    @Published var offline = false
    @Published var externalURL: URL?

    let webView: WKWebView
    let startURL: URL
    private static let processPool = WKProcessPool()

    init(startPath: String) {
        var c = URLComponents(url: SITE_HOME.appendingPathComponent(startPath), resolvingAgainstBaseURL: false)!
        c.queryItems = [URLQueryItem(name: "app", value: "ios")]
        startURL = c.url!

        let config = WKWebViewConfiguration()
        config.processPool = WebModel.processPool
        config.allowsInlineMediaPlayback = true
        config.allowsPictureInPictureMediaPlayback = true
        config.allowsAirPlayForMediaPlayback = true
        config.mediaTypesRequiringUserActionForPlayback = []
        let version = Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "1.0"
        config.applicationNameForUserAgent = "Mobile/15E148 SapirApp/\(version) ios"
        if #available(iOS 15.4, *) { config.preferences.isElementFullscreenEnabled = true }
        config.preferences.javaScriptCanOpenWindowsAutomatically = false

        webView = WKWebView(frame: .zero, configuration: config)
        super.init()
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = UIColor(red: 0.043, green: 0.051, blue: 0.18, alpha: 1)
        webView.scrollView.backgroundColor = webView.backgroundColor
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        #if DEBUG
        if #available(iOS 16.4, *) { webView.isInspectable = true }
        #endif

        let refresh = UIRefreshControl()
        refresh.tintColor = .white
        refresh.addTarget(self, action: #selector(pullToRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        webView.load(URLRequest(url: startURL))
    }

    @objc private func pullToRefresh(_ r: UIRefreshControl) {
        reload()
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.8) { r.endRefreshing() }
    }

    func reload() {
        offline = false
        if webView.url == nil { webView.load(URLRequest(url: startURL)) } else { webView.reload() }
    }

    /// חזרה לדף הבית של הטאב (לחיצה חוזרת על הטאב): אם כבר שם, גלילה למעלה
    func home() {
        if let u = webView.url, u.path == startURL.path {
            webView.scrollView.setContentOffset(CGPoint(x: 0, y: -webView.scrollView.adjustedContentInset.top), animated: true)
        } else {
            webView.load(URLRequest(url: startURL))
        }
    }

    func load(_ url: URL) {
        var c = URLComponents(url: url, resolvingAgainstBaseURL: false)!
        var q = c.queryItems ?? []
        if !q.contains(where: { $0.name == "app" }) { q.append(URLQueryItem(name: "app", value: "ios")) }
        c.queryItems = q
        webView.load(URLRequest(url: c.url ?? url))
    }

    static func isInside(_ url: URL) -> Bool {
        guard let host = url.host?.lowercased() else { return true }
        return INSIDE_HOSTS.contains { host == $0 || host.hasSuffix("." + $0) }
    }
}

extension WebModel: WKNavigationDelegate, WKUIDelegate {
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction, decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = action.request.url else { return decisionHandler(.allow) }
        // מסגרות פנימיות (נגן יוטיוב וכדומה) תמיד מותרות
        if let frame = action.targetFrame, !frame.isMainFrame { return decisionHandler(.allow) }
        if url.scheme == "mailto" || url.scheme == "tel" || url.scheme == "sms" {
            UIApplication.shared.open(url); return decisionHandler(.cancel)
        }
        if url.scheme == "https" || url.scheme == "http" {
            let host = url.host?.lowercased() ?? ""
            // סרטון ביוטיוב עצמו (לא הנגן המוטמע): לאפליקציית יוטיוב או לספארי
            let youtubePage = (host.hasSuffix("youtube.com") && !url.path.hasPrefix("/embed")) || host == "youtu.be"
            if !WebModel.isInside(url) || youtubePage {
                externalURL = url
                return decisionHandler(.cancel)
            }
        }
        decisionHandler(.allow)
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration, for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        // target=_blank: נפתח באותו חלון אם זה האתר, אחרת בספארי
        if let url = action.request.url {
            if WebModel.isInside(url) && !(url.host ?? "").hasSuffix("youtube.com") { webView.load(action.request) } else { externalURL = url }
        }
        return nil
    }

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) { isLoading = true }
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) { isLoading = false; offline = false }
    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) { isLoading = false }
    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        isLoading = false
        let code = (error as NSError).code
        if code == NSURLErrorCancelled { return }
        offline = true
    }
    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) { webView.reload() }
}
