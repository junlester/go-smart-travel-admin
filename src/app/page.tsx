'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";
import { auth } from '@/configs/firebase';
import { signOut } from 'firebase/auth';
import Cookies from 'js-cookie';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Clear auth state on root page visit
    const checkAuthAndRedirect = async () => {
      try {
        console.log('Root page accessed, ensuring clean authentication state');
        
        // Clear all cookies
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
          console.log('Firebase signed out successfully');
        } catch (signOutError) {
          console.error('Error signing out from Firebase:', signOutError);
        }
        
        // Force redirect to login page with parameter to indicate fresh session
        console.log('Redirecting to login page...');
        window.location.href = '/login?fresh=true';
      } catch (error) {
        console.error('Error in root page redirect:', error);
        // Fallback to client-side routing
        router.push('/login?fresh=true');
      }
    };
    
    checkAuthAndRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-800">Go Smart Travel</h1>
        <p className="mt-2 text-gray-600">Nire-redirect sa admin panel login...</p>
        <div className="mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
