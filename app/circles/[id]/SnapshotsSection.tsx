"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { addBalanceSnapshot } from "@/app/actions"; // サーバーアクション例
import { CircleBalanceSnapshot } from "@/lib/struct";

export default function SnapshotsSection({
  circleId,
  snapshots,
}: {
  circleId: string;
  snapshots: CircleBalanceSnapshot;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="pt-2">
      {!showForm && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="w-full rounded-xl border border-dashed border-slate-600 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800/60"
        >
          ＋ 残高を追加する
        </button>
      )}

      {showForm && (
        <div className="mt-3 rounded-xl border border-slate-700 bg-slate-900/70 p-3">
          <AddBalanceForm
            circleId={circleId}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}
    </div>
  );
}

function AddBalanceForm({
  circleId,
  onCancel,
}: {
  circleId: string;
  onCancel: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  return (
    <form action={addBalanceSnapshot} className="space-y-3">
      <input type="hidden" name="circleId" value={circleId} />

      <div>
        <label className="mb-1 block text-xs text-slate-400">残高</label>
        <input
          name="amount"
          type="number"
          inputMode="numeric"
          className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-sky-500"
          placeholder="例: 30000"
          required
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">日付</label>
        <input
          name="date"
          type="date"
          defaultValue={today}
          className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        />
      </div>

      <div>
        <label className="mb-1 block text-xs text-slate-400">メモ</label>
        <input
          name="memo"
          type="text"
          className="w-full rounded-lg bg-slate-950 px-3 py-2 text-sm outline-none ring-1 ring-slate-700 focus:ring-sky-500"
        />
      </div>

      <div className="flex gap-2 pt-1">
        <SubmitButton />
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-600 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800/60"
        >
          キャンセル
        </button>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 rounded-lg bg-sky-500 px-3 py-2 text-xs font-semibold text-slate-950 disabled:opacity-60"
    >
      {pending ? "保存中…" : "この内容で登録"}
    </button>
  );
}
