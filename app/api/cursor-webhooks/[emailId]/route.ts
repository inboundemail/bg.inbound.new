import { NextRequest, NextResponse } from 'next/server'
import { InboundEmailClient, PostEmailReplyRequest } from '@inboundemail/sdk'
import { db } from '@/lib/db'
import { emailAgent, cursorAgentMapping } from '@/lib/schema'
import { eq } from 'drizzle-orm'
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
  // Check if signature has the correct format
  if (!signature || !signature.startsWith('sha256=')) {
    console.warn('❌ Invalid signature format:', signature);
    return false;
  }

  // Remove the 'sha256=' prefix to get just the hex digest
  const providedSignature = signature.slice(7);

  // Compute the expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(providedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.warn('❌ Error comparing signatures:', error);
    return false;
  }
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

    console.log('🔍 Cursor webhook received:', {
      emailId,
      webhookId,
      eventType,
      userAgent,
      hasSignature: !!signature,
      signaturePrefix: signature?.substring(0, 20) + '...' // Log first part of signature for debugging
    });

    // Verify required headers
    if (!userAgent || userAgent !== 'Cursor-Agent-Webhook/1.0') {
      console.warn('❌ Invalid or missing User-Agent for Cursor webhook');
      return NextResponse.json({ error: 'Invalid User-Agent' }, { status: 401 });
    }

    if (!eventType || eventType !== 'statusChange') {
      console.warn('❌ Unsupported event type:', eventType);
      return NextResponse.json({ error: 'Unsupported event type' }, { status: 400 });
    }

    // Get raw body for signature verification (must be done before any other body operations)
    const rawBody = await request.text();

    // Parse JSON payload from raw body
    let payload: CursorWebhookPayload;
    try {
      payload = JSON.parse(rawBody);
      console.log('📄 Parsed JSON payload:', payload);
    } catch (error) {
      console.error('❌ Invalid JSON payload:', error);
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    // Validate required payload structure according to Cursor documentation
    if (!payload.event || !payload.id || !payload.status || !payload.timestamp) {
      console.error('❌ Missing required payload fields:', {
        hasEvent: !!payload.event,
        hasId: !!payload.id,
        hasStatus: !!payload.status,
        hasTimestamp: !!payload.timestamp
      });
      return NextResponse.json({ error: 'Invalid payload structure' }, { status: 400 });
    }

    // Validate event type
    if (payload.event !== 'statusChange') {
      console.error('❌ Invalid event type:', payload.event);
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 });
    }

    // Validate status values
    if (!['FINISHED', 'ERROR'].includes(payload.status)) {
      console.error('❌ Invalid status value:', payload.status);
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Validate status
    if (!['FINISHED', 'ERROR'].includes(payload.status)) {
      console.log('🔄 Ignoring non-final status:', payload.status);
      return NextResponse.json({ received: true, status: 'ignored' });
    }

    console.log('📥 Cursor webhook payload:', {
      event: payload.event,
      agentId: payload.id,
      status: payload.status,
      timestamp: payload.timestamp,
      repository: payload.source?.repository,
      branchName: payload.target?.branchName
    });

    // Look up the email information using the cursorAgentId from the payload
    const mappingResult = await db
      .select({
        originalEmailId: cursorAgentMapping.originalEmailId,
        emailAddress: cursorAgentMapping.emailAddress,
        webhookSecret: cursorAgentMapping.webhookSecret,
        emailAgentId: cursorAgentMapping.emailAgentId
      })
      .from(cursorAgentMapping)
      .where(eq(cursorAgentMapping.cursorAgentId, payload.id))
      .limit(1);

    if (mappingResult.length === 0) {
      console.error('❌ No mapping found for cursorAgentId:', payload.id);
      return NextResponse.json({ error: 'Agent not found' }, { status: 404 });
    }

    const mapping = mappingResult[0];
    const originalEmailId = mapping.originalEmailId;
    const emailAddress = mapping.emailAddress;
    const webhookSecret = mapping.webhookSecret;

    console.log('🔍 Found mapping:', {
      cursorAgentId: payload.id,
      originalEmailId,
      emailAddress,
      hasWebhookSecret: !!webhookSecret
    });

    // Verify webhook signature using stored secret
    if (signature) {
      try {
        if (webhookSecret) {
          const isValidSignature = verifyWebhookSignature(webhookSecret, rawBody, signature);

          if (!isValidSignature) {
            console.error('❌ Invalid webhook signature');
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
          }

          console.log('✅ Webhook signature verified successfully');
        } else {
          console.warn('⚠️ No webhook secret found in mapping for cursorAgentId:', payload.id);
          console.warn('⚠️ This webhook will be rejected in future versions - please recreate the email agent to generate a new webhook secret');
          // For now, allow webhooks without stored secrets to maintain backward compatibility
          // In a future version, this should return an error
        }
      } catch (error) {
        console.error('❌ Error verifying webhook signature:', error);
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 500 });
      }
    } else {
      console.warn('⚠️ No signature provided in webhook request');
      console.warn('⚠️ This webhook will be rejected in future versions - please recreate the email agent to generate a new webhook secret');
      // For now, allow webhooks without signatures to maintain backward compatibility
      // In a future version, this should return an error
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

    // Use the email address from the database mapping
    const fromEmail = emailAddress;

    console.log('🔍 From email:', fromEmail);

    // Send reply using Inbound SDK
    try {
      const replyPayload = {
        from: "Inbound <" + fromEmail + ">" || 'Agent <agent@bg.inbound.new>',
        text: reply.text,
        subject: reply.subject
      };

      console.log('📤 Sending reply to', originalEmailId, 'with payload:', JSON.stringify(replyPayload, null, 2));

      const { data, error } = await inbound.email.sent.reply(originalEmailId, replyPayload as PostEmailReplyRequest);
      
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
