import UIKit
import Capacitor
import AuthenticationServices
import WebKit

class MainViewController: CAPBridgeViewController, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    override func viewDidLoad() {
        super.viewDidLoad()
        // Register JS message handler so JS can call window.webkit.messageHandlers.startAuth.postMessage({})
        webView?.configuration.userContentController.add(self, name: "startAuth")
        webView?.configuration.userContentController.add(self, name: "navigateToDashboard")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "startAuth" {
            startASWebAuth()
        } else if message.name == "navigateToDashboard" {
            DispatchQueue.main.async { [weak self] in
                if let url = URL(string: "https://crun.click/dashboard") {
                    self?.webView?.load(URLRequest(url: url))
                }
            }
        }
    }

    private func startASWebAuth() {
        guard let authURL = URL(string: "https://crun.click/ios-signin") else { return }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: "click.crun.circlerun"
            ) { [weak self] _, error in
                guard let self = self, error == nil else { return }
                DispatchQueue.main.async {
                    if let url = URL(string: "https://crun.click/dashboard") {
                        self.webView?.load(URLRequest(url: url))
                    }
                }
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.authSession = session
            session.start()
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return view.window!
    }
}
