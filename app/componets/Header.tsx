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
    <header className="bg-slate-950">
      <div className="mx-auto max-w-md px-4 py-2 flex items-center justify-between">
        {/* 左：ロゴ + アイコン */}
        <Link href="/dashboard" className="flex items-center gap-2">
          {/* CircleRunアイコン */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 32 32"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="flex-shrink-0"
          >
            {/* 外側の円（C） */}
            <circle
              cx="16"
              cy="16"
              r="12"
              stroke="#38bdf8"
              strokeWidth="3"
              strokeLinecap="round"
              strokeDasharray="56 20"
              transform="rotate(-45 16 16)"
            />
            {/* 内側のR */}
            <path
              d="M13 10h4a3 3 0 0 1 0 6h-4v6M17 16l4 6"
              stroke="#f0f9ff"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-sm font-bold tracking-wide text-sky-100">
            CircleRun
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
                    <span className="text-[11px] text-slate-300">
                      {(user.name ?? user.email ?? "?").slice(0, 2)}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-slate-300 max-w-[90px] truncate">
                  {user.name ?? user.email}
                </span>
              </div>

              {/* サインアウトボタン */}
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-[11px] px-2 py-1 rounded-full border border-slate-600 text-slate-300 hover:bg-slate-800"
                >
                  ログアウト
                </button>
              </form>
            </div>
          ) : (
            // 未ログイン時：サインインボタン
            <form action={handleSignIn}>
              <button
                type="submit"
                className="text-[11px] px-3 py-1 rounded-full border border-sky-500 text-sky-400 hover:bg-sky-700/30"
              >
                ログイン
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}
