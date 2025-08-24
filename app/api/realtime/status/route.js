// Real-time system status
import realtimeManager from '../../../../lib/realtime';

export async function GET() {
  return Response.json({
    success: true,
    data: {
      system: 'Server-Sent Events (SSE)',
      onlineUsers: realtimeManager.getOnlineUsersCount(),
      users: realtimeManager.getOnlineUsers(),
      status: 'healthy',
      timestamp: new Date().toISOString()
    }
  });
}