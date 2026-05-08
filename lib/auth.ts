import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { appConfig, isGoogleAuthConfigured } from "@/lib/env";
import { getDb } from "@/lib/mongodb";
import { verifyPassword } from "@/lib/password";

const providers: NextAuthOptions["providers"] = [
  CredentialsProvider({
    name: "Email and password",
    credentials: {
      email: { label: "Email", type: "email" },
      password: { label: "Password", type: "password" }
    },
    async authorize(credentials) {
      const email = credentials?.email?.toLowerCase().trim();
      const password = credentials?.password;

      if (!email || !password) {
        return null;
      }

      const db = await getDb();
      const user = await db.collection("users").findOne({
        email
      });

      if (!user?.passwordHash) {
        return null;
      }

      const passwordMatches = await verifyPassword(password, user.passwordHash);

      if (!passwordMatches) {
        return null;
      }

      return {
        id: String(user._id),
        email: user.email,
        name: user.name ?? user.email
      };
    }
  })
];

if (isGoogleAuthConfigured()) {
  providers.unshift(
    GoogleProvider({
      clientId: appConfig.googleClientId as string,
      clientSecret: appConfig.googleClientSecret as string
    })
  );
}

export const authOptions: NextAuthOptions = {
  providers,
  session: {
    strategy: "jwt"
  },
  secret: appConfig.nextAuthSecret,
  pages: {
    signIn: "/login"
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user?.email) {
        const db = await getDb();
        const now = new Date();
        const email = user.email.toLowerCase();

        await db.collection("users").createIndex({ email: 1 }, { unique: true });
        await db.collection("users").updateOne(
          { email },
          {
            $set: {
              email,
              name: user.name ?? email,
              image: user.image ?? null,
              updatedAt: now
            },
            $setOnInsert: {
              createdAt: now,
              emailVerified: null,
              passwordHash: null
            }
          },
          { upsert: true }
        );

        const storedUser = await db.collection("users").findOne({ email }, { projection: { _id: 1 } });

        if (storedUser?._id) {
          token.sub = String(storedUser._id);
        }
      } else if (user?.id) {
        token.sub = user.id;
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
      }

      return session;
    }
  }
};
