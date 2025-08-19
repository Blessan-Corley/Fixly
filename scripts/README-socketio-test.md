# Socket.io Live Test Script

This script tests Socket.io functionality with your live Fixly application running on `localhost:3000`.

## Prerequisites

1. **Start your Fixly server first:**
   ```bash
   npm run dev
   ```

2. **Environment variables:**
   - Make sure `NEXTAUTH_SECRET` is set in your `.env.local` file
   - This is required for authentication token generation

## Usage

### Option 1: NPM Script (Recommended)
```bash
npm run test:socketio
```

### Option 2: Direct Node Execution
```bash
node scripts/test-socketio-live.js
```

## What the Test Does

The script performs comprehensive testing of Socket.io functionality:

1. **🔗 Connection Test**
   - Connects to Socket.io server at `http://localhost:3000`
   - Uses WebSocket transport with polling fallback

2. **🔑 Authentication Test**
   - Generates a valid JWT token using `NEXTAUTH_SECRET`
   - Tests the authentication middleware

3. **🏠 Room Management Test**
   - Tests joining job-specific rooms (`job:${jobId}`)
   - Tests joining message rooms (`messages:${jobId}`)
   - Tests leaving rooms

4. **💬 Real-time Messaging Test**
   - Emits `message:send` events
   - Listens for `message:new` responses
   - Tests message broadcasting

5. **⌨️ Typing Indicators Test**
   - Tests `typing:start` and `typing:stop` events
   - Verifies real-time typing notifications

6. **📋 Job Updates Test**
   - Tests `job:update` events
   - Listens for `job:updated` broadcasts

7. **🔔 Notifications Test**
   - Tests `notification:send` events
   - Listens for `notification:new` responses

8. **👤 Presence/Status Test**
   - Tests user online/away status updates
   - Verifies presence broadcasting

9. **🔌 Disconnection Test**
   - Tests graceful disconnection handling

## Test Output

The script provides detailed output showing:
- ✅ Successful operations
- ❌ Failed operations  
- 📊 Final summary with pass/fail counts
- 🚨 Critical failure warnings
- 💡 Troubleshooting tips

## Troubleshooting

### Connection Failed
- Ensure Fixly server is running: `npm run dev`
- Check if port 3000 is available
- Verify no firewall blocking localhost connections

### Authentication Failed
- Check that `NEXTAUTH_SECRET` is set in `.env.local`
- Ensure the secret matches what's used by your Next.js app
- Verify JWT token generation is working

### Feature Tests Failing
- Check server console for Socket.io errors
- Verify Socket.io middleware is properly configured
- Ensure Redis (if configured) is accessible

## Notes

- The test uses a mock user ID (`test-user-123`) for testing
- No real data is modified during testing
- Tests timeout after 10 seconds for safety
- The script gracefully handles interruptions (Ctrl+C)

## Integration with CI/CD

You can include this test in your automated testing pipeline:

```bash
# Start server in background
npm run dev &
SERVER_PID=$!

# Wait for server to start
sleep 5

# Run Socket.io tests
npm run test:socketio

# Cleanup
kill $SERVER_PID
```