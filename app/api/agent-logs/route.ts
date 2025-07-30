import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { agentLaunchLog, emailAgent } from '@/lib/schema'
import { eq, desc } from 'drizzle-orm'
import { auth } from '@/lib/auth'

// GET - Get agent launch logs for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');

    const logs = await db
      .select({
        id: agentLaunchLog.id,
        emailAgentId: agentLaunchLog.emailAgentId,
        senderEmail: agentLaunchLog.senderEmail,
        emailSubject: agentLaunchLog.emailSubject,
        cursorAgentId: agentLaunchLog.cursorAgentId,
        status: agentLaunchLog.status,
        errorMessage: agentLaunchLog.errorMessage,
        createdAt: agentLaunchLog.createdAt,
        agentName: emailAgent.name,
      })
      .from(agentLaunchLog)
      .leftJoin(emailAgent, eq(agentLaunchLog.emailAgentId, emailAgent.id))
      .where(eq(agentLaunchLog.userId, session.user.id))
      .orderBy(desc(agentLaunchLog.createdAt))
      .limit(limit);

    return NextResponse.json({ logs });
  } catch (error) {
    console.error('Error fetching agent logs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}