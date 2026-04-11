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

// PATCH: 公開/非公開の切り替え
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const { isActive } = await req.json();

  const notice = await prisma.notice.update({
    where: { id },
    data: { isActive },
  });
  return NextResponse.json({ notice });
}

// DELETE: お知らせ削除
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  await prisma.notice.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
