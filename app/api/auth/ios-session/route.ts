import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

// Called via fetch() from CapacitorLoginButton after OAuth completes.
// Sets session cookie via Set-Cookie header and returns JSON.
// WKWebView then navigates to /dashboard via window.location.replace (no history entry).
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "missing token" }, { status: 400 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
    const { payload } = await jwtVerify(decodeURIComponent(token), secret);
    const sessionToken = payload.st as string;
    if (!sessionToken) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set("__Secure-authjs.session-token", sessionToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30日
    });
    return response;
  } catch {
    return NextResponse.json({ error: "invalid token" }, { status: 400 });
  }
}
