'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';

// Simple icons
const DashboardIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M2 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H3a1 1 0 01-1-1V4zM8 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1H9a1 1 0 01-1-1V4zM15 3a1 1 0 00-1 1v12a1 1 0 001 1h2a1 1 0 001-1V4a1 1 0 00-1-1h-2z" />
  </svg>
);

const ToursIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
  </svg>
);

const BookingsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
  </svg>
);

const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
  </svg>
);

const ReportsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm2 10a1 1 0 10-2 0v3a1 1 0 102 0v-3zm5-1a1 1 0 00-1 1v3a1 1 0 102 0v-3a1 1 0 00-1-1zm-2-2a1 1 0 011-1h.01a1 1 0 110 2H12a1 1 0 01-1-1z" clipRule="evenodd" />
  </svg>
);

const NotificationsIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 4.414A1 1 0 0014.414 7L12 9.414 9.586 7a1 1 0 00-1.414 1.414L10.586 11 8.172 13.414a1 1 0 001.414 1.414L12 12.414l2.414 2.414a1 1 0 001.414-1.414L13.414 11l2.414-2.414A1 1 0 0015.828 7.414L13.414 9.828 11 7.414z" clipRule="evenodd" />
  </svg>
);

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, loading, signOut } = useAuth();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading) {
      if (!currentUser) {
        console.log('No authenticated user detected in dashboard layout, redirecting to login page');
        // Clear any authentication data first
        localStorage.removeItem('user');
        sessionStorage.clear();
        document.cookie.split(";").forEach(function(c) {
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
        });
        
        // Then force redirect to login page
        window.location.href = '/login?logout=true';
      } else {
        console.log('Authenticated user detected:', currentUser.email);
      }
    }
  }, [currentUser, loading]);

  // Wait for auth check to complete
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: <DashboardIcon /> },
    { name: 'Tours', href: '/dashboard/tours', icon: <ToursIcon /> },
    { name: 'Bookings', href: '/dashboard/bookings', icon: <BookingsIcon /> },
    { name: 'Users', href: '/dashboard/users', icon: <UsersIcon /> },
    { name: 'Notifications', href: '/dashboard/notifications', icon: <NotificationsIcon /> },
    { name: 'Reports', href: '/dashboard/reports', icon: <ReportsIcon /> },
  ];

  const isActiveLink = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard';
    }
    return pathname === path;
  };

  const handleLogout = async () => {
    try {
      console.log('Logout initiated from dashboard');
      
      // First disable elements to prevent multiple clicks
      const logoutButton = document.querySelector('[data-logout-button]');
      if (logoutButton) {
        (logoutButton as HTMLButtonElement).disabled = true;
        (logoutButton as HTMLButtonElement).textContent = 'Logging out...';
      }
      
      // Then proceed with logout
    await signOut();
    } catch (error) {
      console.error('Error during logout:', error);
      // Emergency fallback - force redirect to login
      window.location.href = '/login?logout=true';
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar */}
      <div 
        className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-30 w-64 transition duration-300 transform bg-gray-800 shadow-lg md:translate-x-0 md:static md:inset-y-0`}
      >
        <div className="flex items-center justify-center mt-8">
          <div className="flex items-center">
            <div className="w-16 h-16 relative mr-2">
              <Image 
                src="/assets/images/logo.png" 
                alt="Go Smart Travel Logo" 
                width={100} 
                height={100} 
                className="object-contain"
              />
            </div>
            <span className="text-white text-2xl mx-2 font-semibold">Admin</span>
          </div>
        </div>

        <nav className="mt-10">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center px-6 py-2 mt-4 ${
                isActiveLink(item.href)
                  ? 'bg-green-500 text-white shadow-md'
                  : 'text-gray-300 hover:bg-green-500 hover:bg-opacity-70 hover:text-white'
              } transition-colors duration-200`}
            >
              {item.icon}
              <span className="mx-3">{item.name}</span>
            </Link>
          ))}
          
          {/* Logout button placed within the navigation menu */}
          <button 
            onClick={handleLogout} 
            data-logout-button
            className="flex items-center px-6 py-2 mt-4 text-gray-300 hover:bg-red-500 hover:text-white w-full transition-colors duration-200"
          >
            <LogoutIcon />
            <span className="mx-3">Logout</span>
          </button>
        </nav>
      </div>

      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Main content */}
        <main className="flex-1 overflow-auto bg-gray-100">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
} 