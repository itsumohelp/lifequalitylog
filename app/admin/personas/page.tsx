import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import Link from "next/link";
import type { PersonaConfig } from "@/data/personas";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

export default async function AdminPersonasPage() {
  const session = await auth();
  if (!session?.user?.email) redirect("/");
  if (ADMIN_EMAIL && session.user.email !== ADMIN_EMAIL) redirect("/");

  const profiles = await prisma.personaProfile.findMany({
    include: {
      user: { select: { name: true, displayName: true, image: true } },
    },
    orderBy: { activatedAt: "asc" },
  });

  const circleIds = profiles.map((p) => p.circleId);
  const [circles, expenseCounts] = await Promise.all([
    prisma.circle.findMany({
      where: { id: { in: circleIds } },
      select: { id: true, name: true, isPublic: true, currentBalance: true },
    }),
    prisma.expense.groupBy({
      by: ["circleId"],
      where: { circleId: { in: circleIds } },
      _count: { id: true },
    }),
  ]);

  const circleMap = new Map(circles.map((c) => [c.id, c]));
  const countMap = new Map(expenseCounts.map((e) => [e.circleId, e._count.id]));

  const staticKeys = new Set([
    "tanaka_misaki", "tanaka_kenta", "yamada_shota",
    "suzuki_hana", "suzuki_daisuke", "sato_kazuko", "sato_masao",
    "nakamura_akari", "kimura_makoto", "matsumoto_sakura",
  ]);

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">ペルソナ管理</h1>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-500">{profiles.length}人</span>
          <Link
            href="/admin/notices"
            className="text-xs text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            ← お知らせ管理
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {profiles.map((profile) => {
          const circle = circleMap.get(profile.circleId);
          const postCount = countMap.get(profile.circleId) ?? 0;
          const config = profile.personaConfig as PersonaConfig | null;
          const isStatic = staticKeys.has(profile.personaKey);

          const name = profile.user.name ?? "不明";
          const displayName = profile.user.displayName ?? name;
          const age = config?.age;
          const gender = config?.gender;
          const familyType = config?.familyType;
          const tags = config?.personalityTags ?? [];
          const postFreq = config?.postFreqPerDay;

          const initials = displayName.slice(0, 1);
          const hue = name.split("").reduce((s, c) => s + c.charCodeAt(0), 0) % 360;

          return (
            <div
              key={profile.id}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="flex items-start gap-3">
                {/* アバター */}
                <div className="relative flex-shrink-0">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
                    style={{ backgroundColor: `hsl(${hue},55%,55%)` }}
                  >
                    {initials}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center text-white leading-none text-[7px] font-bold">
                    AI
                  </span>
                </div>

                {/* 情報 */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-slate-900">{name}</span>
                    <span className="text-xs text-slate-400">（{displayName}）</span>
                    {age && (
                      <span className="text-xs text-slate-500">
                        {age}歳・{gender === "male" ? "男性" : gender === "female" ? "女性" : ""}
                      </span>
                    )}
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        isStatic
                          ? "bg-slate-100 text-slate-500"
                          : "bg-violet-100 text-violet-600"
                      }`}
                    >
                      {isStatic ? "静的" : "AI生成"}
                    </span>
                  </div>

                  {familyType && (
                    <p className="text-xs text-slate-500 mt-0.5">{familyType}</p>
                  )}

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {tags.map((t) => (
                        <span key={t} className="text-[10px] px-1.5 py-0.5 bg-sky-50 text-sky-600 rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400">
                    {postFreq && <span>投稿頻度: {postFreq}/日</span>}
                    <span>投稿数: {postCount}件</span>
                    {circle && (
                      <span>
                        残高: ¥{circle.currentBalance.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* サークルとタイムラインリンク */}
              {circle && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600">{circle.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        circle.isPublic
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      {circle.isPublic ? "公開" : "非公開"}
                    </span>
                  </div>
                  {circle.isPublic && (
                    <Link
                      href={`/c/${circle.id}`}
                      className="text-xs text-sky-600 border border-sky-200 px-3 py-1 rounded-lg hover:bg-sky-50 transition"
                      target="_blank"
                    >
                      タイムラインを見る →
                    </Link>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {profiles.length === 0 && (
          <div className="text-center py-12 text-slate-400 text-sm">
            <p>ペルソナがまだいません</p>
            <p className="text-xs mt-1">お知らせ管理画面から「日次ジョブ」を実行してください</p>
          </div>
        )}
      </div>
    </div>
  );
}
