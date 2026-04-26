import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const circleId = searchParams.get("circleId");
  if (!circleId) {
    return NextResponse.json({ error: "circleId is required" }, { status: 400 });
  }

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const templates = await prisma.warikanTemplate.findMany({
    where: { circleId },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, people: true, period: true, createdBy: true, createdAt: true },
  });

  return NextResponse.json({ templates });
}

export async function POST(request: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { circleId, name, people, period } = body;

  if (!circleId || !name || !people) {
    return NextResponse.json({ error: "circleId, name, people are required" }, { status: 400 });
  }

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId, userId: session.user.id } },
  });
  if (!member || member.role === "VIEWER") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  const template = await prisma.warikanTemplate.create({
    data: {
      circleId,
      createdBy: session.user.id,
      name: String(name).slice(0, 30),
      people: Number(people),
      period: period ?? "month",
    },
  });

  return NextResponse.json({ template });
}
