import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const template = await prisma.warikanTemplate.findUnique({ where: { id } });
  if (!template) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const member = await prisma.circleMember.findUnique({
    where: { circleId_userId: { circleId: template.circleId, userId: session.user.id } },
  });
  if (!member) {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  // 作成者またはADMINのみ削除可
  if (template.createdBy !== session.user.id && member.role !== "ADMIN") {
    return NextResponse.json({ error: "Permission denied" }, { status: 403 });
  }

  await prisma.warikanTemplate.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
