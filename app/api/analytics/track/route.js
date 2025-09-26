// Analytics tracking endpoint - Simple mock for production
export async function POST(request) {
  try {
    // Check if request has body
    const contentLength = request.headers.get('content-length');
    if (!contentLength || contentLength === '0') {
      console.warn('📊 Analytics: Empty request body, skipping tracking');
      return Response.json({
        success: true,
        message: 'Empty request ignored'
      });
    }

    // Get request body as text first to check if it's valid
    const body = await request.text();
    if (!body || body.trim() === '') {
      console.warn('📊 Analytics: Empty body content, skipping tracking');
      return Response.json({
        success: true,
        message: 'Empty content ignored'
      });
    }

    // Parse JSON safely
    let data;
    try {
      data = JSON.parse(body);
    } catch (parseError) {
      console.warn('📊 Analytics: Invalid JSON received, skipping tracking:', parseError.message);
      return Response.json({
        success: true,
        message: 'Invalid JSON ignored'
      });
    }

    // In production, you might want to send this to Google Analytics,
    // Mixpanel, or other analytics service
    console.log('📊 Analytics tracked:', data);

    return Response.json({
      success: true,
      message: 'Event tracked successfully'
    });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    return Response.json(
      { success: false, error: 'Failed to track event' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({ 
    status: 'Analytics service is running',
    timestamp: new Date().toISOString()
  });
}