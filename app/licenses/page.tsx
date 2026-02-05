import Link from "next/link";

const directDependencies = [
  { name: "Next.js", version: "16.0.7", license: "MIT", url: "https://github.com/vercel/next.js" },
  { name: "React", version: "19.2.0", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "React DOM", version: "19.2.0", license: "MIT", url: "https://github.com/facebook/react" },
  { name: "NextAuth.js", version: "5.0.0-beta.30", license: "ISC", url: "https://github.com/nextauthjs/next-auth" },
  { name: "Prisma Client", version: "7.1.0", license: "Apache-2.0", url: "https://github.com/prisma/prisma" },
  { name: "@auth/prisma-adapter", version: "2.11.1", license: "ISC", url: "https://github.com/nextauthjs/next-auth" },
  { name: "Recharts", version: "3.6.0", license: "MIT", url: "https://github.com/recharts/recharts" },
  { name: "Tailwind CSS", version: "4.x", license: "MIT", url: "https://github.com/tailwindlabs/tailwindcss" },
  { name: "Lucide React", version: "0.555.0", license: "ISC", url: "https://github.com/lucide-icons/lucide" },
  { name: "TypeScript", version: "5.x", license: "Apache-2.0", url: "https://github.com/microsoft/TypeScript" },
  { name: "ESLint", version: "9.x", license: "MIT", url: "https://github.com/eslint/eslint" },
  { name: "node-postgres (pg)", version: "8.16.3", license: "MIT", url: "https://github.com/brianc/node-postgres" },
  { name: "dotenv", version: "17.2.3", license: "BSD-2-Clause", url: "https://github.com/motdotla/dotenv" },
  { name: "LightningCSS", version: "1.30.2", license: "MPL-2.0", url: "https://github.com/parcel-bundler/lightningcss" },
  { name: "sharp (libvips)", version: "1.2.4", license: "LGPL-3.0-or-later", url: "https://github.com/lovell/sharp" },
];

const licenseSummary = [
  { license: "MIT", count: 399 },
  { license: "Apache-2.0", count: 44 },
  { license: "ISC", count: 40 },
  { license: "BSD-2-Clause", count: 9 },
  { license: "BSD-3-Clause", count: 4 },
  { license: "MPL-2.0", count: 3 },
  { license: "LGPL-3.0-or-later", count: 1 },
  { license: "その他 (CC0, Unlicense, 0BSD 等)", count: 7 },
];

export default function LicensesPage() {
  return (
    <main className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <Link
          href="/dashboard/settings"
          className="text-sm text-slate-500 hover:text-slate-700 transition"
        >
          &larr; 設定に戻る
        </Link>

        <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-2">
          オープンソースライセンス
        </h1>
        <p className="text-sm text-slate-500 mb-8">
          CircleRunは以下のオープンソースソフトウェアを使用しています。
          各プロジェクトの作者およびコントリビューターに感謝いたします。
        </p>

        {/* 主要パッケージ */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            主要パッケージ
          </h2>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-medium text-slate-600">パッケージ</th>
                  <th className="text-left px-3 py-2 font-medium text-slate-600">ライセンス</th>
                </tr>
              </thead>
              <tbody>
                {directDependencies.map((dep) => (
                  <tr key={dep.name} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2">
                      <a
                        href={dep.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-600 hover:text-sky-700 underline"
                      >
                        {dep.name}
                      </a>
                      <span className="text-slate-400 ml-1 text-xs">{dep.version}</span>
                    </td>
                    <td className="px-3 py-2 text-slate-600">{dep.license}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ライセンス種別サマリ */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">
            全依存パッケージのライセンス内訳
          </h2>
          <p className="text-sm text-slate-600 mb-3">
            直接・間接依存を含む全パッケージのライセンス種別ごとの件数です。
          </p>
          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-3 py-2 font-medium text-slate-600">ライセンス</th>
                  <th className="text-right px-3 py-2 font-medium text-slate-600">件数</th>
                </tr>
              </thead>
              <tbody>
                {licenseSummary.map((item) => (
                  <tr key={item.license} className="border-b border-slate-100 last:border-0">
                    <td className="px-3 py-2 text-slate-700">{item.license}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{item.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ライセンス全文へのリンク */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-slate-800 mb-3">
            ライセンス全文
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            各パッケージのライセンス全文は、それぞれのリポジトリ内のLICENSEファイルをご確認ください。
            主要なライセンスの全文は以下から参照できます。
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            <li>
              <a href="https://opensource.org/licenses/MIT" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 underline">
                MIT License
              </a>
            </li>
            <li>
              <a href="https://opensource.org/licenses/Apache-2.0" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 underline">
                Apache License 2.0
              </a>
            </li>
            <li>
              <a href="https://opensource.org/licenses/ISC" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 underline">
                ISC License
              </a>
            </li>
            <li>
              <a href="https://opensource.org/licenses/MPL-2.0" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 underline">
                Mozilla Public License 2.0
              </a>
            </li>
            <li>
              <a href="https://opensource.org/licenses/LGPL-3.0" target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:text-sky-700 underline">
                GNU Lesser General Public License v3.0
              </a>
            </li>
          </ul>
        </section>

        <div className="mt-12 pt-6 border-t border-slate-200">
          <Link
            href="/dashboard/settings"
            className="text-sm text-slate-500 hover:text-slate-700 transition"
          >
            &larr; 設定に戻る
          </Link>
        </div>
      </div>
    </main>
  );
}
