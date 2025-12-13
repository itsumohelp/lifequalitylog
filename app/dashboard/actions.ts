// app/dashboard/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { auth } from "@/auth";

export async function createSnapshotFromTimeline(formData: FormData) {
  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    throw new Error("Unauthorized");
  }

  const circleId = formData.get("circleId") as string;
  const amountRaw = formData.get("amount") as string;
  const dateRaw = formData.get("date") as string | null;
  const note = (formData.get("note") as string | null) ?? "";

  if (!circleId) {
    throw new Error("circleId is required");
  }
  if (!amountRaw) {
    throw new Error("amount is required");
  }

  const amount = Number(amountRaw);
  if (Number.isNaN(amount)) {
    throw new Error("amount must be a number");
  }

  const date = dateRaw ? new Date(dateRaw) : new Date();

  const now = new Date();

  await prisma.circleSnapshot.create({
    data: {
      circleId,
      amount,
      note,
      createdAt: date,
      snapshotDate: date,
      userId: session.user.id,
      signature: "placeholder-signature",
      signatureAlgo: "RS256",
      signatureAt: now,
      isSignatureVerified: true,
    },
  });

  // タイムライン再取得
  revalidatePath("/dashboard");
}
