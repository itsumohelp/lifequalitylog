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
    <main className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="w-full max-w-md mx-auto rounded-2xl bg-slate-900/80 border border-slate-700 p-8 shadow-xl">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-sky-100">
            サークルラン
          </h1>
          <p className="mt-2 text-sm text-slate-300">
            みんなのお金のタイムラインを共有する
            <br />
            シンプルなサークル家計アプリ <span className="text-sky-400">crun.click</span>
          </p>
        </div>

        <div className="mt-6 space-y-4">
          <p className="text-xs text-slate-400 leading-relaxed">
            月に一度、「このサークルの口座はいくらか」だけを記録して、
            <br />
            家族・友人・サークルの「お金の歩み」をタイムラインで眺められます。
          </p>

          <form action={handleGoogleLogin} className="mt-6">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-sky-400 text-white font-medium py-2.5 px-4 text-sm transition"
            >
              <svg
                aria-hidden
                className="w-4 h-4"
                viewBox="0 0 24 24"
              >
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
                <path fill="none" d="M2 2h20v20H2z" />
              </svg>
              <span>Googleでログイン</span>
            </button>
          </form>

          <p className="mt-4 text-[10px] text-slate-500 text-center">
            ※ 現時点のプロトタイプ版では Google アカウントのみでログインできます。
          </p>
        </div>
      </div>
    </main>
  );
}