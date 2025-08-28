import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../../lib/auth';
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

// GET - Retrieve user's location preferences
export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const db = await connectToDatabase();
    const users = db.collection('users');

    // Get user profile with location preferences
    const user = await users.findOne(
      { _id: new ObjectId(session.user.id) },
      { 
        projection: { 
          locationPreferences: 1,
          signupLocation: 1,
          city: 1, // from signup form
          state: 1,
          country: 1,
          address: 1
        } 
      }
    );

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build comprehensive location preferences
    const preferences = {
      allowGPS: user.locationPreferences?.allowGPS ?? true,
      allowIP: user.locationPreferences?.allowIP ?? true,
      preferredCity: user.locationPreferences?.preferredCity || null,
      signupCity: user.city || null,
      signupLocation: user.signupLocation || (user.city ? {
        city: user.city,
        state: user.state,
        country: user.country,
        address: user.address,
        latitude: null,
        longitude: null,
        source: 'signup_form'
      } : null)
    };

    return NextResponse.json({
      success: true,
      preferences
    });

  } catch (error) {
    console.error('Get location preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to get location preferences' },
      { status: 500 }
    );
  }
}

// POST - Update user's location preferences
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
      allowGPS,
      allowIP,
      preferredCity,
      signupLocation
    } = await request.json();

    const db = await connectToDatabase();
    const users = db.collection('users');

    // Update user location preferences
    const updateData = {
      $set: {
        'locationPreferences.allowGPS': allowGPS,
        'locationPreferences.allowIP': allowIP,
        'locationPreferences.preferredCity': preferredCity,
        'locationPreferences.updatedAt': new Date()
      }
    };

    // If signup location is provided, store it
    if (signupLocation) {
      updateData.$set.signupLocation = {
        ...signupLocation,
        source: 'user_registration',
        timestamp: new Date()
      };
    }

    const result = await users.updateOne(
      { _id: new ObjectId(session.user.id) },
      updateData
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Track preference update for analytics
    await db.collection('analytics').insertOne({
      userId: session.user.id,
      action: 'location_preferences_updated',
      preferences: {
        allowGPS,
        allowIP,
        preferredCity: !!preferredCity,
        signupLocation: !!signupLocation
      },
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Location preferences updated successfully'
    });

  } catch (error) {
    console.error('Update location preferences error:', error);
    return NextResponse.json(
      { error: 'Failed to update location preferences' },
      { status: 500 }
    );
  }
}