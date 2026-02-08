/**
 * ユーザーIDから決定論的にアバターの背景色を生成する
 */

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // 32bit整数に変換
  }
  return Math.abs(hash);
}

/** ユーザーIDからHSL背景色を生成 */
export function getAvatarColor(userId: string): string {
  const hue = hashCode(userId) % 360;
  return `hsl(${hue}, 55%, 65%)`;
}

/** 名前の先頭1文字を取得（フォールバック付き） */
export function getAvatarInitial(name: string | null | undefined): string {
  return (name || "?").slice(0, 1);
}
