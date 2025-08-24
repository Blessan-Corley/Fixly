// Main SSE connection endpoint - Production grade
import realtimeManager from '../../../../lib/realtime/RealtimeManager.js';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const sessionToken = searchParams.get('token');
  
  // Validate required parameters
  if (!userId) {
    return new Response('User ID required', { status: 400 });
  }
  
  // TODO: Validate session token
  // if (!sessionToken || !validateToken(sessionToken, userId)) {
  //   return new Response('Invalid session token', { status: 401 });
  // }
  
  console.log(`🔗 SSE connection request from user: ${userId}`);
  
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
        
        // Send initial connection success message
        response.write(`data: ${JSON.stringify({
          type: 'connection',
          status: 'connected',
          sessionId,
          userId,
          timestamp: Date.now(),
          features: ['notifications', 'messages', 'presence', 'job_updates']
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
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control, Content-Type',
      'Access-Control-Allow-Methods': 'GET',
      'X-Accel-Buffering': 'no' // Disable Nginx buffering
    }
  });
}