// app/dashboard/QuickSnapshotForm.tsx
"use client";

import { useState, useTransition, FormEvent } from "react";
import { createSnapshotFromTimeline } from "./actions";

type Props = {
  circleId: string;
};

export function QuickSnapshotForm({ circleId }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const today = new Date();
  const defaultDate = `${today.getFullYear()}-${String(
    today.getMonth() + 1,
  ).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const handleToggleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    // 親のカードクリック（詳細遷移）を止める
    e.stopPropagation();
    setIsOpen((v) => !v);
  };

  const handleFormSubmit = (formData: FormData) => {
    setError(null);
    formData.set("circleId", circleId);

    startTransition(async () => {
      try {
        await createSnapshotFromTimeline(formData);
        setIsOpen(false);
      } catch (e) {
        console.error(e);
        setError("保存に失敗しました。しばらくしてから再度お試しください。");
      }
    });
  };

  const handleFormClick = (e: React.MouseEvent<HTMLFormElement>) => {
    // フォーム内クリックもカードの onClick に伝播させない
    e.stopPropagation();
  };

  return (
    <div className="pl-1">
      <button
        type="button"
        onClick={handleToggleClick}
        className="mt-1 text-[11px] text-blue-600 hover:underline"
      >
        {isOpen ? "残高更新を閉じる" : "このサークルの残高を更新"}
      </button>

      {isOpen && (
        <form
          className="mt-2 space-y-1 rounded-md border border-gray-200 bg-white px-2 py-2 text-[11px]"
          action={handleFormSubmit}
          onClick={handleFormClick}
        >
          <input type="hidden" name="circleId" value={circleId} />

          {error && (
            <p className="text-[10px] text-red-500 bg-red-50 rounded px-2 py-1">
              {error}
            </p>
          )}

          <div>
            <label className="mb-0.5 block">残高</label>
            <input
              name="amount"
              type="number"
              step="1"
              required
              className="w-full rounded border border-gray-300 px-1.5 py-0.5"
            />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="mb-0.5 block">日付</label>
              <input
                name="date"
                type="date"
                defaultValue={defaultDate}
                className="w-full rounded border border-gray-300 px-1.5 py-0.5"
              />
            </div>
          </div>

          <div>
            <label className="mb-0.5 block">メモ</label>
            <textarea
              name="note"
              rows={2}
              className="w-full rounded border border-gray-300 px-1.5 py-0.5"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(false);
              }}
              className="px-2 py-0.5 rounded border border-gray-300"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-2 py-0.5 rounded border border-gray-900 bg-gray-900 text-white disabled:opacity-60"
            >
              {isPending ? "保存中…" : "保存"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
