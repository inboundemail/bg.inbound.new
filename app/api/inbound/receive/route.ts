import { NextRequest, NextResponse } from 'next/server'
import { Inbound, isInboundWebhook } from '@inboundemail/sdk'
import type { InboundWebhookPayload } from '@inboundemail/sdk'
import { db } from '@/lib/db'
import { slackConnection } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { createSlackClient } from '@/lib/slack-api'

export async function POST(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url)
        const webhookId = searchParams.get('uuid')

        if (!webhookId) {
            return NextResponse.json(
                { error: 'Missing webhook UUID' },
                { status: 400 }
            )
        }

        // Find the Slack connection for this webhook
        const connection = await db
            .select()
            .from(slackConnection)
            .where(eq(slackConnection.webhookId, webhookId))
            .limit(1)

        if (!connection.length || !connection[0].webhookActive) {
            return NextResponse.json(
                { error: 'Webhook not found or inactive' },
                { status: 404 }
            )
        }

        const payload: InboundWebhookPayload = await request.json()

        // Validate webhook payload
        if (!isInboundWebhook(payload)) {
            return NextResponse.json(
                { error: 'Invalid webhook payload' },
                { status: 400 }
            )
        }

        const { email } = payload
        const slackConn = connection[0]

        // Process the email
        console.log(`New email from: ${email.from?.text}`)
        console.log(`Subject: ${email.subject}`)
        console.log(`Body: ${email.cleanedContent.text}`)

        // Send to Slack channel if we have a selected channel
        if (slackConn.selectedChannelId && slackConn.accessToken) {
            try {
                const slack = createSlackClient(slackConn.accessToken)

                // Format email for Slack
                const slackMessage = `
                <@U091E52CLVD> ${email.subject || 'No Subject'}
                ${email.cleanedContent.text || email.cleanedContent.html || 'No content'}`

                await slack.sendMessage(slackConn.selectedChannelId, slackMessage)
                console.log(`Email forwarded to Slack channel: ${slackConn.selectedChannelName}`)
            } catch (slackError) {
                console.error('Failed to send to Slack:', slackError)
                // Continue processing even if Slack fails
            }
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Webhook error:', error)
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        )
    }
}