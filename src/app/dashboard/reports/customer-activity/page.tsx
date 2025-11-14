'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/configs/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

// Define interfaces for the data types
interface UserData {
  createdAt?: any;
  [key: string]: any;
}

interface ActivityData {
  timestamp?: any;
  userId?: string;
  featureName?: string;
  type?: string;
  [key: string]: any;
}

export default function CustomerActivityReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [activityData, setActivityData] = useState<any>(null);
  
  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        setLoading(true);
        
        // Get current date for date calculations
        const now = new Date();
        const sixMonthsAgo = new Date(now);
        sixMonthsAgo.setMonth(now.getMonth() - 6);
        
        // Convert to Firestore timestamps
        const startTimestamp = Timestamp.fromDate(sixMonthsAgo);
        const endTimestamp = Timestamp.fromDate(now);

        // 1. Fetch user activity data
        const usersQuery = query(
          collection(db, 'users'),
          where('createdAt', '>=', startTimestamp),
          orderBy('createdAt', 'asc')
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        const users = usersSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as UserData
        }));
        
        // Process user data by month
        const monthlyUserData: {[key: string]: {activeUsers: number, newUsers: number}} = {};
        
        // Initialize with the past 6 months
        for (let i = 5; i >= 0; i--) {
          const d = new Date(now);
          d.setMonth(now.getMonth() - i);
          const monthKey = d.toLocaleDateString('en-US', { month: 'short' });
          monthlyUserData[monthKey] = { activeUsers: 0, newUsers: 0 };
        }
        
        // Count new users per month
        users.forEach(user => {
          if (user.createdAt) {
            // Handle both Firestore Timestamp and string dates
            const userDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
            const monthKey = userDate.toLocaleDateString('en-US', { month: 'short' });
            
            if (monthlyUserData[monthKey]) {
              monthlyUserData[monthKey].newUsers += 1;
            }
          }
        });
        
        // 2. Fetch bookings to determine active users (users who made bookings)
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('createdAt', '>=', startTimestamp),
          orderBy('createdAt', 'asc')
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        // Count active users (users who made bookings) per month
        const activeUserIds = new Set<string>();
        const monthlyActiveUsers: {[key: string]: Set<string>} = {};
        
        // Initialize monthly active users sets
        Object.keys(monthlyUserData).forEach(month => {
          monthlyActiveUsers[month] = new Set<string>();
        });
        
        bookings.forEach(booking => {
          if (booking.createdAt && booking.userId) {
            // Handle both Firestore Timestamp and string dates
            const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
            const monthKey = bookingDate.toLocaleDateString('en-US', { month: 'short' });
            
            if (monthlyUserData[monthKey]) {
              activeUserIds.add(booking.userId);
              monthlyActiveUsers[monthKey].add(booking.userId);
              monthlyUserData[monthKey].activeUsers = monthlyActiveUsers[monthKey].size;
            }
          }
        });
        
        // Create array format for the chart
        const userEngagement = Object.entries(monthlyUserData).map(([month, data]) => ({
          month,
          activeUsers: data.activeUsers, 
          newUsers: data.newUsers
        }));
        
        // 3. Calculate feature usage based on bookings and tour customizations
        // Fetch tour customizations to count customization requests
        const customizationsSnapshot = await getDocs(collection(db, 'tour_customizations'));
        const customizations = customizationsSnapshot.docs.map(doc => doc.data());
        
        // Count feature usage based on actual app usage
        const featureCount: {[key: string]: number} = {
          'Tour Bookings': bookings.length,
          'Tour Customizations': customizations.length,
          'Itinerary Planning': 0, // Not directly trackable
          'Destination Search': 0, // Not directly trackable
          'Reviews': 0 // Not directly trackable
        };
        
        // Calculate total feature usage for percentage
        const totalFeatureUsage = Object.values(featureCount).reduce((sum, count) => sum + count, 0);
        
        // Convert to percentage
        const featureUsage = Object.entries(featureCount)
          .filter(([_, count]) => count > 0) // Only show features with usage
          .map(([feature, count]) => ({
            feature,
            usage: totalFeatureUsage > 0 ? Math.round((count / totalFeatureUsage) * 100) : 0
          }));
        
        // 4. Calculate retention metrics based on bookings
        // Get all users who have made at least one booking
        const totalActiveUsers = activeUserIds.size;
        
        // Get users who have made more than one booking (returning customers)
        const userBookingCounts: {[key: string]: number} = {};
        
        bookings.forEach(booking => {
          if (booking.userId) {
            userBookingCounts[booking.userId] = (userBookingCounts[booking.userId] || 0) + 1;
          }
        });
        
        const returningUsers = Object.values(userBookingCounts).filter(count => count > 1).length;
        
        const userRetention = {
          total: usersSnapshot.size,
          returning: returningUsers,
          retentionRate: usersSnapshot.size > 0 ? 
            `${Math.round((returningUsers / usersSnapshot.size) * 100)}%` : '0%'
        };
        
        // Set all data in state
        setActivityData({
          userEngagement,
          featureUsage,
          userRetention
        });
      } catch (error) {
        console.error('Error fetching activity data:', error);
        // Set fallback data
        setActivityData({
          userEngagement: [],
          featureUsage: [],
          userRetention: {
            total: 0,
            returning: 0,
            retentionRate: '0%'
          }
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchActivityData();
  }, []);
  
  // Function to export the report as CSV
  const exportCSV = () => {
    if (!activityData) return;
    
    try {
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      csvContent += "Customer Activity Report\r\n\r\n";
      
      // Add user retention data
      csvContent += "User Retention Overview\r\n";
      csvContent += "Total Users," + activityData.userRetention.total + "\r\n";
      csvContent += "Returning Users," + activityData.userRetention.returning + "\r\n";
      csvContent += "Retention Rate," + activityData.userRetention.retentionRate + "\r\n\r\n";
      
      // Add monthly user engagement data
      csvContent += "Monthly User Engagement\r\n";
      csvContent += "Month,Active Users,New Users\r\n";
      activityData.userEngagement.forEach((item: any) => {
        csvContent += `${item.month},${item.activeUsers},${item.newUsers}\r\n`;
      });
      csvContent += "\r\n";
      
      // Add feature usage data
      csvContent += "Feature Usage\r\n";
      csvContent += "Feature,Usage Percentage\r\n";
      activityData.featureUsage.forEach((item: any) => {
        csvContent += `${item.feature},${item.usage}%\r\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "customer_activity_report.csv");
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export report. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Customer Activity Report</h1>
          <p className="text-gray-700 mt-1">Analysis of user engagement and behavior patterns</p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={exportCSV}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to Reports
          </button>
        </div>
      </div>
      
      {/* User Retention Stats */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">User Retention Overview</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600 text-sm">Total Users</p>
            <p className="text-3xl font-bold text-gray-900">{activityData.userRetention.total}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600 text-sm">Returning Users</p>
            <p className="text-3xl font-bold text-green-500">{activityData.userRetention.returning}</p>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-gray-600 text-sm">Retention Rate</p>
            <p className="text-3xl font-bold text-blue-500">{activityData.userRetention.retentionRate}</p>
          </div>
        </div>
      </div>
      
      {/* User Engagement Chart */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Monthly User Engagement</h3>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activityData.userEngagement}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis 
                tick={{ fill: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                axisLine={{ stroke: '#374151' }}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                labelStyle={{ color: '#111827' }}
              />
              <Legend wrapperStyle={{ color: '#374151' }} />
              <Line type="monotone" dataKey="activeUsers" name="Active Users" stroke="#00C49F" strokeWidth={2} activeDot={{ r: 8 }} />
              <Line type="monotone" dataKey="newUsers" name="New Users" stroke="#0088FE" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Feature Usage Chart */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Feature Usage (% of Users)</h3>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={activityData.featureUsage}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              layout="vertical"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
              <XAxis 
                type="number"
                tick={{ fill: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                axisLine={{ stroke: '#374151' }}
                domain={[0, 100]}
              />
              <YAxis 
                dataKey="feature"
                type="category"
                tick={{ fill: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                axisLine={{ stroke: '#374151' }}
                width={150}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                labelStyle={{ color: '#111827' }}
                formatter={(value) => [`${value}%`, 'Usage']}
              />
              <Legend wrapperStyle={{ color: '#374151' }} />
              <Bar dataKey="usage" name="Feature Usage %" fill="#8884d8" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 