// auth.ts
import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import prisma from "@/lib/prisma"; // いつもの PrismaClient ラッパ
import { authConfig } from "./auth.config";

export const {
  handlers, // Route Handler用
  auth,     // Server Component / middleware 用
  signIn,
  signOut,
} = NextAuth({
  adapter: PrismaAdapter(prisma),
  ...authConfig,
  events: {
    // 新規ユーザー作成時にデフォルトサークルを自動作成
    async createUser({ user }) {
      if (user.id) {
        await prisma.circle.create({
          data: {
            name: "おはじめ",
            currency: "JPY",
            members: {
              create: {
                userId: user.id,
                role: "ADMIN",
              },
            },
          },
        });
      }
    },
  },
});
