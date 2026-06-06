export type TrophyDifficulty = "low" | "medium" | "high";

export type TrophyDef = {
  key: string;
  name: string;
  description: string;
  difficulty: TrophyDifficulty;
  icon: string;
};

export const TROPHIES: TrophyDef[] = [
  // ── LOW ────────────────────────────────────────────────
  { key: "first_post",          name: "はじめの一歩",     description: "初めての支出を記録した",           difficulty: "low",    icon: "🌱" },
  { key: "first_food",          name: "食の記録",          description: "食費カテゴリで初投稿",             difficulty: "low",    icon: "🍽️" },
  { key: "first_transport",     name: "移動の記録",        description: "交通費カテゴリで初投稿",           difficulty: "low",    icon: "🚃" },
  { key: "first_daily",         name: "日用品の記録",      description: "日用品カテゴリで初投稿",           difficulty: "low",    icon: "🛒" },
  { key: "first_entertainment", name: "娯楽の記録",        description: "娯楽カテゴリで初投稿",             difficulty: "low",    icon: "🎮" },
  { key: "first_medical",       name: "健康の記録",        description: "医療カテゴリで初投稿",             difficulty: "low",    icon: "💊" },
  { key: "first_utility",       name: "光熱費の記録",      description: "光熱費カテゴリで初投稿",           difficulty: "low",    icon: "💡" },
  { key: "first_tag",           name: "タグ付け開始",      description: "初めてタグを付けた",               difficulty: "low",    icon: "🏷️" },
  { key: "circle_join",         name: "仲間入り",          description: "サークルに参加した",               difficulty: "low",    icon: "👥" },
  { key: "early_bird",          name: "早起きログ",        description: "朝6時より前に記録した",            difficulty: "low",    icon: "🌅" },
  { key: "night_owl",           name: "夜更かしログ",      description: "深夜0時以降に記録した",            difficulty: "low",    icon: "🌙" },
  { key: "lunch_logger",        name: "ランチタイム記録",  description: "12〜14時に記録した",               difficulty: "low",    icon: "☀️" },
  { key: "dinner_logger",       name: "夕食記録",          description: "18〜21時に記録した",               difficulty: "low",    icon: "🌆" },
  { key: "weekend_logger",      name: "週末の記録",        description: "土日に記録した",                   difficulty: "low",    icon: "🎉" },
  { key: "month_start",         name: "月初め記録",        description: "月の1日に記録した",                difficulty: "low",    icon: "📅" },
  { key: "big_spend",           name: "大きな出費",        description: "1万円以上の支出を記録した",         difficulty: "low",    icon: "💸" },
  { key: "small_change",        name: "100円以下の出費",   description: "100円以下の支出を記録した",         difficulty: "low",    icon: "🪙" },
  { key: "posts_5",             name: "5件達成",           description: "合計5件の支出を記録した",           difficulty: "low",    icon: "📝" },
  { key: "streak_3",            name: "3日連続",           description: "3日間連続で記録した",               difficulty: "low",    icon: "🔥" },
  { key: "first_reaction",      name: "最初のいいね",      description: "初めてリアクションをもらった",      difficulty: "low",    icon: "👍" },

  // ── MEDIUM ─────────────────────────────────────────────
  { key: "posts_10",            name: "10件達成",          description: "合計10件の支出を記録した",          difficulty: "medium", icon: "📊" },
  { key: "posts_30",            name: "30件達成",          description: "合計30件の支出を記録した",          difficulty: "medium", icon: "📈" },
  { key: "posts_50",            name: "50件達成",          description: "合計50件の支出を記録した",          difficulty: "medium", icon: "🎯" },
  { key: "streak_7",            name: "1週間継続",         description: "7日間連続で記録した",               difficulty: "medium", icon: "💪" },
  { key: "streak_14",           name: "2週間継続",         description: "14日間連続で記録した",              difficulty: "medium", icon: "⚡" },
  { key: "tag_master",          name: "タグマスター",      description: "10種類以上のタグを使用した",        difficulty: "medium", icon: "🎨" },
  { key: "food_20",             name: "食費記録20件",      description: "食費カテゴリで20件記録した",        difficulty: "medium", icon: "🍜" },
  { key: "reactions_10",        name: "10いいね達成",      description: "リアクションを合計10個もらった",    difficulty: "medium", icon: "⭐" },
  { key: "monthly_20",          name: "月間20件達成",      description: "1ヶ月で20件以上記録した",           difficulty: "medium", icon: "🗓️" },
  { key: "total_50k",           name: "5万円突破",         description: "累計支出記録が5万円を超えた",       difficulty: "medium", icon: "💰" },
  { key: "multi_circle",        name: "マルチサークル",    description: "2つ以上のサークルに参加した",       difficulty: "medium", icon: "🤝" },
  { key: "all_categories",      name: "カテゴリ制覇",      description: "全カテゴリで記録した",              difficulty: "medium", icon: "🌈" },
  { key: "tag_variety",         name: "タグ多彩",          description: "15種類以上のタグを使用した",        difficulty: "medium", icon: "✏️" },

  // ── HIGH ───────────────────────────────────────────────
  { key: "posts_100",           name: "100件達成",         description: "合計100件の支出を記録した",         difficulty: "high",   icon: "🏆" },
  { key: "posts_500",           name: "500件達成",         description: "合計500件の支出を記録した",         difficulty: "high",   icon: "🚀" },
  { key: "posts_1000",          name: "1000件達成",        description: "合計1000件の支出を記録した",        difficulty: "high",   icon: "💎" },
  { key: "streak_30",           name: "1ヶ月継続",         description: "30日間連続で記録した",              difficulty: "high",   icon: "👑" },
  { key: "streak_90",           name: "3ヶ月継続",         description: "90日間連続で記録した",              difficulty: "high",   icon: "🦁" },
  { key: "streak_180",          name: "半年継続",          description: "180日間連続で記録した",             difficulty: "high",   icon: "🌟" },
  { key: "tag_collector",       name: "タグコレクター",    description: "25種類以上のタグを使用した",        difficulty: "high",   icon: "🎖️" },
  { key: "reactions_50",        name: "50いいね達成",      description: "リアクションを合計50個もらった",    difficulty: "high",   icon: "✨" },
  { key: "total_1m",            name: "累計100万円突破",   description: "累計支出記録が100万円を超えた",     difficulty: "high",   icon: "💫" },
];

export const TROPHY_MAP = new Map(TROPHIES.map((t) => [t.key, t]));

// ── Stats ──────────────────────────────────────────────────

export type TrophyStats = {
  postCount: number;
  maxStreak: number;
  currentStreak: number;
  uniqueTagCount: number;
  categoryCounts: Partial<Record<string, number>>;
  reactionCount: number;
  circleCount: number;
  monthlyMax: number;
  totalAmount: number;
  hasBigSpend: boolean;
  hasSmallChange: boolean;
  hasEarlyBird: boolean;
  hasNightOwl: boolean;
  hasLunchLogger: boolean;
  hasDinnerLogger: boolean;
  hasWeekend: boolean;
  hasMonthStart: boolean;
};

// ── Streak calculation ─────────────────────────────────────

export function calcStreaks(jstDateStrings: string[]): { current: number; max: number } {
  if (jstDateStrings.length === 0) return { current: 0, max: 0 };

  const sorted = [...new Set(jstDateStrings)].sort();

  let max = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = Math.round(
      (new Date(sorted[i]).getTime() - new Date(sorted[i - 1]).getTime()) /
        86400000,
    );
    if (diff === 1) {
      run++;
      if (run > max) max = run;
    } else {
      run = 1;
    }
  }

  const todayJST = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10);
  const yesterdayJST = new Date(Date.now() + 9 * 3600000 - 86400000)
    .toISOString()
    .slice(0, 10);

  const lastDate = sorted[sorted.length - 1];
  let current = 0;
  if (lastDate === todayJST || lastDate === yesterdayJST) {
    current = 1;
    for (let i = sorted.length - 2; i >= 0; i--) {
      const diff = Math.round(
        (new Date(sorted[i + 1]).getTime() - new Date(sorted[i]).getTime()) /
          86400000,
      );
      if (diff === 1) current++;
      else break;
    }
  }

  return { current, max };
}

// ── Trophy evaluation ──────────────────────────────────────

export function evaluateTrophies(s: TrophyStats): string[] {
  const earned: string[] = [];
  const c = (key: string, cond: boolean) => { if (cond) earned.push(key); };

  // LOW
  c("first_post",          s.postCount >= 1);
  c("first_food",          (s.categoryCounts["FOOD"] ?? 0) >= 1);
  c("first_transport",     (s.categoryCounts["TRANSPORT"] ?? 0) >= 1);
  c("first_daily",         (s.categoryCounts["DAILY"] ?? 0) >= 1);
  c("first_entertainment", (s.categoryCounts["ENTERTAINMENT"] ?? 0) >= 1);
  c("first_medical",       (s.categoryCounts["MEDICAL"] ?? 0) >= 1);
  c("first_utility",       (s.categoryCounts["UTILITY"] ?? 0) >= 1);
  c("first_tag",           s.uniqueTagCount >= 1);
  c("circle_join",         s.circleCount >= 1);
  c("early_bird",          s.hasEarlyBird);
  c("night_owl",           s.hasNightOwl);
  c("lunch_logger",        s.hasLunchLogger);
  c("dinner_logger",       s.hasDinnerLogger);
  c("weekend_logger",      s.hasWeekend);
  c("month_start",         s.hasMonthStart);
  c("big_spend",           s.hasBigSpend);
  c("small_change",        s.hasSmallChange);
  c("posts_5",             s.postCount >= 5);
  c("streak_3",            s.maxStreak >= 3);
  c("first_reaction",      s.reactionCount >= 1);

  // MEDIUM
  c("posts_10",            s.postCount >= 10);
  c("posts_30",            s.postCount >= 30);
  c("posts_50",            s.postCount >= 50);
  c("streak_7",            s.maxStreak >= 7);
  c("streak_14",           s.maxStreak >= 14);
  c("tag_master",          s.uniqueTagCount >= 10);
  c("food_20",             (s.categoryCounts["FOOD"] ?? 0) >= 20);
  c("reactions_10",        s.reactionCount >= 10);
  c("monthly_20",          s.monthlyMax >= 20);
  c("total_50k",           s.totalAmount >= 50000);
  c("multi_circle",        s.circleCount >= 2);
  c("all_categories",
    ["FOOD","DAILY","TRANSPORT","ENTERTAINMENT","UTILITY","MEDICAL"].every(
      (cat) => (s.categoryCounts[cat] ?? 0) >= 1,
    ));
  c("tag_variety",         s.uniqueTagCount >= 15);

  // HIGH
  c("posts_100",           s.postCount >= 100);
  c("posts_500",           s.postCount >= 500);
  c("posts_1000",          s.postCount >= 1000);
  c("streak_30",           s.maxStreak >= 30);
  c("streak_90",           s.maxStreak >= 90);
  c("streak_180",          s.maxStreak >= 180);
  c("tag_collector",       s.uniqueTagCount >= 25);
  c("reactions_50",        s.reactionCount >= 50);
  c("total_1m",            s.totalAmount >= 1000000);

  return earned;
}
