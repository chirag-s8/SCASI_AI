import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import AzureADProvider from "next-auth/providers/azure-ad";
import { resolveEmailVerified } from "@/lib/resolveEmailVerified";

async function refreshGoogleAccessToken(token) {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Google token refresh failed:", data);
      return { ...token, error: "RefreshAccessTokenError" };
    }

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + data.expires_in * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
    };
  } catch (error) {
    console.error("Error refreshing Google access token:", error);
    return { ...token, error: "RefreshAccessTokenError" };
  }
}


/** @type {import('next-auth').NextAuthOptions} */
export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",

          scope:
            "openid email profile " +
            "https://www.googleapis.com/auth/gmail.readonly " +
            "https://www.googleapis.com/auth/gmail.send " +
            "https://www.googleapis.com/auth/calendar.events",
        },
      },
    }),

    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET,
      tenantId: process.env.AZURE_AD_TENANT_ID,
    }),
  ],

  callbacks: {
    async signIn({ user }) {
      if (user?.email) {
        try {
          const { ensureUserExists } = await import("@/lib/supabase");
          const userId = await ensureUserExists({ user });
          // Also ensure via RAG repository client (belt-and-suspenders)
          const { ensureUser } = await import("@/src/agents/rag/repository");
          await ensureUser(userId, user.email, user.name, user.image);
        } catch (err) {
          console.error("[NextAuth] Auto-provision user failed:", err?.message ?? err);
        }
      }
      return true;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/api/auth")) return baseUrl;
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },

    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
        token.accessTokenExpires = account.expires_at
          ? account.expires_at * 1000
          : Date.now() + 3600 * 1000;
        token.provider = account.provider;
        // Store email_verified from OAuth provider claims.
        // Provider-specific verification logic is centralized in resolveEmailVerified()
        // to avoid fragile inline checks scattered across the codebase.
        token.emailVerified = resolveEmailVerified(account.provider, profile);
        return token;
      }

      if (token.provider === "google" && Date.now() >= token.accessTokenExpires) {
        console.log("Google access token expired, refreshing...");
        return refreshGoogleAccessToken(token);
      }

      return token;
    },

    async session({ session, token }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      session.provider = token.provider;
      session.error = token.error;
      session.emailVerified = token.emailVerified ?? false;

      return session;
    },
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };