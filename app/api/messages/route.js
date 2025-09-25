// app/api/messages/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../lib/db';
import User from '../../../models/User';
import Conversation from '../../../models/Conversation';
import { rateLimit } from '../../../utils/rateLimiting';
import { MessageService } from '../../../lib/services/messageService';
import { validateContent } from '../../../lib/validations/content-validator';

export const dynamic = 'force-dynamic';

// Get conversations for the current user
export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'messages', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const conversationId = searchParams.get('conversationId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (conversationId) {
      // Use MessageService for enhanced caching and real-time features
      const conversation = await MessageService.getConversation(conversationId, session.user.id);

      if (!conversation) {
        return NextResponse.json(
          { message: 'Conversation not found' },
          { status: 404 }
        );
      }

      // Paginate messages
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMessages = conversation.messages
        .reverse()
        .slice(startIndex, endIndex)
        .reverse();

      // Mark messages as read with real-time updates
      if (page === 1) {
        await MessageService.markAsRead(conversationId, session.user.id);
      }

      return NextResponse.json({
        success: true,
        conversation: {
          ...conversation,
          messages: paginatedMessages
        },
        hasMore: endIndex < conversation.messages.length
      });
    } else {
      // Get all conversations for the user using MessageService
      const conversations = await MessageService.getUserConversations(session.user.id);

      return NextResponse.json({
        success: true,
        conversations
      });
    }
  } catch (error) {
    console.error('Messages fetch error:', error);
    return NextResponse.json(
      { message: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// Send a new message
export async function POST(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'send_message', 30, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many messages. Please slow down.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      conversationId,
      recipientId,
      content,
      messageType = 'text',
      jobId
    } = await request.json();

    if (!content || content.trim().length === 0) {
      return NextResponse.json(
        { message: 'Message content is required' },
        { status: 400 }
      );
    }

    if (content.length > 1000) {
      return NextResponse.json(
        { message: 'Message too long (max 1000 characters)' },
        { status: 400 }
      );
    }

    // Validate content for private messages (more lenient than public)
    const validation = await validateContent(content, 'private_message', session.user.id);

    // For private messages, we allow contact details but block abusive language
    if (validation.violations.some(v => v.type === 'PROFANITY' || v.type === 'ABUSE')) {
      return NextResponse.json(
        {
          message: 'Message contains inappropriate language',
          violations: validation.violations.filter(v => v.type === 'PROFANITY' || v.type === 'ABUSE')
        },
        { status: 400 }
      );
    }

    await connectDB();

    // Use MessageService for enhanced real-time messaging
    if (conversationId) {
      // Send message to existing conversation
      const result = await MessageService.sendMessage(
        conversationId,
        session.user.id,
        content.trim(),
        messageType
      );

      return NextResponse.json(result);

    } else if (recipientId) {
      // Create new conversation and send first message
      await connectDB();

      // Verify recipient exists
      const recipient = await User.findById(recipientId);
      if (!recipient) {
        return NextResponse.json(
          { message: 'Recipient not found' },
          { status: 404 }
        );
      }

      // Find or create conversation
      const conversation = await Conversation.findOrCreateBetween(
        session.user.id,
        recipientId,
        jobId
      );

      // Send message using MessageService
      const result = await MessageService.sendMessage(
        conversation._id,
        session.user.id,
        content.trim(),
        messageType
      );

      return NextResponse.json(result);

    } else {
      return NextResponse.json(
        { message: 'Either conversationId or recipientId is required' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Send message error:', error);
    return NextResponse.json(
      { message: 'Failed to send message' },
      { status: 500 }
    );
  }
}

// Update message (edit or delete)
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { conversationId, messageId, content, action } = await request.json();

    if (!conversationId || !messageId) {
      return NextResponse.json(
        { message: 'Conversation ID and Message ID are required' },
        { status: 400 }
      );
    }

    await connectDB();

    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) {
      return NextResponse.json(
        { message: 'Conversation not found' },
        { status: 404 }
      );
    }

    const message = conversation.messages.id(messageId);
    
    if (!message) {
      return NextResponse.json(
        { message: 'Message not found' },
        { status: 404 }
      );
    }

    // Check if user is the sender
    if (message.sender.toString() !== session.user.id) {
      return NextResponse.json(
        { message: 'You can only edit your own messages' },
        { status: 403 }
      );
    }

    if (action === 'edit') {
      if (!content || content.trim().length === 0) {
        return NextResponse.json(
          { message: 'Message content is required' },
          { status: 400 }
        );
      }

      message.content = content.trim();
      message.edited = true;
      message.editedAt = new Date();
    } else if (action === 'delete') {
      message.deleted = true;
      message.deletedAt = new Date();
      message.content = 'This message has been deleted';
    }

    await conversation.save();

    return NextResponse.json({
      success: true,
      message: 'Message updated successfully'
    });

  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { message: 'Failed to update message' },
      { status: 500 }
    );
  }
}

// Mark messages as read
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { conversationId } = await request.json();

    if (!conversationId) {
      return NextResponse.json(
        { message: 'Conversation ID is required' },
        { status: 400 }
      );
    }

    // Use MessageService for enhanced real-time read receipts
    const result = await MessageService.markAsRead(conversationId, session.user.id);

    return NextResponse.json({
      success: true,
      message: 'Messages marked as read'
    });

  } catch (error) {
    console.error('Mark messages as read error:', error);
    return NextResponse.json(
      { message: 'Failed to mark messages as read' },
      { status: 500 }
    );
  }
}

// Note: We'll need to create a Conversation model