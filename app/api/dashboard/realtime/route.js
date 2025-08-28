import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('fixly');
}

// Store active connections
const dashboardConnections = new Map();

export async function GET(request) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userId = session.user.id;

    // Set up SSE headers
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control'
    });

    // Create ReadableStream for SSE
    const stream = new ReadableStream({
      start(controller) {
        const connectionId = Date.now().toString();
        
        // Store connection
        dashboardConnections.set(connectionId, {
          userId,
          controller,
          lastPing: Date.now()
        });

        console.log(`Dashboard SSE connected for user ${userId}`);

        // Send initial connection message
        const welcomeMessage = {
          type: 'connection',
          payload: {
            message: 'Dashboard connection established',
            timestamp: new Date().toISOString()
          }
        };

        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(welcomeMessage)}\n\n`)
        );

        // Set up periodic ping to keep connection alive
        const pingInterval = setInterval(() => {
          try {
            const connection = dashboardConnections.get(connectionId);
            if (!connection) {
              clearInterval(pingInterval);
              return;
            }

            // Send ping
            const pingMessage = {
              type: 'ping',
              payload: { timestamp: new Date().toISOString() }
            };

            controller.enqueue(
              new TextEncoder().encode(`data: ${JSON.stringify(pingMessage)}\n\n`)
            );

            connection.lastPing = Date.now();
            
          } catch (error) {
            console.error('Dashboard ping error:', error);
            clearInterval(pingInterval);
            dashboardConnections.delete(connectionId);
          }
        }, 30000); // 30 second ping

        // Clean up on close
        request.signal.addEventListener('abort', () => {
          console.log(`Dashboard SSE disconnected for user ${userId}`);
          clearInterval(pingInterval);
          dashboardConnections.delete(connectionId);
          controller.close();
        });

        // Send real-time updates based on database changes
        setupDashboardUpdates(userId, controller);
      }
    });

    return new Response(stream, { headers });

  } catch (error) {
    console.error('Dashboard SSE error:', error);
    return NextResponse.json(
      { error: 'Failed to establish dashboard connection' },
      { status: 500 }
    );
  }
}

// Set up dashboard updates (mock implementation - would use MongoDB change streams in production)
async function setupDashboardUpdates(userId, controller) {
  try {
    const db = await connectToDatabase();
    
    // Simulate real-time updates every 30 seconds with fresh data
    const updateInterval = setInterval(async () => {
      try {
        // Fetch latest stats
        const jobs = await db.collection('jobs').countDocuments({ userId });
        const applications = await db.collection('applications').countDocuments({ userId });
        const pendingApplications = await db.collection('applications').countDocuments({ 
          userId, 
          status: 'pending' 
        });

        // Send stats update
        const statsUpdate = {
          type: 'stats_update',
          payload: {
            totalJobs: jobs,
            totalApplications: applications,
            pendingApplications: pendingApplications,
            timestamp: new Date().toISOString()
          }
        };

        controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(statsUpdate)}\n\n`)
        );

        // Check for new activities (last 5 minutes)
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentActivities = await db.collection('activities')
          .find({ 
            userId, 
            createdAt: { $gte: fiveMinutesAgo } 
          })
          .sort({ createdAt: -1 })
          .limit(5)
          .toArray();

        // Send new activities
        for (const activity of recentActivities) {
          const activityUpdate = {
            type: 'new_activity',
            payload: {
              id: activity._id,
              type: activity.type,
              title: activity.title,
              description: activity.description,
              timestamp: activity.createdAt,
              icon: getActivityIcon(activity.type)
            }
          };

          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(activityUpdate)}\n\n`)
          );
        }

        // Check for job alerts
        const jobAlerts = await db.collection('jobs')
          .find({
            isActive: true,
            createdAt: { $gte: fiveMinutesAgo },
            // Add job matching logic based on user preferences
          })
          .sort({ createdAt: -1 })
          .limit(3)
          .toArray();

        for (const job of jobAlerts) {
          const alertUpdate = {
            type: 'new_job_alert',
            payload: {
              id: job._id,
              title: job.title,
              budget: job.budget,
              location: job.location,
              timestamp: job.createdAt
            }
          };

          controller.enqueue(
            new TextEncoder().encode(`data: ${JSON.stringify(alertUpdate)}\n\n`)
          );
        }

      } catch (updateError) {
        console.error('Dashboard update error:', updateError);
      }
    }, 30000); // Update every 30 seconds

    // Clean up interval when connection closes
    const cleanup = () => {
      clearInterval(updateInterval);
    };

    // Store cleanup function (in a real implementation, you'd handle this better)
    setTimeout(cleanup, 300000); // Clean up after 5 minutes of no activity

  } catch (error) {
    console.error('Error setting up dashboard updates:', error);
  }
}

// Get activity icon based on type
function getActivityIcon(type) {
  const icons = {
    'application': '📋',
    'job_created': '💼',
    'job_completed': '✅',
    'message': '💬',
    'payment': '💰',
    'review': '⭐',
    'profile_update': '👤',
    'system': '🔧'
  };
  
  return icons[type] || '📋';
}

// Broadcast update to specific user's dashboard
export function broadcastDashboardUpdate(userId, update) {
  for (const [connectionId, connection] of dashboardConnections) {
    if (connection.userId === userId) {
      try {
        connection.controller.enqueue(
          new TextEncoder().encode(`data: ${JSON.stringify(update)}\n\n`)
        );
      } catch (error) {
        console.error('Error broadcasting dashboard update:', error);
        dashboardConnections.delete(connectionId);
      }
    }
  }
}

// Cleanup inactive connections
setInterval(() => {
  const now = Date.now();
  for (const [connectionId, connection] of dashboardConnections) {
    if (now - connection.lastPing > 60000) { // 1 minute timeout
      console.log(`Cleaning up inactive dashboard connection: ${connectionId}`);
      dashboardConnections.delete(connectionId);
    }
  }
}, 60000); // Check every minute