// app/api/auth/get-context/route.js
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req) {
  try {
    const { sessionData } = await req.json();

    // The sessionData will be sent from the signIn callback
    // It contains the authContext from sessionStorage that was sent via cookie

    return NextResponse.json({
      context: sessionData?.authContext || null
    });
  } catch (error) {
    console.error('Error getting auth context:', error);
    return NextResponse.json(
      { context: null },
      { status: 200 } // Return 200 with null context instead of error
    );
  }
}
