"use client";

import { useState } from "react";

type Props = {
  firstCircleId: string;
  onComplete: () => void;
};

const STEPS = [
  {
    icon: "💰",
    title: "CircleRunへようこそ！",
    lines: [
      "サークルのお金をみんなで",
      "記録・管理するアプリです。",
    ],
    points: [
      { icon: "📝", text: "支出・収入をチャット感覚で入力" },
      { icon: "📊", text: "自動集計・グラフで見える化" },
      { icon: "🤖", text: "AIがタグ付け・分析をサポート" },
    ],
  },
  {
    icon: "✨",
    title: "使い方はシンプル",
    lines: [
      "画面下の入力欄に金額を入れるだけ。",
      "あとは自動でやってくれます。",
    ],
    points: [
      { icon: "1️⃣", text: "金額を入力（例: 1200）" },
      { icon: "2️⃣", text: "自動でカテゴリ・タグが付く" },
      { icon: "3️⃣", text: "集計・グラフが自動生成" },
    ],
  },
  {
    icon: "🚀",
    title: "まずは試してみよう",
    lines: [
      "サンプルデータで",
      "機能をすぐ体験できます。",
    ],
    points: [],
  },
];

const USE_CASES = ["家計管理", "食費記録", "旅行費用", "仕事経費", "友達・カップル", "その他"];

export default function OnboardingModal({ firstCircleId, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [selectedUseCase, setSelectedUseCase] = useState("");
  const [isSeeding, setIsSeeding] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);

  const handleNext = async () => {
    if (step === 1 && selectedUseCase) {
      // サークル名を変更
      setIsRenaming(true);
      try {
        await fetch(`/api/circles/${firstCircleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: selectedUseCase }),
        });
      } catch {}
      setIsRenaming(false);
    }
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    }
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await fetch("/api/demo/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ circleId: firstCircleId }),
      });
      if (res.ok || res.status === 409) {
        localStorage.setItem("onboarding-v1", "done");
        window.location.reload();
      }
    } finally {
      setIsSeeding(false);
    }
  };

  const handleStartManual = () => {
    localStorage.setItem("onboarding-v1", "done");
    onComplete();
  };

  const current = STEPS[step];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-sm mx-auto p-6 pb-8 shadow-2xl">
        {/* ステップインジケーター */}
        <div className="flex justify-center gap-2 mb-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-slate-900" : i < step ? "w-3 bg-slate-400" : "w-3 bg-slate-200"
              }`}
            />
          ))}
        </div>

        {/* アイコン */}
        <div className="text-5xl text-center mb-4">{current.icon}</div>

        {/* タイトル */}
        <h2 className="text-xl font-bold text-slate-900 text-center mb-2">
          {current.title}
        </h2>

        {/* 説明文 */}
        <p className="text-sm text-slate-500 text-center mb-5">
          {current.lines.join("\n")}
        </p>

        {/* ポイントリスト（step 0, 1） */}
        {current.points.length > 0 && (
          <div className="space-y-2.5 mb-6">
            {current.points.map((p, i) => (
              <div key={i} className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-2.5">
                <span className="text-lg">{p.icon}</span>
                <span className="text-sm text-slate-700">{p.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* 用途選択（step 1） */}
        {step === 1 && (
          <div className="mb-6">
            <p className="text-xs text-slate-500 mb-2 text-center">サークルの用途を選ぶ（スキップ可）</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {USE_CASES.map((uc) => (
                <button
                  key={uc}
                  type="button"
                  onClick={() => setSelectedUseCase(uc === selectedUseCase ? "" : uc)}
                  className={`text-sm px-3 py-1.5 rounded-full border transition ${
                    selectedUseCase === uc
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-600 border-slate-300"
                  }`}
                >
                  {uc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* CTA（最終ステップ） */}
        {step === STEPS.length - 1 ? (
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleSeedDemo}
              disabled={isSeeding}
              className="w-full py-3 rounded-2xl bg-emerald-500 text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition"
            >
              {isSeeding ? "生成中..." : "🎲 サンプルデータで試してみる"}
            </button>
            <button
              type="button"
              onClick={handleStartManual}
              className="w-full py-2.5 rounded-2xl border border-slate-200 text-slate-600 text-sm font-medium active:scale-95 transition"
            >
              自分で入力して始める
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleNext}
            disabled={isRenaming}
            className="w-full py-3 rounded-2xl bg-slate-900 text-white font-semibold text-sm disabled:opacity-60 active:scale-95 transition"
          >
            {isRenaming ? "変更中..." : step === 1 && selectedUseCase ? `「${selectedUseCase}」で次へ` : "次へ →"}
          </button>
        )}

        {/* スキップ */}
        {step < STEPS.length - 1 && (
          <button
            type="button"
            onClick={() => {
              if (step === STEPS.length - 2) {
                setStep(STEPS.length - 1);
              } else {
                setStep((s) => s + 1);
              }
            }}
            className="w-full mt-2 py-2 text-xs text-slate-400 hover:text-slate-600 transition"
          >
            スキップ
          </button>
        )}
      </div>
    </div>
  );
}
