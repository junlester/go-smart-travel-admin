// Firebase Admin SDK configuration for server-side operations
// Reuse the same Firebase Admin SDK initialization from fcmService.ts
// This ensures we don't initialize multiple times and use the same credentials
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Import fcmService to ensure Firebase Admin SDK is initialized
// fcmService.ts already initializes Firebase Admin SDK, so we just reuse it
import '../utils/fcmService';

// Get Firestore instance (will use the already initialized Firebase Admin SDK)
const adminDb = getFirestore();

export { adminDb, FieldValue };

