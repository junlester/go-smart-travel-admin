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
  const [timeRange, setTimeRange] = useState('monthly'); // 'weekly', 'monthly', 'yearly'
  
  // Helper function to get date range label for chart titles
  const getDateRangeLabel = () => {
    const now = new Date();
    
    if (timeRange === 'weekly') {
      const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return monthName;
    } else if (timeRange === 'monthly') {
      return now.getFullYear().toString();
    } else {
      const currentYear = now.getFullYear();
      const startYear = currentYear - 2;
      
      if (startYear === currentYear) {
        return currentYear.toString();
      } else {
        return `${startYear}–${currentYear}`;
      }
    }
  };

  // Helper function to get date range info for statistics
  const getDateRangeInfo = () => {
    const now = new Date();
    
    if (timeRange === 'weekly') {
      const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `Month: ${monthName}`;
    } else if (timeRange === 'monthly') {
      return `Year: ${now.getFullYear()}`;
    } else {
      const currentYear = now.getFullYear();
      const startYear = currentYear - 2;
      
      if (startYear === currentYear) {
        return `Year: ${currentYear}`;
      } else {
        return `Years: ${startYear}–${currentYear}`;
      }
    }
  };
  
  useEffect(() => {
    const fetchActivityData = async () => {
      try {
        setLoading(true);
        
        // Get current date for date calculations
        const now = new Date();
        let startDate = new Date();
        
        if (timeRange === 'weekly') {
          // Current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (timeRange === 'monthly') {
          // Last 12 months
          startDate.setFullYear(now.getFullYear() - 1);
          startDate.setMonth(now.getMonth());
        } else {
          // Last 3 years
          startDate.setFullYear(now.getFullYear() - 3);
        }
        
        // Convert to Firestore timestamps
        const startTimestamp = Timestamp.fromDate(startDate);
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
        
        // Process user data by time period
        const periodUserData: {[key: string]: {activeUsers: number, newUsers: number}} = {};
        
        if (timeRange === 'weekly') {
          // Initialize with current month's weeks
          for (let i = 1; i <= 4; i++) {
            periodUserData[`Week ${i}`] = { activeUsers: 0, newUsers: 0 };
          }
        } else if (timeRange === 'monthly') {
          // Initialize with the past 12 months
          for (let i = 11; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(now.getMonth() - i);
            const monthKey = d.toLocaleDateString('en-US', { month: 'short' });
            periodUserData[monthKey] = { activeUsers: 0, newUsers: 0 };
          }
        } else {
          // Initialize with the past 3 years
          for (let i = 2; i >= 0; i--) {
            const d = new Date(now);
            d.setFullYear(now.getFullYear() - i);
            periodUserData[d.getFullYear().toString()] = { activeUsers: 0, newUsers: 0 };
          }
        }
        
        // Count new users per period
        users.forEach(user => {
          if (user.createdAt) {
            const userDate = user.createdAt.toDate ? user.createdAt.toDate() : new Date(user.createdAt);
            let periodKey = '';
            
            if (timeRange === 'weekly') {
              const weekOfMonth = Math.ceil(userDate.getDate() / 7);
              if (weekOfMonth <= 4 && userDate.getMonth() === now.getMonth() && userDate.getFullYear() === now.getFullYear()) {
                periodKey = `Week ${weekOfMonth}`;
              }
            } else if (timeRange === 'monthly') {
              periodKey = userDate.toLocaleDateString('en-US', { month: 'short' });
            } else {
              periodKey = userDate.getFullYear().toString();
            }
            
            if (periodKey && periodUserData[periodKey]) {
              periodUserData[periodKey].newUsers += 1;
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
        
        // Initialize period active users sets
        Object.keys(periodUserData).forEach(period => {
          monthlyActiveUsers[period] = new Set<string>();
        });
        
        bookings.forEach(booking => {
          if (booking.createdAt && booking.userId) {
            const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
            let periodKey = '';
            
            if (timeRange === 'weekly') {
              const weekOfMonth = Math.ceil(bookingDate.getDate() / 7);
              if (weekOfMonth <= 4 && bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()) {
                periodKey = `Week ${weekOfMonth}`;
              }
            } else if (timeRange === 'monthly') {
              periodKey = bookingDate.toLocaleDateString('en-US', { month: 'short' });
            } else {
              periodKey = bookingDate.getFullYear().toString();
            }
            
            if (periodKey && periodUserData[periodKey]) {
              activeUserIds.add(booking.userId);
              monthlyActiveUsers[periodKey].add(booking.userId);
              periodUserData[periodKey].activeUsers = monthlyActiveUsers[periodKey].size;
            }
          }
        });
        
        // Create array format for the chart
        const userEngagement = Object.entries(periodUserData).map(([period, data]) => ({
          period,
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
  }, [timeRange]);
  
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
      
      {/* Time range filter */}
      <div className="mb-8 bg-white p-4 rounded-lg border border-gray-300">
        <div className="flex items-center">
          <span className="text-gray-700 mr-4">Time Range:</span>
          <div className="flex space-x-2">
            <button 
              onClick={() => setTimeRange('weekly')} 
              className={`px-3 py-1 rounded text-sm ${timeRange === 'weekly' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Weekly
            </button>
            <button 
              onClick={() => setTimeRange('monthly')} 
              className={`px-3 py-1 rounded text-sm ${timeRange === 'monthly' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setTimeRange('yearly')} 
              className={`px-3 py-1 rounded text-sm ${timeRange === 'yearly' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>
      
      {/* Date range info */}
      <div className="mb-6 bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
        <p className="text-blue-700 text-sm font-medium">{getDateRangeInfo()}</p>
      </div>

      {/* User Engagement Chart */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300 mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          {timeRange === 'weekly' 
            ? `Weekly User Engagement - ${getDateRangeLabel()}`
            : timeRange === 'monthly'
            ? `Monthly User Engagement - ${getDateRangeLabel()}`
            : `Yearly User Engagement${getDateRangeLabel().includes('–') ? ` (${getDateRangeLabel()})` : ` - ${getDateRangeLabel()}`}`
          }
        </h3>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={activityData.userEngagement}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="period" 
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