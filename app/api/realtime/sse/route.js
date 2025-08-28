// Simple Server-Sent Events for real-time updates
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';

export async function GET(request) {
  // SECURITY: Verify authentication
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  // SECURITY: Verify userId matches session
  if (userId && userId !== session.user.id) {
    return new Response('Forbidden', { status: 403 });
  }
  
  const authenticatedUserId = session.user.id;
  
  // Import realtime manager
  const { default: realtimeManager } = await import('../../../../lib/realtime/RealtimeManager.js');
  
  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      // Register connection with realtime manager
      realtimeManager.addConnection(authenticatedUserId, { controller });
      
      // Send initial connection message
      const send = (data) => {
        try {
          controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
        } catch (error) {
          console.error('SSE send error:', error);
        }
      };
      
      // Initial connection confirmation
      send({ 
        type: 'connected', 
        userId: authenticatedUserId, 
        timestamp: Date.now(),
        stats: realtimeManager.getStats()
      });
      
      // Heartbeat to keep connection alive and provide stats
      const heartbeatInterval = setInterval(() => {
        if (controller.desiredSize !== null) {
          send({
            type: 'heartbeat',
            timestamp: Date.now(),
            stats: realtimeManager.getStats()
          });
          
          // Update user activity
          realtimeManager.updateUserActivity(authenticatedUserId);
        } else {
          clearInterval(heartbeatInterval);
        }
      }, 30000);
      
      // Handle cleanup
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        realtimeManager.removeConnection(authenticatedUserId);
        try {
          controller.close();
        } catch (e) {
          // Controller might already be closed
        }
      };
      
      request.signal?.addEventListener('abort', cleanup);
      
      // Also handle connection errors
      controller.addEventListener?.('error', cleanup);
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : process.env.NEXTAUTH_URL
    }
  });
}