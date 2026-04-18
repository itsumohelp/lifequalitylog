import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";
import WebViewAlert from "@/app/components/WebViewAlert";
import LoginForm from "@/app/components/LoginForm";
import UsageDemo from "@/app/components/UsageDemo";

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
    const redirectTo = callbackUrl
      ? decodeURIComponent(callbackUrl)
      : "/dashboard";
    await signIn("google", { redirectTo });
  }

  return (
    <main className="min-h-screen bg-slate-50">
      {/* WebViewの場合にブラウザで開くよう促すポップアップ */}
      <WebViewAlert />

      <div className="w-full max-w-md mx-auto px-6 pt-2 pb-6">
        {/* ロゴ */}
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <svg
              width="64"
              height="64"
              viewBox="0 0 512 512"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect width="512" height="512" fill="#ffffff"/>
              <text x="256" y="262" textAnchor="middle"
                    fontFamily="'Helvetica Neue', Arial, sans-serif"
                    fontSize="182" fontWeight="800" fill="#0f172a">circle</text>
              <text x="256" y="384" textAnchor="middle"
                    fontFamily="'Helvetica Neue', Arial, sans-serif"
                    fontSize="182" fontWeight="800" fill="#0f172a">run</text>
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
        <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
          <LoginForm action={handleGoogleLogin} callbackUrl={callbackUrl} />
        </div>

        {/* 利用イメージ */}
        <UsageDemo />
      </div>
    </main>
  );
}
