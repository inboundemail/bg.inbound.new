import { NextRequest, NextResponse } from 'next/server'
import { isInboundWebhook } from '@inboundemail/sdk'
import type { InboundWebhookPayload } from '@inboundemail/sdk'
import { db } from '@/lib/db'
import { emailAgent, user, agentLaunchLog } from '@/lib/schema'
import { eq, and } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { extractEmailAddress } from '@/lib/utils'

interface CursorAgentRequest {
  prompt: {
    text: string;
  };
  model: string;
  source: {
    repository: string;
    ref: string;
  };
  target: {
    autoCreatePr: boolean;
  };
}

async function createCursorAgent(config: any, prompt: string, cursorApiKey: string): Promise<string | null> {
  try {
    const agentRequest: CursorAgentRequest = {
      prompt: {
        text: prompt
      },
      model: config.model,
      source: {
        repository: config.githubRepository,
        ref: config.githubRef
      },
      target: {
        autoCreatePr: config.autoCreatePr
      }
    };

    const response = await fetch('https://api.cursor.com/v0/agents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cursorApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(agentRequest)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cursor API error:', response.status, errorText);
      return null;
    }

    const result = await response.json();
    return result.id;
  } catch (error) {
    console.error('Error creating Cursor agent:', error);
    return null;
  }
}



function isEmailAllowed(senderEmailText: string, allowedDomains: string[], allowedEmails: string[]): boolean {
  // If no restrictions are set, allow all emails
  if (allowedDomains.length === 0 && allowedEmails.length === 0) {
    return true;
  }

  // Extract just the email address from formats like "Display Name" <email@domain.com>
  const senderEmail = extractEmailAddress(senderEmailText);

  // Check specific email addresses
  if (allowedEmails.includes(senderEmail)) {
    return true;
  }

  // Check domains
  const senderDomain = '@' + senderEmail.split('@')[1];
  return allowedDomains.some(domain => 
    domain === senderDomain || senderEmail.endsWith(domain)
  );
}

async function logAgentLaunch(
  emailAgentId: string,
  userId: string,
  senderEmail: string,
  emailSubject: string,
  status: 'success' | 'failed' | 'rejected',
  cursorAgentId?: string,
  errorMessage?: string
) {
  try {
    await db.insert(agentLaunchLog).values({
      id: nanoid(),
      emailAgentId,
      userId,
      senderEmail,
      emailSubject: emailSubject || null,
      cursorAgentId: cursorAgentId || null,
      status,
      errorMessage: errorMessage || null,
    });
  } catch (error) {
    console.error('Failed to log agent launch:', error);
  }
}

interface RouteParams {
  params: Promise<{ configId: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
    try {
        const { configId } = await params;
        const payload: InboundWebhookPayload = await request.json()

        // Validate webhook payload
        if (!isInboundWebhook(payload)) {
            return NextResponse.json(
                { error: 'Invalid webhook payload' },
                { status: 400 }
            )
        }

        const { email } = payload

        // Process and log the email
        console.log('=== New Email Received ===')
        console.log(`Config ID: ${configId}`)
        console.log(`From: ${email.from?.text}`)
        console.log(`To: ${email.to?.text}`)
        console.log(`Subject: ${email.subject}`)
        console.log(`Body: ${email.cleanedContent.text}`)
        console.log('==========================')

        // Get the specific email agent by ID with user data for default key
        const agentWithUser = await db
          .select({
            agent: emailAgent,
            userDefaultKey: user.defaultCursorApiKey
          })
          .from(emailAgent)
          .leftJoin(user, eq(emailAgent.userId, user.id))
          .where(and(
            eq(emailAgent.id, configId),
            eq(emailAgent.isActive, true)
          ))
          .limit(1);

        if (agentWithUser.length === 0) {
          console.log(`No active email agent found for ID: ${configId}`);
          return NextResponse.json({ 
            error: 'Email agent not found or inactive',
            agentId: configId
          }, { status: 404 });
        }

        const emailAgentConfig = agentWithUser[0].agent;
        const defaultCursorApiKey = agentWithUser[0].userDefaultKey;
        const senderEmailText = email.from?.text || 'unknown@example.com';
        const senderEmail = extractEmailAddress(senderEmailText);

        // Check sender permissions
        const allowedDomains = emailAgentConfig.allowedDomains ? JSON.parse(emailAgentConfig.allowedDomains) : [];
        const allowedEmails = emailAgentConfig.allowedEmails ? JSON.parse(emailAgentConfig.allowedEmails) : [];
        
        if (!isEmailAllowed(senderEmailText, allowedDomains, allowedEmails)) {
          console.log(`Email from ${senderEmail} rejected - not in allowed list for agent ${configId}`);
          
          await logAgentLaunch(
            configId,
            emailAgentConfig.userId,
            senderEmail,
            email.subject || '',
            'rejected',
            undefined,
            'Sender not in allowed domains or emails list'
          );

          return NextResponse.json({ 
            error: 'Email sender not authorized for this agent',
            senderEmail: senderEmail
          }, { status: 403 });
        }

        // Determine which Cursor API key to use
        const cursorApiKey = emailAgentConfig.cursorApiKey || defaultCursorApiKey;
        
        if (!cursorApiKey) {
          console.error(`No Cursor API key available for agent ID: ${configId}`);
          
          await logAgentLaunch(
            configId,
            emailAgentConfig.userId,
            senderEmail,
            email.subject || '',
            'failed',
            undefined,
            'No Cursor API key configured'
          );

          return NextResponse.json({ 
            error: 'No Cursor API key configured for this agent',
            agentId: configId
          }, { status: 400 });
        }

        // Create prompt for the specific email agent
        const prompt = `
Email Subject: ${email.subject || 'No subject'}

Email Content:
${email.cleanedContent.text || 'No content'}

From: ${senderEmailText || 'Unknown sender'}

Please analyze this email and create appropriate code changes, documentation updates, or other relevant actions based on the content. If this appears to be a bug report, create a fix. If it's a feature request, implement the feature. If it's a question, create documentation or examples to help answer similar questions in the future.
        `.trim();

        const cursorAgentId = await createCursorAgent(emailAgentConfig, prompt, cursorApiKey);
        
        if (cursorAgentId) {
          console.log(`Created Cursor agent ${cursorAgentId} for email agent ${emailAgentConfig.name}`);
          
          await logAgentLaunch(
            configId,
            emailAgentConfig.userId,
            senderEmail,
            email.subject || '',
            'success',
            cursorAgentId
          );

          return NextResponse.json({ 
            success: true, 
            message: 'Email processed and Cursor agent created',
            result: {
              emailAgentName: emailAgentConfig.name,
              emailAgentId: configId,
              cursorAgentId: cursorAgentId,
              emailAddress: emailAgentConfig.emailAddress,
              status: 'created'
            }
          });
        } else {
          console.error(`Failed to create Cursor agent for email agent ${emailAgentConfig.name}`);
          
          await logAgentLaunch(
            configId,
            emailAgentConfig.userId,
            senderEmail,
            email.subject || '',
            'failed',
            undefined,
            'Cursor API request failed'
          );

          return NextResponse.json({ 
            success: false, 
            message: 'Failed to create Cursor agent',
            result: {
              emailAgentName: emailAgentConfig.name,
              emailAgentId: configId,
              cursorAgentId: null,
              emailAddress: emailAgentConfig.emailAddress,
              status: 'failed'
            }
          }, { status: 500 });
        }

    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}