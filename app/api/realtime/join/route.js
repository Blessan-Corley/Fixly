// Join real-time room API
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import realtimeManager from '../../../../lib/realtime/RealtimeManager';
import { rateLimit } from '../../../../utils/rateLimiting';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'room_join', 20, 60 * 1000); // 20 per minute
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many room join attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const { roomId, userId: providedUserId } = await request.json();

    if (!roomId) {
      return NextResponse.json(
        { error: 'roomId is required' },
        { status: 400 }
      );
    }

    // Security: Only allow joining with own user ID
    const userId = session.user.id;
    if (providedUserId && providedUserId !== userId) {
      return NextResponse.json(
        { error: 'Can only join rooms with your own user ID' },
        { status: 403 }
      );
    }

    // Validate room access permissions
    const hasAccess = await validateRoomAccess(userId, roomId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Access denied to this room' },
        { status: 403 }
      );
    }

    // Join the room
    const success = realtimeManager.joinRoom(userId, roomId);

    if (success) {
      return NextResponse.json({
        success: true,
        message: `Joined room ${roomId}`,
        data: {
          roomId,
          userId,
          timestamp: Date.now()
        }
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to join room. User may not be connected.' },
        { status: 400 }
      );
    }

  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Validate if user has access to a room
async function validateRoomAccess(userId, roomId) {
  try {
    // Parse room type from roomId
    const [roomType, ...roomIdParts] = roomId.split('_');
    const actualRoomId = roomIdParts.join('_');

    switch (roomType) {
      case 'conversation':
        // Check if user is part of the conversation
        return await validateConversationAccess(userId, actualRoomId);
        
      case 'job':
        // Check if user can view the job
        return await validateJobAccess(userId, actualRoomId);
        
      case 'user':
        // Check if user is viewing their own profile or has permission
        return actualRoomId === userId || await validateUserProfileAccess(userId, actualRoomId);
        
      case 'general':
        // General rooms like notifications - all authenticated users can join
        return true;
        
      default:
        return false;
    }
  } catch (error) {
    console.error('Error validating room access:', error);
    return false;
  }
}

async function validateConversationAccess(userId, conversationId) {
  try {
    // Import models dynamically to avoid circular dependencies
    const { default: connectDB } = await import('../../../../lib/mongodb');
    await connectDB();
    
    // For now, assume conversation ID contains both user IDs
    // In a real implementation, you'd check the conversation table
    const conversationUserIds = conversationId.split('-');
    return conversationUserIds.includes(userId);
  } catch (error) {
    console.error('Error validating conversation access:', error);
    return false;
  }
}

async function validateJobAccess(userId, jobId) {
  try {
    const { default: connectDB } = await import('../../../../lib/mongodb');
    const { default: Job } = await import('../../../../models/Job');
    
    await connectDB();
    
    const job = await Job.findById(jobId).select('createdBy status applications.fixerId');
    if (!job) return false;
    
    // Allow access if:
    // 1. User is the job creator
    // 2. Job is open/public
    // 3. User has applied to the job
    return (
      job.createdBy.toString() === userId ||
      ['open', 'in_progress', 'completed'].includes(job.status) ||
      job.applications.some(app => app.fixerId.toString() === userId)
    );
  } catch (error) {
    console.error('Error validating job access:', error);
    return false;
  }
}

async function validateUserProfileAccess(userId, profileUserId) {
  try {
    const { default: connectDB } = await import('../../../../lib/mongodb');
    const { default: User } = await import('../../../../models/User');
    
    await connectDB();
    
    const user = await User.findById(profileUserId).select('privacy.profileVisibility');
    if (!user) return false;
    
    // Check privacy settings
    return user.privacy?.profileVisibility === 'public';
  } catch (error) {
    console.error('Error validating user profile access:', error);
    return false;
  }
}