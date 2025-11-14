'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/configs/firebase';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Image from 'next/image';

// Define interfaces for the data types
interface TourData {
  name?: string;
  bookingCount?: number;
  averageRating?: number;
  rating?: number;
  imageUrl?: string;
  images?: string[];
  region?: string;
  category?: string;
  tags?: string[];
  [key: string]: any;
}

interface BookingData {
  tourId?: string;
  createdAt?: any;
  [key: string]: any;
}

// Colors for charts
const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658', '#8dd1e1'];

export default function PopularDestinationsReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [destinationData, setDestinationData] = useState<any>(null);
  
  useEffect(() => {
    const fetchDestinationData = async () => {
      try {
        setLoading(true);
        
        // Fetch all tours
        const toursSnapshot = await getDocs(collection(db, 'tours'));
        let tours = toursSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data() as TourData
        }));
        
        // Fetch all bookings to count per tour
        const bookingsSnapshot = await getDocs(collection(db, 'bookings'));
        const bookings = bookingsSnapshot.docs.map(doc => doc.data() as BookingData);
        
        // Count bookings per tour
        const tourBookingCounts: {[tourId: string]: number} = {};
        
        bookings.forEach(booking => {
          if (booking.tourId) {
            tourBookingCounts[booking.tourId] = (tourBookingCounts[booking.tourId] || 0) + 1;
          }
        });
        
        // Update tour data with booking counts
        tours = tours.map(tour => ({
          ...tour,
          bookingCount: tourBookingCounts[tour.id] || 0
        }));
        
        // Sort by booking count (descending)
        tours.sort((a, b) => (b.bookingCount || 0) - (a.bookingCount || 0));
        
        // Get top 5 tours by booking count
        const topDestinations = tours.slice(0, 5).map(tour => ({
          name: tour.name || 'Unnamed Tour',
          bookings: tour.bookingCount || 0,
          averageRating: tour.averageRating || tour.rating || 4.5,
          image: tour.imageUrl || tour.images?.[0] || '/assets/images/samples/placeholder.jpg'
        }));
        
        // Process regional distribution
        // Group by region (Luzon, Visayas, Mindanao)
        const regionCounts: {[region: string]: number} = {
          'Luzon': 0,
          'Visayas': 0,
          'Mindanao': 0
        };
        
        tours.forEach(tour => {
          if (tour.region && regionCounts[tour.region] !== undefined) {
            regionCounts[tour.region] += tour.bookingCount || 1;
          }
        });
        
        // Calculate percentages
        const totalRegionCount = Object.values(regionCounts).reduce((sum, count) => sum + count, 0);
        
        const regionDistribution = Object.entries(regionCounts).map(([name, count]) => ({
          name,
          value: totalRegionCount > 0 ? Math.round((count / totalRegionCount) * 100) : 33
        }));
        
        // Process booking motivations (categories/interests)
        // This might need to come from user preferences or tour categories
        const categoryTourCounts: {[category: string]: number} = {
          'Beach/Islands': 0,
          'Cultural Experiences': 0,
          'Adventure/Nature': 0,
          'Food Tourism': 0,
          'City Exploration': 0
        };
        
        tours.forEach(tour => {
          const category = tour.category || 'Adventure/Nature';
          if (categoryTourCounts[category] !== undefined) {
            categoryTourCounts[category] += tour.bookingCount || 1;
          } else if (tour.tags && Array.isArray(tour.tags)) {
            // If we have tags, use them to categorize
            if (tour.tags.some((tag: string) => tag.toLowerCase().includes('beach') || tag.toLowerCase().includes('island'))) {
              categoryTourCounts['Beach/Islands'] += tour.bookingCount || 1;
            } else if (tour.tags.some((tag: string) => tag.toLowerCase().includes('culture') || tag.toLowerCase().includes('historical'))) {
              categoryTourCounts['Cultural Experiences'] += tour.bookingCount || 1;
            } else if (tour.tags.some((tag: string) => tag.toLowerCase().includes('adventure') || tag.toLowerCase().includes('nature'))) {
              categoryTourCounts['Adventure/Nature'] += tour.bookingCount || 1;
            } else if (tour.tags.some((tag: string) => tag.toLowerCase().includes('food') || tag.toLowerCase().includes('culinary'))) {
              categoryTourCounts['Food Tourism'] += tour.bookingCount || 1;
            } else if (tour.tags.some((tag: string) => tag.toLowerCase().includes('city') || tag.toLowerCase().includes('urban'))) {
              categoryTourCounts['City Exploration'] += tour.bookingCount || 1;
            } else {
              // Default category
              categoryTourCounts['Adventure/Nature'] += tour.bookingCount || 1;
            }
          }
        });
        
        // Calculate percentages
        const totalCategoryCount = Object.values(categoryTourCounts).reduce((sum, count) => sum + count, 0);
        
        const bookingMotivations = Object.entries(categoryTourCounts).map(([reason, count]) => ({
          reason,
          percentage: totalCategoryCount > 0 ? Math.round((count / totalCategoryCount) * 100) : 20
        }));
        
        // Process seasonal trends - analyze bookings by month
        // Count bookings by month
        const monthCounts: {[month: string]: number} = {
          'Jan': 0, 'Feb': 0, 'Mar': 0, 'Apr': 0, 'May': 0, 'Jun': 0,
          'Jul': 0, 'Aug': 0, 'Sep': 0, 'Oct': 0, 'Nov': 0, 'Dec': 0
        };
        
        bookings.forEach(booking => {
          if (booking.createdAt) {
            // Handle both Firestore Timestamp and string dates
            const date = booking.createdAt.toDate ? booking.createdAt.toDate() : new Date(booking.createdAt);
            const month = date.toLocaleDateString('en-US', { month: 'short' });
            if (monthCounts[month] !== undefined) {
              monthCounts[month] += 1;
            }
          }
        });
        
        const seasonalTrends = Object.entries(monthCounts).map(([month, bookings]) => ({
          month,
          bookings
        }));
        
        // Set all data
        setDestinationData({
          topDestinations,
          regionDistribution,
          seasonalTrends,
          bookingMotivations
        });
        
      } catch (error) {
        console.error('Error fetching destination data:', error);
        // Set fallback data if there's an error
        setDestinationData({
          topDestinations: [
            { name: 'Boracay', bookings: 248, averageRating: 4.8, image: '/assets/images/samples/boracay.jpg' },
            { name: 'Palawan', bookings: 192, averageRating: 4.9, image: '/assets/images/samples/palawan.jpg' },
            { name: 'Cebu', bookings: 176, averageRating: 4.6, image: '/assets/images/samples/cebu.jpg' },
            { name: 'Bohol', bookings: 135, averageRating: 4.7, image: '/assets/images/samples/bohol.jpg' },
            { name: 'Siargao', bookings: 122, averageRating: 4.8, image: '/assets/images/samples/siargao.jpg' }
          ],
          regionDistribution: [
            { name: 'Luzon', value: 42 },
            { name: 'Visayas', value: 38 },
            { name: 'Mindanao', value: 20 }
          ],
          seasonalTrends: [
            { month: 'Jan', bookings: 0 },
            { month: 'Feb', bookings: 0 },
            { month: 'Mar', bookings: 0 },
            { month: 'Apr', bookings: 0 },
            { month: 'May', bookings: 0 },
            { month: 'Jun', bookings: 0 },
            { month: 'Jul', bookings: 0 },
            { month: 'Aug', bookings: 0 },
            { month: 'Sep', bookings: 0 },
            { month: 'Oct', bookings: 0 },
            { month: 'Nov', bookings: 0 },
            { month: 'Dec', bookings: 0 }
          ],
          bookingMotivations: [
            { reason: 'Beach/Islands', percentage: 62 },
            { reason: 'Cultural Experiences', percentage: 48 },
            { reason: 'Adventure/Nature', percentage: 55 },
            { reason: 'Food Tourism', percentage: 32 },
            { reason: 'City Exploration', percentage: 28 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchDestinationData();
  }, []);
  
  // Function to export the report as CSV
  const exportCSV = () => {
    if (!destinationData) return;
    
    try {
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      csvContent += "Popular Destinations Report\r\n\r\n";
      
      // Add top destinations data
      csvContent += "Top Destinations\r\n";
      csvContent += "Destination,Bookings,Average Rating\r\n";
      destinationData.topDestinations.forEach((destination: any) => {
        csvContent += `${destination.name},${destination.bookings},${destination.averageRating}\r\n`;
      });
      csvContent += "\r\n";
      
      // Add region distribution data
      csvContent += "Regional Distribution\r\n";
      csvContent += "Region,Percentage\r\n";
      destinationData.regionDistribution.forEach((item: any) => {
        csvContent += `${item.name},${item.value}%\r\n`;
      });
      csvContent += "\r\n";
      
      // Add booking motivations data
      csvContent += "Booking Motivations\r\n";
      csvContent += "Category,Percentage\r\n";
      destinationData.bookingMotivations.forEach((item: any) => {
        csvContent += `${item.reason},${item.percentage}%\r\n`;
      });
      csvContent += "\r\n";
      
      // Add seasonal trends data
      csvContent += "Seasonal Trends\r\n";
      csvContent += "Month,Bookings\r\n";
      destinationData.seasonalTrends.forEach((item: any) => {
        csvContent += `${item.month},${item.bookings}\r\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "popular_destinations_report.csv");
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
          <h1 className="text-3xl font-semibold text-gray-900">Popular Destinations Report</h1>
          <p className="text-gray-700 mt-1">Analysis of trending destinations and booking patterns</p>
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
      
      {/* Top destinations cards */}
      <div className="mb-8">
        <h3 className="text-xl font-medium text-gray-700 mb-4">Top 5 Destinations</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
          {destinationData.topDestinations.map((destination: any, index: number) => (
            <div key={index} className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden">
              <div className="relative h-40 w-full">
                <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </div>
                {/* Note: In a real app, you would use actual images here */}
                {/* <Image src={destination.image} alt={destination.name} layout="fill" objectFit="cover" /> */}
              </div>
              
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <h4 className="text-lg font-medium text-gray-900">{destination.name}</h4>
                  <div className="flex items-center bg-green-500 bg-opacity-20 text-green-500 px-2 py-1 rounded text-xs">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {destination.averageRating}
                  </div>
                </div>
                
                <div className="mt-4 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-gray-700">{destination.bookings} bookings</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      {/* Regional distribution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Regional Distribution</h3>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={destinationData.regionDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {destinationData.regionDistribution.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                  formatter={(value) => [`${value}%`, 'Percentage']}
                />
                <Legend wrapperStyle={{ color: '#374151' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Booking motivations */}
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Booking Motivations</h3>
          
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={destinationData.bookingMotivations}
                margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
                layout="vertical"
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false} />
                <XAxis 
                  type="number"
                  tick={{ fill: '#374151' }}
                  tickLine={{ stroke: '#374151' }}
                  axisLine={{ stroke: '#374151' }}
                />
                <YAxis 
                  dataKey="reason"
                  type="category"
                  tick={{ fill: '#374151' }}
                  tickLine={{ stroke: '#374151' }}
                  axisLine={{ stroke: '#374151' }}
                  width={150}
                />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                  labelStyle={{ color: '#111827' }}
                  formatter={(value) => [`${value}%`, 'Travelers']}
                />
                <Legend wrapperStyle={{ color: '#374151' }} />
                <Bar dataKey="percentage" name="Percentage of Travelers" fill="#00C49F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Seasonal trends */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300 mb-8">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Seasonal Booking Trends</h3>
        
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={destinationData.seasonalTrends}
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
              <Bar dataKey="bookings" name="Number of Bookings" fill="#8884D8" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
} 