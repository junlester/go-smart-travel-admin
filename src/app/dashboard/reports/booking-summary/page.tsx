'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/configs/firebase';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Define interfaces for the data types
interface BookingData {
  status?: string;
  source?: string;
  userAgent?: string;
  createdAt?: any;
  amount?: string;
  [key: string]: any; // Allow for other properties
}

// Colors for charts
const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884D8'];

export default function BookingSummaryReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookingData, setBookingData] = useState<any>(null);
  const [dateRange, setDateRange] = useState('month'); // 'week', 'month', 'year'
  
  // Format price with commas and peso sign
  const formatPrice = (price: number): string => {
    return `₱${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };
  
  // Helper function to get date range label for chart titles
  const getDateRangeLabel = () => {
    const now = new Date();
    
    if (dateRange === 'week') {
      // Show current month name and year
      const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return monthName; // e.g., "December 2025"
    } else if (dateRange === 'month') {
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
    
    if (dateRange === 'week') {
      const monthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      return `Month: ${monthName}`;
    } else if (dateRange === 'month') {
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

  // Generate date labels based on date range
  const getDateLabels = () => {
    const labels = [];
    const now = new Date();
    
    if (dateRange === 'week') {
      // Current month's weeks (Week 1, Week 2, Week 3, Week 4)
      for (let i = 1; i <= 4; i++) {
        labels.push(`Week ${i}`);
      }
    } else if (dateRange === 'month') {
      // Last 12 months
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now);
        d.setMonth(now.getMonth() - i);
        labels.push(d.toLocaleDateString('en-US', { month: 'short' }));
      }
    } else {
      // Last 3 years
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now);
        d.setFullYear(now.getFullYear() - i);
        labels.push(d.getFullYear().toString());
      }
    }
    
    return labels;
  };
  
  // Fetch booking data from Firebase
  useEffect(() => {
    const fetchBookingData = async () => {
      try {
        setLoading(true);
        
        // Get current date and calculate date thresholds based on selected range
        const now = new Date();
        let startDate = new Date();
        
        if (dateRange === 'week') {
          // Current month
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (dateRange === 'month') {
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
        
        // Fetch all bookings within the date range
        const bookingsQuery = query(
          collection(db, 'bookings'),
          where('createdAt', '>=', startTimestamp),
          where('createdAt', '<=', endTimestamp),
          orderBy('createdAt', 'asc')
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookings = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as BookingData
        }));
        
        // Calculate total bookings
        const totalBookings = bookings.length;
        
        // Process booking statuses
        const statusCounts: {[key: string]: number} = {
          completed: 0,
          confirmed: 0,
          pending: 0,
          cancelled: 0
        };
        
        bookings.forEach(booking => {
          const status = booking.status || 'pending';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        
        const statusDistribution = Object.entries(statusCounts).map(([name, value]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1),
          value
        }));
        
        // Process booking sources - all bookings come from mobile app
        // Since we don't track source, we'll show all as Mobile App
        const sourceCounts: {[key: string]: number} = {
          'Mobile App': bookings.length
        };
        
        const sourceDistribution = Object.entries(sourceCounts).map(([name, value]) => ({
          name,
          value
        }));
        
        // Calculate completion rate - bookings with paymentStatus === 'paid'
        const completedCount = bookings.filter(b => b.paymentStatus === 'paid').length;
        const completionRate = totalBookings > 0 ? Math.round((completedCount / totalBookings) * 100) : 0;
        
        // Process bookings by date
        const dateLabels = getDateLabels();
        const bookingsByDate: {[key: string]: number} = {};
        
        // Initialize counts for each date label
        dateLabels.forEach(label => {
          bookingsByDate[label] = 0;
        });
        
        // Count bookings per date period
        bookings.forEach(booking => {
          if (!booking.createdAt) return;
          
          // Handle both Firestore Timestamp and string dates
          const bookingDate = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
          let dateLabel = '';
          
          if (dateRange === 'week') {
            // Group by week of current month
            const weekOfMonth = Math.ceil(bookingDate.getDate() / 7);
            if (weekOfMonth <= 4 && bookingDate.getMonth() === now.getMonth() && bookingDate.getFullYear() === now.getFullYear()) {
              dateLabel = `Week ${weekOfMonth}`;
            }
          } else if (dateRange === 'month') {
            // Format as month (e.g., "Jan")
            dateLabel = bookingDate.toLocaleDateString('en-US', { month: 'short' });
          } else {
            // Format as year
            dateLabel = bookingDate.getFullYear().toString();
          }
          
          if (dateLabel && dateLabels.includes(dateLabel)) {
            bookingsByDate[dateLabel] += 1;
          }
        });
        
        // Prepare data for charts
        const bookingsByDateData = dateLabels.map(label => ({
          name: label,
          bookings: bookingsByDate[label] || 0
        }));
        
        setBookingData({
          totalBookings,
          completionRate,
          statusDistribution,
          sourceDistribution,
          bookingsByDateData
        });
        
      } catch (error) {
        console.error('Error fetching booking data:', error);
        // Set fallback data if there's an error
        setBookingData({
          totalBookings: 0,
          completionRate: 0,
          statusDistribution: [],
          sourceDistribution: [],
          bookingsByDateData: []
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookingData();
  }, [dateRange]);
  
  // Function to export the report as CSV
  const exportCSV = () => {
    if (!bookingData) return;
    
    try {
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      csvContent += "Booking Summary Report\r\n\r\n";
      csvContent += "Total Bookings," + bookingData.totalBookings + "\r\n";
      csvContent += "Completion Rate," + bookingData.completionRate + "%\r\n\r\n";
      
      // Add booking status
      csvContent += "Booking Status Distribution\r\n";
      csvContent += "Status,Count\r\n";
      bookingData.statusDistribution.forEach((item: any) => {
        csvContent += `${item.name},${item.value}\r\n`;
      });
      csvContent += "\r\n";
      
      // Add booking source
      csvContent += "Booking Source Distribution\r\n";
      csvContent += "Source,Count\r\n";
      bookingData.sourceDistribution.forEach((item: any) => {
        csvContent += `${item.name},${item.value}\r\n`;
      });
      csvContent += "\r\n";
      
      // Add booking by date
      csvContent += "Bookings by Date\r\n";
      csvContent += "Date,Count\r\n";
      bookingData.bookingsByDateData.forEach((item: any) => {
        csvContent += `${item.name},${item.bookings}\r\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "booking_summary_report.csv");
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
          <h1 className="text-3xl font-semibold text-gray-900">Booking Summary Report</h1>
          <p className="text-gray-700 mt-1">Comprehensive overview of booking activities and trends</p>
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
      
      {/* Date range filter */}
      <div className="mb-8 bg-white p-4 rounded-lg border border-gray-300">
        <div className="flex items-center">
          <span className="text-gray-700 mr-4">Time Range:</span>
          <div className="flex space-x-2">
            <button 
              onClick={() => setDateRange('week')} 
              className={`px-3 py-1 rounded text-sm ${dateRange === 'week' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Weekly
            </button>
            <button 
              onClick={() => setDateRange('month')} 
              className={`px-3 py-1 rounded text-sm ${dateRange === 'month' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Monthly
            </button>
            <button 
              onClick={() => setDateRange('year')} 
              className={`px-3 py-1 rounded text-sm ${dateRange === 'year' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-700'}`}
            >
              Yearly
            </button>
          </div>
        </div>
      </div>
      
      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Statistics</h3>
          
          <div className="mb-4">
            <p className="text-gray-500 text-sm font-medium">{getDateRangeInfo()}</p>
          </div>
          
          <div className="flex flex-col space-y-4">
            <div>
              <p className="text-gray-600 text-sm">Total Bookings</p>
              <p className="text-3xl font-bold text-gray-900">{bookingData?.totalBookings}</p>
            </div>
            
            <div>
              <p className="text-gray-600 text-sm">Completion Rate</p>
              <div className="flex items-end">
                <p className="text-3xl font-bold text-green-500">{bookingData?.completionRate}%</p>
                <p className="text-gray-600 text-sm ml-2 mb-1">of all bookings</p>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Bookings by date chart */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300 mb-8">
        <div className="mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            {dateRange === 'week' 
              ? `Weekly Bookings - ${getDateRangeLabel()}`
              : dateRange === 'month'
              ? `Monthly Bookings - ${getDateRangeLabel()}`
              : `Yearly Bookings${getDateRangeLabel().includes('–') ? ` (${getDateRangeLabel()})` : ` - ${getDateRangeLabel()}`}`
            }
          </h3>
        </div>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={bookingData?.bookingsByDateData}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
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
              <Bar dataKey="bookings" name="Number of Bookings" fill="#00C49F" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 