// components/InviteButton.tsx
"use client";

import { useState } from "react";

type InviteButtonProps = {
  circleId: string;
};

export default function InviteButton({ circleId }: InviteButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    try {
      const origin =
        typeof window !== "undefined"
          ? window.location.origin
          : "https://example.com";

      const url = `${origin}/join?circleId=${encodeURIComponent(circleId)}`;

      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error(e);
      alert("招待リンクのコピーに失敗しました。");
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-[11px] px-3 py-1 rounded-full border border-sky-500 text-sky-100 hover:bg-sky-700/30"
    >
      {copied ? "コピーしました" : "招待リンクをコピー"}
    </button>
  );
}
