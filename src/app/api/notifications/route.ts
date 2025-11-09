import { NextRequest, NextResponse } from 'next/server';
import { 
  sendNotificationToTokens,
  sendNotificationToAll,
  sendNotificationToSegments,
  sendNotificationToUsers
} from '../../../utils/fcmService';
import {
  sendNotificationToAll as sendOneSignalBroadcast,
  sendNotificationToSegments as sendOneSignalSegments,
  sendNotificationToUsers as sendOneSignalUsers,
  sendMultiChannelNotification,
  sendTripReminder,
  sendWeatherAlert,
  sendPromotionalNotification,
  sendBookingConfirmationWithSMS
} from '../../../utils/oneSignalService';
import {
  sendEmailNotification,
  sendBulkEmailNotification
} from '../../../utils/emailService';
import {
  sendSMSNotification as sendTextBeeSMS,
  sendTripReminderSMS,
  sendWeatherAlertSMS,
  sendPromotionalSMS,
  sendBookingConfirmationSMS
} from '../../../utils/textBeeService';
import { db } from '@/configs/firebase';
import { adminDb, FieldValue } from '@/configs/firebaseAdmin';
import { collection, getDocs, query, where } from 'firebase/firestore';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data } = body;

    let result;

    switch (type) {
      case 'broadcast': {
        // Determine which channels to use
        const usePush = !data.sendSMSOnly && !data.sendEmailOnly;
        const useEmail = data.sendEmail || data.sendEmailOnly;
        const useSMS = data.sendSMS || data.sendSMSOnly;

        // Get user data from Firebase
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const phoneNumbers: string[] = [];
        const emails: string[] = [];
        const playerIds: string[] = [];
        const allUsers: any[] = [];

        // Admin emails to exclude
        const adminEmails = ['admin@gosmarttravel.com'];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          allUsers.push({ id: doc.id, ...userData });
          
          // Skip admin users
          const isAdmin = userData.role === 'admin' || 
                         adminEmails.includes(userData.email?.toLowerCase());
          
          if (isAdmin) {
            return; // Skip admin users
          }
          
          if (userData.phoneNumber && userData.phoneNumber.startsWith('+')) {
            phoneNumbers.push(userData.phoneNumber);
          }
          if (userData.email && !adminEmails.includes(userData.email.toLowerCase())) {
            emails.push(userData.email);
          }
          if (userData.oneSignalPlayerId) {
            playerIds.push(userData.oneSignalPlayerId);
          }
        });

        console.log(`📱 Broadcast notification:`);
        console.log(`📱 Total users: ${allUsers.length}`);
        console.log(`📱 Phone numbers: ${phoneNumbers.length}`);
        console.log(`📱 Emails: ${emails.length}`);
        console.log(`📱 Player IDs: ${playerIds.length}`);

        const results: any = {
          push: null,
          email: null,
          sms: null
        };

        // Send Push notifications (OneSignal)
        if (usePush) {
          try {
            if (data.fcmTokens && data.fcmTokens.length > 0) {
              results.push = await sendNotificationToTokens(data.fcmTokens, data);
            } else {
              results.push = await sendOneSignalBroadcast(data);
            }
            console.log('✅ Push notification sent');
          } catch (error: any) {
            console.error('❌ Push notification error:', error.message);
            results.push = { error: error.message };
          }
        }

        // Send Email notifications (Nodemailer)
        if (useEmail) {
          try {
            if (emails.length === 0) {
              throw new Error('No email addresses found in Firebase');
            }

            const emailHtml = `
              <h2>${data.title}</h2>
              <p>${data.message}</p>
              ${data.data?.actionUrl ? `<p><a href="${data.data.actionUrl}">View Details</a></p>` : ''}
            `;

            results.email = await sendBulkEmailNotification(
              emails,
              data.title,
              data.message,
              data.data?.actionUrl,
              data.imageUrl
            );
            console.log(`✅ Email sent to ${emails.length} recipients`);
          } catch (error: any) {
            console.error('❌ Email notification error:', error.message);
            results.email = { error: error.message };
          }
        }

        // Send SMS notifications (TextBee.dev) - Optional
        if (useSMS) {
          try {
            if (phoneNumbers.length === 0) {
              throw new Error('No phone numbers found in Firebase');
            }
            results.sms = await sendTextBeeSMS(phoneNumbers, data.message, data.data || {});
            console.log(`✅ SMS notification sent via TextBee: ${results.sms.successCount} successful, ${results.sms.failureCount} failed`);
          } catch (error: any) {
            console.error('❌ SMS notification error:', error.message);
            results.sms = { error: error.message, success: false };
          }
        }

        // Save notifications to Firestore for each user using Admin SDK
        try {
          // Get admin info (from request headers or default)
          const adminName = 'Admin';
          const adminRole = 'Admin';
          
          const notificationPromises = allUsers.map(async (user) => {
            const notificationData = {
              userId: user.id,
              title: data.title || 'Notification',
              message: data.message || '',
              type: data.type || 'admin_notification',
              isRead: false,
              createdAt: FieldValue.serverTimestamp(),
              bookingId: data.bookingId || null,
              tourId: data.tourId || null,
              userName: adminName,
              userRole: adminRole,
              userPhoto: null,
              data: data.data || {}
            };
            return adminDb.collection('notifications').add(notificationData);
          });
          
          await Promise.all(notificationPromises);
          console.log(`✅ Saved ${allUsers.length} notifications to Firestore`);
        } catch (firestoreError: any) {
          console.error('❌ Error saving notifications to Firestore:', firestoreError.message);
          // Continue even if saving to Firestore fails
        }

        // Combine results
        const totalRecipients = 
          (results.push?.recipients || 0) + 
          (results.email?.results?.filter((r: any) => r.success).length || 0) +
          (results.sms?.successCount || 0);
        
        result = {
          id: results.push?.id || `email-${Date.now()}`,
          recipients: totalRecipients,
          push: results.push,
          email: results.email,
          sms: results.sms,
          success: true
        };

        break;
      }
      
      case 'segments': {
        const usePush = !data.sendSMSOnly && !data.sendEmailOnly;
        const useEmail = data.sendEmail || data.sendEmailOnly;
        const useSMS = data.sendSMS || data.sendSMSOnly;

        // Get user data from Firebase for selected segments
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const phoneNumbers: string[] = [];
        const emails: string[] = [];
        const playerIds: string[] = [];
        const allUsers: any[] = [];

        // Admin emails to exclude
        const adminEmails = ['admin@gosmarttravel.com'];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          
          // Skip admin users
          const isAdmin = userData.role === 'admin' || 
                         adminEmails.includes(userData.email?.toLowerCase());
          
          if (isAdmin) {
            return; // Skip admin users
          }
          
          allUsers.push({ id: doc.id, ...userData });
          
          // You can add segment filtering logic here based on user tags/preferences
          if (userData.phoneNumber && userData.phoneNumber.startsWith('+')) {
            phoneNumbers.push(userData.phoneNumber);
          }
          if (userData.email && !adminEmails.includes(userData.email.toLowerCase())) {
            emails.push(userData.email);
          }
          if (userData.oneSignalPlayerId) {
            playerIds.push(userData.oneSignalPlayerId);
          }
        });

        const results: any = {
          push: null,
          email: null,
          sms: null
        };

        // Send Push notifications (OneSignal)
        if (usePush) {
          try {
            if (data.fcmTokens && data.fcmTokens.length > 0) {
              results.push = await sendNotificationToTokens(data.fcmTokens, data);
            } else {
              results.push = await sendOneSignalSegments({ segments: data.segments || [], ...data });
            }
            console.log('✅ Push notification sent');
          } catch (error: any) {
            console.error('❌ Push notification error:', error.message);
            results.push = { error: error.message };
          }
        }

        // Send Email notifications (Nodemailer)
        if (useEmail) {
          try {
            if (emails.length === 0) {
              throw new Error('No email addresses found for selected segments');
            }

            results.email = await sendBulkEmailNotification(
              emails,
              data.title,
              data.message,
              data.data?.actionUrl,
              data.imageUrl
            );
            console.log(`✅ Email sent to ${emails.length} recipients`);
          } catch (error: any) {
            console.error('❌ Email notification error:', error.message);
            results.email = { error: error.message };
          }
        }

        // Send SMS notifications (TextBee.dev) - Optional
        if (useSMS) {
          try {
            if (phoneNumbers.length === 0) {
              throw new Error('No phone numbers found for selected segments');
            }
            results.sms = await sendTextBeeSMS(phoneNumbers, data.message, data.data || {});
            console.log(`✅ SMS notification sent via TextBee: ${results.sms.successCount} successful, ${results.sms.failureCount} failed`);
          } catch (error: any) {
            console.error('❌ SMS notification error:', error.message);
            results.sms = { error: error.message, success: false };
          }
        }

        // Save notifications to Firestore for each user using Admin SDK
        try {
          // Get admin info
          const adminName = 'Admin';
          const adminRole = 'Admin';
          
          const notificationPromises = allUsers.map(async (user) => {
            const notificationData = {
              userId: user.id,
              title: data.title || 'Notification',
              message: data.message || '',
              type: data.type || 'admin_notification',
              isRead: false,
              createdAt: FieldValue.serverTimestamp(),
              bookingId: data.bookingId || null,
              tourId: data.tourId || null,
              userName: adminName,
              userRole: adminRole,
              userPhoto: null,
              data: data.data || {}
            };
            return adminDb.collection('notifications').add(notificationData);
          });
          
          await Promise.all(notificationPromises);
          console.log(`✅ Saved ${allUsers.length} notifications to Firestore`);
        } catch (firestoreError: any) {
          console.error('❌ Error saving notifications to Firestore:', firestoreError.message);
          // Continue even if saving to Firestore fails
        }

        // Combine results
        const totalRecipients = 
          (results.push?.recipients || 0) + 
          (results.email?.results?.filter((r: any) => r.success).length || 0) +
          (results.sms?.successCount || 0);
        
        result = {
          id: results.push?.id || `email-${Date.now()}`,
          recipients: totalRecipients,
          push: results.push,
          email: results.email,
          sms: results.sms,
          success: true
        };

        break;
      }
      
      case 'trip_reminder': {
        // Get phone numbers from Firebase for the trip
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const phoneNumbers: string[] = [];
        const emails: string[] = [];
        const playerIds: string[] = [];

        // Admin emails to exclude
        const adminEmails = ['admin@gosmarttravel.com'];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          
          // Skip admin users
          const isAdmin = userData.role === 'admin' || 
                         adminEmails.includes(userData.email?.toLowerCase());
          
          if (isAdmin) {
            return; // Skip admin users
          }
          
          if (userData.phoneNumber && userData.phoneNumber.startsWith('+')) {
            phoneNumbers.push(userData.phoneNumber);
          }
          if (userData.email && !adminEmails.includes(userData.email.toLowerCase())) {
            emails.push(userData.email);
          }
          if (userData.oneSignalPlayerId) {
            playerIds.push(userData.oneSignalPlayerId);
          }
        });

        // Send push notification via OneSignal
        const pushResult = await sendTripReminder(playerIds, data.tripData);
        
        // Send SMS via TextBee.dev if phone numbers are available
        let smsResult = null;
        if (phoneNumbers.length > 0) {
          try {
            smsResult = await sendTripReminderSMS(
              phoneNumbers,
              data.tripData.destination,
              data.tripData.startDate,
              data.tripData.tripId
            );
            console.log(`✅ Trip reminder SMS sent via TextBee: ${smsResult.successCount} successful, ${smsResult.failureCount} failed`);
          } catch (error: any) {
            console.error('❌ Trip reminder SMS error:', error.message);
            smsResult = { error: error.message, success: false };
          }
        }

        result = {
          ...pushResult,
          sms: smsResult
        };
        break;
      }

      case 'weather_alert': {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const phoneNumbers: string[] = [];
        const emails: string[] = [];
        const playerIds: string[] = [];

        // Admin emails to exclude
        const adminEmails = ['admin@gosmarttravel.com'];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          
          // Skip admin users
          const isAdmin = userData.role === 'admin' || 
                         adminEmails.includes(userData.email?.toLowerCase());
          
          if (isAdmin) {
            return; // Skip admin users
          }
          
          if (userData.phoneNumber && userData.phoneNumber.startsWith('+')) {
            phoneNumbers.push(userData.phoneNumber);
          }
          if (userData.email && !adminEmails.includes(userData.email.toLowerCase())) {
            emails.push(userData.email);
          }
          if (userData.oneSignalPlayerId) {
            playerIds.push(userData.oneSignalPlayerId);
          }
        });

        // Send push notification via OneSignal
        const pushResult = await sendWeatherAlert(playerIds, data.weatherData);
        
        // Send SMS via TextBee.dev if phone numbers are available
        let smsResult = null;
        if (phoneNumbers.length > 0) {
          try {
            smsResult = await sendWeatherAlertSMS(
              phoneNumbers,
              data.weatherData.location,
              data.weatherData.condition,
              data.weatherData.temperature,
              data.weatherData.advice
            );
            console.log(`✅ Weather alert SMS sent via TextBee: ${smsResult.successCount} successful, ${smsResult.failureCount} failed`);
          } catch (error: any) {
            console.error('❌ Weather alert SMS error:', error.message);
            smsResult = { error: error.message, success: false };
          }
        }

        result = {
          ...pushResult,
          sms: smsResult
        };
        break;
      }

      case 'promotional': {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const phoneNumbers: string[] = [];
        const emails: string[] = [];
        const playerIds: string[] = [];
        const allUsers: any[] = [];

        // Admin emails to exclude
        const adminEmails = ['admin@gosmarttravel.com'];

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          
          // Skip admin users
          const isAdmin = userData.role === 'admin' || 
                         adminEmails.includes(userData.email?.toLowerCase());
          
          if (isAdmin) {
            return; // Skip admin users
          }
          
          allUsers.push({ id: doc.id, ...userData });
          
          if (userData.phoneNumber && userData.phoneNumber.startsWith('+')) {
            phoneNumbers.push(userData.phoneNumber);
          }
          if (userData.email && !adminEmails.includes(userData.email.toLowerCase())) {
            emails.push(userData.email);
          }
          if (userData.oneSignalPlayerId) {
            playerIds.push(userData.oneSignalPlayerId);
          }
        });

        const promoMessage = `${data.promoData.message}\n\n🎁 Promo Code: ${data.promoData.promoCode}\n💰 Discount: ${data.promoData.discount}`;
        const promoEmailMessage = `${data.promoData.message}\n\n🎁 Promo Code: ${data.promoData.promoCode}\n💰 Discount: ${data.promoData.discount}\n🌍 Don't miss out on this amazing deal!`;

        const results: any = {
          push: null,
          email: null,
          sms: null
        };

        // Send Push notifications (OneSignal)
        try {
          results.push = await sendPromotionalNotification(data.segments || [], data.promoData);
          console.log('✅ Push notification sent');
        } catch (error: any) {
          console.error('❌ Push notification error:', error.message);
          results.push = { error: error.message };
        }

        // Send Email notifications (Nodemailer)
        try {
          if (emails.length === 0) {
            throw new Error('No email addresses found');
          }

          results.email = await sendBulkEmailNotification(
            emails,
            `🎉 Special Offer: ${data.promoData.title}`,
            promoEmailMessage,
            data.promoData.actionUrl,
            data.promoData.imageUrl
          );
          console.log(`✅ Promotional email sent to ${emails.length} recipients`);
        } catch (error: any) {
          console.error('❌ Email notification error:', error.message);
          results.email = { error: error.message };
        }

        // Send SMS notifications (TextBee.dev) - Optional
        if (data.sendSMS) {
          try {
            if (phoneNumbers.length === 0) {
              throw new Error('No phone numbers found');
            }
            results.sms = await sendPromotionalSMS(
              phoneNumbers,
              data.promoData.title || 'Special Offer',
              data.promoData.message,
              data.promoData.promoCode,
              data.promoData.discount,
              data.promoData.destination
            );
            console.log(`✅ Promotional SMS sent via TextBee: ${results.sms.successCount} successful, ${results.sms.failureCount} failed`);
          } catch (error: any) {
            console.error('❌ SMS notification error:', error.message);
            results.sms = { error: error.message, success: false };
          }
        }

        // Save notifications to Firestore for each user using Admin SDK
        try {
          // Get admin info
          const adminName = 'Admin';
          const adminRole = 'Admin';
          const promoMessage = `${data.promoData.message}\n\n🎁 Promo Code: ${data.promoData.promoCode}\n💰 Discount: ${data.promoData.discount}`;
          const notificationPromises = allUsers.map(async (user) => {
            const notificationData = {
              userId: user.id,
              title: `🎉 Special Offer: ${data.promoData.title || 'Promotional Offer'}`,
              message: promoMessage,
              type: 'promotional',
              isRead: false,
              createdAt: FieldValue.serverTimestamp(),
              bookingId: null,
              tourId: data.promoData.tourId || null,
              userName: adminName,
              userRole: adminRole,
              userPhoto: null,
              data: {
                promoCode: data.promoData.promoCode,
                discount: data.promoData.discount,
                actionUrl: data.promoData.actionUrl
              }
            };
            return adminDb.collection('notifications').add(notificationData);
          });
          
          await Promise.all(notificationPromises);
          console.log(`✅ Saved ${allUsers.length} promotional notifications to Firestore`);
        } catch (firestoreError: any) {
          console.error('❌ Error saving promotional notifications to Firestore:', firestoreError.message);
          // Continue even if saving to Firestore fails
        }

        // Combine results
        const totalRecipients = 
          (results.push?.recipients || 0) + 
          (results.email?.results?.filter((r: any) => r.success).length || 0) +
          (results.sms?.successCount || 0);
        
        result = {
          id: results.push?.id || `promo-${Date.now()}`,
          recipients: totalRecipients,
          push: results.push,
          email: results.email,
          sms: results.sms,
          success: true
        };

        break;
      }
      
      case 'users': {
        if (data.fcmTokens && data.fcmTokens.length > 0) {
          result = await sendNotificationToTokens(data.fcmTokens, data);
        } else {
          result = await sendOneSignalUsers({ playerIds: data.userIds || [], ...data });
        }
        
        // Save notifications to Firestore for each user using Admin SDK
        try {
          // Get admin info
          const adminName = 'Admin';
          const adminRole = 'Admin';
          const userIds = data.userIds || [];
          if (userIds.length > 0) {
            const notificationPromises = userIds.map(async (userId: string) => {
              const notificationData = {
                userId: userId,
                title: data.title || 'Notification',
                message: data.message || '',
                type: data.type || 'admin_notification',
                isRead: false,
                createdAt: FieldValue.serverTimestamp(),
                bookingId: data.bookingId || null,
                tourId: data.tourId || null,
                userName: adminName,
                userRole: adminRole,
                userPhoto: null,
                data: data.data || {}
              };
              return adminDb.collection('notifications').add(notificationData);
            });
            
            await Promise.all(notificationPromises);
            console.log(`✅ Saved ${userIds.length} notifications to Firestore`);
          }
        } catch (firestoreError: any) {
          console.error('❌ Error saving notifications to Firestore:', firestoreError.message);
          // Continue even if saving to Firestore fails
        }
        
        break;
      }
      
      default:
        return NextResponse.json({ error: 'Invalid notification type' }, { status: 400 });
    }

    // Format response - check for errors in each channel
    const hasErrors = 
      result?.push?.errors?.length > 0 || 
      result?.email?.error || 
      (result?.sms?.errors && result.sms.errors.length > 0) ||
      (result?.sms && !result.sms.success && result.sms.error);
    const hasSuccess = 
      result?.push?.id || 
      result?.email?.success || 
      result?.sms?.success ||
      (result?.sms?.successCount && result.sms.successCount > 0);

    if (hasErrors && !hasSuccess) {
      const errors: string[] = [];
      if (result?.push?.errors) errors.push(...result.push.errors);
      if (result?.email?.error) errors.push(`Email: ${result.email.error}`);
      if (result?.sms?.errors && result.sms.errors.length > 0) {
        errors.push(...result.sms.errors);
      } else if (result?.sms?.error) {
        errors.push(`SMS: ${result.sms.error}`);
      }
      
      return NextResponse.json({ 
        success: false,
        error: errors.join(', '),
        data: result
      }, { status: 400 });
    }

    // Return success response with details for each channel
    return NextResponse.json({ 
      success: true, 
      data: {
        id: result?.id || 'N/A',
        recipients: result?.recipients || 0,
        success: true,
        push: result?.push || null,
        email: result?.email || null,
        sms: result?.sms || null,
        ...result
      }
    });
  } catch (error) {
    console.error('Notification API error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    // Check if it's an authentication error
    if (errorMessage.includes('Access denied') || errorMessage.includes('API key')) {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid OneSignal REST API Key. Please check your API key in OneSignal Dashboard → Settings → Keys & IDs',
        details: errorMessage
      }, { status: 401 });
    }
    
    return NextResponse.json({ 
      success: false,
      error: errorMessage
    }, { status: 500 });
  }
}
