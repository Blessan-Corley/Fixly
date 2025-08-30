// app/api/user/profile/search/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import connectDB from '../../../../../lib/db';
import User from '../../../../../models/User';
import { rateLimit } from '../../../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

// Haversine formula to calculate distance between two points
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in km
  return distance;
}

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
    const sortBy = searchParams.get('sortBy') || 'rating';
    const userLat = searchParams.get('lat') ? parseFloat(searchParams.get('lat')) : null;
    const userLng = searchParams.get('lng') ? parseFloat(searchParams.get('lng')) : null;
    const maxDistance = searchParams.get('maxDistance') ? parseInt(searchParams.get('maxDistance')) : 50; // km

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
      query.availableNow = true;
    }

    // Add geospatial query if user location is provided and distance sorting is requested
    if (userLat && userLng && (sortBy === 'distance' || location)) {
      query['location.coordinates'] = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [userLng, userLat]
          },
          $maxDistance: maxDistance * 1000 // Convert km to meters
        }
      };
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
        sort = { lastActivityAt: -1, createdAt: -1 };
        break;
      case 'distance':
        // Distance-based sorting is handled by $near in the query
        // MongoDB automatically sorts by distance when using $near
        if (userLat && userLng) {
          // Additional sorting criteria for same distances
          sort = { 'rating.average': -1, jobsCompleted: -1 };
        } else {
          // Fallback if no location provided
          sort = { 'rating.average': -1, createdAt: -1 };
        }
        break;
      case 'jobs':
        sort = { jobsCompleted: -1, 'rating.average': -1 };
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

    // Add computed fields including distance if location provided
    const enhancedUsers = users.map(user => {
      const enhanced = {
        ...user,
        isPro: user.plan?.type === 'pro' && user.plan?.status === 'active',
        responseTime: user.responseTime || '2-4 hours',
        available: user.availableNow !== false,
        memberSince: user.createdAt,
        lastActive: user.lastActivityAt || user.lastLoginAt || user.createdAt
      };

      // Calculate distance if both user and fixer have coordinates
      if (userLat && userLng && user.location?.lat && user.location?.lng) {
        const distance = calculateDistance(
          userLat, userLng,
          user.location.lat, user.location.lng
        );
        enhanced.distance = Math.round(distance * 10) / 10; // Round to 1 decimal
        enhanced.distanceText = distance < 1 ? 
          `${Math.round(distance * 1000)}m away` : 
          `${Math.round(distance * 10) / 10}km away`;
      }

      return enhanced;
    });

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