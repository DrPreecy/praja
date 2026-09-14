import { getServerSession, type NextAuthOptions } from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { DomainError } from "../domain/model";
import { localMode } from "./store";
export const authOptions: NextAuthOptions = {
  providers: [
    GithubProvider({
      clientId: process.env.GITHUB_ID ?? "",
      clientSecret: process.env.GITHUB_SECRET ?? "",
      authorization: { params: { scope: "read:user user:email" } },
    }),
  ],
  session: { strategy: "jwt" },
  callbacks: {
    async jwt({ token, account }) {
      if (account) token.actor = `github:${account.providerAccountId}`;
      return token;
    },
    async session({ session, token }) {
      (session as unknown as { actor: string }).actor = String(
        token.actor ?? "",
      );
      return session;
    },
  },
};
export async function actor(request: Request) {
  if (localMode()) {
    const host = new URL(request.url).hostname;
    if (!["localhost", "127.0.0.1", "[::1]"].includes(host))
      throw new DomainError(
        "Local development is restricted to loopback.",
        403,
      );
    return "local:developer";
  }
  const session = await getServerSession(authOptions);
  const id = (session as unknown as { actor?: string } | null)?.actor;
  if (!id) throw new DomainError("Sign in to continue.", 401);
  return id;
}
