import { signIn } from "@/auth";
import { NextResponse } from "next/server";

// Opens Google OAuth in SFSafariViewController.
// After success, NextAuth redirects to /ios-auth-complete which closes the browser via URL scheme.
export async function GET() {
  try {
    await signIn("google", { redirectTo: "/ios-auth-complete" });
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) throw error;
    return NextResponse.json({ error: "Sign-in failed" }, { status: 500 });
  }
}
