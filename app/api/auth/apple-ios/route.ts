import { NextRequest, NextResponse } from "next/server";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { SignJWT } from "jose";
import prisma from "@/lib/prisma";

const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

export async function POST(req: NextRequest) {
  const { identityToken, firstName, lastName } = await req.json();
  if (!identityToken) {
    return NextResponse.json(
      { error: "missing identityToken" },
      { status: 400 },
    );
  }

  let appleUserId: string;
  let email: string | undefined;

  try {
    const { payload } = await jwtVerify(identityToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience: "click.crun.circlerun",
    });
    appleUserId = payload.sub as string;
    email = payload.email as string | undefined;
  } catch {
    return NextResponse.json(
      { error: "invalid identity token" },
      { status: 401 },
    );
  }

  // 既存のAppleアカウントを検索
  const existingAccount = await prisma.account.findFirst({
    where: { provider: "apple", providerAccountId: appleUserId },
  });

  let userId: string;

  if (existingAccount) {
    userId = existingAccount.userId;
  } else {
    // 初回ログイン — emailが必要
    if (!email) {
      return NextResponse.json(
        { error: "email required on first sign-in" },
        { status: 400 },
      );
    }

    // 同メールのユーザーが既存であればリンク、なければ新規作成
    let user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      const fullName = [firstName, lastName].filter(Boolean).join(" ") || null;
      user = await prisma.user.create({
        data: { email, name: fullName, emailVerified: new Date() },
      });
    }

    await prisma.account.create({
      data: {
        userId: user.id,
        type: "oauth",
        provider: "apple",
        providerAccountId: appleUserId,
      },
    });

    userId = user.id;
  }

  // NextAuthセッションを作成
  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await prisma.session.create({
    data: { sessionToken, userId, expires },
  });

  // 短命JWTを返す（ios-sessionエンドポイントで消費）
  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ st: sessionToken })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  return NextResponse.json({ token });
}
