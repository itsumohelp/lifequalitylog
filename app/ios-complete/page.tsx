import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { SignJWT } from "jose";

export default async function IOSCompletePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/");

  const cookieStore = await cookies();
  const pollId = cookieStore.get("ios-poll-id")?.value;

  if (pollId) {
    const dbSession = await prisma.session.findFirst({
      where: { userId: session.user.id },
      orderBy: { expires: "desc" },
    });

    if (dbSession) {
      const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
      const token = await new SignJWT({ st: dbSession.sessionToken })
        .setProtectedHeader({ alg: "HS256" })
        .setExpirationTime("5m")
        .sign(secret);

      await prisma.iosAuthToken.upsert({
        where: { pollId },
        update: { token, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
        create: { pollId, token, expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      });
    }
  }

  return (
    <main style={{ fontFamily: "-apple-system, sans-serif", display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", margin: 0, background: "#f8fafc" }}>
      <p style={{ color: "#64748b", fontSize: "15px" }}>ログイン完了。アプリに戻っています...</p>
      {/* カスタムURLスキームにリダイレクトしてSafariブラウザを閉じる */}
      <script dangerouslySetInnerHTML={{ __html: `setTimeout(function(){ window.location.href = "click.crun.circlerun://auth-complete"; }, 300);` }} />
    </main>
  );
}
