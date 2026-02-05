import Link from "next/link";

export default function TermsPage() {
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
          利用規約
        </h1>
        <p className="text-sm text-slate-500 mb-8">最終更新日: 2026年2月5日</p>

        <div className="prose prose-slate prose-sm max-w-none space-y-6">
          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第1条（適用）
            </h2>
            <p className="text-slate-700 leading-relaxed">
              本規約は、CircleRun（以下「本サービス」）の利用に関する条件を定めるものです。ユーザーは本サービスを利用することにより、本規約に同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第2条（サービスの内容）
            </h2>
            <p className="text-slate-700 leading-relaxed">
              本サービスは、サークル（グループ）単位で収支を記録・共有するための家計管理アプリケーションです。ユーザーは以下の機能を利用できます。
            </p>
            <ul className="list-disc pl-5 text-slate-700 space-y-1 mt-2">
              <li>サークルの作成・参加・管理</li>
              <li>支出・収入の記録</li>
              <li>残高スナップショットの登録</li>
              <li>サークルメンバーとのフィード共有</li>
              <li>支出のタグ別・期間別集計</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第3条（アカウント）
            </h2>
            <p className="text-slate-700 leading-relaxed">
              本サービスの利用にはGoogleアカウントによるログインが必要です。ユーザーは自身のアカウントの管理責任を負い、第三者による不正利用があった場合は速やかに運営者に報告するものとします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第4条（禁止事項）
            </h2>
            <p className="text-slate-700 leading-relaxed mb-2">
              ユーザーは以下の行為を行ってはなりません。
            </p>
            <ul className="list-disc pl-5 text-slate-700 space-y-1">
              <li>法令または公序良俗に反する行為</li>
              <li>本サービスの運営を妨害する行為</li>
              <li>他のユーザーの情報を不正に収集・利用する行為</li>
              <li>
                本サービスのサーバーやネットワークに過度な負荷をかける行為
              </li>
              <li>
                本サービスを商業目的で利用する行為（運営者の許可がある場合を除く）
              </li>
              <li>その他、運営者が不適切と判断する行為</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第5条（サービスの変更・停止）
            </h2>
            <p className="text-slate-700 leading-relaxed">
              運営者は、事前の通知なく本サービスの内容を変更し、または本サービスの提供を停止・中断することができるものとします。これによりユーザーに生じた損害について、運営者は責任を負わないものとします。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第6条（免責事項）
            </h2>
            <ul className="list-disc pl-5 text-slate-700 space-y-1">
              <li>
                本サービスは「現状有姿」で提供されます。運営者は、本サービスの正確性、完全性、有用性等について保証しません。
              </li>
              <li>
                本サービスに入力されたデータの正確性はユーザーの責任です。本サービスは会計ソフトウェアではなく、税務・法律上の助言を提供するものではありません。
              </li>
              <li>
                ユーザー間のトラブルについて、運営者は一切の責任を負いません。
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第7条（個人情報の取り扱い）
            </h2>
            <p className="text-slate-700 leading-relaxed">
              ユーザーの個人情報の取り扱いについては、
              <Link
                href="/privacy"
                className="text-sky-600 hover:text-sky-700 underline"
              >
                プライバシーポリシー
              </Link>
              に定めるところによります。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第8条（規約の変更）
            </h2>
            <p className="text-slate-700 leading-relaxed">
              運営者は、必要と判断した場合、ユーザーへの事前の通知なく本規約を変更できるものとします。変更後の利用規約は、本サービス上に掲載された時点で効力を生じます。変更後も本サービスの利用を継続した場合、ユーザーは変更後の規約に同意したものとみなされます。
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-800 mb-2">
              第9条（準拠法・管轄）
            </h2>
            <p className="text-slate-700 leading-relaxed">
              本規約の解釈にあたっては日本法を準拠法とします。
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
