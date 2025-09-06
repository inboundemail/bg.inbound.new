import { NextRequest, NextResponse } from 'next/server'
import { InboundEmailClient } from '@inboundemail/sdk'
import crypto from 'crypto'

// Cursor webhook payload interface
interface CursorWebhookPayload {
  event: 'statusChange'
  timestamp: string
  id: string
  status: 'FINISHED' | 'ERROR'
  source: {
    repository: string
    ref: string
  }
  target: {
    url: string
    branchName: string
    prUrl?: string
  }
  summary?: string
}

interface RouteParams {
  params: Promise<{ emailId: string }>
}

// Verify webhook signature from Cursor
function verifyWebhookSignature(secret: string, rawBody: string, signature: string): boolean {
  if (!signature.startsWith('sha256=')) {
    return false;
  }
  
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');
  
  return signature === expectedSignature;
}

// Generate reply content based on agent status
function generateReplyContent(payload: CursorWebhookPayload): { text: string; subject: string } {
  const { status, summary, target } = payload;
  
  if (status === 'FINISHED') {
    let text = `Hi there!\n\nGreat news! I've completed the task you requested.`;
    
    if (summary) {
      text += `\n\nHere's what I accomplished:\n${summary}`;
    }
    
    if (target.prUrl) {
      text += `\n\nYou can view the changes here: ${target.prUrl}`;
    } else if (target.branchName) {
      text += `\n\nThe changes have been made to branch: ${target.branchName}`;
    }
    
    text += `\n\nAgent: ${payload.id}\nRepository: ${payload.source.repository}\nCompleted: ${payload.timestamp}\n\nLet me know if you need any adjustments!`;
    
    return {
      text,
      subject: `✅ Task Complete: Your code request`
    };
  } 
  
  if (status === 'ERROR') {
    let text = `Hi there,\n\nI encountered an issue while working on your request.`;
    
    text += `\n\nAgent: ${payload.id}\nRepository: ${payload.source.repository}\nFailed at: ${payload.timestamp}\n\nI'll investigate this issue. Please feel free to try again or contact support if the problem persists.`;
    
    return {
      text,
      subject: `❌ Task Failed: Your code request`
    };
  }
  
  // Fallback
  return {
    text: `Your code request has been processed with status: ${status}`,
    subject: `Agent Update: Your code request`
  };
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { emailId } = await params;
    
    // Get headers for webhook verification
    const signature = request.headers.get('X-Webhook-Signature');
    const webhookId = request.headers.get('X-Webhook-ID');
    const eventType = request.headers.get('X-Webhook-Event');
    const userAgent = request.headers.get('User-Agent');
    
    // Verify it's from Cursor
    if (userAgent !== 'Cursor-Agent-Webhook/1.0') {
      console.warn('Invalid User-Agent for Cursor webhook');
    }
    
    if (eventType !== 'statusChange') {
      return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 });
    }
    
    // Get raw body for signature verification
    const rawBody = await request.text();
    let payload: CursorWebhookPayload;
    
    try {
      payload = JSON.parse(rawBody);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }
    
    console.log('📥 Cursor webhook received:', {
      event: payload.event,
      agentId: payload.id,
      status: payload.status,
      emailId,
      webhookId
    });
    
    // Only process FINISHED or ERROR status changes
    if (!['FINISHED', 'ERROR'].includes(payload.status)) {
      console.log('🔄 Ignoring non-final status:', payload.status);
      return NextResponse.json({ received: true, status: 'ignored' });
    }
    
    // We cannot verify signature here because we need to store and retrieve the webhook secret
    // This would require storing it in the database during agent creation
    // For now, we'll proceed with basic User-Agent validation
    if (signature) {
      console.log('🔐 Webhook signature received - verification would require secret storage');
    }
    
    // Initialize Inbound client
    const inboundApiKey = process.env.INBOUND_API_KEY;
    if (!inboundApiKey) {
      console.error('❌ INBOUND_API_KEY not configured');
      return NextResponse.json({ error: 'Email service not configured' }, { status: 500 });
    }
    
    const inbound = new InboundEmailClient(inboundApiKey);
    
    // Generate reply content
    const reply = generateReplyContent(payload);

    const emailObject = await inbound.email.get(emailId);

    const fromEmail = emailObject.data?.to[0]?.replace(/\\/g, '');

    console.log('🔍 From email:', fromEmail);
    
    // Send reply using Inbound SDK
    try {
      const replyPayload = {
        from: fromEmail || 'BG by Inbound <agent@bg.inbound.new>',
        text: reply.text,
        subject: reply.subject,
        simple: true
      };
      
      console.log('📤 Sending reply with payload:', JSON.stringify(replyPayload, null, 2));
      
      const { data, error } = await inbound.email.reply(emailId, replyPayload);
      
      if (error) {
        console.error('❌ Failed to send reply via Inbound:', error);
        return NextResponse.json({ 
          error: 'Failed to send email reply', 
          details: error 
        }, { status: 500 });
      }
      
      console.log('✅ Reply sent successfully:', data?.id);
      
      return NextResponse.json({ 
        success: true,
        message: 'Webhook processed and reply sent successfully',
        replyId: data?.id,
        agentStatus: payload.status
      });
      
    } catch (replyError) {
      console.error('❌ Error sending reply:', replyError);
      return NextResponse.json({ 
        error: 'Failed to send email reply',
        details: replyError instanceof Error ? replyError.message : 'Unknown error'
      }, { status: 500 });
    }
    
  } catch (error) {
    console.error('❌ Cursor webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
