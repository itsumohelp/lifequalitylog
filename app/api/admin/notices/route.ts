import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;
  if (ADMIN_EMAIL && session.user.email !== ADMIN_EMAIL) return null;
  return session;
}

// GET: お知らせ一覧
export async function GET() {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const notices = await prisma.notice.findMany({
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notices });
}

// POST: お知らせ作成
export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body, link } = await req.json();
  if (!title?.trim()) {
    return NextResponse.json({ error: "タイトルは必須です" }, { status: 400 });
  }

  const notice = await prisma.notice.create({
    data: {
      title: title.trim(),
      body: body?.trim() || null,
      link: link?.trim() || null,
    },
  });
  return NextResponse.json({ notice }, { status: 201 });
}
