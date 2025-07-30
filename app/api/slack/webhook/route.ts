import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { slackConnection } from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
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

    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    // Verify the connection belongs to the user
    const connection = await db
      .select()
      .from(slackConnection)
      .where(
        and(
          eq(slackConnection.id, connectionId),
          eq(slackConnection.userId, session.user.id)
        )
      )
      .limit(1);

    if (!connection.length) {
      return NextResponse.json(
        { error: "Connection not found" },
        { status: 404 }
      );
    }

    // Generate a new webhook UUID and URL
    const webhookId = randomUUID();
    const baseUrl = process.env.BETTER_AUTH_URL || "https://development.exon.dev";
    const webhookUrl = `${baseUrl}/api/inbound/receive?uuid=${webhookId}`;

    // Update the connection with webhook information
    await db
      .update(slackConnection)
      .set({
        webhookId,
        webhookUrl,
        webhookActive: true,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(slackConnection.id, connectionId),
          eq(slackConnection.userId, session.user.id)
        )
      );

    return NextResponse.json({ 
      success: true,
      webhookId,
      webhookUrl 
    });

  } catch (error) {
    console.error("Generate webhook error:", error);
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
    const connectionId = searchParams.get("connectionId");

    if (!connectionId) {
      return NextResponse.json(
        { error: "Connection ID is required" },
        { status: 400 }
      );
    }

    // Deactivate the webhook for the connection
    await db
      .update(slackConnection)
      .set({
        webhookId: null,
        webhookUrl: null,
        webhookActive: false,
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
    console.error("Delete webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}