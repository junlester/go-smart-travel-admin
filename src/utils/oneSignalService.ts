/**
 * OneSignal REST API Service for Admin Panel
 * Send notifications from admin to users
 */

const ONESIGNAL_APP_ID = '13dc81ce-ce9a-4552-bc75-60c98a028b90';
const ONESIGNAL_REST_API_KEY = 'os_v2_app_cpoidtwotjcvfpdvmdeyuaulscdrvv76z4ju22vwftoqj45t2yeqcm26kfi6oce5qmz7hmoze34ivb2vueudsxg5dmqb5znt4a7wtcq';

interface NotificationData {
  title: string;
  message: string;
  data?: Record<string, any>;
  imageUrl?: string;
  actionUrl?: string;
}

interface SegmentNotification extends NotificationData {
  segments: string[];
}

interface UserNotification extends NotificationData {
  playerIds: string[];
}

/**
 * Send notification to all users
 */
export const sendNotificationToAll = async (notification: NotificationData) => {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: notification.title },
        contents: { en: notification.message },
        included_segments: ['All'],
        data: notification.data || {},
        large_icon: notification.imageUrl,
        url: notification.actionUrl,
        send_after: 'now',
        // Add these to ensure notifications appear on phone
        priority: 10,
        ttl: 86400,
        collapse_id: 'go-smart-travel'
      })
    });

    const result = await response.json();
    console.log('📱 Notification sent to all users:', result);
    
    if (result.errors && result.errors.length > 0) {
      console.warn('⚠️ OneSignal warnings:', result.errors);
      // Handle common errors
      if (result.errors.includes('All included players are not subscribed')) {
        console.log('ℹ️ No users are currently subscribed to notifications');
        console.log('ℹ️ This is normal for new apps or when users haven\'t granted notification permissions');
      }
    }
    
    console.log('📱 Notification ID:', result.id || 'No ID (no subscribers)');
    console.log('📱 Recipients:', result.recipients || 0);
    return result;
  } catch (error) {
    console.error('❌ Error sending notification to all users:', error);
    throw error;
  }
};

/**
 * Send notification to specific segments
 */
export const sendNotificationToSegments = async (notification: SegmentNotification) => {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: notification.title },
        contents: { en: notification.message },
        included_segments: notification.segments,
        data: notification.data || {},
        large_icon: notification.imageUrl,
        url: notification.actionUrl,
        send_after: 'now',
        // Add these to ensure notifications appear on phone
        priority: 10,
        ttl: 86400,
        collapse_id: 'go-smart-travel'
      })
    });

    const result = await response.json();
    console.log('📱 Notification sent to segments:', result);
    console.log('📱 Notification ID:', result.id);
    console.log('📱 Recipients:', result.recipients);
    return result;
  } catch (error) {
    console.error('❌ Error sending notification to segments:', error);
    throw error;
  }
};

/**
 * Send notification to specific users
 */
export const sendNotificationToUsers = async (notification: UserNotification) => {
  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        headings: { en: notification.title },
        contents: { en: notification.message },
        include_player_ids: notification.playerIds,
        data: notification.data || {},
        large_icon: notification.imageUrl,
        url: notification.actionUrl,
        send_after: 'now',
        // Add these to ensure notifications appear on phone
        priority: 10,
        ttl: 86400,
        collapse_id: 'go-smart-travel'
      })
    });

    const result = await response.json();
    console.log('📱 Notification sent to users:', result);
    console.log('📱 Notification ID:', result.id);
    console.log('📱 Recipients:', result.recipients);
    return result;
  } catch (error) {
    console.error('❌ Error sending notification to users:', error);
    throw error;
  }
};

/**
 * Send trip reminder notification
 */
export const sendTripReminder = async (playerIds: string[], tripData: {
  destination: string;
  startDate: string;
  tripId: string;
}) => {
  const notification: UserNotification = {
    title: `🌴 Trip Reminder: ${tripData.destination}`,
    message: `Your trip to ${tripData.destination} starts ${tripData.startDate}. Don't forget to check your itinerary!`,
    playerIds,
    data: {
      type: 'trip_reminder',
      tripId: tripData.tripId,
      destination: tripData.destination,
      startDate: tripData.startDate
    }
  };

  return await sendNotificationToUsers(notification);
};

/**
 * Send weather alert notification
 */
export const sendWeatherAlert = async (playerIds: string[], weatherData: {
  location: string;
  condition: string;
  temperature: string;
  advice: string;
}) => {
  const notification: UserNotification = {
    title: `🌤️ Weather Alert: ${weatherData.location}`,
    message: `${weatherData.condition} - ${weatherData.temperature}°C. ${weatherData.advice}`,
    playerIds,
    data: {
      type: 'weather_alert',
      location: weatherData.location,
      condition: weatherData.condition,
      temperature: weatherData.temperature
    }
  };

  return await sendNotificationToUsers(notification);
};

/**
 * Send promotional notification
 */
export const sendPromotionalNotification = async (segments: string[], promoData: {
  title: string;
  message: string;
  promoCode: string;
  discount: string;
  destination: string;
}) => {
  const notification: SegmentNotification = {
    title: promoData.title,
    message: promoData.message,
    segments,
    data: {
      type: 'promotion',
      promoCode: promoData.promoCode,
      discount: promoData.discount,
      destination: promoData.destination
    }
  };

  return await sendNotificationToSegments(notification);
};

/**
 * Send booking confirmation notification
 */
export const sendBookingConfirmation = async (playerIds: string[], bookingData: {
  destination: string;
  bookingId: string;
  checkInDate: string;
  totalAmount: string;
}) => {
  const notification: UserNotification = {
    title: `✅ Booking Confirmed!`,
    message: `Your trip to ${bookingData.destination} has been booked successfully. Booking ID: ${bookingData.bookingId}`,
    playerIds,
    data: {
      type: 'booking_confirmation',
      bookingId: bookingData.bookingId,
      destination: bookingData.destination,
      checkInDate: bookingData.checkInDate,
      totalAmount: bookingData.totalAmount
    }
  };

  return await sendNotificationToUsers(notification);
};

/**
 * Send maintenance notification
 */
export const sendMaintenanceNotification = async (message: string, scheduledTime?: string) => {
  const notification: NotificationData = {
    title: '🔧 App Maintenance',
    message: scheduledTime 
      ? `Scheduled maintenance: ${message}. Time: ${scheduledTime}`
      : `Maintenance in progress: ${message}`,
    data: {
      type: 'maintenance',
      scheduledTime: scheduledTime || 'now'
    }
  };

  return await sendNotificationToAll(notification);
};

/**
 * Send feature announcement
 */
export const sendFeatureAnnouncement = async (featureData: {
  featureName: string;
  description: string;
  actionText: string;
  actionUrl?: string;
}) => {
  const notification: NotificationData = {
    title: `🎉 New Feature: ${featureData.featureName}`,
    message: featureData.description,
    actionUrl: featureData.actionUrl,
    data: {
      type: 'feature_announcement',
      featureName: featureData.featureName,
      actionText: featureData.actionText
    }
  };

  return await sendNotificationToAll(notification);
};

/**
 * Get notification statistics
 */
export const getNotificationStats = async (notificationId: string) => {
  try {
    const response = await fetch(`https://onesignal.com/api/v1/notifications/${notificationId}?app_id=${ONESIGNAL_APP_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Error getting notification stats:', error);
    throw error;
  }
};

/**
 * Get app statistics
 */
export const getAppStats = async () => {
  try {
    const response = await fetch(`https://onesignal.com/api/v1/apps/${ONESIGNAL_APP_ID}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY}`
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Error getting app stats:', error);
    throw error;
  }
};
