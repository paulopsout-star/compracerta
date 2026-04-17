import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { supabase } from "@/lib/db";
import type { UserRole } from "@/types";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      email: string;
      role: UserRole;
      dealershipId?: string | null;
      dealerStoreId?: string | null;
    };
  }
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Senha", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const { data: user, error } = await supabase
          .from("users")
          .select("*")
          .eq("email", credentials.email as string)
          .eq("active", true)
          .single();

        if (error || !user || !user.password_hash) return null;

        const isValid = await compare(
          credentials.password as string,
          user.password_hash
        );

        if (!isValid) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          dealershipId: user.dealership_id,
          dealerStoreId: user.dealer_store_id,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id!;
        token.role = (user as Record<string, unknown>).role as string;
        token.dealershipId = (user as Record<string, unknown>).dealershipId as string | null;
        token.dealerStoreId = (user as Record<string, unknown>).dealerStoreId as string | null;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.role = token.role as UserRole;
      session.user.dealershipId = token.dealershipId as string | null;
      session.user.dealerStoreId = token.dealerStoreId as string | null;
      return session;
    },
  },
});
