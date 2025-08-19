import { NextResponse } from 'next/server';

// Import server-side analytics safely
async function getServerAnalytics() {
  try {
    // Dynamic import to avoid client-side issues
    const { initializeAnalytics } = await import('../../../../lib/analytics');
    return await initializeAnalytics();
  } catch (error) {
    console.warn('Server analytics not available:', error.message);
    return null;
  }
}

export async function POST(request) {
  try {
    const event = await request.json();
    
    // Validate event structure
    if (!event.type || !event.context) {
      return NextResponse.json({
        success: false,
        error: 'Invalid event structure'
      }, { status: 400 });
    }
    
    // Get server analytics instance
    const analytics = await getServerAnalytics();
    
    if (analytics) {
      // Track with server analytics
      await analytics.trackEvent(event.type, event.data || {}, {
        ...event.context,
        source: 'client'
      });
    }
    
    return NextResponse.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to track event'
    }, { status: 500 });
  }
}