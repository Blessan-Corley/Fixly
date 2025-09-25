// app/api/cron/notifications/route.js
import { NextResponse } from 'next/server';
import connectDB from '../../../../lib/db';
import { scheduleAutomatedReminders } from '../../../../lib/services/automatedMessaging';

export const dynamic = 'force-dynamic';

// Notification processing cron (runs every 15 minutes)
export async function GET(request) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization');
    if (process.env.NODE_ENV === 'production' && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Running notification processing cron job...');

    await connectDB();

    // Process automated reminders
    await scheduleAutomatedReminders();

    // Additional notification tasks can be added here
    // Such as:
    // - Push notification delivery
    // - Email digest sending
    // - SMS reminders
    // - Webhook deliveries

    return NextResponse.json({
      success: true,
      message: 'Notification processing completed',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notification cron error:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request) {
  return GET(request);
}