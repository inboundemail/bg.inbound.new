import Link from "next/link";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    redirect("/signin");
  }

  const slackUserId = session?.user.id;
  const slackAccessToken = await auth.api.getAccessToken({
    body: {
      userId: slackUserId,
      providerId: "slack",
    },
  })

  console.log("🔑 Slack Token: ", slackAccessToken);
  // That slack access tokens will contain slackAccessToken.accessToken & .idToken & scopes

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center space-y-8 p-8">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl">
            welcome to
            <img src="/cursor.jpeg" alt="Cursor Logo" className="inline h-12 w-12 ml-3 mr-2 rounded-md" />
            clack
          </h1>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            A secure Slack integration built with Better Auth and Next.js
          </p>
          <div className="flex justify-center">
            <Link href="/signin">
              <Button size="lg" className="flex items-center gap-2">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z" />
                </svg>
                Sign in with Slack
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-6xl mb-4 flex items-center justify-center">
            welcome to
            <img src="/cursor.jpeg" alt="Cursor Logo" className="inline h-12 w-12 ml-3 mr-2 rounded-md" />
            clack
          </h1>
          <p className="text-lg text-gray-600">
            Connected as {session.user.email}
          </p>

          <Link href="/signout">
            <Button
              variant="outline"
              className="mt-4"
            >
              Sign Out
            </Button>
          </Link>

        </div>


      </div>
    </div>
  );
}
