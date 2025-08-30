// System Status Monitoring API - Comprehensive platform health check
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/utils/rateLimiting';
import { addSecurityHeaders } from '@/utils/validation';
import connectDB from '@/lib/db';
import { redisHealthCheck } from '@/lib/cache';
import razorpayService from '@/lib/razorpay';
import realtimeManager from '@/lib/realtime/RealtimeManager';

export const dynamic = 'force-dynamic';

// GET /api/system/status - Comprehensive system status
export async function GET(request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'system_status', 100, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many status requests' },
        { status: 429 }
      );
    }

    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';
    const includeMetrics = searchParams.get('metrics') === 'true';

    // Check if requesting user is admin for detailed info
    const session = await getServerSession(authOptions);
    const isAdmin = session?.user?.role === 'admin';

    const status = await getSystemStatus(detailed && isAdmin, includeMetrics && isAdmin);

    const response = NextResponse.json({
      success: true,
      status: status.overall,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      ...status
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('System status error:', error);
    const response = NextResponse.json(
      {
        success: false,
        status: 'error',
        message: 'Failed to get system status',
        timestamp: new Date().toISOString(),
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// GET /api/system/status/realtime - Real-time status updates via SSE
export async function POST(request) {
  try {
    const rateLimitResult = await rateLimit(request, 'status_realtime', 10, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many real-time requests' },
        { status: 429 }
      );
    }

    // Authentication required for real-time status
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    // Only admins can access real-time system status
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    // Create SSE response for real-time status updates
    const stream = new ReadableStream({
      start(controller) {
        const sendStatus = async () => {
          try {
            const status = await getSystemStatus(true, true);
            const data = `data: ${JSON.stringify({
              ...status,
              timestamp: new Date().toISOString()
            })}\n\n`;
            controller.enqueue(data);
          } catch (error) {
            controller.enqueue(`data: ${JSON.stringify({
              error: 'Status update failed',
              timestamp: new Date().toISOString()
            })}\n\n`);
          }
        };

        // Send initial status
        sendStatus();

        // Send updates every 10 seconds
        const interval = setInterval(sendStatus, 10000);

        // Cleanup on close
        const cleanup = () => {
          clearInterval(interval);
          controller.close();
        };

        // Handle cleanup
        setTimeout(cleanup, 300000); // Auto-close after 5 minutes
        
        return cleanup;
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('Real-time status error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to start real-time status' },
      { status: 500 }
    );
  }
}

// Get comprehensive system status
async function getSystemStatus(detailed = false, includeMetrics = false) {
  const checks = {
    database: await checkDatabaseStatus(),
    redis: await checkRedisStatus(),
    payments: await checkPaymentStatus(),
    realtime: await checkRealtimeStatus(),
    storage: await checkStorageStatus(),
    external: await checkExternalServices()
  };

  // Calculate overall status
  const statuses = Object.values(checks).map(check => check.status);
  const overall = statuses.every(s => s === 'healthy') ? 'healthy' :
                 statuses.some(s => s === 'error') ? 'error' : 'warning';

  const result = {
    overall,
    services: checks
  };

  if (detailed) {
    result.system = await getSystemMetrics();
    result.performance = await getPerformanceMetrics();
  }

  if (includeMetrics) {
    result.metrics = await getDetailedMetrics();
  }

  return result;
}

// Database status check
async function checkDatabaseStatus() {
  try {
    const start = Date.now();
    await connectDB();
    
    // Test a simple query
    const mongoose = require('mongoose');
    await mongoose.connection.db.admin().ping();
    
    const responseTime = Date.now() - start;
    
    return {
      status: responseTime < 1000 ? 'healthy' : 'warning',
      responseTime,
      connected: true,
      readyState: mongoose.connection.readyState,
      host: mongoose.connection.host,
      name: mongoose.connection.name
    };
    
  } catch (error) {
    return {
      status: 'error',
      connected: false,
      error: error.message,
      responseTime: null
    };
  }
}

// Redis status check
async function checkRedisStatus() {
  try {
    const start = Date.now();
    const healthCheck = await redisHealthCheck();
    const responseTime = Date.now() - start;
    
    return {
      status: healthCheck.connected ? 'healthy' : 'error',
      connected: healthCheck.connected,
      responseTime,
      version: healthCheck.version,
      memory: healthCheck.memory
    };
    
  } catch (error) {
    return {
      status: 'error',
      connected: false,
      error: error.message,
      responseTime: null
    };
  }
}

// Payment service status check
async function checkPaymentStatus() {
  try {
    const isConfigured = razorpayService.isConfigured();
    
    if (!isConfigured) {
      return {
        status: 'warning',
        configured: false,
        message: 'Payment service not configured'
      };
    }

    // Test basic payment service connectivity
    // Note: This would require a test API call to Razorpay
    return {
      status: 'healthy',
      configured: true,
      provider: 'razorpay'
    };
    
  } catch (error) {
    return {
      status: 'error',
      configured: false,
      error: error.message
    };
  }
}

// Real-time service status check
async function checkRealtimeStatus() {
  try {
    const stats = realtimeManager.getStats();
    
    return {
      status: 'healthy',
      connections: stats.onlineUsers,
      rooms: stats.totalRooms,
      queuedMessages: stats.queuedMessages,
      averageRoomSize: Math.round(stats.averageRoomSize * 100) / 100
    };
    
  } catch (error) {
    return {
      status: 'error',
      error: error.message,
      connections: 0
    };
  }
}

// Storage status check
async function checkStorageStatus() {
  try {
    // Check if Cloudinary is configured
    const cloudinaryConfigured = !!(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    );
    
    return {
      status: cloudinaryConfigured ? 'healthy' : 'warning',
      cloudinary: {
        configured: cloudinaryConfigured,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'missing'
      }
    };
    
  } catch (error) {
    return {
      status: 'error',
      error: error.message
    };
  }
}

// External services status check
async function checkExternalServices() {
  const services = {
    googleMaps: {
      configured: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
      status: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ? 'healthy' : 'warning'
    },
    firebase: {
      configured: !!(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ),
      status: !!(
        process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY
      ) ? 'healthy' : 'warning'
    }
  };

  const overall = Object.values(services).every(s => s.status === 'healthy') ? 'healthy' : 'warning';

  return {
    status: overall,
    services
  };
}

// System metrics
async function getSystemMetrics() {
  return {
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external: Math.round(process.memoryUsage().external / 1024 / 1024)
    },
    cpu: {
      usage: process.cpuUsage(),
      loadAverage: require('os').loadavg()
    },
    uptime: process.uptime(),
    version: process.version,
    platform: process.platform,
    arch: process.arch
  };
}

// Performance metrics
async function getPerformanceMetrics() {
  return {
    responseTime: {
      database: await measureDatabaseResponseTime(),
      redis: await measureRedisResponseTime()
    },
    throughput: {
      // These would be measured over time in a real implementation
      requestsPerSecond: 0,
      errorsPerSecond: 0
    }
  };
}

// Detailed metrics for admin dashboard
async function getDetailedMetrics() {
  try {
    // This would typically come from a metrics collection service
    return {
      requests: {
        total: 0, // Would be tracked in middleware
        successful: 0,
        failed: 0,
        averageResponseTime: 0
      },
      users: {
        online: realtimeManager.getStats().onlineUsers,
        totalSessions: 0
      },
      errors: {
        count: 0,
        types: {}
      }
    };
    
  } catch (error) {
    return {
      error: 'Failed to collect detailed metrics'
    };
  }
}

// Helper functions for measuring response times
async function measureDatabaseResponseTime() {
  try {
    const start = Date.now();
    await connectDB();
    const mongoose = require('mongoose');
    await mongoose.connection.db.admin().ping();
    return Date.now() - start;
  } catch (error) {
    return -1;
  }
}

async function measureRedisResponseTime() {
  try {
    const start = Date.now();
    await redisHealthCheck();
    return Date.now() - start;
  } catch (error) {
    return -1;
  }
}