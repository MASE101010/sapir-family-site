import SwiftUI

struct Tab: Identifiable, Hashable {
    let id: String
    let title: String
    let icon: String
    let path: String
}

let TABS: [Tab] = [
    Tab(id: "home", title: "בית", icon: "house.fill", path: "index.html"),
    Tab(id: "vod", title: "VOD", icon: "play.rectangle.fill", path: "vod.html"),
    Tab(id: "shorts", title: "שורטס", icon: "rectangle.portrait.on.rectangle.portrait.fill", path: "shorts.html"),
    Tab(id: "games", title: "משחקים", icon: "gamecontroller.fill", path: "games.html"),
    Tab(id: "blog", title: "הבלוג", icon: "newspaper.fill", path: "blog.html"),
]

struct RootView: View {
    @State private var selected = "home"
    @StateObject private var models = TabModels()
    @StateObject private var ads = AdsManager.shared

    var body: some View {
        TabView(selection: Binding(
            get: { selected },
            set: { new in
                // לחיצה חוזרת על הטאב הפעיל: חזרה לראש הדף שלו
                if new == selected { models.model(for: new).home() } else { ads.maybeShowInterstitial() }
                selected = new
            }
        )) {
            ForEach(TABS) { tab in
                WebScreen(model: models.model(for: tab.id))
                    .tabItem { Label(tab.title, systemImage: tab.icon) }
                    .tag(tab.id)
            }
        }
        // באנר קטן (320x50) בתחתית: נכנס לאזור הבטוח, כך שסרגל הטאבים והתוכן יושבים מעליו ושום דבר לא נחתך
        .safeAreaInset(edge: .bottom, spacing: 0) {
            // שימו לב: רקע של SwiftUI נמתח אוטומטית לאזור הבטוח. כשאין מודעה (גובה 0) הוא היה מכסה את תחתית סרגל הטאבים,
            // ולכן כשאין מודעה לא מציירים כלום, וכשיש, הרקע נמתח רק מתחת לבאנר
            if ads.ready {
                AdBanner()
                    .frame(width: 320, height: 50)
                    .frame(maxWidth: .infinity)
                    .frame(height: ads.bannerHeight, alignment: .top)
                    .clipped()
                    .background(ads.bannerHeight > 0 ? Color(red: 0.03, green: 0.04, blue: 0.13) : Color.clear, ignoresSafeAreaEdges: .bottom)
                    .allowsHitTesting(ads.bannerHeight > 0)
            }
        }
        .background(Color(red: 0.03, green: 0.04, blue: 0.13).ignoresSafeArea())
        .ignoresSafeArea(.keyboard)
        .onAppear { ads.start() }
        .onOpenURL { url in
            // קישור עמוק (https://sapirfamily.co.il/...): נפתח בטאב המתאים
            let file = url.lastPathComponent
            let tab = TABS.first { $0.path == file } ?? TABS[0]
            selected = tab.id
            models.model(for: tab.id).load(url)
        }
    }
}

final class TabModels: ObservableObject {
    private var cache: [String: WebModel] = [:]
    func model(for id: String) -> WebModel {
        if let m = cache[id] { return m }
        let tab = TABS.first { $0.id == id } ?? TABS[0]
        let m = WebModel(startPath: tab.path)
        cache[id] = m
        return m
    }
}
