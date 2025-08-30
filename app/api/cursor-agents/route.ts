import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { emailAgent, user } from '@/lib/schema'
import { eq } from 'drizzle-orm'

// GET - Get active Cursor agents for the current user
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the user's default API key and email agents
    const [userResult, agents] = await Promise.all([
      db.select({ defaultCursorApiKey: user.defaultCursorApiKey })
        .from(user)
        .where(eq(user.id, session.user.id)),
      db.select()
        .from(emailAgent)
        .where(eq(emailAgent.userId, session.user.id))
    ]);

    // Try to get active agents from Cursor API using available API keys
    const userDefaultKey = userResult[0]?.defaultCursorApiKey;
    const agentApiKey = agents.find(agent => agent.cursorApiKey)?.cursorApiKey;
    const apiKey = agentApiKey || userDefaultKey;
    
    if (!apiKey) {
      return NextResponse.json({ activeAgents: [] });
    }

    console.log('apiKey', apiKey);

    const response = await fetch('https://api.cursor.com/v0/agents?limit=100', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cursor API error:', response.status, errorText);
      
      // Try to parse error for more details
      try {
        const errorJson = JSON.parse(errorText);
        console.error('Cursor API error details:', errorJson);
      } catch (e) {
        console.error('Raw error response:', errorText);
      }
      
      return NextResponse.json({ activeAgents: [] });
    }

    const data = await response.json();
    
    // Filter only running agents - check for different status formats
    const activeAgents = data.agents?.filter((agent: any) => 
      agent.status === 'RUNNING' || 
      agent.status === 'CREATING' || 
      agent.status === 'IN_PROGRESS'
    ) || [];

    return NextResponse.json({ activeAgents });
  } catch (error) {
    console.error('Error fetching cursor agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}