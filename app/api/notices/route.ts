import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET: 公開中のお知らせ一覧（ログイン不要）
export async function GET() {
  const notices = await prisma.notice.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, title: true, body: true, link: true, createdAt: true },
  });
  return NextResponse.json({ notices });
}
