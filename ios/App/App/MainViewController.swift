import UIKit
import Capacitor
import WebKit
import AuthenticationServices

class MainViewController: CAPBridgeViewController, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    override func capacitorDidLoad() {
        bridge?.webView?.configuration.userContentController.add(self, name: "startAuth")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        guard message.name == "startAuth",
              let body = message.body as? [String: Any],
              let pollId = body["pollId"] as? String,
              let authURL = URL(string: "https://crun.click/ios-signin?pollId=\(pollId)") else { return }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let session = ASWebAuthenticationSession(url: authURL, callbackURLScheme: "click.crun.circlerun") { [weak self] _, error in
                if let error = error as? ASWebAuthenticationSessionError, error.code == .canceledLogin { return }
                DispatchQueue.main.async {
                    self?.bridge?.webView?.evaluateJavaScript("window.__authSessionCompleted && window.__authSessionCompleted()")
                }
            }
            session.prefersEphemeralWebBrowserSession = false
            session.presentationContextProvider = self
            self.authSession = session
            session.start()
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.view.window!
    }
}
