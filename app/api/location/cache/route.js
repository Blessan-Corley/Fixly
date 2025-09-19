// app/api/location/cache/route.js - Redis caching for location data and Google Maps API results
import { NextResponse } from 'next/server';
import { redisUtils } from '../../../../lib/redis';

// Cache TTL values (in seconds)
const CACHE_TTL = {
  SEARCH_RESULTS: 3600, // 1 hour for search results
  PLACE_DETAILS: 7200,  // 2 hours for place details
  GEOCODING: 86400,     // 24 hours for geocoding results
  REVERSE_GEOCODING: 3600 // 1 hour for reverse geocoding
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const key = searchParams.get('key');

    if (!type || !key) {
      return NextResponse.json({
        success: false,
        message: 'Type and key parameters are required'
      }, { status: 400 });
    }

    // Get cached data
    const cacheKey = `location:${type}:${key}`;
    const cachedData = await redisUtils.get(cacheKey);

    if (cachedData) {
      console.log(`📍 Cache hit for ${type}: ${key}`);
      return NextResponse.json({
        success: true,
        data: JSON.parse(cachedData),
        cached: true,
        timestamp: new Date().toISOString()
      });
    }

    console.log(`📍 Cache miss for ${type}: ${key}`);
    return NextResponse.json({
      success: false,
      message: 'No cached data found',
      cached: false
    }, { status: 404 });

  } catch (error) {
    console.error('💥 Cache retrieval error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to retrieve cached data'
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const { type, key, data, customTTL } = await request.json();

    if (!type || !key || !data) {
      return NextResponse.json({
        success: false,
        message: 'Type, key, and data are required'
      }, { status: 400 });
    }

    // Determine TTL based on type
    const ttl = customTTL || CACHE_TTL[type.toUpperCase()] || CACHE_TTL.SEARCH_RESULTS;
    const cacheKey = `location:${type}:${key}`;

    // Store in Redis
    await redisUtils.setex(cacheKey, ttl, JSON.stringify(data));

    console.log(`📍 Cached ${type} data for key: ${key} (TTL: ${ttl}s)`);

    return NextResponse.json({
      success: true,
      message: 'Data cached successfully',
      key: cacheKey,
      ttl: ttl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('💥 Cache storage error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to cache data'
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const key = searchParams.get('key');
    const pattern = searchParams.get('pattern');

    if (pattern) {
      // Delete multiple keys matching pattern
      const cachePattern = `location:${pattern}`;
      const deletedCount = await redisUtils.deletePattern(cachePattern);

      console.log(`📍 Deleted ${deletedCount} cached entries matching pattern: ${cachePattern}`);

      return NextResponse.json({
        success: true,
        message: `Deleted ${deletedCount} cached entries`,
        pattern: cachePattern
      });
    }

    if (!type || !key) {
      return NextResponse.json({
        success: false,
        message: 'Type and key parameters are required for single deletion'
      }, { status: 400 });
    }

    // Delete single key
    const cacheKey = `location:${type}:${key}`;
    const deleted = await redisUtils.del(cacheKey);

    console.log(`📍 Deleted cached entry: ${cacheKey}`);

    return NextResponse.json({
      success: true,
      message: deleted ? 'Cache entry deleted' : 'Cache entry not found',
      deleted: deleted > 0
    });

  } catch (error) {
    console.error('💥 Cache deletion error:', error);
    return NextResponse.json({
      success: false,
      message: 'Failed to delete cached data'
    }, { status: 500 });
  }
}