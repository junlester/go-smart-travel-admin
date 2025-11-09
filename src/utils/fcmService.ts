import { getMessaging, MulticastMessage } from 'firebase-admin/messaging';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/configs/firebase';
import { 
  sendBulkEmailNotification, 
  sendTripReminderEmail, 
  sendWeatherAlertEmail, 
  sendPromotionalEmail 
} from './emailService';

// Type definitions
interface UserData {
  id: string;
  fcmToken?: string;
  email?: string;
  segments?: string[];
  uid?: string;
  [key: string]: any;
}

interface NotificationResult {
  success: boolean;
  message: string;
  successCount?: number;
  failureCount?: number;
  responses?: any[];
  messageId?: string;
  results?: Array<{
    recipient: string;
    success: boolean;
    messageId?: string;
    error?: any;
  }>;
}

interface NotificationResults {
  fcm: NotificationResult | null;
  email: NotificationResult | null;
}

// Lazy initialization of Firebase Admin SDK
// Don't initialize during build time - only initialize when actually needed at runtime
let messaging: ReturnType<typeof getMessaging> | null = null;
let isInitialized = false;

function initializeFirebaseAdmin() {
  // Skip initialization during build time
  // Check for various build-time indicators
  const isBuildTime = 
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-export' ||
    (typeof process !== 'undefined' && process.env.VERCEL === '1' && !process.env.VERCEL_ENV) ||
    (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV);
  
  if (isBuildTime) {
    // During build, we don't have access to service account file
    // Return null and let the functions handle it gracefully
    // This is expected behavior - Firebase Admin will initialize at runtime when API is called
    return null;
  }

  // Skip if already initialized
  if (isInitialized && messaging) {
    return messaging;
  }

  // Only initialize if not already initialized
  if (!getApps().length) {
    let serviceAccount: any = null;
    const path = require('path');
    const fs = require('fs');
    
    console.log('🔍 [Firebase Admin] Looking for service account file...');
    console.log('   Current working directory:', process.cwd());
    console.log('   __dirname:', __dirname);
    
    // Try multiple paths for service account file
    const possiblePaths = [
      path.join(process.cwd(), 'service-account.json'), // Current working directory
      path.join(process.cwd(), '..', 'service-account.json'), // Parent directory (admin-panel)
      path.join(__dirname, '..', '..', 'service-account.json'), // From src/utils to go-smart-travel-admin
      path.join(__dirname, '..', '..', '..', 'service-account.json'), // From src/utils to admin-panel
      path.resolve(process.cwd(), 'admin-panel', 'service-account.json'), // Absolute path
      path.resolve(process.cwd(), 'service-account.json'), // Absolute from cwd
    ];
    
    // Try to find and load service account file
    for (const serviceAccountPath of possiblePaths) {
      try {
        const normalizedPath = path.normalize(serviceAccountPath);
        console.log(`   🔍 Checking: ${normalizedPath}`);
        if (fs.existsSync(normalizedPath)) {
          console.log(`   ✅ File exists! Reading...`);
          const fileContent = fs.readFileSync(normalizedPath, 'utf8');
          serviceAccount = JSON.parse(fileContent);
          
          // Validate service account structure
          if (!serviceAccount.private_key || !serviceAccount.client_email) {
            console.error(`   ❌ Invalid service account file: missing required fields`);
            serviceAccount = null;
            continue;
          }
          
          console.log(`   ✅ Successfully loaded service account from: ${normalizedPath}`);
          break;
        } else {
          console.log(`   ❌ File does not exist`);
        }
      } catch (err: any) {
        console.error(`   ❌ Error checking ${serviceAccountPath}: ${err.message}`);
        // Continue to next path
      }
    }
    
    // Also try environment variables as fallback
    if (!serviceAccount) {
      console.log('⚠️ [Firebase Admin] Service account file not found, checking environment variables...');
      if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        try {
          serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          console.log('✅ Found service account in environment variable');
        } catch (err: any) {
          console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT environment variable:', err.message);
        }
      } else {
        console.log('   ❌ FIREBASE_SERVICE_ACCOUNT environment variable not set');
      }
    }
    
    if (serviceAccount) {
      try {
        console.log('🔧 [Firebase Admin] Initializing with service account credentials...');
        initializeApp({
          credential: cert(serviceAccount),
          projectId: "go-smart-travel-app"
        });
        console.log('✅ [Firebase Admin] SDK initialized successfully with service account');
        isInitialized = true;
      } catch (initError: any) {
        console.error('❌ [Firebase Admin] Error initializing with service account:', initError.message);
        console.error('   Stack:', initError.stack);
        // Don't throw during build - just log and return null
        // This allows the build to succeed, and Firebase Admin will be initialized at runtime
        return null;
      }
    } else {
      // Service account not found - return null gracefully
      // During build, this is expected. At runtime, check for FIREBASE_SERVICE_ACCOUNT env var in Vercel
      // The functions will handle null messaging instance gracefully
      // Only log error if not in build time (to avoid build logs clutter)
      if (!isBuildTime) {
        console.warn('⚠️ [Firebase Admin] Service account not found - FCM features will not work until configured');
        console.warn('💡 Set FIREBASE_SERVICE_ACCOUNT environment variable in Vercel with the service account JSON');
      }
      return null;
    }
  }

  // Get messaging instance
  try {
    messaging = getMessaging();
    isInitialized = true;
    return messaging;
  } catch (error: any) {
    console.error('❌ [Firebase Admin] Error getting messaging instance:', error.message);
    return null;
  }
}

// Get messaging instance (lazy initialization)
function getMessagingInstance() {
  if (!messaging) {
    messaging = initializeFirebaseAdmin();
  }
  return messaging;
}

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
    // Get messaging instance (lazy initialization)
    const messagingInstance = getMessagingInstance();
    
    if (!messagingInstance) {
      console.warn('⚠️ Firebase Admin SDK not initialized - FCM notifications disabled');
      return {
        success: false,
        message: 'FCM service not available. Firebase Admin SDK not configured.',
        successCount: 0,
        failureCount: tokens.length,
        responses: []
      };
    }
    
    console.log(`📱 Sending FCM notification to ${tokens.length} tokens...`);
    
    const message: MulticastMessage = {
      notification: {
        title: notification.title,
        body: notification.message,
        imageUrl: notification.imageUrl
      },
      data: {
        ...notification.data,
        actionUrl: notification.actionUrl || '',
        click_action: notification.actionUrl || ''
      } as { [key: string]: string },
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

    const response = await messagingInstance.sendEachForMulticast(message);
    
    console.log('📱 FCM notification sent:', response);
    console.log(`✅ Successfully sent: ${response.successCount}`);
    console.log(`❌ Failed: ${response.failureCount}`);
    
    if (response.failureCount > 0) {
      response.responses.forEach((resp: any, idx: number) => {
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
    const users: UserData[] = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserData));
    
    const fcmTokens = users
      .map(user => user.fcmToken)
      .filter((token): token is string => typeof token === 'string' && token.length > 0);
    
    const emailAddresses = users
      .map(user => user.email)
      .filter((email): email is string => typeof email === 'string' && email.includes('@'));
    
    console.log(`📱 Found ${fcmTokens.length} FCM tokens and ${emailAddresses.length} email addresses`);
    
    const results: NotificationResults = {
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
    const users: UserData[] = usersSnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() } as UserData))
      .filter(user => {
        const userSegments = user.segments || [];
        return segments.some(segment => userSegments.includes(segment));
      });
    
    const fcmTokens = users
      .map(user => user.fcmToken)
      .filter((token): token is string => typeof token === 'string' && token.length > 0);
    
    const emailAddresses = users
      .map(user => user.email)
      .filter((email): email is string => typeof email === 'string' && email.includes('@'));
    
    console.log(`📱 Found ${fcmTokens.length} FCM tokens and ${emailAddresses.length} email addresses for segments`);
    
    const results: NotificationResults = {
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
    const users: UserData[] = [];
    
    for (const userId of userIds) {
      const userQuery = query(collection(db, 'users'), where('uid', '==', userId));
      const userSnapshot = await getDocs(userQuery);
      
      userSnapshot.forEach(doc => {
        users.push({ id: doc.id, ...doc.data() } as UserData);
      });
    }
    
    const fcmTokens = users
      .map(user => user.fcmToken)
      .filter((token): token is string => typeof token === 'string' && token.length > 0);
    
    const emailAddresses = users
      .map(user => user.email)
      .filter((email): email is string => typeof email === 'string' && email.includes('@'));
    
    console.log(`📱 Found ${fcmTokens.length} FCM tokens and ${emailAddresses.length} email addresses for specified users`);
    
    const results: NotificationResults = {
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

  const results: NotificationResults = {
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

  const results: NotificationResults = {
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

  const results: NotificationResults = {
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
