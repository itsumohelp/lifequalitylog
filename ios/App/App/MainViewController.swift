import UIKit
import Capacitor
import AuthenticationServices
import WebKit

class MainViewController: CAPBridgeViewController, WKScriptMessageHandler, ASWebAuthenticationPresentationContextProviding {

    private var authSession: ASWebAuthenticationSession?

    override func viewDidLoad() {
        super.viewDidLoad()
    }

    override func webViewDidLoad() {
        super.webViewDidLoad()
        // webViewがCapacitorによって確実に初期化された後にハンドラを登録する
        webView?.configuration.userContentController.add(self, name: "startAuth")
    }

    func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage) {
        if message.name == "startAuth" {
            let pollId = (message.body as? [String: Any])?["pollId"] as? String ?? ""
            startASWebAuth(pollId: pollId)
        }
    }

    private func startASWebAuth(pollId: String) {
        guard let authURL = URL(string: "https://crun.click/ios-signin?pollId=\(pollId)") else { return }

        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }

            let session = ASWebAuthenticationSession(
                url: authURL,
                callbackURLScheme: "click.crun.circlerun"
            ) { [weak self] _, error in
                guard let self = self, error == nil else { return }
                // OAuth完了をJSに即通知してpollを即時実行させる
                DispatchQueue.main.async {
                    self.webView?.evaluateJavaScript("window.__authSessionCompleted && window.__authSessionCompleted()")
                }
            }

            // false: Safariのログイン状態を共有（初回のみ確認ダイアログ）
            session.prefersEphemeralWebBrowserSession = false
            session.presentationContextProvider = self
            self.authSession = session
            session.start()
        }
    }

    func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        return view.window!
    }
}
