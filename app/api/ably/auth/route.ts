// Phase 2: Restricted Ably token capabilities to the unified typed realtime channels.
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';

import { Channels, getServerAbly } from '@/lib/ably';
import { authOptions } from '@/lib/auth';
import { logger } from '@/lib/logger';
import connectDB from '@/lib/mongodb';
import Conversation from '@/models/Conversation';
import User from '@/models/User';
import { rateLimit } from '@/utils/rateLimiting';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const NO_STORE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

type SessionUser = {
  id?: string;
};

type AblyCapability = Record<string, Array<'publish' | 'subscribe' | 'presence'>>;

type ConversationAccessRow = {
  _id?: unknown;
};

type AuthUserRow = {
  _id?: unknown;
  banned?: boolean;
  isActive?: boolean;
  deletedAt?: Date | null;
  role?: string;
};

function toTrimmedString(value: unknown): string | null {
  return typeof value === 'string' ? value.trim() : null;
}

function buildCapability(
  userId: string,
  conversationIds: string[],
  role?: string
): AblyCapability {
  const capability: AblyCapability = {
    [Channels.user(userId)]: ['subscribe'],
    'job:*': ['subscribe'],
    [Channels.marketplace]: ['subscribe'],
  };

  conversationIds.forEach((conversationId) => {
    capability[Channels.conversation(conversationId)] = ['publish', 'subscribe', 'presence'];
    capability[Channels.conversationPresence(conversationId)] = ['publish', 'subscribe', 'presence'];
  });

  if (role === 'admin') {
    capability[Channels.admin] = ['subscribe'];
  }

  return capability;
}

async function getAuthorizedConversationIds(userId: string): Promise<string[]> {
  await connectDB();

  const conversations = await Conversation.find({ participants: userId })
    .select('_id')
    .sort({ updatedAt: -1 })
    .limit(500)
    .lean<ConversationAccessRow[]>();

  return conversations
    .map((conversation) => toTrimmedString(conversation?._id))
    .filter((conversationId): conversationId is string => Boolean(conversationId));
}

export async function GET(request: Request) {
  try {
    const session = (await getServerSession(authOptions)) as { user?: SessionUser } | null;
    const userId = toTrimmedString(session?.user?.id);
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const rateLimitResult = await rateLimit(request, 'ably_auth', 120, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many token requests. Please try again later.' },
        { status: 429, headers: NO_STORE_HEADERS }
      );
    }

    await connectDB();
    const authUser = await User.findById(userId)
      .select('_id banned isActive deletedAt role')
      .lean<AuthUserRow | null>();
    if (
      !authUser ||
      authUser.banned === true ||
      authUser.isActive === false ||
      Boolean(authUser.deletedAt)
    ) {
      return NextResponse.json(
        { error: 'Account is not eligible for realtime access' },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const client = getServerAbly();
    if (!client) {
      return NextResponse.json(
        { error: 'Ably server client is not configured' },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }

    const conversationIds = await getAuthorizedConversationIds(userId);
    const capability = buildCapability(userId, conversationIds, authUser.role);
    const tokenDetails = await client.auth.requestToken({
      clientId: userId,
      capability: JSON.stringify(capability),
      ttl: 60 * 60 * 1000,
    });

    return NextResponse.json(tokenDetails, { headers: NO_STORE_HEADERS });
  } catch (error: unknown) {
    logger.error('Error creating Ably token request:', error);
    return NextResponse.json(
      { error: 'Failed to create token request' },
      { status: 500, headers: NO_STORE_HEADERS }
    );
  }
}

export const POST = GET;
