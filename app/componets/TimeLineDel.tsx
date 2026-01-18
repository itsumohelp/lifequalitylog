import { delBalanceSnapshot } from "../actions";
import { TimelineEvent } from "./DetailSnapshot";

export default function DeleteBtn({ row }: { row: TimelineEvent }) {
  const snapshotId = row.kind == "snapshot" ? row.snapshotId : null;
  return (
    <button
      type="button"
      onClick={async () => {
        if (!confirm("この履歴を削除しますか？（元に戻せません）")) return;
        if (!snapshotId) return;
        const form = document.createElement("form");
        const snapshotIdInput = document.createElement("input");
        snapshotIdInput.type = "hidden";
        snapshotIdInput.name = "snapshotId";
        snapshotIdInput.value = snapshotId.toString();
        form.appendChild(snapshotIdInput);
        const formData = new FormData(form);
        await delBalanceSnapshot(formData);
      }}
      className="
      absolute
      top-[-5px]
      right-[-5px]
    rounded-md
    text-slate-400
    hover:text-red-400
    hover:bg-slate-800
    transition
  "
      aria-label="削除"
      title="削除"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="w-4 h-4"
      >
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
      </svg>
    </button>
  );
}
