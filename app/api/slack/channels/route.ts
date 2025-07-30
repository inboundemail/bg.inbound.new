import { auth } from "@/lib/auth";
import { createSlackClient } from "@/lib/slack-api";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { slackConnection } from "@/lib/schema";
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

    // Get optional team ID from query params to get channels for a specific workspace
    const { searchParams } = new URL(request.url);
    const teamId = searchParams.get("teamId");

    // Query the slackConnection table to get the Slack access token
    const whereCondition = teamId 
      ? and(
          eq(slackConnection.userId, session.user.id),
          eq(slackConnection.slackTeamId, teamId)
        )
      : eq(slackConnection.userId, session.user.id);

    const slackConnections = await db
      .select()
      .from(slackConnection)
      .where(whereCondition)
      .limit(1);

    if (!slackConnections.length || !slackConnections[0].accessToken) {
      console.error("No Slack connection found for user:", session.user.id);
      return NextResponse.json({ 
        error: teamId 
          ? "No Slack connection found for specified workspace" 
          : "No Slack connections found. Please connect a Slack workspace first." 
      }, { status: 404 });
    }

    // Create Slack client with the actual access token
    const slack = createSlackClient(slackConnections[0].accessToken);
    const channels = await slack.listChannels();

    console.log(`Successfully fetched ${channels.length} channels for user ${session.user.email} from workspace ${slackConnections[0].slackTeamName || slackConnections[0].slackTeamId}`);

    // Filter and format the channels
    const formattedChannels = channels.map(channel => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.is_private,
      isMember: channel.is_member,
      memberCount: channel.num_members || 0,
      isArchived: channel.is_archived,
    }));

    return NextResponse.json({ 
      channels: formattedChannels,
      workspace: {
        id: slackConnections[0].slackTeamId,
        name: slackConnections[0].slackTeamName,
      }
    });
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