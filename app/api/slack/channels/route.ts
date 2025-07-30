import { auth } from "@/lib/auth";
import { createSlackClient } from "@/lib/slack-api";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { account } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get the user's session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query the account table to get the Slack access token
    const slackAccount = await db
      .select()
      .from(account)
      .where(
        and(
          eq(account.userId, session.user.id),
          eq(account.providerId, "slack")
        )
      )
      .limit(1);

    if (!slackAccount.length || !slackAccount[0].accessToken) {
      console.error("No Slack account found for user:", session.user.id);
      return NextResponse.json({ error: "No Slack account found or access token missing" }, { status: 404 });
    }

    // Create Slack client with the actual access token
    const slack = createSlackClient(slackAccount[0].accessToken);
    const channels = await slack.listChannels();

    console.log(`Successfully fetched ${channels.length} channels for user ${session.user.email}`);

    // Filter and format the channels
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private,
      isMember: channel.is_member,
      memberCount: channel.num_members || 0,
      isArchived: channel.is_archived,
    }));

    return NextResponse.json({ channels: formattedChannels });
  } catch (error) {
    console.error("Error fetching channels:", error);
    
    // Provide more specific error information
    if (error instanceof Error) {
      if (error.message.includes('Slack API Error')) {
        return NextResponse.json(
          { error: `Slack API Error: ${error.message}` },
          { status: 502 }
        );
      }
    }
    
    return NextResponse.json(
      { error: "Failed to fetch channels" },
      { status: 500 }
    );
  }
} 