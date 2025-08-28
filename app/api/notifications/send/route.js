import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
import { MongoClient } from 'mongodb';
import webpush from 'web-push';

const uri = process.env.MONGODB_URI;
let client;

// Configure web-push
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.NEXTAUTH_URL || 'https://fixly.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('fixly');
}

export async function POST(request) {
  try {
    // Get user session
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { userId, notification } = await request.json();

    if (!userId || !notification) {
      return NextResponse.json(
        { error: 'User ID and notification required' },
        { status: 400 }
      );
    }

    // Check VAPID configuration
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      return NextResponse.json(
        { error: 'Push notifications not configured' },
        { status: 503 }
      );
    }

    const db = await connectToDatabase();
    const pushSubscriptions = db.collection('pushSubscriptions');

    // Get user's active subscriptions
    const subscriptions = await pushSubscriptions.find({
      userId: userId,
      isActive: true
    }).toArray();

    if (subscriptions.length === 0) {
      return NextResponse.json(
        { error: 'No active subscriptions found for user' },
        { status: 404 }
      );
    }

    const results = [];
    const payload = JSON.stringify(notification);

    // Send to all user's devices
    for (const subscription of subscriptions) {
      try {
        const pushSubscription = {
          endpoint: subscription.endpoint,
          keys: subscription.keys
        };

        const result = await webpush.sendNotification(pushSubscription, payload);
        
        results.push({
          endpoint: subscription.endpoint,
          success: true,
          status: result.statusCode
        });

        // Update last used timestamp
        await pushSubscriptions.updateOne(
          { _id: subscription._id },
          { $set: { lastUsed: new Date() } }
        );

      } catch (error) {
        console.error('Push notification send error:', error);
        
        results.push({
          endpoint: subscription.endpoint,
          success: false,
          error: error.message
        });

        // Mark subscription as inactive if it's invalid
        if (error.statusCode === 410 || error.statusCode === 404) {
          await pushSubscriptions.updateOne(
            { _id: subscription._id },
            { $set: { isActive: false, deactivatedAt: new Date() } }
          );
        }
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    console.log(`Push notifications sent to ${userId}: ${successCount} successful, ${failureCount} failed`);

    return NextResponse.json({
      success: true,
      message: `Notifications sent: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    });

  } catch (error) {
    console.error('Push notification send error:', error);
    return NextResponse.json(
      { error: 'Failed to send push notification' },
      { status: 500 }
    );
  }
}