import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "https://development.exon.dev",
});

// Export individual methods for convenience
export const { signIn, signOut, useSession } = authClient; 