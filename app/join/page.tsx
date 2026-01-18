// app/join/page.tsx
import { auth, signIn } from "@/auth";
import prisma from "@/lib/prisma"; // いつもの import に合わせて
import { redirect } from "next/navigation";

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
    redirect(`/api/auth/signin/google?callbackUrl=${callbackUrl}`);
  }

  const userId = session.user.id as string;

  // すでにメンバーなら何もしない（EDITOR として upsert）
  await prisma.circleMember.upsert({
    where: {
      circleId_userId: {
        circleId,
        userId,
      },
    },
    update: {},
    create: {
      circleId,
      userId,
      role: "EDITOR", // 招待参加は EDITOR として参加
    },
  });

  // ここでは DB に「参加ログ専用テーブル」は作らず、
  // joinedAt（CircleMember.joinedAt）をタイムラインとして使う方針。
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

  // 未ログインなら Google サインインへ → 戻り先はこの /join
  if (!session || !session.user?.id) {
    const callbackUrl = encodeURIComponent(`/join?circleId=${circleId}`);
    redirect(`/api/auth/signin/google?callbackUrl=${callbackUrl}`);
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
    },
  });

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

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md px-4 pt-8 pb-10">
        <h1 className="text-base font-semibold text-sky-100 mb-3">
          サークルへの参加
        </h1>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 mb-4">
          <h2 className="text-sm font-semibold text-slate-100 mb-1">
            {circle.name}
          </h2>
          {circle.description && (
            <p className="text-xs text-slate-300 mb-1">{circle.description}</p>
          )}
          <p className="text-[11px] text-slate-500">
            ウォレット名: {circle.walletName ?? "（未設定）"}
            <br />
            通貨: {circle.currency}
          </p>
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
