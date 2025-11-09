'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { db } from '@/configs/firebase';
import { collection, getDocs, doc, updateDoc, query, where, orderBy, deleteDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// Format price with commas and peso sign
const formatPrice = (price: number): string => {
  return `₱${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

// Tour type definition
type Tour = {
  id: string;
  name: string;
  destination?: string;
  location: string;
  duration: number | string;
  price: number;
  status: 'active' | 'inactive';
  featured: boolean;
  region?: 'Luzon' | 'Visayas' | 'Mindanao' | '';
  createdAt?: any;
  imageUrl?: string;
  images?: string[];  // Add images array to Tour type
  category?: string;
  description?: string;
};

export default function ToursPage() {
  const [tours, setTours] = useState<Tour[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRegion, setFilterRegion] = useState<'all' | 'Luzon' | 'Visayas' | 'Mindanao'>('all');
  const [loading, setLoading] = useState(true);
  const [activeImageIndices, setActiveImageIndices] = useState<{[tourId: string]: number}>({});
  const carouselRefs = useRef<{[tourId: string]: HTMLDivElement | null}>({});
  const router = useRouter();

  // Fetch tours from Firestore
  useEffect(() => {
    const fetchTours = async () => {
      try {
        setLoading(true);
        const toursQuery = query(collection(db, 'tours'), orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(toursQuery);
        
        const toursList: Tour[] = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          toursList.push({
            id: doc.id,
            name: data.name || '',
            location: data.location || '',
            destination: data.location || '',  // Use location as destination for display
            duration: typeof data.duration === 'number' ? `${data.duration} days` : data.duration || '',
            price: data.price || 0,
            status: data.status || 'inactive',
            featured: data.featured || false,
            region: data.region || '',
            createdAt: data.createdAt,
            imageUrl: data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : ''),
            images: data.images || [], // Add the images array
            category: data.category || '',
            description: data.description || ''
          });
        });
        
        setTours(toursList);
      } catch (error) {
        console.error('Error fetching tours:', error);
        // If error, use empty array
        setTours([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTours();
  }, []);

  // Filter tours based on search term and region
  const filteredTours = tours.filter(tour => {
    const matchesSearch = 
      tour.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (tour.location && tour.location.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRegion = filterRegion === 'all' ? true : tour.region === filterRegion;
    
    return matchesSearch && matchesRegion;
  });

  // Toggle tour status (active/inactive)
  const toggleTourStatus = async (id: string) => {
    try {
      const tourToUpdate = tours.find(tour => tour.id === id);
      if (!tourToUpdate) return;
      
      const newStatus = tourToUpdate.status === 'active' ? 'inactive' : 'active';
      
      // Update in Firestore
      const tourRef = doc(db, 'tours', id);
      await updateDoc(tourRef, {
        status: newStatus
      });
      
      // Update local state
      setTours(tours.map(tour => 
        tour.id === id ? { ...tour, status: newStatus } : tour
      ));
      
      console.log(`Tour ${id} status updated to ${newStatus}`);
    } catch (error) {
      console.error('Error updating tour status:', error);
      alert('Failed to update tour status. Please try again.');
    }
  };

  // Toggle tour featured status
  const toggleTourFeatured = async (id: string) => {
    try {
      const tourToUpdate = tours.find(tour => tour.id === id);
      if (!tourToUpdate) return;
      
      const newFeatured = !tourToUpdate.featured;
      
      // Update in Firestore
      const tourRef = doc(db, 'tours', id);
      await updateDoc(tourRef, {
        featured: newFeatured
      });
      
      // Update local state
      setTours(tours.map(tour => 
        tour.id === id ? { ...tour, featured: newFeatured } : tour
      ));
      
      console.log(`Tour ${id} featured status updated to ${newFeatured}`);
    } catch (error) {
      console.error('Error updating tour featured status:', error);
      alert('Failed to update tour featured status. Please try again.');
    }
  };

  // Delete tour function
  const deleteTour = async (id: string) => {
    try {
      if (window.confirm('Are you sure you want to delete this tour? This action cannot be undone.')) {
        // Delete from Firestore
        const tourRef = doc(db, 'tours', id);
        await deleteDoc(tourRef);
        
        // Update local state
        setTours(tours.filter(tour => tour.id !== id));
        
        console.log(`Tour ${id} has been deleted`);
      }
    } catch (error) {
      console.error('Error deleting tour:', error);
      alert('Failed to delete tour. Please try again.');
    }
  };

  // Navigate to previous image
  const prevImage = (tourId: string) => {
    if (!tours) return;
    const tour = tours.find(t => t.id === tourId);
    if (!tour || !tour.images || tour.images.length <= 1) return;
    
    setActiveImageIndices(prev => {
      const currentIndex = prev[tourId] || 0;
      const newIndex = currentIndex === 0 ? tour.images!.length - 1 : currentIndex - 1;
      
      // Scroll to the new index
      if (carouselRefs.current[tourId]) {
        const carousel = carouselRefs.current[tourId];
        const scrollAmount = carousel!.clientWidth * newIndex;
        carousel!.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
      
      return { ...prev, [tourId]: newIndex };
    });
  };

  // Navigate to next image
  const nextImage = (tourId: string) => {
    if (!tours) return;
    const tour = tours.find(t => t.id === tourId);
    if (!tour || !tour.images || tour.images.length <= 1) return;
    
    setActiveImageIndices(prev => {
      const currentIndex = prev[tourId] || 0;
      const newIndex = (currentIndex + 1) % tour.images!.length;
      
      // Scroll to the new index
      if (carouselRefs.current[tourId]) {
        const carousel = carouselRefs.current[tourId];
        const scrollAmount = carousel!.clientWidth * newIndex;
        carousel!.scrollTo({ left: scrollAmount, behavior: 'smooth' });
      }
      
      return { ...prev, [tourId]: newIndex };
    });
  };

  // Auto-advance images every 1 second
  useEffect(() => {
    const intervals: { [tourId: string]: NodeJS.Timeout } = {};
    
    filteredTours.forEach(tour => {
      if (tour.images && tour.images.length > 1) {
        intervals[tour.id] = setInterval(() => {
          // Auto-advance logic
          setActiveImageIndices(prev => {
            const currentIndex = prev[tour.id] || 0;
            const newIndex = (currentIndex + 1) % tour.images!.length;
            
            // Scroll to the new index if carousel exists
            if (carouselRefs.current[tour.id]) {
              const carousel = carouselRefs.current[tour.id];
              const scrollAmount = carousel!.clientWidth * newIndex;
              carousel!.scrollTo({ left: scrollAmount, behavior: 'smooth' });
            }
            
            return { ...prev, [tour.id]: newIndex };
          });
        }, 3000); // 3 seconds
      }
    });
    
    // Cleanup intervals on unmount or when tours change
    return () => {
      Object.values(intervals).forEach(interval => {
        clearInterval(interval);
      });
    };
  }, [filteredTours]);

  // Handle scroll events to update the active index
  const handleScroll = (tourId: string) => {
    // Function is no longer needed as we're not using scroll
    return;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="mb-6">
        <h1 className="text-3xl font-semibold text-gray-800">Packages</h1>
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="mb-4 md:mb-0">
            <div className="relative">
              <input
                type="text"
                className="pl-10 pr-4 py-2 rounded-md bg-white border border-gray-300 text-black w-full md:w-64"
                placeholder="Search tours..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          </div>
          <div className="flex flex-col md:flex-row md:items-center space-y-2 md:space-y-0 md:space-x-2">
            <select
              className="px-4 py-2 rounded-md bg-white border border-gray-300 text-black"
              value={filterRegion}
              onChange={(e) => setFilterRegion(e.target.value as 'all' | 'Luzon' | 'Visayas' | 'Mindanao')}
            >
              <option value="all">All Regions</option>
              <option value="Luzon">Luzon</option>
              <option value="Visayas">Visayas</option>
              <option value="Mindanao">Mindanao</option>
            </select>
            <button
              onClick={() => router.push('/dashboard/tours/create')}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add New Tour
            </button>
          </div>
          </div>
        </div>

      {/* Tours List */}
        {loading ? (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
          </div>
        ) : (
          <>
            {filteredTours.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center border border-gray-300">
              <p className="text-black text-lg">No tours found. Try adjusting your filters or create a new tour.</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredTours.map((tour) => (
                <div 
                  key={tour.id} 
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-300 cursor-pointer hover:shadow-lg hover:border-green-500 transition-all duration-200"
                  onClick={() => router.push(`/dashboard/tours/${tour.id}`)}
                >
                  <div className="h-48 relative">
                    {tour.images && tour.images.length > 0 ? (
                      <div className="w-full h-full relative">
                        {/* Image Carousel */}
                        <div 
                          className="w-full h-full relative"
                          ref={(el) => { carouselRefs.current[tour.id] = el; }}
                        >
                          {tour.images.map((imageUrl, index) => (
                            <div 
                              key={index} 
                              className={`h-48 w-full absolute top-0 left-0 transition-opacity duration-300 ${
                                index === (activeImageIndices[tour.id] || 0) ? 'opacity-100 z-10' : 'opacity-0 z-0'
                              }`}
                            >
                              <img
                                src={imageUrl}
                                alt={`${tour.name} - image ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                        
                        {/* Navigation Indicators */}
                        {tour.images.length > 1 && (
                          <div className="absolute bottom-2 left-0 right-0 flex justify-center space-x-1 z-20">
                            {tour.images.map((_, index) => (
                              <div 
                                key={index} 
                                className={`w-2 h-2 rounded-full transition-all ${
                                  index === (activeImageIndices[tour.id] || 0) 
                                    ? 'bg-white' 
                                    : 'bg-white bg-opacity-50'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (carouselRefs.current[tour.id]) {
                                    const carousel = carouselRefs.current[tour.id];
                                    const scrollAmount = carousel!.clientWidth * index;
                                    carousel!.scrollTo({ left: scrollAmount, behavior: 'smooth' });
                                    setActiveImageIndices(prev => ({ ...prev, [tour.id]: index }));
                                  }
                                }}
                                style={{ cursor: 'pointer' }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-12 w-12 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    {/* Title and Location - Always Visible */}
                    <h3 className="text-gray-900 font-bold text-lg mb-2">{tour.name}</h3>
                    <div className="flex items-center text-sm text-gray-600 mb-3">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-4 w-4 mr-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        {tour.location}
                      </div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-green-600 font-bold text-lg">{formatPrice(parseFloat(tour.price.toString()))}</span>
                      <span className="text-sm text-black bg-gray-200 px-2 py-1 rounded">
                        {tour.category}
                      </span>
                    </div>
                    <p className="text-gray-700 line-clamp-2 text-sm mb-4">{tour.description}</p>
                    <div className="flex justify-between items-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/dashboard/tours/edit/${tour.id}`);
                        }}
                        className="text-blue-600 hover:text-blue-700 flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Edit
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTour(tour.id);
                              }}
                        className="text-red-600 hover:text-red-700 flex items-center"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5 mr-1"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path
                            fillRule="evenodd"
                            d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
                            clipRule="evenodd"
                          />
                        </svg>
                              Delete
                            </button>
                          </div>
                  </div>
                </div>
                    ))}
              </div>
            )}
          </>
        )}
    </div>
  );
} 