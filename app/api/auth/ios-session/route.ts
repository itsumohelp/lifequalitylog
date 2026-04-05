import { NextRequest, NextResponse } from "next/server";
import { consumeIosToken } from "@/lib/iosTokenStore";

// Called by AppDelegate after receiving click.crun.circlerun://auth?token=xxx URL scheme.
// Validates one-time token, sets session cookie in WKWebView, redirects to /dashboard.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.redirect("https://crun.click/");
  }

  const sessionToken = consumeIosToken(token);
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
}
