// Main SSE connection endpoint - Production grade
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getToken } from 'next-auth/jwt';
import realtimeManager from '../../../../lib/realtime/RealtimeManager.js';
import connectDB from '../../../../lib/db.js';
import User from '../../../../models/User.js';
import { rateLimit } from '../../../../utils/rateLimiting.js';

// Validate session token and user
async function validateSessionToken(request, userId, sessionToken) {
  try {
    // Method 1: Validate using NextAuth JWT token
    if (sessionToken) {
      const token = await getToken({
        req: { headers: { authorization: `Bearer ${sessionToken}` } },
        secret: process.env.NEXTAUTH_SECRET
      });
      
      if (token && token.sub === userId) {
        return { valid: true, user: token };
      }
    }

    // Method 2: Validate using session from headers
    const session = await getServerSession(authOptions);
    if (session && session.user.id === userId) {
      return { valid: true, user: session.user };
    }

    // Method 3: Check database session if custom session management
    await connectDB();
    const user = await User.findById(userId).select('lastLoginAt sessionToken');
    if (user && user.sessionToken === sessionToken) {
      // Check if session is not expired (24 hours)
      const sessionAge = Date.now() - new Date(user.lastLoginAt).getTime();
      if (sessionAge < 24 * 60 * 60 * 1000) {
        return { valid: true, user: { id: userId, name: user.name } };
      }
    }

    return { valid: false, error: 'Invalid or expired session' };
  } catch (error) {
    console.error('Session validation error:', error);
    return { valid: false, error: 'Session validation failed' };
  }
}

export async function GET(request) {
  try {
    // Apply rate limiting for realtime connections
    const rateLimitResult = await rateLimit(request, 'realtime_connect', 10, 60 * 1000);
    if (!rateLimitResult.success) {
      return new Response('Too many connection attempts', { status: 429 });
    }

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sessionToken = searchParams.get('token');
    
    // Validate required parameters
    if (!userId) {
      return new Response(JSON.stringify({ 
        error: 'User ID required',
        code: 'MISSING_USER_ID' 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Validate session token
    const validation = await validateSessionToken(request, userId, sessionToken);
    if (!validation.valid) {
      console.warn(`🔒 Invalid session attempt for user ${userId}: ${validation.error}`);
      return new Response(JSON.stringify({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION',
        details: validation.error 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  
    console.log(`🔗 Validated SSE connection request from user: ${userId} (${validation.user.name || validation.user.username || 'Unknown'})`);
  
  // Create SSE stream
  const stream = new ReadableStream({
    start(controller) {
      let sessionId;
      
      try {
        // Create response writer
        const response = {
          write: (data) => {
            try {
              if (controller.desiredSize !== null && controller.desiredSize > 0) {
                controller.enqueue(data);
                return true;
              }
              return false;
            } catch (error) {
              console.error('Error writing to SSE stream:', error);
              return false;
            }
          },
          destroyed: false
        };
        
        // Add connection to realtime manager
        sessionId = realtimeManager.addConnection(userId, response);
        
        // Send initial connection success message with user context
        response.write(`data: ${JSON.stringify({
          type: 'connection',
          status: 'connected',
          sessionId,
          userId,
          user: {
            id: userId,
            name: validation.user.name || validation.user.username,
            authenticated: true
          },
          timestamp: Date.now(),
          features: ['notifications', 'messages', 'presence', 'job_updates'],
          serverTime: new Date().toISOString()
        })}\n\n`);
        
        console.log(`✅ SSE connection established: ${sessionId}`);
        
      } catch (error) {
        console.error('Error establishing SSE connection:', error);
        controller.error(error);
        return;
      }
      
      // Handle disconnect
      const cleanup = () => {
        try {
          if (sessionId) {
            realtimeManager.removeConnection(sessionId);
            console.log(`🔌 SSE connection closed: ${sessionId}`);
          }
          
          if (!controller.desiredSize === null) {
            controller.close();
          }
        } catch (error) {
          console.error('Error during SSE cleanup:', error);
        }
      };
      
      // Listen for client disconnect
      request.signal?.addEventListener('abort', cleanup);
      
      // Auto cleanup after 2 hours
      setTimeout(() => {
        console.log(`⏰ Auto-closing SSE connection: ${sessionId}`);
        cleanup();
      }, 2 * 60 * 60 * 1000);
    },
    
    cancel(reason) {
      console.log('SSE stream cancelled:', reason);
    }
  });
  
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': process.env.NODE_ENV === 'production' ? process.env.NEXTAUTH_URL : '*',
        'Access-Control-Allow-Headers': 'Cache-Control, Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Credentials': 'true',
        'X-Accel-Buffering': 'no', // Disable Nginx buffering
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY'
      }
    });
  } catch (error) {
    console.error('Realtime connection error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      code: 'CONNECTION_FAILED'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}