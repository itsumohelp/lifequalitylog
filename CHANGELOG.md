# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.0.62] - 2026-05-02

### Changed
- **AI insight button label**: Shortened "AIに分析してもらう" → "AI分析" to prevent line wrapping.

---

### 変更
- **AIインサイトボタンのラベル**: "AIに分析してもらう" → "AI分析" に短縮（改行防止）。

---

## [0.0.61] - 2026-05-02

### Added
- **Quick registration mode**: When "簡易登録モード" (formerly auto-tag) is enabled, quick amount buttons (¥500 / ¥1,000 / ¥2,000) appear in the insights/warikan row for one-tap expense registration.
- **Blur auto-submit**: With 簡易登録モード on, focusing out of the amount field auto-submits when the input is numeric — no need to tap the send button.

### Changed
- **Icon refresh**: Replaced the old dark circle + ¥ icon with the new "circle / run" wordmark across all surfaces (login page inline SVG, OGP image, iOS app icon).
- **AI insight button label**: Shortened "昨日までの傾向をAIに聞いてみる" → "AIに分析してもらう".
- **Settings label**: "自動タグ付け" renamed to "簡易登録モード" to reflect the broader feature scope.

---

### 追加
- **簡易登録モード（クイックボタン）**: 簡易登録モードがONのとき、インサイト/割り勘行に ¥500・¥1,000・¥2,000 のクイック登録ボタンを表示。ワンタップで即登録できる。
- **フォーカスアウト自動登録**: 簡易登録モードON時、入力欄に数字のみが入力された状態でフォーカスアウトすると自動送信。登録ボタンを押す手間を省略。

### 変更
- **アイコン刷新**: 旧デザイン（ダーク背景 + ¥記号）から新デザイン（"circle / run" ワードマーク）に全面切り替え。ログインページのインラインSVG・OGP画像・iOSアプリアイコンを更新。
- **AIインサイトボタンのラベル**: "昨日までの傾向をAIに聞いてみる" → "AIに分析してもらう" に短縮。
- **設定ラベル変更**: "自動タグ付け" → "簡易登録モード" に改名（機能の実態に合わせて）。

---

## [0.0.60] - 2026-04-29

### Changed
- **Good reaction button**: Reduced from 4 reaction types (CHECK / GOOD / BAD / DOGEZA) to Good only. Button is now a circle overlapping the bottom-right corner of the bubble. Shows press count at all times.
- **AI insight / warikan buttons**: Reverted from FAB popup to individual inline buttons displayed side by side below the feed. Warikan button is now hidden when there are no expenses in the current month.

---

### 変更
- **Goodリアクションボタン**: リアクション種別を4種（CHECK / GOOD / BAD / DOGEZA）からGoodのみに削減。ボタンはバブル右下に重なる円形に変更。押下数を常時表示。
- **AIインサイト / 割り勘ボタン**: FABポップアップ方式をやめ、フィード下部に横並びで個別ボタンとして表示する方式に戻した。割り勘ボタンは当月の支出がない場合は非表示。

---

## [0.0.59] - 2026-04-26

### Added
- **Notification bell**: Bell icon added next to the logo in the header. Opens a drawer showing: incoming claims (expenses where you are the claimee), warikan uncollected reminders (3+ days since posting with uncollected members), and operations notices. Unread items show a red badge count on the bell icon; opening the drawer marks all as read. Polling every 60 seconds.
- **Warikan templates**: Save and load warikan configurations (number of people, period) per circle. Templates appear as tag chips in the warikan dialog; tap to apply, long-press area to delete. Stored in `warikan_templates` table.
- **OGP image for item URLs**: `/item/{type}-{id}` pages now generate a social card image (`opengraph-image.tsx`) showing app name, circle name, ±¥amount, kind label, and JST datetime. Uses Noto Sans JP fetched at render time.
- **FAB button**: Replaced the separate AI insight and warikan buttons (which took vertical space in the feed) with a single floating `+` button in the bottom-right corner of the feed. Tapping shows a popup menu with ✨ AIに聞いてみる and 💴 割り勘. AI option is hidden if already used today; warikan option is hidden unless the circle has 2+ members and current-month records exist.

### Changed
- **Detail modal simplified**: Removed サークル残高, サークル, 内容, 投稿者, 日時 rows. Circle balance now shown inline after the amount `（¥X）`. Time shown inline after 処理日. Timeline bump moved to a compact `↓` button in the bottom row alongside 戻る and 削除.
- **Warikan feed bubble**: Replaced member-row list with a single flex-wrap line: `割り勘（期間）¥XX/人　N人　[N人未回収]`.

### Fixed
- **Reaction 400 on warikan notifications**: API `targetType` validation was missing `"notification"`, causing all reactions on warikan result feed items to fail with 400. Added `"notification"` to the allowed list.

---

### 追加
- **通知ベル**: ヘッダーのロゴ右隣にベルアイコンを追加。ドロワーを開くと、自分への請求（未回収の claimee 支出）・割り勘未回収リマインダー（投稿後3日以上経過・未回収メンバーあり）・運営からのお知らせを一覧表示。未読アイテムがある場合はベルアイコンに赤いバッジを表示。ドロワーを開くと全件既読に。60秒ごとにポーリング更新。
- **割り勘テンプレート**: 人数・期間の割り勘設定をサークル単位で保存・呼び出しできる機能を追加。割り勘ダイアログにテンプレートがタグチップとして表示され、タップで即適用、削除も可能。`warikan_templates`テーブルに保存。
- **アイテムURLのOGP画像**: `/item/{type}-{id}` ページでソーシャルカード画像（`opengraph-image.tsx`）を生成。アプリ名・サークル名・±¥金額・種別ラベル・JST日時を表示。Noto Sans JP をレンダリング時にフェッチして使用。
- **FABボタン**: フィードの縦幅を圧迫していた AIインサイトボタンと割り勘ボタンを廃止し、フィード右下の `+` FABボタン1つに集約。タップするとポップアップメニューで ✨ AIに聞いてみる / 💴 割り勘 を選択できる。AIは当日実施済みの場合は非表示。割り勘はサークルに2人以上いて当月の実績がある場合のみ表示。

### 変更
- **詳細モーダル簡素化**: サークル残高・サークル・内容・投稿者・日時 の各行を削除。サークル残高は金額の右に `（¥X）` で併記。時刻は処理日の右に併記。タイムライン最新移動は `↓` のコンパクトボタンに変更し、戻る・削除と同じ行に配置。
- **割り勘フィードバブル**: メンバー行一覧を廃止し、`割り勘（期間）¥XX/人　N人　[N人未回収]` の1行表示に変更。

### 修正
- **割り勘通知へのリアクションが400エラー**: APIの`targetType`バリデーションに`"notification"`が含まれておらず、割り勘結果フィードへのリアクションが全件400エラーになっていた。`"notification"`を許可リストに追加して修正。

---

## [0.0.58] - 2026-04-28

### Added
- little bug fix

### 追加
- ちょっとしたバグ修正

---

## [0.0.57] - 2026-04-27

### Added
- **Expense claim (請求先)**: After registering an expense, open the detail view to assign a circle member as the claimee — the person you fronted money for. The feed shows a 💸 badge with the claimee's avatar and name. Setting the claimee is restricted to the expense owner (EDITOR) or circle ADMIN.
- **Deleted-user placeholder for claimee**: When the claimee's account is deleted, their name is preserved in a `claimeeNameCache` column. The UI shows a grey "?" avatar with "（退会済み）" instead of breaking. Circle withdrawal (without account deletion) continues to display the user normally since their account still exists.

### 追加
- **支出の請求先設定**: 支出の詳細画面からサークルメンバーを請求先として設定できる機能を追加。立替払いした相手を指定すると、フィードの支出バブルに💸バッジ＋アバター＋名前が表示される。設定はEDITOR（自分の支出のみ）またはADMINが可能。
- **削除済みユーザーのプレースホルダー表示**: 請求先ユーザーがアカウントを削除した場合、名前を`claimeeNameCache`カラムに保持。UIではグレーの「?」アバターと「（退会済み）」テキストで表示し、参照エラーを回避。サークル脱退のみ（アカウント削除なし）の場合はユーザーが存在するため通常表示。

---

## [0.0.55] - 2026-04-26

### Added
- **Warikan (bill splitting)**: Added a 💴 割り勘 button next to the AI insight button. Opens a dialog to select a period (current month / 30 days / 90 days / all time) and the number of people. Shows each member's paid amount and per-person share. Results can be posted to the feed as a notification. Feed shows a graphical breakdown with avatars, names, and diff badges (sky=receive, red=pay). Reactions and delete supported on warikan posts.
- **Warikan detail view**: Tapping a warikan feed item opens a detail view with tappable amounts — tapping copies the number to clipboard.
- **AI insight numeric summary**: The AI insight response now includes a numeric summary (expense comparison vs. previous week, income comparison, top-3 tag breakdown) displayed below the AI comment.
- **Transaction date editing**: Expense and income items now have a 処理日 (processing date) field in the detail view. Defaults to registration date. Can be edited via date picker (no future dates allowed). Updates `expenseDate` / `incomeDate` in the DB via PATCH. Read-only display for non-editable items.
- **Apple ID login button (web)**: On iOS Safari, a black "Apple IDでログイン（アプリで開く）" button now appears below the Google login button. Tapping it opens the native app via `click.crun.circlerun://` deep link. Requires agreement checkbox. Only shown on iOS non-Capacitor environments.

### Changed
- **Warikan bubble colors**: Warikan text in own-message (dark) bubbles now uses white/light colors for readability.
- **Button bar spacing**: Added vertical padding (`py-2`) to the AI/warikan button bar to prevent accidental taps.

### 追加
- **割り勘**: AIインサイトボタン横に💴割り勘ボタンを追加。期間（今月/30日/90日/全期間）と人数を選択してサークル内の支払い一覧を集計。1人あたりの負担額と各メンバーの差額を表示し、結果をフィードに投稿できる。フィードではアバター・名前・差額バッジ（空色=受取、赤=支払）でグラフィカルに表示。リアクション・削除に対応。
- **割り勘詳細ビュー**: 割り勘フィードアイテムをタップすると詳細ビューが開き、金額をタップするとクリップボードにコピーされる。
- **AIインサイト数値サマリー**: AIインサイトのレスポンスに数値サマリー（前週との支出比較・収入比較・タグ別トップ3）を追加。AIコメントの下に表示。
- **処理日の編集**: 支出・収入の詳細画面に「処理日」フィールドを追加。デフォルトは登録日。日付ピッカーで変更可能（未来日は選択不可）。変更時はPATCHで `expenseDate` / `incomeDate` を即時更新。編集権限がない場合は日本語テキスト表示のみ。
- **Apple IDログインボタン（Web）**: iOS Safariのログイン画面にApple IDボタンを追加。タップすると `click.crun.circlerun://` でネイティブアプリを起動。招待リンク経由の場合は参加画面に直接遷移。同意チェック必須。iOSの非Capacitor環境のみ表示。

### 変更
- **割り勘バブルの文字色**: 自分のメッセージ（黒バブル）内の割り勘テキストを白系の明るい色に変更し視認性を改善。
- **ボタンバーの余白**: AI/割り勘ボタンバーに上下パディング（`py-2`）を追加し、誤タップを防止。

---

## [0.0.53] - 2026-04-20

### Added
- **In-app notifications**: Added `Notification` model (`notifications` table) for circle-scoped events. When a user joins via invite link, a "○○さんが参加しました" notification record is created automatically.
- **Notification feed items**: Notifications appear in the timeline feed with a 🔔 header and message body. No reactions or delete buttons.
- **Notification filter**: The existing bell icon filter (timeline view) now filters to both admin notices (`notice`) and circle notifications (`notification`) simultaneously.

### 追加
- **アプリ内通知**: サークル単位のイベントを記録する `Notification` モデル（`notifications` テーブル）を追加。招待リンクからユーザーが参加した際に「○○さんが参加しました」の通知レコードを自動作成。
- **通知フィード表示**: 通知はタイムラインフィードに🔔ヘッダー＋メッセージ本文で表示。リアクション・削除ボタンはなし。
- **通知フィルター拡張**: タイムラインのベルアイコンフィルターを押すと、運営からのお知らせ（`notice`）とサークル通知（`notification`）の両方に絞り込まれるよう拡張。

---

## [0.0.52] - 2026-04-19

### Added
- **Time-based category tag suggestions**: When editing tags in the detail view, a "カテゴリから選択" section now appears with pre-defined category tags suggested based on the time of day the item was registered (morning/lunch/afternoon/evening/night). Already-applied tags are excluded.
- **Exact amount match (Pass 0) for auto-tagging**: Added a highest-priority pass before existing fallback logic. If the registered amount has a non-zero ones digit (e.g., ¥487 but not ¥500 or ¥1000), past records with the exact same amount and same weekday/weekend type are checked first. Round numbers are excluded to avoid false positives from generic amounts.
- **Income auto-tagging**: Auto-tag support extended to income registration. `autoTags` field added to Income model. Income items show auto-tags (amber ✦ pill) in the feed and detail view, and auto-tags can be deleted from the detail view.
- **Income tag editing**: Manual tags on income items can now be added and removed from the detail view (same as expense tags).

### 追加
- **時間帯別カテゴリタグサジェスト**: 詳細画面でタグ編集時に「カテゴリから選択」セクションを追加。登録時刻に応じた時間帯（朝/昼/午後/夜/深夜）のカテゴリタグを提案。既に付与済みのタグは除外して表示。
- **金額完全一致パス（Pass 0）の追加**: 既存フォールバックの前段に最優先パスを追加。登録金額の1の位が0でない場合（例: 487円はOK、500円・1000円はスキップ）、過去40日以内で平日/休日＋金額完全一致を最初にチェック。汎用的な金額での誤付与を防ぐため端数なし金額は除外。
- **収入の自動タグ付け**: 自動タグ付けを収入にも対応。IncomeモデルにautoTagsフィールドを追加。フィードと詳細画面で収入の自動タグ（amber ✦ピル）を表示・削除可能。
- **収入のタグ編集**: 収入アイテムの手動タグを詳細画面から追加・削除可能に（支出タグと同じ操作）。

---

## [0.0.50] - 2026-04-19

### Changed
- **Auto-tag lookback period**: Reduced from 90 days to 40 days for more relevant tag suggestions.

### 変更
- **自動タグの参照期間**: 過去90日から40日に短縮。より直近の支出パターンに基づいたタグ提案を行う。

---

## [0.0.49] - 2026-04-19

### Fixed
- **Auto-tag matching threshold**: Changed from "60% of matching records" to "tag appears 2+ times in matches". Previously, with many historical expenses matching the criteria, the 60% threshold was too high for newly added tags to reach. Now any tag appearing at least twice in matching past expenses is suggested.

### 修正
- **自動タグ閾値の修正**: マッチ条件を「マッチ件数の60%以上」から「同タグが2件以上」に変更。過去の支出が多い場合に60%の閾値が高すぎて新しいタグが提案されない問題を修正。

---

## [0.0.48] - 2026-04-19

### Added
- **Rule-based auto-tagging (opt-in)**: When registering an expense, the system automatically suggests tags based on past spending patterns in the same circle. Disabled by default; can be enabled in Settings.
  - Matching criteria (cascading fallback): ① weekday/weekend + amount 50–150% + time ±4hr → ② weekday/weekend + amount → ③ weekday/weekend + time. Past 90 days, minimum 2 matching records with the same tag.
  - Auto-tags are stored separately from manual tags (`autoTags` field on Expense model).
  - Auto-tags are visually distinct in the feed and detail view: amber background (`bg-amber-500`) with ✦ prefix.
  - Auto-tags can be deleted from the detail view (same mechanism as manual tags).
  - Auto-tags are included in analytics tag filtering.
- **Settings toggle**: "自動タグ付け" switch added to Settings page under "機能設定". Toggle persists via `autoTagEnabled` field on User model.
- **DB migrations**: `autoTags TEXT[]` on `Expense` table; `auto_tag_enabled BOOLEAN DEFAULT false` on `users` table.
- **ESLint + Prettier**: Added `.prettierrc`, `.prettierignore`, and `prebuild` script. Prettier runs automatically before `next build`. ESLint and TypeScript checks run as part of `next build`.

### 追加
- **ルールベース自動タグ付け（オプトイン）**: 支出登録時に同サークルの過去の支出パターンからタグを自動提案。デフォルトOFF、設定画面からONにできる。
  - マッチ条件（フォールバック方式）: ①平日/休日＋金額50〜150%＋時間帯±4時間 → ②平日/休日＋金額 → ③平日/休日＋時間帯。過去90日以内、同タグが2件以上で提案。
  - 自動タグは手動タグとは別フィールド（`autoTags`）に保存。
  - フィードと詳細画面で視覚的に区別：amber背景＋✦プレフィックスで表示。
  - 詳細画面から削除可能（手動タグと同じ操作）。
  - 集計画面のタグフィルターでも自動タグを含めて集計。
- **設定画面トグル**: 設定画面の「機能設定」セクションに「自動タグ付け」スイッチを追加。設定はUserモデルの`autoTagEnabled`フィールドに保存。
- **ESLint + Prettier導入**: `.prettierrc`・`.prettierignore`を追加。`npm run build`前にPrettierが自動適用される`prebuild`スクリプトを設定。ESLint・TypeScriptチェックは`next build`内で実施。

---

## [0.0.47] - 2026-04-19

### Fixed
- **Analytics page TypeScript error**: `filterExp` function used a non-generic type `{ amount: number; tags: string[] }[]`, causing `date` property to be lost after filtering. Changed to a generic function `<T extends { amount: number; tags: string[] }>(expenses: T[]): T[]` so the full type (including `date`) is preserved.

---

### 修正
- **集計ページのTypeScriptエラー**: `filterExp`関数の引数型が`{ amount: number; tags: string[] }[]`の非ジェネリック型だったため、フィルタ後に`date`プロパティが失われビルドエラーが発生。ジェネリック関数`<T extends { amount: number; tags: string[] }>(expenses: T[]): T[]`に変更し、`date`を含む完全な型が保持されるよう修正。

## [0.0.46] - 2026-04-18

### Added
- **Analytics page redesigned**: `dashboard/analytics` rebuilt as a two-tab page ("タグ・カレンダー" / "月次集計").
  - **Tag & Calendar tab**: Select a circle, filter by multiple tags (OR condition), view current month summary (expense / income / balance), and a 30-day calendar starting Sunday. Each day shows net cash flow and balance snapshot if recorded.
  - **Monthly tab**: Select a circle, view 12 months of expense / income / balance in a table (newest first). Current month highlighted.
- **New APIs**: `/api/analytics/circle` (daily + tag data) and `/api/analytics/circle-monthly` (monthly aggregation). Both use indexed columns (`expenseDate`, `incomeDate`, `snapshotDate`) for performance.
- **Circle sort order**: Circles sorted by ADMIN first, then by post count descending within each role group.

### Changed
- **Permission control for other users' posts**: EDITOR role can now only delete/edit-tag their own posts. ADMIN can operate on all posts. Enforced on both frontend (button visibility) and backend (API 403 check).
- **Share button**: "フィードをシェア" button hidden when circle is not public (`isPublic: false`).
- **Circle delete confirmation**: Added a two-step confirmation UI before deleting a circle (was immediate on first tap).
- **Vertex AI project ID fallback**: If `GOOGLE_CLOUD_PROJECT` env var is not set, project ID is fetched from the GCP metadata server (`metadata.google.internal`) automatically. Prevents auth errors on Cloud Run.
- **Post-login redirect for native app**: `CapacitorLoginButton` now accepts a `callbackUrl` prop (passed from `LoginForm` → `page.tsx`). After Google or Apple login, redirects to `callbackUrl` instead of hardcoded `/dashboard`.

### Fixed
- **Analytics monthly query**: Changed `createdAt` filter to `expenseDate` / `incomeDate` to use existing DB indexes (`@@index([circleId, expenseDate])`).

---

### 追加
- **集計ページ全面リニューアル**: `dashboard/analytics`を「タグ・カレンダー」「月次集計」の2タブ構成に刷新。
  - **タグ・カレンダータブ**: サークル選択、複数タグフィルタ（OR条件）、当月サマリー（支出・収入・残高）、30日カレンダー（日曜始まり）。各日に収支合算と残高スナップショットを表示。
  - **月次集計タブ**: サークル選択後、過去12ヶ月の支出・収入・残高を一覧表示（新しい月が上）。当月をハイライト。
- **新規API**: `/api/analytics/circle`（日別・タグデータ）と `/api/analytics/circle-monthly`（月次集計）。両APIともインデックス列（`expenseDate`、`incomeDate`、`snapshotDate`）を使用。
- **サークルの表示順**: ADMIN優先、同一ロール内は投稿数降順でソート。

### 変更
- **他ユーザー投稿への権限制御**: EDITORロールは自分の投稿のみ削除・タグ編集可能に変更。ADMINは全投稿を操作可能。フロントエンド（ボタン表示制御）とバックエンド（API 403チェック）の両方で制御。
- **シェアボタン**: サークルが非公開（`isPublic: false`）の場合、「フィードをシェア」ボタンを非表示に。
- **サークル削除の確認ダイアログ**: 削除ボタン押下後に「本当に削除しますか？」の確認UIを表示する2ステップに変更（以前は即時実行）。
- **Vertex AI プロジェクトID自動取得**: `GOOGLE_CLOUD_PROJECT`環境変数が未設定の場合、GCPメタデータサーバー（`metadata.google.internal`）からプロジェクトIDを自動取得。Cloud Run環境での認証エラーを防止。
- **ネイティブアプリのログイン後リダイレクト**: `CapacitorLoginButton`が`callbackUrl`プロップを受け取るよう変更（`LoginForm` → `page.tsx`経由で渡される）。GoogleおよびAppleログイン後、ハードコードされた`/dashboard`ではなく`callbackUrl`にリダイレクト。

### 修正
- **集計クエリのインデックス不一致**: 月次集計クエリの`createdAt`フィルタを`expenseDate`/`incomeDate`に変更し、既存DBインデックス（`@@index([circleId, expenseDate])`）を活用。

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
