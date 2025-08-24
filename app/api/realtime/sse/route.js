// Simple Server-Sent Events for real-time updates
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  
  // Create SSE response
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const send = (data) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };
      
      send({ type: 'connected', userId, timestamp: Date.now() });
      
      // Simulate real-time updates
      const interval = setInterval(() => {
        send({
          type: 'heartbeat',
          timestamp: Date.now(),
          onlineUsers: Math.floor(Math.random() * 100)
        });
      }, 30000);
      
      // Handle cleanup
      request.signal?.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    }
  });
}