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

    const { subscription, userAgent, timestamp } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const pushSubscriptions = db.collection('pushSubscriptions');

    // Store or update subscription
    const subscriptionDoc = {
      userId: session.user.id,
      email: session.user.email,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent: userAgent || '',
      subscribedAt: new Date(timestamp || Date.now()),
      isActive: true,
      lastUsed: new Date()
    };

    await pushSubscriptions.updateOne(
      { 
        userId: session.user.id,
        endpoint: subscription.endpoint 
      },
      { $set: subscriptionDoc },
      { upsert: true }
    );

    console.log(`Push subscription registered for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Subscription registered successfully'
    });

  } catch (error) {
    console.error('Push subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to register subscription' },
      { status: 500 }
    );
  }
}