/**
 * Example: Webhook to Reply Integration
 * 
 * This example shows how to receive webhook notifications from the cursor-agents API
 * and automatically send replies using the Inbound Replies API.
 * 
 * Usage:
 * 1. Deploy this as a webhook endpoint (e.g., Express.js server, Next.js API route, etc.)
 * 2. Register your webhook URL with the cursor-agents API when starting agent monitoring
 * 3. When agents complete, this endpoint will receive notifications and can send replies
 */

import crypto from 'crypto';

// Webhook payload types (from cursor-agents API)
interface AgentWebhookPayload {
  event: 'agent.completed' | 'agent.failed';
  agent: {
    id: string;
    name: string;
    status: 'FINISHED' | 'ERROR' | 'RUNNING' | 'CREATING' | 'EXPIRED';
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

// Configuration
const INBOUND_API_KEY = process.env.INBOUND_API_KEY!;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET; // Optional for signature verification
const FROM_EMAIL = process.env.FROM_EMAIL || 'agent@yourdomain.com';

/**
 * Verify webhook signature for security
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) {
    return false;
  }
  
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
    
  const receivedSignature = signature.replace('sha256=', '');
  
  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(receivedSignature, 'hex')
  );
}

/**
 * Send reply using Inbound Replies API
 */
async function sendReply(originalEmailId: string, replyContent: string, subject?: string): Promise<boolean> {
  try {
    const response = await fetch(`https://inbound.new/api/v2/emails/${originalEmailId}/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INBOUND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        text: replyContent,
        subject: subject,
        includeOriginal: true
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Failed to send reply: ${response.status} ${errorText}`);
      return false;
    }

    const result = await response.json();
    console.log(`Reply sent successfully: ${result.id}`);
    return true;
  } catch (error) {
    console.error('Error sending reply:', error);
    return false;
  }
}

/**
 * Generate reply content based on agent result
 */
function generateReplyContent(payload: AgentWebhookPayload): { content: string; subject?: string } {
  const { agent, metadata } = payload;
  
  if (payload.event === 'agent.completed' && agent.status === 'FINISHED') {
    let content = `Hi there!\n\nGreat news! I've completed the task you requested.`;
    
    if (agent.summary) {
      content += `\n\nHere's what I accomplished:\n${agent.summary}`;
    }
    
    if (agent.prUrl) {
      content += `\n\nYou can view the changes here: ${agent.prUrl}`;
    }
    
    content += `\n\nAgent: ${agent.name}\nCompleted: ${agent.finishedAt}\n\nLet me know if you need any adjustments!`;
    
    return {
      content,
      subject: `✅ Task Complete: ${metadata.emailSubject || 'Your request'}`
    };
  } 
  
  if (payload.event === 'agent.failed' || agent.status === 'ERROR') {
    let content = `Hi there,\n\nI encountered an issue while working on your request.`;
    
    if (agent.error) {
      content += `\n\nError details: ${agent.error}`;
    }
    
    content += `\n\nAgent: ${agent.name}\nFailed at: ${agent.finishedAt}\n\nI'll investigate this issue. Please feel free to try again or contact support if the problem persists.`;
    
    return {
      content,
      subject: `❌ Task Failed: ${metadata.emailSubject || 'Your request'}`
    };
  }
  
  // Fallback
  return {
    content: `Your agent ${agent.name} has finished with status: ${agent.status}`,
    subject: `Agent Update: ${metadata.emailSubject || 'Your request'}`
  };
}

/**
 * Main webhook handler
 * This would be your API endpoint (e.g., POST /webhook/cursor-agents)
 */
export async function handleCursorAgentWebhook(
  body: string,
  headers: Record<string, string>
): Promise<{ success: boolean; message: string; status: number }> {
  try {
    // Verify signature if secret is configured
    if (WEBHOOK_SECRET && headers['x-signature']) {
      const isValid = verifyWebhookSignature(body, headers['x-signature'], WEBHOOK_SECRET);
      if (!isValid) {
        return { success: false, message: 'Invalid signature', status: 401 };
      }
    }
    
    // Parse webhook payload
    const payload: AgentWebhookPayload = JSON.parse(body);
    console.log('Received webhook:', payload.event, 'for agent:', payload.agent.id);
    
    // Only process completed or failed agents
    if (!['agent.completed', 'agent.failed'].includes(payload.event)) {
      return { success: true, message: 'Event ignored', status: 200 };
    }
    
    // Check if we have the original email ID to reply to
    if (!payload.metadata.originalEmailId) {
      console.warn('No original email ID in webhook payload - cannot send reply');
      return { success: true, message: 'No email to reply to', status: 200 };
    }
    
    // Generate reply content
    const reply = generateReplyContent(payload);
    
    // Send reply via Inbound API
    const replySuccess = await sendReply(
      payload.metadata.originalEmailId,
      reply.content,
      reply.subject
    );
    
    if (replySuccess) {
      return { 
        success: true, 
        message: 'Webhook processed and reply sent successfully', 
        status: 200 
      };
    } else {
      return { 
        success: false, 
        message: 'Failed to send reply', 
        status: 500 
      };
    }
    
  } catch (error) {
    console.error('Error processing webhook:', error);
    return { 
      success: false, 
      message: 'Internal server error', 
      status: 500 
    };
  }
}

/**
 * Example Express.js endpoint
 */
export function createExpressEndpoint() {
  return async (req: any, res: any) => {
    const body = JSON.stringify(req.body);
    const headers = req.headers;
    
    const result = await handleCursorAgentWebhook(body, headers);
    res.status(result.status).json({
      success: result.success,
      message: result.message
    });
  };
}

/**
 * Example Next.js API route
 */
export async function POST(request: Request) {
  const body = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  const result = await handleCursorAgentWebhook(body, headers);
  
  return new Response(JSON.stringify({
    success: result.success,
    message: result.message
  }), {
    status: result.status,
    headers: { 'Content-Type': 'application/json' }
  });
}

/**
 * Example usage for registering webhook with cursor-agents API
 */
export async function registerAgentWebhook(agentId: string, webhookUrl: string) {
  const response = await fetch('/api/cursor-agents', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_SESSION_TOKEN' // Your app's auth
    },
    body: JSON.stringify({
      agentId,
      webhookUrl,
      webhookSecret: WEBHOOK_SECRET,
      originalEmailId: 'email_123', // ID of the email that triggered the agent
      senderEmail: 'user@example.com',
      emailSubject: 'Please help with my project'
    })
  });
  
  return response.json();
}

/**
 * Complete flow example:
 * 
 * 1. User sends email to agent@yourdomain.com
 * 2. Your system creates a Cursor agent and calls registerAgentWebhook()
 * 3. Agent runs and completes/fails
 * 4. Webhook is sent to your endpoint (handleCursorAgentWebhook)
 * 5. Your endpoint generates appropriate reply content
 * 6. Reply is sent via Inbound API back to the original sender
 * 7. User receives email notification about agent completion
 */
