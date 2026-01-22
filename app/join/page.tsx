// app/join/page.tsx
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";

type JoinPageProps = {
  searchParams: Promise<{ circleId?: string }>;
};

// サーバーアクション：参加する
export async function joinCircle(formData: FormData) {
  "use server";

  const circleId = formData.get("circleId");
  if (typeof circleId !== "string" || !circleId) {
    redirect("/dashboard");
  }

  const session = await auth();
  if (!session || !session.user?.id) {
    // 念のため未ログイン時の再チェック
    const callbackUrl = encodeURIComponent(`/join?circleId=${circleId}`);
    redirect(`/?callbackUrl=${callbackUrl}`);
  }

  const userId = session.user.id as string;

  // すでにメンバーかチェック
  const existingMember = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId,
        userId,
      },
    },
  });

  // 既にメンバーならそのままダッシュボードへ
  if (existingMember) {
    redirect("/dashboard");
  }

  // 所属サークル数をチェック（上限5個）
  const memberCircleCount = await prisma.circleMember.count({
    where: { userId },
  });

  if (memberCircleCount >= 5) {
    // 上限に達している場合は参加させずにリダイレクト
    redirect(`/join?circleId=${circleId}`);
  }

  // 新規メンバーとして追加
  await prisma.circleMember.create({
    data: {
      circleId,
      userId,
      role: "EDITOR", // 招待参加は EDITOR として参加
    },
  });

  redirect("/dashboard");
}

// サーバーアクション：参加しない → ダッシュボードへ
export async function skipJoin() {
  "use server";
  redirect("/dashboard");
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const circleId = (await searchParams).circleId;

  if (!circleId) {
    redirect("/dashboard");
  }

  const session = await auth();

  // 未ログインならトップページへリダイレクト（callbackUrl付きでログイン後に戻る）
  if (!session || !session.user?.id) {
    const callbackUrl = encodeURIComponent(`/join?circleId=${circleId}`);
    redirect(`/?callbackUrl=${callbackUrl}`);
  }

  const userId = session.user.id as string;

  const circle = await prisma.circle.findUnique({
    where: { id: circleId },
    select: {
      id: true,
      name: true,
      description: true,
      walletName: true,
      currency: true,
      members: {
        where: { role: "ADMIN" },
        select: {
          user: {
            select: {
              id: true,
              name: true,
              displayName: true,
              image: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  // ADMINユーザー（招待者）を取得
  const adminUser = circle?.members[0]?.user;

  if (!circle) {
    // サークルが存在しない場合はダッシュボードへ
    redirect("/dashboard");
  }

  const membership = await prisma.circleMember.findUnique({
    where: {
      circleId_userId: {
        circleId: circle.id,
        userId,
      },
    },
  });

  const alreadyMember = !!membership;

  // ユーザーが所属しているサークル数をチェック（上限5個）
  const memberCircleCount = await prisma.circleMember.count({
    where: { userId },
  });
  const reachedLimit = memberCircleCount >= 5;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md px-4 pt-8 pb-10">
        <h1 className="text-base font-semibold text-sky-100 mb-3">
          サークルへの参加
        </h1>

        {/* 招待者情報 */}
        {adminUser && (
          <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-700 overflow-hidden flex-shrink-0">
                {adminUser.image ? (
                  <Image
                    src={adminUser.image}
                    alt={adminUser.displayName || adminUser.name || "User"}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 flex items-center justify-center text-lg text-slate-400">
                    {(adminUser.displayName || adminUser.name || "?").slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-100">
                  {adminUser.displayName || adminUser.name || "ユーザー"}
                </p>
                <p className="text-xs text-slate-400">からの招待</p>
              </div>
            </div>
          </section>
        )}

        {/* サークル情報 */}
        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            {circle.name || "（名前なし）"}
          </h2>
          {circle.description && (
            <p className="text-xs text-slate-300 mb-1">{circle.description}</p>
          )}
        </section>

        {alreadyMember ? (
          <div className="space-y-3">
            <p className="text-xs text-slate-300 mb-1">
              すでにこのサークルに参加しています。
            </p>
            <form action={skipJoin}>
              <button
                type="submit"
                className="w-full text-xs py-2 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-500"
              >
                ダッシュボードへ戻る
              </button>
            </form>
          </div>
        ) : reachedLimit ? (
          <div className="space-y-3">
            <p className="text-xs text-red-400 mb-1">
              所属できるサークルは5個までです
            </p>
            <form action={skipJoin}>
              <button
                type="submit"
                className="w-full text-xs py-2 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-500"
              >
                ダッシュボードへ戻る
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-xs text-slate-300 mb-2">
              このサークルに参加しますか？
            </p>

            {/* 参加する */}
            <form action={joinCircle}>
              <input type="hidden" name="circleId" value={circle.id} />
              <button
                type="submit"
                className="w-full text-xs py-2 rounded-full bg-sky-600 text-white font-semibold hover:bg-sky-500 mb-2"
              >
                参加する
              </button>
            </form>

            {/* 参加しない */}
            <form action={skipJoin}>
              <button
                type="submit"
                className="w-full text-xs py-2 rounded-full border border-slate-600 text-slate-200 hover:bg-slate-800"
              >
                参加しない（ダッシュボードへ戻る）
              </button>
            </form>
          </div>
        )}
      </div>
    </main>
  );
}
