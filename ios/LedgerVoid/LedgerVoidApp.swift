import SwiftUI

/// The deployed LedgerVoid dashboard. The app is a native shell around it, so
/// web changes ship with a Render deploy and need no new app build.
let dashboardURL = URL(string: "https://ledgervoid.onrender.com")!

/// Matches `--canvas` in app/globals.css, so no white flashes appear while loading.
let canvasColor = Color(red: 0x10 / 255, green: 0x13 / 255, blue: 0x18 / 255)

@main
struct LedgerVoidApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .preferredColorScheme(.dark)
        }
    }
}

struct ContentView: View {
    @StateObject private var dashboard = DashboardModel()

    var body: some View {
        ZStack {
            canvasColor.ignoresSafeArea()

            DashboardWebView(model: dashboard)
                .ignoresSafeArea(edges: .bottom)
                .opacity(dashboard.hasLoaded ? 1 : 0)

            if let error = dashboard.loadError {
                ContentUnavailableView {
                    Label("Can't reach LedgerVoid", systemImage: "wifi.exclamationmark")
                } description: {
                    Text(error)
                } actions: {
                    Button("Try again") { dashboard.reload() }
                        .buttonStyle(.borderedProminent)
                        .tint(Color(red: 0x53 / 255, green: 0xD9 / 255, blue: 0xCF / 255))
                        .foregroundStyle(.black)
                }
            } else if !dashboard.hasLoaded {
                ProgressView()
                    .controlSize(.large)
                    .tint(.white)
            }
        }
    }
}
