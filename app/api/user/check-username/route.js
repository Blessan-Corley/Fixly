// app/api/user/check-username/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import User from '../../../../models/User';
import { withErrorHandler, ErrorTypes, successResponse } from '../../../../lib/errorHandler';
import { rateLimit } from '../../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

async function handler(request) {
  // Rate limiting
  const rateLimitResult = await rateLimit(request, 'username_check', 20, 60 * 1000);
  if (!rateLimitResult.success) {
    throw ErrorTypes.RATE_LIMIT_EXCEEDED(
      'Too many username checks. Please try again later.',
      rateLimitResult.remainingTime
    );
  }

  // Authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    throw ErrorTypes.UNAUTHORIZED();
  }

  await connectDB();

  const { username } = await request.json();

  // Validation
  if (!username) {
    throw ErrorTypes.MISSING_FIELD('username');
  }

  if (username.length < 3 || username.length > 20) {
    throw ErrorTypes.VALIDATION_ERROR(
      'Username must be 3-20 characters long',
      { field: 'username', min: 3, max: 20 }
    );
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    throw ErrorTypes.VALIDATION_ERROR(
      'Username can only contain lowercase letters, numbers, and underscores',
      { field: 'username', pattern: '^[a-z0-9_]+$' }
    );
  }

  // Check availability (excluding current user)
  const existingUser = await User.findOne({
    username: username.toLowerCase(),
    _id: { $ne: session.user.id }
  }).select('_id').lean();

  if (existingUser) {
    return NextResponse.json(
      {
        success: true,
        available: false,
        message: 'Username is already taken'
      },
      { status: 200 }
    );
  }

  return successResponse(
    { available: true },
    'Username is available'
  );
}

export const POST = withErrorHandler(handler);
