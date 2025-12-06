// app/circles/new/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import Link from "next/link";

export default async function NewCirclePage() {
  const session = await auth();
  if (!session || !session.user?.id) {
    redirect("/");
  }

  const userId = session.user.id as string;

  // サーバーアクション
  async function createCircle(formData: FormData) {
    "use server";

    const name = (formData.get("name") as string)?.trim();
    const description = (formData.get("description") as string)?.trim() || "";
    const walletName = (formData.get("walletName") as string)?.trim() || "";
    const currency = ((formData.get("currency") as string) || "JPY").trim();

    if (!name) {
      // TODO: エラー表示をちゃんとやるならフラッシュメッセージなど
      return;
    }

    // Circle を作成しつつ、作成者を ADMIN として参加させる
    const circle = await prisma.circle.create({
      data: {
        name,
        description: description || null,
        walletName: walletName || null,
        currency,
        members: {
          create: {
            userId,
            role: "ADMIN",
          },
        },
      },
    });

    // 一覧やダッシュボードを再取得させたい場合
    revalidatePath("/dashboard");
    revalidatePath("/circles");

    // ひとまずダッシュボードへ。あとで /circles/[id] を作ったらそちらに変更でOK
    redirect("/dashboard");
    // redirect(`/circles/${circle.id}`); に差し替え予定
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <div className="mx-auto max-w-md px-4 pt-4 pb-10">
        {/* ヘッダー */}
        <header className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <Link href="/dashboard" className="text-xs text-sky-300">
              ← ダッシュボード
            </Link>
            <h1 className="text-sm font-semibold text-sky-100">
              サークルを作成
            </h1>
            <span className="w-12" />
          </div>
          <p className="text-[11px] text-slate-400">
            家族・友人・サークルなど、お金を一緒に管理したいグループ用の
            「サークルウォレット」を作成します。
          </p>
        </header>

        {/* フォーム */}
        <form action={createCircle} className="space-y-4">
          {/* サークル名 */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              サークル名
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              placeholder="例: 山田家 / ゼミ旅行2025 / フットサル部"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              メンバー全員に表示される名前です。あとから変更もできます。
            </p>
          </div>

          {/* 説明 */}
          <div>
            <label
              htmlFor="description"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              サークルの説明（任意）
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              placeholder="例: 家族の生活費と貯金をみんなで見える化するためのサークルです。"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none resize-none placeholder:text-slate-500"
            />
          </div>

          {/* ウォレット名 */}
          <div>
            <label
              htmlFor="walletName"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              ウォレット名（任意）
            </label>
            <input
              id="walletName"
              name="walletName"
              type="text"
              placeholder="例: 家族共通口座 / 旅行積立口座"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500"
            />
            <p className="mt-1 text-[10px] text-slate-500">
              このサークルで管理するお金の「口座名」のようなものです。
            </p>
          </div>

          {/* 通貨（今は固定でもOK） */}
          <div>
            <label
              htmlFor="currency"
              className="block text-xs font-medium text-slate-200 mb-1"
            >
              通貨
            </label>
            <select
              id="currency"
              name="currency"
              defaultValue="JPY"
              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 text-sm text-slate-50 outline-none"
            >
              <option value="JPY">日本円（JPY）</option>
              {/* 将来多通貨対応するならここに追加 */}
            </select>
            <p className="mt-1 text-[10px] text-slate-500">
              現時点では日本円を前提にしています。
            </p>
          </div>

          {/* 作成ボタン */}
          <div className="pt-2">
            <button
              type="submit"
              className="w-full rounded-2xl bg-sky-500 text-white text-sm font-semibold py-3 active:scale-[0.99] transition-transform disabled:opacity-60"
            >
              このサークルを作成する
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
