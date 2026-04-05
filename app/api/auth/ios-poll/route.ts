import { NextRequest, NextResponse } from "next/server";
import { consumePollToken } from "@/lib/iosTokenStore";

// Polled by WKWebView every 2s after opening SFSafariVC.
// Returns {token} when OAuth completes, or {pending:true} while waiting.
export async function GET(req: NextRequest) {
  const pollId = req.nextUrl.searchParams.get("pollId");
  if (!pollId) return NextResponse.json({ error: "missing pollId" }, { status: 400 });

  const token = consumePollToken(pollId);
  if (!token) return NextResponse.json({ pending: true });

  return NextResponse.json({ token });
}
