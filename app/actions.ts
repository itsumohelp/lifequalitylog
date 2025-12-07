// app/actions.ts
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
  const memo = (formData.get("memo") as string) || "";

  const amount = Number(amountRaw);
  if (!circleId || Number.isNaN(amount)) {
    throw new Error("invalid input");
  }

  const recordedAt = dateRaw ? new Date(dateRaw) : new Date();

  await prisma.snapshot.create({
    data: {
      circleId,
      amount,
      recordedAt,
      userId,
      memo,
    },
  });

  revalidatePath(`/circles/${circleId}`);
}
