import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import WebViewAlert from "@/app/components/WebViewAlert";
import LoginForm from "@/app/components/LoginForm";

type HomePageProps = {
  searchParams: Promise<{ callbackUrl?: string }>;
};

export default async function HomePage({ searchParams }: HomePageProps) {
  const session = await auth();
  const { callbackUrl } = await searchParams;

  // すでにログインしている場合
  if (session) {
    // callbackUrlがあればそちらへ、なければダッシュボードへ
    if (callbackUrl) {
      redirect(decodeURIComponent(callbackUrl));
    }
    redirect("/dashboard");
  }

  // ログインボタン用のサーバーアクション
  async function handleGoogleLogin() {
    "use server";
    // callbackUrlを取得するためにクロージャで参照
    const redirectTo = callbackUrl ? decodeURIComponent(callbackUrl) : "/dashboard";
    await signIn("google", { redirectTo });
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
      {/* WebViewの場合にブラウザで開くよう促すポップアップ */}
      <WebViewAlert />

      <div className="w-full max-w-md mx-auto px-6 py-12">
        {/* ロゴ */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 32 32"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* 外側の円（C） */}
              <circle
                cx="16"
                cy="16"
                r="12"
                stroke="#0ea5e9"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray="56 20"
                transform="rotate(-45 16 16)"
              />
              {/* 内側のR */}
              <path
                d="M13 10h4a3 3 0 0 1 0 6h-4v6M17 16l4 6"
                stroke="#0f172a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-950">CircleRun</h1>
          <p className="mt-2 text-sm text-slate-950">
            みんなのお金のタイムラインを共有する
            <br />
            シンプルなサークル家計アプリ
          </p>
          <p className="mt-1 text-slate-950 font-medium">crun.click</p>
        </div>

        {/* カード */}
        <div className="rounded-2xl bg-slate-50 border border-slate-200 p-6 shadow-sm">
          <ul className="text-sm text-slate-800 leading-relaxed mb-6 space-y-2">
            <li>・支出や収入をチャット感覚でサクッと記録</li>
            <li>・家族・友人・サークルでお金の動きを共有</li>
            <li>・タグ別・期間別のグラフで支出を見える化</li>
          </ul>

          <LoginForm action={handleGoogleLogin} />
        </div>
      </div>
    </main>
  );
}
