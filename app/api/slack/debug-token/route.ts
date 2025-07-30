import { auth } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { account } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Get the user's session
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query the account table to get the Slack access token and scopes
    const slackAccount = await db
      .select()
      .from(account)
      .where(
        and(
          eq(account.userId, session.user.id),
          eq(account.providerId, "slack")
        )
      )
      .limit(1);

    if (!slackAccount.length) {
      return NextResponse.json({ error: "No Slack account found" }, { status: 404 });
    }

    const accountData = slackAccount[0];

    // Test the token with a simple API call
    let tokenValid = false;
    let apiError = null;
    
    if (accountData.accessToken) {
      try {
        const testResponse = await fetch('https://slack.com/api/auth.test', {
          headers: {
            'Authorization': `Bearer ${accountData.accessToken}`,
            'Content-Type': 'application/json',
          },
        });
        
        const testData = await testResponse.json();
        tokenValid = testData.ok;
        if (!tokenValid) {
          apiError = testData.error;
        }
      } catch (error) {
        apiError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
      },
      account: {
        id: accountData.id,
        accountId: accountData.accountId,
        providerId: accountData.providerId,
        hasAccessToken: !!accountData.accessToken,
        accessTokenLength: accountData.accessToken?.length || 0,
        hasRefreshToken: !!accountData.refreshToken,
        scopes: accountData.scope?.split(',') || [],
        scopeString: accountData.scope || 'No scopes found',
        accessTokenExpiresAt: accountData.accessTokenExpiresAt,
        createdAt: accountData.createdAt,
        updatedAt: accountData.updatedAt,
      },
      tokenTest: {
        valid: tokenValid,
        error: apiError,
      },
      requiredScopes: [
        'openid',
        'profile', 
        'email',
        'channels:read',
        'groups:read',
        'mpim:read',
        'im:read',
        'channels:history',
        'groups:history',
        'mpim:history',
        'im:history',
        'chat:write',
        'users:read',
        'team:read',
      ]
    });
  } catch (error) {
    console.error("Error in debug endpoint:", error);
    return NextResponse.json(
      { error: "Failed to debug token", details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 