import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { user } from '@/lib/schema'
import { eq } from 'drizzle-orm'
import { auth } from '@/lib/auth'

// GET - Get the user's default Cursor API key
export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userData = await db
      .select({
        defaultCursorApiKey: user.defaultCursorApiKey
      })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);

    if (userData.length === 0) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      hasKey: !!userData[0].defaultCursorApiKey,
      // Don't return the actual key for security
    });
  } catch (error) {
    console.error('Error fetching default Cursor API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Update the user's default Cursor API key
export async function PUT(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { cursorApiKey } = body;

    // Validate the key is provided
    if (!cursorApiKey || typeof cursorApiKey !== 'string' || cursorApiKey.trim().length === 0) {
      return NextResponse.json(
        { error: 'Cursor API key is required' },
        { status: 400 }
      );
    }

    // Update the user's default Cursor API key
    const updatedUser = await db
      .update(user)
      .set({
        defaultCursorApiKey: cursorApiKey.trim(),
        updatedAt: new Date()
      })
      .where(eq(user.id, session.user.id))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Default Cursor API key updated successfully'
    });
  } catch (error) {
    console.error('Error updating default Cursor API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove the user's default Cursor API key
export async function DELETE(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers
    });

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Remove the user's default Cursor API key
    const updatedUser = await db
      .update(user)
      .set({
        defaultCursorApiKey: null,
        updatedAt: new Date()
      })
      .where(eq(user.id, session.user.id))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: 'Default Cursor API key removed successfully'
    });
  } catch (error) {
    console.error('Error removing default Cursor API key:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}