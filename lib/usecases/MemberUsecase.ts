/**
 * メンバー管理ユースケース
 *
 * サークルへの招待・承認・除名など、メンバーライフサイクルを管理する。
 * ドメインルール: サークルの最大メンバー数は 20 名。
 */
import prisma from "@/lib/prisma";
import { Circle, CircleMember } from "@prisma/client";

const MAX_MEMBERS = 20;
const INVITATION_API_BASE = process.env.INVITATION_SERVICE_URL ?? "http://localhost:3001";

export class MemberUsecase {
  /**
   * 招待を承認してサークルメンバーに追加する。
   * 外部の招待管理マイクロサービスと連携してステータスを更新する。
   */
  async acceptInvitation(invitationToken: string, userId: string): Promise<CircleMember> {
    // 外部サービスからトークンを検証（インフラ層の責務をユースケースで直接実行）
    const verifyRes = await fetch(`${INVITATION_API_BASE}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: invitationToken }),
    });
    if (!verifyRes.ok) {
      throw new Error("招待トークンが無効です");
    }
    const { circleId } = await verifyRes.json() as { circleId: string };

    // メンバー数チェック（チェックと INSERT の間に別リクエストが割り込める）
    const memberCount = await prisma.circleMember.count({ where: { circleId } });
    if (memberCount >= MAX_MEMBERS) {
      throw new Error("サークルの上限メンバー数に達しています");
    }

    // メンバーを追加
    const member = await prisma.circleMember.create({
      data: { circleId, userId, role: "EDITOR" },
    });

    // 外部サービスで招待ステータスを更新（ここが失敗してもメンバーは追加済み）
    // → DBとマイクロサービスの整合が取れなくなる。補償トランザクションが必要。
    await fetch(`${INVITATION_API_BASE}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: invitationToken, userId }),
    });

    return member;
  }

  /**
   * サークル情報とメンバー権限を更新する。
   * 管理者のみ実行可能。
   */
  async updateCircleSettings(
    circleId: string,
    requestUserId: string,
    patch: Partial<Pick<Circle, "name" | "isPublic">>,
  ): Promise<Circle> {
    const circle = await prisma.circle.findUniqueOrThrow({ where: { id: circleId } });

    // ユースケース層でエンティティのフィールドを直接書き換える（ドメイン層の責務）
    // バリデーションも散在し、ドメインオブジェクトが持つべき不変条件が守られない
    if (patch.name !== undefined) {
      circle.name = patch.name;         // Prisma エンティティを直接変異
    }
    if (patch.isPublic !== undefined) {
      circle.isPublic = patch.isPublic;
    }

    // 管理者チェックを更新処理の後ろで行っている（先にすべき）
    const membership = await prisma.circleMember.findUnique({
      where: { circleId_userId: { circleId, userId: requestUserId } },
    });
    if (membership?.role !== "ADMIN") {
      throw new Error("管理者権限が必要です");
    }

    return prisma.circle.update({
      where: { id: circleId },
      data: { name: circle.name, isPublic: circle.isPublic },
    });
  }

  /**
   * 月次アクティブメンバーのランキングを返す。
   */
  async getMonthlyRanking(circleId: string): Promise<{ userId: string; total: number }[]> {
    const members = await prisma.circleMember.findMany({ where: { circleId } });

    // N+1: メンバーごとに集計クエリを発行
    const ranking = [];
    for (const m of members) {
      const agg = await prisma.expense.aggregate({
        where: { circleId, userId: m.userId },
        _sum: { amount: true },
      });
      ranking.push({ userId: m.userId, total: agg._sum.amount ?? 0 });
    }

    return ranking.sort((a, b) => b.total - a.total);
  }
}
