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
  isPublic?: boolean;
  allowNewMembers?: boolean;
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
  const [isPublic, setIsPublic] = useState(false);
  const [isSavingPublic, setIsSavingPublic] = useState(false);
  const [allowNewMembers, setAllowNewMembers] = useState(true);
  const [isSavingAllowNewMembers, setIsSavingAllowNewMembers] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  // サークル追加モーダル用
  const [isCircleModalOpen, setIsCircleModalOpen] = useState(false);
  const [newCircleName, setNewCircleName] = useState("");
  const [isCreatingCircle, setIsCreatingCircle] = useState(false);

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

  // ADMINサークルを選択したときにメンバー一覧と公開設定を取得
  const handleSelectAdminCircle = async (circle: Circle) => {
    setSelectedAdminCircle(circle);
    setIsLoadingMembers(true);
    setMembers([]);
    setIsPublic(circle.isPublic || false);
    setAllowNewMembers(circle.allowNewMembers !== false); // undefined or true -> true

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

  // 公開設定を切り替え
  const handleTogglePublic = async () => {
    if (!selectedAdminCircle) return;

    setIsSavingPublic(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/circles/${selectedAdminCircle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic: !isPublic }),
      });

      if (res.ok) {
        const newIsPublic = !isPublic;
        setIsPublic(newIsPublic);
        // サークル一覧も更新
        setCircles((prev) =>
          prev.map((c) =>
            c.id === selectedAdminCircle.id
              ? { ...c, isPublic: newIsPublic }
              : c
          )
        );
        setMessage({
          type: "success",
          text: newIsPublic ? "フィードを公開しました" : "フィードを非公開にしました",
        });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "設定の更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsSavingPublic(false);
    }
  };

  // 招待リンク設定を切り替え
  const handleToggleAllowNewMembers = async () => {
    if (!selectedAdminCircle) return;

    setIsSavingAllowNewMembers(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/circles/${selectedAdminCircle.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ allowNewMembers: !allowNewMembers }),
      });

      if (res.ok) {
        const newAllowNewMembers = !allowNewMembers;
        setAllowNewMembers(newAllowNewMembers);
        // サークル一覧も更新
        setCircles((prev) =>
          prev.map((c) =>
            c.id === selectedAdminCircle.id
              ? { ...c, allowNewMembers: newAllowNewMembers }
              : c
          )
        );
        setMessage({
          type: "success",
          text: newAllowNewMembers
            ? "招待リンクを有効にしました"
            : "招待リンクを無効にしました",
        });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "設定の更新に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsSavingAllowNewMembers(false);
    }
  };

  // 公開URLをクリップボードにコピー
  const handleCopyUrl = () => {
    if (!selectedAdminCircle) return;
    const url = `${window.location.origin}/c/${selectedAdminCircle.id}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 招待URLをクリップボードにコピー
  const handleCopyInviteUrl = () => {
    if (!selectedAdminCircle) return;
    const url = `${window.location.origin}/join?circleId=${selectedAdminCircle.id}`;
    navigator.clipboard.writeText(url);
    setCopiedInvite(true);
    setTimeout(() => setCopiedInvite(false), 2000);
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

  // 新しいサークルを作成
  const handleCreateCircle = async () => {
    if (!newCircleName.trim() || isCreatingCircle) return;

    setIsCreatingCircle(true);
    setMessage(null);

    try {
      const res = await fetch("/api/circles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCircleName.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        // サークル一覧に追加
        setCircles((prev) => [
          ...prev,
          {
            id: data.circle.id,
            name: data.circle.name,
            role: "ADMIN",
            adminName: user?.displayName || user?.name || "自分",
            isPublic: false,
          },
        ]);
        setMessage({ type: "success", text: "サークルを作成しました" });
      } else {
        const data = await res.json();
        setMessage({ type: "error", text: data.error || "サークルの作成に失敗しました" });
      }
    } catch {
      setMessage({ type: "error", text: "通信エラーが発生しました" });
    } finally {
      setIsCreatingCircle(false);
      setIsCircleModalOpen(false);
      setNewCircleName("");
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
    <div className="flex-1 bg-white overflow-y-auto">
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
                <div className="text-slate-900 font-medium">{user.displayName || user.name || "未設定"}</div>
              </div>
            </div>

            {/* 表示名設定 */}
            <div className="bg-slate-50 rounded-xl p-4">
              <h2 className="text-sm font-medium text-slate-700 mb-3">表示名</h2>
              <div className="space-y-3">
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
              {/* サークル追加ボタン（5個未満の場合のみ表示） */}
              {circles.length < 5 && (
                <button
                  type="button"
                  onClick={() => setIsCircleModalOpen(true)}
                  className="w-full mt-3 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-800 active:bg-slate-700"
                >
                  サークルを追加
                </button>
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

              {/* 招待リンク設定 */}
              <div className="border-t border-slate-200 pt-4 mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">
                  招待リンクの設定
                </h4>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-3">
                  <div>
                    <div className="text-sm text-slate-700">新規メンバーの参加を許可</div>
                    <div className="text-xs text-slate-500">
                      OFFにすると招待リンクでの参加を停止できます
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleAllowNewMembers}
                    disabled={isSavingAllowNewMembers}
                    className={`relative w-12 h-7 rounded-full transition border flex-shrink-0 ${
                      allowNewMembers
                        ? "bg-emerald-500 border-emerald-600"
                        : "bg-slate-200 border-slate-300"
                    } ${isSavingAllowNewMembers ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                        allowNewMembers ? "left-6" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
                {allowNewMembers && (
                  <div className="mt-2 bg-slate-100 rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500 mb-1">招待URL</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-700 truncate flex-1 bg-white px-2 py-1 rounded">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/join?circleId=${selectedAdminCircle.id}`
                          : `/join?circleId=${selectedAdminCircle.id}`}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyInviteUrl}
                        className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap"
                      >
                        {copiedInvite ? "コピー済み" : "コピー"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* フィード公開設定 */}
              <div className="border-t border-slate-200 pt-4 mb-4">
                <h4 className="text-sm font-medium text-slate-700 mb-2">
                  フィードの公開設定
                </h4>
                <div className="flex items-center justify-between bg-white border border-slate-200 rounded-lg px-3 py-3">
                  <div>
                    <div className="text-sm text-slate-700">フィードを公開する</div>
                    <div className="text-xs text-slate-500">
                      URLを知っている人は誰でも閲覧可能
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleTogglePublic}
                    disabled={isSavingPublic}
                    className={`relative w-12 h-7 rounded-full transition border flex-shrink-0 ${
                      isPublic
                        ? "bg-emerald-500 border-emerald-600"
                        : "bg-slate-200 border-slate-300"
                    } ${isSavingPublic ? "opacity-50" : ""}`}
                  >
                    <span
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-all ${
                        isPublic ? "left-6" : "left-0.5"
                      }`}
                    />
                  </button>
                </div>
                {isPublic && (
                  <div className="mt-2 bg-slate-100 rounded-lg px-3 py-2">
                    <div className="text-xs text-slate-500 mb-1">公開URL</div>
                    <div className="flex items-center gap-2">
                      <code className="text-xs text-slate-700 truncate flex-1 bg-white px-2 py-1 rounded">
                        {typeof window !== "undefined"
                          ? `${window.location.origin}/c/${selectedAdminCircle.id}`
                          : `/c/${selectedAdminCircle.id}`}
                      </code>
                      <button
                        type="button"
                        onClick={handleCopyUrl}
                        className="text-xs text-slate-500 hover:text-slate-700 whitespace-nowrap"
                      >
                        {copied ? "コピー済み" : "コピー"}
                      </button>
                    </div>
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
                  setIsPublic(false);
                  setAllowNewMembers(true);
                  setCopied(false);
                  setCopiedInvite(false);
                }}
                className="w-full bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
              >
                閉じる
              </button>
            </div>
          </div>
        )}

        {/* お問い合わせ・リンク */}
        <div className="mt-6 border-t border-slate-200 pt-4">
          <h3 className="text-sm font-medium text-slate-700 mb-3">お問い合わせ</h3>
          <div className="space-y-2">
            <a
              href="https://docs.google.com/forms/d/e/1FAIpQLSfhB8vxhCqwYbtJf7tFUIxb5wHAZ1e-Gd-sRo7LtwLmF9Qznw/viewform?usp=header"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2.5 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              お問い合わせフォーム
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-slate-400"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
            <a
              href="https://discord.gg/3gcKp8ht"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg px-3 py-2.5 transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.095 2.157 2.42 0 1.333-.947 2.418-2.157 2.418z"/></svg>
              Discordコミュニティ
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-auto text-slate-400"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
            </a>
          </div>
          <div className="mt-3 flex justify-center flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-400">
            <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 underline">利用規約</a>
            <span>|</span>
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-600 underline">プライバシーポリシー</a>
            <span>|</span>
            <a href="/licenses" className="hover:text-slate-600 underline">ライセンス</a>
          </div>
          {/* バージョンID */}
          <div className="mt-2 text-center text-[10px] text-slate-300">
            v{process.env.NEXT_PUBLIC_BUILD_ID || "DEV"}
          </div>
        </div>

        {/* サークル追加モーダル */}
        {isCircleModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl w-full max-w-sm p-4">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">
                新しいサークルを作成
              </h3>
              <input
                type="text"
                value={newCircleName}
                onChange={(e) => setNewCircleName(e.target.value)}
                placeholder="サークル名を入力"
                className="w-full bg-slate-100 border border-slate-200 rounded-lg px-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400 mb-4"
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsCircleModalOpen(false);
                    setNewCircleName("");
                  }}
                  className="flex-1 bg-slate-100 text-slate-700 rounded-lg px-4 py-2 text-sm font-medium"
                >
                  キャンセル
                </button>
                <button
                  type="button"
                  onClick={handleCreateCircle}
                  disabled={!newCircleName.trim() || isCreatingCircle}
                  className="flex-1 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {isCreatingCircle ? "作成中..." : "作成"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
