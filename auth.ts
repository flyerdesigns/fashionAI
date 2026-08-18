import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import type { Provider } from "next-auth/providers";
import bcrypt from "bcryptjs";
import { authConfig } from "./auth.config";
import { userRepository } from "@/lib/users/repository";
import { createCreditAccountForUser } from "@/lib/credits";
import { isPostgresEnabled } from "@/lib/db/config";
import { resolveRoleForEmail } from "@/lib/admin/config";
import { isGoogleAuthEnabled } from "@/lib/auth/config";
import { isUserAccountActive } from "@/lib/auth/account-status";

const providers: Provider[] = [
  Credentials({
    name: "Email and Password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" },
    },
    async authorize(credentials) {
      const email = credentials?.email;
      const password = credentials?.password;

      if (typeof email !== "string" || typeof password !== "string") {
        return null;
      }

      const user = await userRepository.findByEmail(email);
      if (!user?.passwordHash) {
        return null;
      }

      if (!isUserAccountActive(user)) {
        return null;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        return null;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        role: user.role,
        status: user.status,
      };
    },
  }),
];

if (isGoogleAuthEnabled()) {
  providers.unshift(
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers,
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user?.id) {
        token.id = user.id;
      }
      if (token.id) {
        const record = await userRepository.findById(token.id as string);
        token.role = record?.role ?? (token.role as string) ?? "user";
        token.status = record?.status ?? (token.status as string) ?? "active";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        session.user.role = (token.role as string) ?? "user";
        session.user.status = (token.status as string) ?? "active";
      }
      return session;
    },
    async signIn({ user, account }) {
      if (!user.email) return false;

      const existing = await userRepository.findByEmail(user.email);

      if (existing && !isUserAccountActive(existing)) {
        return false;
      }

      if (account?.provider === "google") {
        if (existing) {
          if (existing.image !== user.image || existing.name !== user.name) {
            await userRepository.update(existing.id, {
              name: user.name ?? existing.name,
              image: user.image ?? existing.image,
            });
          }
          user.id = existing.id;
          return true;
        }

        const created = await userRepository.create({
          name: user.name ?? user.email.split("@")[0],
          email: user.email,
          image: user.image ?? null,
          provider: "google",
          role: resolveRoleForEmail(user.email),
        });
        user.id = created.id;
        if (isPostgresEnabled()) {
          await createCreditAccountForUser(created.id);
        }
        return true;
      }

      return !!existing;
    },
  },
});
