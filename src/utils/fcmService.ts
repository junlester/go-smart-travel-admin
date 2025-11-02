import { getMessaging } from 'firebase-admin/messaging';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/configs/firebase';
import { 
  sendBulkEmailNotification, 
  sendTripReminderEmail, 
  sendWeatherAlertEmail, 
  sendPromotionalEmail 
} from './emailService';

// Initialize Firebase Admin SDK
if (!getApps().length) {
  try {
    // Try to load service account key
    const serviceAccount = require('../../service-account.json');
    initializeApp({
      credential: cert(serviceAccount),
      projectId: "go-smart-travel-app"
    });
  } catch (error) {
    console.warn('Service account key not found, using default credentials');
    // Fallback to default credentials (for development)
    initializeApp({
      projectId: "go-smart-travel-app"
    });
  }
}

const messaging = getMessaging();

// Notification data interface
export interface FCMNotificationData {
  title: string;
  message: string;
  imageUrl?: string;
  actionUrl?: string;
  data?: Record<string, any>;
  sendEmail?: boolean; // New field to enable email notifications
}

/**
 * Send notification to specific FCM tokens
 */
export const sendNotificationToTokens = async (tokens: string[], notification: FCMNotificationData) => {
  try {
    console.log(`📱 Sending FCM notification to ${tokens.length} tokens...`);
    
    const message = {
      notification: {
        title: notification.title,
        body: notification.message,
        imageUrl: notification.imageUrl
      },
      data: {
        ...notification.data,
        actionUrl: notification.actionUrl || '',
        click_action: notification.actionUrl || ''
      },
      tokens: tokens,
      android: {
        notification: {
          channelId: 'default',
          priority: 'high' as const,
          sound: 'default'
        }
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1
          }
        }
      }
    };

    const response = await messaging.sendMulticast(message);
    
    console.log('📱 FCM notification sent:', response);
    console.log(`✅ Successfully sent: ${response.successCount}`);
    console.log(`❌ Failed: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          console.warn(`Failed to send to token ${idx}:`, resp.error);
        }
      });
    }
    
    return {
      success: response.successCount > 0,
      message: `Sent to ${response.successCount} device(s). ${response.failureCount > 0 ? `${response.failureCount} failed.` : ''}`,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses
    };
  } catch (error) {
    console.error('❌ Error sending FCM notification:', error);
    throw error;
  }
};

/**
 * Send notification to all users (fetches FCM tokens from Firebase)
 */
export const sendNotificationToAll = async (notification: FCMNotificationData) => {
  try {
    console.log('📱 Fetching user data from Firebase...');
    
    // Fetch all users from Firebase
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    const fcmTokens = users
      .map(user => user.fcmToken)
      .filter(token => token && typeof token === 'string' && token.length > 0);
    
    const emailAddresses = users
      .map(user => user.email)
      .filter(email => email && typeof email === 'string' && email.includes('@'));
    
    console.log(`📱 Found ${fcmTokens.length} FCM tokens and ${emailAddresses.length} email addresses`);
    
    const results = {
      fcm: null,
      email: null
    };
    
    // Send FCM notifications
    if (fcmTokens.length > 0) {
      results.fcm = await sendNotificationToTokens(fcmTokens, notification);
    } else {
      console.warn('⚠️ No users with FCM tokens found');
      results.fcm = {
        success: false,
        message: 'No users with FCM tokens found'
      };
    }
    
    // Send email notifications if enabled
    if (notification.sendEmail && emailAddresses.length > 0) {
      try {
        console.log('📧 Sending email notifications...');
        results.email = await sendBulkEmailNotification(
          emailAddresses,
          notification.title,
          notification.message,
          notification.actionUrl,
          notification.imageUrl
        );
      } catch (emailError) {
        console.error('❌ Error sending email notifications:', emailError);
        results.email = {
          success: false,
          message: 'Failed to send email notifications'
        };
      }
    }
    
    return {
      success: results.fcm?.success || results.email?.success || false,
      message: `FCM: ${results.fcm?.message || 'No FCM tokens'}. Email: ${results.email?.message || 'Not sent'}`,
      fcm: results.fcm,
      email: results.email
    };
  } catch (error) {
    console.error('❌ Error sending notification to all users:', error);
    throw error;
  }
};

/**
 * Send notification to specific segments (fetches FCM tokens from Firebase)
 */
export const sendNotificationToSegments = async (segments: string[], notification: FCMNotificationData) => {
  try {
    console.log(`📱 Fetching user data for segments: ${segments.join(', ')}`);
    
    // Fetch users for specific segments
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .filter(user => {
        const userSegments = user.segments || [];
        return segments.some(segment => userSegments.includes(segment));
      });
    
    const fcmTokens = users
      .map(user => user.fcmToken)
      .filter(token => token && typeof token === 'string' && token.length > 0);
    
    const emailAddresses = users
      .map(user => user.email)
      .filter(email => email && typeof email === 'string' && email.includes('@'));
    
    console.log(`📱 Found ${fcmTokens.length} FCM tokens and ${emailAddresses.length} email addresses for segments`);
    
    const results = {
      fcm: null,
      email: null
    };
    
    // Send FCM notifications
    if (fcmTokens.length > 0) {
      results.fcm = await sendNotificationToTokens(fcmTokens, notification);
    } else {
      console.warn('⚠️ No users with FCM tokens found for segments');
      results.fcm = {
        success: false,
        message: 'No users with FCM tokens found for segments'
      };
    }
    
    // Send email notifications if enabled
    if (notification.sendEmail && emailAddresses.length > 0) {
      try {
        console.log('📧 Sending email notifications to segments...');
        results.email = await sendBulkEmailNotification(
          emailAddresses,
          notification.title,
          notification.message,
          notification.actionUrl,
          notification.imageUrl
        );
      } catch (emailError) {
        console.error('❌ Error sending email notifications to segments:', emailError);
        results.email = {
          success: false,
          message: 'Failed to send email notifications to segments'
        };
      }
    }
    
    return {
      success: results.fcm?.success || results.email?.success || false,
      message: `FCM: ${results.fcm?.message || 'No FCM tokens'}. Email: ${results.email?.message || 'Not sent'}`,
      fcm: results.fcm,
      email: results.email
    };
  } catch (error) {
    console.error('❌ Error sending notification to segments:', error);
    throw error;
  }
};

/**
 * Send notification to specific users (fetches FCM tokens from Firebase)
 */
export const sendNotificationToUsers = async (userIds: string[], notification: FCMNotificationData) => {
  try {
    console.log(`📱 Fetching user data for ${userIds.length} users...`);
    
    // Fetch user data for specific users
    const users = [];
    
    for (const userId of userIds) {
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      
      userSnapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() });
      });
    }
    
    const fcmTokens = users
      .map(user => user.fcmToken)
      .filter(token => token && typeof token === 'string' && token.length > 0);
    
    const emailAddresses = users
      .map(user => user.email)
      .filter(email => email && typeof email === 'string' && email.includes('@'));
    
    console.log(`📱 Found ${fcmTokens.length} FCM tokens and ${emailAddresses.length} email addresses for specified users`);
    
    const results = {
      fcm: null,
      email: null
    };
    
    // Send FCM notifications
    if (fcmTokens.length > 0) {
      results.fcm = await sendNotificationToTokens(fcmTokens, notification);
    } else {
      console.warn('⚠️ No FCM tokens found for specified users');
      results.fcm = {
        success: false,
        message: 'No FCM tokens found for specified users'
      };
    }
    
    // Send email notifications if enabled
    if (notification.sendEmail && emailAddresses.length > 0) {
      try {
        console.log('📧 Sending email notifications to specific users...');
        results.email = await sendBulkEmailNotification(
          emailAddresses,
          notification.title,
          notification.message,
          notification.actionUrl,
          notification.imageUrl
        );
      } catch (emailError) {
        console.error('❌ Error sending email notifications to specific users:', emailError);
        results.email = {
          success: false,
          message: 'Failed to send email notifications to specific users'
        };
      }
    }
    
    return {
      success: results.fcm?.success || results.email?.success || false,
      message: `FCM: ${results.fcm?.message || 'No FCM tokens'}. Email: ${results.email?.message || 'Not sent'}`,
      fcm: results.fcm,
      email: results.email
    };
  } catch (error) {
    console.error('❌ Error sending notification to users:', error);
    throw error;
  }
};

/**
 * Send trip reminder notification
 */
export const sendTripReminder = async (
  fcmToken: string,
  email: string,
  destination: string,
  startDate: string,
  tripId: string
) => {
  const notification: FCMNotificationData = {
    title: 'Trip Reminder',
    message: `Your trip to ${destination} starts on ${startDate}. Get ready for an amazing adventure!`,
    data: {
      type: 'trip_reminder',
      tripId: tripId,
      destination: destination,
      startDate: startDate
    },
    sendEmail: true
  };

  const results = {
    fcm: null,
    email: null
  };

  // Send FCM notification
  if (fcmToken) {
    results.fcm = await sendNotificationToTokens([fcmToken], notification);
  }

  // Send email notification
  if (email) {
    try {
      results.email = await sendTripReminderEmail(email, destination, startDate, tripId);
    } catch (error) {
      console.error('❌ Error sending trip reminder email:', error);
      results.email = {
        success: false,
        message: 'Failed to send trip reminder email'
      };
    }
  }

  return {
    success: results.fcm?.success || results.email?.success || false,
    message: `FCM: ${results.fcm?.message || 'Not sent'}. Email: ${results.email?.message || 'Not sent'}`,
    fcm: results.fcm,
    email: results.email
  };
};

/**
 * Send weather alert notification
 */
export const sendWeatherAlert = async (
  fcmToken: string,
  email: string,
  location: string,
  condition: string,
  temperature: string,
  advice: string
) => {
  const notification: FCMNotificationData = {
    title: 'Weather Alert',
    message: `${condition} in ${location}. Temperature: ${temperature}. ${advice}`,
    data: {
      type: 'weather_alert',
      location: location,
      condition: condition,
      temperature: temperature,
      advice: advice
    },
    sendEmail: true
  };

  const results = {
    fcm: null,
    email: null
  };

  // Send FCM notification
  if (fcmToken) {
    results.fcm = await sendNotificationToTokens([fcmToken], notification);
  }

  // Send email notification
  if (email) {
    try {
      results.email = await sendWeatherAlertEmail(email, location, condition, temperature, advice);
    } catch (error) {
      console.error('❌ Error sending weather alert email:', error);
      results.email = {
        success: false,
        message: 'Failed to send weather alert email'
      };
    }
  }

  return {
    success: results.fcm?.success || results.email?.success || false,
    message: `FCM: ${results.fcm?.message || 'Not sent'}. Email: ${results.email?.message || 'Not sent'}`,
    fcm: results.fcm,
    email: results.email
  };
};

/**
 * Send promotional notification
 */
export const sendPromoNotification = async (
  fcmTokens: string[],
  emailAddresses: string[],
  title: string,
  message: string,
  promoCode: string,
  discount: string,
  destination: string
) => {
  const notification: FCMNotificationData = {
    title: title,
    message: message,
    data: {
      type: 'promo',
      promoCode: promoCode,
      discount: discount,
      destination: destination
    },
    sendEmail: true
  };

  const results = {
    fcm: null,
    email: null
  };

  // Send FCM notifications
  if (fcmTokens.length > 0) {
    results.fcm = await sendNotificationToTokens(fcmTokens, notification);
  }

  // Send email notifications
  if (emailAddresses.length > 0) {
    try {
      results.email = await sendBulkEmailNotification(
        emailAddresses,
        title,
        message,
        `https://your-app.com/promo/${promoCode}`
      );
    } catch (error) {
      console.error('❌ Error sending promotional emails:', error);
      results.email = {
        success: false,
        message: 'Failed to send promotional emails'
      };
    }
  }

  return {
    success: results.fcm?.success || results.email?.success || false,
    message: `FCM: ${results.fcm?.message || 'Not sent'}. Email: ${results.email?.message || 'Not sent'}`,
    fcm: results.fcm,
    email: results.email
  };
};
