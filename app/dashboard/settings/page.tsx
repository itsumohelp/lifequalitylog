"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";

type User = {
  id: string;
  name: string | null;
  displayName: string | null;
  email: string | null;
  image: string | null;
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setDisplayName(data.user.displayName || data.user.name || "");
        }
      } catch (error) {
        console.error("Failed to fetch user:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  const handleSaveDisplayName = async () => {
    if (!displayName.trim()) {
      setMessage({ type: "error", text: "表示名を入力してください" });
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: displayName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setMessage({ type: "success", text: "表示名を更新しました" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "削除する") {
      setMessage({ type: "error", text: "「削除する」と入力してください" });
      return;
    }

    setIsDeleting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/user", {
        method: "DELETE",
      });

      if (res.ok) {
        // ログアウトしてトップページへ
        await signOut({ callbackUrl: "/" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "削除に失敗しました" });
        setIsDeleting(false);
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-white flex items-center justify-center">
        <div className="text-slate-500">読み込み中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-white">
      <div className="mx-auto max-w-md px-4 py-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← 戻る
          </Link>
          <h1 className="text-lg font-semibold text-slate-900">設定</h1>
          <div className="w-12" />
        </div>

        {/* メッセージ */}
        {message && (
          <div
            className={`mb-4 px-4 py-2 rounded-lg text-sm ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {/* ユーザー情報 */}
        {user && (
          <div className="space-y-6">
            {/* プロフィール画像 */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-slate-200 overflow-hidden">
                {user.image ? (
                  <Image
                    src={user.image}
                    alt={user.displayName || user.name || "User"}
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 flex items-center justify-center text-2xl text-slate-500">
                    {(user.displayName || user.name || "?").slice(0, 1)}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-slate-500">メールアドレス</div>
                <div className="text-slate-900">{user.email}</div>
              </div>
            </div>

            {/* 表示名設定 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h2 className="text-sm font-medium text-slate-700 mb-3">表示名</h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    Googleアカウント名
                  </label>
                  <div className="text-sm text-slate-700 bg-white px-3 py-2 rounded-lg border border-slate-200">
                    {user.name || "（未設定）"}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    表示名（他のユーザーに表示される名前）
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={50}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
                    placeholder="表示名を入力"
                  />
                </div>
                <button
                  onClick={handleSaveDisplayName}
                  disabled={isSaving}
                  className="w-full bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isSaving ? "保存中..." : "表示名を保存"}
                </button>
              </div>
            </div>

            {/* アカウント削除 */}
            <div className="bg-red-50 rounded-xl p-4">
              <h2 className="text-sm font-medium text-red-700 mb-2">
                アカウントを削除
              </h2>
              <p className="text-xs text-red-600 mb-3">
                アカウントを削除すると、すべてのデータが完全に削除され、復元できません。
                あなたが唯一の管理者であるサークルも削除されます。
              </p>

              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium"
                >
                  アカウントを削除する
                </button>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-red-600 block mb-1">
                      確認のため「削除する」と入力してください
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full bg-white border border-red-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-red-400"
                      placeholder="削除する"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setShowDeleteConfirm(false);
                        setDeleteConfirmText("");
                      }}
                      className="flex-1 bg-slate-200 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
                    >
                      キャンセル
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={isDeleting || deleteConfirmText !== "削除する"}
                      className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {isDeleting ? "削除中..." : "削除を実行"}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ログアウト */}
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
            >
              ログアウト
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
