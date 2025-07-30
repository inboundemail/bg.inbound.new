import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  // If user is authenticated, redirect to dashboard
  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="text-center space-y-8 p-8">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
          welcome to
          <img src="/cursor.jpeg" alt="Cursor Logo" className="inline h-12 w-12 ml-3 mr-2 rounded-md" />
          clack
        </h1>
        <p className="text-lg text-gray-600 max-w-md mx-auto">
          A secure Slack integration with magic link authentication
        </p>
        <div className="flex flex-col space-y-4 max-w-sm mx-auto">
          <Link href="/signin">
            <Button size="lg" className="w-full">
              Sign In
            </Button>
          </Link>
          <p className="text-sm text-gray-500">
            Sign in with your email to connect Slack workspaces and manage channels
          </p>
        </div>
      </div>
    </div>
  );
}
