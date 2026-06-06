import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

async function requireAdmin() {
  const session = await auth();
  if (!session?.user?.email) return null;
  if (ADMIN_EMAIL && session.user.email !== ADMIN_EMAIL) return null;
  return session;
}

const VALID_JOBS = ["persona-post", "daily", "persona-generate"] as const;
type JobName = (typeof VALID_JOBS)[number];

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { job } = (await req.json()) as { job: JobName };
  if (!VALID_JOBS.includes(job)) {
    return NextResponse.json({ error: "Invalid job name" }, { status: 400 });
  }

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 500 });
  }

  // NEXTAUTH_URL をベースに内部呼び出し（同一プロセスへのループバック）
  const base = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const url = `${base}/api/cron/${job}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${cronSecret}` },
  });

  const data = await res.json();
  return NextResponse.json({ ok: res.ok, status: res.status, result: data });
}
