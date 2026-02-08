// auth.config.ts
import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

export const authConfig: NextAuthConfig = {
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      profile(profile) {
        return {
          id: profile.sub,
          name: null,
          email: null,
          image: profile.picture,
        };
      },
    }),
  ],
  session: {
    // DBセッション使いたいので database を指定
    strategy: "database",
  },
  callbacks: {
    async session({ session, user }) {
      if (session.user) {
        (session.user as any).id = user.id;
        // displayName をセッションに載せる（ヘッダー等で利用）
        (session.user as any).displayName = (user as any).displayName || null;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
