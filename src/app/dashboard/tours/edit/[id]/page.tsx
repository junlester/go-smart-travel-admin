'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/configs/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';

// Types
interface DayItinerary {
  id: string;
  title: string;
  description: string;
}

interface InclusionExclusion {
  id: string;
  text: string;
}

interface TourPackage {
  name: string;
  duration: number | string;
  price: number | string;
  location: string;
  description: string;
  images: string[];
  itinerary: DayItinerary[];
  inclusions: InclusionExclusion[];
  exclusions: InclusionExclusion[];
  region: 'Luzon' | 'Visayas' | 'Mindanao' | '';
  status: 'active' | 'inactive';
  featured: boolean;
  termsAndConditions: string;
  maxParticipants: number | string;
  minParticipants: number | string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dqmuvzzl2';
const CLOUDINARY_UPLOAD_PRESET = 'admin_upload';

export default function EditTourPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { id } = params;
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [searchText, setSearchText] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Tour data state
  const [tourData, setTourData] = useState<TourPackage>({
    name: '',
    duration: 1,
    price: 0,
    location: '',
    description: '',
    images: [],
    itinerary: [{ id: '1', title: 'Day 1', description: '' }],
    inclusions: [{ id: '1', text: 'Hotel accommodation' }],
    exclusions: [{ id: '1', text: 'International flights' }],
    region: '',
    status: 'inactive',
    featured: false,
    termsAndConditions: '',
    maxParticipants: 1,
    minParticipants: 1,
    coordinates: {
      latitude: 14.5995,
      longitude: 120.9842
    }
  });

  // Fetch tour data
  useEffect(() => {
    const fetchTour = async () => {
      if (!id) return;
      setLoading(true);
      
      try {
        const tourDoc = await getDoc(doc(db, 'tours', id));
        
        if (tourDoc.exists()) {
          const data = tourDoc.data();
          
          // Format itinerary data
          let itineraryData: DayItinerary[] = [];
          if (data.itinerary && Array.isArray(data.itinerary)) {
            itineraryData = data.itinerary.map((day: any, index: number) => {
              if (typeof day === 'object' && day.title && day.description) {
                return {
                  id: day.id || `day-${index + 1}`,
                  title: day.title,
                  description: day.description
                };
              } else {
                return {
                  id: `day-${index + 1}`,
                  title: `Day ${index + 1}`,
                  description: typeof day === 'string' ? day : ''
                };
              }
            });
          } else {
            itineraryData = [{ id: '1', title: 'Day 1', description: '' }];
          }
          
          // Format inclusions data
          let inclusionsData: InclusionExclusion[] = [];
          if (data.inclusions && Array.isArray(data.inclusions)) {
            inclusionsData = data.inclusions.map((item: any, index: number) => {
              if (typeof item === 'object' && item.text) {
                return {
                  id: item.id || `inclusion-${index + 1}`,
                  text: item.text
                };
              } else {
                return {
                  id: `inclusion-${index + 1}`,
                  text: typeof item === 'string' ? item : ''
                };
              }
            });
          } else {
            inclusionsData = [{ id: '1', text: 'Hotel accommodation' }];
          }
          
          // Format exclusions data
          let exclusionsData: InclusionExclusion[] = [];
          if (data.exclusions && Array.isArray(data.exclusions)) {
            exclusionsData = data.exclusions.map((item: any, index: number) => {
              if (typeof item === 'object' && item.text) {
                return {
                  id: item.id || `exclusion-${index + 1}`,
                  text: item.text
                };
              } else {
                return {
                  id: `exclusion-${index + 1}`,
                  text: typeof item === 'string' ? item : ''
                };
              }
            });
          } else {
            exclusionsData = [{ id: '1', text: 'International flights' }];
          }
          
          // Set existing images
          const imageUrls = data.images && Array.isArray(data.images) ? data.images : [];
          setExistingImages(imageUrls);
          
          // Set tour data
          setTourData({
            name: data.name || '',
            duration: data.duration || 1,
            price: data.price || 0,
            location: data.location || '',
            description: data.description || '',
            images: imageUrls,
            itinerary: itineraryData,
            inclusions: inclusionsData,
            exclusions: exclusionsData,
            region: data.region || '',
            status: data.status || 'inactive',
            featured: data.featured || false,
            termsAndConditions: data.termsAndConditions || '',
            maxParticipants: data.maxParticipants || 1,
            minParticipants: data.minParticipants || 1,
            coordinates: data.coordinates || {
              latitude: 14.5995,
              longitude: 120.9842
            }
          });
        } else {
          alert('Tour not found');
          router.push('/dashboard/tours');
        }
      } catch (error) {
        console.error('Error fetching tour:', error);
        alert('Error fetching tour data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchTour();
  }, [id, router]);

  // Handle image selection
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files).slice(0, 5 - existingImages.length);
      setImages(prev => [...prev, ...selectedFiles].slice(0, 5 - existingImages.length));
      
      // Create preview URLs
      const newPreviewUrls = selectedFiles.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...newPreviewUrls].slice(0, 5 - existingImages.length));
    }
  };

  // Remove an existing image
  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  // Remove a new image
  const removeNewImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      const newPreviews = [...prev];
      URL.revokeObjectURL(newPreviews[index]);
      newPreviews.splice(index, 1);
      return newPreviews;
    });
  };

  // Handle text input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'price' || name === 'duration' || name === 'maxParticipants' || name === 'minParticipants') {
      // Allow empty string, otherwise parse the number
      setTourData(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseFloat(value)
      }));
    } else {
      setTourData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // Add a new day to itinerary
  const addDay = () => {
    const newDay: DayItinerary = {
      id: `day-${Date.now()}`,
      title: `Day ${tourData.itinerary.length + 1}`,
      description: ''
    };
    setTourData(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, newDay]
    }));
  };

  // Update day itinerary
  const updateDayItinerary = (id: string, field: keyof DayItinerary, value: string) => {
    setTourData(prev => ({
      ...prev,
      itinerary: prev.itinerary.map(day => 
        day.id === id ? { ...day, [field]: value } : day
      )
    }));
  };

  // Remove a day from itinerary
  const removeDay = (id: string) => {
    if (tourData.itinerary.length > 1) {
      setTourData(prev => ({
        ...prev,
        itinerary: prev.itinerary.filter(day => day.id !== id)
      }));
    }
  };

  // Add a new inclusion
  const addInclusion = () => {
    const newInclusion: InclusionExclusion = {
      id: `inclusion-${Date.now()}`,
      text: ''
    };
    setTourData(prev => ({
      ...prev,
      inclusions: [...prev.inclusions, newInclusion]
    }));
  };

  // Update inclusion
  const updateInclusion = (id: string, value: string) => {
    setTourData(prev => ({
      ...prev,
      inclusions: prev.inclusions.map(item => 
        item.id === id ? { ...item, text: value } : item
      )
    }));
  };

  // Remove an inclusion
  const removeInclusion = (id: string) => {
    if (tourData.inclusions.length > 1) {
      setTourData(prev => ({
        ...prev,
        inclusions: prev.inclusions.filter(item => item.id !== id)
      }));
    }
  };

  // Add a new exclusion
  const addExclusion = () => {
    const newExclusion: InclusionExclusion = {
      id: `exclusion-${Date.now()}`,
      text: ''
    };
    setTourData(prev => ({
      ...prev,
      exclusions: [...prev.exclusions, newExclusion]
    }));
  };

  // Update exclusion
  const updateExclusion = (id: string, value: string) => {
    setTourData(prev => ({
      ...prev,
      exclusions: prev.exclusions.map(item => 
        item.id === id ? { ...item, text: value } : item
      )
    }));
  };

  // Remove an exclusion
  const removeExclusion = (id: string) => {
    if (tourData.exclusions.length > 1) {
      setTourData(prev => ({
        ...prev,
        exclusions: prev.exclusions.filter(item => item.id !== id)
      }));
    }
  };

  // Upload images to Cloudinary
  const uploadImages = async () => {
    if (images.length === 0) return [];
    
    const imageUrls: string[] = [];
    const totalImages = images.length;
    
    try {
      for (let i = 0; i < totalImages; i++) {
        const file = images[i];
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET || 'go_smart_travel');
        formData.append('cloud_name', CLOUDINARY_CLOUD_NAME);
        
        const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Error uploading to Cloudinary:', errorData);
          throw new Error(`Failed to upload image ${i + 1}`);
        }
        
        const data = await response.json();
        imageUrls.push(data.secure_url);
        
        // Update progress
        setUploadProgress(Math.round(((i + 1) / totalImages) * 100));
      }
      
      return imageUrls;
    } catch (error) {
      console.error('Error during image upload:', error);
      throw error;
    }
  };

  // Search for locations using Google Places API
  const searchPlaces = async () => {
    if (!searchText.trim()) return;
    
    try {
      setSearchLoading(true);
      
      const response = await fetch(`/api/places?query=${encodeURIComponent(searchText)}`);
      
      if (!response.ok) {
        throw new Error(`API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }
      
      if (data.results) {
        setSearchResults(data.results.slice(0, 5));
      } else {
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error searching places:', error);
      alert(`Failed to search for places: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSearchLoading(false);
    }
  };

  // Select a location from search results
  const selectLocation = (place: any) => {
    setTourData(prev => ({
      ...prev,
      location: place.name,
      coordinates: {
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng
      }
    }));
    setSearchResults([]);
    setSearchText('');
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!tourData.name || !tourData.location) {
      alert('Please fill in all required fields');
      return;
    }
    
    setSaving(true);
    
    try {
      console.log('Starting tour update process...');
      
      // Upload new images if any
      let newImageUrls: string[] = [];
      if (images.length > 0) {
        console.log('Uploading new images...');
        newImageUrls = await uploadImages();
      }
      
      // Combine existing and new images
      const combinedImages = [...existingImages, ...newImageUrls];
      
      // Prepare tour data
      const updatedTourData = {
        ...tourData,
        images: combinedImages,
        price: Number(tourData.price) || 0,
        duration: Number(tourData.duration) || 1,
        maxParticipants: tourData.maxParticipants === '' ? 1 : Number(tourData.maxParticipants),
        minParticipants: tourData.minParticipants === '' ? 1 : Number(tourData.minParticipants),
        updatedAt: serverTimestamp()
      };
      
      console.log('Saving updated tour data to Firestore:', updatedTourData);
      
      // Update in Firestore
      await updateDoc(doc(db, 'tours', id), updatedTourData);
      console.log('Tour successfully updated');
      
      alert('Tour package updated successfully!');
      
      // Redirect to tour detail page
      router.push(`/dashboard/tours/${id}`);
    } catch (error) {
      console.error('Error updating tour package:', error);
      alert(`Failed to update tour package: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 min-h-screen -m-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => router.push(`/dashboard/tours/${id}`)}
            className="text-black hover:text-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-black">Edit Tour Package</h1>
        </div>
        <button 
          onClick={() => router.push('/dashboard/tours')}
          className="text-black hover:text-gray-700 text-sm"
        >
          Back to Tours List
        </button>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-black mb-6 pb-3 border-b border-gray-200">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-black mb-2">
                Package Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={tourData.name}
                onChange={handleInputChange}
                required
                placeholder="e.g., Safari Adventure"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-black mb-2">
                Location <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Search for location..."
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), searchPlaces())}
                  />
                  <button 
                    type="button"
                    onClick={searchPlaces}
                  disabled={searchLoading}
                  className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                >
                  {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>
                
                {searchResults.length > 0 && (
                <div className="mt-2 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-auto">
                    {searchResults.map((place, index) => (
                      <div 
                        key={place.place_id || `result-${index}`}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
                        onClick={() => selectLocation(place)}
                      >
                      <div className="font-medium text-black">{place.name}</div>
                      <div className="text-sm text-black">{place.formatted_address}</div>
                      </div>
                    ))}
                  </div>
                )}
                
                {tourData.location && (
                <div className="mt-2 p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-black">✓ Selected: {tourData.location}</p>
                  </div>
                )}
            </div>
            
            <div>
              <label htmlFor="duration" className="block text-sm font-medium text-black mb-2">
                Duration (Days) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                id="duration"
                name="duration"
                min="1"
                max="10"
                step="1"
                value={tourData.duration === '' ? '' : tourData.duration}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty or valid numbers between 1-10
                  if (value === '') {
                    handleInputChange(e);
                  } else if (!isNaN(parseInt(value)) && parseInt(value) >= 1 && parseInt(value) <= 10) {
                    handleInputChange(e);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') {
                    e.preventDefault();
                  }
                  const input = e.currentTarget;
                  // Prevent starting with 0
                  if (e.key === '0' && input.value.length === 0) {
                    e.preventDefault();
                    return;
                  }
                  // Prevent typing if already at 2 digits (max 10)
                  if (input.value.length >= 2 && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  const num = parseInt(pastedText);
                  if (!/^\d+$/.test(pastedText) || num < 1 || num > 10) {
                    e.preventDefault();
                  }
                }}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <p className="mt-1 text-xs text-gray-500">Enter between 1-10 days</p>
            </div>
            
            <div>
              <label htmlFor="price" className="block text-sm font-medium text-black mb-2">
                Price per Person <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">₱</span>
              <input
                type="number"
                id="price"
                name="price"
                min="0"
                  step="0.01"
                  value={tourData.price === '' ? '' : tourData.price}
                onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+') {
                      e.preventDefault();
                    }
                  }}
                  onPaste={(e) => {
                    const pastedText = e.clipboardData.getData('text');
                    if (!/^\d*\.?\d*$/.test(pastedText)) {
                      e.preventDefault();
                    }
                  }}
                required
                  className="w-full pl-8 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  placeholder="0.00"
              />
              </div>
            </div>
            
            <div>
              <label htmlFor="region" className="block text-sm font-medium text-black mb-2">
                Island Group <span className="text-red-500">*</span>
              </label>
              <select
                id="region"
                name="region"
                value={tourData.region}
                onChange={handleInputChange}
                  required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                  <option value="">Select Island Group</option>
                <option value="Luzon">Luzon</option>
                <option value="Visayas">Visayas</option>
                <option value="Mindanao">Mindanao</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-black mb-2">
                Status <span className="text-red-500">*</span>
              </label>
              <select
                id="status"
                name="status"
                value={tourData.status}
                onChange={handleInputChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            
            <div>
              <label htmlFor="maxParticipants" className="block text-sm font-medium text-black mb-2">
                Maximum Participants
              </label>
              <input
                type="number"
                id="maxParticipants"
                name="maxParticipants"
                min="1"
                max="99"
                step="1"
                value={tourData.maxParticipants === '' ? '' : tourData.maxParticipants}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty or valid numbers between 1-99
                  if (value === '') {
                    handleInputChange(e);
                  } else if (!isNaN(parseInt(value)) && parseInt(value) >= 1 && parseInt(value) <= 99) {
                    handleInputChange(e);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') {
                    e.preventDefault();
                  }
                  const input = e.currentTarget;
                  // Prevent starting with 0
                  if (e.key === '0' && input.value.length === 0) {
                    e.preventDefault();
                    return;
                  }
                  // Prevent typing if already at 2 digits
                  if (input.value.length >= 2 && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  const num = parseInt(pastedText);
                  if (!/^\d{1,2}$/.test(pastedText) || num < 1 || num > 99) {
                    e.preventDefault();
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="e.g., 15"
              />
              <p className="mt-1 text-xs text-gray-500">Enter between 1-99 participants</p>
            </div>
            
            <div>
              <label htmlFor="minParticipants" className="block text-sm font-medium text-black mb-2">
                Minimum Participants
              </label>
              <input
                type="number"
                id="minParticipants"
                name="minParticipants"
                min="1"
                max="99"
                step="1"
                value={tourData.minParticipants === '' ? '' : tourData.minParticipants}
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty or valid numbers between 1-99
                  if (value === '') {
                    handleInputChange(e);
                  } else if (!isNaN(parseInt(value)) && parseInt(value) >= 1 && parseInt(value) <= 99) {
                    handleInputChange(e);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E' || e.key === '+' || e.key === '.') {
                    e.preventDefault();
                  }
                  const input = e.currentTarget;
                  // Prevent starting with 0
                  if (e.key === '0' && input.value.length === 0) {
                    e.preventDefault();
                    return;
                  }
                  // Prevent typing if already at 2 digits
                  if (input.value.length >= 2 && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'Tab') {
                    e.preventDefault();
                  }
                }}
                onPaste={(e) => {
                  const pastedText = e.clipboardData.getData('text');
                  const num = parseInt(pastedText);
                  if (!/^\d{1,2}$/.test(pastedText) || num < 1 || num > 99) {
                    e.preventDefault();
                  }
                }}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                placeholder="e.g., 5"
              />
              <p className="mt-1 text-xs text-gray-500">Enter between 1-99 participants</p>
            </div>
          </div>
          
          <div className="mt-6">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                id="featured"
                name="featured"
                checked={tourData.featured}
                onChange={(e) => setTourData(prev => ({ ...prev, featured: e.target.checked }))}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-black font-medium">⭐ Featured Tour (Display on homepage)</span>
              </label>
          </div>
          
          <div className="mt-6">
            <label htmlFor="description" className="block text-sm font-medium text-black mb-2">
              Description <span className="text-red-500">*</span>
            </label>
            <textarea
              id="description"
              name="description"
              rows={4}
              value={tourData.description}
              onChange={handleInputChange}
              required
              placeholder="Describe the tour package experience..."
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
            />
          </div>
        </div>
        
        {/* Tour Images Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-black mb-6 pb-3 border-b border-gray-200">Tour Images</h2>
          
          {/* Existing images */}
          {existingImages.length > 0 && (
            <div className="mb-6">
              <p className="text-sm font-medium text-black mb-3">Current Images</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {existingImages.map((url, index) => (
                  <div key={index} className="relative group">
                    <img 
                      src={url} 
                      alt={`Tour image ${index + 1}`} 
                      className="h-32 w-full object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Add new images */}
          <div>
            <p className="text-sm font-medium text-black mb-3">Add New Images (Max 5 total)</p>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex flex-col items-center justify-center w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                <p className="text-xs text-gray-500 mt-1">Upload</p>
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={handleImageChange} 
                  accept="image/*"
                  disabled={existingImages.length + images.length >= 5}
                />
              </label>
              
                  {previewUrls.map((url, index) => (
                <div key={index} className="relative group">
                      <img 
                        src={url} 
                    alt={`New image ${index + 1}`} 
                    className="h-32 w-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeNewImage(index)}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
            <p className="text-xs text-gray-500 mt-2">
              {5 - existingImages.length - images.length} more image(s) can be uploaded
            </p>
          </div>
        </div>
        
        {/* Itinerary Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Daily Itinerary</h2>
            <button
              type="button"
              onClick={addDay}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg flex items-center space-x-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              <span>Add Day</span>
            </button>
          </div>
          
          <div className="space-y-4">
          {tourData.itinerary.map((day, index) => (
              <div key={day.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors">
                <div className="flex justify-between items-center mb-3">
                <input
                  type="text"
                  value={day.title}
                  onChange={(e) => updateDayItinerary(day.id, 'title', e.target.value)}
                    className="font-semibold text-black bg-transparent border-b border-gray-300 focus:border-blue-500 focus:outline-none px-2 py-1"
                    placeholder="Day Title (e.g., Day 1)"
                />
                
                {tourData.itinerary.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDay(day.id)}
                      className="text-red-500 hover:text-red-700"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              <textarea
                value={day.description}
                onChange={(e) => updateDayItinerary(day.id, 'description', e.target.value)}
                rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                  placeholder="Describe the activities for this day..."
              />
            </div>
          ))}
          </div>
        </div>
        
        {/* Inclusions & Exclusions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Inclusions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Inclusions</h2>
              <button
                type="button"
                onClick={addInclusion}
                className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
              >
                + Add
              </button>
            </div>
            
            <div className="space-y-2">
            {tourData.inclusions.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateInclusion(item.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="e.g., Hotel accommodation"
                />
                
                {tourData.inclusions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeInclusion(item.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            </div>
          </div>
          
          {/* Exclusions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex justify-between items-center mb-6 pb-3 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">Exclusions</h2>
              <button
                type="button"
                onClick={addExclusion}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg"
              >
                + Add
              </button>
            </div>
            
            <div className="space-y-2">
            {tourData.exclusions.map((item) => (
                <div key={item.id} className="flex items-center gap-2">
                <input
                  type="text"
                  value={item.text}
                  onChange={(e) => updateExclusion(item.id, e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
                    placeholder="e.g., International flights"
                />
                
                {tourData.exclusions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeExclusion(item.id)}
                      className="text-red-500 hover:text-red-700 p-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
            ))}
            </div>
          </div>
        </div>
        
        {/* Terms and Conditions Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-black mb-6 pb-3 border-b border-gray-200">Terms and Conditions</h2>
              <textarea
                name="termsAndConditions"
                value={tourData.termsAndConditions}
                onChange={handleInputChange}
            placeholder="Enter terms and conditions for this tour package..."
                rows={6}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black"
              />
        </div>
        
        {/* Save Button */}
        <div className="flex items-center justify-end space-x-4 bg-white rounded-lg shadow-sm p-6">
          {saving && (
            <div className="flex items-center text-black">
              <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-blue-500 mr-2"></div>
              <span>Saving changes...</span>
            </div>
          )}
          {uploadProgress > 0 && uploadProgress < 100 && (
            <div className="text-black">
              Uploading images: {uploadProgress}%
            </div>
          )}
          <button
            type="button"
            onClick={() => router.push(`/dashboard/tours/${id}`)}
            className="px-6 py-2.5 border border-gray-300 text-black rounded-lg hover:bg-gray-50"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
} 
