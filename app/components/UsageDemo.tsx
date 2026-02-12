"use client";

import { useEffect, useState } from "react";

export default function UsageDemo() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 600), // 入力テキスト表示
      setTimeout(() => setStep(2), 1800), // 送信
      setTimeout(() => setStep(3), 2600), // バブル表示
      setTimeout(() => setStep(4), 3400), // 残高更新
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="mt-10 mb-8">
      <h2 className="text-center text-sm font-semibold text-slate-700 mb-4">
        チャット感覚でサクッと記録
      </h2>

      {/* スマホ風フレーム */}
      <div className="mx-auto w-[280px] rounded-[24px] border-[3px] border-slate-800 bg-slate-50 overflow-hidden shadow-lg">
        {/* ステータスバー */}
        <div className="bg-slate-800 text-white text-[10px] px-4 py-1 flex justify-between items-center">
          <span>CircleRun</span>
          <span className="text-slate-400">12:34</span>
        </div>

        {/* 残高ヘッダー */}
        <div className="bg-white border-b border-slate-200 px-3 py-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-500">残高</span>
            <span
              className={`text-sm font-bold transition-all duration-500 ${
                step >= 4 ? "text-sky-600" : "text-slate-800"
              }`}
            >
              ¥{step >= 4 ? "49,150" : "50,000"}
            </span>
          </div>
          {step >= 4 && (
            <div className="text-right text-[10px] text-red-500 animate-fade-in">
              -¥850
            </div>
          )}
        </div>

        {/* チャットエリア */}
        <div className="bg-slate-100 px-3 py-3 min-h-[140px] flex flex-col justify-end gap-2">
          {/* 既存メッセージ */}
          <div className="flex justify-end">
            <div className="bg-slate-800 text-white rounded-2xl rounded-br-sm px-3 py-1.5 max-w-[80%]">
              <div className="text-[11px]">
                <span>☕ ¥400</span>
                <span className="text-slate-400 ml-1 text-[9px]">
                  (¥50,400)
                </span>
              </div>
              <div className="flex gap-1 mt-0.5">
                <span className="text-[8px] bg-sky-900 text-sky-200 rounded-full px-1.5">
                  カフェ
                </span>
              </div>
            </div>
          </div>

          {/* 新しいメッセージ（ステップ3で表示） */}
          {step >= 3 && (
            <div className="flex justify-end animate-slide-up">
              <div className="bg-slate-800 text-white rounded-2xl rounded-br-sm px-3 py-1.5 max-w-[80%]">
                <div className="text-[11px]">
                  <span>🍔 ¥850</span>
                  <span className="text-slate-400 ml-1 text-[9px]">
                    (¥49,150)
                  </span>
                </div>
                <div className="flex gap-1 mt-0.5">
                  <span className="text-[8px] bg-sky-900 text-sky-200 rounded-full px-1.5">
                    ランチ
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 入力エリア */}
        <div className="bg-white border-t border-slate-200 px-2 py-2">
          {/* モード切替 */}
          <div className="flex gap-1 mb-1.5 justify-center">
            <span className="text-[9px] bg-slate-800 text-white rounded-full px-2 py-0.5">
              支出
            </span>
            <span className="text-[9px] bg-slate-200 text-slate-500 rounded-full px-2 py-0.5">
              収入
            </span>
            <span className="text-[9px] bg-slate-200 text-slate-500 rounded-full px-2 py-0.5">
              残高
            </span>
          </div>
          {/* 入力フィールド */}
          <div className="flex items-center gap-1.5">
            <div className="flex-1 bg-slate-100 rounded-full px-3 py-1.5 text-[11px] text-slate-700 min-h-[28px] flex items-center">
              {step >= 1 && step < 3 && (
                <span className="typing-text">ランチ 850円</span>
              )}
              {step < 1 && <span className="text-slate-400">〇〇 △△円</span>}
              {step >= 3 && <span className="text-slate-400">〇〇 △△円</span>}
            </div>
            <button
              className={`rounded-full w-7 h-7 flex items-center justify-center text-white text-xs transition-colors ${
                step >= 1 && step < 3 ? "bg-sky-500" : "bg-slate-300"
              }`}
            >
              ↑
            </button>
          </div>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-4">
        金額とメモを入力するだけ
        <br />
        自動でカテゴリ分類＆残高計算
      </p>

      {/* アニメーション用スタイル */}
      <style jsx>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes typing {
          from {
            width: 0;
          }
          to {
            width: 100%;
          }
        }
        .animate-slide-up {
          animation: slideUp 0.4s ease-out;
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-out;
        }
        .typing-text {
          display: inline-block;
          overflow: hidden;
          white-space: nowrap;
          animation: typing 0.8s steps(8) forwards;
        }
      `}</style>
    </div>
  );
}
