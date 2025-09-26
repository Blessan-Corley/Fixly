// app/api/jobs/browse/route.js
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/auth';
import connectDB from '../../../../lib/db';
import Job from '../../../../models/Job';
import User from '../../../../models/User';
import LocationPreference from '../../../../models/LocationPreference';
import { rateLimit } from '../../../../utils/rateLimiting';

export const dynamic = 'force-dynamic';

// Helper function to calculate distance using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function GET(request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request, 'browse_jobs', 100, 60 * 1000);
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

    // Mark expired jobs before fetching
    await Job.updateMany(
      {
        status: 'open',
        deadline: { $lt: new Date() },
        applications: { $size: 0 }
      },
      {
        $set: { status: 'expired' }
      }
    );

    const user = await User.findById(session.user.id);
    if (!user) {
      return NextResponse.json(
        { message: 'User not found' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = Math.min(parseInt(searchParams.get('limit')) || 12, 50);
    const search = searchParams.get('search') || '';
    const skills = searchParams.get('skills')?.split(',').filter(Boolean) || [];
    const location = searchParams.get('location') || '';
    const budgetMin = searchParams.get('budgetMin') ? parseInt(searchParams.get('budgetMin')) : null;
    const budgetMax = searchParams.get('budgetMax') ? parseInt(searchParams.get('budgetMax')) : null;
    const urgency = searchParams.get('urgency') || '';
    const sortBy = searchParams.get('sortBy') || 'newest';
    const maxDistance = searchParams.get('maxDistance') ? parseInt(searchParams.get('maxDistance')) : null;

    // Build query based on user role
    let query = {};
    
    if (user.role === 'hirer') {
      query = {
        createdBy: user._id
      };
    } else {
      query = { 
        status: 'open',
        deadline: { $gte: new Date() }
      };
    }

    // Search in title and description
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Filter by skills
    if (skills.length > 0) {
      query.skillsRequired = { $in: skills.map(skill => skill.toLowerCase()) };
    }

    // Filter by location
    if (location) {
      query.$or = [
        { 'location.city': { $regex: location, $options: 'i' } },
        { 'location.state': { $regex: location, $options: 'i' } }
      ];
    }

    // Filter by budget
    if (budgetMin || budgetMax) {
      query['budget.type'] = { $ne: 'negotiable' };
      if (budgetMin) query['budget.amount'] = { $gte: budgetMin };
      if (budgetMax) {
        query['budget.amount'] = { 
          ...query['budget.amount'], 
          $lte: budgetMax 
        };
      }
    }

    // Filter by urgency
    if (urgency) {
      query.urgency = urgency;
    }

    // Get user location for distance-based operations
    let userLocation = null;
    if (sortBy === 'distance' || maxDistance) {
      try {
        const locationPrefs = await LocationPreference.findOne({ user: user._id });
        if (locationPrefs?.currentLocation?.lat && locationPrefs?.currentLocation?.lng) {
          userLocation = {
            lat: locationPrefs.currentLocation.lat,
            lng: locationPrefs.currentLocation.lng
          };
        }
      } catch (error) {
        console.error('Error fetching user location:', error);
      }
    }

    // Sorting
    let sort = {};
    let needsDistanceCalculation = false;
    
    switch (sortBy) {
      case 'newest':
        sort = { featured: -1, createdAt: -1 };
        break;
      case 'deadline':
        sort = { deadline: 1 };
        break;
      case 'budget_high':
        sort = { 'budget.amount': -1, featured: -1 };
        break;
      case 'budget_low':
        sort = { 'budget.amount': 1, featured: -1 };
        break;
      case 'distance':
      case 'nearest':
        if (userLocation) {
          needsDistanceCalculation = true;
        } else {
          sort = { featured: -1, createdAt: -1 };
        }
        break;
      default:
        sort = { featured: -1, createdAt: -1 };
    }

    const skip = (page - 1) * limit;

    // Execute query
    const [jobs, total] = await Promise.all([
      Job.find(query)
        .populate('createdBy', 'name username photoURL rating location isVerified')
        .sort(sort)
        .skip(needsDistanceCalculation ? 0 : skip)
        .limit(needsDistanceCalculation ? 0 : limit)
        .lean(),
      Job.countDocuments(query)
    ]);

    // Process jobs with distance calculations if needed
    let processedJobs = jobs;

    if (needsDistanceCalculation && userLocation) {
      // Add distance to each job
      processedJobs = jobs
        .map(job => {
          if (job.location?.lat && job.location?.lng) {
            const distance = calculateDistance(
              userLocation.lat,
              userLocation.lng,
              job.location.lat,
              job.location.lng
            );
            return { ...job, distance };
          }
          return { ...job, distance: null };
        })
        .filter(job => !maxDistance || (job.distance && job.distance <= maxDistance))
        .sort((a, b) => {
          if (!a.distance && !b.distance) return 0;
          if (!a.distance) return 1;
          if (!b.distance) return -1;
          return a.distance - b.distance;
        })
        .slice(skip, skip + limit);
    }

    // Check if fixer can view full job details
    const canViewFullDetails = user.role !== 'fixer' || 
                               user.plan?.type === 'pro' || 
                               (user.plan?.creditsUsed || 0) < 3;

    // Enhance jobs with additional data
    const enhancedJobs = processedJobs.map(job => {
      const hasApplied = job.applications?.some(
        app => app.fixer?.toString() === user._id.toString() && app.status !== 'withdrawn'
      ) || false;

      // If fixer without credits, return limited data
      if (user.role === 'fixer' && !canViewFullDetails && !hasApplied) {
        return {
          _id: job._id,
          title: job.title,
          description: job.description.substring(0, 150) + '...',
          skillsRequired: job.skillsRequired,
          budget: job.budget.type === 'negotiable' ? { type: 'negotiable' } : {
            type: job.budget.type,
            amount: job.budget.amount ? '₹' + Math.floor(job.budget.amount / 1000) + 'k+' : null
          },
          urgency: job.urgency,
          status: job.status,
          location: {
            city: job.location.city,
            state: job.location.state
          },
          createdBy: {
            name: job.createdBy.name,
            rating: job.createdBy.rating
          },
          applicationCount: job.applications?.length || 0,
          createdAt: job.createdAt,
          hasApplied: false,
          requiresCredit: true,
          distance: job.distance
        };
      }

      // Full job data
      return {
        _id: job._id,
        title: job.title,
        description: job.description,
        skillsRequired: job.skillsRequired,
        budget: job.budget,
        urgency: job.urgency,
        type: job.type,
        status: job.status,
        deadline: job.deadline,
        estimatedDuration: job.estimatedDuration,
        experienceLevel: job.experienceLevel,
        location: job.location,
        createdBy: job.createdBy,
        applicationCount: job.applications?.length || 0,
        viewCount: job.viewCount || 0,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
        hasApplied,
        requiresCredit: false,
        distance: job.distance,
        attachments: job.attachments || []
      };
    });

    const finalTotal = needsDistanceCalculation && maxDistance && userLocation 
      ? enhancedJobs.length 
      : total;

    return NextResponse.json({
      success: true,
      jobs: enhancedJobs,
      pagination: {
        page,
        limit,
        total: finalTotal,
        totalPages: Math.ceil(finalTotal / limit),
        hasMore: page < Math.ceil(finalTotal / limit)
      },
      meta: {
        canViewFullDetails,
        userRole: user.role,
        hasLocationEnabled: !!userLocation,
        distanceFiltered: !!maxDistance && !!userLocation
      }
    });

  } catch (error) {
    console.error('Error in browse jobs API:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Failed to fetch jobs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}