// app/api/socket/status/route.js - Socket.io status endpoint
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Check health endpoint to get socket status
    const response = await fetch('http://localhost:3000/api/health');
    if (response.ok) {
      const health = await response.json();
      return NextResponse.json({
        success: true,
        socketInitialized: health.socketInitialized,
        connections: health.socketConnections,
        timestamp: health.timestamp
      });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Unable to check socket status'
    }, { status: 500 });
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Socket status check failed',
      error: error.message
    }, { status: 500 });
  }
}