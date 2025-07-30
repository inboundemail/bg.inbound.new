import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailAgent, user } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { auth } from '@/lib/auth'
import { createEmailAgent, deleteEmailAgent, updateEmailAgentStatus } from '@/lib/inbound-email'

// GET - List all email agents for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const agents = await db
      .select({
        id: emailAgent.id,
        name: emailAgent.name,
        githubRepository: emailAgent.githubRepository,
        githubRef: emailAgent.githubRef,
        model: emailAgent.model,
        autoCreatePr: emailAgent.autoCreatePr,
        isActive: emailAgent.isActive,
        emailAddress: emailAgent.emailAddress,
        allowedDomains: emailAgent.allowedDomains,
        allowedEmails: emailAgent.allowedEmails,
        createdAt: emailAgent.createdAt,
        updatedAt: emailAgent.updatedAt,
      })
      .from(emailAgent)
      .where(eq(emailAgent.userId, session.user.id));

    return NextResponse.json({ agents });
  } catch (error) {
    console.error('Error fetching email agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new email agent
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, githubRepository, githubRef, cursorApiKey, model, autoCreatePr, allowedDomains, allowedEmails } = body;

    // Get user's default Cursor API key if none provided
    let finalCursorApiKey = cursorApiKey;
    if (!finalCursorApiKey) {
      const userData = await db
        .select({ defaultCursorApiKey: user.defaultCursorApiKey })
        .from(user)
        .where(eq(user.id, session.user.id))
        .limit(1);
      
      if (userData.length > 0 && userData[0].defaultCursorApiKey) {
        finalCursorApiKey = userData[0].defaultCursorApiKey;
      }
    }

    // Validate required fields
    if (!name || !githubRepository) {
      return NextResponse.json(
        { error: 'Missing required fields: name, githubRepository' },
        { status: 400 }
      );
    }

    // Validate we have a Cursor API key (either provided or from account default)
    if (!finalCursorApiKey) {
      return NextResponse.json(
        { error: 'Cursor API key is required. Please provide one or set a default in your account settings.' },
        { status: 400 }
      );
    }

    // Validate name format (will be used in email)
    const namePattern = /^[a-zA-Z0-9-_]+$/;
    if (!namePattern.test(name)) {
      return NextResponse.json(
        { error: 'Name can only contain letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    // Validate GitHub repository URL format
    const githubUrlPattern = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
    if (!githubUrlPattern.test(githubRepository)) {
      return NextResponse.json(
        { error: 'Invalid GitHub repository URL format' },
        { status: 400 }
      );
    }

    // Create agent ID first
    const agentId = nanoid();
    
    // Create the InboundEmail endpoint and email address
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || request.nextUrl.origin;
    const webhookUrl = `${baseUrl}/api/inbound/receive/${agentId}`;
    
    let emailAgentResult;
    try {
      emailAgentResult = await createEmailAgent({
        name,
        webhookUrl,
        agentId
      });
    } catch (error) {
      return NextResponse.json(
        { error: `Failed to create email address: ${error instanceof Error ? error.message : 'Unknown error'}` },
        { status: 500 }
      );
    }

    // Store in database
    const newAgent = await db
      .insert(emailAgent)
      .values({
        id: agentId,
        userId: session.user.id,
        name,
        githubRepository,
        githubRef: githubRef || 'main',
        cursorApiKey: finalCursorApiKey,
        model: model || 'claude-4-sonnet-thinking',
        autoCreatePr: autoCreatePr || false,
        isActive: true,
        allowedDomains: allowedDomains ? JSON.stringify(allowedDomains) : null,
        allowedEmails: allowedEmails ? JSON.stringify(allowedEmails) : null,
        inboundEndpointId: emailAgentResult.endpointId,
        inboundEmailAddressId: emailAgentResult.emailAddressId,
        emailAddress: emailAgentResult.emailAddress,
      })
      .returning();

    return NextResponse.json({ 
      success: true, 
      agent: {
        ...newAgent[0],
        cursorApiKey: undefined // Don't return the API key in response
      }
    });
  } catch (error) {
    console.error('Error creating email agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}