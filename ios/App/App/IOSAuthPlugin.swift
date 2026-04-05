import Foundation
import Capacitor
import AuthenticationServices

@objc(IOSAuthPlugin)
public class IOSAuthPlugin: CAPPlugin, ASWebAuthenticationPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    @objc func startGoogleAuth(_ call: CAPPluginCall) {
        let authURLString = "https://crun.click/ios-signin"
        let callbackScheme = "click.crun.circlerun"

        guard let authURL = URL(string: authURLString) else {
            call.reject("Invalid auth URL")
            return
        }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: callbackScheme
            ) { [weak self] callbackURL, error in
                guard let self = self else { return }

                if let error = error as? ASWebAuthenticationSessionError,
                   error.code == .canceledLogin {
                    call.reject("Cancelled")
                    return
                }

                if let error = error {
                    call.reject(error.localizedDescription)
                    return
                }

                // OAuth completed — navigate WKWebView to dashboard
                DispatchQueue.main.async {
                    if let webView = self.bridge?.webView,
                       let dashboardURL = URL(string: "https://crun.click/dashboard") {
                        webView.load(URLRequest(url: dashboardURL))
                    }
                }
                call.resolve(["url": callbackURL?.absoluteString ?? ""])
            }

            session.presentationContextProvider = self
            session.prefersEphemeralWebBrowserSession = false
            self.authSession = session
            session.start()
        }
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return self.bridge!.viewController!.view.window!
    }
}
