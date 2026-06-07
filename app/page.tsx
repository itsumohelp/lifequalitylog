import { auth, signIn } from "@/auth";
import Link from "next/link";
import WebViewAlert from "@/app/components/WebViewAlert";
import LoginForm from "@/app/components/LoginForm";
import UsageDemo from "@/app/components/UsageDemo";

type HomePageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  async function handleGoogleLogin() {
    "use server";
    const redirectTo = callbackUrl ? decodeURIComponent(callbackUrl) : "/dashboard";
    await signIn("google", { redirectTo });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <WebViewAlert />

      <div className="w-full max-w-md mx-auto px-5 pt-8 pb-16">

        {/* ロゴ */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <svg width="40" height="40" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
            <rect width="512" height="512" fill="#0f172a" rx="120" />
            <text x="256" y="268" textAnchor="middle" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="190" fontWeight="800" fill="#ffffff">circle</text>
            <text x="256" y="390" textAnchor="middle" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="190" fontWeight="800" fill="#38bdf8">run</text>
          </svg>
          <div>
            <div className="text-xl font-bold text-slate-900 leading-none">CircleRun</div>
            <div className="text-xs text-slate-400 mt-0.5">crun.click</div>
          </div>
        </div>

        {/* ヒーロー */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-3">
            お金の流れを、<br />みんなとオープンに。
          </h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            支出・収入をチャット感覚で記録して<br />
            家族・友達・サークルとリアルタイム共有
          </p>
        </div>

        {/* デモアニメーション */}
        <UsageDemo />

        {/* 機能カード */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          {[
            { icon: "📝", title: "かんたん入力", desc: "金額を入れるだけ。自動分類" },
            { icon: "📊", title: "自動集計", desc: "グラフ・タグ分析が即生成" },
            { icon: "🤝", title: "シェア", desc: "サークルで記録を共有" },
          ].map((f) => (
            <div key={f.title} className="bg-white rounded-2xl border border-slate-100 p-3 text-center shadow-sm">
              <div className="text-2xl mb-1.5">{f.icon}</div>
              <div className="text-xs font-semibold text-slate-800 mb-0.5">{f.title}</div>
              <div className="text-[10px] text-slate-400 leading-tight">{f.desc}</div>
            </div>
          ))}
        </div>

        {/* みんなの家計リンク */}
        <Link
          href="/explore"
          className="flex items-center justify-between bg-gradient-to-r from-sky-50 to-emerald-50 border border-sky-100 rounded-2xl px-4 py-3.5 mb-3 group"
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">みんなの家計を見てみる</div>
            <div className="text-xs text-slate-400 mt-0.5">公開サークルをチェック</div>
          </div>
          <span className="text-slate-400 group-hover:translate-x-1 transition-transform text-lg">→</span>
        </Link>

        {/* 家計分析リンク */}
        <Link
          href="/analysis"
          className="flex items-center justify-between bg-gradient-to-r from-violet-50 to-sky-50 border border-violet-100 rounded-2xl px-4 py-3.5 mb-6 group"
        >
          <div>
            <div className="text-sm font-semibold text-slate-800">家計を分析してみる</div>
            <div className="text-xs text-slate-400 mt-0.5">ログイン不要・無料で試せる</div>
          </div>
          <span className="text-slate-400 group-hover:translate-x-1 transition-transform text-lg">→</span>
        </Link>

        {/* ログイン済み / 未ログインでカード切り替え */}
        {session ? (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-3">
            <p className="text-center text-sm font-medium text-slate-700">
              ようこそ、{session.user?.name || "ゲスト"}さん
            </p>
            <Link
              href="/dashboard"
              className="block w-full text-center bg-slate-900 text-white rounded-xl py-3 text-sm font-semibold"
            >
              ダッシュボードへ →
            </Link>
            <Link
              href="/dashboard/analytics"
              className="block w-full text-center bg-sky-50 text-sky-700 border border-sky-200 rounded-xl py-3 text-sm font-semibold"
            >
              分析を見る →
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
            <p className="text-center text-sm font-medium text-slate-700 mb-4">
              無料ではじめる
            </p>
            <LoginForm action={handleGoogleLogin} callbackUrl={callbackUrl} />
            <p className="text-center text-[11px] text-slate-400 mt-4">
              Googleアカウントで30秒登録
            </p>
          </div>
        )}

      </div>
    </main>
  );
}
