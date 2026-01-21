import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const session = await auth();

  // すでにログインしている場合はダッシュボードへ
  if (session) {
    redirect("/dashboard");
  }

  // ログインボタン用のサーバーアクション
  async function handleGoogleLogin() {
    "use server";
    await signIn("google");
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-white">
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

          <form action={handleGoogleLogin}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 px-4 text-sm transition shadow-md"
            >
              <svg aria-hidden className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M12 10.2v3.7h5.2c-.2 1.2-.9 2.2-2 2.9l3.2 2.5c1.9-1.7 3-4.1 3-6.9 0-.7-.1-1.3-.2-1.9H12z"
                />
                <path
                  fill="#34A853"
                  d="M6.5 14.3l-.8.6-2.6 2C4.6 19.6 8.1 21.5 12 21.5c2.7 0 4.9-.9 6.5-2.4l-3.2-2.5c-.9.6-2 1-3.3 1-2.6 0-4.8-1.8-5.6-4.3z"
                />
                <path
                  fill="#4A90E2"
                  d="M3.1 7.1C2.4 8.4 2 9.9 2 11.5c0 1.6.4 3.1 1.1 4.4l3.4-2.6c-.2-.6-.4-1.2-.4-1.8 0-.6.1-1.2.4-1.8z"
                />
                <path
                  fill="#FBBC05"
                  d="M12 4.5c1.5 0 2.8.5 3.9 1.4l2.9-2.9C17 1.8 14.7.9 12 .9 8.1.9 4.6 2.8 3.1 7.1l3.4 2.6C7.2 6.3 9.4 4.5 12 4.5z"
                />
              </svg>
              <span>Googleでログイン</span>
            </button>
          </form>

          <p className="mt-4 text-[11px] text-slate-400 text-center">
            ※ 現在は Google アカウントのみ対応
          </p>
        </div>
      </div>
    </main>
  );
}
