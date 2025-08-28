import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI;
let client;

async function connectToDatabase() {
  if (!client) {
    client = new MongoClient(uri);
    await client.connect();
  }
  return client.db('fixly');
}

// GET - Get user's notifications
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit')) || 20;
    const skip = parseInt(searchParams.get('skip')) || 0;
    const unreadOnly = searchParams.get('unread') === 'true';

    const db = await connectToDatabase();
    const notifications = db.collection('notifications');

    const query = { userId: session.user.id };
    if (unreadOnly) {
      query.read = false;
    }

    const userNotifications = await notifications
      .find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const unreadCount = await notifications.countDocuments({
      userId: session.user.id,
      read: false
    });

    return NextResponse.json({
      success: true,
      notifications: userNotifications,
      unreadCount,
      total: userNotifications.length
    });

  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { error: 'Failed to get notifications' },
      { status: 500 }
    );
  }
}

// POST - Create new notification
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const {
      type,
      title,
      message,
      data,
      targetUserId
    } = await request.json();

    if (!type || !title || !message) {
      return NextResponse.json(
        { error: 'Type, title, and message are required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const notifications = db.collection('notifications');

    const notification = {
      userId: targetUserId || session.user.id,
      type,
      title,
      message,
      data: data || {},
      read: false,
      createdAt: new Date(),
      createdBy: session.user.id
    };

    const result = await notifications.insertOne(notification);

    return NextResponse.json({
      success: true,
      notificationId: result.insertedId,
      notification: {
        ...notification,
        _id: result.insertedId
      }
    });

  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { error: 'Failed to create notification' },
      { status: 500 }
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { notificationIds, markAll } = await request.json();

    const db = await connectToDatabase();
    const notifications = db.collection('notifications');

    let result;
    
    if (markAll) {
      result = await notifications.updateMany(
        { userId: session.user.id, read: false },
        { 
          $set: { 
            read: true, 
            readAt: new Date() 
          }
        }
      );
    } else if (notificationIds && Array.isArray(notificationIds)) {
      result = await notifications.updateMany(
        { 
          _id: { $in: notificationIds.map(id => new ObjectId(id)) },
          userId: session.user.id
        },
        { 
          $set: { 
            read: true, 
            readAt: new Date() 
          }
        }
      );
    } else {
      return NextResponse.json(
        { error: 'Invalid request parameters' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      modifiedCount: result.modifiedCount
    });

  } catch (error) {
    console.error('Mark notifications read error:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  }
}

// DELETE - Delete notifications
export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const notificationId = searchParams.get('id');

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }

    const db = await connectToDatabase();
    const notifications = db.collection('notifications');

    const result = await notifications.deleteOne({
      _id: new ObjectId(notificationId),
      userId: session.user.id
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { error: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      deleted: true
    });

  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json(
      { error: 'Failed to delete notification' },
      { status: 500 }
    );
  }
}