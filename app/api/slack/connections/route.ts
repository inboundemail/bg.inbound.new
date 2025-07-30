import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slackConnection } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

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

    // Get user's Slack connections
    const connections = await db
      .select({
        id: slackConnection.id,
        slackTeamId: slackConnection.slackTeamId,
        slackUserId: slackConnection.slackUserId,
        slackTeamName: slackConnection.slackTeamName,
        slackUserName: slackConnection.slackUserName,
        tokenType: slackConnection.tokenType,
        scope: slackConnection.scope,
        selectedChannelId: slackConnection.selectedChannelId,
        selectedChannelName: slackConnection.selectedChannelName,
        webhookId: slackConnection.webhookId,
        webhookUrl: slackConnection.webhookUrl,
        webhookActive: slackConnection.webhookActive,
        createdAt: slackConnection.createdAt,
        updatedAt: slackConnection.updatedAt,
      })
      .from(slackConnection)
      .where(eq(slackConnection.userId, session.user.id));

    return NextResponse.json({ connections });

  } catch (error) {
    console.error("Get Slack connections error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
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

    const { connectionId, channelId, channelName } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    // Update the selected channel for the connection (only if it belongs to the user)
    const result = await db
      .update(slackConnection)
      .set({
        selectedChannelId: channelId || null,
        selectedChannelName: channelName || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(slackConnection.id, connectionId),
          eq(slackConnection.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Update Slack connection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const connectionId = searchParams.get("id");

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    // Delete the connection (only if it belongs to the user)
    const result = await db
      .delete(slackConnection)
      .where(
        and(
          eq(slackConnection.id, connectionId),
          eq(slackConnection.userId, session.user.id)
        )
      );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete Slack connection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 