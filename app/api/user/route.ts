import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";

// ユーザー情報を取得
export async function GET() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      image: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // 所属サークル一覧を取得（サークル作成日順）
  const memberships = await prisma.circleMember.findMany({
    where: { userId },
    orderBy: { circle: { createdAt: "asc" } },
    select: {
      role: true,
      circle: {
        select: {
          id: true,
          name: true,
          isPublic: true,
          allowNewMembers: true,
          members: {
            where: { role: "ADMIN" },
            select: {
              user: {
                select: {
                  displayName: true,
                  name: true,
                },
              },
            },
            take: 1,
          },
        },
      },
    },
  });

  const circles = memberships.map((m) => ({
    id: m.circle.id,
    name: m.circle.name,
    role: m.role,
    isPublic: m.circle.isPublic,
    allowNewMembers: m.circle.allowNewMembers,
    adminName:
      m.circle.members[0]?.user?.displayName ||
      m.circle.members[0]?.user?.name ||
      "未設定",
  }));

  return NextResponse.json({
    user: {
      ...user,
      // displayNameがなければnameを返す
      displayName: user.displayName || user.name,
    },
    circles,
  });
}

// 表示名を更新
export async function PATCH(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const body = await request.json();
  const { displayName, imageOptOut } = body;

  const updateData: { displayName?: string; image?: null } = {};

  // 表示名の更新
  if (displayName !== undefined) {
    if (typeof displayName !== "string" || displayName.trim().length === 0) {
      return NextResponse.json(
        { error: "表示名を入力してください" },
        { status: 400 }
      );
    }

    if (displayName.length > 50) {
      return NextResponse.json(
        { error: "表示名は50文字以内で入力してください" },
        { status: 400 }
      );
    }

    updateData.displayName = displayName.trim();
  }

  // Googleアイコンのオプトアウト
  if (imageOptOut === true) {
    updateData.image = null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "更新する項目がありません" },
      { status: 400 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    select: {
      id: true,
      name: true,
      displayName: true,
      email: true,
      image: true,
    },
  });

  return NextResponse.json({ user: updatedUser });
}

// ユーザーを削除（全データを物理削除）
export async function DELETE() {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  // トランザクションで全データを削除
  await prisma.$transaction(async (tx) => {
    // ユーザーが唯一のADMINであるサークルを取得
    const adminMemberships = await tx.circleMember.findMany({
      where: { userId, role: "ADMIN" },
      select: { circleId: true },
    });

    for (const membership of adminMemberships) {
      // そのサークルの他のADMINがいるか確認
      const otherAdmins = await tx.circleMember.count({
        where: {
          circleId: membership.circleId,
          role: "ADMIN",
          userId: { not: userId },
        },
      });

      if (otherAdmins === 0) {
        // 他のADMINがいない場合、サークル全体を削除
        // （onDelete: Cascadeにより関連データも削除される）
        await tx.circle.delete({
          where: { id: membership.circleId },
        });
      }
    }

    // ユーザーのCircleMemberを削除（残っている分）
    await tx.circleMember.deleteMany({
      where: { userId },
    });

    // ユーザーのSnapshotを削除
    await tx.snapshot.deleteMany({
      where: { userId },
    });

    // CircleSnapshotはonDelete: Cascadeではないので手動削除
    await tx.circleSnapshot.deleteMany({
      where: { userId },
    });

    // ExpenseとIncomeはonDelete: Cascadeではないので手動削除
    await tx.expense.deleteMany({
      where: { userId },
    });

    await tx.income.deleteMany({
      where: { userId },
    });

    // 最後にユーザーを削除（AccountとSessionはonDelete: Cascadeで自動削除）
    await tx.user.delete({
      where: { id: userId },
    });
  });

  return NextResponse.json({ success: true });
}
