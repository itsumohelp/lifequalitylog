import { ExpenseCategory } from "@/app/generated/prisma/enums";

export interface ParsedExpense {
  amount: number;
  place: string | null;
  category: ExpenseCategory;
  tags: string[];
}

/**
 * 全角数字を半角に変換し、カンマを除去する
 */
function normalizeNumber(str: string): string {
  // 全角数字→半角数字
  const fullWidthToHalf = str.replace(/[０-９]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0xfee0)
  );
  // カンマ（全角・半角）を除去
  return fullWidthToHalf.replace(/[,，]/g, "");
}

/**
 * 金額文字列をパースする（全角数字・カンマ対応）
 */
function parseAmount(str: string): number {
  const normalized = normalizeNumber(str);
  return parseInt(normalized, 10);
}

// カテゴリ判定用のキーワード辞書
const categoryKeywords: Record<ExpenseCategory, string[]> = {
  FOOD: [
    "ランチ", "ディナー", "朝食", "昼食", "夕食", "食事",
    "スタバ", "カフェ", "コーヒー", "マック", "マクドナルド",
    "すき家", "吉野家", "松屋", "ラーメン", "寿司", "焼肉",
    "居酒屋", "レストラン", "弁当", "おにぎり", "パン",
  ],
  DAILY: [
    "コンビニ", "スーパー", "ドラッグストア", "薬局",
    "100均", "百均", "ダイソー", "セリア",
    "日用品", "洗剤", "シャンプー", "ティッシュ",
  ],
  TRANSPORT: [
    "電車", "バス", "タクシー", "地下鉄", "JR", "メトロ",
    "交通費", "定期", "切符", "Suica", "PASMO", "ICOCA",
    "駐車場", "ガソリン", "高速",
  ],
  ENTERTAINMENT: [
    "映画", "ゲーム", "本", "漫画", "雑誌",
    "Netflix", "Spotify", "サブスク",
    "カラオケ", "ボウリング", "遊び",
  ],
  UTILITY: [
    "電気", "ガス", "水道", "光熱費",
    "携帯", "スマホ", "通信費", "インターネット", "WiFi",
  ],
  MEDICAL: [
    "病院", "医者", "クリニック", "薬", "医療",
    "歯医者", "眼科", "内科",
  ],
  OTHER: [],
};

/**
 * 自然言語の支出入力をパースする
 * 対応パターン:
 * - 「コンビニで500円」「コンビニで５００円」
 * - 「ランチ 800円」「ランチ 1,000円」
 * - 「スタバ1200」「スタバ１，２００」
 * - 「電車代 220円」
 */
export function parseExpenseInput(input: string): ParsedExpense | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // 入力を正規化（全角数字→半角、カンマ除去）してからマッチング
  const normalized = normalizeNumber(trimmed);

  // 数字パターン（半角のみ、カンマ除去済み）
  const numPattern = "\\d+";

  // パターン1: 「〇〇で△△円」
  const pattern1 = new RegExp(`(.+?)で\\s*(${numPattern})\\s*円?$`);
  // パターン2: 「〇〇 △△円」または「〇〇　△△円」（全角スペース対応）
  const pattern2 = new RegExp(`(.+?)[\\s　]+(${numPattern})\\s*円?$`);
  // パターン3: 「〇〇△△」（スペースなし、数字で終わる）
  const pattern3 = new RegExp(`^(.+?)(${numPattern})円?$`);

  let place: string | null = null;
  let amount: number | null = null;

  // 各パターンを順に試行
  for (const pattern of [pattern1, pattern2, pattern3]) {
    const match = normalized.match(pattern);
    if (match) {
      place = match[1].trim();
      amount = parseAmount(match[2]);
      break;
    }
  }

  // 金額のみのパターン（例: 「500円」「1000」「１，０００円」）
  if (amount === null) {
    const amountOnly = normalized.match(new RegExp(`^(${numPattern})\\s*円?$`));
    if (amountOnly) {
      amount = parseAmount(amountOnly[1]);
      place = null;
    }
  }

  if (amount === null || isNaN(amount) || amount <= 0) {
    return null;
  }

  // カテゴリを判定
  const category = detectCategory(place || trimmed);

  // タグを抽出（placeがあればそれをタグに）
  const tags = extractTags(place);

  return {
    amount,
    place,
    category,
    tags,
  };
}

/**
 * テキストからタグを抽出
 * placeをそのままタグとして使用（正規化して重複排除）
 */
function extractTags(place: string | null): string[] {
  if (!place) return [];

  // 正規化（前後の空白除去、全角→半角など）
  const normalized = place.trim();
  if (!normalized) return [];

  // placeをそのままタグとして返す
  return [normalized];
}

/**
 * テキストからカテゴリを判定
 */
function detectCategory(text: string): ExpenseCategory {
  const lowerText = text.toLowerCase();

  for (const [category, keywords] of Object.entries(categoryKeywords)) {
    if (category === "OTHER") continue;

    for (const keyword of keywords) {
      if (lowerText.includes(keyword.toLowerCase())) {
        return category as ExpenseCategory;
      }
    }
  }

  return "OTHER";
}

/**
 * カテゴリの日本語表示名を取得
 */
export function getCategoryLabel(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    FOOD: "食費",
    DAILY: "日用品",
    TRANSPORT: "交通費",
    ENTERTAINMENT: "娯楽",
    UTILITY: "光熱費",
    MEDICAL: "医療",
    OTHER: "その他",
  };
  return labels[category];
}

/**
 * カテゴリの絵文字を取得
 */
export function getCategoryEmoji(category: ExpenseCategory): string {
  const emojis: Record<ExpenseCategory, string> = {
    FOOD: "🍽️",
    DAILY: "🛒",
    TRANSPORT: "🚃",
    ENTERTAINMENT: "🎮",
    UTILITY: "💡",
    MEDICAL: "🏥",
    OTHER: "📝",
  };
  return emojis[category];
}
