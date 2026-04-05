import Foundation
import Capacitor
import AuthenticationServices

@objc(IOSAuthPlugin)
public class IOSAuthPlugin: CAPPlugin, ASWebAuthenticationPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    @objc func startGoogleAuth(_ call: CAPPluginCall) {
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
            ) { _, error in
                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin {
                    call.reject("Cancelled")
                    return
                }
                // 完了: pollがセッション設定とdashboard遷移を制御する
                call.resolve()
            }

            // ダイアログ無し・ブラウザUI無し
            session.prefersEphemeralWebBrowserSession = true
            session.presentationContextProvider = self
            self.authSession = session
            session.start()
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge!.viewController!.view.window!
    }
}
