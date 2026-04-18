# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.45] - 2026-04-18

### Added
- **AI insight consent dialog**: First-time use of the AI insight button now shows a consent dialog explaining what data is sent to AI (amounts and descriptions) and what is NOT sent (email address, tags). Includes a link to the Privacy Policy. Consent is stored in `localStorage` and not shown again after approval.
- **Send button restored**: Numeric keyboard (`inputMode="numeric"`) does not show a return key on iOS, making submission impossible. Re-added a send button (arrow icon) to the right of the input field.
- **Privacy Policy: AI section added**: Added section 8 "AIの利用について" explaining that AI is only called on explicit user action, what data is included (amounts, descriptions, snapshots) and excluded (email, tags). Updated last modified date to 2026-04-18.

### Changed
- **All bubble width**: All feed bubbles (personal posts, notices, AI insights) changed from `max-w-[70%]` to `max-w-full` — width expands to content, up to full available width.

---

### 追加
- **AIインサイト同意ダイアログ**: AIインサイトボタンの初回押下時に同意ダイアログを表示。AIに送信される情報（金額・説明文）と送信されない情報（メールアドレス・タグ）を明示。プライバシーポリシーへのリンクを掲載。同意は`localStorage`に保存し、2回目以降は表示しない。
- **送信ボタンを復活**: 数値専用キーボード（`inputMode="numeric"`）はiOSでReturnキーが表示されず登録不能になっていた。入力欄右に送信ボタン（矢印アイコン）を再追加。
- **プライバシーポリシー: AI利用について追記**: 第8条「AIの利用について」を追加。AIへの問い合わせはユーザーの明示的な操作時のみ実行されること、送信されるデータ（金額・説明文・残高スナップショット）と送信されないデータ（メールアドレス・タグ）を明記。最終更新日を2026年4月18日に更新。

### 変更
- **全バブル横幅**: 全フィードバブル（個人投稿・お知らせ・AIインサイト）を`max-w-[70%]`から`max-w-full`に変更。コンテンツ幅に応じて最大全幅まで伸縮。

## [0.0.44] - 2026-04-18

### Added
- **AI Insight (circle-level)**: Added "昨日までの傾向をAIに聞いてみる" button to the feed. Pressing it calls Vertex AI (Gemini 2.5 Flash) to generate up to 150-character feedback comparing the previous week and the most recent week. Results are saved to `user_insights` table and displayed as a left-side bubble in the feed. One request per circle per day; button is hidden after use or when no new activity exists since the last insight.
- **Insight full-text dialog**: Bubble displays up to 50 characters with a "続きを読む" link. Tapping the bubble opens a dialog showing the full insight text.
- **Feed range extended to 14 days**: Dashboard feed and insight fetch now cover the past 14 days (was 7 days).
- **Security: GCP project ID moved to env var**: Hardcoded `itsumo-397204` in `insight/route.ts` moved to `GOOGLE_CLOUD_PROJECT` environment variable. `NEXTAUTH_URL` removed from `Dockerfile` and moved to Cloud Run environment variable settings.

### Changed
- **AI insight scope**: Changed from user-level to circle-level. Each circle has its own insight history and button.
- **AI insight prompt**: Compares previous week vs. recent week data (expenses, income, snapshots). Asks for warm, advisor-style comment referencing specific amounts. Encourages thanks for recording. Criticism/warnings prohibited.
- **Bubble width**: All bubbles (personal posts, notices, AI insights) now use `max-w-full` — expanding to content width up to full available width (was `max-w-[70%]`).
- **Input mode**: Numeric-only keyboard (`inputMode="numeric"`). Recent tags feature removed.
- **Share button**: Upgraded to a menu with feed share, copy invite link, and QR code options.

### iOS App
- **Universal Links**: Added `apple-app-site-association` and `Associated Domains` entitlement (`applinks:crun.click`). QR code invite links now open the native app directly.
- **Deep link routing**: Added `CapacitorDeepLink` component using `@capacitor/app` `appUrlOpen` event to navigate to the correct in-app page on Universal Link open.
- **App logo**: Updated SVG icons — "Circle" → "circle" (lowercase C). PNG assets regenerated.

---

### 追加
- **AIインサイト（サークル単位）**: フィードに「昨日までの傾向をAIに聞いてみる」ボタンを追加。押下するとVertex AI（Gemini 2.5 Flash）が前の週と直近1週間を比較した150文字以内のコメントを生成。`user_insights`テーブルに保存し、左バブルとしてフィードに表示。1サークル1日1回まで。AIの最終投稿以降に自分の投稿がない場合はボタン非表示。ADMIN権限のあるサークルのみ表示。
- **インサイト全文ダイアログ**: バブルは50文字まで表示し「続きを読む」リンクを表示。タップすると全文を表示するダイアログが開く。
- **フィード表示期間を14日に拡張**: ダッシュボードのフィードおよびインサイト取得範囲を過去14日に変更（従来は7日）。
- **セキュリティ: GCPプロジェクトIDを環境変数化**: `insight/route.ts`にハードコードされていた`itsumo-397204`を`GOOGLE_CLOUD_PROJECT`環境変数に移動。`NEXTAUTH_URL`を`Dockerfile`からCloud Runの環境変数設定に移動。

### 変更
- **AIインサイトのスコープ**: ユーザー単位からサークル単位に変更。各サークルが独自のインサイット履歴とボタンを持つ。
- **AIインサイトのプロンプト**: 前の週と直近1週間のデータ（支出・収入・残高スナップショット）を比較。具体的な金額に触れた温かいアドバイザー視点のコメントを生成。記録への感謝を添える。批判・警告は禁止。
- **バブル横幅**: 全バブル（個人投稿・お知らせ・AIインサイト）を`max-w-full`に変更。コンテンツ幅に応じて最大全幅まで伸縮（従来は`max-w-[70%]`固定）。
- **入力モード**: 数値専用キーボード（`inputMode="numeric"`）に変更。最近使ったタグ表示機能を削除。
- **シェアボタン**: フィード共有・招待リンクコピー・QRコード表示の3機能を持つメニューに拡張。
- **ダイアログ**: AIの利用同意ダイアログを表示内容を更新。AIが生成する内容の性質と利用規約への同意を明確に説明。

### iOSアプリ
- **Universal Links**: `apple-app-site-association`と`Associated Domains`（`applinks:crun.click`）を追加。招待QRコードのリンクがネイティブアプリを直接起動するように。
- **ディープリンクルーティング**: `@capacitor/app`の`appUrlOpen`イベントを使用する`CapacitorDeepLink`コンポーネントを追加。Universal Link起動時に正しいページへ遷移。
- **アプリロゴ**: SVGアイコンの頭文字を「Circle」→「circle」（小文字C）に変更。PNGアセットを再生成。

## [0.0.43] - 2026-04-11

### Fixed
- **iOS app display name**: `CFBundleDisplayName` in `ios/App/App/Info.plist` was set to `lifequalitylog` (the project directory name). Updated to `CircleRun` so the correct name appears on the home screen after App Store installation.

---

### 修正
- **iOSアプリ表示名**: `Info.plist`の`CFBundleDisplayName`が`lifequalitylog`（プロジェクトディレクトリ名）のままになっていた。`CircleRun`に修正し、App Storeからインストールした際にホーム画面に正しい名前が表示されるよう対応。

## [0.0.42] - 2026-04-08

### Changed
- **Analytics & Settings: header removed, back button moved to bottom-left**: Removed the top header bar (title + back link) from analytics (`/dashboard/analytics`) and settings (`/dashboard/settings`) pages. Content now starts at the top. A floating pill-shaped back button is fixed to the bottom-left corner (`fixed bottom-6 left-6`) with a semi-transparent dark background.
- **All dialogs close on outside tap**: Added `onClick` on the backdrop overlay and `stopPropagation` on the dialog content for all 6 dialogs — UnifiedChat (share settings, circle creation, item detail) and settings page (leave circle, manage circle, add circle).
- **Share dialog: inline public toggle**: The "share not enabled" dialog no longer shows a "Go to settings" button. Instead, it shows a toggle switch to enable/disable public feed directly. Flipping to public immediately shares. A note reads "非公開への変更は設定画面のサークル詳細から可能です".

---

### 変更
- **集計・設定画面: 上部ヘッダー削除・左下固定戻るボタン**: 集計（`/dashboard/analytics`）と設定（`/dashboard/settings`）の上部ヘッダー（タイトル + 戻るリンク）を削除。コンテンツを上詰め。画面左下に半透明の丸い「← 戻る」固定ボタンを追加。
- **全ダイアログ: 外側タップで閉じる**: 全6ダイアログ（UnifiedChat: シェア設定・サークル作成・詳細、設定: 離脱・管理・追加）にオーバーレイクリックで閉じる処理を追加。
- **シェアダイアログ: インライン公開トグル**: 「設定へ」ボタンを削除し、公開/非公開のトグルスイッチをダイアログ内に直接表示。公開ONにした瞬間シェアシートを起動。「非公開への変更は設定画面のサークル詳細から可能です」の注釈を追加。

## [0.0.41] - 2026-04-08

### Fixed
- **iOS session not persisting across app kills**: Session cookie was set without `maxAge`, making it a session-only cookie (memory only). Added `maxAge: 30 * 24 * 60 * 60` (30 days) to persist the cookie to disk in WKWebView.
- **Share sheet icon not showing**: `app/apple-icon.png` was served at a hashed URL by Next.js which iOS could not reliably find. Added `public/apple-touch-icon.png` (180×180, resized from app icon) — iOS fetches this conventional path directly.

---

### 修正
- **iOSアプリ再起動時にログインが切れる問題**: セッションCookieに`maxAge`を指定していなかったためセッションCookie（メモリのみ）になっていた。`maxAge: 30 * 24 * 60 * 60`（30日）を追加しWKWebViewがCookieをディスクに永続化するよう修正。
- **シェアシートにアイコンが表示されない問題**: `app/apple-icon.png`はNext.jsがハッシュ付きURLで配信するためiOSが認識できなかった。`public/apple-touch-icon.png`（180×180、アプリアイコンをリサイズ）を追加し、iOSが標準パスとして直接取得できるよう修正。

## [0.0.40] - 2026-04-07

### Added
- **Sign in with Apple (iOS)**: Added native Apple authentication for App Store review compliance. Uses `ASAuthorizationAppleIDProvider` in `MainViewController.swift`. New `/api/auth/apple-ios` endpoint verifies Apple identity token (JWT) via Apple's JWKS and issues a session. Google and Apple accounts are distinguished by `(provider, providerAccountId)` composite key.
- **Auto-create "おはじめ" circle**: First-time users automatically get a default circle named "おはじめ" created on login. Removed the circle creation screen (`/circles/new` now redirects to `/dashboard`).

### Fixed
- **Twemoji CDN path**: Changed from `npm` to `gh` (GitHub) path — the npm package does not include SVG assets (`1f37d.svg` etc. returned 404).
- **Twemoji variation selector**: Filtered out `U+FE0F` from codepoints when generating SVG URLs. Emoji like `🍽️` were generating `1f37d-fe0f.svg` (non-existent) instead of `1f37d.svg`.
- **Emoji font override**: Added `!important` to `html, body` font-family in `globals.css`. The `next/font/google` class selector (higher specificity) was overriding the emoji font stack.
- **`MainViewController` not instantiated**: `Main.storyboard` was referencing `CAPBridgeViewController` directly instead of `MainViewController`, meaning all Swift overrides were dead code. Fixed by updating `customClass` and `customModule` in the storyboard.
- **`WKScriptMessageHandler` registration**: Moved handler registration from `capacitorDidLoad` to `webView(with:configuration:)` override so handlers are available before the page loads.

---

### 追加
- **Sign in with Apple（iOS）**: App Store審査要件を満たすためネイティブApple認証を追加。`MainViewController.swift`に`ASAuthorizationAppleIDProvider`を実装。`/api/auth/apple-ios`エンドポイントでApple identity token（JWT）をAppleのJWKSで検証してセッションを発行。GoogleとAppleは`(provider, providerAccountId)`複合キーで区別。
- **「おはじめ」サークル自動作成**: 初回ログイン時にサークルが存在しない場合、「おはじめ」サークルをADMINで自動作成してダッシュボードへ遷移。サークル登録画面（`/circles/new`）を廃止しダッシュボードにリダイレクト。

### 修正
- **TwemojiのCDNパス修正**: `npm`パスを`gh`（GitHub）に変更。`npm`パッケージにはSVGアセットが含まれておらず404が返っていた。
- **Twemojiのvariation selector除去**: SVG URL生成時に`U+FE0F`をコードポイントから除外。`🍽️`が`1f37d-fe0f.svg`（存在しない）を参照していた問題を修正。
- **絵文字フォント上書き問題**: `globals.css`の`html, body`フォントに`!important`を追加。`next/font/google`のクラスセレクタ（詳細度が高い）が絵文字フォントスタックを上書きしていた。
- **`MainViewController`が使われていなかった問題**: `Main.storyboard`が`CAPBridgeViewController`を直接参照しており、`MainViewController`のSwiftコードが一切実行されていなかった。`customClass`と`customModule`を修正。
- **`WKScriptMessageHandler`登録タイミング**: ハンドラ登録を`capacitorDidLoad`から`webView(with:configuration:)`オーバーライドに移動し、ページロード前から利用可能にした。

## [0.0.39] - 2026-04-05

### Fixed
- **Emoji display (definitive fix)**: Replaced all emoji text rendering with Twemoji SVG images (`<img>` via CDN). Eliminates all font/encoding dependency in WKWebView. Affects reaction buttons (✅👍👎🙇) and expense category icons (🍽️🛒🚃🎮💡🏥📝).
- **iOS login: SFSafariVC not closing after OAuth**: Replaced JS URL scheme redirect (blocked on iOS 16.4+) with WKWebView polling. WKWebView generates a `pollId`, opens SFSafariVC, and polls `/api/auth/ios-poll` every 2 seconds. When OAuth completes, `/api/auth/ios-callback` stores a signed JWT keyed by `pollId`. WKWebView receives the token, calls `Browser.close()` to close SFSafariVC, then navigates to `/api/auth/ios-session` to set the session cookie and redirect to `/dashboard`.

---

### 修正
- **絵文字表示（最終修正）**: 全ての絵文字テキスト描画をTwemoji SVG画像（CDN経由の`<img>`タグ）に置き換え。WKWebViewでのフォント・文字コード依存を完全に排除。リアクションボタン（✅👍👎🙇）と支出カテゴリアイコン（🍽️🛒🚃🎮💡🏥📝）に適用。
- **iOSログイン: OAuth後にSFSafariVCが閉じない問題（最終修正）**: JSのURLスキームリダイレクト（iOS 16.4以降でセキュリティポリシーによりブロック）をWKWebViewポーリング方式に変更。WKWebViewが`pollId`を生成してSFSafariVCを開き、2秒ごとに`/api/auth/ios-poll`をポーリング。OAuth完了時に`/api/auth/ios-callback`が`pollId`をキーに署名済みJWTを保存。WKWebViewがトークンを受け取り`Browser.close()`でSFSafariVCを閉じ、`/api/auth/ios-session`でCookieをセットして`/dashboard`へ遷移。



### Fixed
- **Emoji display in WKWebView (proper fix)**: Reverted body `font-family` to `Arial, Helvetica, sans-serif` (adding Apple Color Emoji to body broke all Japanese text). Added `.emoji-icon` CSS class with `"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"` font stack. Applied `emoji-icon` class to reaction buttons and category emoji spans in `UnifiedChat.tsx`.
- **iOS auth token exchange: multi-instance safe**: Replaced in-memory `iosTokenStore` with JWT (signed by `AUTH_SECRET` via `jose`). The one-time token is now a signed JWT with 5-minute expiry — stateless and verifiable on any Cloud Run instance without shared state.

---

### 修正
- **WKWebViewでの絵文字表示（正式修正）**: bodyの`font-family`に`Apple Color Emoji`を追加すると日本語テキストが全て`?`になる問題を修正。bodyフォントを元の`Arial, Helvetica, sans-serif`に戻し、絵文字専用の`.emoji-icon` CSSクラス（`"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"`）を追加。`UnifiedChat.tsx`のリアクションボタンとカテゴリ絵文字に`emoji-icon`クラスを適用。
- **iOSトークン交換方式のマルチインスタンス対応**: インメモリの`iosTokenStore`をJWT署名方式（`AUTH_SECRET`を鍵に`jose`で署名）に変更。一時トークンが5分有効期限付きの署名済みJWTになり、Cloud Runのインスタンスが複数になっても共有状態不要でどのインスタンスでも検証可能。



### Fixed
- **Emoji not rendering in WKWebView (root cause)**: `globals.css` body `font-family` was `Arial, Helvetica, sans-serif` which has no emoji fallback in WKWebView. Safari auto-fallbacks to Apple Color Emoji but WKWebView does not. Added `"Apple Color Emoji", "Segoe UI Emoji"` to the font stack. This also fixes category emoji (🍽️🛒🚃 etc.) in feed items.
- **SFSafariVC not closing after OAuth**: Server-side 302 redirects to custom URL schemes (`click.crun.circlerun://`) are not intercepted by SFSafariVC. Changed `/api/auth/ios-callback` to return an HTML page with a JavaScript redirect (`window.location.href = scheme`), which correctly triggers iOS URL scheme handling and closes SFSafariVC.

---

### 修正
- **WKWebViewで絵文字が表示されない根本原因**: `globals.css`のbodyフォントが`Arial, Helvetica, sans-serif`でWKWebViewでの絵文字フォールバックがなかった。Safariは自動的にApple Color EmojiにフォールバックするがwkWebViewはしない。`"Apple Color Emoji", "Segoe UI Emoji"`をフォントスタックに追加。フィードのカテゴリ絵文字（🍽️🛒🚃等）も同時修正。
- **OAuth後にSFSafariVCが閉じない**: サーバーサイドの302リダイレクトはSFSafariVC内でカスタムURLスキームをトリガーしない。`/api/auth/ios-callback`をJavaScriptリダイレクト（`window.location.href = scheme`）を返すHTMLレスポンスに変更し、iOSのURLスキーム処理を正常にトリガー。

## [0.0.18] - 2026-04-05

### Fixed
- **iOS auth token handoff**: Replaced ASWebAuthenticationSession with a token exchange approach. After Google OAuth in SFSafariVC, `/api/auth/ios-callback` generates a one-time token and redirects to `click.crun.circlerun://auth?token=xxx`. SFSafariVC auto-closes (cannot handle URL schemes). `AppDelegate` receives the URL scheme and loads `/api/auth/ios-session` in WKWebView, which sets the session cookie and redirects to `/dashboard`.
- **Reaction emoji font**: Added explicit `Apple Color Emoji` font family and `-webkit-text-size-adjust: none` to prevent WKWebView from failing to render emoji glyphs.

---

### 修正
- **iOSログイントークン交換方式**: ASWebAuthenticationSessionをやめ、トークン交換方式に変更。SFSafariVC内でGoogle OAuthが完了後、`/api/auth/ios-callback`が一時トークンを生成して`click.crun.circlerun://auth?token=xxx`にリダイレクト。SFSafariVCはURLスキームを処理できず自動クローズ。AppDelegateがURLスキームを受け取り、WKWebViewで`/api/auth/ios-session`を読み込み、セッションCookieをセットして`/dashboard`にリダイレクト。
- **リアクション絵文字フォント**: WKWebViewで絵文字グリフが`?`になる問題に対し、`Apple Color Emoji`フォントファミリーを明示指定し`-webkit-text-size-adjust: none`を追加。

## [0.0.17] - 2026-04-05

### Fixed
- **ASWebAuthenticationSession registration**: Replaced the Capacitor plugin approach (`IOSAuthPlugin.swift` + `IOSAuthPlugin.m`) with `WKScriptMessageHandler` via `MainViewController.swift`. Capacitor plugin registration via `.m` file is unreliable with Swift Package Manager, causing `UNIMPLEMENTED` errors. The new approach subclasses `CAPBridgeViewController` as `MainViewController`, injects a `startAuth` message handler, and launches `ASWebAuthenticationSession` directly when called from JavaScript via `window.webkit.messageHandlers.startAuth.postMessage({})`.

---

### 修正
- **ASWebAuthenticationSession登録方式変更**: Capacitorプラグイン（`IOSAuthPlugin.swift` + `IOSAuthPlugin.m`）をやめ、`MainViewController.swift`の`WKScriptMessageHandler`に切り替え。SPM環境では`.m`ファイルによるCapacitorプラグイン登録が`UNIMPLEMENTED`エラーになる問題を回避。`CAPBridgeViewController`を継承した`MainViewController`に`startAuth`メッセージハンドラを追加し、JavaScriptから`window.webkit.messageHandlers.startAuth.postMessage({})`で呼び出す。

## [0.0.16] - 2026-04-05

### Changed
- **iOS OAuth: SFSafariVC → ASWebAuthenticationSession**: Replaced `@capacitor/browser` (SFSafariViewController) with a custom Capacitor plugin (`IOSAuthPlugin`) that uses `ASWebAuthenticationSession`. Unlike SFSafariVC, `ASWebAuthenticationSession` shares cookies with the app's WKWebView, allowing the session to persist after OAuth without browser chrome remaining visible.

### Fixed
- **Reaction icons unified to emoji**: All 4 reaction buttons (✅👍👎🙇) now use `String.fromCodePoint()` for reliable emoji rendering, removing the mixed SVG/emoji inconsistency.

---

### 変更
- **iOS OAuth: SFSafariVC → ASWebAuthenticationSession**: `@capacitor/browser`（SFSafariViewController）を`IOSAuthPlugin`カスタムCapacitorプラグインに置き換え。`ASWebAuthenticationSession`はアプリのWKWebViewとCookieを共有するため、OAuth完了後にブラウザのUIが残らず、セッションが正常に引き継がれる。

### 修正
- **リアクションアイコンを絵文字に統一**: 4つのリアクションボタン（✅👍👎🙇）を`String.fromCodePoint()`による絵文字に統一。SVGと絵文字の混在を解消。

## [0.0.15] - 2026-04-05

### Fixed
- **Reaction icons not rendering on iOS**: Replaced emoji characters (✅👍👎🙇) with lucide-react SVG icons (`CheckCircle`, `ThumbsUp`, `ThumbsDown`, `Heart`). SVG icons are font/encoding independent and render reliably in WKWebView.
- **SFSafariViewController not closing after login**: Root cause was `capacitor.config.ts` `server.url` pointing to `web-7omyj5aulq-an.a.run.app` while session cookies are set for `crun.click`. Changed `server.url` to `https://crun.click` so WKWebView and SFSafariVC share the same domain and cookies.
- **iOS OAuth callback**: Added `IOSAuthCallback` client component to `/dashboard` that detects `?iosCallback=1` and redirects to `click.crun.circlerun://auth-complete` URL scheme, triggering automatic SFSafariVC close.

---

### 修正
- **iOSでリアクションアイコンが表示されない**: 絵文字（✅👍👎🙇）をlucide-reactのSVGアイコンに置き換え。SVGはフォント・文字コードに依存しないためWKWebViewで確実に表示される。
- **ログイン後にSFSafariVCが閉じない根本原因**: `capacitor.config.ts`の`server.url`が`web-7omyj5aulq-an.a.run.app`を向いていたが、セッションCookieは`crun.click`ドメインに設定されるためドメイン不一致が発生。`server.url`を`https://crun.click`に変更してWKWebViewとSFSafariVCのドメインを統一。
- **iOSのOAuthコールバック改善**: `/dashboard`に`IOSAuthCallback`コンポーネントを追加。`?iosCallback=1`を検知してURLスキーム`click.crun.circlerun://auth-complete`にリダイレクトし、SFSafariVCを自動クローズ。

## [0.0.14] - 2026-04-05

### Fixed
- **Reaction emoji rendering on iOS**: Emoji icons (✅ 👍 👎 🙏) in reaction buttons were displaying as `?` due to font size being too small (11px). Increased to 16px and added explicit emoji font family for iOS WebView compatibility.
- **iOS back navigation after login**: `/ios-signin` now checks for an existing session first and redirects to `/dashboard` if already logged in, preventing Internal Server Error on browser back.
- **SFSafariVC auto-close**: Added `browserFinished` listener so that if the user manually closes SFSafariViewController after completing login, the app automatically navigates to `/dashboard`.

---

### 修正
- **iOSでのリアクション絵文字表示**: リアクションボタンの絵文字（✅ 👍 👎 🙏）がフォントサイズ11px小さすぎて`?`と表示されていた問題を修正。16pxに拡大し絵文字フォントファミリーを明示指定。
- **ログイン後のブラウザバックでエラー**: `/ios-signin`でセッション確認を追加し、ログイン済みの場合は`/dashboard`にリダイレクトしてInternal Server Errorを回避。
- **SFSafariVC手動クローズ対応**: `browserFinished`リスナーを追加し、ユーザーがログイン完了後にSFSafariVCを手動で閉じた場合も自動で`/dashboard`に遷移。

## [0.0.13] - 2026-04-05

### Fixed
- **iOS Login UX**: Eliminated the redundant login page shown in SFSafariViewController. `CapacitorLoginButton` now opens `/ios-signin` which auto-fetches a CSRF token and submits directly to Google OAuth — the user goes straight to Google without seeing the login page again.

---

### 修正
- **iOSログインUX改善**: SFSafariViewControllerで再度ログイン画面が表示される問題を修正。`CapacitorLoginButton`が`/ios-signin`を開き、CSRFトークンを自動取得してGoogle OAuthに直接遷移。ユーザーがログインページを2回見ることなくスムーズにGoogleログインへ進む。

## [0.0.12] - 2026-04-05

### Fixed
- **iOS Google Login PKCE error**: Root cause identified from Cloud Run logs: `InvalidCheck: pkceCodeVerifier value could not be parsed`. The PKCE cookie was set for the `web-7omyj5aulq-an.a.run.app` domain but the OAuth callback came to `crun.click`, causing a domain mismatch. Fixed by: (1) changing `SERVER_URL` to `https://crun.click` in `CapacitorLoginButton`, and (2) setting `checks: ["state"]` on the Google provider to disable PKCE and use state-only CSRF protection (sufficient for server-side apps with a client secret).

---

### 修正
- **iOSでのGoogleログインPKCEエラー修正**: Cloud Runログで原因を特定：`InvalidCheck: pkceCodeVerifier value could not be parsed`。PKCEのCookieが`web-7omyj5aulq-an.a.run.app`ドメインに設定されたが、OAuthコールバックが`crun.click`に来るためドメイン不一致が発生。修正内容：(1) `CapacitorLoginButton`の`SERVER_URL`を`https://crun.click`に変更、(2) Googleプロバイダーに`checks: ["state"]`を設定してPKCEを無効化しstateのみのCSRF保護に変更（クライアントシークレットを持つサーバーサイドアプリでは十分）。

## [0.0.11] - 2026-04-05

### Fixed
- **iOS Google Login (simplified approach)**: Removed all custom sign-in pages and URL scheme redirects. `CapacitorLoginButton` now opens the existing top page in `SFSafariViewController`. After the user completes Google OAuth, `browserPageLoaded` detects a valid session and automatically closes the browser via `Browser.close()`, then navigates to `/dashboard`.

---

### 修正
- **iOSでのGoogleログイン（シンプル化）**: カスタムサインインページとURLスキームリダイレクトをすべて廃止。`CapacitorLoginButton`がSFSafariViewControllerでトップページを開き、Google OAuth完了後に`browserPageLoaded`でセッションを検知して`Browser.close()`でブラウザを自動クローズ、`/dashboard`に遷移する。

## [0.0.10] - 2026-04-05

### Fixed
- **iOS Google Login (working fix)**: Abandoned the custom `/ios-signin` page approach. Instead, `CapacitorLoginButton` now opens the existing top page (`/?callbackUrl=/ios-auth-complete`) in SFSafariViewController. This reuses the exact same Server Action sign-in flow that already works on web, eliminating NextAuth configuration errors.

---

### 修正
- **iOSでのGoogleログイン（動作確認済み修正）**: 独自の`/ios-signin`ページアプローチを廃止。`CapacitorLoginButton`がSFSafariViewControllerでトップページ（`/?callbackUrl=/ios-auth-complete`）を開くように変更。Webで動作確認済みの既存Server Actionサインインフローをそのまま再利用し、NextAuthの設定エラーを解消。

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
