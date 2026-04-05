import UIKit
import Capacitor
import WebKit
import AuthenticationServices

class MainViewController: CAPBridgeViewController, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    override func webView(with frame: CGRect, configuration: WKWebViewConfiguration) -> WKWebView {
        configuration.userContentController.add(self, name: "startAuth")
        configuration.userContentController.add(self, name: "startAppleAuth")
        return super.webView(with: frame, configuration: configuration)
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "startAuth" {
            guard let body = message.body as? [String: Any],
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
        } else if message.name == "startAppleAuth" {
            DispatchQueue.main.async { [weak self] in
                let provider = ASAuthorizationAppleIDProvider()
                let request = provider.createRequest()
                request.requestedScopes = [.fullName, .email]
                let controller = ASAuthorizationController(authorizationRequests: [request])
                controller.delegate = self
                controller.presentationContextProvider = self
                controller.performRequests()
            }
        }
    }

    // MARK: - ASAuthorizationControllerDelegate

    func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
        guard let credential = authorization.credential as? ASAuthorizationAppleIDCredential,
              let tokenData = credential.identityToken,
              let identityToken = String(data: tokenData, encoding: .utf8) else { return }

        let firstName = credential.fullName?.givenName ?? ""
        let lastName = credential.fullName?.familyName ?? ""

        let payload: [String: String] = [
            "identityToken": identityToken,
            "firstName": firstName,
            "lastName": lastName
        ]
        guard let jsonData = try? JSONSerialization.data(withJSONObject: payload),
              let jsonString = String(data: jsonData, encoding: .utf8) else { return }

        DispatchQueue.main.async { [weak self] in
            self?.bridge?.webView?.evaluateJavaScript("window.__appleAuthCompleted && window.__appleAuthCompleted(\(jsonString))")
        }
    }

    func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {}

    // MARK: - Presentation Anchors

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.view.window!
    }

    func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
        return self.view.window!
    }
}
