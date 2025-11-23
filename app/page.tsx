import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col text-gray-800">
      {/* ■ ヘッダー部分 */}
      <header className="bg-white shadow-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-600">サービス名</h1>
          <nav>
            <Link href="/login" className="px-4 py-2 text-gray-600 hover:text-blue-600">
              ログイン
            </Link>
            <Link href="/signup" className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
              無料で始める
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        {/* ■ ヒーローセクション（一番目立つ場所） */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-20 text-center px-4">
          <h2 className="text-4xl md:text-5xl font-extrabold mb-6 leading-tight">
            あなたの課題を、<br />
            <span className="text-blue-600">このサービス</span>が解決します
          </h2>
          <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
            ここにサービスのキャッチコピーを入れます。ユーザーが得られるメリットを簡潔に書きましょう。
            2025年の最新技術であなたの生活をサポートします。
          </p>
          <button className="px-8 py-4 bg-blue-600 text-white text-xl font-bold rounded-full shadow-lg hover:bg-blue-700 transition transform hover:-translate-y-1">
            今すぐ使ってみる
          </button>
        </section>

        {/* ■ 広告スペース 1（目立ちすぎない位置） */}
        <div className="container mx-auto py-8 text-center bg-gray-100 rounded-lg my-8 max-w-4xl">
          <p className="text-gray-400 text-sm">スポンサーリンク</p>
          <div className="w-full h-24 bg-gray-200 flex items-center justify-center text-gray-400">
            広告バナー (728x90など)
          </div>
        </div>

        {/* ■ 特徴・メリット部分 */}
        <section className="container mx-auto px-4 py-16">
          <h3 className="text-3xl font-bold text-center mb-12">選ばれる3つの理由</h3>
          <div className="grid md:grid-cols-3 gap-8">
            {/* 特徴1 */}
            <div className="p-6 border rounded-xl hover:shadow-md transition">
              <div className="text-4xl mb-4">🚀</div>
              <h4 className="text-xl font-bold mb-2">圧倒的なスピード</h4>
              <p className="text-gray-600">Next.jsとAWSの最新構成により、ストレスのない高速な動作を実現しました。</p>
            </div>
            {/* 特徴2 */}
            <div className="p-6 border rounded-xl hover:shadow-md transition">
              <div className="text-4xl mb-4">🛡️</div>
              <h4 className="text-xl font-bold mb-2">安心のセキュリティ</h4>
              <p className="text-gray-600">最新の認証システムを採用。あなたのデータを安全に守ります。</p>
            </div>
            {/* 特徴3 */}
            <div className="p-6 border rounded-xl hover:shadow-md transition">
              <div className="text-4xl mb-4">💡</div>
              <h4 className="text-xl font-bold mb-2">使いやすいデザイン</h4>
              <p className="text-gray-600">直感的な操作画面で、マニュアルなしですぐに使い始めることができます。</p>
            </div>
          </div>
        </section>
      </main>

      {/* ■ フッター */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="container mx-auto px-4 text-center">
          <p>&copy; 2025 Service Name. All rights reserved.</p>
          <div className="mt-4 space-x-4 text-gray-400 text-sm">
            <Link href="/terms" className="hover:text-white">利用規約</Link>
            <Link href="/privacy" className="hover:text-white">プライバシーポリシー</Link>
            <Link href="/contact" className="hover:text-white">お問い合わせ</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}