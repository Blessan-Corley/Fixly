// Real-time Data Synchronization API - Seamless background updates
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { rateLimit } from '@/utils/rateLimiting';
import { addSecurityHeaders } from '@/utils/validation';
import connectDB from '@/lib/db';
import Job from '@/models/Job';
import User from '@/models/User';
import UserLocationHistory from '@/models/UserLocationHistory';

export const dynamic = 'force-dynamic';

// GET /api/realtime/sync - Get synchronized data for multiple resources
export async function GET(request) {
  try {
    // Rate limiting with higher limits for sync operations
    const rateLimitResult = await rateLimit(request, 'realtime_sync', 200, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many sync requests' },
        { status: 429 }
      );
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const resources = searchParams.get('resources')?.split(',') || [];
    const lastSync = searchParams.get('lastSync') ? new Date(searchParams.get('lastSync')) : null;
    const includeDeleted = searchParams.get('includeDeleted') === 'true';

    const syncData = {};

    // Sync jobs if requested
    if (resources.includes('jobs')) {
      syncData.jobs = await syncJobs(session.user.id, lastSync, includeDeleted);
    }

    // Sync notifications if requested
    if (resources.includes('notifications')) {
      syncData.notifications = await syncNotifications(session.user.id, lastSync, includeDeleted);
    }

    // Sync user data if requested
    if (resources.includes('profile')) {
      syncData.profile = await syncUserProfile(session.user.id, lastSync);
    }

    // Sync location data if requested
    if (resources.includes('location')) {
      syncData.location = await syncLocationData(session.user.id, lastSync);
    }

    // Sync comments for specific job if requested
    const jobId = searchParams.get('jobId');
    if (resources.includes('comments') && jobId) {
      syncData.comments = await syncJobComments(jobId, lastSync, includeDeleted);
    }

    // Sync applications if requested
    if (resources.includes('applications')) {
      syncData.applications = await syncApplications(session.user.id, lastSync, includeDeleted);
    }

    const response = NextResponse.json({
      success: true,
      data: syncData,
      syncTime: new Date().toISOString(),
      timestamp: Date.now()
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Real-time sync error:', error);
    const response = NextResponse.json(
      {
        success: false,
        message: 'Sync failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// POST /api/realtime/sync - Update sync preferences or trigger manual sync
export async function POST(request) {
  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(request, 'sync_preferences', 50, 60 * 60 * 1000);
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { success: false, message: 'Too many preference updates' },
        { status: 429 }
      );
    }

    // Authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { action, preferences, resources } = body;

    switch (action) {
      case 'update_preferences':
        await updateSyncPreferences(session.user.id, preferences);
        break;
      
      case 'force_sync':
        // Trigger immediate sync for specified resources
        const syncData = await forceSyncResources(session.user.id, resources);
        return NextResponse.json({
          success: true,
          message: 'Manual sync completed',
          data: syncData,
          timestamp: new Date().toISOString()
        });
      
      default:
        return NextResponse.json(
          { success: false, message: 'Invalid action' },
          { status: 400 }
        );
    }

    const response = NextResponse.json({
      success: true,
      message: 'Sync preferences updated',
      timestamp: new Date().toISOString()
    });

    return addSecurityHeaders(response);

  } catch (error) {
    console.error('Sync preferences error:', error);
    const response = NextResponse.json(
      {
        success: false,
        message: 'Failed to update preferences',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
    return addSecurityHeaders(response);
  }
}

// Sync functions for different data types

async function syncJobs(userId, lastSync, includeDeleted = false) {
  try {
    const query = {
      $or: [
        { createdBy: userId },
        { assignedTo: userId },
        { 'applications.applicant': userId }
      ]
    };

    if (lastSync) {
      query.updatedAt = { $gte: lastSync };
    }

    if (!includeDeleted) {
      query.deleted = { $ne: true };
    }

    const jobs = await Job.find(query)
      .sort({ updatedAt: -1 })
      .limit(50)
      .populate('createdBy', 'name username profilePhoto')
      .populate('assignedTo', 'name username profilePhoto')
      .lean();

    return {
      items: jobs,
      count: jobs.length,
      lastUpdated: jobs.length > 0 ? jobs[0].updatedAt : null
    };

  } catch (error) {
    console.error('Jobs sync error:', error);
    return { items: [], count: 0, error: error.message };
  }
}

async function syncNotifications(userId, lastSync, includeDeleted = false) {
  try {
    const user = await User.findById(userId).select('notifications');
    if (!user) return { items: [], count: 0 };

    let notifications = user.notifications || [];

    if (lastSync) {
      notifications = notifications.filter(n => n.createdAt >= lastSync);
    }

    if (!includeDeleted) {
      notifications = notifications.filter(n => !n.deleted);
    }

    // Sort by newest first
    notifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Limit to 100 notifications
    notifications = notifications.slice(0, 100);

    return {
      items: notifications,
      count: notifications.length,
      unreadCount: notifications.filter(n => !n.read).length,
      lastUpdated: notifications.length > 0 ? notifications[0].createdAt : null
    };

  } catch (error) {
    console.error('Notifications sync error:', error);
    return { items: [], count: 0, unreadCount: 0, error: error.message };
  }
}

async function syncUserProfile(userId, lastSync) {
  try {
    const query = { _id: userId };
    if (lastSync) {
      query.updatedAt = { $gte: lastSync };
    }

    const user = await User.findOne(query)
      .select('name username email profilePhoto location skills role subscription preferences updatedAt')
      .lean();

    if (!user) {
      return { updated: false, message: 'No profile updates' };
    }

    return {
      updated: true,
      profile: user,
      lastUpdated: user.updatedAt
    };

  } catch (error) {
    console.error('Profile sync error:', error);
    return { updated: false, error: error.message };
  }
}

async function syncLocationData(userId, lastSync) {
  try {
    const query = { userId };
    if (lastSync) {
      query.timestamp = { $gte: lastSync };
    }

    const locationHistory = await UserLocationHistory.find(query)
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    return {
      items: locationHistory,
      count: locationHistory.length,
      lastUpdated: locationHistory.length > 0 ? locationHistory[0].timestamp : null
    };

  } catch (error) {
    console.error('Location sync error:', error);
    return { items: [], count: 0, error: error.message };
  }
}

async function syncJobComments(jobId, lastSync, includeDeleted = false) {
  try {
    const job = await Job.findById(jobId)
      .select('comments updatedAt')
      .populate('comments.author', 'name username profilePhoto')
      .populate('comments.replies.author', 'name username profilePhoto')
      .lean();

    if (!job) {
      return { items: [], count: 0, error: 'Job not found' };
    }

    let comments = job.comments || [];

    if (lastSync) {
      comments = comments.filter(c => new Date(c.createdAt) >= lastSync);
    }

    if (!includeDeleted) {
      comments = comments.filter(c => !c.deleted);
    }

    // Sort by newest first
    comments.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return {
      items: comments,
      count: comments.length,
      lastUpdated: comments.length > 0 ? comments[0].createdAt : null,
      jobUpdated: job.updatedAt
    };

  } catch (error) {
    console.error('Comments sync error:', error);
    return { items: [], count: 0, error: error.message };
  }
}

async function syncApplications(userId, lastSync, includeDeleted = false) {
  try {
    // Find jobs where user has applications
    const query = {
      'applications.applicant': userId
    };

    if (lastSync) {
      query.updatedAt = { $gte: lastSync };
    }

    const jobs = await Job.find(query)
      .select('applications title status createdBy updatedAt')
      .populate('createdBy', 'name username')
      .lean();

    const applications = [];
    
    jobs.forEach(job => {
      const userApplications = job.applications.filter(app => 
        app.applicant.toString() === userId && 
        (!includeDeleted ? !app.deleted : true)
      );
      
      userApplications.forEach(app => {
        applications.push({
          ...app,
          jobId: job._id,
          jobTitle: job.title,
          jobStatus: job.status,
          jobCreator: job.createdBy,
          jobUpdated: job.updatedAt
        });
      });
    });

    // Sort by newest first
    applications.sort((a, b) => new Date(b.appliedAt) - new Date(a.appliedAt));

    return {
      items: applications,
      count: applications.length,
      lastUpdated: applications.length > 0 ? applications[0].appliedAt : null
    };

  } catch (error) {
    console.error('Applications sync error:', error);
    return { items: [], count: 0, error: error.message };
  }
}

async function updateSyncPreferences(userId, preferences) {
  try {
    await User.findByIdAndUpdate(userId, {
      'preferences.sync': preferences,
      updatedAt: new Date()
    });
    
    console.log(`✅ Sync preferences updated for user ${userId}`);
  } catch (error) {
    console.error('Update sync preferences error:', error);
    throw error;
  }
}

async function forceSyncResources(userId, resources) {
  const syncData = {};

  for (const resource of resources) {
    switch (resource) {
      case 'jobs':
        syncData.jobs = await syncJobs(userId, null, false);
        break;
      case 'notifications':
        syncData.notifications = await syncNotifications(userId, null, false);
        break;
      case 'profile':
        syncData.profile = await syncUserProfile(userId, null);
        break;
      case 'location':
        syncData.location = await syncLocationData(userId, null);
        break;
      case 'applications':
        syncData.applications = await syncApplications(userId, null, false);
        break;
    }
  }

  return syncData;
}