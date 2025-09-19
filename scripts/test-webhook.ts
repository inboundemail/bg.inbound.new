#!/usr/bin/env bun

import { createHash, createHmac } from 'crypto';

// Test payload from the user
const testPayload = {
  "event": "statusChange",
  "timestamp": "2025-09-19T22:21:33.084Z",
  "id": "bc-5012b32d-8b28-43b8-853f-da1aeba60415",
  "status": "FINISHED",
  "source": {
    "repository": "github.com/R44VC0RP/resend-mcp-remote",
    "ref": "main"
  },
  "target": {
    "url": "https://cursor.com/agents?id=bc-5012b32d-8b28-43b8-853f-da1aeba60415",
    "branchName": "cursor/add-email-scheduling-via-resend-0c57",
    "prUrl": "https://github.com/R44VC0RP/resend-mcp-remote/pull/1"
  },
  "name": "Add email scheduling via resend",
  "summary": "Enhanced email scheduling in the Resend MCP:\n*   `send-email.ts` now validates `scheduledAt` (natural language/ISO 8601, 30-day limit).\n*   New `schedule-email-advanced.ts` offers flexible scheduling with timezone support.\n*   Added `list-emails.ts` to view all emails, including scheduled ones.\n*   Updated `README.md` and created `SCHEDULING_EXAMPLES.md` for comprehensive documentation.\nThis provides robust, user-friendly email scheduling capabilities.",
  "createdAt": "2025-09-19T22:14:19.770Z"
};

// Function to generate webhook signature (if secret is provided)
function generateWebhookSignature(secret: string, body: string): string {
  return 'sha256=' + createHmac('sha256', secret).update(body, 'utf8').digest('hex');
}

// Function to prompt for input
function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    process.stdout.write(question);
    process.stdin.once('data', (data) => {
      resolve(data.toString().trim());
    });
  });
}

async function main() {
  console.log('🧪 Cursor Webhook Test Script');
  console.log('==============================\n');

  // Get email ID from user
  const emailId = await prompt('Enter the email ID to test with: ');
  
  if (!emailId) {
    console.error('❌ Email ID is required');
    process.exit(1);
  }

  // Ask for webhook secret (optional)
  const webhookSecret = await prompt('Enter webhook secret (optional, press Enter to skip): ');

  // Get base URL (default to localhost:3000)
  const baseUrl = await prompt('Enter base URL (default: http://localhost:3000): ') || 'http://localhost:3000';

  console.log('\n📋 Test Configuration:');
  console.log(`   Email ID: ${emailId}`);
  console.log(`   Base URL: ${baseUrl}`);
  console.log(`   Has Secret: ${webhookSecret ? 'Yes' : 'No'}`);
  console.log('');

  // Prepare the request
  const url = `${baseUrl}/api/cursor-webhooks/${emailId}`;
  const body = JSON.stringify(testPayload);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Cursor-Agent-Webhook/1.0',
    'X-Webhook-Event': 'statusChange',
    'X-Webhook-ID': `webhook-${Date.now()}`,
  };

  // Add signature if secret is provided
  if (webhookSecret) {
    headers['X-Webhook-Signature'] = generateWebhookSignature(webhookSecret, body);
    console.log(`🔐 Generated signature: ${headers['X-Webhook-Signature'].substring(0, 20)}...`);
  }

  console.log(`🚀 Sending webhook to: ${url}`);
  console.log(`📦 Payload: ${body.substring(0, 100)}...`);
  console.log('');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body,
    });

    const responseText = await response.text();
    let responseJson;
    
    try {
      responseJson = JSON.parse(responseText);
    } catch {
      responseJson = responseText;
    }

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    console.log(`📋 Response Headers:`, Object.fromEntries(response.headers.entries()));
    console.log(`📄 Response Body:`, responseJson);

    if (response.ok) {
      console.log('\n✅ Webhook test completed successfully!');
    } else {
      console.log('\n❌ Webhook test failed!');
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error sending webhook:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n\n👋 Test cancelled by user');
  process.exit(0);
});

// Enable stdin
process.stdin.setRawMode(false);
process.stdin.resume();
process.stdin.setEncoding('utf8');

main().catch(console.error);
