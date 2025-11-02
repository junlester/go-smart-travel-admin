import { NextRequest, NextResponse } from 'next/server';
import { 
  sendNotificationToTokens,
  sendNotificationToAll,
  sendNotificationToSegments,
  sendNotificationToUsers
} from '../../../utils/fcmService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let result;

    switch (type) {
      case 'broadcast':
        // If FCM tokens are provided, use them; otherwise use default behavior
        if (data.fcmTokens && data.fcmTokens.length > 0) {
          result = await sendNotificationToTokens(data.fcmTokens, data);
        } else {
          result = await sendNotificationToAll(data);
        }
        break;
      
      case 'segments':
        // If FCM tokens are provided, use them; otherwise use segments
        if (data.fcmTokens && data.fcmTokens.length > 0) {
          result = await sendNotificationToTokens(data.fcmTokens, data);
        } else {
          result = await sendNotificationToSegments(data.segments || [], data);
        }
        break;
      
      case 'users':
        // If FCM tokens are provided, use them; otherwise use user IDs
        if (data.fcmTokens && data.fcmTokens.length > 0) {
          result = await sendNotificationToTokens(data.fcmTokens, data);
        } else {
          result = await sendNotificationToUsers(data.userIds || [], data);
        }
        break;
      
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, result });
  } catch (error) {
    console.error('Notification API error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}
