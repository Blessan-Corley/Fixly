// Simple test to check if route works
import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('Test route called');
    return NextResponse.json({ success: true, message: 'Test route works' });
  } catch (error) {
    console.error('Test route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(request) {
  try {
    console.log('Test GET route called');
    return NextResponse.json({ success: true, message: 'Test GET route works' });
  } catch (error) {
    console.error('Test GET route error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}