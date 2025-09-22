// app/api/user/profile/search/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'profile_search', 100, 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { message: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 12, 50);
    const search = searchParams.get('search') || '';
    const role = searchParams.get('role') || 'fixer';
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
    const location = searchParams.get('location') || '';
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')) : null;
    const availability = searchParams.get('availability') || '';
    const isPro = searchParams.get('isPro') === 'true';
    const sortBy = searchParams.get('sortBy') || 'rating';

    // Build query
    const query = {
      role: role,
      isActive: true,
      banned: { $ne: true }
    };

    // Search in name and skills
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { skills: { $in: [new RegExp(search, 'i')] } },
        { 'bio': { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by specific skills
    if (skills.length > 0) {
      query.skills = { $in: skills };
    }

    // Filter by location
    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } }
      ];
    }

    // Filter by minimum rating
    if (minRating) {
      query['rating.average'] = { $gte: minRating };
    }

    // Filter by availability (this would need to be implemented based on your availability system)
    if (availability === 'available') {
      query.available = true;
    }

    // Filter by Pro subscription
    if (isPro) {
      query['plan.type'] = 'pro';
      query['plan.status'] = 'active';
    }

    // Sorting
    let sort = {};
    switch (sortBy) {
      case 'rating':
        sort = { 'rating.average': -1, 'rating.count': -1 };
        break;
      case 'reviews':
        sort = { 'rating.count': -1, 'rating.average': -1 };
        break;
      case 'recent':
        sort = { lastLoginAt: -1, createdAt: -1 };
        break;
      case 'distance':
        // TODO: Implement distance-based sorting using user's location
        sort = { createdAt: -1 };
        break;
      case 'jobs':
        sort = { jobsCompleted: -1 };
        break;
      default:
        sort = { 'rating.average': -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash -notifications -email -phone') // Exclude sensitive data
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(query)
    ]);

    // Add computed fields
    const enhancedUsers = users.map(user => ({
      ...user,
      isPro: user.plan?.type === 'pro' && user.plan?.status === 'active',
      responseTime: user.responseTime || '2-4 hours', // Default response time
      available: user.available !== false, // Default to available
      memberSince: user.createdAt,
      lastActive: user.lastLoginAt || user.createdAt
    }));

    return NextResponse.json({
      users: enhancedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: skip + users.length < total
      },
      filters: {
        search,
        role,
        skills,
        location,
        minRating,
        availability,
        isPro,
        sortBy
      }
    });

  } catch (error) {
    console.error('Profile search error:', error);
    return NextResponse.json(
      { message: 'Failed to search profiles' },
      { status: 500 }
    );
  }
}