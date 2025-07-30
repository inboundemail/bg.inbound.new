import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Build Slack OAuth URL
    const slackClientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${process.env.BETTER_AUTH_URL || "https://development.exon.dev"}/api/slack/callback`;
    
    const scopes = [
      "channels:read",
      "groups:read", 
      "im:read",
      "mpim:read",
      "chat:write",
      "users:read",
      "users:read.email",
      "team:read"
    ].join(",");

    const state = Buffer.from(JSON.stringify({ 
      userId: session.user.id,
      timestamp: Date.now()
    })).toString('base64');

    const authUrl = new URL("https://slack.com/oauth/v2/authorize");
    authUrl.searchParams.set("client_id", slackClientId!);
    authUrl.searchParams.set("user_scope", scopes);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("response_type", "code");

    return NextResponse.json({ 
      authUrl: authUrl.toString() 
    });

  } catch (error) {
    console.error("Slack OAuth initiation error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 