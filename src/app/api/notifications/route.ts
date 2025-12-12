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
  sendBookingConfirmationSMS,
  sendBulkSMS
} from '../../../utils/textBeeService';
import { db } from '@/configs/firebase';
import { getAdminDb, FieldValue } from '@/configs/firebaseAdmin';
import { collection, getDocs, query, where, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

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
            const adminDb = getAdminDb();
            if (!adminDb) {
              console.warn('⚠️ Firebase Admin not initialized - skipping notification save to Firestore');
              return null;
            }
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
            const adminDb = getAdminDb();
            if (!adminDb) {
              console.warn('⚠️ Firebase Admin not initialized - skipping notification save to Firestore');
              return null;
            }
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
        // Search for specific user by name
        const userName = data.tripData?.userName?.trim();
        if (!userName) {
          throw new Error('User name is required');
        }

        const usersSnapshot = await getDocs(collection(db, 'users'));
        const phoneNumbers: string[] = [];
        const emails: string[] = [];
        const playerIds: string[] = [];
        let userFound = false;

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

          // Search by displayName or email (case-insensitive)
          const displayName = userData.displayName || '';
          const email = userData.email || '';
          const searchName = userName.toLowerCase();
          
          const matchesName = displayName.toLowerCase().includes(searchName) || 
                             email.toLowerCase().includes(searchName);
          
          if (matchesName) {
            userFound = true;
            
            if (userData.phoneNumber && userData.phoneNumber.startsWith('+')) {
              phoneNumbers.push(userData.phoneNumber);
            }
            if (userData.email && !adminEmails.includes(userData.email.toLowerCase())) {
              emails.push(userData.email);
            }
            if (userData.oneSignalPlayerId) {
              playerIds.push(userData.oneSignalPlayerId);
            }
          }
        });

        if (!userFound) {
          throw new Error(`User "${userName}" not found. Please check the name and try again.`);
        }

        // Send push notification
        let pushResult = null;
        if (playerIds.length > 0) {
          try {
            pushResult = await sendTripReminder(playerIds, data.tripData);
            console.log('✅ Push notification sent to user');
          } catch (error: any) {
            console.error('❌ Push notification error:', error.message);
            pushResult = { error: error.message };
          }
        }

        // Send email notification - ALWAYS attempt to send
        let emailResult = null;
        console.log(`📧 Email addresses found: ${emails.length}`, emails);
        if (emails.length > 0) {
          try {
            const title = `🌴 Trip Reminder: ${data.tripData.destination}`;
            const message = `Your trip to ${data.tripData.destination} starts on ${data.tripData.startDate}. Don't forget to check your itinerary!`;
            console.log(`📧 Attempting to send email to:`, emails);
            emailResult = await sendBulkEmailNotification(emails, title, message);
            console.log(`✅ Email result:`, emailResult);
            if (emailResult.success) {
              console.log(`✅ Email sent successfully to ${emailResult.results?.filter((r: any) => r.success).length || 0} recipient(s)`);
            } else {
              console.warn(`⚠️ Email sending had issues:`, emailResult);
            }
          } catch (error: any) {
            console.error('❌ Email notification error:', error.message);
            console.error('❌ Email error stack:', error.stack);
            emailResult = { error: error.message, success: false };
          }
        } else {
          console.warn('⚠️ No email addresses found for user:', userName);
          emailResult = { error: 'No email address found for user', success: false };
        }

        // Send SMS notification via TextBee (NOT OneSignal)
        let smsResult = null;
        console.log(`📱 Phone numbers found: ${phoneNumbers.length}`, phoneNumbers);
        if (phoneNumbers.length > 0) {
          try {
            const smsMessage = `🌴 Trip Reminder: Your trip to ${data.tripData.destination} starts on ${data.tripData.startDate}. Don't forget to check your itinerary!`;
            console.log(`📱 Attempting to send SMS via TextBee to:`, phoneNumbers);
            smsResult = await sendBulkSMS(phoneNumbers, smsMessage);
            console.log(`✅ SMS result:`, smsResult);
            if (smsResult.successCount > 0) {
              console.log(`✅ SMS sent successfully to ${smsResult.successCount} recipient(s) via TextBee`);
            } else {
              console.warn(`⚠️ SMS sending had issues:`, smsResult);
            }
          } catch (error: any) {
            console.error('❌ SMS notification error:', error.message);
            console.error('❌ SMS error stack:', error.stack);
            smsResult = { error: error.message, success: false, successCount: 0, failureCount: phoneNumbers.length };
          }
        } else {
          console.warn('⚠️ No phone numbers found for user:', userName);
          smsResult = { error: 'No phone number found for user', success: false, successCount: 0, failureCount: 0 };
        }

        // Create in-app notification in Firestore - ALWAYS attempt to create (using Admin SDK)
        let inAppResult = null;
        try {
          const userDoc = usersSnapshot.docs.find(doc => {
            const userData = doc.data();
            const displayName = userData.displayName || '';
            const email = userData.email || '';
            const searchName = userName.toLowerCase();
            return displayName.toLowerCase().includes(searchName) || 
                   email.toLowerCase().includes(searchName);
          });

          if (userDoc) {
            // Fetch user's paid bookings to get tourId
            let tourId = null;
            let bookingId = null;
            try {
              const bookingsQuery = query(
                collection(db, 'bookings'),
                where('userId', '==', userDoc.id),
                where('paymentStatus', '==', 'paid')
              );
              const bookingsSnapshot = await getDocs(bookingsQuery);
              
              // Find booking matching the destination and start date
              bookingsSnapshot.forEach((bookingDoc) => {
                const bookingData = bookingDoc.data();
                const bookingTravelDate = bookingData.travelDate?.toDate ? 
                  bookingData.travelDate.toDate().toISOString().split('T')[0] : 
                  bookingData.travelDate;
                
                // Match by destination and start date
                if (bookingData.tourLocation === data.tripData.destination || 
                    bookingData.tourName === data.tripData.destination) {
                  if (bookingTravelDate === data.tripData.startDate || !tourId) {
                    tourId = bookingData.tourId || null;
                    bookingId = bookingDoc.id;
                  }
                }
              });
              
              // If no exact match, use the first upcoming booking
              if (!tourId && bookingsSnapshot.docs.length > 0) {
                const firstBooking = bookingsSnapshot.docs[0];
                const bookingData = firstBooking.data();
                tourId = bookingData.tourId || null;
                bookingId = firstBooking.id;
              }
              
              console.log(`📱 Found tourId: ${tourId}, bookingId: ${bookingId} for user`);
            } catch (bookingError: any) {
              console.warn('⚠️ Could not fetch user bookings for tourId:', bookingError.message);
            }
            
            console.log(`📱 Creating in-app notification for user: ${userDoc.id}`);
            const notificationData = {
              userId: userDoc.id,
              title: `🌴 Trip Reminder: ${data.tripData.destination}`,
              message: `Your trip to ${data.tripData.destination} starts on ${data.tripData.startDate}. Don't forget to check your itinerary!`,
              type: 'trip_reminder',
              isRead: false,
              createdAt: FieldValue.serverTimestamp(),
              userName: 'Admin',
              userRole: 'Admin',
              tourId: tourId || null,
              bookingId: bookingId || null
            };
            console.log('📱 Notification data:', notificationData);
            
            // Use Admin SDK to bypass Firestore security rules
            const adminDb = getAdminDb();
            if (!adminDb) {
              console.warn('⚠️ Firebase Admin not initialized - skipping in-app notification');
              inAppResult = { error: 'Firebase Admin not initialized', success: false };
            } else {
              const notificationRef = await adminDb.collection('notifications').add(notificationData);
              console.log('✅ In-app notification created with ID:', notificationRef.id);
              inAppResult = { success: true, notificationId: notificationRef.id };
            }
          } else {
            console.warn('⚠️ User document not found for in-app notification');
            inAppResult = { error: 'User document not found', success: false };
          }
        } catch (error: any) {
          console.error('❌ In-app notification error:', error.message);
          console.error('❌ In-app notification error stack:', error.stack);
          console.error('❌ Full error:', JSON.stringify(error, null, 2));
          inAppResult = { error: error.message, success: false };
        }

        result = {
          id: pushResult?.id || `trip-reminder-${Date.now()}`,
          recipients: 1,
          push: pushResult,
          email: emailResult,
          sms: smsResult,
          inApp: inAppResult,
          success: true,
          message: `Notifications sent to user: ${userName}`,
          details: {
            emailSent: emailResult?.success !== false && !emailResult?.error,
            smsSent: smsResult?.success !== false && !smsResult?.error,
            inAppSent: inAppResult?.success !== false && !inAppResult?.error
          }
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
            const adminDb = getAdminDb();
            if (!adminDb) {
              console.warn('⚠️ Firebase Admin not initialized - skipping notification save to Firestore');
              return null;
            }
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
      
      case 'booking_confirmation': {
        // Send booking confirmation email (email only, no SMS or push)
        const emails = data.emails || [];
        const title = data.title || 'Booking Confirmed';
        const message = data.message || 'Your booking has been confirmed.';

        if (emails.length === 0) {
          throw new Error('No email addresses provided');
        }

        let emailResult = null;
        try {
          console.log(`📧 Sending booking confirmation email to:`, emails);
          emailResult = await sendBulkEmailNotification(emails, title, message);
          console.log(`✅ Booking confirmation email result:`, emailResult);
          
          if (emailResult.success) {
            console.log(`✅ Email sent successfully to ${emailResult.results?.filter((r: any) => r.success).length || 0} recipient(s)`);
          } else {
            console.warn(`⚠️ Email sending had issues:`, emailResult);
          }
        } catch (error: any) {
          console.error('❌ Booking confirmation email error:', error.message);
          console.error('❌ Email error stack:', error.stack);
          emailResult = { error: error.message, success: false };
        }

        result = {
          id: `booking-confirmation-${Date.now()}`,
          recipients: emailResult?.results?.filter((r: any) => r.success).length || 0,
          email: emailResult,
          success: emailResult?.success !== false && !emailResult?.error,
          message: `Booking confirmation email ${emailResult?.success !== false && !emailResult?.error ? 'sent successfully' : 'failed to send'}`
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
              const adminDb = getAdminDb();
            if (!adminDb) {
              console.warn('⚠️ Firebase Admin not initialized - skipping notification save to Firestore');
              return null;
            }
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
      
      case 'customization_status': {
        // Send notification for customization request approval/rejection
        const { userId, status, customizationData } = data;
        
        if (!userId || !status || !customizationData) {
          throw new Error('userId, status, and customizationData are required');
        }

        // Get user data from Firebase
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (!userDoc.exists()) {
          throw new Error(`User with ID ${userId} not found`);
        }

        const userData = userDoc.data();
        const userEmail = userData.email;
        const oneSignalPlayerId = userData.oneSignalPlayerId;
        const userName = userData.displayName || userData.email?.split('@')[0] || 'User';

        const results: any = {
          push: null,
          email: null,
          inApp: null
        };

        // Prepare notification messages based on status
        const isApproved = status === 'approved';
        const title = isApproved 
          ? `✅ Customization Request Approved` 
          : `❌ Customization Request Rejected`;
        
        const message = isApproved
          ? `Great news! Your customization request for "${customizationData.tourPackageName}" has been approved. Your customized itinerary is now active.`
          : `Your customization request for "${customizationData.tourPackageName}" has been rejected. Reason: ${customizationData.rejectionReason || 'Not specified'}`;

        const emailSubject = isApproved
          ? `✅ Your Tour Customization Request Has Been Approved`
          : `❌ Your Tour Customization Request Has Been Rejected`;

        const emailMessage = isApproved
          ? `Dear ${userName},\n\nGreat news! Your customization request for "${customizationData.tourPackageName}" has been approved.\n\nYour customized itinerary is now active and you can view it in your booking details.${customizationData.adminNotes ? `\n\nAdmin Notes: ${customizationData.adminNotes}` : ''}\n\nThank you for using Go Smart Travel!`
          : `Dear ${userName},\n\nUnfortunately, your customization request for "${customizationData.tourPackageName}" has been rejected.\n\nReason: ${customizationData.rejectionReason || 'Not specified'}${customizationData.adminNotes ? `\n\nAdmin Notes: ${customizationData.adminNotes}` : ''}\n\nIf you have any questions or concerns, please contact our support team.\n\nThank you for using Go Smart Travel!`;

        // Send push notification via OneSignal (if playerId exists)
        if (oneSignalPlayerId) {
          try {
            const { sendNotificationToUsers } = await import('../../../utils/oneSignalService');
            results.push = await sendNotificationToUsers({
              playerIds: [oneSignalPlayerId],
              title: title,
              message: message,
              data: {
                type: 'customization_status',
                status: status,
                customizationId: customizationData.id,
                tourPackageId: customizationData.tourPackageId,
                actionUrl: `customization/${customizationData.id}`
              }
            });
            console.log('✅ Push notification sent to user');
          } catch (error: any) {
            console.error('❌ Push notification error:', error.message);
            results.push = { error: error.message };
          }
        } else {
          console.log('ℹ️ No OneSignal Player ID found for user, skipping push notification');
        }

        // Send email notification
        if (userEmail) {
          try {
            results.email = await sendBulkEmailNotification(
              [userEmail],
              emailSubject,
              emailMessage
            );
            console.log(`✅ Email sent to ${userEmail}`);
          } catch (error: any) {
            console.error('❌ Email notification error:', error.message);
            results.email = { error: error.message, success: false };
          }
        } else {
          console.warn('⚠️ No email address found for user');
          results.email = { error: 'No email address found', success: false };
        }

        // Create in-app notification in Firestore using Admin SDK
        try {
          const notificationData = {
            userId: userId,
            title: title,
            message: message,
            type: 'customization_status',
            status: status,
            isRead: false,
            createdAt: FieldValue.serverTimestamp(),
            tourId: customizationData.tourPackageId || null,
            bookingId: customizationData.bookingId || null,
            userName: 'Admin',
            userRole: 'Admin',
            data: {
              customizationId: customizationData.id,
              tourPackageName: customizationData.tourPackageName,
              rejectionReason: customizationData.rejectionReason || null,
              adminNotes: customizationData.adminNotes || null
            }
          };

          const adminDb = getAdminDb();
          if (!adminDb) {
            console.warn('⚠️ Firebase Admin not initialized - skipping in-app notification');
            results.inApp = { error: 'Firebase Admin not initialized', success: false };
          } else {
            const notificationRef = await adminDb.collection('notifications').add(notificationData);
            console.log('✅ In-app notification created with ID:', notificationRef.id);
            results.inApp = { success: true, notificationId: notificationRef.id };
          }
        } catch (error: any) {
          console.error('❌ In-app notification error:', error.message);
          results.inApp = { error: error.message, success: false };
        }

        result = {
          id: `customization-${status}-${Date.now()}`,
          recipients: 1,
          push: results.push,
          email: results.email,
          inApp: results.inApp,
          success: true,
          message: `Notifications sent to user for customization ${status}`,
          details: {
            pushSent: results.push?.id || false,
            emailSent: results.email?.success !== false && !results.email?.error,
            inAppSent: results.inApp?.success !== false && !results.inApp?.error
          }
        };

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
