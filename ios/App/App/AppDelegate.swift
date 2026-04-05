import UIKit
import Capacitor
import WebKit

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        setCustomUserAgent()
        return true
    }

    /// デフォルトのUser-Agentに "CircleRun-iOS" を追加する
    /// WebViewAlert.tsx がこれを検知してブラウザ警告を非表示にする
    private func setCustomUserAgent() {
        let webView = WKWebView()
        var done = false
        webView.evaluateJavaScript("navigator.userAgent") { result, _ in
            if let ua = result as? String {
                UserDefaults.standard.register(defaults: ["UserAgent": ua + " CircleRun-iOS"])
            }
            done = true
        }
        // RunLoopで同期的に待機（main threadのデッドロックなし）
        while !done {
            RunLoop.current.run(mode: .default, before: Date(timeIntervalSinceNow: 0.1))
        }
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
