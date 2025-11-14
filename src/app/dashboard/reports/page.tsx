'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Report card component
const ReportCard = ({ title, description, icon, href }: { 
  title: string; 
  description: string; 
  icon: React.ReactNode;
  href: string;
}) => (
  <Link 
    href={href}
    className="bg-white rounded-lg p-6 shadow-md hover:shadow-lg transition-all duration-200 border border-gray-300 hover:border-green-500 flex flex-col"
  >
    <div className="flex items-center mb-4">
      <div className="p-3 rounded-full bg-green-500 bg-opacity-20 text-green-500 mr-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
    </div>
    <p className="text-gray-700 text-sm flex-grow">{description}</p>
    <div className="mt-4 text-green-400 font-medium text-sm flex items-center">
      View Report
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    </div>
  </Link>
);

// Report icons
const BookingIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
  </svg>
);

const CustomerIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

const RevenueIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const DestinationIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const PaymentIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);

export default function ReportsPage() {
  return (
    <div>
      <h1 className="text-3xl font-semibold text-gray-900 mb-6">Reports</h1>
      <p className="text-gray-700 mb-8">View and export detailed reports about your business performance, customer activity, and more.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ReportCard 
          title="Booking Summary" 
          description="View comprehensive booking trends, including total bookings, completion rate, and booking sources."
          icon={<BookingIcon />}
          href="/dashboard/reports/booking-summary"
        />
        
        <ReportCard 
          title="Revenue Report" 
          description="Track your financial performance, revenue growth, and sales forecasts."
          icon={<RevenueIcon />}
          href="/dashboard/reports/revenue"
        />
        
        <ReportCard 
          title="Popular Destinations" 
          description="Discover which destinations are trending based on bookings and customer searches."
          icon={<DestinationIcon />}
          href="/dashboard/reports/popular-destinations"
        />
        
        <ReportCard 
          title="Payment History" 
          description="Review payment transactions, methods, and reconciliation reports."
          icon={<PaymentIcon />}
          href="/dashboard/reports/payment-history"
        />
      </div>
    </div>
  );
} 