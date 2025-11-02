import { NextResponse } from 'next/server';
import { GOOGLE_MAPS_API_KEY } from '@/constants/APIKeys';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('query');

  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter is required' },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(
        query + ' in philippines'
      )}&key=${GOOGLE_MAPS_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Google API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching places from Google API:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch places' },
      { status: 500 }
    );
  }
} 