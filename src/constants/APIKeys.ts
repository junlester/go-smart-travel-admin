// API Keys for external services

// Google Maps API Key - Use the same key as the mobile app
export const GOOGLE_MAPS_API_KEY = 'AIzaSyB-beHQLrGvIsZsJunsDgC4FK5ZG10GwBA';

// Cloudinary configuration
export const CLOUDINARY_CLOUD_NAME = 'dqmuvzzl2';
export const CLOUDINARY_UPLOAD_PRESET = 'admin_upload';
export const CLOUDINARY_API_KEY = '333151125593196';

// TextBee.dev SMS Gateway configuration
// Get your API key and Device ID from https://textbee.dev/dashboard
// API Key: Found in your TextBee dashboard under API Settings
// Device ID: Found in your TextBee dashboard after registering your Android device
export const TEXTBEE_API_KEY = process.env.TEXTBEE_API_KEY || 'YOUR_TEXTBEE_API_KEY';
export const TEXTBEE_DEVICE_ID = process.env.TEXTBEE_DEVICE_ID || 'YOUR_TEXTBEE_DEVICE_ID';
export const TEXTBEE_API_URL = process.env.TEXTBEE_API_URL || 'https://api.textbee.dev/api/v1';

// Google Gemini AI configuration for Chatbot
// Get your API key from: https://makersuite.google.com/app/apikey
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyARYoyynt2iuRZ-GHG7QDEY_z4TTclW_9k'; 