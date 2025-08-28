import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    const { subscription } = await request.json();

    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription' },
        { status: 400 }
      );
    }

    // For now, just validate the subscription format
    // In a real implementation, you might test sending a message
    const isValid = subscription.endpoint && 
                   subscription.keys && 
                   subscription.keys.auth && 
                   subscription.keys.p256dh;

    if (isValid) {
      return NextResponse.json({ 
        valid: true,
        message: 'Subscription is valid'
      });
    } else {
      return NextResponse.json({ 
        valid: false,
        message: 'Subscription format is invalid'
      }, { status: 400 });
    }

  } catch (error) {
    console.error('Test subscription error:', error);
    return NextResponse.json(
      { error: 'Failed to test subscription' },
      { status: 500 }
    );
  }
}