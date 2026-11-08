import SwiftUI

/// האפליקציה של משפחת ספיר לאייפון ולאייפד: טאבים נייטיב, וכל טאב הוא חלון אל האתר החי,
/// כך שכל סרטון ופוסט חדש מופיע מיד בלי עדכון בחנות.
@main
struct SapirFamilyApp: App {
    init() {
        let bar = UITabBarAppearance()
        bar.configureWithOpaqueBackground()
        bar.backgroundColor = UIColor(red: 0.03, green: 0.04, blue: 0.13, alpha: 1)
        bar.stackedLayoutAppearance.normal.iconColor = UIColor(white: 1, alpha: 0.6)
        bar.stackedLayoutAppearance.normal.titleTextAttributes = [.foregroundColor: UIColor(white: 1, alpha: 0.6)]
        bar.stackedLayoutAppearance.selected.iconColor = UIColor(red: 1, green: 0.31, blue: 0.82, alpha: 1)
        bar.stackedLayoutAppearance.selected.titleTextAttributes = [.foregroundColor: UIColor.white]
        UITabBar.appearance().standardAppearance = bar
        UITabBar.appearance().scrollEdgeAppearance = bar
    }

    var body: some Scene {
        WindowGroup {
            RootView()
                .preferredColorScheme(.dark)
                .environment(\.layoutDirection, .rightToLeft)
        }
    }
}
