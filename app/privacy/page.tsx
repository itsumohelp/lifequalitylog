import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/"
          className="text-sm text-slate-500 hover:text-slate-700 transition"
        >
          &larr; CircleRunに戻る
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-2">
          プライバシーポリシー
        </h1>
        <p className="text-sm text-slate-500 mb-8">最終更新日: 2026年2月5日</p>

        <div className="prose prose-slate prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              1. はじめに
            </h2>
            <p className="text-slate-700 leading-relaxed">
              CircleRun（以下「本サービス」）は、ユーザーのプライバシーを尊重し、個人情報の保護に努めます。本プライバシーポリシーは、本サービスにおける個人情報の収集、利用、管理について定めるものです。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              2. 収集する情報
            </h2>
            <p className="text-slate-700 leading-relaxed mb-2">
              本サービスでは、Googleアカウントを利用したOIDC（OpenID
              Connect）認証により、以下の情報を取得します。
            </p>
            <ul className="list-disc pl-5 text-slate-700 space-y-1">
              <li>
                <strong>メールアドレス</strong>
                ：アカウントの識別および通知のために使用します
              </li>
              <li>
                <strong>氏名</strong>
                ：サービス内での表示名の初期値として使用します
              </li>
              <li>
                <strong>プロフィール画像</strong>
                ：サービス内でのアイコン表示に使用します
              </li>
            </ul>
            <p className="text-slate-700 leading-relaxed mt-3">
              また、本サービスの利用に伴い、以下の情報が記録されます。
            </p>
            <ul className="list-disc pl-5 text-slate-700 space-y-1 mt-2">
              <li>
                サークルへの参加情報（メンバーシップ、ロール）
              </li>
              <li>
                支出・収入の記録（金額、カテゴリ、タグ、メモ等）
              </li>
              <li>
                残高スナップショット
              </li>
              <li>リアクション（絵文字によるリアクション）</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              3. 情報の利用目的
            </h2>
            <p className="text-slate-700 leading-relaxed mb-2">
              取得した情報は、以下の目的で利用します。
            </p>
            <ul className="list-disc pl-5 text-slate-700 space-y-1">
              <li>ユーザーの認証およびログイン管理</li>
              <li>サービス内でのユーザー識別と表示</li>
              <li>サークルメンバー間での情報共有機能の提供</li>
              <li>サービスの改善および新機能の開発</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              4. 第三者への提供
            </h2>
            <p className="text-slate-700 leading-relaxed">
              運営者は、以下の場合を除き、ユーザーの個人情報を第三者に提供しません。
            </p>
            <ul className="list-disc pl-5 text-slate-700 space-y-1 mt-2">
              <li>ユーザーの同意がある場合</li>
              <li>法令に基づく開示請求があった場合</li>
              <li>
                Google
                OAuth認証に必要な範囲での認証情報のやり取り（Googleとの間のみ）
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              5. Cookieおよびセッション
            </h2>
            <p className="text-slate-700 leading-relaxed">
              本サービスでは、ログイン状態を維持するためにセッションCookieを使用します。このCookieはブラウザを閉じた後も一定期間保持され、再ログインの手間を省くために使用されます。Cookieの使用を拒否する場合は、ブラウザの設定から無効にできますが、本サービスの一部機能が利用できなくなる場合があります。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              6. データの保管と安全管理
            </h2>
            <p className="text-slate-700 leading-relaxed">
              ユーザーの情報はデータベースに保管され、不正アクセス、紛失、改ざんを防ぐための適切なセキュリティ対策を講じています。ただし、インターネット上の通信において完全な安全性を保証することはできません。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              7. データの削除
            </h2>
            <p className="text-slate-700 leading-relaxed">
              ユーザーはサークルからの脱退やアカウントの削除を通じて、本サービスに保存されたデータの削除を求めることができます。アカウント削除の際は、関連するすべてのデータ（アカウント情報、セッション情報、サークルメンバーシップ等）が削除されます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              8. お問い合わせ
            </h2>
            <p className="text-slate-700 leading-relaxed">
              個人情報の取り扱いに関するお問い合わせは、本サービスの管理者までご連絡ください。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              9. ポリシーの変更
            </h2>
            <p className="text-slate-700 leading-relaxed">
              本プライバシーポリシーは、必要に応じて変更されることがあります。変更後のポリシーは、本サービス上に掲載された時点で効力を生じます。重要な変更がある場合は、サービス上で通知いたします。
            </p>
          </section>
        </div>

        <div className="mt-12 pt-6 border-t border-slate-200">
          <Link
            href="/"
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            &larr; CircleRunに戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
