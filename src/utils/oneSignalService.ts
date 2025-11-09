/**
 * OneSignal REST API Service for Admin Panel
 * Send notifications from admin to users
 */

const ONESIGNAL_APP_ID = '13dc81ce-ce9a-4552-bc75-60c98a028b90';
// IMPORTANT: Get your REST API Key from OneSignal Dashboard → Settings → Keys & IDs
// Make sure it's the full key without any spaces or line breaks
const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY || 'os_v2_app_cpoidtwotjcvfpdvmdeyuaulscg3erm7osduer5w3uva6ftqh7exydkwgpyfzo4mb44gj3ztmvzkrehe52ihou3eakanvitq5ax3kri';

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
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        name: notification.title || 'Broadcast Notification',
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
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        name: notification.title || 'Segment Notification',
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
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        name: notification.title || 'User Notification',
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
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
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
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
      }
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('❌ Error getting app stats:', error);
    throw error;
  }
};

/**
 * Send SMS notification to specific phone numbers
 */
export const sendSMSNotification = async (phoneNumbers: string[], message: string, data?: Record<string, any>) => {
  try {
    // Validate phone numbers format (E.164: +[country code][number])
    const validPhoneNumbers = phoneNumbers.filter(phone => {
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      return e164Regex.test(phone);
    });

    if (validPhoneNumbers.length === 0) {
      throw new Error('No valid phone numbers provided. Phone numbers must be in E.164 format (+1234567890)');
    }

    console.log(`📱 Sending SMS to ${validPhoneNumbers.length} phone numbers:`, validPhoneNumbers);
    console.log(`📱 SMS Message: "${message}"`);
    console.log(`📱 OneSignal App ID: ${ONESIGNAL_APP_ID}`);

    const payload = {
      app_id: ONESIGNAL_APP_ID,
      name: 'SMS Notification', // Required field for SMS
      include_phone_numbers: validPhoneNumbers,
      contents: { en: message },
      data: data || {},
      send_after: 'now',
      priority: 10,
      ttl: 86400,
      collapse_id: 'go-smart-travel-sms'
    };

    console.log(`📱 SMS Payload:`, JSON.stringify(payload, null, 2));

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OneSignal API Error Response:', errorText);
      throw new Error(`OneSignal API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('📱 SMS notification response:', JSON.stringify(result, null, 2));
    console.log('📱 Notification ID:', result.id);
    console.log('📱 Recipients:', result.recipients);
    console.log('📱 Success:', !result.errors);
    
    if (result.errors && result.errors.length > 0) {
      console.error('❌ SMS Errors:', result.errors);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error sending SMS notification:', error);
    throw error;
  }
};

/**
 * Send multi-channel notification (Push + Email + SMS)
 * Note: Email is optional and will be skipped if disabled in OneSignal
 */
export const sendMultiChannelNotification = async (options: {
  playerIds?: string[];
  emails?: string[];
  phoneNumbers?: string[];
  title: string;
  message: string;
  emailSubject?: string;
  emailBody?: string;
  data?: Record<string, any>;
}) => {
  try {
    const {
      playerIds,
      emails,
      phoneNumbers,
      title,
      message,
      emailSubject,
      emailBody,
      data = {}
    } = options;

    // Validate phone numbers if provided
    const validPhoneNumbers = phoneNumbers?.filter(phone => {
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      return e164Regex.test(phone);
    }) || [];

    // Build payload - start with SMS and Push only (email may be disabled)
    const payload: any = {
      app_id: ONESIGNAL_APP_ID,
      name: title || 'Multi-Channel Notification', // Required field for SMS
      headings: { en: title },
      contents: { en: message },
      data: data,
      send_after: 'now',
      priority: 10,
      ttl: 86400,
      collapse_id: 'go-smart-travel-multi'
    };

    // Add recipients - prioritize SMS and Push
    if (playerIds && playerIds.length > 0) {
      payload.include_player_ids = playerIds;
    }
    if (validPhoneNumbers.length > 0) {
      payload.include_phone_numbers = validPhoneNumbers;
    }

    // Only add email if provided (but it may fail if email is disabled)
    const includeEmail = emails && emails.length > 0;
    if (includeEmail) {
      payload.include_email_tokens = emails;
      if (emailSubject && emailBody) {
        payload.email_subject = emailSubject;
        payload.email_body = emailBody;
      }
    }

    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    // Check if email is disabled but other channels succeeded
    if (!response.ok) {
      const errorText = JSON.stringify(result);
      
      // If email is disabled, try again without email
      if (includeEmail && result.errors && result.errors.some((err: string) => err.includes('Email sending'))) {
        console.warn('⚠️ Email sending is disabled. Retrying with SMS and Push only...');
        
        // Remove email from payload
        const payloadWithoutEmail: any = {
          app_id: ONESIGNAL_APP_ID,
          name: title || 'Multi-Channel Notification', // Required field for SMS
          headings: { en: title },
          contents: { en: message },
          data: data,
          send_after: 'now',
          priority: 10,
          ttl: 86400,
          collapse_id: 'go-smart-travel-multi'
        };

        if (playerIds && playerIds.length > 0) {
          payloadWithoutEmail.include_player_ids = playerIds;
        }
        if (validPhoneNumbers.length > 0) {
          payloadWithoutEmail.include_phone_numbers = validPhoneNumbers;
        }

        const retryResponse = await fetch('https://onesignal.com/api/v1/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${ONESIGNAL_REST_API_KEY.trim()}`
          },
          body: JSON.stringify(payloadWithoutEmail)
        });

        const retryResult = await retryResponse.json();

        if (!retryResponse.ok) {
          const retryErrorText = JSON.stringify(retryResult);
          console.error('❌ OneSignal API Error Response:', retryErrorText);
          throw new Error(`OneSignal API error: ${retryResponse.status} - ${retryErrorText}`);
        }

        console.log('✅ Notification sent (SMS + Push only, email skipped):', retryResult);
        return {
          ...retryResult,
          emailSkipped: true,
          emailError: 'Email sending is disabled in OneSignal'
        };
      }

      // Other errors - throw normally
      console.error('❌ OneSignal API Error Response:', errorText);
      throw new Error(`OneSignal API error: ${response.status} - ${errorText}`);
    }

    console.log('📱 Multi-channel notification sent:', result);
    return result;
  } catch (error) {
    console.error('❌ Error sending multi-channel notification:', error);
    throw error;
  }
};

/**
 * Send booking confirmation with SMS
 */
export const sendBookingConfirmationWithSMS = async (
  playerIds: string[],
  emails: string[],
  phoneNumbers: string[],
  bookingData: {
    destination: string;
    bookingId: string;
    checkInDate: string;
    totalAmount: string;
    itineraryUrl?: string;
  }
) => {
  const smsMessage = `✅ Booking Confirmed! Trip to ${bookingData.destination} on ${bookingData.checkInDate}. Booking ID: ${bookingData.bookingId}. Total: ${bookingData.totalAmount}`;
  
  const emailBody = `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h2>✅ Booking Confirmed!</h2>
        <p>Your trip to <strong>${bookingData.destination}</strong> has been booked successfully.</p>
        <p><strong>Booking ID:</strong> ${bookingData.bookingId}</p>
        <p><strong>Check-in Date:</strong> ${bookingData.checkInDate}</p>
        <p><strong>Total Amount:</strong> ${bookingData.totalAmount}</p>
        ${bookingData.itineraryUrl ? `<p><a href="${bookingData.itineraryUrl}">View Itinerary</a></p>` : ''}
      </body>
    </html>
  `;

  return await sendMultiChannelNotification({
    playerIds,
    emails,
    phoneNumbers,
    title: '✅ Booking Confirmed!',
    message: `Your trip to ${bookingData.destination} has been booked successfully. Booking ID: ${bookingData.bookingId}`,
    emailSubject: `Booking Confirmed - ${bookingData.destination} Trip`,
    emailBody,
    data: {
      type: 'booking_confirmation',
      bookingId: bookingData.bookingId,
      destination: bookingData.destination
    }
  });
};