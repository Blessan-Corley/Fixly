import { NextResponse } from 'next/server';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BL-example-key';

export async function GET(request) {
  try {
    if (!VAPID_PUBLIC_KEY || VAPID_PUBLIC_KEY === 'BL-example-key') {
      return NextResponse.json(
        { error: 'VAPID keys not configured' },
        { status: 503 }
      );
    }

    return NextResponse.json({
      publicKey: VAPID_PUBLIC_KEY
    });
  } catch (error) {
    console.error('VAPID key endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get VAPID key' },
      { status: 500 }
    );
  }
}