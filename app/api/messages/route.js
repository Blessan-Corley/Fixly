// app/api/messages/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../lib/db';
import User from '../../../models/User';
import Conversation from '../../../models/Conversation';
import { rateLimit } from '../../../utils/rateLimiting';

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
      // Get messages for a specific conversation
      const conversation = await Conversation.findById(conversationId)
        .populate([
          {
            path: 'participants',
            select: 'name username email photoURL role rating isOnline lastSeen'
          },
          {
            path: 'messages.sender',
            select: 'name username photoURL'
          },
          {
            path: 'relatedJob',
            select: 'title status budget location'
          }
        ])
        .lean();

      if (!conversation) {
        return NextResponse.json(
          { message: 'Conversation not found' },
          { status: 404 }
        );
      }

      // Check if user is participant
      const isParticipant = conversation.participants.some(
        p => p._id.toString() === session.user.id
      );

      if (!isParticipant) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        );
      }

      // Paginate messages
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      const paginatedMessages = conversation.messages
        .reverse()
        .slice(startIndex, endIndex)
        .reverse();

      // Mark messages as read
      if (page === 1) {
        await Conversation.updateOne(
          { _id: conversationId },
          {
            $set: {
              'messages.$[elem].readBy': {
                ...conversation.messages.reduce((acc, msg) => {
                  if (msg.sender.toString() !== session.user.id) {
                    acc[session.user.id] = new Date();
                  }
                  return acc;
                }, conversation.messages[0]?.readBy || {})
              }
            }
          },
          {
            arrayFilters: [{ 'elem.sender': { $ne: session.user.id } }]
          }
        );
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
      // Get all conversations for the user
      const conversations = await Conversation.find({
        participants: session.user.id
      })
        .populate([
          {
            path: 'participants',
            select: 'name username email photoURL role rating isOnline lastSeen'
          },
          {
            path: 'relatedJob',
            select: 'title status budget'
          }
        ])
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean();

      // Add unread count and last message info
      const conversationsWithMeta = conversations.map(conv => {
        const otherParticipant = conv.participants.find(
          p => p._id.toString() !== session.user.id
        );
        
        const lastMessage = conv.messages[conv.messages.length - 1];
        const unreadCount = conv.messages.filter(msg => 
          msg.sender.toString() !== session.user.id &&
          (!msg.readBy || !msg.readBy[session.user.id])
        ).length;

        return {
          _id: conv._id,
          participant: otherParticipant,
          relatedJob: conv.relatedJob,
          lastMessage: lastMessage ? {
            content: lastMessage.content,
            timestamp: lastMessage.timestamp,
            sender: lastMessage.sender.toString() === session.user.id ? 'me' : 'them'
          } : null,
          unreadCount,
          updatedAt: conv.updatedAt
        };
      });

      return NextResponse.json({
        success: true,
        conversations: conversationsWithMeta
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

    await connectDB();

    let conversation;

    if (conversationId) {
      // Find existing conversation
      conversation = await Conversation.findById(conversationId);
      
      if (!conversation) {
        return NextResponse.json(
          { message: 'Conversation not found' },
          { status: 404 }
        );
      }

      // Check if user is participant
      const isParticipant = conversation.participants.some(
        p => p.toString() === session.user.id
      );

      if (!isParticipant) {
        return NextResponse.json(
          { message: 'Access denied' },
          { status: 403 }
        );
      }
    } else if (recipientId) {
      // Create new conversation or find existing one
      const existingConversation = await Conversation.findOne({
        participants: { $all: [session.user.id, recipientId] },
        ...(jobId && { relatedJob: jobId })
      });

      if (existingConversation) {
        conversation = existingConversation;
      } else {
        // Verify recipient exists
        const recipient = await User.findById(recipientId);
        if (!recipient) {
          return NextResponse.json(
            { message: 'Recipient not found' },
            { status: 404 }
          );
        }

        // Create new conversation
        conversation = new Conversation({
          participants: [session.user.id, recipientId],
          relatedJob: jobId || null,
          messages: [],
          createdAt: new Date(),
          updatedAt: new Date()
        });
      }
    } else {
      return NextResponse.json(
        { message: 'Either conversationId or recipientId is required' },
        { status: 400 }
      );
    }

    // Create new message
    const newMessage = {
      sender: session.user.id,
      content: content.trim(),
      messageType,
      timestamp: new Date(),
      readBy: {
        [session.user.id]: new Date()
      },
      edited: false,
      editedAt: null
    };

    // Add message to conversation
    conversation.messages.push(newMessage);
    conversation.updatedAt = new Date();

    await conversation.save();

    // Populate the new message for response
    const populatedConversation = await Conversation.findById(conversation._id)
      .populate('messages.sender', 'name username photoURL')
      .lean();

    const savedMessage = populatedConversation.messages[populatedConversation.messages.length - 1];

    // Here you would emit the message via WebSocket to other participants
    // For now, we'll implement a simple polling-based approach
    
    // Create notification for recipient
    const notificationRecipientId = conversation.participants.find(
      p => p.toString() !== session.user.id
    );

    if (notificationRecipientId) {
      try {
        await fetch(`${process.env.NEXTAUTH_URL}/api/user/notifications`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userId: notificationRecipientId,
            type: 'message',
            title: 'New Message',
            message: `${session.user.name} sent you a message`,
            actionUrl: `/dashboard/messages?conversation=${conversation._id}`,
            data: {
              conversationId: conversation._id,
              senderId: session.user.id,
              senderName: session.user.name
            }
          }),
        });
      } catch (error) {
        console.error('Failed to create notification:', error);
        // Don't fail the message sending if notification fails
      }
    }

    return NextResponse.json({
      success: true,
      message: savedMessage,
      conversationId: conversation._id
    });

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

    await connectDB();

    await Conversation.updateOne(
      { 
        _id: conversationId,
        participants: session.user.id
      },
      {
        $set: {
          [`messages.$[elem].readBy.${session.user.id}`]: new Date()
        }
      },
      {
        arrayFilters: [{ 'elem.sender': { $ne: session.user.id } }]
      }
    );

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