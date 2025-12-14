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
      diffFromPrev: null,
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
      diffFromPrev: null,
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

  await prisma.circleSnapshot.findFirstOrThrow({
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
  revalidatePath(`/dashboard`);
}
