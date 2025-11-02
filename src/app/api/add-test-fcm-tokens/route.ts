import { NextRequest, NextResponse } from 'next/server';
import { addTestFCMTokens, removeTestFCMTokens } from '../../../utils/addTestFCMTokens';

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json();
    
    if (action === 'add') {
      const result = await addTestFCMTokens();
      return NextResponse.json(result);
    } else if (action === 'remove') {
      const result = await removeTestFCMTokens();
      return NextResponse.json(result);
    } else {
      return NextResponse.json(
        { success: false, message: 'Invalid action. Use "add" or "remove".' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('❌ Error in add-test-fcm-tokens API:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to process request' },
      { status: 500 }
    );
  }
}
