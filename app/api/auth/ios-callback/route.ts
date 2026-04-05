import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { SignJWT } from "jose";
import { storePollToken } from "@/lib/iosTokenStore";

// Called by NextAuth as callbackUrl after Google OAuth completes in SFSafariVC.
// Signs a JWT and stores it keyed by pollId so WKWebView can poll for it.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const pollId = url.searchParams.get("pollId");

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect("https://crun.click/");
  }

  const dbSession = await prisma.session.findFirst({
    where: { userId: session.user.id },
    orderBy: { expires: "desc" },
  });

  if (!dbSession) {
    return NextResponse.redirect("https://crun.click/");
  }

  const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
  const token = await new SignJWT({ st: dbSession.sessionToken })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("5m")
    .sign(secret);

  if (pollId) {
    storePollToken(pollId, token);
  }

  // Show a completion page — WKWebView polling will detect the token and close SFSafariVC
  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f8fafc"><p style="color:#64748b;font-size:15px">ログイン完了。アプリに戻っています...</p></body></html>`,
    { headers: { "Content-Type": "text/html" } }
  );
}
