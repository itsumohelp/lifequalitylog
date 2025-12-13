// app/dashboard/EventCard.tsx
"use client";

import { useRouter } from "next/navigation";
import { QuickSnapshotForm } from "@/app/dashboard/QuickSnapshotForm";
import { Circle, CircleSnapshot, User } from "../generated/prisma/client";
type SnapshotWithRelations = CircleSnapshot & {
  circle: Circle;
  user: User;
};

export function EventCard({ snapshot }: { snapshot: SnapshotWithRelations }) {
  const router = useRouter();
  const { circle, user } = snapshot;

  const formattedDate = new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(snapshot.createdAt);

  // アイコン（画像があれば画像、なければ頭文字）
  const avatarLetter = user.name?.[0] ?? user.email?.[0] ?? "?";

  const handleCardClick = () => {
    router.push(`/circles/${circle.id}`);
  };

  return (
    <article className="flex gap-3 px-2 py-1">
      {/* 左側：アバター */}
      <div className="mt-1">
        {user.image ? (
          // 画像アイコンがある場合（schemaに合わせてプロパティ名調整）
          <img
            src={user.image}
            alt={user.name ?? "user"}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-300 text-xs font-semibold text-white">
            {avatarLetter}
          </div>
        )}
      </div>

      {/* 右側：吹き出し＋フォーム */}
      <div className="flex-1 space-y-1">
        {/* 吹き出し本体（カード = クリックで詳細へ） */}
        <div
          onClick={handleCardClick}
          className="max-w-full cursor-pointer rounded-2xl bg-gray-50 px-3 py-2 shadow-sm hover:bg-gray-100 transition"
        >
          {/* 1行目：投稿者名 / サークル名 / 日時 */}
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <div className="text-xs font-semibold">
              {user.name ?? "名無しユーザー"}
              <span className="ml-1 text-[11px] text-gray-500">
                in {circle.name}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 whitespace-nowrap">
              {formattedDate}
            </span>
          </div>

          {/* 2行目：金額 + 差分 */}
          <div className="flex items-baseline gap-2 text-sm">
            <span className="font-mono text-[13px]">
              {snapshot.amount.toLocaleString()} 円
            </span>
            {snapshot.diffFromPrev != null && (
              <span className="text-[11px] text-gray-500">
                前回比 {snapshot.diffFromPrev > 0 ? "+" : ""}
                {snapshot.diffFromPrev.toLocaleString()} 円
              </span>
            )}
          </div>

          {/* 3行目：メモ（あれば） */}
          {snapshot.note && (
            <p className="mt-1 text-[12px] text-gray-700">{snapshot.note}</p>
          )}

          {/* 4行目：署名情報とかを後で入れる余地 */}
          {/* <p className="mt-1 text-[10px] text-gray-400">署名: ...</p> */}
        </div>

        {/* 吹き出しの下に、同じサークル用のクイック更新フォーム */}
        <QuickSnapshotForm circleId={circle.id} />
      </div>
    </article>
  );
}
