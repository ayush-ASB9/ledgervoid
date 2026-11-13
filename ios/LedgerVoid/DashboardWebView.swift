import SwiftUI
import WebKit

@MainActor
final class DashboardModel: NSObject, ObservableObject {
    @Published private(set) var hasLoaded = false
    @Published private(set) var loadError: String?

    let webView: WKWebView

    override init() {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        webView = WKWebView(frame: .zero, configuration: configuration)
        super.init()

        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.isOpaque = false
        webView.backgroundColor = UIColor(canvasColor)
        webView.scrollView.backgroundColor = UIColor(canvasColor)
        #if DEBUG
        webView.isInspectable = true
        #endif

        let refresh = UIRefreshControl()
        refresh.tintColor = .white
        refresh.addTarget(self, action: #selector(pullToRefresh(_:)), for: .valueChanged)
        webView.scrollView.refreshControl = refresh

        webView.load(URLRequest(url: dashboardURL))
    }

    func reload() {
        loadError = nil
        if webView.url == nil {
            webView.load(URLRequest(url: dashboardURL))
        } else {
            webView.reload()
        }
    }

    @objc private func pullToRefresh(_ control: UIRefreshControl) {
        reload()
    }

    private func finishLoading(error: Error?) {
        webView.scrollView.refreshControl?.endRefreshing()
        if let error = error as? URLError, error.code == .cancelled { return }
        if let error {
            loadError = error.localizedDescription
        } else {
            loadError = nil
            hasLoaded = true
        }
    }
}

extension DashboardModel: WKNavigationDelegate {
    /// Keeps the dashboard inside the app and opens every other site in Safari.
    func webView(
        _ webView: WKWebView,
        decidePolicyFor navigationAction: WKNavigationAction
    ) async -> WKNavigationActionPolicy {
        guard let url = navigationAction.request.url else { return .cancel }
        let isDashboard = url.host == dashboardURL.host
        let isInternal = ["about", "blob", "data"].contains(url.scheme ?? "")
        if isDashboard || isInternal { return .allow }
        await UIApplication.shared.open(url)
        return .cancel
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        finishLoading(error: nil)
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        finishLoading(error: error)
    }

    func webView(
        _ webView: WKWebView,
        didFailProvisionalNavigation navigation: WKNavigation!,
        withError error: Error
    ) {
        finishLoading(error: error)
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        webView.reload()
    }
}

extension DashboardModel: WKUIDelegate {
    /// Links with target="_blank" open in Safari instead of being dropped.
    func webView(
        _ webView: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for navigationAction: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = navigationAction.request.url {
            UIApplication.shared.open(url)
        }
        return nil
    }
}

struct DashboardWebView: UIViewRepresentable {
    let model: DashboardModel

    func makeUIView(context: Context) -> WKWebView { model.webView }

    func updateUIView(_ webView: WKWebView, context: Context) {}
}
