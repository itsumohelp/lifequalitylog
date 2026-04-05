# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.9] - 2026-04-05

### Fixed
- **iOS Google Login CSRF fix**: Changed `/ios-signin` from a Route Handler to a client-side page. The page fetches the CSRF token via `/api/auth/csrf` within SFSafariViewController's cookie context, then dynamically builds and submits a POST form to `/api/auth/signin/google`. This ensures the CSRF token cookie and form token are in the same browser context.

---

### 修正
- **iOSでのGoogleログインCSRF修正**: `/ios-signin`をRoute HandlerからクライアントサイドPageに変更。SFSafariViewControllerのCookieコンテキスト内で`/api/auth/csrf`からCSRFトークンを取得し、動的にPOSTフォームを生成して`/api/auth/signin/google`に送信。CSRFトークンのCookieとフォームトークンが同一ブラウザコンテキストに存在することを保証する。

## [0.0.8] - 2026-04-05

### Fixed
- **iOS Google Login flow (complete fix)**: Replaced the auto-submit Server Action page with a proper GET Route Handler at `/ios-signin`. After OAuth completes, NextAuth redirects to `/ios-auth-complete` which immediately redirects to the custom URL scheme `click.crun.circlerun://auth-complete`. This causes SFSafariViewController to close automatically, triggering `browserFinished` in the app which then navigates to `/dashboard`.

---

### 修正
- **iOSでのGoogleログインフロー（完全修正）**: Server Actionの自動送信ページをGET Route Handler（`/ios-signin`）に置き換え。OAuth完了後、NextAuthが`/ios-auth-complete`にリダイレクト。このページがカスタムURLスキーム`click.crun.circlerun://auth-complete`にリダイレクトすることでSFSafariViewControllerが自動的に閉じ、`browserFinished`イベントが発火してアプリが`/dashboard`に遷移する。

## [0.0.7] - 2026-04-05

### Fixed
- **iOS Google Login via SFSafariViewController (fix)**: Removed `windowName: "_self"` option from `Browser.open()` which was causing the OAuth to open inside the WebView instead of SFSafariViewController. Google blocks OAuth in WebViews, causing the internal server error. Also moved `browserFinished` listener setup to component mount to prevent duplicate listeners.

---

### 修正
- **iOSでのGoogleログイン修正（SFSafariViewController）**: `Browser.open()`の`windowName: "_self"`オプションを削除。このオプションによりOAuthがSFSafariViewControllerではなくWebView内で開かれ、GoogleがWebView内のOAuthをブロックしていた。また`browserFinished`リスナーをコンポーネントマウント時に一度だけ登録するよう修正し、重複登録を防止。

## [0.0.6] - 2026-04-05

### Fixed
- **iOS Google Login flow**: Instead of opening `/api/auth/signin/google` directly (which caused a CSRF error), a dedicated `/ios-signin` page is opened via `SFSafariViewController`. The page auto-submits the NextAuth sign-in form, correctly handling CSRF tokens.

---

### 修正
- **iOSでのGoogleログインフロー修正**: `/api/auth/signin/google`を直接GETで開くとCSRFエラーになる問題を修正。専用の`/ios-signin`ページを作成し、`SFSafariViewController`で開いた後にフォームを自動送信することでNextAuthのCSRFトークンを正しく処理する。

## [0.0.5] - 2026-04-05

### Added
- **iOS Google Login via SFSafariViewController**: On Capacitor iOS, the login button now opens Google OAuth in `SFSafariViewController` instead of the WebView. Cookies are shared between SFSafariViewController and WKWebView (iOS 11+), so session is automatically available after login.

---

### 追加
- **iOSでのGoogleログイン（SFSafariViewController対応）**: Capacitor iOS環境では、ログインボタンが`SFSafariViewController`でGoogle認証を開くように変更。SFSafariViewControllerとWKWebView間でCookieが共有されるため（iOS 11+）、ログイン後にセッションが自動的に引き継がれる。

## [0.0.4] - 2026-04-05

### Fixed
- **iOS WebView Alert suppression (revised)**: Switched detection from User-Agent to `window.Capacitor` object. This correctly identifies the CircleRun iOS app and suppresses the "please open in browser" alert.

---

### 修正
- **iOSアプリでのWebView警告非表示化（修正）**: User-Agent検知から `window.Capacitor` オブジェクトの存在チェックに変更。Capacitor環境を正確に識別し、「ブラウザで開いてください」警告を非表示にする。

## [0.0.3] - 2026-04-05

### Fixed
- **iOS WebView Alert suppression**: Added `CircleRun-iOS` suffix to the WKWebView User-Agent in `AppDelegate.swift`. The "please open in browser" alert is now correctly hidden when running inside the CircleRun iOS app.

---

### 修正
- **iOSアプリでのWebView警告を非表示化**: `AppDelegate.swift` でWKWebViewのUser-Agentに `CircleRun-iOS` を追加。CircleRun iOSアプリ内では「ブラウザで開いてください」の警告が表示されなくなった。

## [0.0.2] - 2026-04-05

### Added
- **iOS App (Prototype)**: Capacitor-based iOS app wrapping the web app via WebView. Loads the production Cloud Run URL, preserving all existing SSR features.
- **Capacitor Native Detection**: `window.Capacitor` check added to suppress the "please open in browser" alert when running inside the CircleRun iOS app.

---

### 追加
- **iOSアプリ（プロトタイプ）**: CapacitorでWebViewラップしたiOSアプリを追加。本番のCloud Run URLを読み込む構成で、既存のSSR機能をそのまま活用。
- **Capacitorネイティブ検知**: `window.Capacitor` を検知してCircleRun iOSアプリ内では「ブラウザで開いてください」の警告を非表示にする対応を追加。

## [0.0.1] - 2026-04-05

### Added
- **Mini Balance Chart**: After registering an expense, income, or balance snapshot, a 30-day sparkline chart appears at the top of the feed. Rising trends are shown in green, falling in red, with a diff summary. Can be dismissed with the × button at any time.

### Fixed
- **Amount-only input support**: Entering a number only (e.g. `500`) now correctly registers as an untagged expense in the "Other" category. Previously, `1500` was misinterpreted as tag `1` with amount `500`.
- **OGP image cache busting**: Added `revalidate=0` to the public feed OGP image route, and appended a balance+date-based query string (`?v=balance-date`) to the image URL. This prevents stale OGP images from being cached on social media.

---

### 追加
- **残高推移ミニチャート**: 支出・収入・残高を登録した際、フィード上部に直近30日間の残高推移スパークラインを表示。上昇は緑、下降は赤で色分けし、差分を表示。右上のバツボタンでいつでも非表示にできる。

### 修正
- **金額のみ入力に対応**: 数字だけ（例: `500`）を入力した場合、タグなし・カテゴリ「その他」として正しく登録できるように修正。以前は `1500` を入力するとタグ`1`・金額`500` と誤って解釈されていた。
- **OGP画像キャッシュ対策**: 公開フィードページのOGP画像に `revalidate=0` を追加し、残高＋日付ベースのキャッシュバスター用クエリ文字列（`?v=残高-日付`）を付与。SNSへのシェア時に古い画像がキャッシュされなくなった。
