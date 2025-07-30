import { NextRequest, NextResponse } from 'next/server'
import { isInboundWebhook } from '@inboundemail/sdk'
import type { InboundWebhookPayload } from '@inboundemail/sdk'

export async function POST(request: NextRequest) {
    try {
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
        console.log(`From: ${email.from?.text}`)
        console.log(`To: ${email.to?.text}`)
        console.log(`Subject: ${email.subject}`)
        console.log(`Body: ${email.cleanedContent.text}`)
        console.log('==========================')

        console.log('⚠️  Generic webhook endpoint called - consider using specific config endpoints');
        
        // Provide helpful information about the new targeted approach
        return NextResponse.json({ 
          success: false,
          message: 'This generic webhook endpoint is deprecated. Please use configuration-specific URLs.',
          help: {
            explanation: 'Each webhook configuration now has its own unique URL for targeted processing.',
            format: '/api/inbound/receive/[configId]',
            instructions: 'Visit your dashboard to get the specific webhook URL for each configuration.'
          }
        }, { status: 400 });
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}