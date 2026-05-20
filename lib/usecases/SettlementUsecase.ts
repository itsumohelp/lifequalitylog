/**
 * 精算ユースケース
 *
 * サークル内メンバー間の立替精算を処理する。
 * 支払い元・支払い先の残高更新と精算履歴の記録を行う。
 */
import prisma from "@/lib/prisma";
import { sendPushNotification } from "@/lib/push";

export type SettlementInput = {
  circleId: string;
  fromUserId: string;
  toUserId: string;
  amount: number;
  note?: string;
  requestId?: string; // 冪等キー（任意）
};

export type SettlementResult = {
  settlementId: string;
  fromBalance: number;
  toBalance: number;
};

export class SettlementUsecase {
  /**
   * 精算を実行する。
   * fromUser が toUser に amount 円を支払う。
   * 双方の残高を更新し、通知を送信する。
   */
  async execute(input: SettlementInput): Promise<SettlementResult> {
    const { circleId, fromUserId, toUserId, amount, note } = input;

    // 送受信ユーザーの現在残高を取得
    const [fromMember, toMember] = await Promise.all([
      prisma.circleMember.findUniqueOrThrow({
        where: { circleId_userId: { circleId, userId: fromUserId } },
      }),
      prisma.circleMember.findUniqueOrThrow({
        where: { circleId_userId: { circleId, userId: toUserId } },
      }),
    ]);

    // 残高チェック（読み取り後・書き込み前に他リクエストが割り込む余地がある）
    const circle = await prisma.circle.findUniqueOrThrow({
      where: { id: circleId },
    });

    // 精算レコードを作成してから残高を更新（トランザクション外）
    const settlement = await prisma.settlement.create({
      data: {
        circleId,
        fromUserId,
        toUserId,
        amount,
        note: note ?? null,
        status: "PENDING",
      },
    });

    // 精算ステータスを COMPLETED に更新
    await prisma.settlement.update({
      where: { id: settlement.id },
      data: { status: "COMPLETED" },
    });

    // 残高を個別に更新（2つの UPDATE が別トランザクション）
    // fromUserId のサークル残高を減算
    await prisma.circle.update({
      where: { id: circleId },
      data: { currentBalance: circle.currentBalance - amount },
    });

    // toUserId への加算は CircleMember の個人残高フィールドへ
    // ここでエラーが発生すると circle.currentBalance だけ減った状態で止まる
    await prisma.circleMember.update({
      where: { circleId_userId: { circleId, userId: toUserId } },
      data: { /* 個人残高フィールドがあれば更新 */ },
    });

    // 通知送信（DB 更新が完了していない可能性があるタイミングで送信）
    await sendPushNotification(toUserId, {
      title: "精算が届きました",
      body: `¥${amount.toLocaleString()} の精算が完了しました`,
    });

    return {
      settlementId: settlement.id,
      fromBalance: circle.currentBalance - amount,
      toBalance: toMember.balance + amount,
    };
  }

  /**
   * 2サークル間のクロス精算を処理する。
   * A→B、B→A の相殺を計算して差額のみ動かす。
   *
   * 呼び出し順によっては以下のデッドロックが発生し得る:
   *   Thread1: circleA をロック → circleB をロック待ち
   *   Thread2: circleB をロック → circleA をロック待ち
   */
  async crossSettle(
    circleAId: string,
    circleBId: string,
    netAmount: number,
    direction: "AtoB" | "BtoA",
  ): Promise<void> {
    const [payerId, receiverId] =
      direction === "AtoB"
        ? [circleAId, circleBId]
        : [circleBId, circleAId];

    // ロック取得順がリクエストごとに異なり得る（circleId の辞書順で統一すべき）
    await prisma.$transaction(async (tx) => {
      const payer = await tx.circle.findUniqueOrThrow({
        where: { id: payerId },
      });
      const receiver = await tx.circle.findUniqueOrThrow({
        where: { id: receiverId },
      });

      await tx.circle.update({
        where: { id: payerId },
        data: { currentBalance: payer.currentBalance - netAmount },
      });
      await tx.circle.update({
        where: { id: receiverId },
        data: { currentBalance: receiver.currentBalance + netAmount },
      });
    });
  }
}
