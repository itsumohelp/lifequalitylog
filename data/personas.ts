/**
 * AIペルソナ定義
 * 年齢・性別・家族構成・性格を散らした10人のペルソナ。
 * daysAfterLaunch で段階的にサービスへ参加させ、自然なユーザー増加を演出する。
 */

/**
 * 投稿スケジュール判定に必要な最小インターフェース。
 * PersonaDef と PersonaConfig 両方が満たす。
 */
export type PostSchedule = {
  postFreqPerDay: number;
  activeHours: number[];
};

/**
 * Vertex AI が動的生成するペルソナ設定。PersonaProfile.personaConfig に格納。
 */
export type PersonaConfig = PostSchedule & {
  name: string;
  displayName: string;
  age: number;
  gender: "male" | "female";
  familyType: string;
  personalityTags: string[];
  description: string;
};

export type ExpenseCategoryKey =
  | "FOOD"
  | "DAILY"
  | "TRANSPORT"
  | "ENTERTAINMENT"
  | "UTILITY"
  | "MEDICAL"
  | "OTHER";

export type PersonaDef = {
  key: string;
  name: string;
  displayName: string;
  email: string;
  age: number;
  gender: "male" | "female";
  familyType: string;
  personalityTags: string[];
  circleKey: string;
  circleName: string;
  circlePartnerKey?: string;
  postFreqPerDay: number;
  activeHours: number[];
  categoryWeights: Partial<Record<ExpenseCategoryKey, number>>;
  typicalAmounts: Partial<Record<ExpenseCategoryKey, [number, number]>>;
  tagPool: string[];
  descriptionPool: Partial<Record<ExpenseCategoryKey, string[]>>;
  salaryDay?: number;
  salaryAmount?: number;
  daysAfterLaunch: number;
};

export const PERSONAS: PersonaDef[] = [
  // ──────────────────────────────────────────
  // 田中家（子育て中夫婦）
  // ──────────────────────────────────────────
  {
    key: "tanaka_misaki",
    name: "田中美咲",
    displayName: "美咲",
    email: "misaki.tanaka.persona@circlerun.app",
    age: 35,
    gender: "female",
    familyType: "子育て中（小学生2人）",
    personalityTags: ["節約家", "インドア", "計画的"],
    circleKey: "tanaka_family",
    circleName: "田中家",
    circlePartnerKey: "tanaka_kenta",
    postFreqPerDay: 2.5,
    activeHours: [8, 12, 16, 21],
    categoryWeights: { FOOD: 0.45, DAILY: 0.25, TRANSPORT: 0.1, UTILITY: 0.1, MEDICAL: 0.07, OTHER: 0.03 },
    typicalAmounts: {
      FOOD: [400, 5500],
      DAILY: [300, 3000],
      TRANSPORT: [200, 800],
      UTILITY: [3000, 12000],
      MEDICAL: [500, 3000],
    },
    tagPool: ["食費", "スーパー", "日用品", "子供", "学校", "薬局", "電気代", "ガス代"],
    descriptionPool: {
      FOOD: ["スーパーで買い物", "夕食の食材", "朝食用パン", "お弁当の材料", "業務スーパー", "コープ"],
      DAILY: ["ドラッグストア", "洗剤・シャンプー", "ティッシュなど消耗品", "子供のノート・文具"],
      TRANSPORT: ["バス代", "電車代"],
      UTILITY: ["電気代", "ガス代", "水道代"],
      MEDICAL: ["小児科", "薬局", "歯医者"],
    },
    daysAfterLaunch: 0,
  },
  {
    key: "tanaka_kenta",
    name: "田中健太",
    displayName: "健太",
    email: "kenta.tanaka.persona@circlerun.app",
    age: 38,
    gender: "male",
    familyType: "子育て中（小学生2人）",
    personalityTags: ["普通", "仕事熱心"],
    circleKey: "tanaka_family",
    circleName: "田中家",
    circlePartnerKey: "tanaka_misaki",
    postFreqPerDay: 1.5,
    activeHours: [7, 12, 19, 22],
    categoryWeights: { FOOD: 0.35, TRANSPORT: 0.25, ENTERTAINMENT: 0.2, DAILY: 0.1, OTHER: 0.1 },
    typicalAmounts: {
      FOOD: [600, 2000],
      TRANSPORT: [200, 3000],
      ENTERTAINMENT: [500, 8000],
      DAILY: [500, 3000],
    },
    tagPool: ["ランチ", "電車", "コンビニ", "外食", "交通費", "娯楽"],
    descriptionPool: {
      FOOD: ["ランチ", "コンビニ", "外食", "居酒屋", "ラーメン", "定食屋"],
      TRANSPORT: ["電車代", "タクシー", "ガソリン", "駐車場"],
      ENTERTAINMENT: ["映画", "本", "アプリ内課金", "飲み会"],
    },
    salaryDay: 25,
    salaryAmount: 350000,
    daysAfterLaunch: 0,
  },

  // ──────────────────────────────────────────
  // 山田翔太（独身・散財系・アウトドア）
  // ──────────────────────────────────────────
  {
    key: "yamada_shota",
    name: "山田翔太",
    displayName: "翔太",
    email: "shota.yamada.persona@circlerun.app",
    age: 24,
    gender: "male",
    familyType: "独身・一人暮らし",
    personalityTags: ["散財", "アウトドア", "スポーツ", "衝動買い"],
    circleKey: "yamada_solo",
    circleName: "翔太の家計",
    postFreqPerDay: 4.5,
    activeHours: [9, 13, 16, 19, 21, 23],
    categoryWeights: { FOOD: 0.3, ENTERTAINMENT: 0.35, TRANSPORT: 0.15, DAILY: 0.1, OTHER: 0.1 },
    typicalAmounts: {
      FOOD: [700, 3500],
      ENTERTAINMENT: [1500, 30000],
      TRANSPORT: [300, 5000],
      DAILY: [500, 5000],
    },
    tagPool: ["外食", "スポーツ", "アウトドア", "ゲーム", "ガジェット", "ランチ", "飲み会", "キャンプ"],
    descriptionPool: {
      FOOD: ["ランチ（焼肉）", "深夜ラーメン", "コンビニ飯", "回転寿司", "ファストフード", "デリバリー"],
      ENTERTAINMENT: ["キャンプ用品", "ランニングシューズ", "ゲーム", "ジム月会費", "アウトドア用品", "スポーツウェア", "釣り具"],
      TRANSPORT: ["電車", "タクシー", "ガソリン"],
    },
    salaryDay: 25,
    salaryAmount: 280000,
    daysAfterLaunch: 5,
  },

  // ──────────────────────────────────────────
  // 鈴木カップル（ファッション×IT）
  // ──────────────────────────────────────────
  {
    key: "suzuki_hana",
    name: "鈴木花",
    displayName: "花",
    email: "hana.suzuki.persona@circlerun.app",
    age: 28,
    gender: "female",
    familyType: "同棲カップル",
    personalityTags: ["ファッション", "美容", "カフェ好き"],
    circleKey: "suzuki_couple",
    circleName: "鈴木カップル",
    circlePartnerKey: "suzuki_daisuke",
    postFreqPerDay: 3.0,
    activeHours: [10, 13, 16, 20, 22],
    categoryWeights: { FOOD: 0.3, ENTERTAINMENT: 0.4, DAILY: 0.15, TRANSPORT: 0.1, OTHER: 0.05 },
    typicalAmounts: {
      FOOD: [500, 2000],
      ENTERTAINMENT: [1000, 20000],
      DAILY: [500, 5000],
      TRANSPORT: [200, 800],
    },
    tagPool: ["カフェ", "ランチ", "ショッピング", "コスメ", "美容院", "洋服", "外食"],
    descriptionPool: {
      FOOD: ["カフェ", "ランチ（イタリアン）", "スイーツ", "ブランチ", "外食"],
      ENTERTAINMENT: ["コスメ", "洋服", "アクセサリー", "美容院", "ネイル", "映画", "ライブ"],
      DAILY: ["スキンケア", "ドラッグストア"],
    },
    salaryDay: 25,
    salaryAmount: 250000,
    daysAfterLaunch: 12,
  },
  {
    key: "suzuki_daisuke",
    name: "鈴木大輔",
    displayName: "大輔",
    email: "daisuke.suzuki.persona@circlerun.app",
    age: 30,
    gender: "male",
    familyType: "同棲カップル",
    personalityTags: ["IT系", "サブスク多め", "普通"],
    circleKey: "suzuki_couple",
    circleName: "鈴木カップル",
    circlePartnerKey: "suzuki_hana",
    postFreqPerDay: 1.2,
    activeHours: [8, 12, 19],
    categoryWeights: { FOOD: 0.35, ENTERTAINMENT: 0.3, TRANSPORT: 0.15, UTILITY: 0.1, OTHER: 0.1 },
    typicalAmounts: {
      FOOD: [600, 1800],
      ENTERTAINMENT: [500, 15000],
      TRANSPORT: [200, 1500],
      UTILITY: [1000, 8000],
    },
    tagPool: ["ランチ", "サブスク", "ガジェット", "電車", "コンビニ", "外食"],
    descriptionPool: {
      FOOD: ["ランチ", "コンビニ", "外食", "宅配ピザ"],
      ENTERTAINMENT: ["Amazonプライム", "Spotify", "ゲーム", "技術書", "ガジェット"],
      UTILITY: ["電気代", "ネット代", "スマホ代"],
    },
    salaryDay: 25,
    salaryAmount: 420000,
    daysAfterLaunch: 12,
  },

  // ──────────────────────────────────────────
  // 佐藤家（高齢夫婦）
  // ──────────────────────────────────────────
  {
    key: "sato_kazuko",
    name: "佐藤和子",
    displayName: "和子",
    email: "kazuko.sato.persona@circlerun.app",
    age: 68,
    gender: "female",
    familyType: "高齢夫婦・年金生活",
    personalityTags: ["節約家", "伝統的", "慎重"],
    circleKey: "sato_family",
    circleName: "佐藤家",
    circlePartnerKey: "sato_masao",
    postFreqPerDay: 0.5,
    activeHours: [9, 14],
    categoryWeights: { FOOD: 0.5, DAILY: 0.2, MEDICAL: 0.2, TRANSPORT: 0.05, OTHER: 0.05 },
    typicalAmounts: {
      FOOD: [300, 4000],
      DAILY: [200, 2000],
      MEDICAL: [500, 4000],
      TRANSPORT: [200, 500],
    },
    tagPool: ["食費", "スーパー", "薬局", "病院", "日用品"],
    descriptionPool: {
      FOOD: ["スーパーで食材", "魚屋", "八百屋", "お惣菜"],
      DAILY: ["薬局", "ドラッグストア"],
      MEDICAL: ["内科", "整形外科", "薬局", "歯医者"],
      TRANSPORT: ["バス代"],
    },
    daysAfterLaunch: 20,
  },
  {
    key: "sato_masao",
    name: "佐藤正雄",
    displayName: "正雄",
    email: "masao.sato.persona@circlerun.app",
    age: 70,
    gender: "male",
    familyType: "高齢夫婦・年金生活",
    personalityTags: ["趣味散財（園芸・釣り）", "日常節約"],
    circleKey: "sato_family",
    circleName: "佐藤家",
    circlePartnerKey: "sato_kazuko",
    postFreqPerDay: 0.3,
    activeHours: [7, 15],
    categoryWeights: { FOOD: 0.3, ENTERTAINMENT: 0.4, DAILY: 0.15, MEDICAL: 0.15 },
    typicalAmounts: {
      FOOD: [300, 2000],
      ENTERTAINMENT: [500, 8000],
      DAILY: [300, 2000],
      MEDICAL: [500, 3000],
    },
    tagPool: ["釣り", "園芸", "食費", "医療費"],
    descriptionPool: {
      FOOD: ["スーパー", "魚屋"],
      ENTERTAINMENT: ["釣り具", "肥料・植木", "園芸用品", "種"],
      MEDICAL: ["内科", "整形外科"],
    },
    daysAfterLaunch: 20,
  },

  // ──────────────────────────────────────────
  // 中村あかり（大学生・一人暮らし）
  // ──────────────────────────────────────────
  {
    key: "nakamura_akari",
    name: "中村あかり",
    displayName: "あかり",
    email: "akari.nakamura.persona@circlerun.app",
    age: 19,
    gender: "female",
    familyType: "大学生・一人暮らし",
    personalityTags: ["節約意識あり", "趣味散財（アニメ・ゲーム）", "不規則"],
    circleKey: "nakamura_solo",
    circleName: "あかりの家計",
    postFreqPerDay: 1.5,
    activeHours: [11, 15, 20, 23],
    categoryWeights: { FOOD: 0.45, ENTERTAINMENT: 0.25, TRANSPORT: 0.15, DAILY: 0.1, OTHER: 0.05 },
    typicalAmounts: {
      FOOD: [200, 1200],
      ENTERTAINMENT: [500, 5000],
      TRANSPORT: [200, 600],
      DAILY: [200, 2000],
    },
    tagPool: ["コンビニ", "ランチ", "アニメ", "ゲーム", "電車", "日用品", "本"],
    descriptionPool: {
      FOOD: ["コンビニ", "学食", "カップ麺", "スーパー（半額品）", "ファストフード"],
      ENTERTAINMENT: ["漫画", "アニメグッズ", "ゲーム課金", "本"],
      TRANSPORT: ["電車代", "バス"],
    },
    salaryDay: 15,
    salaryAmount: 80000,
    daysAfterLaunch: 30,
  },

  // ──────────────────────────────────────────
  // 木村誠（中年・独身・アウトドア）
  // ──────────────────────────────────────────
  {
    key: "kimura_makoto",
    name: "木村誠",
    displayName: "誠",
    email: "makoto.kimura.persona@circlerun.app",
    age: 45,
    gender: "male",
    familyType: "独身・離婚歴あり",
    personalityTags: ["アウトドア", "車持ち", "中〜高支出"],
    circleKey: "kimura_solo",
    circleName: "木村の家計",
    postFreqPerDay: 0.8,
    activeHours: [7, 13, 20],
    categoryWeights: { FOOD: 0.3, ENTERTAINMENT: 0.35, TRANSPORT: 0.2, DAILY: 0.1, OTHER: 0.05 },
    typicalAmounts: {
      FOOD: [800, 4000],
      ENTERTAINMENT: [2000, 40000],
      TRANSPORT: [500, 10000],
      DAILY: [500, 5000],
    },
    tagPool: ["外食", "キャンプ", "釣り", "ガソリン", "アウトドア", "登山", "スポーツ"],
    descriptionPool: {
      FOOD: ["外食", "居酒屋", "焼肉", "ランチ"],
      ENTERTAINMENT: ["キャンプ用品", "登山装備", "釣り用品", "ジム", "スポーツ用品"],
      TRANSPORT: ["ガソリン", "高速料金", "駐車場"],
    },
    salaryDay: 25,
    salaryAmount: 500000,
    daysAfterLaunch: 45,
  },

  // ──────────────────────────────────────────
  // 松本さくら（シングルマザー・働き盛り）
  // ──────────────────────────────────────────
  {
    key: "matsumoto_sakura",
    name: "松本さくら",
    displayName: "さくら",
    email: "sakura.matsumoto.persona@circlerun.app",
    age: 52,
    gender: "female",
    familyType: "シングルマザー（高校生の子あり）",
    personalityTags: ["実用主義", "計画的", "自分磨き意識"],
    circleKey: "matsumoto_solo",
    circleName: "松本家",
    postFreqPerDay: 1.8,
    activeHours: [6, 12, 19, 22],
    categoryWeights: { FOOD: 0.4, DAILY: 0.2, TRANSPORT: 0.15, MEDICAL: 0.1, ENTERTAINMENT: 0.1, OTHER: 0.05 },
    typicalAmounts: {
      FOOD: [500, 6000],
      DAILY: [500, 4000],
      TRANSPORT: [200, 2000],
      MEDICAL: [500, 5000],
      ENTERTAINMENT: [1000, 5000],
    },
    tagPool: ["食費", "スーパー", "子供", "医療", "日用品", "電車", "美容"],
    descriptionPool: {
      FOOD: ["スーパーで食材", "外食", "お惣菜", "弁当"],
      DAILY: ["ドラッグストア", "日用消耗品", "子供の学用品"],
      TRANSPORT: ["電車定期", "バス"],
      MEDICAL: ["婦人科", "内科", "薬"],
      ENTERTAINMENT: ["美容院", "エステ", "本"],
    },
    salaryDay: 25,
    salaryAmount: 350000,
    daysAfterLaunch: 55,
  },
];

export const PERSONA_MAP = new Map(PERSONAS.map((p) => [p.key, p]));
