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

type Circle = {
  id: string;
  name: string;
  role: string;
  adminName: string;
};

type Member = {
  userId: string;
  role: string;
  name: string;
  image: string | null;
};

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [circles, setCircles] = useState<Circle[]>([]);
  const [displayName, setDisplayName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [selectedCircle, setSelectedCircle] = useState<Circle | null>(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [selectedAdminCircle, setSelectedAdminCircle] = useState<Circle | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [isRemovingMember, setIsRemovingMember] = useState<string | null>(null);
  const [isDeletingCircle, setIsDeletingCircle] = useState(false);
  const [isEditingCircleName, setIsEditingCircleName] = useState(false);
  const [editingCircleName, setEditingCircleName] = useState("");
  const [isSavingCircleName, setIsSavingCircleName] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await fetch("/api/user");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setCircles(data.circles || []);
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

  // ADMINサークルを選択したときにメンバー一覧を取得
  const handleSelectAdminCircle = async (circle: Circle) => {
    setSelectedAdminCircle(circle);
    setIsLoadingMembers(true);
    setMembers([]);

    try {
      const res = await fetch(`/api/circles/${circle.id}/members`);
      if (res.ok) {
        const data = await res.json();
        setMembers(data.members || []);
      } else {
        setMessage({ type: "error", text: "メンバー情報の取得に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsLoadingMembers(false);
    }
  };

  // メンバーをサークルから削除
  const handleRemoveMember = async (memberId: string) => {
    if (!selectedAdminCircle) return;

    setIsRemovingMember(memberId);
    setMessage(null);

    try {
      const res = await fetch(`/api/circles/${selectedAdminCircle.id}/members/${memberId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.userId !== memberId));
        setMessage({ type: "success", text: "メンバーを削除しました" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "削除に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsRemovingMember(null);
    }
  };

  // サークル名を更新
  const handleSaveCircleName = async () => {
    if (!selectedAdminCircle || !editingCircleName.trim()) {
      setMessage({ type: "error", text: "サークル名を入力してください" });
      return;
    }

    setIsSavingCircleName(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/circles/${selectedAdminCircle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editingCircleName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        // サークル一覧を更新
        setCircles((prev) =>
          prev.map((c) =>
            c.id === selectedAdminCircle.id
              ? { ...c, name: data.circle.name }
              : c
          )
        );
        // モーダル内のサークル情報も更新
        setSelectedAdminCircle((prev) =>
          prev ? { ...prev, name: data.circle.name } : null
        );
        setIsEditingCircleName(false);
        setMessage({ type: "success", text: "サークル名を更新しました" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsSavingCircleName(false);
    }
  };

  // サークルを削除
  const handleDeleteCircle = async () => {
    if (!selectedAdminCircle) return;

    setIsDeletingCircle(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/circles/${selectedAdminCircle.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setCircles((prev) => prev.filter((c) => c.id !== selectedAdminCircle.id));
        setSelectedAdminCircle(null);
        setMessage({ type: "success", text: "サークルを削除しました" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "削除に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsDeletingCircle(false);
    }
  };

  const handleLeaveCircle = async () => {
    if (!selectedCircle) return;

    setIsLeaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/circles/${selectedCircle.id}/leave`, {
        method: "DELETE",
      });

      if (res.ok) {
        // サークル一覧から削除
        setCircles((prev) => prev.filter((c) => c.id !== selectedCircle.id));
        setSelectedCircle(null);
        setMessage({ type: "success", text: "サークルから離脱しました" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "離脱に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsLeaving(false);
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

            {/* 所属サークル一覧 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h2 className="text-sm font-medium text-slate-700 mb-3">
                所属サークル（{circles.length}/5）
              </h2>
              {circles.length === 0 ? (
                <p className="text-sm text-slate-500">所属しているサークルはありません</p>
              ) : (
                <div className="space-y-2">
                  {circles.map((circle) => (
                    <button
                      key={circle.id}
                      type="button"
                      onClick={() => {
                        if (circle.role === "ADMIN") {
                          handleSelectAdminCircle(circle);
                        } else {
                          setSelectedCircle(circle);
                        }
                      }}
                      className="w-full bg-white rounded-lg px-3 py-2 border border-slate-200 text-left hover:bg-slate-50 active:bg-slate-100 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium text-slate-900">
                            {circle.name || "（名前なし）"}
                          </div>
                          <div className="text-xs text-slate-500">
                            管理者: {circle.adminName}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full ${
                            circle.role === "ADMIN"
                              ? "bg-sky-100 text-sky-700"
                              : circle.role === "EDITOR"
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {circle.role === "ADMIN"
                            ? "管理者"
                            : circle.role === "EDITOR"
                              ? "編集者"
                              : "閲覧者"}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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

        {/* サークル離脱モーダル（EDITOR/VIEWER用） */}
        {selectedCircle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-2">
                サークルから離脱
              </h3>
              <div className="mb-4">
                <div className="text-sm font-medium text-slate-700 mb-1">
                  {selectedCircle.name || "（名前なし）"}
                </div>
                <div className="text-xs text-slate-500">
                  管理者: {selectedCircle.adminName}
                </div>
              </div>
              <p className="text-xs text-slate-600 mb-4 bg-slate-50 rounded-lg p-3">
                このサークルから離脱しますか？
                <br />
                <span className="text-slate-500">
                  ※ あなたが登録した支出・収入・残高のデータはサークルに残ります
                </span>
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCircle(null)}
                  className="flex-1 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleLeaveCircle}
                  disabled={isLeaving}
                  className="flex-1 bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isLeaving ? "離脱中..." : "離脱する"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* サークル管理モーダル（ADMIN用） */}
        {selectedAdminCircle && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-4 max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                サークル管理
              </h3>
              <div className="mb-4">
                {isEditingCircleName ? (
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={editingCircleName}
                      onChange={(e) => setEditingCircleName(e.target.value)}
                      maxLength={50}
                      className="w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-500"
                      placeholder="サークル名を入力"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingCircleName(false);
                          setEditingCircleName("");
                        }}
                        className="flex-1 bg-slate-100 text-slate-700 rounded-lg px-3 py-1.5 text-xs font-medium"
                      >
                        キャンセル
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveCircleName}
                        disabled={isSavingCircleName || !editingCircleName.trim()}
                        className="flex-1 bg-slate-900 text-white rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        {isSavingCircleName ? "保存中..." : "保存"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-sm font-medium text-slate-700">
                      {selectedAdminCircle.name || "（名前なし）"}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCircleName(selectedAdminCircle.name || "");
                        setIsEditingCircleName(true);
                      }}
                      className="p-1 text-slate-400 hover:text-slate-600 transition"
                      title="サークル名を編集"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                        <path d="m15 5 4 4" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>

              {/* メンバー一覧 */}
              <div className="mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">
                  メンバー（{members.length}人）
                </h4>
                {isLoadingMembers ? (
                  <div className="text-sm text-slate-500 py-2">読み込み中...</div>
                ) : (
                  <div className="space-y-2">
                    {members.map((member) => (
                      <div
                        key={member.userId}
                        className="flex items-center gap-3 bg-slate-50 rounded-lg px-3 py-2"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden flex-shrink-0">
                          {member.image ? (
                            <Image
                              src={member.image}
                              alt={member.name}
                              width={32}
                              height={32}
                              className="w-8 h-8 object-cover"
                            />
                          ) : (
                            <div className="w-8 h-8 flex items-center justify-center text-sm text-slate-500">
                              {member.name.slice(0, 1)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-900 truncate">
                            {member.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {member.role === "ADMIN"
                              ? "管理者"
                              : member.role === "EDITOR"
                                ? "編集者"
                                : "閲覧者"}
                          </div>
                        </div>
                        {member.role !== "ADMIN" && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(member.userId)}
                            disabled={isRemovingMember === member.userId}
                            className="text-xs text-red-600 hover:text-red-700 disabled:opacity-50"
                          >
                            {isRemovingMember === member.userId ? "削除中..." : "削除"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* サークル削除 */}
              <div className="border-t border-slate-200 pt-4 mb-4">
                <h4 className="text-sm font-medium text-red-700 mb-2">
                  サークルを削除
                </h4>
                {members.length > 1 ? (
                  <p className="text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
                    他のメンバーがいるサークルは削除できません。
                    <br />
                    メンバーを削除してから、サークルを削除してください。
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-red-600 mb-3">
                      サークルを削除すると、すべてのデータが完全に削除され、復元できません。
                    </p>
                    <button
                      type="button"
                      onClick={handleDeleteCircle}
                      disabled={isDeletingCircle}
                      className="w-full bg-red-600 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                    >
                      {isDeletingCircle ? "削除中..." : "サークルを削除"}
                    </button>
                  </>
                )}
              </div>

              {/* 閉じるボタン */}
              <button
                type="button"
                onClick={() => {
                  setSelectedAdminCircle(null);
                  setMembers([]);
                  setIsEditingCircleName(false);
                  setEditingCircleName("");
                }}
                className="w-full bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
