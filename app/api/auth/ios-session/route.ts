import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Called by AppDelegate after receiving click.crun.circlerun://auth?token=xxx URL scheme.
// Validates signed JWT, sets session cookie in WKWebView, redirects to /dashboard.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect("https://crun.click/");
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(decodeURIComponent(token), secret);
    const sessionToken = payload.st as string;
    if (!sessionToken) {
      return NextResponse.redirect("https://crun.click/");
    }

    const response = NextResponse.redirect("https://crun.click/dashboard");
    // NextAuth v5 uses "authjs.session-token" / "__Secure-authjs.session-token"
    response.cookies.set("authjs.session-token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    response.cookies.set("__Secure-authjs.session-token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch {
    return NextResponse.redirect("https://crun.click/");
  }
}
