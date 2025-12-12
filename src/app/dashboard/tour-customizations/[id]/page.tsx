'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { db } from '@/configs/firebase';
import { doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/contexts/AuthContext';

interface CustomizationRequest {
  id: string;
  tourPackageId: string;
  tourPackageName: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  originalItinerary: any;
  customizedItinerary: any;
  removedPlaces: Array<{ 
    name?: string; 
    activity?: string; 
    day: number | string; 
    dayTitle?: string;
    activityId?: string;
  }>;
  userComments: string;
  adminNotes: string;
  rejectionReason: string;
  requestedAt: any;
}

export default function CustomizationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { currentUser } = useAuth();
  const customizationId = params.id as string;

  const [customization, setCustomization] = useState<CustomizationRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    loadCustomization();
  }, [customizationId]);

  const loadCustomization = async () => {
    try {
      setLoading(true);
      const docRef = doc(db, 'tour_customizations', customizationId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as CustomizationRequest;
        setCustomization(data);
        setAdminNotes(data.adminNotes || '');
        setRejectionReason(data.rejectionReason || '');
      } else {
        console.error('Customization not found');
      }
    } catch (error) {
      console.error('Error loading customization:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!customization || !currentUser) return;

    if (!confirm('Are you sure you want to approve this customization request?')) {
      return;
    }

    try {
      setProcessing(true);
      const docRef = doc(db, 'tour_customizations', customizationId);
      
      await updateDoc(docRef, {
        status: 'approved',
        adminId: currentUser.uid,
        adminName: currentUser.email?.split('@')[0] || 'Admin',
        adminNotes: adminNotes.trim(),
        updatedAt: serverTimestamp(),
        approvedAt: serverTimestamp()
      });

      // Send notification to user (email, push, and in-app)
      try {
        const notificationResponse = await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'customization_status',
            data: {
              userId: customization.userId,
              status: 'approved',
              customizationData: {
                id: customizationId,
                tourPackageId: customization.tourPackageId,
                tourPackageName: customization.tourPackageName,
                adminNotes: adminNotes.trim(),
                bookingId: customization.bookingId || null
              }
            }
          })
        });

        const notificationResult = await notificationResponse.json();
        if (notificationResult.success) {
          console.log('✅ Notifications sent successfully:', notificationResult.data.details);
        } else {
          console.warn('⚠️ Some notifications failed:', notificationResult.error);
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't block the approval if notification fails
      }

      alert('Customization request approved successfully!');
      router.push('/dashboard/tour-customizations');
    } catch (error) {
      console.error('Error approving customization:', error);
      alert('Failed to approve customization request');
    } finally {
      setProcessing(false);
    }
  };

  const handleDelete = async () => {
    if (!customization) return;

    if (!confirm('Are you sure you want to delete this customization request? This action cannot be undone.')) {
      return;
    }

    try {
      setProcessing(true);
      const docRef = doc(db, 'tour_customizations', customizationId);
      await deleteDoc(docRef);
      
      alert('Customization request deleted successfully!');
      router.push('/dashboard/tour-customizations');
    } catch (error) {
      console.error('Error deleting customization:', error);
      alert('Failed to delete customization request');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!customization || !currentUser) return;

    if (!rejectionReason.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessing(true);
      const docRef = doc(db, 'tour_customizations', customizationId);
      
      await updateDoc(docRef, {
        status: 'rejected',
        adminId: currentUser.uid,
        adminName: currentUser.email?.split('@')[0] || 'Admin',
        adminNotes: adminNotes.trim(),
        rejectionReason: rejectionReason.trim(),
        updatedAt: serverTimestamp(),
        rejectedAt: serverTimestamp()
      });

      // Send notification to user (email, push, and in-app)
      try {
        const notificationResponse = await fetch('/api/notifications', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 'customization_status',
            data: {
              userId: customization.userId,
              status: 'rejected',
              customizationData: {
                id: customizationId,
                tourPackageId: customization.tourPackageId,
                tourPackageName: customization.tourPackageName,
                rejectionReason: rejectionReason.trim(),
                adminNotes: adminNotes.trim(),
                bookingId: customization.bookingId || null
              }
            }
          })
        });

        const notificationResult = await notificationResponse.json();
        if (notificationResult.success) {
          console.log('✅ Notifications sent successfully:', notificationResult.data.details);
        } else {
          console.warn('⚠️ Some notifications failed:', notificationResult.error);
        }
      } catch (notificationError) {
        console.error('Error sending notifications:', notificationError);
        // Don't block the rejection if notification fails
      }

      alert('Customization request rejected');
      router.push('/dashboard/tour-customizations');
    } catch (error) {
      console.error('Error rejecting customization:', error);
      alert('Failed to reject customization request');
    } finally {
      setProcessing(false);
      setShowRejectModal(false);
    }
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isActivityRemoved = (dayIndex: number, activityIndex: number, activity: any) => {
    if (!customization?.removedPlaces) return false;
    return customization.removedPlaces.some(
      (removed) => {
        // Check by activityId
        if (removed.activityId && activity.id && removed.activityId === activity.id) return true;
        // Check by name (supports both 'name' and 'activity' properties for backward compatibility)
        const removedName = removed.name || removed.activity;
        const activityName = activity.name || activity.description;
        if (removedName && activityName && removedName === activityName) return true;
        // Check by day index
        const removedDay = typeof removed.day === 'number' ? removed.day : parseInt(String(removed.day).replace(/\D/g, ''));
        if (removedDay === dayIndex + 1 && removed.activityId === `act-${activityIndex}`) return true;
        return false;
      }
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!customization) {
    return (
      <div className="bg-white rounded-lg p-12 text-center shadow-md">
        <p className="text-gray-500 text-lg mb-4">Customization request not found.</p>
        <Link href="/dashboard/tour-customizations" className="text-green-500 hover:underline">
          ← Back to Customizations
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/dashboard/tour-customizations" className="text-green-500 hover:underline mb-2 inline-block">
            ← Back to Customizations
          </Link>
          <h1 className="text-3xl font-semibold text-gray-900">Review Customization Request</h1>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={handleDelete}
            disabled={processing}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            title="Delete customization request"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
            <span>Delete</span>
          </button>
        <span
          className={`px-4 py-2 rounded-full text-sm font-semibold ${
            customization.status === 'pending_approval'
              ? 'bg-yellow-500 text-yellow-900'
              : customization.status === 'approved'
              ? 'bg-green-500 text-green-900'
              : 'bg-red-500 text-red-900'
          }`}
        >
          {customization.status === 'pending_approval'
            ? '⏳ Pending'
            : customization.status === 'approved'
            ? '✅ Approved'
            : '❌ Rejected'}
        </span>
        </div>
      </div>

      {/* User Info */}
      <div className="bg-white rounded-lg p-6 shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Information</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Name</p>
            <p className="font-medium text-gray-900">{customization.userName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Email</p>
            <p className="font-medium text-gray-900">{customization.userEmail}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Tour Package</p>
            <p className="font-medium text-gray-900">{customization.tourPackageName}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Requested At</p>
            <p className="font-medium text-gray-900">{formatDate(customization.requestedAt)}</p>
          </div>
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-white rounded-lg p-6 shadow-md mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Itinerary Comparison</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Original */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Original Itinerary</h3>
            {customization.originalItinerary?.days?.map((day: any, dayIndex: number) => (
              <div key={dayIndex} className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Day {dayIndex + 1}</h4>
                <div className="space-y-2">
                  {day.activities?.map((activity: any, actIndex: number) => {
                    const removed = isActivityRemoved(dayIndex, actIndex, activity);
                    return (
                      <div
                        key={actIndex}
                        className={`p-3 rounded border ${
                          removed ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                        }`}
                      >
                        <div className="flex items-center">
                          <span className={removed ? 'text-red-600' : 'text-green-600'}>
                            {removed ? '❌' : '✅'}
                          </span>
                          <span className={`ml-2 ${removed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {activity.name}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1 ml-6">{activity.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Customized */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Customized Itinerary</h3>
            {customization.customizedItinerary?.days?.map((day: any, dayIndex: number) => (
              <div key={dayIndex} className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-2">Day {dayIndex + 1}</h4>
                <div className="space-y-2">
                  {day.activities?.length > 0 ? (
                    day.activities.map((activity: any, actIndex: number) => (
                      <div key={actIndex} className="p-3 rounded border bg-green-50 border-green-200">
                        <div className="flex items-center">
                          <span className="text-green-600">✅</span>
                          <span className="ml-2 text-gray-900">{activity.name}</span>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-gray-600 mt-1 ml-6">{activity.description}</p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm italic">No activities for this day</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Removed Places Summary */}
      {customization.removedPlaces && customization.removedPlaces.length > 0 && (
        <div className="bg-white rounded-lg p-6 shadow-md mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Removed Places</h2>
          <ul className="space-y-2">
            {customization.removedPlaces.map((place, index) => (
              <li key={index} className="flex items-center text-gray-700">
                <span className="text-red-500 mr-2">❌</span>
                <span>
                  {place.name || place.activity || 'Activity'} ({place.dayTitle || `Day ${place.day}`})
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* User Comments */}
      {customization.userComments && (
        <div className="bg-white rounded-lg p-6 shadow-md mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">User Comments</h2>
          <p className="text-gray-700">{customization.userComments}</p>
        </div>
      )}

      {/* Admin Actions */}
      {customization.status === 'pending_approval' && (
        <div className="bg-white rounded-lg p-6 shadow-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Admin Notes</h2>
          <textarea
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            rows={4}
            placeholder="Add your notes here..."
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
          />

          <div className="flex space-x-4">
            <button
              onClick={handleApprove}
              disabled={processing}
              className="flex-1 bg-green-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? 'Processing...' : '✅ Approve'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={processing}
              className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              ❌ Reject
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Reject Customization Request</h3>
            <p className="text-gray-700 mb-4">Please provide a reason for rejection:</p>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-lg mb-4"
              rows={4}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <div className="flex space-x-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg font-semibold hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectionReason.trim()}
                className="flex-1 bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}










