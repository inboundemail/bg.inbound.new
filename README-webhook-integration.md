# Cursor Agent Webhook Integration

This system allows you to receive webhook notifications when Cursor background agents complete their tasks, enabling automatic email replies via the Inbound Replies API.

## Overview

The integration works in these steps:

1. **Register Webhook**: When starting agent monitoring, register a webhook URL
2. **Agent Monitoring**: The system polls Cursor API for agent status changes
3. **Webhook Delivery**: When agents complete (success/failure), webhooks are sent
4. **Automatic Replies**: Your webhook handler can trigger email replies via Inbound API

## API Endpoints

### GET /api/cursor-agents

Fetches active agents and processes webhook notifications for completed agents.

**Response:**
```json
{
  "activeAgents": [
    {
      "id": "agent_123",
      "name": "Fix bug in authentication",
      "status": "RUNNING",
      "createdAt": "2025-01-23T10:00:00Z"
    }
  ]
}
```

### POST /api/cursor-agents

Register webhook monitoring for a specific agent.

**Request:**
```json
{
  "agentId": "agent_123",
  "webhookUrl": "https://yourapp.com/webhook/cursor-agents",
  "webhookSecret": "your-secret-key", // Optional
  "emailAgentId": "email_agent_456", // Optional
  "originalEmailId": "email_789", // For replies
  "senderEmail": "user@example.com",
  "emailSubject": "Please fix the auth bug"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Webhook monitoring registered successfully",
  "agent": {
    "id": "agent_123",
    "status": "RUNNING",
    "name": "Fix bug in authentication"
  }
}
```

## Webhook Payload

When agents complete, your webhook URL receives:

```json
{
  "event": "agent.completed", // or "agent.failed"
  "agent": {
    "id": "agent_123",
    "name": "Fix bug in authentication",
    "status": "FINISHED", // or "ERROR"
    "summary": "Fixed authentication issue in login.tsx",
    "createdAt": "2025-01-23T10:00:00Z",
    "finishedAt": "2025-01-23T10:15:00Z",
    "prUrl": "https://github.com/user/repo/pull/42",
    "error": null // Present if status is ERROR
  },
  "metadata": {
    "emailAgentId": "email_agent_456",
    "originalEmailId": "email_789",
    "senderEmail": "user@example.com",
    "emailSubject": "Please fix the auth bug"
  }
}
```

## Security

### Webhook Signatures

If you provide a `webhookSecret`, payloads are signed with HMAC-SHA256:

```typescript
const signature = crypto
  .createHmac('sha256', secret)
  .update(JSON.stringify(payload))
  .digest('hex');

// Sent as: X-Signature: sha256={signature}
```

Verify signatures in your webhook handler:

```typescript
function verifySignature(payload: string, signature: string, secret: string): boolean {
  if (!signature.startsWith('sha256=')) return false;
  
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
```

## Retry Logic

Webhook delivery includes automatic retry with exponential backoff:

- **3 retry attempts** with delays: 1s, 2s, 4s
- **4xx errors**: No retry (client error, likely permanent)
- **5xx errors**: Full retry sequence (server error, might be temporary)
- **15 second timeout** per request

## Integration with Inbound Replies API

Use the webhook payload to send automatic replies:

```typescript
async function sendReply(payload: AgentWebhookPayload) {
  if (!payload.metadata.originalEmailId) return;
  
  const replyContent = payload.event === 'agent.completed' 
    ? `Great news! I've completed your task: ${payload.agent.summary}`
    : `Sorry, I encountered an issue: ${payload.agent.error}`;
  
  await fetch(`https://inbound.new/api/v2/emails/${payload.metadata.originalEmailId}/reply`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${INBOUND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'agent@yourdomain.com',
      text: replyContent,
      includeOriginal: true
    })
  });
}
```

## Example Implementation

See [`examples/webhook-to-reply-integration.ts`](./examples/webhook-to-reply-integration.ts) for a complete implementation including:

- Signature verification
- Reply content generation
- Error handling
- Express.js and Next.js examples

## Environment Variables

```bash
# Required for sending replies
INBOUND_API_KEY=your_inbound_api_key

# Optional for webhook security
WEBHOOK_SECRET=your_webhook_secret

# Email address for sending replies
FROM_EMAIL=agent@yourdomain.com
```

## Database Schema

The system uses existing tables:

- **`emailAgent`**: Stores webhook URLs and secrets
- **`agentLaunchLog`**: Tracks agent executions for webhook delivery

Webhook fields in `emailAgent`:
```sql
webhookUrl: text("webhook_url")
webhookSecret: text("webhook_secret")
```

## Error Handling

### Common Issues

1. **Invalid webhook URL**: Returns 400 error during registration
2. **Agent not found**: Returns 404 during registration
3. **Webhook delivery failure**: Logged but doesn't block agent monitoring
4. **Missing API keys**: Returns 400 with helpful error message

### Monitoring

Check logs for webhook delivery status:
- Successful deliveries: `Webhook sent successfully to: {url}`
- Failed deliveries: `All {N} webhook attempts failed for: {url}`
- Retry attempts: `Retrying webhook in {delay}ms...`

## Best Practices

1. **Use webhook secrets** for production environments
2. **Return 2xx status codes** quickly from webhook handlers
3. **Process webhooks asynchronously** for complex operations
4. **Store webhook payloads** for debugging and replay
5. **Monitor webhook delivery rates** for system health
6. **Use idempotency keys** when calling Inbound Replies API

## Troubleshooting

### Webhooks not being sent

1. Check agent is properly registered with `POST /api/cursor-agents`
2. Verify webhook URL is accessible and returns 2xx status codes
3. Check agent launch logs in database for tracking entries
4. Monitor API logs for webhook delivery attempts

### Replies not being sent

1. Verify `INBOUND_API_KEY` is set correctly
2. Check `FROM_EMAIL` domain is verified in Inbound
3. Ensure `originalEmailId` is included in webhook metadata
4. Check Inbound API response for specific error messages

### Signature verification failing

1. Ensure webhook secret matches between registration and verification
2. Verify signature header is `X-Signature: sha256={hash}`
3. Check JSON stringification matches exactly (no extra spaces/formatting)

## Usage Examples

### Option 1: Create Agent with Webhook via MCP Tool

The easiest way to create agents with webhook notifications is through the MCP `create_cursor_agent` tool:

```javascript
// Use the MCP tool with webhook parameters
const result = await create_cursor_agent({
  prompt: "Fix the authentication bug in the login system",
  repository: "https://github.com/user/repo",
  ref: "main",
  autoCreatePr: true,
  webhookUrl: "https://yourapp.com/webhook/cursor-agents",
  webhookSecret: "your-webhook-secret", // Optional but recommended
  originalEmailId: "email_789",  // For automatic replies
  senderEmail: "user@example.com",
  emailSubject: "Please fix the auth bug"
});

// Agent is created AND webhook monitoring is automatically registered
// When agent completes, webhook will be sent to your URL with all metadata
```

**Benefits of this approach:**
- Single operation creates agent and registers webhook
- Webhook configuration is sent directly to Cursor API
- Automatic tracking in local database
- Supports email reply metadata

### Option 2: Register Webhook for Existing Agent

For agents already created, use the REST API to register webhook monitoring:

```javascript
// Register webhook monitoring for an existing agent
const response = await fetch('/api/cursor-agents', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_SESSION_TOKEN' // Your app's auth
  },
  body: JSON.stringify({
    agentId: 'agent_123',
    webhookUrl: 'https://yourapp.com/webhook/cursor-agents',
    webhookSecret: 'your-secret', // Optional
    originalEmailId: 'email_789',  // For replies
    senderEmail: 'user@example.com',
    emailSubject: 'Please fix the bug'
  })
});

const result = await response.json();
// { "success": true, "message": "Webhook monitoring registered successfully" }
```

### Complete Integration Flow

Here's a complete example of the webhook-to-reply flow:

```javascript
// 1. Create agent with webhook (via MCP or email trigger)
const agent = await create_cursor_agent({
  prompt: "Add dark mode to the dashboard",
  repository: "https://github.com/user/dashboard",
  webhookUrl: "https://myapp.com/webhook/cursor-agents",
  originalEmailId: "email_456",
  senderEmail: "user@company.com",
  emailSubject: "Please add dark mode"
});

// 2. Agent works in background...
// 3. When complete, webhook is sent to your URL
// 4. Your webhook handler processes it and sends reply:

// In your webhook handler:
app.post('/webhook/cursor-agents', async (req, res) => {
  const payload = req.body;
  
  if (payload.event === 'agent.completed' && payload.metadata.originalEmailId) {
    // Send automatic reply via Inbound API
    await fetch(`https://inbound.new/api/v2/emails/${payload.metadata.originalEmailId}/reply`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${INBOUND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'agent@yourcompany.com',
        text: `Great news! I've completed your request: ${payload.agent.summary}
        
${payload.agent.prUrl ? `View the changes: ${payload.agent.prUrl}` : ''}`,
        includeOriginal: true
      })
    });
  }
  
  res.status(200).json({ received: true });
});
```

This creates a seamless flow where:
1. User emails a request
2. Agent is created with webhook configuration  
3. Agent completes work and creates PR
4. Webhook notifies your system
5. Automatic reply is sent to the user with results
