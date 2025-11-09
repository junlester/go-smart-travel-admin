/**
 * TextBee.dev SMS Service for Admin Panel
 * Send SMS notifications to users via TextBee.dev API
 */

import { TEXTBEE_API_KEY, TEXTBEE_DEVICE_ID, TEXTBEE_API_URL } from '@/constants/APIKeys';

// SMS Sender Name - App name prefix for all SMS messages
const SMS_SENDER_NAME = 'Go Smart Travel Admin';

interface SMSResult {
  success: boolean;
  messageId?: string;
  recipient?: string;
  error?: string;
}

interface BulkSMSResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  results: SMSResult[];
  errors?: string[];
}

/**
 * Send SMS to a single phone number
 */
export const sendSMS = async (phoneNumber: string, message: string): Promise<SMSResult> => {
  try {
    // Validate phone number format (E.164: +[country code][number])
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    if (!e164Regex.test(phoneNumber)) {
      throw new Error(`Invalid phone number format: ${phoneNumber}. Phone numbers must be in E.164 format (+1234567890)`);
    }

    // Validate API credentials
    if (!TEXTBEE_API_KEY || !TEXTBEE_DEVICE_ID) {
      throw new Error('TextBee API credentials are not configured. Please set TEXTBEE_API_KEY and TEXTBEE_DEVICE_ID in APIKeys.ts');
    }

    // Add app name prefix to message
    const formattedMessage = `${SMS_SENDER_NAME} : ${message}`;

    console.log(`📱 [TextBee] Sending SMS to ${phoneNumber}: "${formattedMessage.substring(0, 50)}${formattedMessage.length > 50 ? '...' : ''}"`);

    const response = await fetch(`${TEXTBEE_API_URL}/gateway/devices/${TEXTBEE_DEVICE_ID}/send-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': TEXTBEE_API_KEY
      },
      body: JSON.stringify({
        recipients: [phoneNumber],
        message: formattedMessage
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TextBee] API Error (${response.status}):`, errorText);
      throw new Error(`TextBee API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ [TextBee] SMS sent successfully:`, result);

    return {
      success: true,
      messageId: result.id || result.messageId || `sms-${Date.now()}`,
      recipient: phoneNumber
    };
  } catch (error: any) {
    console.error(`❌ [TextBee] Error sending SMS to ${phoneNumber}:`, error.message);
    return {
      success: false,
      recipient: phoneNumber,
      error: error.message || 'Unknown error'
    };
  }
};

/**
 * Send SMS to multiple phone numbers
 */
export const sendBulkSMS = async (phoneNumbers: string[], message: string): Promise<BulkSMSResult> => {
  try {
    // Validate phone numbers
    const validPhoneNumbers = phoneNumbers.filter(phone => {
      const e164Regex = /^\+[1-9]\d{1,14}$/;
      return e164Regex.test(phone);
    });

    if (validPhoneNumbers.length === 0) {
      throw new Error('No valid phone numbers provided. Phone numbers must be in E.164 format (+1234567890)');
    }

    console.log(`📱 [TextBee] Sending SMS to ${validPhoneNumbers.length} recipients`);

    // Send SMS to each phone number
    // Note: TextBee API might support bulk sending, but we'll send individually for better error handling
    const results: SMSResult[] = await Promise.all(
      validPhoneNumbers.map(phoneNumber => sendSMS(phoneNumber, message))
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    const errors = results
      .filter(r => !r.success)
      .map(r => `${r.recipient}: ${r.error}`);

    console.log(`📱 [TextBee] Bulk SMS complete: ${successCount} successful, ${failureCount} failed`);

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      results,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error: any) {
    console.error('❌ [TextBee] Error sending bulk SMS:', error);
    throw error;
  }
};

/**
 * Send SMS notification with formatted message
 */
export const sendSMSNotification = async (
  phoneNumbers: string[],
  message: string,
  data?: Record<string, any>
): Promise<BulkSMSResult> => {
  try {
    // Format message with additional data if provided
    let formattedMessage = message;

    if (data) {
      // Add booking details if available
      if (data.bookingId) {
        formattedMessage += `\n\nBooking ID: ${data.bookingId}`;
      }
      if (data.destination) {
        formattedMessage += `\nDestination: ${data.destination}`;
      }
      if (data.promoCode) {
        formattedMessage += `\nPromo Code: ${data.promoCode}`;
      }
      if (data.discount) {
        formattedMessage += `\nDiscount: ${data.discount}`;
      }
      if (data.actionUrl) {
        formattedMessage += `\n\nView details: ${data.actionUrl}`;
      }
    }

    return await sendBulkSMS(phoneNumbers, formattedMessage);
  } catch (error: any) {
    console.error('❌ [TextBee] Error sending SMS notification:', error);
    throw error;
  }
};

/**
 * Send trip reminder SMS
 */
export const sendTripReminderSMS = async (
  phoneNumbers: string[],
  destination: string,
  startDate: string,
  tripId: string
): Promise<BulkSMSResult> => {
  const message = `🌴 Trip Reminder\n\nYour trip to ${destination} starts on ${startDate}. Don't forget to check your itinerary!\n\nTrip ID: ${tripId}`;

  return await sendSMSNotification(phoneNumbers, message, {
    type: 'trip_reminder',
    tripId,
    destination,
    startDate
  });
};

/**
 * Send weather alert SMS
 */
export const sendWeatherAlertSMS = async (
  phoneNumbers: string[],
  location: string,
  condition: string,
  temperature: string,
  advice: string
): Promise<BulkSMSResult> => {
  const message = `🌤️ Weather Alert: ${location}\n\n${condition} - ${temperature}°C\n\n${advice}`;

  return await sendSMSNotification(phoneNumbers, message, {
    type: 'weather_alert',
    location,
    condition,
    temperature,
    advice
  });
};

/**
 * Send promotional SMS
 */
export const sendPromotionalSMS = async (
  phoneNumbers: string[],
  title: string,
  message: string,
  promoCode: string,
  discount: string,
  destination?: string
): Promise<BulkSMSResult> => {
  const smsMessage = `${title}\n\n${message}\n\n🎁 Promo Code: ${promoCode}\n💰 Discount: ${discount}${destination ? `\n🌍 Destination: ${destination}` : ''}`;

  return await sendSMSNotification(phoneNumbers, smsMessage, {
    type: 'promotion',
    promoCode,
    discount,
    destination
  });
};

/**
 * Send booking confirmation SMS
 */
export const sendBookingConfirmationSMS = async (
  phoneNumbers: string[],
  destination: string,
  bookingId: string,
  checkInDate: string,
  totalAmount: string
): Promise<BulkSMSResult> => {
  const message = `✅ Booking Confirmed!\n\nYour trip to ${destination} has been booked successfully.\n\nBooking ID: ${bookingId}\nCheck-in Date: ${checkInDate}\nTotal Amount: ${totalAmount}`;

  return await sendSMSNotification(phoneNumbers, message, {
    type: 'booking_confirmation',
    bookingId,
    destination,
    checkInDate,
    totalAmount
  });
};

