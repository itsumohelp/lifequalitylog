import { NextResponse } from "next/server";
import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { randomBytes } from "crypto";
import { storeIosToken } from "@/lib/iosTokenStore";

// Called by NextAuth as callbackUrl after Google OAuth completes in SFSafariVC.
// Creates a one-time token, then redirects to URL scheme to close SFSafariVC.
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

  // Redirect to URL scheme — SFSafariVC cannot handle it, iOS closes it and calls AppDelegate
  return NextResponse.redirect(`click.crun.circlerun://auth?token=${iosToken}`);
}
