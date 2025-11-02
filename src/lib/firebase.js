// Import the functions you need from the SDKs
import { initializeApp, getApps } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAlYeNEwagNeP02I5PxahHp2BRy6NAnwDo",
  authDomain: "go-smart-travel-app.firebaseapp.com",
  projectId: "go-smart-travel-app",
  storageBucket: "go-smart-travel-app.firebasestorage.app",
  messagingSenderId: "564952605984",
  appId: "1:564952605984:web:e2260add2c6017f8f0a345",
  measurementId: "G-L3PRJMD35E"
};

// Initialize Firebase
let firebaseApp;

if (!getApps().length) {
  firebaseApp = initializeApp(firebaseConfig);
} else {
  firebaseApp = getApps()[0]; // if already initialized, use that one
}

// Initialize services
const db = getFirestore(firebaseApp);
const auth = getAuth(firebaseApp);

export { db, auth }; 