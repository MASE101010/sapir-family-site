import SwiftUI
import UIKit
import GoogleMobileAds
import UserMessagingPlatform
import AppTrackingTransparency

/// מזהי AdMob של האפליקציה "משפחת ספיר iOS" בחשבון 7msapsap7 (אפליקציה 2459889137)
/// (מזהה האפליקציה עצמו יושב ב-Info.plist תחת GADApplicationIdentifier, ראו project.yml).
enum AdConfig {
    static let banner = "ca-app-pub-4952145100186285/8504608644"
    static let interstitial = "ca-app-pub-4952145100186285/3026865348"
    static let isTest = banner.contains("3940256099942544")
    /// כמה זמן לפחות בין מודעות מסך מלא, ולא לפני שהמשתמש היה דקה באפליקציה
    static let interstitialGap: TimeInterval = 180
    static let interstitialWarmup: TimeInterval = 60
}

/// מנהל הפרסומות: הסכמה (UMP, חובה באירופה), אתחול ה-SDK, מודעת ביניים במעברים בין טאבים.
final class AdsManager: NSObject, ObservableObject {
    static let shared = AdsManager()
    @Published var ready = false
    @Published var bannerHeight: CGFloat = 0

    private var interstitial: InterstitialAd?
    private var lastInterstitial = Date.distantPast
    private let launchedAt = Date()
    private var started = false

    func start() {
        guard !started else { return }
        started = true
        let params = RequestParameters()
        params.isTaggedForUnderAgeOfConsent = false
        ConsentInformation.shared.requestConsentInfoUpdate(with: params) { [weak self] _ in
            // טופס ההסכמה מוצג רק איפה שהחוק דורש (האיחוד האירופי); בישראל הוא פשוט לא מופיע
            ConsentForm.loadAndPresentIfRequired(from: Self.topController()) { _ in
                self?.initSDK()
            }
        }
        // אם אין רשת, לא נתקעים: מתחילים בכל מקרה אחרי כמה שניות
        DispatchQueue.main.asyncAfter(deadline: .now() + 6) { [weak self] in self?.initSDK() }
    }

    private func initSDK() {
        guard !ready, ConsentInformation.shared.canRequestAds || ConsentInformation.shared.consentStatus == .notRequired else { return }
        ready = true
        MobileAds.shared.start { [weak self] _ in
            self?.loadInterstitial()
            // בקשת מעקב (ATT) רק אחרי שהמשתמש כבר ראה את האפליקציה, לא בשנייה הראשונה
            DispatchQueue.main.asyncAfter(deadline: .now() + 20) {
                if #available(iOS 14, *), ATTrackingManager.trackingAuthorizationStatus == .notDetermined {
                    ATTrackingManager.requestTrackingAuthorization { _ in }
                }
            }
        }
    }

    // MARK: מודעת ביניים

    private func loadInterstitial() {
        InterstitialAd.load(with: AdConfig.interstitial, request: Request()) { [weak self] ad, _ in
            self?.interstitial = ad
            ad?.fullScreenContentDelegate = self
        }
    }

    /// נקרא במעבר בין טאבים; מציג מודעה רק אם עבר מספיק זמן ואין וידאו במסך מלא
    func maybeShowInterstitial() {
        guard ready, let ad = interstitial else { return }
        let now = Date()
        guard now.timeIntervalSince(launchedAt) > AdConfig.interstitialWarmup,
              now.timeIntervalSince(lastInterstitial) > AdConfig.interstitialGap,
              let root = Self.topController(), !(root is UIAlertController) else { return }
        lastInterstitial = now
        interstitial = nil
        ad.present(from: root)
    }

    static func topController() -> UIViewController? {
        let scene = UIApplication.shared.connectedScenes.compactMap { $0 as? UIWindowScene }.first { $0.activationState == .foregroundActive }
        var vc = scene?.windows.first { $0.isKeyWindow }?.rootViewController
        while let p = vc?.presentedViewController { vc = p }
        return vc
    }
}

extension AdsManager: FullScreenContentDelegate {
    func adDidDismissFullScreenContent(_ ad: FullScreenPresentingAd) { loadInterstitial() }
    func ad(_ ad: FullScreenPresentingAd, didFailToPresentFullScreenContentWithError error: Error) { loadInterstitial() }
}

/// באנר אדפטיבי צמוד לתחתית, מעל סרגל הטאבים. נטען רק כשהטאב מוצג.
struct AdBanner: UIViewRepresentable {
    @ObservedObject var ads = AdsManager.shared
    let width: CGFloat

    func makeCoordinator() -> Coordinator { Coordinator() }

    func makeUIView(context: Context) -> BannerView {
        let v = BannerView(adSize: currentOrientationAnchoredAdaptiveBanner(width: max(320, width)))
        v.adUnitID = AdConfig.banner
        v.rootViewController = AdsManager.topController()
        v.delegate = context.coordinator
        v.backgroundColor = .clear
        context.coordinator.view = v
        return v
    }

    func updateUIView(_ v: BannerView, context: Context) {
        guard ads.ready else { return }
        let w = max(320, floor(width))
        if context.coordinator.loadedWidth != w {
            context.coordinator.loadedWidth = w
            v.adSize = currentOrientationAnchoredAdaptiveBanner(width: w)
            v.load(Request())
        }
    }

    final class Coordinator: NSObject, BannerViewDelegate {
        var loadedWidth: CGFloat = 0
        weak var view: BannerView?
        func bannerViewDidReceiveAd(_ bannerView: BannerView) { AdsManager.shared.bannerHeight = bannerView.adSize.size.height }
        func bannerView(_ bannerView: BannerView, didFailToReceiveAdWithError error: Error) { AdsManager.shared.bannerHeight = 0 }
    }
}
