/**
 * ペルソナ投稿エンジン
 * 人間らしい揺らぎを加えた支出・収入データを生成する。
 */
import { PersonaDef, ExpenseCategoryKey, PERSONA_MAP, PostSchedule } from "@/data/personas";

// ──────────────────────────────────────────
// 投稿判定
// ──────────────────────────────────────────

/**
 * この5分枠でペルソナが投稿するかどうかを確率で判定する。
 * アクティブ時間帯・投稿頻度・日次ムラを考慮する。
 */
export function shouldPostNow(def: PostSchedule, jstHour: number): boolean {
  const isActiveHour = def.activeHours.includes(jstHour);
  // 1日あたりのアクティブ5分枠数
  const activeSlotsPerDay = def.activeHours.length * 12;
  const baseProb = def.postFreqPerDay / activeSlotsPerDay;
  // アクティブ時間外は確率を5%に抑える
  const prob = isActiveHour ? baseProb : baseProb * 0.05;
  // 当日のムラ（日によって多めに投稿したり少なめだったり）
  const dailyMood = 0.5 + Math.random() * 1.0; // 0.5〜1.5倍
  return Math.random() < prob * dailyMood;
}

// ──────────────────────────────────────────
// 金額生成
// ──────────────────────────────────────────

/** 金額に人間らしいばらつきを加えて整数yen に丸める */
export function humanizeAmount(base: number, maxJitterPct = 20): number {
  const jittered = base * (1 + (Math.random() * 2 - 1) * (maxJitterPct / 100));
  const rounded = Math.max(50, Math.round(jittered));
  // 60%の確率で100円単位、25%で10円単位、15%で1円単位
  const r = Math.random();
  if (r < 0.6) return Math.round(rounded / 100) * 100;
  if (r < 0.85) return Math.round(rounded / 10) * 10;
  return rounded;
}

/** カテゴリの金額レンジからランダムに生成 */
export function pickAmount(def: PersonaDef, category: ExpenseCategoryKey): number {
  const range = def.typicalAmounts[category];
  if (!range) return humanizeAmount(800);
  const [min, max] = range;
  return humanizeAmount(min + Math.random() * (max - min));
}

// ──────────────────────────────────────────
// カテゴリ選択
// ──────────────────────────────────────────

export function pickCategory(def: PersonaDef): ExpenseCategoryKey {
  const entries = Object.entries(def.categoryWeights) as [ExpenseCategoryKey, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [cat, w] of entries) {
    r -= w;
    if (r <= 0) return cat;
  }
  return entries[0][0];
}

// ──────────────────────────────────────────
// タグ生成（タイポあり）
// ──────────────────────────────────────────

// よくあるタイポパターン
const TAG_TYPOS: Record<string, string> = {
  コンビニ: "コンビ二",    // 二（数字）とニ（カタカナ）の混在
  スーパー: "スーパ",
  ランチ:   "らんち",
  カフェ:   "かふぇ",
  食費:     "食ひ",
  交通費:   "交通ひ",
  日用品:   "日用ひん",
  外食:     "がいしょく",
};

/** 低確率でタイポを混入させる */
export function applyTypo(tag: string): string {
  if (Math.random() > 0.07) return tag; // 93%はそのまま
  return TAG_TYPOS[tag] ?? tag.slice(0, -1); // マップになければ末尾1文字削除
}

/** タグプールからランダムに0〜2個選ぶ */
export function pickTags(def: PersonaDef): string[] {
  const r = Math.random();
  const count = r < 0.25 ? 0 : r < 0.75 ? 1 : 2;
  const shuffled = [...def.tagPool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count).map(applyTypo);
}

// ──────────────────────────────────────────
// 説明文生成
// ──────────────────────────────────────────

export function pickDescription(def: PersonaDef, category: ExpenseCategoryKey): string {
  const pool = def.descriptionPool[category];
  if (!pool?.length) return "その他";
  return pool[Math.floor(Math.random() * pool.length)];
}

// ──────────────────────────────────────────
// 支出データ生成
// ──────────────────────────────────────────

export type GeneratedExpense = {
  circleId: string;
  userId: string;
  amount: number;
  description: string;
  category: ExpenseCategoryKey;
  tags: string[];
  autoTags: string[];
  expenseDate: Date;
};

export function generateExpense(
  def: PersonaDef,
  circleId: string,
  userId: string,
): GeneratedExpense {
  const category = pickCategory(def);
  return {
    circleId,
    userId,
    amount: pickAmount(def, category),
    description: pickDescription(def, category),
    category,
    tags: pickTags(def),
    autoTags: [],
    expenseDate: new Date(),
  };
}

// ──────────────────────────────────────────
// 収入データ生成（給与日用）
// ──────────────────────────────────────────

export type GeneratedIncome = {
  circleId: string;
  userId: string;
  amount: number;
  description: string;
  category: "SALARY" | "OTHER";
  tags: string[];
  autoTags: string[];
  incomeDate: Date;
};

export function generateSalaryIncome(
  def: PersonaDef,
  circleId: string,
  userId: string,
): GeneratedIncome | null {
  if (!def.salaryAmount) return null;
  // ±3%のばらつき
  const amount = humanizeAmount(def.salaryAmount, 3);
  return {
    circleId,
    userId,
    amount,
    description: "給与",
    category: "SALARY",
    tags: ["給与"],
    autoTags: [],
    incomeDate: new Date(),
  };
}

// ──────────────────────────────────────────
// ペルソナ定義の取得ヘルパー
// ──────────────────────────────────────────

export function getPersonaDef(personaKey: string): PersonaDef | undefined {
  return PERSONA_MAP.get(personaKey);
}
