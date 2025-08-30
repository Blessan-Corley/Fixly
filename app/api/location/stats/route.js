// app/api/location/stats/route.js - Location statistics and management for admins
import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/db';
import LocationPreference from '@/models/LocationPreference';
import User from '@/models/User';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    const currentUser = await User.findById(session.user.id);
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const groupBy = searchParams.get('groupBy') || 'role'; // 'role', 'city', 'state'
    const includeDetails = searchParams.get('details') === 'true';

    // Get basic statistics
    const totalUsers = await LocationPreference.countDocuments();
    const recentUpdates = await LocationPreference.countDocuments({
      lastLocationUpdate: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    });
    
    const activeSharing = await LocationPreference.countDocuments({
      'preferences.locationSharingConsent': true,
      'preferences.autoLocationEnabled': true
    });

    // Get grouped statistics using the optimized method
    const groupedStats = await LocationPreference.getLocationStats(groupBy);

    // Get role distribution
    const roleStats = await LocationPreference.aggregate([
      {
        $group: {
          _id: '$userIdentifier.role',
          count: { $sum: 1 },
          avgLocationAge: {
            $avg: {
              $subtract: [new Date(), '$lastLocationUpdate']
            }
          },
          cities: { $addToSet: '$currentLocation.city' },
          states: { $addToSet: '$currentLocation.state' }
        }
      },
      {
        $project: {
          _id: 1,
          count: 1,
          avgLocationAgeHours: { $divide: ['$avgLocationAge', 1000 * 60 * 60] },
          uniqueCities: { $size: { $filter: { input: '$cities', cond: { $ne: ['$$this', null] } } } },
          uniqueStates: { $size: { $filter: { input: '$states', cond: { $ne: ['$$this', null] } } } }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top cities and states
    const topCities = await LocationPreference.aggregate([
      { $match: { 'currentLocation.city': { $ne: null, $ne: '' } } },
      {
        $group: {
          _id: '$currentLocation.city',
          count: { $sum: 1 },
          roles: { $addToSet: '$userIdentifier.role' },
          recentUpdates: {
            $sum: {
              $cond: [
                { $gte: ['$lastLocationUpdate', new Date(Date.now() - 24 * 60 * 60 * 1000)] },
                1,
                0
              ]
            }
          }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    let detailedInfo = {};
    if (includeDetails) {
      // Get users with stale locations (>7 days old)
      const staleThreshold = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const staleLocations = await LocationPreference.find({
        lastLocationUpdate: { $lt: staleThreshold }
      }).select('userIdentifier lastLocationUpdate currentLocation.city currentLocation.state').limit(20);

      // Get most active users (frequent location updates)
      const activeUsers = await LocationPreference.find({
        'recentLocations.2': { $exists: true } // Users with 3+ recent locations
      }).select('userIdentifier recentLocations currentLocation.city currentLocation.state')
        .sort({ lastLocationUpdate: -1 })
        .limit(10);

      detailedInfo = {
        staleLocations: staleLocations.map(loc => ({
          userIdentifier: loc.userIdentifier,
          lastUpdated: loc.lastLocationUpdate,
          daysSinceUpdate: Math.floor((Date.now() - loc.lastLocationUpdate) / (1000 * 60 * 60 * 24)),
          location: `${loc.currentLocation.city || 'Unknown'}, ${loc.currentLocation.state || 'Unknown'}`
        })),
        activeUsers: activeUsers.map(user => ({
          userIdentifier: user.userIdentifier,
          locationCount: user.recentLocations.length,
          currentLocation: `${user.currentLocation.city || 'Unknown'}, ${user.currentLocation.state || 'Unknown'}`
        }))
      };
    }

    const response = {
      overview: {
        totalUsersWithLocation: totalUsers,
        recentUpdates24h: recentUpdates,
        activeLocationSharing: activeSharing,
        locationSharingRate: totalUsers > 0 ? Math.round((activeSharing / totalUsers) * 100) : 0,
        recentUpdateRate: totalUsers > 0 ? Math.round((recentUpdates / totalUsers) * 100) : 0
      },
      groupedStats: groupedStats,
      roleDistribution: roleStats,
      topLocations: {
        cities: topCities,
        totalCities: await LocationPreference.distinct('currentLocation.city', { 'currentLocation.city': { $ne: null, $ne: '' } }).then(cities => cities.length),
        totalStates: await LocationPreference.distinct('currentLocation.state', { 'currentLocation.state': { $ne: null, $ne: '' } }).then(states => states.length)
      },
      ...detailedInfo,
      generatedAt: new Date().toISOString(),
      generatedBy: {
        name: currentUser.name,
        email: currentUser.email
      }
    };

    console.log(`📊 Location stats generated by ${currentUser.email} - groupBy: ${groupBy}, details: ${includeDetails}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Location stats error:', error);
    return NextResponse.json({ 
      error: 'Failed to get location statistics', 
      details: error.message 
    }, { status: 500 });
  }
}

// Bulk location management operations (admin only)
export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    await connectDB();
    
    const currentUser = await User.findById(session.user.id);
    if (currentUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      operation, // 'cleanup_stale', 'sync_user_data', 'update_roles', 'reset_permissions'
      dryRun = true, // Safety first - default to dry run
      filters = {} // Optional filters for targeted operations
    } = body;

    let result = { operation, dryRun, affected: 0, details: [] };

    switch (operation) {
      case 'cleanup_stale':
        // Remove location data older than specified days (default 90 days)
        const daysThreshold = filters.days || 90;
        const staleThreshold = new Date(Date.now() - daysThreshold * 24 * 60 * 60 * 1000);
        
        if (dryRun) {
          const staleCount = await LocationPreference.countDocuments({
            lastLocationUpdate: { $lt: staleThreshold }
          });
          result.affected = staleCount;
          result.details.push(`Would remove ${staleCount} location records older than ${daysThreshold} days`);
        } else {
          const staleLocations = await LocationPreference.find({
            lastLocationUpdate: { $lt: staleThreshold }
          }).select('userIdentifier lastLocationUpdate');
          
          result.affected = staleLocations.length;
          result.details = staleLocations.map(loc => 
            `Removed: ${loc.userIdentifier.email} (${Math.floor((Date.now() - loc.lastLocationUpdate) / (1000 * 60 * 60 * 24))} days old)`
          );
          
          await LocationPreference.deleteMany({
            lastLocationUpdate: { $lt: staleThreshold }
          });
        }
        break;

      case 'sync_user_data':
        // Sync user identifier data from User collection
        const locationPrefs = await LocationPreference.find({}).select('user userIdentifier');
        let syncCount = 0;
        
        for (const locPref of locationPrefs) {
          const user = await User.findById(locPref.user).select('name email username role');
          if (user) {
            const needsUpdate = 
              locPref.userIdentifier.name !== user.name ||
              locPref.userIdentifier.email !== user.email ||
              locPref.userIdentifier.username !== user.username ||
              locPref.userIdentifier.role !== user.role;
            
            if (needsUpdate) {
              if (!dryRun) {
                await LocationPreference.updateOne(
                  { _id: locPref._id },
                  {
                    'userIdentifier.name': user.name,
                    'userIdentifier.email': user.email,
                    'userIdentifier.username': user.username,
                    'userIdentifier.role': user.role
                  }
                );
              }
              syncCount++;
              result.details.push(`${dryRun ? 'Would sync' : 'Synced'}: ${user.email}`);
            }
          }
        }
        result.affected = syncCount;
        break;

      default:
        return NextResponse.json({ error: 'Invalid operation' }, { status: 400 });
    }

    console.log(`🔧 Admin location operation '${operation}' by ${currentUser.email}: affected ${result.affected} records (dryRun: ${dryRun})`);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Location management error:', error);
    return NextResponse.json({ 
      error: 'Failed to perform location management operation', 
      details: error.message 
    }, { status: 500 });
  }
}