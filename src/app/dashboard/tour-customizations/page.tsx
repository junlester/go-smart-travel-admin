'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { db } from '@/configs/firebase';
import { collection, query, getDocs, orderBy, where } from 'firebase/firestore';

interface CustomizationRequest {
  id: string;
  tourPackageId: string;
  tourPackageName: string;
  userId: string;
  userName: string;
  userEmail: string;
  status: 'pending_approval' | 'approved' | 'rejected';
  removedPlaces: Array<{ 
    name?: string; 
    activity?: string; 
    day: number | string; 
    dayTitle?: string;
    activityId?: string;
  }>;
  requestedAt: any;
  createdAt: any;
}

export default function TourCustomizationsPage() {
  const [customizations, setCustomizations] = useState<CustomizationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending_approval' | 'approved' | 'rejected'>('all');

  useEffect(() => {
    loadCustomizations();
  }, [filter]);

  const loadCustomizations = async () => {
    try {
      setLoading(true);
      console.log('Loading tour customizations with filter:', filter);
      
      let q;
      
      if (filter === 'all') {
        // Try with orderBy first, fallback to no orderBy if it fails
        try {
        q = query(collection(db, 'tour_customizations'), orderBy('createdAt', 'desc'));
        } catch (orderByError) {
          console.warn('OrderBy failed, using simple query:', orderByError);
          q = query(collection(db, 'tour_customizations'));
        }
      } else {
        // Filter by status
        q = query(
          collection(db, 'tour_customizations'),
          where('status', '==', filter)
        );
      }

      const querySnapshot = await getDocs(q);
      console.log('Query snapshot size:', querySnapshot.size);
      
      const data: CustomizationRequest[] = [];
      
      querySnapshot.forEach((doc) => {
        const docData = doc.data();
        console.log('Found customization:', doc.id, docData);
        data.push({
          id: doc.id,
          ...docData
        } as CustomizationRequest);
      });

      // Sort client-side by createdAt (most recent first)
      data.sort((a, b) => {
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 
                     a.createdAt ? new Date(a.createdAt).getTime() : 
                     a.requestedAt?.toDate ? a.requestedAt.toDate().getTime() : 0;
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 
                     b.createdAt ? new Date(b.createdAt).getTime() : 
                     b.requestedAt?.toDate ? b.requestedAt.toDate().getTime() : 0;
        return dateB - dateA; // Descending order
      });

      console.log('Loaded customizations:', data.length);
      setCustomizations(data);
    } catch (error) {
      console.error('Error loading customizations:', error);
      alert(`Error loading customizations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending_approval: 'bg-yellow-500 text-yellow-900',
      approved: 'bg-green-500 text-green-900',
      rejected: 'bg-red-500 text-red-900'
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${styles[status as keyof typeof styles] || 'bg-gray-500 text-gray-900'}`}>
        {status === 'pending_approval' ? '⏳ Pending' : status === 'approved' ? '✅ Approved' : '❌ Rejected'}
      </span>
    );
  };

  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const pendingCount = customizations.filter(c => c.status === 'pending_approval').length;
  const approvedCount = customizations.filter(c => c.status === 'approved').length;
  const rejectedCount = customizations.filter(c => c.status === 'rejected').length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">🎨 Tour Customizations</h1>
        <p className="text-gray-400">Review and manage tour package customization requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg p-4 shadow-md">
          <div className="text-2xl font-bold text-gray-900">{customizations.length}</div>
          <div className="text-sm text-gray-600">Total Requests</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 shadow-md border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-900">{pendingCount}</div>
          <div className="text-sm text-yellow-700">⏳ Pending</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 shadow-md border border-green-200">
          <div className="text-2xl font-bold text-green-900">{approvedCount}</div>
          <div className="text-sm text-green-700">✅ Approved</div>
        </div>
        <div className="bg-red-50 rounded-lg p-4 shadow-md border border-red-200">
          <div className="text-2xl font-bold text-red-900">{rejectedCount}</div>
          <div className="text-sm text-red-700">❌ Rejected</div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 bg-white rounded-lg p-4 shadow-md">
        <div className="flex space-x-2">
          {['all', 'pending_approval', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status as any)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filter === status
                  ? 'bg-green-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status === 'all' ? 'All' : status === 'pending_approval' ? 'Pending' : status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Customizations List */}
      {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : customizations.length === 0 ? (
        <div className="bg-white rounded-lg p-12 text-center shadow-md">
          <p className="text-gray-500 text-lg">No customization requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {customizations.map((customization) => (
            <div
              key={customization.id}
              className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <Link
                  href={`/dashboard/tour-customizations/${customization.id}`}
                  className="flex-1 cursor-pointer"
                >
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{customization.userName}</h3>
                    {getStatusBadge(customization.status)}
                  </div>
                  <p className="text-gray-700 mb-1">
                    <span className="font-medium">Tour:</span> {customization.tourPackageName}
                  </p>
                  <p className="text-gray-600 text-sm mb-2">
                    <span className="font-medium">Removed:</span> {customization.removedPlaces?.length || 0} place(s)
                  </p>
                  {customization.userComments && (
                    <p className="text-gray-500 text-xs italic truncate">
                      "{customization.userComments.substring(0, 50)}{customization.userComments.length > 50 ? '...' : ''}"
                    </p>
                  )}
                  <p className="text-gray-500 text-xs">
                    Requested: {formatDate(customization.requestedAt || customization.createdAt)}
                  </p>
                </Link>
                <div className="ml-4 flex items-center">
                  <Link href={`/dashboard/tour-customizations/${customization.id}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-6 w-6 text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
