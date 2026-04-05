import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";
import { storeIosToken } from "@/lib/iosTokenStore";

// Called by NextAuth as callbackUrl after Google OAuth completes in SFSafariVC.
// Returns HTML with JS redirect to URL scheme — server-side 302 redirects to custom
// schemes are not intercepted by SFSafariVC, but JS redirects are.
export async function GET() {
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

  const iosToken = randomBytes(32).toString("hex");
  storeIosToken(iosToken, dbSession.sessionToken);

  const scheme = `click.crun.circlerun://auth?token=${iosToken}`;

  // JS redirect triggers iOS URL scheme handling and closes SFSafariVC
  return new NextResponse(
    `<!DOCTYPE html><html><body><script>window.location.href="${scheme}";</script></body></html>`,
    {
      headers: { "Content-Type": "text/html" },
    }
  );
}
