// app/api/cron/automated-messages/route.js
import { NextResponse } from 'next/server';
import { scheduleAutomatedReminders } from '../../../../lib/services/automatedMessaging';

export const dynamic = 'force-dynamic';

// Cron job for automated messaging
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

    console.log('Running automated messaging cron job...');

    // Execute scheduled reminders
    await scheduleAutomatedReminders();

    return NextResponse.json({
      success: true,
      message: 'Automated messages processed successfully',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Automated messaging cron error:', error);

    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// Also support POST for manual triggers
export async function POST(request) {
  return GET(request);
}