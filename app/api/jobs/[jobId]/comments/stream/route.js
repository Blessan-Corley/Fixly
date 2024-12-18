// app/api/jobs/[jobId]/comments/stream/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import Job from '@/models/Job';

// Global storage for SSE connections
const connections = new Map();

export async function GET(request, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.id) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    const { jobId } = params;
    if (!jobId) {
      return NextResponse.json(
        { message: 'Job ID required' },
        { status: 400 }
      );
    }

    // Create SSE stream
    const stream = new ReadableStream({
      start(controller) {
        console.log(`📡 SSE connection opened for job ${jobId} by user ${session.user.id}`);
        
        // Store connection
        const connectionId = `${jobId}-${session.user.id}-${Date.now()}`;
        connections.set(connectionId, {
          controller,
          jobId,
          userId: session.user.id,
          lastSent: Date.now()
        });

        // Send initial connection message
        const data = JSON.stringify({
          type: 'connected',
          message: 'Real-time comments connected',
          timestamp: new Date().toISOString()
        });
        controller.enqueue(`data: ${data}\n\n`);

        // Set up interval to send comment updates
        const interval = setInterval(async () => {
          try {
            await connectDB();
            const job = await Job.findById(jobId)
              .select('comments updatedAt')
              .populate([
                {
                  path: 'comments.author',
                  select: 'name username photoURL role'
                },
                {
                  path: 'comments.replies.author',
                  select: 'name username photoURL role'
                }
              ])
              .lean();

            if (job) {
              const updateData = JSON.stringify({
                type: 'comments_update',
                comments: job.comments || [],
                lastUpdated: job.updatedAt,
                timestamp: new Date().toISOString()
              });
              
              controller.enqueue(`data: ${updateData}\n\n`);
            }
          } catch (error) {
            console.error('❌ SSE interval error:', error);
          }
        }, 2000); // Update every 2 seconds

        // Cleanup on close
        request.signal.addEventListener('abort', () => {
          console.log(`📡 SSE connection closed for job ${jobId}`);
          clearInterval(interval);
          connections.delete(connectionId);
        });
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'Access-Control-Allow-Headers': 'Cache-Control'
      }
    });

  } catch (error) {
    console.error('❌ SSE setup error:', error);
    return NextResponse.json(
      { message: 'Failed to setup real-time connection' },
      { status: 500 }
    );
  }
}

// Broadcast update to all connections for a job
export function broadcastToJob(jobId, data) {
  connections.forEach((connection, connectionId) => {
    if (connection.jobId === jobId) {
      try {
        const message = JSON.stringify({
          type: 'broadcast',
          data,
          timestamp: new Date().toISOString()
        });
        connection.controller.enqueue(`data: ${message}\n\n`);
      } catch (error) {
        console.error('❌ Broadcast error:', error);
        connections.delete(connectionId);
      }
    }
  });
}