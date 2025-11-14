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
    
    // Try environment variable first (for Vercel/production)
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      } catch (err) {
        console.error('❌ Error parsing FIREBASE_SERVICE_ACCOUNT:', err);
      }
    }
    
    // Try loading from file path (for local development)
    if (!serviceAccount) {
      try {
        const fs = require('fs');
        const path = require('path');
        
        // Try multiple possible paths
        const possiblePaths = [
          path.join(process.cwd(), '..', 'backend', 'go-smart-travel-app-firebase-adminsdk-fbsvc-e0998c1e3a.json'),
          path.join(process.cwd(), 'backend', 'go-smart-travel-app-firebase-adminsdk-fbsvc-e0998c1e3a.json'),
          path.join(process.cwd(), '..', '..', 'backend', 'go-smart-travel-app-firebase-adminsdk-fbsvc-e0998c1e3a.json'),
          path.join(process.cwd(), 'go-smart-travel-app-firebase-adminsdk-fbsvc-e0998c1e3a.json'),
        ];
        
        for (const filePath of possiblePaths) {
          if (fs.existsSync(filePath)) {
            const fileContent = fs.readFileSync(filePath, 'utf8');
            serviceAccount = JSON.parse(fileContent);
            console.log('✅ Loaded Firebase Admin service account from:', filePath);
            break;
          }
        }
      } catch (err: any) {
        // Silently fail - will try other methods or return null
        console.log('ℹ️ Could not load Firebase Admin from file, will use env var if available');
      }
    }
    
    // If no service account, return null (will be handled gracefully)
    if (!serviceAccount) {
      console.warn('⚠️ Firebase Admin service account not found. In-app notifications will be skipped.');
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

