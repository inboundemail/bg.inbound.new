import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'
import { emailAgent, user, agentLaunchLog } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import crypto from 'crypto'

// Updated interface to match official API spec
interface CursorAgent {
  id: string;
  name: string;
  status: 'RUNNING' | 'FINISHED' | 'ERROR' | 'CREATING' | 'EXPIRED';
  source: {
    repository: string;
    ref: string;
  };
  target: {
    branchName: string;
    url: string;
    prUrl?: string;
    autoCreatePr: boolean;
  };
  summary?: string;
  createdAt: string;
}

// Webhook payload interface for agent completion notifications
interface AgentWebhookPayload {
  event: 'agent.completed' | 'agent.failed';
  agent: {
    id: string;
    name: string;
    status: CursorAgent['status'];
    summary?: string;
    createdAt: string;
    finishedAt: string;
    prUrl?: string;
    error?: string;
  };
  metadata: {
    emailAgentId?: string;
    originalEmailId?: string;
    senderEmail?: string;
    emailSubject?: string;
  };
}

// Interface for monitoring agent status changes
interface AgentStatusTracker {
  agentId: string;
  lastStatus: CursorAgent['status'];
  webhookUrl?: string;
  webhookSecret?: string;
  metadata?: {
    emailAgentId?: string;
    originalEmailId?: string;
    senderEmail?: string;
    emailSubject?: string;
  };
}

// Utility function to send webhook notifications with retry logic
async function sendWebhook(
  webhookUrl: string,
  payload: AgentWebhookPayload,
  secret?: string,
  maxRetries: number = 3
): Promise<boolean> {
  const backoffDelay = (attempt: number) => Math.min(1000 * Math.pow(2, attempt), 10000);
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'Cursor-Background-Agent/1.0',
        'X-Delivery-Attempt': (attempt + 1).toString(),
      };

      // Add signature if secret is provided
      if (secret) {
        const signature = crypto
          .createHmac('sha256', secret)
          .update(JSON.stringify(payload))
          .digest('hex');
        headers['X-Signature'] = `sha256=${signature}`;
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        // 15 second timeout
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        // Log error but don't throw for 4xx errors (client errors, likely permanent)
        if (response.status >= 400 && response.status < 500) {
          console.error(`Webhook failed with client error: ${response.status} ${response.statusText} - not retrying`);
          return false;
        }
        
        // Throw for 5xx errors to trigger retry
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      console.log(`Webhook sent successfully to: ${webhookUrl} (attempt ${attempt + 1})`);
      return true;
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries - 1;
      console.error(`Webhook attempt ${attempt + 1} failed:`, error);
      
      if (isLastAttempt) {
        console.error(`All ${maxRetries} webhook attempts failed for: ${webhookUrl}`);
        return false;
      }
      
      // Wait before retry with exponential backoff
      const delay = backoffDelay(attempt);
      console.log(`Retrying webhook in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  return false;
}

// Utility function to check agent status and send webhooks for completed agents
async function checkAndNotifyAgentCompletion(
  apiKey: string,
  trackedAgents: AgentStatusTracker[]
): Promise<void> {
  if (trackedAgents.length === 0) return;

  try {
    // Get current status of all tracked agents
    const agentIds = trackedAgents.map(t => t.agentId);
    const response = await fetch(`https://api.cursor.com/v0/agents?limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch agent status for webhook check');
      return;
    }

    const data = await response.json();
    const currentAgents: CursorAgent[] = data.agents || [];

    // Check each tracked agent for status changes
    for (const tracker of trackedAgents) {
      const currentAgent = currentAgents.find(a => a.id === tracker.agentId);
      
      if (!currentAgent) {
        // Agent not found - might be expired or deleted
        continue;
      }

      // Check if status changed from running to completed/failed
      if (
        (tracker.lastStatus === 'RUNNING' || tracker.lastStatus === 'CREATING') &&
        (currentAgent.status === 'FINISHED' || currentAgent.status === 'ERROR')
      ) {
        // Agent completed - send webhook
        if (tracker.webhookUrl) {
          const event = currentAgent.status === 'FINISHED' ? 'agent.completed' : 'agent.failed';
          const payload: AgentWebhookPayload = {
            event,
            agent: {
              id: currentAgent.id,
              name: currentAgent.name,
              status: currentAgent.status,
              summary: currentAgent.summary,
              createdAt: currentAgent.createdAt,
              finishedAt: new Date().toISOString(),
              prUrl: currentAgent.target.prUrl,
              error: currentAgent.status === 'ERROR' ? 'Agent execution failed' : undefined,
            },
            metadata: tracker.metadata || {},
          };

          await sendWebhook(tracker.webhookUrl, payload, tracker.webhookSecret);
        }

        // Update the agent launch log status
        if (tracker.metadata?.emailAgentId) {
          await db.update(agentLaunchLog)
            .set({ 
              status: currentAgent.status === 'FINISHED' ? 'success' : 'failed',
              errorMessage: currentAgent.status === 'ERROR' ? 'Agent execution failed' : undefined
            })
            .where(
              and(
                eq(agentLaunchLog.cursorAgentId, tracker.agentId),
                eq(agentLaunchLog.emailAgentId, tracker.metadata.emailAgentId)
              )
            );
        }
      }
    }
  } catch (error) {
    console.error('Error checking agent completion:', error);
  }
}

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

    console.log('apiKey length:', apiKey.length, 'starts with:', apiKey.substring(0, 10));

    // First validate the API key by checking /me endpoint
    try {
      console.log('Validating Cursor API key...');
      const meResponse = await fetch('https://api.cursor.com/v0/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!meResponse.ok) {
        const meErrorText = await meResponse.text();
        console.error('API key validation failed:', meResponse.status, meErrorText);
        
        if (meResponse.status === 401) {
          console.error('❌ Invalid or expired Cursor API key');
          return NextResponse.json({ 
            activeAgents: [], 
            error: 'Invalid or expired Cursor API key. Please update your API key in settings.' 
          });
        }
      } else {
        const meData = await meResponse.json();
        console.log('✅ API key validated successfully:', meData.apiKeyName);
      }
    } catch (validationError) {
      console.error('Error validating API key:', validationError);
    }

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
        
        if (response.status === 401) {
          console.error('❌ Authentication failed - API key may be invalid, expired, or lack permissions');
        }
      } catch (e) {
        console.error('Raw error response:', errorText);
      }
      
      return NextResponse.json({ 
        activeAgents: [], 
        error: response.status === 401 ? 'API key authentication failed' : 'Cursor API error'
      });
    }

    const data = await response.json();
    const allAgents: CursorAgent[] = data.agents || [];
    
    // Filter only running agents - updated to match official API status values
    const activeAgents = allAgents.filter((agent: any) => 
      agent.status === 'RUNNING' || 
      agent.status === 'CREATING'
    );

    // Check for webhook notifications on agents that might have completed
    // Get tracked agents from agent launch logs with webhook URLs
    const trackedAgents = await db
      .select({
        agentId: agentLaunchLog.cursorAgentId,
        emailAgentId: agentLaunchLog.emailAgentId,
        webhookUrl: emailAgent.webhookUrl,
        webhookSecret: emailAgent.webhookSecret,
        senderEmail: agentLaunchLog.senderEmail,
        emailSubject: agentLaunchLog.emailSubject,
      })
      .from(agentLaunchLog)
      .innerJoin(emailAgent, eq(agentLaunchLog.emailAgentId, emailAgent.id))
      .where(
        and(
          eq(agentLaunchLog.userId, session.user.id),
          eq(agentLaunchLog.status, 'success'), // Only check running agents
        )
      );

    // Build agent trackers for webhook notifications
    const agentTrackers: AgentStatusTracker[] = trackedAgents
      .filter(t => t.agentId && t.webhookUrl)
      .map(t => ({
        agentId: t.agentId!,
        lastStatus: 'RUNNING' as CursorAgent['status'], // Assume running since status is 'success'
        webhookUrl: t.webhookUrl!,
        webhookSecret: t.webhookSecret || undefined,
        metadata: {
          emailAgentId: t.emailAgentId,
          senderEmail: t.senderEmail,
          emailSubject: t.emailSubject || undefined,
        }
      }));

    // Check for completed agents and send webhooks
    if (agentTrackers.length > 0) {
      await checkAndNotifyAgentCompletion(apiKey, agentTrackers);
    }

    return NextResponse.json({ activeAgents });
  } catch (error) {
    console.error('Error fetching cursor agents:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Register webhook monitoring for an agent
export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      agentId, 
      webhookUrl, 
      webhookSecret, 
      emailAgentId, 
      originalEmailId,
      senderEmail,
      emailSubject 
    } = body;

    // Validate required fields
    if (!agentId) {
      return NextResponse.json({ error: 'Agent ID is required' }, { status: 400 });
    }

    if (!webhookUrl) {
      return NextResponse.json({ error: 'Webhook URL is required' }, { status: 400 });
    }

    // Validate webhook URL format
    try {
      new URL(webhookUrl);
    } catch {
      return NextResponse.json({ error: 'Invalid webhook URL format' }, { status: 400 });
    }

    // Get API key for the user
    const [userResult, agents] = await Promise.all([
      db.select({ defaultCursorApiKey: user.defaultCursorApiKey })
        .from(user)
        .where(eq(user.id, session.user.id)),
      db.select()
        .from(emailAgent)
        .where(eq(emailAgent.userId, session.user.id))
    ]);

    const userDefaultKey = userResult[0]?.defaultCursorApiKey;
    const agentApiKey = agents.find(agent => agent.cursorApiKey)?.cursorApiKey;
    const apiKey = agentApiKey || userDefaultKey;
    
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'No Cursor API key found. Please configure your API key in settings.' 
      }, { status: 400 });
    }

    // Verify the agent exists and belongs to the user
    const response = await fetch(`https://api.cursor.com/v0/agents?limit=100`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      return NextResponse.json({ 
        error: 'Failed to verify agent existence' 
      }, { status: 400 });
    }

    const data = await response.json();
    const agent = data.agents?.find((a: CursorAgent) => a.id === agentId);
    
    if (!agent) {
      return NextResponse.json({ 
        error: 'Agent not found or does not belong to your account' 
      }, { status: 404 });
    }

    // If emailAgentId is provided, update that agent's webhook settings
    if (emailAgentId) {
      const emailAgentResult = await db.select()
        .from(emailAgent)
        .where(
          and(
            eq(emailAgent.id, emailAgentId),
            eq(emailAgent.userId, session.user.id)
          )
        );

      if (emailAgentResult.length > 0) {
        await db.update(emailAgent)
          .set({ 
            webhookUrl,
            webhookSecret,
            updatedAt: new Date()
          })
          .where(eq(emailAgent.id, emailAgentId));
      }
    }

    // Create or update agent launch log entry for tracking
    const logId = crypto.randomUUID();
    const existingLog = emailAgentId ? await db.select()
      .from(agentLaunchLog)
      .where(
        and(
          eq(agentLaunchLog.cursorAgentId, agentId),
          eq(agentLaunchLog.userId, session.user.id)
        )
      ) : [];

    if (existingLog.length === 0) {
      await db.insert(agentLaunchLog).values({
        id: logId,
        emailAgentId: emailAgentId || '',
        userId: session.user.id,
        senderEmail: senderEmail || '',
        emailSubject: emailSubject || '',
        cursorAgentId: agentId,
        status: 'success', // Agent exists, so tracking is successful
        createdAt: new Date()
      });
    }

    // Start monitoring the agent immediately
    const tracker: AgentStatusTracker = {
      agentId,
      lastStatus: agent.status,
      webhookUrl,
      webhookSecret,
      metadata: {
        emailAgentId,
        originalEmailId,
        senderEmail,
        emailSubject
      }
    };

    // If agent is already completed, send webhook immediately
    if (agent.status === 'FINISHED' || agent.status === 'ERROR') {
      const event = agent.status === 'FINISHED' ? 'agent.completed' : 'agent.failed';
      const payload: AgentWebhookPayload = {
        event,
        agent: {
          id: agent.id,
          name: agent.name,
          status: agent.status,
          summary: agent.summary,
          createdAt: agent.createdAt,
          finishedAt: new Date().toISOString(),
          prUrl: agent.target.prUrl,
          error: agent.status === 'ERROR' ? 'Agent execution failed' : undefined,
        },
        metadata: tracker.metadata || {},
      };

      const webhookSent = await sendWebhook(webhookUrl, payload, webhookSecret);
      
      return NextResponse.json({ 
        success: true, 
        message: 'Agent already completed, webhook sent immediately',
        webhookSent,
        agent: {
          id: agent.id,
          status: agent.status,
          name: agent.name
        }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Webhook monitoring registered successfully',
      agent: {
        id: agent.id,
        status: agent.status,
        name: agent.name
      }
    });

  } catch (error) {
    console.error('Error registering webhook:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}