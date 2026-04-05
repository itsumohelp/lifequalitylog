import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const pollId = req.nextUrl.searchParams.get("pollId");
  if (!pollId) return NextResponse.json({ error: "missing pollId" }, { status: 400 });

  const entry = await prisma.iosAuthToken.findUnique({ where: { pollId } });
  if (!entry || entry.expiresAt < new Date()) {
    return NextResponse.json({ pending: true });
  }

  await prisma.iosAuthToken.delete({ where: { pollId } });
  return NextResponse.json({ token: entry.token });
}
