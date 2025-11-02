'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/configs/firebase';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
// Commenting out unused imports or those causing linter errors
// import { useAuth } from '@/context/AuthContext';
// import { FaUsers, FaCalendarAlt, FaPlane, FaPesoSign } from 'react-icons/fa';
// import LoadingSpinner from '@/components/LoadingSpinner';
// import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';

// Re-enable needed charts for analytics
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
// Fixed Firebase Analytics imports
import { logEvent, Analytics, getAnalytics } from 'firebase/analytics';

// Declare the type of the imported analytics to avoid the TypeScript error
declare const firebaseAnalyticsImport: any; 
// Use a try-catch block to safely import the analytics module
let analyticsModule: any;
try {
  // We use require instead of import to avoid TypeScript errors
  analyticsModule = require('@/configs/firebase').analytics;
} catch (e) {
  console.warn("Firebase Analytics module could not be imported");
  analyticsModule = null;
}

// Properly initialize Firebase Analytics with type safety
const analytics: Analytics | null = typeof window !== 'undefined' && analyticsModule ? 
  analyticsModule as unknown as Analytics : null;

// Dashboard Stats Card Component - New Style matching image
const StatCard = ({ 
  title, 
  value, 
  icon, 
  percentage 
}: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  percentage?: { value: number; isPositive: boolean } | null;
}) => {
  return (
    <div className="bg-blue-50 rounded-xl p-6 border border-blue-100">
      <div className="flex items-start gap-4">
        {/* Icon in white rounded square */}
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center flex-shrink-0" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <div className="text-blue-500">
            {icon}
          </div>
        </div>
        
        {/* Title, Value, and Percentage */}
        <div className="flex-1">
          <p className="text-sm text-gray-600 mb-1">{title}</p>
          <div className="flex items-center gap-3">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {percentage !== null && percentage !== undefined && (
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                percentage.isPositive 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'bg-red-100 text-red-700'
              }`}>
                {percentage.isPositive ? '+' : '-'}{percentage.value.toFixed(2)}%
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Recent Activity Item Component
const ActivityItem = ({ title, time, description, type }: { title: string; time: string; description: string; type: string }) => (
  <div className="border-b border-gray-300 last:border-0 py-4 px-5">
    <div className="flex justify-between items-start">
      <div>
        <h4 className="font-medium text-gray-900">{title}</h4>
        <p className="text-sm text-gray-700 mt-1">{description}</p>
      </div>
      <div className="text-xs text-gray-500">{time}</div>
    </div>
    <div className="mt-2">
      <span className={`px-2 py-1 text-xs rounded-full ${
        type === 'booking' ? 'bg-green-100 text-green-800' : 
        type === 'booking_deleted' ? 'bg-red-100 text-red-800' :
        type === 'user' ? 'bg-blue-100 text-blue-800' : 
        type === 'tour' ? 'bg-purple-100 text-purple-800' : 
        'bg-gray-100 text-gray-700'
      }`}>
        {type}
      </span>
    </div>
  </div>
);

// Icons - Updated to match image style exactly
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3" />
  </svg>
);

const BookingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
  </svg>
);

const ToursIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const RevenueIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

// Format price with commas and peso sign
const formatPrice = (price: number): string => {
  return `₱${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#FF6B6B'];

export default function DashboardPage() {
  const [stats, setStats] = useState({
    userCount: '0',
    bookingCount: '0',
    tourCount: '0',
    revenue: '₱0'
  });
  const [weeklyStats, setWeeklyStats] = useState({
    users: { current: 0, previous: 0 },
    bookings: { current: 0, previous: 0 },
    tours: { current: 0, previous: 0 },
    revenue: { current: 0, previous: 0 }
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activitiesCleared, setActivitiesCleared] = useState(false);
  
  // Define proper types for recent tours and bookings
  type RecentTour = {
    id: string;
    name: string;
    location: string;
    price: number;
    createdAt: any;
  }
  
  type RecentBooking = {
    id: string;
    userName: string;
    tourName: string;
    totalAmount: number;
    status: string;
    createdAt: any;
  }
  
  const [recentTours, setRecentTours] = useState<RecentTour[]>([]);
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  
  // New state for analytics data
  const [bookingAnalytics, setBookingAnalytics] = useState<any[]>([]);
  const [regionData, setRegionData] = useState<any[]>([]);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState<any[]>([]);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  // Log page view for Analytics
  useEffect(() => {
    if (analytics) {
      try {
        logEvent(analytics, 'page_view', {
          page_title: 'Admin Dashboard',
          page_location: window.location.href,
          page_path: window.location.pathname,
        });
        
        // Log dashboard_visited custom event
        logEvent(analytics, 'dashboard_visited', {
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn("Error logging analytics event:", error);
      }
    }
  }, []);

  useEffect(() => {
    // Check if activities were cleared in localStorage
    const cleared = localStorage.getItem('activitiesCleared');
    if (cleared === 'true') {
      setActivitiesCleared(true);
    }
    
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Calculate date ranges for weekly comparison
        const now = new Date();
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() - now.getDay()); // Start of current week (Sunday)
        currentWeekStart.setHours(0, 0, 0, 0);
        
        const lastWeekStart = new Date(currentWeekStart);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        
        const lastWeekEnd = new Date(currentWeekStart);
        
        // Fetch user count - excluding admin users
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'user')
        );
        const usersSnapshot = await getDocs(usersQuery);
        const userCount = usersSnapshot.size;
        
        // Calculate weekly user counts
        let currentWeekUsers = 0;
        let previousWeekUsers = 0;
        
        usersSnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.createdAt) {
            const userDate = userData.createdAt.toDate ? userData.createdAt.toDate() : new Date(userData.createdAt);
            if (userDate >= currentWeekStart) {
              currentWeekUsers++;
            } else if (userDate >= lastWeekStart && userDate < lastWeekEnd) {
              previousWeekUsers++;
            }
          }
        });
        
        // Fetch booking count and revenue
        const allBookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const bookingCount = allBookingsSnapshot.size;
        let totalRevenue = 0;
        let currentWeekBookings = 0;
        let previousWeekBookings = 0;
        let currentWeekRevenue = 0;
        let previousWeekRevenue = 0;
        
        allBookingsSnapshot.forEach((doc) => {
          const booking = doc.data();
          const amount = booking.amount ? parseFloat(booking.amount) : 0;
          totalRevenue += amount;
          
          if (booking.createdAt) {
            const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
            if (bookingDate >= currentWeekStart) {
              currentWeekBookings++;
              currentWeekRevenue += amount;
            } else if (bookingDate >= lastWeekStart && bookingDate < lastWeekEnd) {
              previousWeekBookings++;
              previousWeekRevenue += amount;
            }
          }
        });
        
        // Fetch tour count
        const allToursSnapshot = await getDocs(collection(db, 'tours'));
        const tourCount = allToursSnapshot.size;
        
        // Update stats with formatted revenue (with commas)
        setStats({
          userCount: userCount.toString(),
          bookingCount: bookingCount.toString(),
          tourCount: tourCount.toString(),
          revenue: formatPrice(totalRevenue)
        });
        
        // Update weekly comparison stats
        setWeeklyStats({
          users: { current: currentWeekUsers, previous: previousWeekUsers },
          bookings: { current: currentWeekBookings, previous: previousWeekBookings },
          tours: { current: 0, previous: 0 }, // Not used for percentage
          revenue: { current: currentWeekRevenue, previous: previousWeekRevenue }
        });
        
        // Only fetch activities if they haven't been cleared
        if (cleared !== 'true') {
          // Fetch recent activities
          const activitiesQuery = query(
            collection(db, 'activities'),
            orderBy('timestamp', 'desc'),
            limit(5)
          );
          
          const activitiesSnapshot = await getDocs(activitiesQuery);
          const activities = activitiesSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              title: data.title || 'Activity',
              description: data.description || 'No description',
              time: formatTimestamp(data.timestamp),
              type: data.type || 'general'
            };
          });
          
          setRecentActivity(activities);

          // Fetch recent tours
          const toursQuery = query(
            collection(db, 'tours'),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const recentToursSnapshot = await getDocs(toursQuery);
          const recentToursList = recentToursSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              name: data.name || 'Untitled Tour',
              location: data.location || 'Unknown Location',
              price: data.price || 0,
              createdAt: data.createdAt
            };
          });
          setRecentTours(recentToursList);

          // Fetch recent bookings
          const bookingsQuery = query(
            collection(db, 'bookings'),
            orderBy('createdAt', 'desc'),
            limit(5)
          );
          const recentBookingsSnapshot = await getDocs(bookingsQuery);
          const recentBookingsList = recentBookingsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              userName: data.userName || 'Unknown User',
              tourName: data.tourName || 'Untitled Tour',
              totalAmount: data.totalAmount || 0,
              status: data.status || 'Pending',
              createdAt: data.createdAt
            };
          });
          setRecentBookings(recentBookingsList);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        // Use default data if there's an error
        setStats({
          userCount: '0',
          bookingCount: '0',
          tourCount: '0',
          revenue: '₱0'
        });
        if (cleared !== 'true') {
          setRecentActivity([]);
          setRecentTours([]);
          setRecentBookings([]);
        }
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Function to format Firestore timestamp
  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown time';
    
    try {
      // Convert to JS Date if it's a Firestore timestamp
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);
      const diffHour = Math.floor(diffMin / 60);
      const diffDay = Math.floor(diffHour / 24);
      
      if (diffSec < 60) return `${diffSec} seconds ago`;
      if (diffMin < 60) return `${diffMin} minutes ago`;
      if (diffHour < 24) return `${diffHour} hours ago`;
      if (diffDay < 7) return `${diffDay} days ago`;
      
      return date.toLocaleDateString();
    } catch (error) {
      console.error('Error formatting timestamp:', error);
      return 'Unknown time';
    }
  };

  // Calculate percentage changes from real data
  const calculatePercentage = (current: number, previous: number): { value: number; isPositive: boolean } | null => {
    if (previous === 0) {
      if (current === 0) return null;
      return { value: 100, isPositive: true };
    }
    const change = ((current - previous) / previous) * 100;
    return { value: Math.abs(change), isPositive: change >= 0 };
  };

  const statsCards = [
    { 
      title: 'Total Users', 
      value: stats.userCount, 
      icon: <UsersIcon />, 
      percentage: calculatePercentage(weeklyStats.users.current, weeklyStats.users.previous)
    },
    { 
      title: 'Total Bookings', 
      value: stats.bookingCount, 
      icon: <BookingsIcon />, 
      percentage: calculatePercentage(weeklyStats.bookings.current, weeklyStats.bookings.previous)
    },
    { 
      title: 'Active Tours', 
      value: stats.tourCount, 
      icon: <ToursIcon />, 
      percentage: null // No percentage for Active Tours as requested
    },
    { 
      title: 'Total Revenue', 
      value: stats.revenue, 
      icon: <RevenueIcon />, 
      percentage: calculatePercentage(weeklyStats.revenue.current, weeklyStats.revenue.previous)
    },
  ];

  // New function to fetch analytics data
  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        setAnalyticsLoading(true);
         
        // Log analytics_data_fetch event
        if (analytics) {
          try {
            logEvent(analytics, 'analytics_data_fetch', {
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.warn("Error logging analytics event:", error);
          }
        }
        
        // Fetch booking data first to analyze destinations
        const bookingsQuery = query(
          collection(db, 'bookings'),
          orderBy('createdAt', 'desc')
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        // For top destinations chart (now using actual bookings)
        const destinationsCount: Record<string, number> = {};
        
        // For categories and customer data
        const categoriesCount: Record<string, number> = {};
        
        // For customer profiling based on age groups
        type CustomerData = {
          ageGroup: string;
          count: number;
        };
        
        // Updated customer data type for age and gender
        type CustomerSegmentData = {
          segment: string; // Format: "Age Group - Gender"
          count: number;
        };
        
        const ageGroups: Record<string, CustomerData> = {
          'Young Adults (18-25)': { ageGroup: 'Young Adults (18-25)', count: 0 },
          'Adults (26-40)': { ageGroup: 'Adults (26-40)', count: 0 },
          'Middle-aged (41-55)': { ageGroup: 'Middle-aged (41-55)', count: 0 },
          'Seniors (56+)': { ageGroup: 'Seniors (56+)', count: 0 },
          'Minors (<18)': { ageGroup: 'Minors (<18)', count: 0 },
        };
        
        // New gender segmentation structure
        const genderSegments: Record<string, number> = {
          'Male': 0,
          'Female': 0,
          'Other': 0,
          'Unspecified': 0
        };
        
        // Combined age and gender segments
        const customerSegments: Record<string, number> = {};
        
        // Monthly data for revenue and bookings count
        const monthlyRevenueData: Record<string, number> = {};
        const monthlyBookingsData: Record<string, number> = {};
        
        const today = new Date();
        const twelveMonthsAgo = new Date(today);
        twelveMonthsAgo.setMonth(today.getMonth() - 12);
        
        // Initialize past 12 months
        for (let i = 0; i <= 11; i++) {
          const month = new Date(today);
          month.setMonth(today.getMonth() - i);
          const monthKey = month.toLocaleDateString('en-US', { month: 'short' });
          
          monthlyRevenueData[monthKey] = 0;
          monthlyBookingsData[monthKey] = 0;
        }
        
        // Track users by ID to avoid counting duplicate users
        const processedUserIds = new Set<string>();
        
        // Process bookings for destination and monthly data
        bookingsSnapshot.forEach((doc) => {
          const booking = doc.data();
          
          // Track destinations from bookings
          if (booking.tourLocation || booking.location) {
            const destination = booking.tourLocation || booking.location;
            if (destination) {
              if (destinationsCount[destination]) {
                destinationsCount[destination]++;
              } else {
                destinationsCount[destination] = 1;
              }
            }
          } else if (booking.tourName) {
            // If no location directly provided but we have a tourName, use it as fallback
            if (destinationsCount[booking.tourName]) {
              destinationsCount[booking.tourName]++;
            } else {
              destinationsCount[booking.tourName] = 1;
            }
          }
          
          if (booking.createdAt && booking.amount) {
            const bookingDate = booking.createdAt.toDate();
            
            // Only include past 12 months
            if (bookingDate >= twelveMonthsAgo) {
              const monthKey = bookingDate.toLocaleDateString('en-US', { month: 'short' });
              
              // Add to monthly revenue
              if (monthlyRevenueData[monthKey] !== undefined) {
                monthlyRevenueData[monthKey] += parseFloat(booking.amount);
              }
              
              // Count bookings per month
              if (monthlyBookingsData[monthKey] !== undefined) {
                monthlyBookingsData[monthKey]++;
              }
            }
            
            // Save userId for later user data processing if available
            if (booking.userId) {
              processedUserIds.add(booking.userId);
            }
          }
        });
        
        // Now fetch users to get actual age data
        const usersQuery = query(
          collection(db, 'users'),
          where('role', '==', 'user')
        );
        
        const usersSnapshot = await getDocs(usersQuery);
        
        // Process users for age and gender distribution
        usersSnapshot.forEach((doc) => {
          const user = doc.data();
          
          // Count all users, not just those who made bookings
          // Remove the booking filter
          if (user.age || user.birthdate) {
            let age = user.age;
            
            // Calculate age from birthdate if age not directly provided
            if (!age && user.birthdate) {
              try {
                const birthdate = user.birthdate.toDate ? user.birthdate.toDate() : new Date(user.birthdate);
                const ageDate = new Date(Date.now() - birthdate.getTime());
                age = Math.abs(ageDate.getUTCFullYear() - 1970);
              } catch (error) {
                console.warn("Error calculating age from birthdate:", error);
              }
            }
            
            // Get user's gender, default to "Unspecified" if not provided
            const gender = user.gender || 'Unspecified';
            
            // Count gender separately
            if (genderSegments[gender] !== undefined) {
              genderSegments[gender]++;
            } else {
              genderSegments['Unspecified']++;
            }
            
            // Categorize by age group
            let ageGroup = 'Unspecified';
            if (age) {
              if (age < 18) {
                ageGroup = 'Minors (<18)';
                ageGroups['Minors (<18)'].count++;
              } else if (age >= 18 && age <= 25) {
                ageGroup = 'Young Adults (18-25)';
                ageGroups['Young Adults (18-25)'].count++;
              } else if (age > 25 && age <= 40) {
                ageGroup = 'Adults (26-40)';
                ageGroups['Adults (26-40)'].count++;
              } else if (age > 40 && age <= 55) {
                ageGroup = 'Middle-aged (41-55)';
                ageGroups['Middle-aged (41-55)'].count++;
              } else if (age > 55) {
                ageGroup = 'Seniors (56+)';
                ageGroups['Seniors (56+)'].count++;
              }
            }
            
            // Create combined age-gender segment
            const segmentKey = `${ageGroup} - ${gender}`;
            if (customerSegments[segmentKey]) {
              customerSegments[segmentKey]++;
            } else {
              customerSegments[segmentKey] = 1;
            }
          } else {
            // If no age data, still count gender if available
            const gender = user.gender || 'Unspecified';
            if (genderSegments[gender] !== undefined) {
              genderSegments[gender]++;
            } else {
              genderSegments['Unspecified']++;
            }
            
            // Create segment for unspecified age but known gender
            const segmentKey = `Unspecified Age - ${gender}`;
            if (customerSegments[segmentKey]) {
              customerSegments[segmentKey]++;
            } else {
              customerSegments[segmentKey] = 1;
            }
          }
        });
        
        // Now get categories from tours
        const toursQuery = query(collection(db, 'tours'));
        const toursSnapshot = await getDocs(toursQuery);
        
        toursSnapshot.forEach((doc) => {
          const tour = doc.data();
          
          // Count by category
          if (tour.category) {
            if (categoriesCount[tour.category]) {
              categoriesCount[tour.category]++;
            } else {
              categoriesCount[tour.category] = 1;
            }
          }
        });
        
        // Sort and get top destinations based on actual bookings
        const sortedDestinations = Object.entries(destinationsCount)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5) // Take top 5 destinations
          .map(([name, value]) => ({ name, value }));
        
        const categoriesData = Object.keys(categoriesCount).map(category => ({
          name: category,
          count: categoriesCount[category]
        }));
        
        // Create customer segments data for the customer profiling chart
        const customerSegmentsData = Object.entries(customerSegments)
          .filter(([_, count]) => count > 0) // Filter out zero counts
          .map(([segment, count]) => ({
            name: segment,
            value: count
          }))
          .sort((a, b) => b.value - a.value) // Sort by count in descending order
          .slice(0, 8); // Take top 8 segments to keep chart readable
        
        setRegionData(sortedDestinations);
        setCategoryData(customerSegmentsData); // We're now using the combined age-gender data
        
        // Find peak booking months (sort by number of bookings)
        const peakMonths = Object.entries(monthlyBookingsData)
          .map(([month, bookings]) => ({ month, bookings }))
          .sort((a, b) => b.bookings - a.bookings); // Sort in descending order
        
        // Convert to chart data arrays
        const revenueData = Object.keys(monthlyRevenueData).map(month => ({
          month,
          revenue: monthlyRevenueData[month]
        })).reverse();
        
        setMonthlyRevenue(revenueData);
        setBookingAnalytics(peakMonths);
        
        // Log analytics data loaded event
        if (analytics) {
          try {
            logEvent(analytics, 'analytics_data_loaded', {
              top_destination: sortedDestinations.length > 0 ? sortedDestinations[0].name : 'None',
              peak_month: peakMonths.length > 0 ? peakMonths[0].month : 'None',
              data_points: bookingsSnapshot.size
            });
          } catch (error) {
            console.warn("Error logging analytics event:", error);
          }
        }
        
      } catch (error) {
        console.error('Error fetching analytics data:', error);
         
        // Log error event
        if (analytics) {
          try {
            logEvent(analytics, 'analytics_error', {
              error_message: error instanceof Error ? error.message : 'Unknown error',
              timestamp: new Date().toISOString()
            });
          } catch (loggingError) {
            console.warn("Error logging analytics error event:", loggingError);
          }
        }
      } finally {
        setAnalyticsLoading(false);
      }
    };
    
    fetchAnalyticsData();
  }, []);

  // Function to clear all recent activities
  const clearRecentActivities = async () => {
    try {
      if (window.confirm('Are you sure you want to clear all recent activities? This will only clear the display and not delete data from the database.')) {
        setRecentActivity([]);
        setRecentTours([]);
        setRecentBookings([]);
        setActivitiesCleared(true);
        
        // Save to localStorage so it persists across refreshes
        localStorage.setItem('activitiesCleared', 'true');
        
        // Log clear_activities event
        if (analytics) {
          try {
            logEvent(analytics, 'clear_activities', {
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.warn("Error logging analytics event:", error);
          }
        }
      }
    } catch (error) {
      console.error('Error clearing recent activities:', error);
    }
  };
  
  // Function to restore recent activities
  const restoreRecentActivities = async () => {
    try {
      setActivitiesCleared(false);
      localStorage.removeItem('activitiesCleared');
      
      // Refresh the page to fetch activities again
      window.location.reload();
    } catch (error) {
      console.error('Error restoring recent activities:', error);
    }
  };

  // Analytics event trackers for chart interactions
  const handleChartClick = (chartName: string, data: any) => {
    if (analytics) {
      try {
        logEvent(analytics, 'chart_interaction', {
          chart_name: chartName,
          data_point: JSON.stringify(data),
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.warn("Error logging chart interaction:", error);
      }
    }
  };

  if (loading && analyticsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-900 mb-8">Dashboard</h1>
      
      <div className="mt-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statsCards.map((stat, index) => (
            <StatCard 
              key={index}
              title={stat.title}
              value={stat.value}
              icon={stat.icon}
              percentage={stat.percentage}
            />
          ))}
        </div>
      </div>
      
      {/* Analytics Section */}
      <div className="mt-12">
        <h2 className="text-2xl font-semibold text-gray-900 mb-6">Analytics</h2>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Monthly Revenue Chart */}
          <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Monthly Revenue</h3>
            {analyticsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyRevenue}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    onClick={(data) => handleChartClick('Monthly Revenue', data)}
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
                      tickFormatter={(value: number) => `₱${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                      formatter={(value: any) => [`₱${value.toLocaleString()}`, 'Revenue']}
                      labelStyle={{ color: '#111827' }}
                    />
                    <Legend wrapperStyle={{ color: '#374151' }} />
                    <Bar dataKey="revenue" name="Revenue" fill="#38a169" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Peak Booking Months Chart */}
          <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Peak Booking Months</h3>
            {analyticsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={bookingAnalytics}
                    margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    onClick={(data) => handleChartClick('Peak Booking Months', data)}
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
                    <Legend wrapperStyle={{ color: '#ccc' }} />
                    <Bar dataKey="bookings" name="Bookings" fill="#4299e1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Top Destinations Chart */}
          <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Top Destinations</h3>
            {analyticsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-yellow-500"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={regionData}
                    layout="vertical"
                    margin={{ top: 20, right: 30, left: 80, bottom: 20 }}
                    onClick={(data) => handleChartClick('Top Destinations', data)}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      tick={{ fill: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                      axisLine={{ stroke: '#374151' }}
                      tickFormatter={(value: number) => Math.floor(value).toString()}
                      domain={[0, 'dataMax']}
                      ticks={[0, 0.5, 1, 1.5, 2]}
                      allowDecimals={false}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name" 
                      tick={{ fill: '#374151' }}
                      tickLine={{ stroke: '#374151' }}
                      axisLine={{ stroke: '#374151' }}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                      formatter={(value: number) => [Math.floor(value).toString(), 'Number of Bookings']}
                      labelStyle={{ color: '#111827' }}
                    />
                    <Legend wrapperStyle={{ color: '#ccc' }} />
                    <Bar dataKey="value" name="Number of Bookings" fill="#F59E0B" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          
          {/* Customer Profiling Chart */}
          <div className="bg-white rounded-lg shadow-md border border-gray-300 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Customer Profiling by Age & Gender</h3>
            {analyticsLoading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
              </div>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart onClick={(data) => handleChartClick('Customer Profiling', data)}>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }: { name: string; percent: number }) => 
                        percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''
                      }
                      labelLine={false}
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                      formatter={(value: any, name: string) => [value, `Customers: ${name}`]}
                      labelStyle={{ color: '#111827' }}
                    />
                    <Legend 
                      layout="vertical" 
                      verticalAlign="middle" 
                      align="right"
                      wrapperStyle={{ color: '#374151', fontSize: '12px' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Recent Activity</h2>
          {activitiesCleared ? (
            <button 
              onClick={restoreRecentActivities}
              className="bg-green-600 hover:bg-green-700 text-gray-900 text-sm px-3 py-2 rounded-md transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Restore Activities
            </button>
          ) : recentActivity.length > 0 && (
            <button 
              onClick={clearRecentActivities}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm px-3 py-2 rounded-md transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Clear All
            </button>
          )}
        </div>
        <div className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden">
          {recentActivity.length > 0 ? (
            recentActivity.map((activity, index) => (
              <ActivityItem 
                key={index}
                title={activity.title}
                time={activity.time}
                description={activity.description}
                type={activity.type}
              />
            ))
          ) : (
            <div className="py-6 px-5 text-center text-gray-700">
              {activitiesCleared ? 'Recent activities have been cleared' : 'No recent activity found'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 

// Helper function to get status color
const getStatusColor = (status: string): string => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'text-green-400';
    case 'pending':
      return 'text-yellow-400';
    case 'cancelled':
      return 'text-red-400';
    default:
      return 'text-gray-700';
  }
}; 