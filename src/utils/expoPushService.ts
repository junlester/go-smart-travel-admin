/**
 * Expo Push API Service for Admin Panel
 * Send notifications using Expo Push API instead of OneSignal
 */

import { collection, getDocs } from 'firebase/firestore';
import { db } from '../configs/FirebaseConfig';

interface ExpoNotificationData {
  title: string;
  message: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
}

interface ExpoPushMessage {
  to: string | string[];
  title: string;
  body: string;
  data?: Record<string, any>;
  sound?: 'default' | null;
  badge?: number;
  channelId?: string;
}

/**
 * Send notification to specific push tokens
 */
export const sendNotificationToTokens = async (tokens: string[], notification: ExpoNotificationData) => {
  try {
    const messages: ExpoPushMessage[] = tokens.map(token => ({
      to: token,
      title: notification.title,
      body: notification.message,
      data: notification.data || {},
      sound: 'default',
      badge: 1,
      channelId: 'default'
    }));

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages)
    });

    const result = await response.json();
    console.log('📱 Expo Push notification sent:', result);
    
    // Check for errors and report them
    if (result.data) {
      const errors = result.data.filter((ticket: any) => ticket.status === 'error');
      const successes = result.data.filter((ticket: any) => ticket.status === 'ok');
      
      if (errors.length > 0) {
        console.warn(`⚠️ ${errors.length} notification(s) failed to send`);
        errors.forEach((error: any) => {
          console.warn('Failed token:', error.message);
        });
      }
      
      console.log(`✅ ${successes.length} notification(s) sent successfully`);
      
      return {
        success: successes.length > 0,
        message: `Sent to ${successes.length} device(s). ${errors.length > 0 ? `${errors.length} failed (invalid/expired tokens).` : ''}`,
        data: result.data,
        successCount: successes.length,
        errorCount: errors.length
      };
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending Expo Push notification:', error);
    throw error;
  }
};

/**
 * Send notification to all users (fetches tokens from Firebase)
 */
export const sendNotificationToAll = async (notification: ExpoNotificationData) => {
  try {
    console.log('📱 Fetching push tokens from Firebase...');
    
    // Fetch all push tokens from Firebase
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const pushTokens = usersSnapshot.docs
      .map(doc => doc.data().pushToken)
      .filter(token => token && token.startsWith('ExponentPushToken[')); // Filter valid tokens
    
    console.log(`📱 Found ${pushTokens.length} push tokens in database`);
    
    if (pushTokens.length === 0) {
      console.warn('⚠️ No users with push tokens found in database');
      return {
        success: false,
        message: 'No users with push tokens found. Users need to grant notification permissions in the app first.',
        data: null
      };
    }

    return await sendNotificationToTokens(pushTokens, notification);
  } catch (error) {
    console.error('❌ Error sending notification to all users:', error);
    throw error;
  }
};

/**
 * Send notification to specific segments (fetches tokens from Firebase)
 */
export const sendNotificationToSegments = async (segments: string[], notification: ExpoNotificationData) => {
  try {
    console.log('📱 Fetching push tokens for segments from Firebase...');
    
    // Fetch all push tokens from Firebase
    // In a real implementation, you would filter by segment/user type
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const pushTokens = usersSnapshot.docs
      .map(doc => doc.data().pushToken)
      .filter(token => token && token.startsWith('ExponentPushToken['));
    
    console.log(`📱 Found ${pushTokens.length} push tokens for segments`);
    
    if (pushTokens.length === 0) {
      return {
        success: false,
        message: 'No users with push tokens found for the selected segments.',
        data: null
      };
    }

    return await sendNotificationToTokens(pushTokens, notification);
  } catch (error) {
    console.error('❌ Error sending notification to segments:', error);
    throw error;
  }
};

/**
 * Send notification to specific users (fetches tokens from Firebase by user IDs)
 */
export const sendNotificationToUsers = async (userIds: string[], notification: ExpoNotificationData) => {
  try {
    console.log('📱 Fetching push tokens for specific users from Firebase...');
    
    if (!userIds || userIds.length === 0) {
      return {
        success: false,
        message: 'No user IDs provided.',
        data: null
      };
    }
    
    // Fetch push tokens for specific users from Firebase
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const pushTokens = usersSnapshot.docs
      .filter(doc => userIds.includes(doc.id)) // Filter by user IDs
      .map(doc => doc.data().pushToken)
      .filter(token => token && token.startsWith('ExponentPushToken['));
    
    console.log(`📱 Found ${pushTokens.length} push tokens for ${userIds.length} user(s)`);
    
    if (pushTokens.length === 0) {
      return {
        success: false,
        message: 'No push tokens found for the specified users.',
        data: null
      };
    }

    return await sendNotificationToTokens(pushTokens, notification);
  } catch (error) {
    console.error('❌ Error sending notification to users:', error);
    throw error;
  }
};

/**
 * Send trip reminder notification
 */
export const sendTripReminder = async (tokens: string[], tripData: {
  destination: string;
  startDate: string;
  tripId: string;
}) => {
  const notification: ExpoNotificationData = {
    title: '🌴 Trip Reminder',
    message: `Your trip to ${tripData.destination} starts on ${tripData.startDate}!`,
    data: {
      type: 'trip_reminder',
      tripId: tripData.tripId,
      destination: tripData.destination,
      startDate: tripData.startDate
    }
  };

  return await sendNotificationToTokens(tokens, notification);
};

/**
 * Send weather alert notification
 */
export const sendWeatherAlert = async (tokens: string[], weatherData: {
  location: string;
  condition: string;
  temperature: string;
  advice: string;
}) => {
  const notification: ExpoNotificationData = {
    title: '🌤️ Weather Alert',
    message: `${weatherData.condition} in ${weatherData.location} - ${weatherData.temperature}. ${weatherData.advice}`,
    data: {
      type: 'weather_alert',
      location: weatherData.location,
      condition: weatherData.condition,
      temperature: weatherData.temperature,
      advice: weatherData.advice
    }
  };

  return await sendNotificationToTokens(tokens, notification);
};

/**
 * Send promotional notification
 */
export const sendPromotionalNotification = async (tokens: string[], promoData: {
  title: string;
  message: string;
  promoCode: string;
  discount: string;
  destination: string;
}) => {
  const notification: ExpoNotificationData = {
    title: promoData.title,
    message: `${promoData.message} Use code: ${promoData.promoCode} for ${promoData.discount} off!`,
    data: {
      type: 'promotional',
      promoCode: promoData.promoCode,
      discount: promoData.discount,
      destination: promoData.destination
    }
  };

  return await sendNotificationToTokens(tokens, notification);
};
