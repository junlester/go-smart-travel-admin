'use client';

import React, { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import { 
  onAuthStateChanged, 
  signOut as firebaseSignOut,
  User 
} from 'firebase/auth';
import { auth, db } from '@/configs/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';

interface UserData {
  uid: string;
  email: string | null;
  isAdmin: boolean;
  name?: string;
  role?: string;
  photoURL?: string | null;
}

interface AuthContextType {
  currentUser: UserData | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          // Get additional user data from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              isAdmin: userData.role === 'admin',
              name: userData.name || user.displayName || 'User',
              role: userData.role || 'user',
              photoURL: user.photoURL,
            });
          } else {
            // If no additional data in Firestore, just use auth data
            setCurrentUser({
              uid: user.uid,
              email: user.email,
              isAdmin: user.email === 'admin@gosmarttravel.com', // Fallback admin check
              name: user.displayName || 'User',
              photoURL: user.photoURL,
            });
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          // Fallback to basic user info
          setCurrentUser({
            uid: user.uid,
            email: user.email,
            isAdmin: user.email === 'admin@gosmarttravel.com', // Fallback admin check
            name: user.displayName || 'User',
            photoURL: user.photoURL,
          });
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signOut = async () => {
    try {
      console.log('Initiating complete sign out process');
      
      // 1. Clear all cookies
      console.log('Clearing all cookies');
      Cookies.remove('authToken');
      document.cookie.split(";").forEach(function(c) {
        document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
      });
      
      // 2. Clear local/session storage
      console.log('Clearing all storage');
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Sign out from Firebase
      console.log('Signing out from Firebase');
      await firebaseSignOut(auth);
      
      // 4. Set current user to null
      console.log('Resetting current user state');
      setCurrentUser(null);
      
      // 5. Force redirect with logout parameter to trigger middleware logout handling
      console.log('Redirecting to login page with logout parameter');
      window.location.href = '/login?logout=true';
    } catch (error) {
      console.error('Error during sign out process:', error);
      // Even if there's an error, try to redirect to login
      window.location.href = '/login?logout=true';
    }
  };

  const value = {
    currentUser,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}; 