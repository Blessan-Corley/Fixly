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

    const { endpoint } = await request.json();

    if (!endpoint) {
      return NextResponse.json(
        { error: 'Endpoint required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const pushSubscriptions = db.collection('pushSubscriptions');

    // Mark subscription as inactive
    const result = await pushSubscriptions.updateOne(
      { 
        userId: session.user.id,
        endpoint: endpoint 
      },
      { 
        $set: { 
          isActive: false,
          unsubscribedAt: new Date()
        } 
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }

    console.log(`Push subscription unregistered for user ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Unsubscribed successfully'
    });

  } catch (error) {
    console.error('Push unsubscribe error:', error);
    return NextResponse.json(
      { error: 'Failed to unsubscribe' },
      { status: 500 }
    );
  }
}