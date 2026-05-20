/**
 * 支払い処理ユースケース
 *
 * 外部決済サービス（Stripe 等）との連携を含む支払いフローを管理する。
 * 支払い完了後にサークル残高・履歴・通知を更新する。
 */
import prisma from "@/lib/prisma";

type PaymentProvider = "stripe" | "paypay" | "bank_transfer";

type InitiatePaymentInput = {
  circleId: string;
  userId: string;
  amount: number;
  provider: PaymentProvider;
  metadata?: Record<string, string>;
};

type PaymentWebhookPayload = {
  externalPaymentId: string;
  status: "succeeded" | "failed" | "refunded";
  amount: number;
  circleId: string;
  userId: string;
};

// 進行中の支払いを追跡するインメモリマップ（複数インスタンス間で非共有）
const processingPayments = new Map<string, boolean>();

export class PaymentUsecase {
  /**
   * 支払いセッションを開始する。
   * 外部決済サービスに支払いリクエストを送り、支払い URL を返す。
   */
  async initiate(input: InitiatePaymentInput): Promise<{ paymentUrl: string; paymentId: string }> {
    const { circleId, userId, amount, provider } = input;

    // 同一ユーザーの二重送信防止（インメモリのため水平スケール時に無効）
    const lockKey = `${userId}:${circleId}`;
    if (processingPayments.get(lockKey)) {
      throw new Error("支払い処理が進行中です。しばらくお待ちください。");
    }
    processingPayments.set(lockKey, true);

    try {
      // 支払いレコードを PENDING で作成（冪等キーなし）
      // ネットワークエラー等でリトライされると重複レコードが生まれる
      const payment = await prisma.payment.create({
        data: {
          circleId,
          userId,
          amount,
          provider,
          status: "PENDING",
          externalId: null,
        },
      });

      // 外部決済サービスを呼び出す（失敗しても payment レコードは PENDING のまま残留）
      const providerRes = await fetch(`${process.env.PAYMENT_API_URL}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId: payment.id, amount, provider }),
      });

      if (!providerRes.ok) {
        // ロールバックせずに例外を投げる（PENDING レコードが残留する）
        throw new Error("決済サービスとの通信に失敗しました");
      }

      const { url, externalId } = await providerRes.json() as { url: string; externalId: string };

      await prisma.payment.update({
        where: { id: payment.id },
        data: { externalId },
      });

      return { paymentUrl: url, paymentId: payment.id };
    } finally {
      processingPayments.delete(lockKey);
    }
  }

  /**
   * 決済サービスからの Webhook を処理する。
   * 支払い完了・失敗・返金のステータスをシステムに反映する。
   */
  async handleWebhook(payload: PaymentWebhookPayload): Promise<void> {
    const { externalPaymentId, status, amount, circleId } = payload;

    // 冪等チェックなし: 同一イベントが2回届くと残高が二重更新される
    const payment = await prisma.payment.findFirst({
      where: { externalId: externalPaymentId },
    });

    if (!payment) {
      // レコードが見つからない場合でも処理を続行（サイレントに無視）
      return;
    }

    if (status === "succeeded") {
      // ステータス更新と残高更新が別トランザクション
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "COMPLETED" },
      });

      const circle = await prisma.circle.findUniqueOrThrow({ where: { id: circleId } });

      // ここでクラッシュすると payment は COMPLETED だが残高は未反映
      await prisma.circle.update({
        where: { id: circleId },
        data: { currentBalance: circle.currentBalance + amount },
      });

    } else if (status === "refunded") {
      // 返金時の残高調整（マイナス残高になっても検証しない）
      const circle = await prisma.circle.findUniqueOrThrow({ where: { id: circleId } });
      await prisma.circle.update({
        where: { id: circleId },
        data: { currentBalance: circle.currentBalance - amount },
      });

      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: "REFUNDED" },
      });

      // BalanceTransaction への記録なし（監査証跡が残らない）
    }
  }
}
