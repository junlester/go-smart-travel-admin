'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/configs/firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';
// Remove direct OneSignal imports - we'll use API routes instead

interface NotificationForm {
  title: string;
  message: string;
  sendEmail: boolean;
  sendSMS: boolean;
}

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = useState<'broadcast' | 'templates'>('broadcast');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // Form states
  const [broadcastForm, setBroadcastForm] = useState<NotificationForm>({
    title: '',
    message: '',
    sendEmail: false,
    sendSMS: false
  });

  // Template forms
  const [tripReminderForm, setTripReminderForm] = useState({
    destination: '',
    startDate: '',
    userName: '',
    userId: ''
  });

  // User search states
  const [userSearchText, setUserSearchText] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<any[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userBookings, setUserBookings] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [noBookingsError, setNoBookingsError] = useState('');


  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'broadcast',
          data: {
            title: broadcastForm.title,
            message: broadcastForm.message,
            sendEmail: broadcastForm.sendEmail,
            sendSMS: broadcastForm.sendSMS
          }
        })
      });
      
      const result = await response.json();
      
      // Handle OneSignal errors gracefully
      if (result.errors && result.errors.includes('All included players are not subscribed')) {
        setResult({
          success: true,
          message: 'Notification queued successfully! No users are currently subscribed to notifications.',
          data: {
            id: result.id || 'queued',
            recipients: 0,
            success: true,
            note: 'This is normal for new apps. Users will receive notifications once they grant permission.'
          }
        });
      } else {
        setResult(result);
      }
    } catch (error) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };

  // Search users as they type
  useEffect(() => {
    const searchUsers = async () => {
      if (userSearchText.length < 1) {
        setUserSearchResults([]);
        return;
      }

      setUserSearchLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const results: any[] = [];
        const searchLower = userSearchText.toLowerCase();

        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          const displayName = userData.displayName || '';
          const email = userData.email || '';
          
          // Skip admin users
          const isAdmin = userData.role === 'admin' || 
                         email.toLowerCase() === 'admin@gosmarttravel.com';
          
          if (isAdmin) return;

          // Match by name or email
          if (displayName.toLowerCase().includes(searchLower) || 
              email.toLowerCase().includes(searchLower)) {
            results.push({
              id: doc.id,
              displayName: displayName || email,
              email: email,
              ...userData
            });
          }
        });

        setUserSearchResults(results);
      } catch (error) {
        console.error('Error searching users:', error);
      } finally {
        setUserSearchLoading(false);
      }
    };

    const timeoutId = setTimeout(searchUsers, 300);
    return () => clearTimeout(timeoutId);
  }, [userSearchText]);

  // Fetch user bookings when user is selected
  const fetchUserBookings = async (userId: string) => {
    setBookingLoading(true);
    setNoBookingsError('');
    try {
      const bookingsQuery = query(
        collection(db, 'bookings'),
        where('userId', '==', userId),
        where('paymentStatus', '==', 'paid')
      );
      
      const bookingsSnapshot = await getDocs(bookingsQuery);
      const bookings: any[] = [];

      bookingsSnapshot.forEach((doc) => {
        const bookingData = doc.data();
        bookings.push({
          id: doc.id,
          ...bookingData
        });
      });

      // Sort by travel date (upcoming first)
      bookings.sort((a, b) => {
        const dateA = a.travelDate?.toDate ? a.travelDate.toDate() : new Date(a.travelDate || 0);
        const dateB = b.travelDate?.toDate ? b.travelDate.toDate() : new Date(b.travelDate || 0);
        return dateA.getTime() - dateB.getTime();
      });

      setUserBookings(bookings);

      if (bookings.length === 0) {
        setNoBookingsError('User does not book a tour');
        setTripReminderForm(prev => ({
          ...prev,
          destination: '',
          startDate: ''
        }));
      } else {
        // Auto-populate with first upcoming booking
        const firstBooking = bookings[0];
        const travelDate = firstBooking.travelDate?.toDate ? 
          firstBooking.travelDate.toDate() : 
          new Date(firstBooking.travelDate);
        
        const formattedDate = travelDate.toISOString().split('T')[0];
        
        setTripReminderForm(prev => ({
          ...prev,
          destination: firstBooking.tourLocation || firstBooking.tourName || '',
          startDate: formattedDate
        }));
        setNoBookingsError('');
      }
    } catch (error) {
      console.error('Error fetching user bookings:', error);
      setNoBookingsError('Error fetching bookings');
    } finally {
      setBookingLoading(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (user: any) => {
    setSelectedUser(user);
    setUserSearchText(user.displayName || user.email);
    setUserSearchResults([]);
    setTripReminderForm(prev => ({
      ...prev,
      userName: user.displayName || user.email,
      userId: user.id
    }));
    fetchUserBookings(user.id);
  };

  const handleTripReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (noBookingsError) {
      setResult({ error: noBookingsError });
      return;
    }

    if (!tripReminderForm.destination || !tripReminderForm.startDate) {
      setResult({ error: 'Please select a user with a booking' });
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'trip_reminder',
          data: {
            tripData: {
              destination: tripReminderForm.destination,
              startDate: tripReminderForm.startDate,
              userName: tripReminderForm.userName
            }
          }
        })
      });
      
      const result = await response.json();
      setResult(result);
    } catch (error: any) {
      setResult({ error: error.message });
    }
    setLoading(false);
  };


  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">📱 Notifications</h1>
        <p className="text-gray-400">Send notifications to your users through Push, Email, and SMS</p>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="border-b border-gray-300">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'broadcast', name: 'Broadcast to All', icon: '📢' },
              { id: 'templates', name: 'Templates', icon: '📝' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-400'
                    : 'border-transparent text-gray-400 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.icon} {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Broadcast to All */}
      {activeTab === 'broadcast' && (
        <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-300">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 flex items-center">
            <span className="text-2xl mr-2">📢</span>
            Broadcast to All Users
          </h2>
          <form onSubmit={handleBroadcastSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
              <input
                type="text"
                value={broadcastForm.title}
                onChange={(e) => setBroadcastForm({...broadcastForm, title: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                placeholder="Enter notification title"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
              <textarea
                value={broadcastForm.message}
                onChange={(e) => setBroadcastForm({...broadcastForm, message: e.target.value})}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all resize-none"
                rows={4}
                placeholder="Enter notification message"
                required
              />
            </div>
            <div className="space-y-3">
              <div className="flex items-center p-4 bg-gray-100 rounded-lg">
                <input
                  type="checkbox"
                  id="broadcast-send-email"
                  checked={broadcastForm.sendEmail}
                  onChange={(e) => setBroadcastForm({...broadcastForm, sendEmail: e.target.checked})}
                  className="mr-3 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="broadcast-send-email" className="text-sm font-medium text-gray-700 flex items-center">
                  <span className="text-lg mr-2">📧</span>
                  Also send email notifications
                </label>
              </div>
              <div className="flex items-center p-4 bg-gray-100 rounded-lg">
                <input
                  type="checkbox"
                  id="broadcast-send-sms"
                  checked={broadcastForm.sendSMS}
                  onChange={(e) => setBroadcastForm({...broadcastForm, sendSMS: e.target.checked})}
                  className="mr-3 h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                />
                <label htmlFor="broadcast-send-sms" className="text-sm font-medium text-gray-700 flex items-center">
                  <span className="text-lg mr-2">📱</span>
                  Also send SMS notifications
                </label>
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-gray-900 py-3 px-6 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </>
              ) : (
                <>
                  <span className="text-xl mr-2">📢</span>
                  Send to All Users
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Templates */}
      {activeTab === 'templates' && (
        <div className="space-y-6">
          {/* Trip Reminder */}
          <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-300">
            <h3 className="text-lg font-semibold mb-6 text-gray-900 flex items-center">
              <span className="text-2xl mr-2">🌴</span>
              Trip Reminder
            </h3>
            <form onSubmit={handleTripReminder} className="space-y-4">
              {/* User Search */}
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-2">User's Name</label>
                <input
                  type="text"
                  value={userSearchText}
                  onChange={(e) => {
                    setUserSearchText(e.target.value);
                    if (!e.target.value) {
                      setSelectedUser(null);
                      setTripReminderForm(prev => ({
                        ...prev,
                        userName: '',
                        userId: '',
                        destination: '',
                        startDate: ''
                      }));
                      setNoBookingsError('');
                    }
                  }}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-100 text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  placeholder="Type to search users (e.g., John Doe)"
                  required
                />
                {/* Search Results Dropdown */}
                {userSearchResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {userSearchLoading ? (
                      <div className="p-3 text-center text-gray-500">Searching...</div>
                    ) : (
                      userSearchResults.map((user) => (
                        <button
                          key={user.id}
                          type="button"
                          onClick={() => handleUserSelect(user)}
                          className="w-full text-left px-4 py-2 hover:bg-gray-100 transition-colors border-b border-gray-200 last:border-b-0"
                        >
                          <div className="font-medium text-gray-900">{user.displayName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Loading indicator for bookings */}
              {bookingLoading && (
                <div className="text-center text-gray-500 py-2">
                  Loading user bookings...
                </div>
              )}

              {/* Error message if no bookings */}
              {noBookingsError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="text-red-600 font-medium">{noBookingsError}</p>
                </div>
              )}

              {/* Destination and Start Date (Read-only) */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Destination</label>
                  <input
                    type="text"
                    value={tripReminderForm.destination}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-200 text-gray-700 cursor-not-allowed"
                    placeholder="Auto-filled from booking"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
                  <input
                    type="date"
                    value={tripReminderForm.startDate}
                    readOnly
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 bg-gray-200 text-gray-700 cursor-not-allowed"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-600 hover:bg-orange-700 text-gray-900 py-3 px-6 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-900" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Sending...
                  </>
                ) : (
                  <>
                    <span className="text-xl mr-2">🌴</span>
                    Send Trip Reminder
                  </>
                )}
              </button>
            </form>
          </div>

        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className={`mt-6 rounded-lg p-6 border ${result.success ? 'bg-green-900 bg-opacity-20 border-green-700' : 'bg-red-900 bg-opacity-20 border-red-700'}`}>
          {result.success ? (
            <p className="text-green-300 text-lg">
              ✅ Notification Sent Successfully!
            </p>
          ) : (
            <>
              <h3 className="text-lg font-semibold mb-4 flex items-center text-red-400">
                <span className="text-2xl mr-2">❌</span>
                Failed to Send Notification
              </h3>
              <div>
                <p className="text-red-300 mb-4 text-lg">❌ Failed to send notification. Check the details below:</p>
                <div className="bg-red-800 bg-opacity-30 p-4 rounded-lg mb-4">
                  <p className="text-red-300 font-medium mb-2">Error Details:</p>
                  <p className="text-red-200">{result.error}</p>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-red-400 hover:text-red-300">View Full Error</summary>
                  <pre className="text-xs text-gray-700 overflow-auto mt-2 bg-white p-3 rounded">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
