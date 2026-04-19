import UIKit
import Capacitor

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
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
        guard url.scheme == "click.crun.circlerun",
              let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
        }

        // Handle iOS auth token exchange: click.crun.circlerun://auth?token=xxx
        if let token = components.queryItems?.first(where: { $0.name == "token" })?.value,
           url.host == "auth",
           let sessionURL = URL(string: "https://crun.click/api/auth/ios-session?token=\(token)") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                if let vc = self.window?.rootViewController as? CAPBridgeViewController {
                    vc.webView?.load(URLRequest(url: sessionURL))
                }
            }
            return true
        }

        // Handle invite link: click.crun.circlerun://join?circleId=xxx
        if url.host == "join",
           let circleId = components.queryItems?.first(where: { $0.name == "circleId" })?.value,
           let joinURL = URL(string: "https://crun.click/join?circleId=\(circleId)") {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                if let vc = self.window?.rootViewController as? CAPBridgeViewController {
                    vc.webView?.load(URLRequest(url: joinURL))
                }
            }
            return true
        }
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
