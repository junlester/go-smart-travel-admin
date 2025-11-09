// Firebase Admin SDK configuration for server-side operations
// Lazy initialization to prevent build-time errors
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getApps, initializeApp, cert } from 'firebase-admin/app';

// Lazy initialization - only initialize when actually needed
let adminDb: ReturnType<typeof getFirestore> | null = null;
let isAdminInitialized = false;

function initializeAdminFirestore() {
  // Skip initialization during build time
  const isBuildTime = 
    process.env.NEXT_PHASE === 'phase-production-build' ||
    process.env.NEXT_PHASE === 'phase-export' ||
    (typeof process !== 'undefined' && process.env.VERCEL === '1' && !process.env.VERCEL_ENV) ||
    (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.VERCEL_ENV);
  
  if (isBuildTime) {
    return null;
  }

  // Skip if already initialized
  if (isAdminInitialized && adminDb) {
    return adminDb;
  }

  // Initialize Firebase Admin if not already initialized
  if (!getApps().length) {
    let serviceAccount: any = null;
    
    // Try environment variable first (for Vercel)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (err) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT:', err);
      }
    }
    
    // If no service account, return null (will be handled gracefully)
    if (!serviceAccount) {
      return null;
    }
    
    try {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: "go-smart-travel-app"
      });
      isAdminInitialized = true;
    } catch (error: any) {
      console.error('❌ Error initializing Firebase Admin:', error.message);
      return null;
    }
  }

  // Get Firestore instance
  try {
    adminDb = getFirestore();
    isAdminInitialized = true;
    return adminDb;
  } catch (error: any) {
    console.error('❌ Error getting Firestore instance:', error.message);
    return null;
  }
}

// Lazy getter for adminDb - only initializes when called
export function getAdminDb() {
  if (!adminDb) {
    adminDb = initializeAdminFirestore();
  }
  return adminDb;
}

export { FieldValue };

// Simple approach: Just export the getter function
// Routes should use getAdminDb() instead of direct adminDb access
// This ensures lazy initialization and prevents build-time errors

