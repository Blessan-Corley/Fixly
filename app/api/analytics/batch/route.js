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
    const { events } = await request.json();
    
    // Validate events array
    if (!Array.isArray(events) || events.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Invalid events array'
      }, { status: 400 });
    }
    
    // Get server analytics instance
    const analytics = await getServerAnalytics();
    
    let processed = 0;
    let failed = 0;
    
    if (analytics) {
      // Process each event
      for (const event of events) {
        try {
          if (event.type && event.context) {
            await analytics.trackEvent(event.type, event.data || {}, {
              ...event.context,
              source: 'client-batch'
            });
            processed++;
          } else {
            failed++;
          }
        } catch (error) {
          console.warn('Failed to process event:', error.message);
          failed++;
        }
      }
    } else {
      // No analytics available, count as failed
      failed = events.length;
    }
    
    return NextResponse.json({
      success: processed > 0,
      message: `Processed ${processed} events, ${failed} failed`,
      processed,
      failed
    });
  } catch (error) {
    console.error('Analytics batch tracking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to process events batch'
    }, { status: 500 });
  }
}