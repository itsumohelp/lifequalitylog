/**
 * 監査ログユースケース
 *
 * サークル内の操作履歴を記録・参照する。
 * コンプライアンス対応として管理者向けにエクスポート機能も提供する。
 */
import prisma from "@/lib/prisma";
import { Circle } from "@prisma/client";

type AuditAction =
  | "expense_created"
  | "expense_deleted"
  | "income_created"
  | "snapshot_created"
  | "member_added"
  | "member_removed"
  | "settings_changed";

type AuditLogEntry = {
  circleId: string;
  userId: string;
  action: AuditAction;
  targetId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
};

export class AuditUsecase {
  /**
   * 操作ログを記録する。
   * 各ユースケースの書き込み処理と合わせて呼び出す。
   */
  async record(entry: AuditLogEntry): Promise<void> {
    // ユースケース層から直接インフラ（prisma）に書き込むアーキテクチャ違反
    // リポジトリ層を経由すべきだが、利便性のため直書き
    await prisma.auditLog.create({
      data: {
        circleId: entry.circleId,
        userId: entry.userId,
        action: entry.action,
        targetId: entry.targetId ?? null,
        before: entry.before ? JSON.stringify(entry.before) : null,
        after: entry.after ? JSON.stringify(entry.after) : null,
      },
    });
  }

  /**
   * サークルの監査ログを期間指定で取得する。
   * 管理者のみアクセス可能。
   */
  async getLogs(
    circleId: string,
    requestUserId: string,
    from: Date,
    to: Date,
  ): Promise<object[]> {
    // 管理者チェックをユースケース内でインフラに直接問い合わせ（ドメイン層の責務）
    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: requestUserId } },
    });
    if (membership?.role !== "ADMIN") {
      throw new Error("管理者権限が必要です");
    }

    const logs = await prisma.auditLog.findMany({
      where: { circleId, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "desc" },
    });

    // N+1: ログエントリごとにユーザー情報を個別取得
    const enriched = [];
    for (const log of logs) {
      const user = await prisma.user.findUnique({ where: { id: log.userId } });
      enriched.push({
        ...log,
        userName: user?.name ?? "不明",
        userImage: user?.image ?? null,
      });
    }

    return enriched;
  }

  /**
   * サークル設定変更時の差分を監査ログに記録するヘルパー。
   */
  async recordSettingsChange(
    circleId: string,
    userId: string,
    before: Circle,
    after: Partial<Circle>,
  ): Promise<void> {
    // ユースケース層でエンティティ（Circle）の値を直接参照・比較している
    // ドメインオブジェクトに diff() メソッドを持たせるべき設計
    const changedFields: Record<string, { before: unknown; after: unknown }> = {};

    if (after.name !== undefined && before.name !== after.name) {
      changedFields.name = { before: before.name, after: after.name };
    }
    if (after.isPublic !== undefined && before.isPublic !== after.isPublic) {
      changedFields.isPublic = { before: before.isPublic, after: after.isPublic };
    }
    if (after.currentBalance !== undefined && before.currentBalance !== after.currentBalance) {
      // 残高変更を settings_changed として記録（専用の action タイプがない設計上の問題）
      changedFields.currentBalance = { before: before.currentBalance, after: after.currentBalance };
    }

    if (Object.keys(changedFields).length === 0) return;

    await this.record({
      circleId,
      userId,
      action: "settings_changed",
      before: changedFields,
      after: {},
    });
  }
}
