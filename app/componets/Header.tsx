import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { signIn, signOut } from "@/auth";
import { getAvatarColor, getAvatarInitial } from "@/lib/avatar";
import NotificationBell from "@/app/componets/NotificationBell";

type HeaderProps = {
  session: Session | null;
};

export default function Header({ session }: HeaderProps) {
  const user = session?.user;
  const displayName = (user as Record<string, unknown> | undefined)
    ?.displayName as string | null;
  const userName = displayName || user?.name || "未設定";

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

  // 未ログイン時はヘッダーを表示しない
  if (!user) return null;

  return (
    <header className="bg-sky-200">
      <div className="mx-auto max-w-md px-4 py-2 flex items-center justify-between">
        {/* 左：ロゴ + 通知ベル */}
        <div className="flex items-center gap-1">
          <Link
            href="/dashboard"
            className="text-sm font-extrabold text-slate-900 tracking-tight"
          >
            Circlerun
          </Link>
          {user && <NotificationBell />}
        </div>

        {/* 右：ユーザー状態 + ハンバーガー */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="flex items-center gap-2">
              {/* アイコン＋名前 */}
              <div className="flex items-center gap-1">
                <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center">
                  {user.image ? (
                    <Image
                      src={user.image}
                      alt={user.name ?? "user"}
                      width={28}
                      height={28}
                      className="w-7 h-7 object-cover"
                    />
                  ) : (
                    <div
                      className="w-7 h-7 flex items-center justify-center text-[11px] text-white font-medium"
                      style={{
                        backgroundColor: getAvatarColor(
                          ((user as Record<string, unknown>).id as string) ||
                            "default",
                        ),
                      }}
                    >
                      {getAvatarInitial(userName)}
                    </div>
                  )}
                </div>
                <span className="text-[11px] text-slate-600 max-w-[90px] truncate">
                  {userName}
                </span>
              </div>

              {/* サインアウトボタン */}
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="text-[11px] px-2 py-1 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-100"
                >
                  ログアウト
                </button>
              </form>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
