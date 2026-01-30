# Fixly

Fixly is an on-demand service marketplace connecting hirers with skilled professionals. This platform facilitates job management, real-time applications, and location-based matching through a scalable architecture.

## Technology Stack

*   **Core Framework:** Next.js 14
*   **Database:** MongoDB (Mongoose)
*   **Caching & Rate Limiting:** Redis (Upstash)
*   **Real-time Infrastructure:** Ably
*   **Authentication:** NextAuth.js
*   **Styling:** Tailwind CSS

## Prerequisites

Ensure the following are installed:
*   Node.js (v18 or higher)
*   npm

## Configuration

Configure the application by creating a `.env.local` file in the root directory. The following environment variables are required:

*   **Database:** `MONGODB_URI`
*   **Authentication:** `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
*   **Real-time:** `ABLY_ROOT_KEY`
*   **Caching:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

## Installation and Setup

1.  **Install dependencies:**
    ```bash
    npm install
    ```

2.  **Verify environment configuration:**
    ```bash
    npm run verify:env
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

## Key Features

*   **Job Management:** Comprehensive workflows for posting requirements, reviewing applications, and managing project lifecycles.
*   **Real-time Synchronization:** Instant updates for notifications, job status changes, and messaging using persistent WebSocket connections.
*   **Location Intelligence:** Geospatial indexing to efficiently match service providers with nearby opportunities.
*   **Performance Optimization:** Server-side caching and rate limiting implemented via Redis to ensure system stability under load.

## Testing

The project maintains a test suite covering API endpoints and integration workflows.

Execute the test suite:
```bash
npm test
```

## Deployment

The application is architected for serverless environments (e.g., Vercel) but supports standard containerized deployment on any Node.js infrastructure.
