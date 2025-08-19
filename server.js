// server.js - Custom Next.js server with Socket.io
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { initializeSocket } = require('./lib/socket');

// Add global error handlers to prevent crashes
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  if (error.message.includes('Redis') || error.message.includes('Socket') || error.message.includes('SocketClosedUnexpectedlyError')) {
    console.log('🔄 Redis/Socket error handled, server continuing...');
    // Don't exit for Redis/Socket errors, just log them
  } else {
    console.error('💥 Critical error, shutting down:', error);
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  if (reason && (reason.message?.includes('Redis') || reason.message?.includes('Socket'))) {
    console.log('🔄 Redis/Socket promise rejection handled, server continuing...');
    // Don't exit for Redis/Socket promise rejections
  }
});

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

// When using middleware `hostname` and `port` must be provided below
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const server = createServer(async (req, res) => {
    try {
      // Be sure to pass `true` as the second argument to `url.parse`.
      // This tells it to parse the query portion of the URL.
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Initialize Socket.io with timeout fallback
  let io;
  try {
    io = await Promise.race([
      initializeSocket(server),
      new Promise((resolve) => 
        setTimeout(() => {
          console.warn('⚠️ Socket.io initialization timed out, continuing with basic setup');
          resolve(null);
        }, 15000)
      )
    ]);
  } catch (error) {
    console.error('❌ Socket.io initialization failed:', error.message);
    console.log('🔄 Server will continue without Socket.io');
    io = null;
  }
  
  // Health check endpoint
  server.on('request', (req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        socketConnections: io?.engine?.clientsCount || 0,
        socketInitialized: !!io,
        timestamp: new Date().toISOString()
      }));
      return;
    }
  });

  server
    .once('error', (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`🚀 Server ready on http://${hostname}:${port}`);
      if (io) {
        console.log(`🔌 Socket.io server initialized successfully`);
      } else {
        console.log(`⚠️ Server running without Socket.io (initialization failed)`);
      }
    });
});