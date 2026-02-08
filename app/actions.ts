"use server";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function addBalanceSnapshot(formData: FormData) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }
  const userId = session!.user!.id as string;
  const circleId = formData.get("circleId") as string;
  const amountRaw = formData.get("amount") as string;
  const dateRaw = (formData.get("date") as string) || "";
  const note = (formData.get("note") as string) || "";

  const amount = Number(amountRaw);
  if (!circleId || Number.isNaN(amount)) {
    throw new Error("invalid input");
  }

  const snapshotDate = dateRaw ? new Date(dateRaw) : new Date();

  // 前回のスナップショットを取得して差分を計算
  const previousSnapshot = await prisma.circleSnapshot.findFirst({
    where: { circleId },
    orderBy: { createdAt: "desc" },
  });
  const snapshotDiff = previousSnapshot
    ? amount - previousSnapshot.amount
    : null;

  await prisma.circleSnapshot.create({
    data: {
      circleId,
      amount,
      snapshotDate: snapshotDate,
      userId,
      note,
      createdAt: new Date(),
      signature: "dummy",
      signatureAlgo: "none",
      signatureAt: new Date(),
      isSignatureVerified: false,
      diffFromPrev: snapshotDiff,
    },
  });

  // サークルのcurrentBalanceをスナップショットの金額で上書き
  const circleBeforeSnapshot = await prisma.circle.findUnique({
    where: { id: circleId },
    select: { currentBalance: true },
  });
  const balanceBefore = circleBeforeSnapshot!.currentBalance;

  await prisma.circle.update({
    where: { id: circleId },
    data: { currentBalance: amount },
  });

  await prisma.balanceTransaction.create({
    data: {
      circleId,
      userId,
      type: "SNAPSHOT",
      isDelete: false,
      amount,
      balanceBefore,
      balanceAfter: amount,
    },
  });

  revalidatePath(`/circles/${circleId}`);
}

export async function addBalanceSnapshotBasic(formData: FormData) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }
  const userId = session!.user!.id as string;
  const circleId = formData.get("circleId") as string;
  const amountRaw = formData.get("amount") as string;
  const dateRaw = (formData.get("date") as string) || "";
  const note = (formData.get("note") as string) || "";

  const amount = Number(amountRaw);
  if (!circleId || Number.isNaN(amount)) {
    throw new Error("invalid input");
  }

  const snapshotDate = dateRaw ? new Date(dateRaw) : new Date();

  // 前回のスナップショットを取得して差分を計算
  const previousSnapshot = await prisma.circleSnapshot.findFirst({
    where: { circleId },
    orderBy: { createdAt: "desc" },
  });
  const snapshotDiff = previousSnapshot
    ? amount - previousSnapshot.amount
    : null;

  await prisma.circleSnapshot.create({
    data: {
      circleId,
      amount,
      snapshotDate: snapshotDate,
      userId,
      note,
      createdAt: new Date(),
      signature: "dummy",
      signatureAlgo: "none",
      signatureAt: new Date(),
      isSignatureVerified: false,
      diffFromPrev: snapshotDiff,
    },
  });

  // サークルのcurrentBalanceをスナップショットの金額で上書き
  const circleBeforeSnapshot = await prisma.circle.findUnique({
    where: { id: circleId },
    select: { currentBalance: true },
  });
  const balanceBeforeBasic = circleBeforeSnapshot!.currentBalance;

  await prisma.circle.update({
    where: { id: circleId },
    data: { currentBalance: amount },
  });

  await prisma.balanceTransaction.create({
    data: {
      circleId,
      userId,
      type: "SNAPSHOT",
      isDelete: false,
      amount,
      balanceBefore: balanceBeforeBasic,
      balanceAfter: amount,
    },
  });

  revalidatePath(`/dashboard`);
}

export async function delBalanceSnapshot(formData: FormData) {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }
  const userId = session!.user!.id as string;
  const snapshotId = formData.get("snapshotId") as string;

  const snapshot = await prisma.circleSnapshot.findFirstOrThrow({
    where: {
      id: snapshotId,
      userId: userId,
    },
  });

  await prisma.circleSnapshot.delete({
    where: {
      id: snapshotId,
      userId: userId,
    },
  });

  // currentBalanceを再計算
  const latestSnapshot = await prisma.circleSnapshot.findFirst({
    where: { circleId: snapshot.circleId },
    orderBy: { createdAt: "desc" },
  });

  let newBalance = latestSnapshot?.amount || 0;
  const snapshotDate = latestSnapshot?.createdAt || new Date(0);

  const expensesAfter = await prisma.expense.aggregate({
    where: {
      circleId: snapshot.circleId,
      createdAt: { gt: snapshotDate },
    },
    _sum: { amount: true },
  });
  newBalance -= expensesAfter._sum.amount || 0;

  const incomesAfter = await prisma.income.aggregate({
    where: {
      circleId: snapshot.circleId,
      createdAt: { gt: snapshotDate },
    },
    _sum: { amount: true },
  });
  newBalance += incomesAfter._sum.amount || 0;

  const circleBeforeDelete = await prisma.circle.findUnique({
    where: { id: snapshot.circleId },
    select: { currentBalance: true },
  });
  const balanceBeforeDel = circleBeforeDelete!.currentBalance;

  await prisma.circle.update({
    where: { id: snapshot.circleId },
    data: { currentBalance: newBalance },
  });

  await prisma.balanceTransaction.create({
    data: {
      circleId: snapshot.circleId,
      userId,
      type: "SNAPSHOT",
      isDelete: true,
      amount: snapshot.amount,
      balanceBefore: balanceBeforeDel,
      balanceAfter: newBalance,
    },
  });

  revalidatePath(`/dashboard`);
}
