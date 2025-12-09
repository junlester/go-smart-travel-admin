'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/configs/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, AreaChart, Area } from 'recharts';

// Define interfaces for the data types
interface BookingData {
  amount?: string | number;
  createdAt?: any;
  status?: string;
  paymentStatus?: string;
  type?: string;
  [key: string]: any;
}

export default function RevenueReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [revenueData, setRevenueData] = useState<any>(null);
  const [timeRange, setTimeRange] = useState('monthly'); // 'weekly', 'monthly', 'yearly'
  
  useEffect(() => {
    const fetchRevenueData = async () => {
      try {
        setLoading(true);
        
        // Get current date and calculate date thresholds based on selected range
        const now = new Date();
        let startDate = new Date();
        
        if (timeRange === 'weekly') {
          // Current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (timeRange === 'monthly') {
          // Past 12 months
          startDate.setFullYear(now.getFullYear() - 1);
          startDate.setMonth(now.getMonth());
        } else {
          // Past 3 years
          startDate.setFullYear(now.getFullYear() - 3);
        }
        
        // Convert to Firestore timestamps
        const startTimestamp = Timestamp.fromDate(startDate);
        const endTimestamp = Timestamp.fromDate(now);
        
        // Fetch all bookings within the date range
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp),
          orderBy('createdAt', 'asc')
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings = bookingsSnapshot.docs
          .map(doc => {
            const data = doc.data() as BookingData;
            return {
              id: doc.id,
              amount: parseFloat(data.amount?.toString() || '0'),
              createdAt: data.createdAt,
              status: data.status || 'pending',
              paymentStatus: data.paymentStatus || 'unpaid'
            };
          })
          .filter(booking => booking.paymentStatus === 'paid'); // Only include paid bookings
        
        // Process revenue data based on time range
        const processedData = processRevenueData(bookings, timeRange, now);
        
        // Calculate financial summary
        const currYearBookings = bookings.filter(booking => {
          if (!booking.createdAt) return false;
          // Handle both Firestore Timestamp and string dates
          const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          return bookingDate.getFullYear() === now.getFullYear();
        });
        
        const prevYearBookings = bookings.filter(booking => {
          if (!booking.createdAt) return false;
          // Handle both Firestore Timestamp and string dates
          const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          return bookingDate.getFullYear() === now.getFullYear() - 1;
        });
        
        const currYearRevenue = currYearBookings.reduce((sum, booking) => sum + booking.amount, 0);
        const prevYearRevenue = prevYearBookings.reduce((sum, booking) => sum + booking.amount, 0);
        
        // Calculate growth rate
        const growthRate = prevYearRevenue > 0 
          ? ((currYearRevenue - prevYearRevenue) / prevYearRevenue * 100) 
          : 0;
        
        // Calculate average order value (all bookings are already filtered to paid)
        const avgOrderValue = bookings.length > 0 
          ? bookings.reduce((sum, booking) => sum + booking.amount, 0) / bookings.length
          : 0;
        
        // Project annual revenue based on current year-to-date
        const dayOfYear = Math.floor(
          (now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 
          (1000 * 60 * 60 * 24)
        );
        const daysInYear = 365 + (now.getFullYear() % 4 === 0 ? 1 : 0); // Account for leap years
        const projectedAnnual = currYearRevenue / dayOfYear * daysInYear;
        
        // Format financial summary values without decimals
        const formatPrice = (price: number): string => {
          return `₱${Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
        };
        
        const financialSummary = {
          totalRevenue: formatPrice(currYearRevenue),
          growth: `${growthRate > 0 ? '+' : ''}${growthRate.toFixed(1)}%`,
          averageOrder: formatPrice(avgOrderValue),
          projectedAnnual: formatPrice(projectedAnnual)
        };
        
        setRevenueData({
          weekly: processedData.weeklyData,
          monthly: processedData.monthlyData,
          yearly: processedData.yearlyData,
          financialSummary
        });
        
      } catch (error) {
        console.error('Error fetching revenue data:', error);
        // Set fallback data if there's an error
        setRevenueData({
          weekly: [],
          monthly: [],
          yearly: [],
          financialSummary: {
            totalRevenue: '₱0',
            growth: '0%',
            averageOrder: '₱0',
            projectedAnnual: '₱0'
          }
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchRevenueData();
  }, [timeRange]);
  
  // Helper function to get date range label for chart titles
  const getDateRangeLabel = () => {
    const now = new Date();
    
    if (timeRange === 'weekly') {
      // Show current month name and year
      const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return monthName; // e.g., "December 2025"
    } else if (timeRange === 'monthly') {
      // Show current year
      return now.getFullYear().toString(); // e.g., "2025"
    } else {
      // Show year range
      const currentYear = now.getFullYear();
      const startYear = currentYear - 2; // Last 3 years
      
      if (startYear === currentYear) {
        return currentYear.toString(); // Single year
      } else {
        return `${startYear}–${currentYear}`; // Year range
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

  // Helper function to process revenue data based on time range
  const processRevenueData = (bookings: any[], timeRange: string, now: Date) => {
    const weeklyData: any[] = [];
    const monthlyData: any[] = [];
    const yearlyData: any[] = [];
    
    // Weekly data - Get current month's weeks
    if (timeRange === 'weekly') {
      for (let i = 1; i <= 4; i++) {
        const weekStart = new Date(now.getFullYear(), now.getMonth(), (i - 1) * 7 + 1);
        const weekEnd = new Date(now.getFullYear(), now.getMonth(), Math.min(i * 7, new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()));
        
        const weekBookings = bookings.filter(booking => {
          if (!booking.createdAt) return false;
          const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          return bookingDate >= weekStart && bookingDate <= weekEnd &&
                 bookingDate.getMonth() === now.getMonth() &&
                 bookingDate.getFullYear() === now.getFullYear();
        });
        
        const revenue = weekBookings.reduce((sum, booking) => sum + booking.amount, 0);
        const bookingCount = weekBookings.length;
        const avgBookingValue = bookingCount > 0 ? revenue / bookingCount : 0;
        
        weeklyData.push({
          week: `Week ${i}`,
          revenue,
          bookings: bookingCount,
          avgBookingValue
        });
      }
    }
    
    // Monthly data - Get last 12 months
    if (timeRange === 'monthly') {
      for (let i = 11; i >= 0; i--) {
        const monthDate = new Date(now);
        monthDate.setMonth(now.getMonth() - i);
        const monthKey = monthDate.toLocaleDateString('en-US', { month: 'short' });
        
        const monthBookings = bookings.filter(booking => {
          if (!booking.createdAt) return false;
          const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          return bookingDate.getMonth() === monthDate.getMonth() && 
                 bookingDate.getFullYear() === monthDate.getFullYear();
        });
        
        const revenue = monthBookings.reduce((sum, booking) => sum + booking.amount, 0);
        const bookingCount = monthBookings.length;
        const avgBookingValue = bookingCount > 0 ? revenue / bookingCount : 0;
        
        monthlyData.push({
          month: monthKey,
          revenue,
          bookings: bookingCount,
          avgBookingValue
        });
      }
    }
    
    // Yearly data - Get last 3 years
    if (timeRange === 'yearly') {
      for (let i = 2; i >= 0; i--) {
        const yearDate = new Date(now);
        yearDate.setFullYear(now.getFullYear() - i);
        
        const yearBookings = bookings.filter(booking => {
          if (!booking.createdAt) return false;
          const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          return bookingDate.getFullYear() === yearDate.getFullYear();
        });
        
        const revenue = yearBookings.reduce((sum, booking) => sum + booking.amount, 0);
        const bookingCount = yearBookings.length;
        const avgBookingValue = bookingCount > 0 ? revenue / bookingCount : 0;
        
        yearlyData.push({
          year: yearDate.getFullYear().toString(),
          revenue,
          bookings: bookingCount,
          avgBookingValue
        });
      }
    }
    
    return { weeklyData, monthlyData, yearlyData };
  };
  
  // Function to export the report as CSV
  const exportCSV = () => {
    if (!revenueData) return;
    
    try {
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      csvContent += "Revenue Report\r\n\r\n";
      
      // Add financial summary
      csvContent += "Financial Summary\r\n";
      csvContent += "Total Revenue," + revenueData.financialSummary.totalRevenue + "\r\n";
      csvContent += "Growth Rate," + revenueData.financialSummary.growth + "\r\n";
      csvContent += "Average Order Value," + revenueData.financialSummary.averageOrder + "\r\n";
      csvContent += "Projected Annual Revenue," + revenueData.financialSummary.projectedAnnual + "\r\n\r\n";
      
      // Add time-based revenue data
      const activeData = timeRange === 'weekly' ? revenueData.weekly
                        : timeRange === 'monthly' ? revenueData.monthly 
                        : revenueData.yearly;
      
      csvContent += "Revenue Over Time\r\n";
      csvContent += "Period,Revenue\r\n";
      activeData.forEach((item: any) => {
        const period = item.week || item.month || item.year;
        csvContent += `${period},${item.revenue}\r\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "revenue_report.csv");
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export report. Please try again.');
    }
  };
  
  const getChartData = () => {
    if (!revenueData) return [];
    
    switch (timeRange) {
      case 'weekly':
        return revenueData.weekly;
      case 'monthly':
        return revenueData.monthly;
      case 'yearly':
        return revenueData.yearly;
      default:
        return revenueData.monthly;
    }
  };
  
  const getDataKey = () => {
    switch (timeRange) {
      case 'weekly':
        return 'week';
      case 'monthly':
        return 'month';
      case 'yearly':
        return 'year';
      default:
        return 'month';
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
          <h1 className="text-3xl font-semibold text-gray-900">Revenue Report</h1>
          <p className="text-gray-700 mt-1">Analysis of revenue streams and financial performance</p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={exportCSV}
            className="px-4 py-2 bg-green-600 text-gray-900 rounded hover:bg-green-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-gray-900 rounded hover:bg-gray-100 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to Reports
          </button>
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
      
      {/* Financial summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <p className="text-gray-600 text-sm">Total Revenue</p>
          <p className="text-3xl font-bold text-gray-900">{revenueData?.financialSummary.totalRevenue}</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <p className="text-gray-600 text-sm">YoY Growth</p>
          <p className="text-3xl font-bold text-green-500">{revenueData?.financialSummary.growth}</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <p className="text-gray-600 text-sm">Average Order Value</p>
          <p className="text-3xl font-bold text-gray-900">{revenueData?.financialSummary.averageOrder}</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <p className="text-gray-600 text-sm">Projected Annual</p>
          <p className="text-3xl font-bold text-blue-500">{revenueData?.financialSummary.projectedAnnual}</p>
        </div>
      </div>
      
      {/* Revenue over time chart */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300 mb-8">
        <h3 className="text-lg font-medium text-gray-700 mb-4">
          {timeRange === 'weekly' 
            ? `Weekly Revenue - ${getDateRangeLabel()}`
            : timeRange === 'monthly'
            ? `Monthly Revenue - ${getDateRangeLabel()}`
            : `Yearly Revenue${getDateRangeLabel().includes('–') ? ` (${getDateRangeLabel()})` : ` - ${getDateRangeLabel()}`}`
          }
        </h3>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={getChartData()}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey={getDataKey()} 
                tick={{ fill: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis 
                tick={{ fill: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                axisLine={{ stroke: '#374151' }}
                tickFormatter={(value) => `₱${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                labelStyle={{ color: '#111827' }}
                formatter={(value: any) => [`₱${value.toLocaleString()}`, 'Revenue']}
              />
              <Legend wrapperStyle={{ color: '#374151' }} />
              <Area type="monotone" dataKey="revenue" name="Revenue" stroke="#38a169" fill="#38a16933" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Average booking value trend */}
      <div className="mb-8">
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-4">
            {timeRange === 'weekly' 
              ? `Average Booking Value - ${getDateRangeLabel()}`
              : timeRange === 'monthly'
              ? `Average Booking Value - ${getDateRangeLabel()}`
              : `Average Booking Value${getDateRangeLabel().includes('–') ? ` (${getDateRangeLabel()})` : ` - ${getDateRangeLabel()}`}`
            }
          </h3>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={getChartData()}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey={getDataKey()} 
                  tick={{ fill: '#374151' }}
                  tickLine={{ stroke: '#374151' }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis 
                  tick={{ fill: '#374151' }}
                  tickLine={{ stroke: '#374151' }}
                  axisLine={{ stroke: '#374151' }}
                  tickFormatter={(value) => `₱${value}`}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                  labelStyle={{ color: '#111827' }}
                  formatter={(value: any) => [`₱${value.toFixed(2)}`, 'Avg. Value']}
                />
                <Legend wrapperStyle={{ color: '#374151' }} />
                <Line type="monotone" dataKey="avgBookingValue" name="Avg. Booking Value" stroke="#FFBB28" strokeWidth={2} dot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
} 