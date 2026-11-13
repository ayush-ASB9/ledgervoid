// Hide the console window on Windows release builds.
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::{Url, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_opener::OpenerExt;

/// The deployed dashboard. Web changes ship with a Render deploy and need no new desktop build.
const DASHBOARD_URL: &str = "https://ledgervoid.onrender.com";

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dashboard: Url = DASHBOARD_URL.parse()?;
            let dashboard_host = dashboard.host_str().map(str::to_owned);
            let handle = app.handle().clone();

            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(dashboard))
                .title("LedgerVoid")
                .inner_size(1360.0, 880.0)
                .min_inner_size(820.0, 600.0)
                .background_color(tauri::window::Color(0x10, 0x13, 0x18, 0xff))
                .theme(Some(tauri::Theme::Dark))
                // Let the page receive dropped PDFs instead of the native window.
                .disable_drag_drop_handler()
                // Keep the dashboard in the app window and open every other site in the browser.
                .on_navigation(move |url| {
                    let internal = matches!(url.scheme(), "about" | "blob" | "data")
                        || url.host_str() == dashboard_host.as_deref();
                    if !internal {
                        let _ = handle.opener().open_url(url.as_str(), None::<&str>);
                    }
                    internal
                })
                .build()?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running LedgerVoid");
}
