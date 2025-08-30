# Cursor API Update - bg.inbound.new

## Summary of Changes

The bg.inbound.new application has been updated to support the latest Cursor Background Agent API v0. The following changes were made to fix the "Failed to create Cursor agent for email agent inbound" error:

## Key Changes Made

### 1. Updated API Request Structure

The Cursor API request structure has been updated to match the new API documentation:

#### Previous Structure:
```typescript
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
```

#### New Structure:
```typescript
interface CursorAgentRequest {
  prompt: {
    text: string;
    images?: Array<{
      data: string;
      dimension?: {
        width: number;
        height: number;
      };
    }>;
  };
  model?: string;  // Now optional
  source: {
    repository: string;
    ref?: string;  // Now optional with default 'main'
  };
  target?: {  // Now optional
    autoCreatePr?: boolean;
    branchName?: string;  // New optional field
  };
  webhook?: {  // New optional field
    url: string;
    secret?: string;
  };
}
```

### 2. Database Schema Updates

Added new fields to the `email_agent` table:
- `branch_name` - Optional custom branch name pattern
- `webhook_url` - Optional webhook URL for status updates  
- `webhook_secret` - Optional webhook secret for verification
- Changed `model` field to be optional with default value `claude-3.5-sonnet`

Migration file created: `drizzle/0008_nebulous_thunderbolt_ross.sql`

### 3. Enhanced Error Logging

Added detailed error logging to help diagnose API issues:
- Logs the full request being sent to the Cursor API
- Attempts to parse and log error responses as JSON for better debugging
- Logs both structured error messages and raw responses

### 4. Updated Files

- `/app/api/inbound/receive/[configId]/route.ts` - Main email webhook handler
- `/app/api/[transport]/route.ts` - MCP transport handler for Cursor agents
- `/app/api/cursor-agents/route.ts` - Agent listing endpoint
- `/lib/schema.ts` - Database schema updates

## Testing the Integration

A test script has been created to verify the Cursor API integration:

```bash
# Run the test script with your API key
node test-cursor-api.js YOUR_CURSOR_API_KEY https://github.com/your-org/your-repo

# The script will test:
# 1. Listing agents (GET /v0/agents)
# 2. Creating a test agent (POST /v0/agents)
# 3. Getting agent status (GET /v0/agents/{id})
```

## How to Apply the Changes

1. **Run the database migration:**
   ```bash
   npx drizzle-kit push
   # or
   npm run db:push
   ```

2. **Restart your application** to pick up the code changes

3. **Test the integration** using the provided test script

4. **Update your email agents** in the dashboard if you want to use the new optional fields:
   - Custom branch names
   - Webhook URLs for status notifications

## API Compatibility

The changes maintain backward compatibility:
- Existing email agents will continue to work
- The `model` field now defaults to `claude-3.5-sonnet` if not specified
- All new fields are optional

## Troubleshooting

If you still encounter issues:

1. **Check your API key** - Ensure it's valid and has the necessary permissions
2. **Verify the repository URL** - Must be a valid GitHub repository URL
3. **Check the logs** - The enhanced logging will show detailed error messages
4. **Test with the script** - Use `test-cursor-api.js` to isolate API issues

## References

- [Cursor API Documentation](https://docs.cursor.com/en/background-agent/api/overview)
- [Launch an Agent](https://docs.cursor.com/en/background-agent/api/launch-an-agent)
- [List Agents](https://docs.cursor.com/en/background-agent/api/list-agents)
- [Agent Status](https://docs.cursor.com/en/background-agent/api/agent-status)