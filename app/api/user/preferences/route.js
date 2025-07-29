// app/api/user/preferences/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';

export async function PUT(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    
    const body = await request.json();
    const { preferences } = body;

    const user = await User.findByIdAndUpdate(
      session.user.id,
      { preferences },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Preferences saved successfully',
      user
    });

  } catch (error) {
    console.error('Preferences save error:', error);
    return NextResponse.json(
      { message: 'Failed to save preferences' },
      { status: 500 }
    );
  }
}