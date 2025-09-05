/**
 * Test Webhook Agent Creation
 * 
 * This example demonstrates how to create a Cursor agent with webhook
 * notifications enabled. When the agent completes, a webhook will be
 * sent to the specified URL.
 * 
 * Usage:
 * 1. Set up a webhook endpoint to receive notifications
 * 2. Run this script with appropriate parameters
 * 3. Monitor webhook endpoint for completion notifications
 */

// Example webhook creation using the MCP tool
export async function createAgentWithWebhook() {
  try {
    // This would be called through the MCP interface
    const agent = await create_cursor_agent({
      prompt: `
        Please add a simple dark mode toggle to this React application.
        
        Requirements:
        - Add a toggle button in the top navigation
        - Store the theme preference in localStorage
        - Apply dark/light theme classes to the main container
        - Use CSS variables for colors
        - Make it accessible with proper ARIA labels
      `,
      repository: "https://github.com/user/my-react-app",
      ref: "main",
      model: "claude-3.5-sonnet",
      autoCreatePr: true,
      
      // Webhook configuration
      webhookUrl: "https://myapp.ngrok.io/webhook/cursor-agents", // Use ngrok for testing
      webhookSecret: "test-secret-12345",
      
      // Email reply metadata (optional)
      originalEmailId: "email_test_123",
      senderEmail: "developer@company.com",
      emailSubject: "Please add dark mode to the dashboard"
    });

    console.log('Agent created successfully!');
    console.log('Agent ID:', agent.id);
    console.log('Webhook monitoring enabled');
    
    return agent;
  } catch (error) {
    console.error('Failed to create agent:', error);
    throw error;
  }
}

// Example webhook endpoint using Express.js
export function createTestWebhookServer() {
  const express = require('express');
  const crypto = require('crypto');
  
  const app = express();
  app.use(express.json());

  app.post('/webhook/cursor-agents', (req, res) => {
    const payload = req.body;
    const signature = req.headers['x-signature'];
    
    console.log('📥 Webhook received:', payload.event);
    console.log('🤖 Agent:', payload.agent.id);
    console.log('📊 Status:', payload.agent.status);
    
    // Verify signature if secret is configured
    const webhookSecret = 'test-secret-12345';
    if (signature && webhookSecret) {
      const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      
      if (signature !== expectedSignature) {
        console.error('❌ Invalid webhook signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }
      console.log('✅ Signature verified');
    }
    
    // Handle different events
    if (payload.event === 'agent.completed') {
      console.log('🎉 Agent completed successfully!');
      if (payload.agent.summary) {
        console.log('📝 Summary:', payload.agent.summary);
      }
      if (payload.agent.prUrl) {
        console.log('🔗 Pull Request:', payload.agent.prUrl);
      }
      
      // Send automatic reply if email metadata is provided
      if (payload.metadata.originalEmailId) {
        sendAutomaticReply(payload)
          .then(() => console.log('📧 Reply sent successfully'))
          .catch(err => console.error('❌ Failed to send reply:', err));
      }
    } 
    else if (payload.event === 'agent.failed') {
      console.log('💥 Agent failed!');
      if (payload.agent.error) {
        console.log('❌ Error:', payload.agent.error);
      }
      
      // Send failure notification if email metadata is provided
      if (payload.metadata.originalEmailId) {
        sendFailureReply(payload)
          .then(() => console.log('📧 Failure notification sent'))
          .catch(err => console.error('❌ Failed to send notification:', err));
      }
    }
    
    // Always respond with success
    res.status(200).json({ 
      received: true, 
      timestamp: new Date().toISOString() 
    });
  });
  
  const port = 3000;
  app.listen(port, () => {
    console.log(`🌐 Test webhook server running on http://localhost:${port}`);
    console.log('📡 Webhook endpoint: http://localhost:${port}/webhook/cursor-agents');
    console.log('💡 Use ngrok to expose for external testing: ngrok http 3000');
  });
  
  return app;
}

// Helper function to send success reply
async function sendAutomaticReply(payload: any) {
  const INBOUND_API_KEY = process.env.INBOUND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'agent@yourcompany.com';
  
  if (!INBOUND_API_KEY) {
    console.warn('⚠️ INBOUND_API_KEY not set - skipping email reply');
    return;
  }
  
  const replyContent = `Great news! I've completed your request: "${payload.metadata.emailSubject}"

✅ Status: ${payload.agent.status}
📝 Summary: ${payload.agent.summary || 'Task completed successfully'}
${payload.agent.prUrl ? `🔗 View changes: ${payload.agent.prUrl}` : ''}

Agent: ${payload.agent.id}
Completed: ${payload.agent.finishedAt}

Let me know if you need any adjustments!`;

  const response = await fetch(
    `https://inbound.new/api/v2/emails/${payload.metadata.originalEmailId}/reply`, 
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INBOUND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        text: replyContent,
        subject: `✅ Completed: ${payload.metadata.emailSubject}`,
        includeOriginal: true
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to send reply: ${response.status} ${await response.text()}`);
  }
}

// Helper function to send failure notification
async function sendFailureReply(payload: any) {
  const INBOUND_API_KEY = process.env.INBOUND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || 'agent@yourcompany.com';
  
  if (!INBOUND_API_KEY) {
    console.warn('⚠️ INBOUND_API_KEY not set - skipping email reply');
    return;
  }
  
  const replyContent = `I encountered an issue while working on your request: "${payload.metadata.emailSubject}"

❌ Status: Failed
🔍 Error: ${payload.agent.error || 'Unknown error occurred'}

Agent: ${payload.agent.id}
Failed at: ${payload.agent.finishedAt}

I'll investigate this issue. Please feel free to try again or contact support if the problem persists.`;

  const response = await fetch(
    `https://inbound.new/api/v2/emails/${payload.metadata.originalEmailId}/reply`, 
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INBOUND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        text: replyContent,
        subject: `❌ Failed: ${payload.metadata.emailSubject}`,
        includeOriginal: true
      })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to send failure notification: ${response.status} ${await response.text()}`);
  }
}

// Example usage
if (require.main === module) {
  console.log('🧪 Starting webhook test...');
  
  // Start webhook server
  createTestWebhookServer();
  
  // Example: Create agent (this would typically be done through MCP interface)
  // createAgentWithWebhook()
  //   .then(agent => {
  //     console.log('✅ Test agent created, waiting for completion...');
  //   })
  //   .catch(console.error);
}

/**
 * To test this:
 * 
 * 1. Install dependencies: bun install express
 * 2. Set environment variables:
 *    export INBOUND_API_KEY=your_inbound_api_key
 *    export FROM_EMAIL=agent@yourdomain.com
 * 
 * 3. Run the webhook server: bun run examples/test-webhook-agent.ts
 * 4. Use ngrok to expose your local server: ngrok http 3000
 * 5. Create an agent with the ngrok URL as webhook
 * 6. Monitor the console for webhook events and email replies
 */
