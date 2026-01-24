import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { ReactionType } from "@/app/generated/prisma/enums";

// 複数の投稿に対するリアクションを一括取得
export async function GET(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;
  const { searchParams } = new URL(request.url);
  const targetsParam = searchParams.get("targets");

  if (!targetsParam) {
    return NextResponse.json({ error: "targets parameter is required" }, { status: 400 });
  }

  // targets形式: "expense:id1,snapshot:id2,income:id3"
  const targetPairs = targetsParam.split(",").map((t) => {
    const [type, id] = t.split(":");
    return { targetType: type, targetId: id };
  });

  if (targetPairs.some((t) => !t.targetType || !t.targetId)) {
    return NextResponse.json({ error: "Invalid targets format" }, { status: 400 });
  }

  // 全リアクションを取得
  const reactions = await prisma.reaction.findMany({
    where: {
      OR: targetPairs.map((t) => ({
        targetType: t.targetType,
        targetId: t.targetId,
      })),
    },
    select: {
      targetType: true,
      targetId: true,
      type: true,
      userId: true,
    },
  });

  // 投稿ごとにリアクションを集計
  const reactionMap: Record<
    string,
    {
      counts: Record<ReactionType, number>;
      userReactions: ReactionType[];
    }
  > = {};

  for (const r of reactions) {
    const key = `${r.targetType}:${r.targetId}`;
    if (!reactionMap[key]) {
      reactionMap[key] = {
        counts: { CHECK: 0, GOOD: 0, BAD: 0, DOGEZA: 0 },
        userReactions: [],
      };
    }
    reactionMap[key].counts[r.type]++;
    if (r.userId === userId) {
      reactionMap[key].userReactions.push(r.type);
    }
  }

  return NextResponse.json({ reactions: reactionMap });
}

// リアクションを追加
export async function POST(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  try {
    const body = await request.json();
    const { targetType, targetId, type } = body;

    // バリデーション
    if (!targetType || !targetId || !type) {
      return NextResponse.json(
        { error: "targetType, targetId, type are required" },
        { status: 400 }
      );
    }

    if (!["expense", "income", "snapshot"].includes(targetType)) {
      return NextResponse.json(
        { error: "Invalid targetType" },
        { status: 400 }
      );
    }

    if (!["CHECK", "GOOD", "BAD", "DOGEZA"].includes(type)) {
      return NextResponse.json(
        { error: "Invalid reaction type" },
        { status: 400 }
      );
    }

    // リアクションを作成（既に存在する場合は無視）
    const reaction = await prisma.reaction.upsert({
      where: {
        userId_targetType_targetId_type: {
          userId,
          targetType,
          targetId,
          type,
        },
      },
      create: {
        userId,
        targetType,
        targetId,
        type,
      },
      update: {},
    });

    return NextResponse.json({ reaction });
  } catch (error) {
    console.error("Reaction create error:", error);
    return NextResponse.json(
      { error: "リアクションの追加に失敗しました" },
      { status: 500 }
    );
  }
}

// リアクションを削除
export async function DELETE(request: Request) {
  const session = await auth();
  if (!session || !session.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id as string;

  try {
    const body = await request.json();
    const { targetType, targetId, type } = body;

    // バリデーション
    if (!targetType || !targetId || !type) {
      return NextResponse.json(
        { error: "targetType, targetId, type are required" },
        { status: 400 }
      );
    }

    // リアクションを削除
    await prisma.reaction.deleteMany({
      where: {
        userId,
        targetType,
        targetId,
        type,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reaction delete error:", error);
    return NextResponse.json(
      { error: "リアクションの削除に失敗しました" },
      { status: 500 }
    );
  }
}
