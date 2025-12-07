import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { signIn, signOut } from "@/auth";

type HeaderProps = {
  session: Session | null;
};

export default function Header({ session }: HeaderProps) {
  const user = session?.user;

  // サーバーアクション：Googleで即サインイン → /dashboard
  async function handleSignIn() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  // サーバーアクション：即サインアウト → /
  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
      <div className="mx-auto max-w-md px-4 py-2 flex items-center justify-between">
        {/* 左：ロゴ */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-wide text-sky-100">
            Circlerun
          </span>
        </Link>

        {/* 右：ユーザー状態 + ハンバーガー */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              {/* アイコン＋名前 */}
              <div className="flex items-center gap-1">
                <div className="w-7 h-7 rounded-full bg-slate-700 overflow-hidden flex items-center justify-center">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? user.email ?? "user"}
                      width={28}
                      height={28}
                      className="w-7 h-7 object-cover"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-200">
                      {(user.name ?? user.email ?? "?").slice(0, 2)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-200 max-w-[90px] truncate">
                  {user.name ?? user.email}
                </span>
              </div>

              {/* 🔴 ここ：サインアウトボタン（即ログアウト & リダイレクト） */}
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-[11px] px-2 py-1 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800"
                >
                  ログアウト
                </button>
              </form>
            </div>
          ) : (
            // 🔵 未ログイン時：サインインボタン（即 Google 同意画面へ）
            <form action={handleSignIn}>
              <button
                type="submit"
                className="text-[11px] px-3 py-1 rounded-full border border-sky-500 text-sky-100 hover:bg-sky-700/30"
              >
                ログイン
              </button>
            </form>
          )}

          {/* ハンバーガー（そのままでOK） */}
          {/* ...（省略：前に書いた details/summary 部分） */}
        </div>
      </div>
    </header>
  );
}
