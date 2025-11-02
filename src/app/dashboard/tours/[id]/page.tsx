'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { db } from '@/configs/firebase';
import { doc, getDoc } from 'firebase/firestore';

// Format price with commas and peso sign
const formatPrice = (price: number): string => {
  return `₱${price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
};

// Tour type definition
type TourItem = string | {
  title?: string;
  description?: string;
  name?: string;
  text?: string;
  day?: string;
  content?: string;
  date?: string;
  location?: string;
  activities?: string;
};

type Tour = {
  id: string;
  name: string;
  destination?: string;
  location: string;
  duration: number | string;
  nights?: number;
  price: number;
  status: 'active' | 'inactive';
  featured: boolean;
  region?: 'Luzon' | 'Visayas' | 'Mindanao' | '';
  createdAt?: any;
  imageUrl?: string;
  images?: string[];
  category?: string;
  description?: string;
  itinerary?: TourItem[];
  inclusions?: TourItem[];
  exclusions?: TourItem[];
  requirements?: TourItem[];
  maxParticipants?: number;
  minParticipants?: number;
  difficulty?: 'Easy' | 'Moderate' | 'Challenging';
  bestTime?: string;
  highlights?: TourItem[];
  startDate?: string;
  endDate?: string;
  termsAndConditions?: string;
};

export default function TourDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);

  const tourId = params.id as string;

  // Fetch tour details from Firestore
  useEffect(() => {
    const fetchTour = async () => {
      try {
        setLoading(true);
        const tourRef = doc(db, 'tours', tourId);
        const tourSnap = await getDoc(tourRef);
        
        if (tourSnap.exists()) {
          const data = tourSnap.data();
          setTour({
            id: tourSnap.id,
            name: data.name || '',
            location: data.location || '',
            destination: data.location || '',
            duration: typeof data.duration === 'number' ? data.duration : parseInt(data.duration) || 0,
            nights: data.nights || (typeof data.duration === 'number' ? data.duration - 1 : 0),
            price: data.price || 0,
            status: data.status || 'inactive',
            featured: data.featured || false,
            region: data.region || '',
            createdAt: data.createdAt,
            imageUrl: data.imageUrl || (data.images && data.images.length > 0 ? data.images[0] : ''),
            images: data.images || [],
            category: data.category || '',
            description: data.description || '',
            itinerary: data.itinerary || [],
            inclusions: data.inclusions || [],
            exclusions: data.exclusions || [],
            requirements: data.requirements || [],
            maxParticipants: data.maxParticipants || 0,
            minParticipants: data.minParticipants || 0,
            difficulty: data.difficulty || 'Easy',
            bestTime: data.bestTime || '',
            highlights: data.highlights || [],
            startDate: data.startDate || '',
            endDate: data.endDate || '',
            termsAndConditions: data.termsAndConditions || ''
          });
        } else {
          console.error('Tour not found');
          router.push('/dashboard/tours');
        }
      } catch (error) {
        console.error('Error fetching tour:', error);
        router.push('/dashboard/tours');
      } finally {
        setLoading(false);
      }
    };
    
    if (tourId) {
      fetchTour();
    }
  }, [tourId, router]);

  // Format date string
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (!tour) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 text-center">
        <p className="text-black text-lg">Tour not found.</p>
        <button
          onClick={() => router.push('/dashboard/tours')}
          className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-md"
        >
          Back to Tours
        </button>
      </div>
    );
  }

  // Get duration info
  const durationDays = typeof tour.duration === 'number' ? tour.duration : parseInt(tour.duration.toString()) || 0;
  const durationNights = tour.nights || (durationDays > 0 ? durationDays - 1 : 0);

  return (
    <div className="bg-gray-100 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button
          onClick={() => router.push('/dashboard/tours')}
          className="text-black hover:text-gray-700 flex items-center"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Packages List
        </button>
        <button
          onClick={() => router.push(`/dashboard/tours/edit/${tour.id}`)}
          className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-md"
        >
          Edit Data
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content - Left Side */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm p-8">
            {/* Image Grid - Dynamic Layout */}
          {tour.images && tour.images.length > 0 && (
              <div className="mb-6">
                {tour.images.length === 1 && (
                  // Single image - full width
                  <div className="w-full">
                <img
                      src={tour.images[0]}
                      alt={tour.name}
                      className="w-full h-96 object-cover rounded-lg"
                />
                  </div>
                )}
                
                {tour.images.length === 2 && (
                  // Two images - side by side
                  <div className="grid grid-cols-2 gap-4">
                    <img
                      src={tour.images[0]}
                      alt={tour.name}
                      className="w-full h-80 object-cover rounded-lg"
                    />
                    <img
                      src={tour.images[1]}
                      alt={`${tour.name} 2`}
                      className="w-full h-80 object-cover rounded-lg"
                    />
                </div>
                )}
                
                {tour.images.length === 3 && (
                  // Three images - one large on left, two stacked on right
                  <div className="grid grid-cols-2 gap-4">
                    <div className="row-span-2">
                      <img
                        src={tour.images[0]}
                        alt={tour.name}
                        className="w-full h-full object-cover rounded-lg"
                        style={{ minHeight: '400px', maxHeight: '400px' }}
                      />
                    </div>
                    <img
                      src={tour.images[1]}
                      alt={`${tour.name} 2`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    <img
                      src={tour.images[2]}
                      alt={`${tour.name} 3`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                )}
                
                {tour.images.length >= 4 && (
                  // Four or more images - one large on left, three small on right
                  <div className="grid grid-cols-2 gap-4">
                    <div className="row-span-2">
                      <img
                        src={tour.images[0]}
                        alt={tour.name}
                        className="w-full h-full object-cover rounded-lg"
                        style={{ minHeight: '400px', maxHeight: '400px' }}
                      />
              </div>
                    {tour.images.slice(1, 4).map((image, index) => (
                      <div key={index}>
                        <img
                          src={image}
                          alt={`${tour.name} ${index + 2}`}
                          className="w-full object-cover rounded-lg"
                          style={{ height: '192px' }}
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

            {/* Tour Title and Info */}
            <div className="mb-6">
              <div className="flex justify-between items-start mb-2">
                <h1 className="text-3xl font-bold text-black">{tour.name}</h1>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{formatPrice(tour.price)}</div>
                  <div className="text-sm text-black">per person</div>
        </div>
              </div>
              
              <div className="flex items-center space-x-6 text-black text-sm">
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{tour.location}</span>
                </div>
                <div className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>{durationDays} Days / {durationNights} Nights</span>
                </div>
                {tour.maxParticipants && tour.maxParticipants > 0 && (
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    <span>{tour.maxParticipants} participants</span>
                </div>
              )}
            </div>
          </div>

            {/* About Section */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-black mb-3">About</h2>
              <p className="text-black text-sm leading-relaxed">
                {tour.description || 'No description available.'}
              </p>
            </div>

            {/* Trip Schedule */}
            {(tour.startDate || tour.endDate) && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-black mb-3">Trip Schedule</h2>
                <div className="flex items-center text-black text-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>
                    {tour.startDate && formatDate(tour.startDate)}
                    {tour.startDate && tour.endDate && ' — '}
                    {tour.endDate && formatDate(tour.endDate)}
                  </span>
                </div>
              </div>
            )}

            {/* Includes and Excludes */}
            <div className="grid grid-cols-2 gap-8">
              {/* Includes */}
              <div>
                <h2 className="text-lg font-semibold text-black mb-4">INCLUDES</h2>
                <ul className="space-y-3">
                  {tour.inclusions && tour.inclusions.length > 0 ? (
                    tour.inclusions.map((inclusion, index) => {
                  let displayText = '';
                  if (typeof inclusion === 'string') {
                    displayText = inclusion;
                  } else if (inclusion && typeof inclusion === 'object') {
                    displayText = inclusion.title || inclusion.description || inclusion.name || inclusion.text || '';
                  }
                  
                  return (
                        <li key={index} className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500 mr-3 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                          <span className="text-black text-sm">{displayText}</span>
                    </li>
                  );
                    })
                  ) : (
                    <li className="text-black text-sm">No inclusions listed</li>
                  )}
              </ul>
            </div>

              {/* Excludes */}
              <div>
                <h2 className="text-lg font-semibold text-black mb-4">EXCLUDES</h2>
                <ul className="space-y-3">
                  {tour.exclusions && tour.exclusions.length > 0 ? (
                    tour.exclusions.map((exclusion, index) => {
                  let displayText = '';
                  if (typeof exclusion === 'string') {
                    displayText = exclusion;
                  } else if (exclusion && typeof exclusion === 'object') {
                    displayText = exclusion.title || exclusion.description || exclusion.name || exclusion.text || '';
                  }
                  
                  return (
                        <li key={index} className="flex items-start">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                          <span className="text-black text-sm">{displayText}</span>
                    </li>
                  );
                    })
                  ) : (
                    <li className="text-black text-sm">No exclusions listed</li>
                  )}
              </ul>
            </div>
            </div>

            {/* Terms and Conditions */}
            {tour.termsAndConditions && (
              <div className="mt-8 pt-8 border-t border-gray-200">
                <h2 className="text-lg font-semibold text-black mb-4">Terms and Conditions</h2>
                <div className="text-black text-sm leading-relaxed whitespace-pre-line">
                  {tour.termsAndConditions}
                </div>
            </div>
          )}
          </div>
        </div>

        {/* Right Sidebar - Travel Plans */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-6">
            <h2 className="text-xl font-bold text-black mb-6">Travel Plans</h2>
            
            {tour.itinerary && tour.itinerary.length > 0 ? (
              <div className="space-y-4">
                {tour.itinerary.map((item, index) => {
                  let dayTitle = '';
                  let dayDate = '';
                  let dayLocation = '';
                  let dayActivities = '';
                  
                  if (typeof item === 'string') {
                    const dayMatch = item.match(/^(Day\s+\d+)/i);
                    if (dayMatch) {
                      dayTitle = dayMatch[1];
                      dayActivities = item.replace(/^Day\s+\d+\s*/i, '').trim();
                    } else {
                      dayTitle = `Day ${index + 1}`;
                      dayActivities = item;
                    }
                  } else if (item && typeof item === 'object') {
                    dayTitle = item.day || item.title || `Day ${index + 1}`;
                    dayDate = item.date || '';
                    dayLocation = item.location || '';
                    dayActivities = item.activities || item.description || item.content || item.text || '';
                  }
                  
                  return (
                    <div key={index} className="border-b border-gray-200 pb-4 last:border-0">
                      <div className="flex items-start">
                        <div className="flex-shrink-0 w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center mr-3 mt-1">
                          <span className="text-black text-xs font-semibold">{index + 1}</span>
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-semibold text-black text-sm">{dayTitle}</h3>
                          </div>
                          {dayDate && (
                            <p className="text-xs text-black mb-1">{dayDate}</p>
                          )}
                          {dayLocation && (
                            <p className="text-sm font-medium text-black mb-1">{dayLocation}</p>
                          )}
                          {dayActivities && (
                            <p className="text-xs text-black leading-relaxed whitespace-pre-line">{dayActivities}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
            ) : (
              <p className="text-black text-sm">No itinerary available</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
