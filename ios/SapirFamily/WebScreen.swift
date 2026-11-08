import SwiftUI
import WebKit
import SafariServices

struct WebScreen: View {
    @ObservedObject var model: WebModel

    var body: some View {
        ZStack {
            Color(red: 0.043, green: 0.051, blue: 0.18).ignoresSafeArea()
            WebViewBox(webView: model.webView)
            if model.isLoading {
                VStack { ProgressBar(); Spacer() }
            }
            if model.offline { OfflineView(retry: model.reload) }
        }
        .sheet(item: $model.externalURL) { url in
            SafariView(url: url).ignoresSafeArea()
        }
    }
}

extension URL: Identifiable { public var id: String { absoluteString } }

struct WebViewBox: UIViewRepresentable {
    let webView: WKWebView
    func makeUIView(context: Context) -> WKWebView { webView }
    func updateUIView(_ uiView: WKWebView, context: Context) {}
}

struct SafariView: UIViewControllerRepresentable {
    let url: URL
    func makeUIViewController(context: Context) -> SFSafariViewController {
        let c = SFSafariViewController.Configuration()
        c.entersReaderIfAvailable = false
        let v = SFSafariViewController(url: url, configuration: c)
        v.preferredBarTintColor = UIColor(red: 0.03, green: 0.04, blue: 0.13, alpha: 1)
        v.preferredControlTintColor = .white
        return v
    }
    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

/// פס טעינה דק והולוגרפי בראש המסך
struct ProgressBar: View {
    @State private var x: CGFloat = -1
    var body: some View {
        GeometryReader { g in
            LinearGradient(colors: [Color(red: 1, green: 0.31, blue: 0.82), Color(red: 0.16, green: 0.84, blue: 1), Color(red: 0.48, green: 0.36, blue: 1)], startPoint: .leading, endPoint: .trailing)
                .frame(width: g.size.width * 0.45, height: 3)
                .offset(x: x * g.size.width)
                .onAppear { withAnimation(.linear(duration: 1.1).repeatForever(autoreverses: false)) { x = 1 } }
        }
        .frame(height: 3)
        .accessibilityLabel("טוען")
    }
}

struct OfflineView: View {
    let retry: () -> Void
    var body: some View {
        ZStack {
            Color(red: 0.043, green: 0.051, blue: 0.18).ignoresSafeArea()
            VStack(spacing: 18) {
                Image("LaunchLogo").resizable().scaledToFit().frame(width: 220)
                Text("אין חיבור לאינטרנט").font(.title2.bold()).foregroundColor(.white)
                Text("בדקו את החיבור ונסו שוב, כל הסרטונים מחכים לכם").foregroundColor(.white.opacity(0.7)).multilineTextAlignment(.center)
                Button(action: retry) {
                    Text("נסו שוב").font(.headline).padding(.horizontal, 28).padding(.vertical, 12)
                        .background(Color.white).foregroundColor(Color(red: 0.043, green: 0.051, blue: 0.18)).clipShape(Capsule())
                }
            }
            .padding(32)
        }
    }
}
