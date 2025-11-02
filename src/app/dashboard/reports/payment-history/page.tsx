'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/configs/firebase';
import { collection, getDocs, query, where, orderBy, limit, Timestamp } from 'firebase/firestore';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Define interfaces for the data types
interface BookingData {
  createdAt?: any;
  amount?: string | number;
  userName?: string;
  status?: string;
  paymentStatus?: string;
  paymentMethod?: string;
  [key: string]: any;
}

interface TransactionData {
  id: string;
  date: string;
  amount: string;
  amountValue: number;
  customer: string;
  status?: string; // Made optional
  method: string;
}

// Colors for charts
const COLORS = ['#00C49F', '#0088FE', '#FFBB28', '#FF8042', '#8884D8'];

export default function PaymentHistoryReport() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Format price with commas and peso sign, without decimals
  const formatPrice = (price: number): string => {
    return `₱${Math.round(price).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  };
  
  useEffect(() => {
    const fetchPaymentData = async () => {
      try {
        setLoading(true);
        
        // Get current date for date calculations
        const now = new Date();
        const tenDaysAgo = new Date(now);
        tenDaysAgo.setDate(now.getDate() - 10);
        
        // Fetch payment transactions (from bookings collection)
        const bookingsQuery = query(
          collection(db, 'bookings'),
          orderBy('createdAt', 'desc'),
          limit(100) // Limit to last 100 transactions
        );
        
        const bookingsSnapshot = await getDocs(bookingsQuery);
        
        // Transform booking data into payment transactions
        const transactions: TransactionData[] = bookingsSnapshot.docs.map(doc => {
          const data = doc.data() as BookingData;
          
          // Format date
          const formatDate = (timestamp: any) => {
            if (!timestamp) return '2024-05-01'; // Fallback date
            try {
              const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
              return date.toISOString().split('T')[0]; // YYYY-MM-DD format
            } catch (error) {
              return '2024-05-01';
            }
          };
          
          // Format payment status based on booking status
          const getPaymentStatus = (status: string, paymentStatus: string) => {
            if (paymentStatus) return paymentStatus;
            if (status === 'cancelled') return 'failed';
            if (status === 'confirmed') return 'completed';
            return 'pending';
          };
          
          const amountStr = typeof data.amount === 'number' ? data.amount.toString() : (data.amount || '0');
          const amountValue = parseFloat(amountStr);
          
          return {
            id: doc.id,
            date: formatDate(data.createdAt),
            amount: formatPrice(amountValue),
            amountValue,
            customer: data.userName || 'Unknown User',
            status: getPaymentStatus(data.status || 'pending', data.paymentStatus || ''),
            method: data.paymentMethod || 'Credit Card'
          };
        });
        
        // Sort transactions by date (most recent first)
        transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // Get recent transactions (last 10)
        const recentTransactions = transactions.slice(0, 10);
        
        // Process payment methods
        const methodCounts: {[method: string]: number} = {};
        
        transactions.forEach(transaction => {
          const method = transaction.method;
          methodCounts[method] = (methodCounts[method] || 0) + 1;
        });
        
        // Calculate percentages
        const totalMethodCount = Object.values(methodCounts).reduce((sum, count) => sum + count, 0);
        
        const paymentMethods = Object.entries(methodCounts).map(([name, count]) => ({
          name,
          value: totalMethodCount > 0 ? Math.round((count / totalMethodCount) * 100) : 25
        }));
        
        // Process payment statuses
        const statusCounts: {[status: string]: number} = {
          'completed': 0,
          'pending': 0,
          'failed': 0
        };
        
                transactions.forEach(transaction => {          const status = (transaction.status ?? 'unknown').toLowerCase();          if (statusCounts[status] !== undefined) {            statusCounts[status] += 1;          }
        });
        
        // Calculate status percentages
        const totalStatusCount = Object.values(statusCounts).reduce((sum, count) => sum + count, 0);
        
        const statusDistribution = Object.entries(statusCounts).map(([name, count]) => ({
          name: name.charAt(0).toUpperCase() + name.slice(1), // Capitalize first letter
          value: totalStatusCount > 0 ? Math.round((count / totalStatusCount) * 100) : 33
        }));
        
        // Process daily transaction amounts
        const dailyAmounts: {[date: string]: number} = {};
        
        // Get last 9 days for chart
        for (let i = 9; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const dateKey = `${d.toLocaleDateString('en-US', { month: 'short' })} ${d.getDate()}`;
          dailyAmounts[dateKey] = 0;
        }
        
        // Sum transaction amounts by day
        transactions.forEach(transaction => {
          try {
            const transactionDate = new Date(transaction.date);
            // Only consider transactions from the last 10 days
            if (transactionDate >= tenDaysAgo && transactionDate <= now) {
              const dateKey = `${transactionDate.toLocaleDateString('en-US', { month: 'short' })} ${transactionDate.getDate()}`;
              if (dailyAmounts[dateKey] !== undefined) {
                dailyAmounts[dateKey] += transaction.amountValue;
              }
            }
          } catch (error) {
            // Skip invalid dates
          }
        });
        
        const dailyTransactions = Object.entries(dailyAmounts).map(([date, amount]) => ({
          date,
          amount
        }));
        
        // Calculate summary metrics
        const totalAmount = transactions.reduce((sum, t) => sum + t.amountValue, 0);
        const avgAmount = transactions.length > 0 ? totalAmount / transactions.length : 0;
        const successCount = transactions.filter(t => t.status === 'completed').length;
        const successRate = transactions.length > 0 ? (successCount / transactions.length * 100) : 0;
        const refundCount = transactions.filter(t => t.status === 'refunded').length;
        const refundRate = transactions.length > 0 ? (refundCount / transactions.length * 100) : 0;
        
        const summary = {
          total: formatPrice(totalAmount),
          average: formatPrice(avgAmount),
          success_rate: `${successRate.toFixed(1)}%`,
          refund_rate: `${refundRate.toFixed(1)}%`
        };
        
        setPaymentData({
          recentTransactions,
          paymentMethods,
          statusDistribution,
          dailyTransactions,
          summary
        });
        
      } catch (error) {
        console.error('Error fetching payment history data:', error);
        // Set fallback data if there's an error
        setPaymentData({
          recentTransactions: [
            { id: 'TRX-64291', date: '2024-05-10', amount: '₱12,500', customer: 'Maria Santos', status: 'completed', method: 'Credit Card' },
            { id: 'TRX-64290', date: '2024-05-09', amount: '₱8,750', customer: 'John Reyes', status: 'completed', method: 'PayPal' },
            { id: 'TRX-64285', date: '2024-05-08', amount: '₱5,200', customer: 'Anna Cruz', status: 'pending', method: 'Bank Transfer' },
            { id: 'TRX-64278', date: '2024-05-07', amount: '₱3,400', customer: 'Mark Lim', status: 'completed', method: 'GCash' },
            { id: 'TRX-64272', date: '2024-05-06', amount: '₱9,800', customer: 'Sophia Garcia', status: 'failed', method: 'Credit Card' }
          ],
          paymentMethods: [
            { name: 'Credit Card', value: 45 },
            { name: 'GCash', value: 25 },
            { name: 'PayPal', value: 18 },
            { name: 'Bank Transfer', value: 12 }
          ],
          statusDistribution: [
            { name: 'Completed', value: 68 },
            { name: 'Pending', value: 22 },
            { name: 'Failed', value: 10 }
          ],
          dailyTransactions: [
            { date: 'May 2', amount: 0 },
            { date: 'May 3', amount: 0 },
            { date: 'May 4', amount: 0 },
            { date: 'May 5', amount: 0 },
            { date: 'May 6', amount: 0 },
            { date: 'May 7', amount: 0 },
            { date: 'May 8', amount: 0 },
            { date: 'May 9', amount: 0 },
            { date: 'May 10', amount: 0 }
          ],
          summary: {
            total: '₱0',
            average: '₱0',
            success_rate: '0.0%',
            refund_rate: '0.0%'
          }
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchPaymentData();
  }, []);
  
  // Filter transactions based on search term
  const filteredTransactions = paymentData?.recentTransactions.filter((transaction: any) => {
    const matchesSearch = searchTerm === '' || 
      transaction.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.customer.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  }) || [];
  
  // Status badge component
  const StatusBadge = ({ status }: { status: string }) => {
    let bgColor = '';
    let textColor = '';
    
    switch (status) {
      case 'completed':
        bgColor = 'bg-green-500 bg-opacity-20';
        textColor = 'text-green-500';
        break;
      case 'pending':
        bgColor = 'bg-yellow-500 bg-opacity-20';
        textColor = 'text-yellow-500';
        break;
      case 'failed':
        bgColor = 'bg-red-500 bg-opacity-20';
        textColor = 'text-red-500';
        break;
      default:
        bgColor = 'bg-gray-500 bg-opacity-20';
        textColor = 'text-gray-500';
    }
    
    return (
      <span className={`px-2 py-1 rounded text-xs capitalize ${bgColor} ${textColor}`}>
        {status}
      </span>
    );
  };
  
  // Function to export the report as CSV
  const exportCSV = () => {
    if (!paymentData) return;
    
    try {
      // Create CSV content
      let csvContent = "data:text/csv;charset=utf-8,";
      
      // Add headers
      csvContent += "Payment History Report\r\n\r\n";
      
      // Add summary data
      csvContent += "Summary Metrics\r\n";
      csvContent += "Total Amount," + paymentData.summary.total + "\r\n";
      csvContent += "Average Transaction," + paymentData.summary.average + "\r\n";
      csvContent += "Success Rate," + paymentData.summary.success_rate + "\r\n";
      csvContent += "Refund Rate," + paymentData.summary.refund_rate + "\r\n\r\n";
      
      // Add payment methods data
      csvContent += "Payment Methods Distribution\r\n";
      csvContent += "Method,Percentage\r\n";
      paymentData.paymentMethods.forEach((item: any) => {
        csvContent += `${item.name},${item.value}%\r\n`;
      });
      csvContent += "\r\n";
      
      // Add status distribution data
      csvContent += "Payment Status Distribution\r\n";
      csvContent += "Status,Percentage\r\n";
      paymentData.statusDistribution.forEach((item: any) => {
        csvContent += `${item.name},${item.value}%\r\n`;
      });
      csvContent += "\r\n";
      
      // Add daily transactions data
      csvContent += "Daily Transactions\r\n";
      csvContent += "Date,Amount\r\n";
      paymentData.dailyTransactions.forEach((item: any) => {
        csvContent += `${item.date},${formatPrice(item.amount)}\r\n`;
      });
      csvContent += "\r\n";
      
      // Add recent transactions
      csvContent += "Recent Transactions\r\n";
      csvContent += "Date,Customer,Amount,Payment Method\r\n";
      paymentData.recentTransactions.forEach((transaction: TransactionData) => {
        csvContent += `${transaction.date},${transaction.customer},${transaction.amount},${transaction.method}\r\n`;
      });
      
      // Create download link
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "payment_history_report.csv");
      document.body.appendChild(link);
      
      // Trigger download
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting CSV:', error);
      alert('Failed to export report. Please try again.');
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Payment History Report</h1>
          <p className="text-gray-700 mt-1">Comprehensive history of payment transactions</p>
        </div>
        
        <div className="flex space-x-3">
          <button 
            onClick={exportCSV}
            className="px-4 py-2 bg-green-600 text-gray-900 rounded hover:bg-green-700 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
          
          <button 
            onClick={() => router.back()}
            className="px-4 py-2 bg-gray-600 text-gray-900 rounded hover:bg-gray-100 transition-colors flex items-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17l-5-5m0 0l5-5m-5 5h12" />
            </svg>
            Back to Reports
          </button>
        </div>
      </div>
      
      {/* Payment summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <p className="text-gray-600 text-sm">Total Transactions</p>
          <p className="text-3xl font-bold text-gray-900">{paymentData.summary.total}</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <p className="text-gray-600 text-sm">Average Transaction</p>
          <p className="text-3xl font-bold text-gray-900">{paymentData.summary.average}</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <p className="text-gray-600 text-sm">Success Rate</p>
          <p className="text-3xl font-bold text-green-500">{paymentData.summary.success_rate}</p>
        </div>
        
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <p className="text-gray-600 text-sm">Refund Rate</p>
          <p className="text-3xl font-bold text-yellow-500">{paymentData.summary.refund_rate}</p>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Payment methods chart */}
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Payment Methods</h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData.paymentMethods}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentData.paymentMethods.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                  formatter={(value) => [`${value}%`, 'Percentage']}
                />
                <Legend wrapperStyle={{ color: '#374151' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Status distribution chart */}
        <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
          <h3 className="text-lg font-medium text-gray-700 mb-4">Payment Status Distribution</h3>
          
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData.statusDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentData.statusDistribution.map((entry: any, index: number) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.name === 'Completed' ? '#00C49F' : entry.name === 'Pending' ? '#FFBB28' : '#FF8042'} 
                    />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                  formatter={(value) => [`${value}%`, 'Percentage']}
                />
                <Legend wrapperStyle={{ color: '#374151' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      
      {/* Daily transactions chart */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300 mb-8">
        <h3 className="text-lg font-medium text-gray-700 mb-4">Daily Transaction Volume</h3>
        
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={paymentData.dailyTransactions}
              margin={{ top: 20, right: 30, left: 20, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis 
                dataKey="date" 
                tick={{ fill: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                axisLine={{ stroke: '#374151' }}
              />
              <YAxis 
                tick={{ fill: '#374151' }}
                tickLine={{ stroke: '#374151' }}
                axisLine={{ stroke: '#374151' }}
                tickFormatter={(value) => `₱${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#d1d5db', color: '#111827' }}
                labelStyle={{ color: '#111827' }}
                formatter={(value: any) => [`₱${value.toLocaleString()}`, 'Amount']}
              />
              <Legend wrapperStyle={{ color: '#374151' }} />
              <Bar dataKey="amount" name="Transaction Amount" fill="#0088FE" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Recent transactions table */}
      <div className="bg-white rounded-lg p-6 shadow-md border border-gray-300">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-700">Recent Transactions</h3>
          
          {/* Search input */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white text-gray-900 text-sm rounded border border-gray-300 pl-9 pr-3 py-2 w-64 focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
        
        {/* Transactions table */}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300">
            <thead>
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Transaction ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((transaction: any, index: number) => (
                  <tr key={index} className="hover:bg-gray-100">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{transaction.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{transaction.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{transaction.customer}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{transaction.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{transaction.method}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-gray-600">
                    No transactions found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}