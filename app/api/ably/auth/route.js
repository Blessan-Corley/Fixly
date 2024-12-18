import { NextResponse } from 'next/server';
import Ably from 'ably';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  const session = await getServerSession(authOptions);

  if (!process.env.ABLY_ROOT_KEY) {
    return NextResponse.json(
      { error: 'Missing ABLY_ROOT_KEY environment variable' },
      { status: 500 }
    );
  }

  const clientId = session?.user?.id || 'guest';
  
  // Define capabilities based on user role
  // authenticated users can publish to some channels, guests can only subscribe
  const capability = session 
    ? { '*': ['publish', 'subscribe', 'presence'] } 
    : { '*': ['subscribe'] };

  try {
    const client = new Ably.Rest(process.env.ABLY_ROOT_KEY);
    
    const tokenRequestData = await new Promise((resolve, reject) => {
      client.auth.createTokenRequest(
        {
          clientId: clientId,
          capability: JSON.stringify(capability),
          // Token expires in 2 hours
          ttl: 2 * 60 * 60 * 1000 
        },
        (err, tokenRequest) => {
          if (err) reject(err);
          else resolve(tokenRequest);
        }
      );
    });

    return NextResponse.json(tokenRequestData);
  } catch (error) {
    console.error('Error creating Ably token request:', error);
    return NextResponse.json(
      { error: 'Failed to create token request' },
      { status: 500 }
    );
  }
}