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
      // user.id を session.user に載せたい場合
      if (session.user) {
        (session.user as any).id = user.id;
      }
      return session;
    },
  },
  secret: process.env.AUTH_SECRET,
};
