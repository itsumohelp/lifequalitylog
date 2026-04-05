import Foundation
import Capacitor
import AuthenticationServices

@objc(IOSAuthPlugin)
public class IOSAuthPlugin: CAPPlugin, ASWebAuthenticationPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    @objc public func startGoogleAuth(_ call: CAPPluginCall) {
        let pollId = call.getString("pollId") ?? ""
        guard let authURL = URL(string: "https://crun.click/ios-signin?pollId=\(pollId)") else {
            call.reject("Invalid auth URL")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: "click.crun.circlerun"
            ) { [weak self] _, error in
                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin {
                    call.reject("Cancelled")
                    return
                }
                // OAuth完了をJSに即通知してpollを即時実行させる
                DispatchQueue.main.async {
                    self?.bridge?.webView?.evaluateJavaScript("window.__authSessionCompleted && window.__authSessionCompleted()")
                }
                call.resolve()
            }

            // Safariのログイン状態を共有（初回のみ確認ダイアログ）
            session.prefersEphemeralWebBrowserSession = false
            session.presentationContextProvider = self
            self.authSession = session
            session.start()
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge!.viewController!.view.window!
    }
}
