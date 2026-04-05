import { signIn } from "@/auth";

export default function iOSSignInPage() {
  async function action() {
    "use server";
    await signIn("google", { redirectTo: "/dashboard" });
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center">
      <form action={action} id="ios-signin-form">
        <p className="text-slate-500 text-sm">Googleにリダイレクト中...</p>
      </form>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.getElementById("ios-signin-form").submit();`,
        }}
      />
    </main>
  );
}
