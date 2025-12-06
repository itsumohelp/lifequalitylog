// app/circles/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import { CircleRole } from "../generated/prisma/enums";

function roleLabel(role: CircleRole) {
  switch (role) {
    case CircleRole.ADMIN:
      return "管理者";
    case CircleRole.EDITOR:
      return "登録者";
    case CircleRole.VIEWER:
      return "参照者";
    default:
      return role;
  }
}

function roleBadgeClass(role: CircleRole) {
  switch (role) {
    case CircleRole.ADMIN:
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/40";
    case CircleRole.EDITOR:
      return "bg-sky-500/15 text-sky-300 border-sky-500/40";
    case CircleRole.VIEWER:
      return "bg-slate-500/15 text-slate-300 border-slate-500/40";
    default:
      return "bg-slate-500/15 text-slate-300 border-slate-500/40";
  }
}

export default async function CirclesPage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }
  const userId = session.user.id as string;

  // 自分が所属しているサークルを取得
  const memberships = await prisma.circleMember.findMany({
    where: { userId },
    include: {
      circle: {
        include: {
          _count: {
            select: { members: true },
          },
        },
      },
    },
    orderBy: {
      joinedAt: "asc",
    },
  });

  const hasCircles = memberships.length > 0;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md px-4 pt-4 pb-10">
        {/* ヘッダー */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Link href="/dashboard" className="text-xs text-sky-300">
              ← ダッシュボード
            </Link>
            <h1 className="text-sm font-semibold text-sky-100">
              サークル一覧
            </h1>
            <Link
              href="/circles/new"
              className="text-[11px] text-sky-300"
            >
              ＋ 新規作成
            </Link>
          </div>
          <p className="text-[11px] text-slate-400">
            あなたが参加しているサークルウォレットの一覧です。
            家族・友人・サークルなど、最大50人で一緒にお金の流れを見られます。
          </p>
        </header>

        {/* 中身 */}
        {!hasCircles ? (
          <div className="mt-6 rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 px-4 py-6 text-center">
            <p className="text-xs text-slate-300 mb-2">
              まだ参加しているサークルがありません。
            </p>
            <p className="text-[11px] text-slate-500 mb-4">
              家族や友人との共有用に、まずは1つサークルを作ってみましょう。
            </p>
            <Link
              href="/circles/new"
              className="inline-flex items-center justify-center rounded-2xl bg-sky-500 px-4 py-2 text-xs font-semibold text-white active:scale-[0.98] transition-transform"
            >
              サークルを作成する
            </Link>
          </div>
        ) : (
          <section className="mt-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-xs font-semibold text-slate-300">
                参加中のサークル
              </h2>
              <span className="text-[10px] text-slate-500">
                合計 {memberships.length} 件
              </span>
            </div>

            {memberships.map((m) => {
              const circle = m.circle;
              const memberCount = circle._count.members;

              return (
                <Link
                  key={m.id}
                  href={`/circles/${circle.id}`}
                  className="block rounded-2xl bg-slate-900/60 border border-slate-800 px-4 py-3 active:scale-[0.99] transition-transform"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <h2 className="text-sm font-semibold text-slate-50 line-clamp-1">
                          {circle.name}
                        </h2>
                      </div>
                      {circle.walletName && (
                        <p className="text-[11px] text-sky-300 mb-0.5">
                          ウォレット: {circle.walletName}
                        </p>
                      )}
                      {circle.description && (
                        <p className="text-[11px] text-slate-300 line-clamp-2">
                          {circle.description}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span
                        className={
                          "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium " +
                          roleBadgeClass(m.role)
                        }
                      >
                        {roleLabel(m.role)}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        メンバー {memberCount} / 50
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
}
