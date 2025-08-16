// app/api/socket/route.js - Socket.io integration for Next.js App Router
import { NextResponse } from 'next/server';
import { Server } from 'socket.io';
import { createServer } from 'http';
import { initializeSocket } from '../../../lib/socket';

// Global variable to store the HTTP server
let httpServer;
let ioServer;

export async function GET(request) {
  if (!ioServer) {
    try {
      // Create HTTP server for Socket.io
      httpServer = createServer();
      
      // Initialize Socket.io
      ioServer = initializeSocket(httpServer);
      
      // Start the HTTP server on a different port for Socket.io
      const socketPort = process.env.SOCKET_PORT || 3001;
      httpServer.listen(socketPort, () => {
        console.log(`🚀 Socket.io server running on port ${socketPort}`);
      });

      return NextResponse.json({ 
        success: true,
        message: 'Socket.io server initialized',
        port: socketPort
      });
    } catch (error) {
      console.error('❌ Socket.io initialization error:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to initialize Socket.io server',
        error: error.message
      }, { status: 500 });
    }
  }

  return NextResponse.json({ 
    success: true,
    message: 'Socket.io server already running',
    port: process.env.SOCKET_PORT || 3001
  });
}

export async function POST(request) {
  try {
    const { event, data, room, userId } = await request.json();

    if (!ioServer) {
      return NextResponse.json({
        success: false,
        message: 'Socket.io server not initialized'
      }, { status: 500 });
    }

    // Emit event based on target
    if (room) {
      ioServer.to(room).emit(event, data);
    } else if (userId) {
      ioServer.to(`user:${userId}`).emit(event, data);
    } else {
      ioServer.emit(event, data);
    }

    return NextResponse.json({
      success: true,
      message: 'Event emitted successfully'
    });
  } catch (error) {
    console.error('❌ Socket.io emit error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to emit event',
      error: error.message
    }, { status: 500 });
  }
}

// Helper function to emit events from other API routes
export async function emitSocketEvent(event, data, target = {}) {
  try {
    const response = await fetch(`${process.env.NEXTAUTH_URL}/api/socket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
        ...target
      })
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Failed to emit socket event:', error);
    return false;
  }
}