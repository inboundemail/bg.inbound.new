import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slackConnection } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      return NextResponse.redirect(
        new URL(`/dashboard?error=${encodeURIComponent(error)}`, request.url)
      );
    }

    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/dashboard?error=missing_parameters", request.url)
      );
    }

    // Decode and validate state
    let stateData;
    try {
      stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    } catch {
      return NextResponse.redirect(
        new URL("/dashboard?error=invalid_state", request.url)
      );
    }

    const { userId, timestamp } = stateData;
    
    // Check if state is not too old (15 minutes)
    if (Date.now() - timestamp > 15 * 60 * 1000) {
      return NextResponse.redirect(
        new URL("/dashboard?error=state_expired", request.url)
      );
    }

    // Exchange code for access token
    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID!,
        client_secret: process.env.SLACK_CLIENT_SECRET!,
        code,
        redirect_uri: `${process.env.BETTER_AUTH_URL || "https://development.exon.dev"}/api/slack/callback`,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenData.ok) {
      console.error("Slack OAuth token exchange error:", tokenData);
      return NextResponse.redirect(
        new URL(`/dashboard?error=${encodeURIComponent(tokenData.error || "token_exchange_failed")}`, request.url)
      );
    }

    // For user OAuth, the access token is in authed_user.access_token
    const userAccessToken = tokenData.authed_user?.access_token || tokenData.access_token;
    
    // Get team and user info
    const teamInfoResponse = await fetch("https://slack.com/api/team.info", {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });
    const teamInfo = await teamInfoResponse.json();

    const userInfoResponse = await fetch("https://slack.com/api/users.identity", {
      headers: {
        Authorization: `Bearer ${userAccessToken}`,
      },
    });
    const userInfo = await userInfoResponse.json();

    // Store or update the Slack connection
    const existingConnection = await db
      .select()
      .from(slackConnection)
      .where(
        and(
          eq(slackConnection.userId, userId),
          eq(slackConnection.slackTeamId, tokenData.team.id)
        )
      )
      .limit(1);

    const connectionData = {
      userId,
      slackTeamId: tokenData.team.id,
      slackUserId: tokenData.authed_user.id,
      slackTeamName: teamInfo.ok ? teamInfo.team.name : null,
      slackUserName: userInfo.ok ? userInfo.user.name : null,
      accessToken: userAccessToken,
      refreshToken: tokenData.refresh_token || null,
      tokenType: "user",
      scope: tokenData.authed_user?.scope || tokenData.scope,
      expiresAt: null, // Slack user tokens don't expire
      updatedAt: new Date(),
    };

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(slackConnection)
        .set(connectionData)
        .where(eq(slackConnection.id, existingConnection[0].id));
    } else {
      // Create new connection
      await db.insert(slackConnection).values({
        id: nanoid(),
        createdAt: new Date(),
        ...connectionData,
      });
    }

    return NextResponse.redirect(
      new URL("/dashboard?slack_connected=true", request.url)
    );

  } catch (error) {
    console.error("Slack OAuth callback error:", error);
    return NextResponse.redirect(
      new URL("/dashboard?error=callback_failed", request.url)
    );
  }
} 