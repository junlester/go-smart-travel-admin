import { NextRequest, NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'OneSignal API is working!',
    timestamp: new Date().toISOString(),
    status: 'success'
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    return NextResponse.json({ 
      message: 'Test notification endpoint is working!',
      receivedData: body,
      timestamp: new Date().toISOString(),
      status: 'success'
    });
  } catch (error) {
    return NextResponse.json({ 
      error: 'Failed to process test request',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
