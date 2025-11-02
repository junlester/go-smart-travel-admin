'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { auth, db } from '@/configs/firebase';
import { signInWithEmailAndPassword, onAuthStateChanged, createUserWithEmailAndPassword, UserCredential, signOut } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import Cookies from 'js-cookie';

// Default admin credentials for testing - REMOVE IN PRODUCTION
const DEFAULT_ADMIN_EMAIL = 'admin@gosmarttravel.com';
const DEFAULT_ADMIN_PASSWORD = 'admin12345';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [adminCreated, setAdminCreated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Clear any existing auth when login page loads
    const clearExistingAuth = async () => {
      console.log('Login page loaded - clearing any existing auth state');
      // Clear cookies
      Cookies.remove('authToken');
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
          
      // Clear storage
      localStorage.clear();
      sessionStorage.clear();
      
      // Force Firebase signout
      try {
        await signOut(auth);
        } catch (err) {
        console.error('Error signing out from Firebase:', err);
      }
    };
    
    clearExistingAuth();
    
    // Check URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const isLogout = urlParams.get('logout') === 'true';
    const isFresh = urlParams.get('fresh') === 'true';
    
    // Handle fresh parameter (coming from root page)
    if (isFresh) {
      console.log('Fresh session requested, ensuring clean auth state');
      setMessage('Selamat datang sa Go Smart Travel Admin Panel');
      // Remove parameter from URL without reload
      window.history.replaceState({}, document.title, '/login');
    }
    
    // Handle logout parameter
    if (isLogout) {
      console.log('Logout parameter detected');
      setMessage('Successfully logged out');
      // Remove logout parameter from URL without reload
      window.history.replaceState({}, document.title, '/login');
    }

    // Try to create default admin on page load
    createDefaultAdmin();
  }, []);

  // Function to create default admin if it doesn't exist
  const createDefaultAdmin = async () => {
    try {
      console.log('Attempting to create default admin...');
      let userCredential: UserCredential | undefined;
      
      try {
        userCredential = await createUserWithEmailAndPassword(auth, DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD);
        console.log('Default admin created successfully');
      } catch (err: any) {
        // If error is "auth/email-already-in-use", that's fine - admin already exists
        if (err.code === 'auth/email-already-in-use') {
          console.log('Admin account already exists');
          setAdminCreated(true);
            return;
        } else {
          console.error('Error creating default admin:', err);
          return;
        }
      }
      
      // Set admin role in Firestore if we have a user
      if (userCredential?.user) {
        const userRef = doc(db, 'users', userCredential.user.uid);
        const userDoc = await getDoc(userRef);
        
        if (!userDoc.exists()) {
          await setDoc(userRef, {
            email: DEFAULT_ADMIN_EMAIL,
            role: 'admin',
            createdAt: new Date().toISOString(),
            status: 'active'
          });
          console.log('Admin user document created in Firestore');
        } else {
          console.log('Admin user document already exists in Firestore');
        }
        
        setAdminCreated(true);
        setMessage('Default admin account ready. You can now log in.');
      }
    } catch (err) {
      console.error('Unexpected error in createDefaultAdmin:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('Attempting to log in...');

    console.log(`Attempting login with: ${email}`);
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log('Login successful', userCredential);
      
      // Check if user has admin role in Firestore
      const userRef = doc(db, 'users', userCredential.user.uid);
      const userDoc = await getDoc(userRef);
      
      if (!userDoc.exists()) {
        // Create user document with admin role if using default admin
        if (email === DEFAULT_ADMIN_EMAIL) {
          await setDoc(userRef, {
            email: email,
            role: 'admin',
            createdAt: new Date().toISOString(),
            status: 'active'
          });
          console.log('Created admin user document in Firestore after login');
        } else {
          console.log('No user document found, but proceeding anyway');
        }
      } else {
        console.log('User document exists:', userDoc.data());
        
        // Verify role is admin
        if (userDoc.data().role !== 'admin') {
          await signOut(auth);
          setError('You do not have admin privileges');
          setLoading(false);
          return;
        }
      }
      
      // Get auth token and set cookie
      const token = await userCredential.user.getIdToken(true);
      Cookies.set('authToken', token, { expires: 1 });
      
      setMessage('Login successful! Redirecting to dashboard...');
      
      // Use window.location for a full page redirect to ensure cookies are properly set
      window.location.href = '/dashboard';
      
    } catch (err: any) {
      console.error('Login error:', err);
      
      // If login failed and we haven't tried to create default admin yet, do that
      if (!adminCreated && email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
        setMessage('Trying to create default admin account...');
        try {
          await createDefaultAdmin();
          // Try logging in again
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          console.log('Login successful after creating admin', userCredential);
          
          // Get auth token and set cookie
          const token = await userCredential.user.getIdToken();
          Cookies.set('authToken', token, { expires: 1 });
          
          setMessage('Login successful! Redirecting to dashboard...');
          
          // Use window.location for a full page redirect
          window.location.href = '/dashboard';
          return;
        } catch (createErr) {
          console.error('Error after creating admin:', createErr);
          setError('Failed to create default admin account.');
        }
      }
      
      // Handle different Firebase error codes
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email format');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many failed login attempts. Please try again later.');
      } else {
        setError(`An error occurred: ${err.message || err.code}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex overflow-hidden bg-gray-900">
      {/* Left side - styled like dashboard sidebar */}
      <div className="hidden md:flex md:w-2/5 bg-white text-gray-800 flex-col justify-center items-center p-10">
        <div className="mb-8 flex flex-col items-center">
          {/* Logo implementation matching dashboard layout.tsx */}
          <div className="flex items-center justify-center">
            <div className="w-16 h-16 relative mr-2">
              <Image 
                src="/assets/images/logo.png" 
                alt="Go Smart Travel Logo" 
                width={100} 
                height={100} 
                className="object-contain"
              />
            </div>
            <span className="text-gray-800 text-2xl mx-2 font-semibold">Admin Panel</span>
          </div>
        </div>
        <p className="text-center text-gray-600 max-w-md">
          Manage service providers, track user activity, and monitor service requests from one central dashboard.
        </p>
      </div>
      
      {/* Right side - Login form */}
      <div className="w-full md:w-3/5 flex items-center justify-center bg-gray-900 px-4">
        <div className="max-w-md w-full">
          {/* Mobile logo (visible only on small screens) */}
          <div className="md:hidden flex flex-col items-center mb-8">
            <div className="flex items-center">
              <div className="w-12 h-12 relative mr-2">
                <Image 
                  src="/assets/images/logo.png" 
                  alt="Go Smart Travel Logo" 
                  width={80} 
                  height={80} 
                  className="object-contain"
                />
              </div>
              <span className="text-white text-xl mx-2 font-semibold">Admin</span>
            </div>
          </div>
          
          <div className="bg-white shadow-lg rounded-lg px-8 pt-6 pb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-1 text-center">Welcome Back!</h2>
            <p className="text-gray-600 mb-6 text-center">Login to your admin account</p>
            
            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {message && (
              <div className="bg-blue-50 border-l-4 border-blue-500 p-4 mb-4">
                <div className="flex">
                  <div className="ml-3">
                    <p className="text-sm text-blue-700">{message}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="email" className="block text-gray-700 text-sm font-medium mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                    </svg>
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 block w-full rounded-md border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm sm:leading-6 bg-gray-50"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-gray-700 text-sm font-medium mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                  </div>
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 block w-full rounded-md border-0 py-2.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-green-500 sm:text-sm sm:leading-6 bg-gray-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 hover:text-gray-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400 hover:text-gray-600">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="mb-6"></div>

              <div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-500 hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all duration-200"
                >
                  {loading ? 'Signing in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 