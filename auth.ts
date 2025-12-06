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
});
