// server.js - Simple Next.js server without Socket.io complexity
const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT, 10) || 3000;

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Simple health check
  server.on('request', (req, res) => {
    if (req.url === '/api/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok',
        realtime: 'sse',
        timestamp: new Date().toISOString()
      }));
      return;
    }
  });

  server.listen(port, () => {
    console.log(`🚀 Simple server ready on http://${hostname}:${port}`);
    console.log(`📡 Real-time: Server-Sent Events (SSE)`);
  });
});