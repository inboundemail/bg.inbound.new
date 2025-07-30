import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { emailAgent } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { auth } from '@/lib/auth'
import { deleteEmailAgent, updateEmailAgentStatus } from '@/lib/inbound-email'

interface RouteParams {
  params: Promise<{ id: string }>
}

// PUT - Update an email agent
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { githubRepository, githubRef, cursorApiKey, model, autoCreatePr, isActive } = body;

    // Validate GitHub repository URL format if provided
    if (githubRepository) {
      const githubUrlPattern = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
      if (!githubUrlPattern.test(githubRepository)) {
        return NextResponse.json(
          { error: 'Invalid GitHub repository URL format' },
          { status: 400 }
        );
      }
    }

    // Get current agent to check if it exists and get InboundEmail IDs
    const currentAgent = await db
      .select()
      .from(emailAgent)
      .where(and(
        eq(emailAgent.id, id),
        eq(emailAgent.userId, session.user.id)
      ))
      .limit(1);

    if (currentAgent.length === 0) {
      return NextResponse.json(
        { error: 'Email agent not found' },
        { status: 404 }
      );
    }

    // If updating active status, sync with InboundEmail
    if (isActive !== undefined && isActive !== currentAgent[0].isActive) {
      try {
        if (currentAgent[0].inboundEmailAddressId) {
          await updateEmailAgentStatus(currentAgent[0].inboundEmailAddressId, isActive);
        }
      } catch (error) {
        console.error('Failed to update InboundEmail status:', error);
        // Continue with database update even if InboundEmail sync fails
      }
    }

    // Build update object only with provided fields
    const updateData: any = {
      updatedAt: new Date()
    };

    if (githubRepository !== undefined) updateData.githubRepository = githubRepository;
    if (githubRef !== undefined) updateData.githubRef = githubRef;
    if (cursorApiKey !== undefined) updateData.cursorApiKey = cursorApiKey;
    if (model !== undefined) updateData.model = model;
    if (autoCreatePr !== undefined) updateData.autoCreatePr = autoCreatePr;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedAgent = await db
      .update(emailAgent)
      .set(updateData)
      .where(and(
        eq(emailAgent.id, id),
        eq(emailAgent.userId, session.user.id)
      ))
      .returning();

    return NextResponse.json({ 
      success: true, 
      agent: {
        ...updatedAgent[0],
        cursorApiKey: undefined // Don't return the API key in response
      }
    });
  } catch (error) {
    console.error('Error updating email agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Delete an email agent
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the agent to delete to retrieve InboundEmail IDs
    const agentToDelete = await db
      .select()
      .from(emailAgent)
      .where(and(
        eq(emailAgent.id, id),
        eq(emailAgent.userId, session.user.id)
      ))
      .limit(1);

    if (agentToDelete.length === 0) {
      return NextResponse.json(
        { error: 'Email agent not found' },
        { status: 404 }
      );
    }

    const agent = agentToDelete[0];

    // Delete from InboundEmail first
    if (agent.inboundEndpointId || agent.inboundEmailAddressId) {
      try {
        await deleteEmailAgent(
          agent.inboundEndpointId || '',
          agent.inboundEmailAddressId || ''
        );
      } catch (error) {
        console.error('Failed to delete from InboundEmail:', error);
        // Continue with database deletion even if InboundEmail cleanup fails
      }
    }

    // Delete from our database
    await db
      .delete(emailAgent)
      .where(and(
        eq(emailAgent.id, id),
        eq(emailAgent.userId, session.user.id)
      ));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting email agent:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}