import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user?.id) {
    redirect(`/?callbackUrl=/item/${id}`);
  }

  const dashIndex = id.indexOf("-");
  if (dashIndex === -1) {
    redirect("/dashboard");
  }

  const type = id.substring(0, dashIndex);
  const rawId = id.substring(dashIndex + 1);

  let circleId: string | null = null;

  if (type === "expense") {
    const row = await prisma.expense.findUnique({ where: { id: rawId }, select: { circleId: true } });
    circleId = row?.circleId ?? null;
  } else if (type === "income") {
    const row = await prisma.income.findUnique({ where: { id: rawId }, select: { circleId: true } });
    circleId = row?.circleId ?? null;
  } else if (type === "snapshot") {
    const row = await prisma.circleSnapshot.findUnique({ where: { id: rawId }, select: { circleId: true } });
    circleId = row?.circleId ?? null;
  } else if (type === "notification") {
    const row = await prisma.notification.findUnique({ where: { id: rawId }, select: { circleId: true } });
    circleId = row?.circleId ?? null;
  }

  if (!circleId) {
    redirect("/dashboard");
  }

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.user.id } },
  });

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white rounded-xl p-8 max-w-sm w-full text-center space-y-4 shadow-sm">
          <p className="text-slate-700 font-medium">このアイテムを表示する権限がありません</p>
          <a href="/dashboard" className="text-sm text-sky-600 underline">
            ダッシュボードへ
          </a>
        </div>
      </div>
    );
  }

  redirect(`/dashboard?openItem=${id}`);
}
