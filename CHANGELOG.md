# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
