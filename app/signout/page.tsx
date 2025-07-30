"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { authClient, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SignOutPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignOut = async () => {
    setLoading(true);
    setError("");

    try {
      await authClient.signOut();
      router.push("/");
    } catch (err) {
      setError("Failed to sign out");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Sign out</CardTitle>
          <CardDescription className="text-center">
            Are you sure you want to sign out of your account?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            type="button"
            className="w-full"
            onClick={handleSignOut}
            disabled={loading}
            size="lg"
            variant="destructive"
          >
            {loading ? "Signing out..." : "Sign out"}
          </Button>
          <Button
            type="button"
            className="w-full"
            onClick={() => router.push("/")}
            disabled={loading}
            size="lg"
            variant="outline"
          >
            Cancel
          </Button>
          {error && (
            <p className="text-sm text-red-600 text-center">{error}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 