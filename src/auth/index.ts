import type { UserRole } from "@prisma/client";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { env } from "@/env";
import { prisma } from "@/server/prisma";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

type AuthUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
};

const authSetup = NextAuth({
  secret: env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      name: "Anmeldung",
      credentials: {
        email: { label: "E-Mail", type: "email", placeholder: "name@firma.de" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash || !user.isActive) {
          return null;
        }

        const passwordValid = await bcrypt.compare(password, user.passwordHash);
        if (!passwordValid) {
          return null;
        }

        const authUser: AuthUser = {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };

        return authUser;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const authUser = user as AuthUser;
        token.sub = authUser.id;
        token.role = authUser.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = (token.sub ?? token.id ?? "") as string;
        session.user.role = token.role as UserRole;
      }
      return session;
    },
  },
});


export const { auth, signIn, signOut } = authSetup;
export const GET = authSetup.handlers.GET;
export const POST = authSetup.handlers.POST;

