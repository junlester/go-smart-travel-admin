'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/configs/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, addDoc, serverTimestamp, getDoc, deleteDoc, arrayUnion } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';

// Booking type definition
type Booking = {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  tourId: string;
  tourName: string;
  tourLocation?: string;
  tourDuration?: string;
  bookingDate: string;
  travelDate?: string;
  amount: string;
  status: 'confirmed' | 'pending' | 'cancelled' | 'cancellation_requested';
  paymentStatus: 'paid' | 'partial' | 'unpaid' | 'refunded';
  paymentMethod?: string;
  paymentId?: string;
  createdAt: any;
  updatedAt?: any;
  numberOfPeople: number;
  contactInfo: string;
  specialRequests?: string;
  notes?: string;
  statusHistory?: Array<{
    status: string;
    timestamp: any;
    note?: string;
  }>;
  // Customization fields
  isCustomized?: boolean;
  customizationId?: string;
  customizedItinerary?: any;
  removedPlaces?: Array<{
    name?: string;
    activity?: string;
    day?: number;
    dayTitle?: string;
    activityId?: string;
  }>;
  originalItinerary?: any;
};

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'confirmed' | 'pending' | 'cancelled' | 'cancellation_requested'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'partial' | 'unpaid'>('all');
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingNote, setBookingNote] = useState('');
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [notificationTitle, setNotificationTitle] = useState('');
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationType, setNotificationType] = useState<'email' | 'push'>('push');

  // Check authentication status
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setIsAuthenticated(!!user);
      console.log("Authentication status:", !!user);
      console.log("Current user:", user ? user.uid : "None");
    });
    
    return () => unsubscribe();
  }, []);

  // Fetch bookings from Firestore
  useEffect(() => {
    const fetchBookings = async () => {
      try {
        setLoading(true);
        const bookingsQuery = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(bookingsQuery);
        
        const bookingsList: Booking[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          
          // Function to format dates - time removed
          const formatDate = (timestamp: any) => {
            if (!timestamp) return 'Unknown';
            try {
              const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
              return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
              });
            } catch (error) {
              console.error('Error formatting date:', error);
              return 'Unknown';
            }
          };
          
          bookingsList.push({
            id: doc.id,
            userId: data.userId || '',
            userName: data.userName || 'Unknown User',
            userEmail: data.userEmail || '',
            tourId: data.tourId || '',
            tourName: data.tourName || 'Unknown Tour',
            tourLocation: data.tourLocation || 'Not specified',
            tourDuration: data.tourDuration || 'Not specified',
            bookingDate: formatDate(data.bookingDate || data.createdAt),
            travelDate: formatDate(data.travelDate),
            amount: data.amount ? `${parseFloat(data.amount).toFixed(2)}` : '0.00',
            status: data.status || 'pending',
            paymentStatus: data.paymentStatus || 'unpaid',
            paymentMethod: data.paymentMethod || '',
            paymentId: data.paymentId || '',
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
            numberOfPeople: data.numberOfPeople || 1,
            contactInfo: data.contactInfo || 'No contact information',
            specialRequests: data.specialRequests || '',
            notes: data.notes || '',
            statusHistory: data.statusHistory || [],
            // Customization fields
            isCustomized: data.isCustomized || false,
            customizationId: data.customizationId || '',
            customizedItinerary: data.customizedItinerary || null,
            removedPlaces: data.removedPlaces || [],
            originalItinerary: data.originalItinerary || null
          });
        });
        
        setBookings(bookingsList);
      } catch (error) {
        console.error('Error fetching bookings:', error);
        setBookings([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookings();
  }, []);

  // Filter bookings based on search term and status
  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = 
      booking.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
      booking.tourName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.contactInfo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (booking.userEmail && booking.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' ? true : booking.status === filterStatus;
    const matchesPayment = filterPayment === 'all' ? true : booking.paymentStatus === filterPayment;
    
    return matchesSearch && matchesStatus && matchesPayment;
  });

  // Get booking details
  const viewBookingDetails = (booking: Booking) => {
    setSelectedBooking(booking);
    setBookingNote(booking.notes || '');
    setIsDetailViewOpen(true);
  };

  // Close detail view
  const closeDetailView = () => {
    setIsDetailViewOpen(false);
    setSelectedBooking(null);
  };

  // Update booking status
  const updateBookingStatus = async (id: string, newStatus: 'confirmed' | 'pending' | 'cancelled' | 'cancellation_requested') => {
    try {
      // Check if we have a valid ID
      if (!id) {
        throw new Error('Invalid booking ID');
      }
      
      console.log(`Updating booking ${id} to status: ${newStatus}`);
      
      // Get current auth state
      const auth = getAuth();
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        console.error('No user is signed in. Authentication required for this operation.');
        alert('Hindi ka naka-login. Kailangan mong mag-login muli para makapag-update ng booking.');
        return;
      }
      
      console.log('Current user:', currentUser.uid);
      console.log('Authentication time:', currentUser.metadata.lastSignInTime);
      
      // Force token refresh to ensure we have the most recent authentication
      try {
        console.log('Refreshing authentication token...');
        await currentUser.getIdToken(true);
        console.log('Token refreshed successfully');
      } catch (tokenError) {
        console.error('Failed to refresh token:', tokenError);
        alert('Hindi ma-refresh ang token. Subukang mag-logout at mag-login muli.');
        return;
      }
      
      const bookingRef = doc(db, 'bookings', id);
      const bookingDoc = await getDoc(bookingRef);
      
      if (!bookingDoc.exists()) {
        throw new Error('Booking not found');
      }
      
      const bookingData = bookingDoc.data();
      const statusHistory = bookingData.statusHistory || [];
      
      // Add to status history
      statusHistory.push({
        status: newStatus,
        timestamp: new Date(), 
        note: `Status updated to ${newStatus}`
      });
      
      // Prepare update data
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        statusHistory: statusHistory
      };
      
      console.log('Sending update to Firestore with data:', updateData);
      
    try {
      // Update in Firestore
        await updateDoc(bookingRef, updateData);
        console.log('Firestore update completed successfully');
        
        // Add notification for user
        if (newStatus === 'confirmed' || newStatus === 'cancelled') {
          try {
            const notificationData = {
              userId: bookingData.userId,
              title: newStatus === 'confirmed' ? 'Booking Confirmed' : 'Booking Cancelled',
              message: newStatus === 'confirmed' 
                ? `Your booking for ${bookingData.tourName} has been confirmed!` 
                : `Your booking for ${bookingData.tourName} has been cancelled.`,
              type: newStatus === 'confirmed' ? 'booking_confirmed' : 'booking_cancelled',
              isRead: false,
              createdAt: serverTimestamp(),
              bookingId: id
            };
            
            console.log('Creating user notification:', notificationData);
            await addDoc(collection(db, 'notifications'), notificationData);
            console.log('User notification created successfully');
          } catch (error) {
            console.error('Error creating notification:', error);
            // Continue even if notification fails
          }
        }
        
        // Update local state
        setBookings(bookings.map(booking => 
          booking.id === id ? { 
            ...booking, 
            status: newStatus,
            statusHistory: [...(booking.statusHistory || []), {
              status: newStatus,
              timestamp: new Date(),
              note: `Status updated to ${newStatus}`
            }]
          } : booking
        ));
        
        if (selectedBooking && selectedBooking.id === id) {
          setSelectedBooking({
            ...selectedBooking,
            status: newStatus,
            statusHistory: [...(selectedBooking.statusHistory || []), {
              status: newStatus,
              timestamp: new Date(),
              note: `Status updated to ${newStatus}`
            }]
          });
        }
        
        // Add to activities collection
        try {
          const activityData = {
            title: `Booking ${newStatus}`,
            description: `Booking for ${bookings.find(b => b.id === id)?.tourName} was marked as ${newStatus}`,
            timestamp: serverTimestamp(),
            type: 'booking'
          };
          
          console.log('Creating activity record:', activityData);
          await addDoc(collection(db, 'activities'), activityData);
          console.log('Activity record created successfully');
        } catch (activityError) {
          console.error('Error creating activity record:', activityError);
          // Continue even if activity creation fails
        }
        
        alert(`Booking ${newStatus} successfully. ${(newStatus === 'confirmed' || newStatus === 'cancelled') ? 'User has been notified.' : ''}`);
      } catch (updateError) {
        console.error('Error in Firestore update operation:', updateError);
        
        // Check for Firebase permission errors
        if (updateError instanceof Error && updateError.message.includes('permission')) {
          alert('Hindi magawang i-update ang booking status dahil sa permission error.\n\nMaaaring nag-expire na ang iyong login session. Subuking mag-logout at mag-login muli, at pagkatapos ay subukang muli.');
          
          console.error('Firebase permission error detected. User authentication may have expired.');
        } else {
          alert(`Hindi nagawang i-update ang booking: ${updateError instanceof Error ? updateError.message : 'Hindi matukoy ang error'}`);
        }
        
        throw updateError; // Re-throw to be caught by outer catch block
      }
    } catch (error) {
      console.error('Error updating booking status:', error);
      
      // Log detailed error information
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Check for Firebase permission errors
      if (error instanceof Error && error.message.includes('permission')) {
        alert('Permission denied. Maaaring kailangan mong mag-logout at mag-login ulit, at pagkatapos ay subukang muli.\n\nIf the issue persists, please clear your browser cache and cookies.');
      } else if (!(error as Error).toString().includes('permission')) { // Only show if not already shown
        alert(`Failed to update booking status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  // Function para ma-confirm ang action bago gawin
  const confirmAction = (message: string): boolean => {
    return window.confirm(message);
  };

  // Function para i-fetch ang details ng isang booking
  const fetchBookingDetails = async (bookingId: string) => {
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      const bookingDoc = await getDoc(bookingRef);
      
      if (bookingDoc.exists()) {
        return {
          id: bookingDoc.id,
          ...bookingDoc.data()
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching booking details:', error);
      return null;
    }
  };

  // Update the payment status function
  const updatePaymentStatus = async (bookingId: string, newStatus: string) => {
    try {
      if (!confirmAction(`Are you sure you want to mark this booking as ${newStatus}?`)) {
        return;
      }
      
      setLoading(true);
      
      const bookingRef = doc(db, 'bookings', bookingId);
      
      // Update the payment status
      await updateDoc(bookingRef, {
        paymentStatus: newStatus,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({
          status: `payment_${newStatus}`,
          timestamp: new Date(),
          note: `Payment marked as ${newStatus} by admin`
        })
      });
      
      // Add activity log
      await addDoc(collection(db, 'activities'), {
        title: 'Payment Status Updated',
        description: `Booking #${bookingId.substring(0, 6)} payment status updated to ${newStatus}`,
        timestamp: serverTimestamp(),
        type: 'payment',
        bookingId
      });
      
      // Refresh the booking list
      const updatedBooking = await fetchBookingDetails(bookingId);
      if (updatedBooking) {
        // Update the bookings list with the updated booking
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking.id === bookingId ? { ...(updatedBooking as Booking) } : booking
          )
        );
        
        // Update selected booking if it's the one being viewed
        if (selectedBooking && selectedBooking.id === bookingId) {
          setSelectedBooking(updatedBooking as Booking);
        }
      }
      
      toast.success(`Payment has been marked as ${newStatus}`);
      
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast.error('Failed to update payment status. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update booking notes
  const updateBookingNotes = async () => {
    if (!selectedBooking) return;
    
    try {
      const bookingRef = doc(db, 'bookings', selectedBooking.id);
      
      await updateDoc(bookingRef, {
        notes: bookingNote,
        updatedAt: serverTimestamp()
      });
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === selectedBooking.id ? { ...booking, notes: bookingNote } : booking
      ));
      
      setSelectedBooking({
        ...selectedBooking,
        notes: bookingNote
      });
      
      alert('Notes updated successfully');
    } catch (error) {
      console.error('Error updating booking notes:', error);
      alert('Failed to update notes. Please try again.');
    }
  };

  // Format timestamp for detail view - time removed
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown';
    }
  };

  // Add a function to handle cancellation confirmation
  const confirmCancellation = async (bookingId: string) => {
    if (confirm('Are you sure you want to confirm this cancellation request?')) {
      try {
        await updateBookingStatus(bookingId, 'cancelled');
      } catch (error) {
        console.error('Error confirming cancellation:', error);
        alert('Failed to approve cancellation. Please try again later.');
      }
    }
  };

  // Function to send notification to user
  const sendNotification = async () => {
    if (!selectedBooking || !notificationTitle.trim() || !notificationMessage.trim()) {
      alert('Please fill in both title and message');
      return;
    }

    try {
      // Create notification document in Firestore
      const notificationData = {
        userId: selectedBooking.userId,
        title: notificationTitle,
        message: notificationMessage,
        type: 'admin_notification',
        isRead: false,
        createdAt: serverTimestamp(),
        bookingId: selectedBooking.id,
        notificationType: notificationType,
        sentBy: 'admin'
      };

      console.log('Creating notification:', notificationData);
      await addDoc(collection(db, 'notifications'), notificationData);
      console.log('Notification created successfully');

      // If email notification is selected, send email via API
      if (notificationType === 'email' && selectedBooking.userEmail) {
        try {
          console.log('Sending email notification...');
          const emailResponse = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              to: selectedBooking.userEmail,
              subject: notificationTitle,
              message: notificationMessage,
              bookingId: selectedBooking.id,
              userName: selectedBooking.userName,
              tourName: selectedBooking.tourName
            }),
          });

          if (!emailResponse.ok) {
            const errorData = await emailResponse.json();
            throw new Error(errorData.error || 'Failed to send email');
          }

          const emailResult = await emailResponse.json();
          console.log('Email sent successfully:', emailResult.messageId);
        } catch (emailError) {
          console.error('Error sending email:', emailError);
          // Continue with notification creation even if email fails
          toast.error('Notification created but email failed to send. Please check email configuration.');
        }
      }

      // Add activity log
      await addDoc(collection(db, 'activities'), {
        title: 'Notification Sent',
        description: `Admin sent ${notificationType} notification to ${selectedBooking.userName} for booking ${selectedBooking.tourName}`,
        timestamp: serverTimestamp(),
        type: 'notification',
        bookingId: selectedBooking.id
      });

      // Reset form and close modal
      setNotificationTitle('');
      setNotificationMessage('');
      setNotificationType('push');
      setIsNotificationModalOpen(false);

      toast.success(`${notificationType === 'email' ? 'Email' : 'Push notification'} sent successfully!`);
      
    } catch (error) {
      console.error('Error sending notification:', error);
      toast.error('Failed to send notification. Please try again.');
    }
  };

  // Function to open notification modal
  const openNotificationModal = () => {
    setIsNotificationModalOpen(true);
    // Pre-fill with booking context
    setNotificationTitle(`Update for your ${selectedBooking?.tourName} booking`);
    setNotificationMessage(`Hello ${selectedBooking?.userName}, this is an update regarding your booking for ${selectedBooking?.tourName}.`);
  };

  // Function to close notification modal
  const closeNotificationModal = () => {
    setIsNotificationModalOpen(false);
    setNotificationTitle('');
    setNotificationMessage('');
    setNotificationType('push');
  };

  // Magdagdag ng function para sa pag-delete ng booking
  const deleteBooking = async (id: string) => {
    try {
      if (!confirm('Sigurado ka bang gusto mong tuluyang tanggalin ang booking na ito? Hindi na ito maibabalik.')) {
        return;
      }
      
      // I-delete ang booking document
      await deleteDoc(doc(db, 'bookings', id));
      
      // I-update ang local state para alisin ang booking
      setBookings(bookings.filter(booking => booking.id !== id));
      
      // Kung nasa detail view mode at ito ang tinanggal na booking, isara ang detail view
      if (selectedBooking && selectedBooking.id === id) {
        setIsDetailViewOpen(false);
        setSelectedBooking(null);
      }
      
      // I-record ang activity
      await addDoc(collection(db, 'activities'), {
        title: 'Booking Deleted',
        description: `A cancelled booking was permanently deleted from the system.`,
        timestamp: serverTimestamp(),
        type: 'booking_deleted'
      });
      
      alert('Ang booking ay tuluyang natanggal.');
    } catch (error) {
      console.error('Error deleting booking:', error);
      alert('Hindi matagumpay ang pagtanggal ng booking. Subukan muli mamaya.');
    }
  };

  // Add these functions inside the BookingsPage component
  const getPaymentStatusColor = (status: string): string => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'unpaid':
        return 'bg-yellow-100 text-yellow-800';
      case 'refunded':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatPaymentStatus = (status: string): string => {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  // Update the bookingDetails state to include payment info
  type BookingDetails = {
    // ... existing properties ...
    paymentStatus: string;
    paymentMethod: string;
    paymentId: string;
    // ... existing properties ...
  };

  // Update the viewBookingDetails function to include payment info in the modal
  // Add inside the booking details modal JSX

  {/* Payment Information Section */}
  <div className="mt-6">
    <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Information</h3>
    <div className="bg-gray-100 rounded-md p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-gray-700">Status:</span>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedBooking?.paymentStatus || 'unpaid')}`}>
          {formatPaymentStatus(selectedBooking?.paymentStatus || 'unpaid')}
        </span>
      </div>
      
      {selectedBooking?.paymentMethod && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700">Method:</span>
          <span className="text-gray-900">{selectedBooking.paymentMethod}</span>
        </div>
      )}
      
      {selectedBooking?.paymentId && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-gray-700">Transaction ID:</span>
          <span className="text-gray-900">{selectedBooking.paymentId}</span>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <span className="text-gray-700">Amount:</span>
        <span className="text-gray-900 font-semibold">₱{parseFloat(selectedBooking?.amount || '0').toLocaleString()}</span>
      </div>
    </div>
  </div>

  {/* Add payment actions */}
  {selectedBooking && selectedBooking.status !== 'cancelled' && selectedBooking.paymentStatus === 'unpaid' && (
    <div className="mt-4 flex justify-end">
      <button
        onClick={() => updatePaymentStatus(selectedBooking.id, 'paid')}
        className="bg-green-600 hover:bg-green-700 text-gray-900 py-1 px-3 rounded-md text-sm mr-2 transition-colors"
      >
        Mark as Paid
      </button>
    </div>
  )}

  {/* Add refund option for paid bookings */}
  {selectedBooking && selectedBooking.paymentStatus === 'paid' && (
    <div className="mt-4 flex justify-end">
      <button
        onClick={() => updatePaymentStatus(selectedBooking.id, 'refunded')}
        className="bg-blue-600 hover:bg-blue-700 text-gray-900 py-1 px-3 rounded-md text-sm transition-colors"
      >
        Process Refund
      </button>
    </div>
  )}

  return (
    <div>
      {/* Toast notification container */}
      <Toaster position="top-right" />
      
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Bookings</h1>
        <div className="flex space-x-2">
            <div className="relative">
              <input
              type="text"
                placeholder="Search bookings..."
              className="pl-10 pr-4 py-2 rounded-md bg-white border border-gray-300 text-black w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
            <select
            className="px-4 py-2 rounded-md bg-white border border-gray-300 text-black"
              value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as 'all' | 'confirmed' | 'pending' | 'cancelled' | 'cancellation_requested')}
            >
            <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
            <option value="cancellation_requested">Cancellation Requested</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>

        {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden">
            {filteredBookings.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-black">No bookings found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Tour
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Customer
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Date
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      People
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Amount
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Status
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Payment
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
                    </tr>
                  </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {filteredBookings.map((booking) => (
                      <tr key={booking.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.tourName}</div>
                        {booking.isCustomized && (
                          <div className="text-xs text-cyan-400 mt-1 flex items-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Customized Tour
                          </div>
                        )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{booking.userName}</div>
                        <div className="text-sm text-gray-400">{booking.userEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{formatTimestamp(booking.bookingDate)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{booking.numberOfPeople}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span className="font-semibold">Amount:</span>
                          <span className="text-green-500 font-bold">
                            ₱{parseFloat(booking.amount.toString()).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </span>
                        </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          booking.status === 'confirmed' ? 'bg-green-900 text-green-300' : 
                          booking.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : 
                          booking.status === 'cancelled' ? 'bg-red-900 text-red-300' : 
                          booking.status === 'cancellation_requested' ? 'bg-orange-900 text-orange-300' :
                          'bg-blue-900 text-blue-300'
                        }`}>
                          {booking.status === 'confirmed' ? 'Confirmed' : 
                          booking.status === 'pending' ? 'Pending' : 
                          booking.status === 'cancelled' ? 'Cancelled' :
                          booking.status === 'cancellation_requested' ? 'Cancellation Requested' :
                          (booking.status as string).charAt(0).toUpperCase() + (booking.status as string).slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(booking.paymentStatus || 'unpaid')}`}>
                            {formatPaymentStatus(booking.paymentStatus || 'unpaid')}
                          </span>
                        </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => viewBookingDetails(booking)}
                          className="text-blue-400 hover:text-blue-300 mr-3"
                        >
                          View
                        </button>
                        {booking.status === 'pending' && (
                              <button 
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                            className="text-green-400 hover:text-green-300 mr-2"
                              >
                                Confirm
                              </button>
                            )}
                        {booking.status === 'cancellation_requested' && (
                              <button 
                            onClick={() => confirmCancellation(booking.id)}
                            className="text-red-400 hover:text-red-300"
                              >
                            Approve Cancel
                              </button>
                            )}
                        {booking.status === 'cancelled' && (
                              <button 
                            onClick={() => deleteBooking(booking.id)}
                            className="text-red-400 hover:text-red-300"
                              >
                            Delete
                              </button>
                            )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-gray-300">
            <div className="px-6 py-4 border-b border-gray-300">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Booking Details</h3>
                <button
                  onClick={closeDetailView}
                  className="text-gray-400 hover:text-gray-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Tour</h4>
                  <div className="flex items-center gap-2 mb-4">
                    <p className="text-lg font-semibold text-gray-900">{selectedBooking.tourName}</p>
                    {selectedBooking.isCustomized && (
                      <span className="px-2 py-1 text-xs font-medium bg-cyan-100 text-cyan-800 rounded-full flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        Customized
                      </span>
                    )}
                  </div>
                  
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Customer</h4>
                  <p className="text-sm font-medium text-gray-900">{selectedBooking.userName}</p>
                  <p className="text-sm text-gray-700 mt-1">{selectedBooking.userEmail}</p>
                  <h4 className="text-sm font-medium text-gray-400 mt-4 mb-1">Contact Info</h4>
                  <p className="text-sm text-gray-700">{selectedBooking.contactInfo}</p>
                  
                  <h4 className="text-sm font-medium text-gray-400 mt-4 mb-1">Booking Date</h4>
                  <p className="text-sm text-gray-700">
                    {formatTimestamp(selectedBooking.bookingDate)}
                  </p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Status</h4>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedBooking.status === 'confirmed' ? 'bg-green-900 text-green-300' : 
                    selectedBooking.status === 'pending' ? 'bg-yellow-900 text-yellow-300' : 
                    selectedBooking.status === 'cancelled' ? 'bg-red-900 text-red-300' : 
                    selectedBooking.status === 'cancellation_requested' ? 'bg-orange-900 text-orange-300' :
                    'bg-blue-900 text-blue-300'
                  }`}>
                    {selectedBooking.status === 'confirmed' ? 'Confirmed' : 
                    selectedBooking.status === 'pending' ? 'Pending' : 
                    selectedBooking.status === 'cancelled' ? 'Cancelled' :
                    selectedBooking.status === 'cancellation_requested' ? 'Cancellation Requested' :
                    (selectedBooking.status as string).charAt(0).toUpperCase() + (selectedBooking.status as string).slice(1)}
                  </span>
                  
                  <h4 className="text-sm font-medium text-gray-400 mt-4 mb-1">Number of People</h4>
                  <p className="text-sm text-gray-700">{selectedBooking.numberOfPeople}</p>
                  
                  <h4 className="text-sm font-medium text-gray-400 mt-4 mb-1">Amount</h4>
                  <div className="mt-2">
                    <span className="font-semibold">Amount: </span>
                    <span className="text-green-500 font-bold">
                      ₱{parseFloat(selectedBooking.amount.toString()).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  
                  <h4 className="text-sm font-medium text-gray-400 mt-4 mb-1">Payment Method</h4>
                  <p className="text-sm text-gray-700">{selectedBooking.paymentMethod || 'Not specified'}</p>
                </div>
              </div>
              
              {selectedBooking.specialRequests && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Special Requests</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-md">
                    {selectedBooking.specialRequests}
                  </p>
                </div>
              )}
              
              {/* Customized Itinerary Section */}
              {selectedBooking.isCustomized && selectedBooking.customizedItinerary && (
                <div className="mt-6 border-t border-gray-300 pt-4">
                  <div className="flex items-center gap-2 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-cyan-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    <h3 className="text-lg font-semibold text-gray-900">Customized Itinerary</h3>
                  </div>
                  
                  {selectedBooking.removedPlaces && selectedBooking.removedPlaces.length > 0 && (
                    <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-md">
                      <h4 className="text-sm font-medium text-orange-900 mb-2">Removed Places:</h4>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedBooking.removedPlaces.map((place, index) => (
                          <li key={index} className="text-sm text-orange-800">
                            {place.activity || place.name} ({place.dayTitle || `Day ${place.day}`})
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {selectedBooking.customizedItinerary.days && Array.isArray(selectedBooking.customizedItinerary.days) && (
                    <div className="space-y-4">
                      {selectedBooking.customizedItinerary.days.map((day: any, dayIndex: number) => (
                        <div key={dayIndex} className="bg-gray-50 p-4 rounded-md border border-gray-200">
                          <h4 className="text-sm font-semibold text-gray-900 mb-2">
                            {day.title || `Day ${dayIndex + 1}`}
                          </h4>
                          {day.activities && Array.isArray(day.activities) && day.activities.length > 0 ? (
                            <ul className="space-y-2">
                              {day.activities.map((activity: any, actIndex: number) => (
                                <li key={actIndex} className="flex items-start">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                  <span className="text-sm text-gray-700">
                                    {activity.name || activity.description || activity}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="text-sm text-gray-600 italic">
                              {day.description || 'No activities for this day'}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Add cancellation request notice if applicable */}
              {selectedBooking.status === 'cancellation_requested' && (
                <div className="mt-4 p-3 bg-orange-900 bg-opacity-20 border border-orange-700 rounded-md">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500 mr-2 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h4 className="text-sm font-medium text-orange-300">Cancellation Request</h4>
                      <p className="text-sm text-gray-700 mt-1">
                        The user has requested to cancel this booking. You can either approve the cancellation or keep the booking.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Payment Information Section */}
              <div className="mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Payment Information</h3>
                <div className="bg-gray-100 rounded-md p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-700">Status:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedBooking.paymentStatus || 'unpaid')}`}>
                      {formatPaymentStatus(selectedBooking.paymentStatus || 'unpaid')}
                    </span>
                  </div>
                  
                  {selectedBooking.paymentMethod && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700">Method:</span>
                      <span className="text-gray-900">{selectedBooking.paymentMethod}</span>
                    </div>
                  )}
                  
                  {selectedBooking.paymentId && (
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-700">Transaction ID:</span>
                      <span className="text-gray-900">{selectedBooking.paymentId}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <span className="text-gray-700">Amount:</span>
                    <span className="text-gray-900 font-semibold">₱{parseFloat(selectedBooking.amount || '0').toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 border-t border-gray-300 pt-4">
                <div className="flex justify-between items-center">
                  <button
                    onClick={openNotificationModal}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-gray-900 rounded-md flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4.828 7l2.586 2.586a2 2 0 002.828 0L12.828 7H4.828zM4.828 17h8l-2.586-2.586a2 2 0 00-2.828 0L4.828 17z" />
                    </svg>
                    Send Notification
                  </button>
                  <div className="flex space-x-2">
                    {selectedBooking.status === 'pending' && (
                      <button
                        onClick={() => updateBookingStatus(selectedBooking.id, 'confirmed')}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-gray-900 rounded-md"
                      >
                        Confirm Booking
                      </button>
                    )}
                    {selectedBooking.status === 'cancellation_requested' && (
                      <>
                        <button
                          onClick={() => updateBookingStatus(selectedBooking.id, 'confirmed')}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-gray-900 rounded-md"
                        >
                          Keep Booking
                        </button>
                        <button
                          onClick={() => confirmCancellation(selectedBooking.id)}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-gray-900 rounded-md"
                        >
                          Approve Cancellation
                        </button>
                      </>
                    )}
                    {selectedBooking.status === 'cancelled' && (
                      <button
                        onClick={() => deleteBooking(selectedBooking.id)}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-gray-900 rounded-md"
                      >
                        Delete Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      {isNotificationModalOpen && selectedBooking && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-gray-300">
            <div className="px-6 py-4 border-b border-gray-300">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Send Notification</h3>
                <button
                  onClick={closeNotificationModal}
                  className="text-gray-400 hover:text-gray-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="mb-4">
                <p className="text-sm text-gray-700 mb-2">
                  Sending to: <span className="text-gray-900 font-medium">{selectedBooking.userName}</span>
                </p>
                <p className="text-sm text-gray-700">
                  Booking: <span className="text-gray-900 font-medium">{selectedBooking.tourName}</span>
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notification Type
                </label>
                <select
                  value={notificationType}
                  onChange={(e) => setNotificationType(e.target.value as 'email' | 'push')}
                  className="w-full px-3 py-2 rounded-md bg-gray-100 border border-gray-600 text-gray-900"
                >
                  <option value="push">Push Notification</option>
                  <option value="email" disabled={!selectedBooking.userEmail}>
                    Email {!selectedBooking.userEmail ? '(No email available)' : ''}
                  </option>
                </select>
                {!selectedBooking.userEmail && (
                  <p className="text-yellow-400 text-xs mt-1">
                    ⚠️ Email notification not available - user has no email address
                  </p>
                )}
                {selectedBooking.userEmail && (
                  <p className="text-green-400 text-xs mt-1">
                    ✅ Email will be sent to: {selectedBooking.userEmail}
                  </p>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={notificationTitle}
                  onChange={(e) => setNotificationTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-gray-100 border border-gray-600 text-gray-900"
                  placeholder="Enter notification title"
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  value={notificationMessage}
                  onChange={(e) => setNotificationMessage(e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md bg-gray-100 border border-gray-600 text-gray-900"
                  placeholder="Enter your message"
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={closeNotificationModal}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-100 text-gray-900 rounded-md"
                >
                  Cancel
                </button>
                <button
                  onClick={sendNotification}
                  disabled={notificationType === 'email' && !selectedBooking.userEmail}
                  className={`px-4 py-2 rounded-md ${
                    notificationType === 'email' && !selectedBooking.userEmail
                      ? 'bg-gray-500 cursor-not-allowed text-gray-700'
                      : 'bg-purple-600 hover:bg-purple-700 text-gray-900'
                  }`}
                >
                  Send {notificationType === 'email' ? 'Email' : 'Notification'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 