// Import the functions you need from the SDKs you need
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAlYeNEwagNeP02I5PxahHp2BRy6NAnwDo",
  authDomain: "go-smart-travel-app.firebaseapp.com",
  projectId: "go-smart-travel-app",
  storageBucket: "go-smart-travel-app.firebasestorage.app",
  messagingSenderId: "564952605984",
  appId: "1:564952605984:web:e2260add2c6017f8f0a345",
  measurementId: "G-L3PRJMD35E"
};

// Initialize Firebase only if no apps have been initialized
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Initialize Analytics - only in browser environment
let analytics = null;
if (typeof window !== 'undefined') {
  // Check if analytics is supported before initializing
  isSupported().then(supported => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { app, auth, db, storage, analytics }; 