'use client';

import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

// User type definition
type User = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive';
  joinedDate: string;
  lastLogin: string;
  photoURL?: string;
  createdAt?: any;
  age?: string;
  address?: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const router = useRouter();

  // Function to format dates
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Unknown';
    try {
      // If it's a Firebase Timestamp with toDate method
      if (timestamp && typeof timestamp.toDate === 'function') {
        return new Date(timestamp.toDate()).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      } 
      // If it's a JavaScript Date object
      else if (timestamp instanceof Date) {
        return timestamp.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // If it's a number (seconds or milliseconds since epoch)
      else if (typeof timestamp === 'number') {
        return new Date(timestamp.toString().length > 10 ? timestamp : timestamp * 1000).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      // If it's an ISO string
      else if (typeof timestamp === 'string') {
        return new Date(timestamp).toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error);
    }
    
    return 'Unknown';
  };

  // Fetch users from Firestore
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const usersCollection = collection(db, 'users');
        const userSnapshot = await getDocs(usersCollection);
        
        const userData: User[] = userSnapshot.docs.map(doc => {
          const data = doc.data();
          
          // Helper function to handle different timestamp formats
          const formatTimestamp = (timestamp: any) => {
            if (!timestamp) return 'Unknown';
            
            try {
              // If it's a Firebase Timestamp with toDate method
              if (timestamp && typeof timestamp.toDate === 'function') {
                return new Date(timestamp.toDate()).toISOString().split('T')[0];
              } 
              // If it's a JavaScript Date object
              else if (timestamp instanceof Date) {
                return timestamp.toISOString().split('T')[0];
              }
              // If it's a number (seconds or milliseconds since epoch)
              else if (typeof timestamp === 'number') {
                return new Date(timestamp.toString().length > 10 ? timestamp : timestamp * 1000).toISOString().split('T')[0];
              }
              // If it's an ISO string
              else if (typeof timestamp === 'string') {
                return new Date(timestamp).toISOString().split('T')[0];
              }
            } catch (error) {
              console.error('Error formatting timestamp:', error);
            }
            
            return 'Unknown';
          };
          
          return {
            id: doc.id,
            name: data.fullName || 'Unknown',
            email: data.email || '',
            role: data.role || 'user',
            status: data.status || 'active',
            joinedDate: formatTimestamp(data.createdAt),
            lastLogin: formatTimestamp(data.lastLoginAt),
            age: data.age || '',
            address: data.address || '',
          };
        });
        
        // Filter out admin users - only show regular users
        const filteredUserData = userData.filter(user => user.role === 'user');
        setUsers(filteredUserData);
      } catch (error) {
        console.error('Error fetching users:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUsers();
  }, []);

  // Filter users based on search term, role and status
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' ? true : user.role === filterRole;
    const matchesStatus = filterStatus === 'all' ? true : user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Toggle user status (active/inactive)
  const toggleUserStatus = async (id: string) => {
    try {
      const userRef = doc(db, 'users', id);
      const userToUpdate = users.find(user => user.id === id);
      
      if (userToUpdate) {
        const newStatus = userToUpdate.status === 'active' ? 'inactive' : 'active';
        await updateDoc(userRef, { status: newStatus });
        
        // Update state
        setUsers(users.map(user => 
          user.id === id ? { ...user, status: newStatus } : user
        ));
      }
    } catch (error) {
      console.error('Error updating user status:', error);
    }
  };

  // Handle view user details
  const handleViewUser = (user: User) => {
    setSelectedUser(user);
  };

  // Navigate to user bookings
  const navigateToBookings = (userId: string) => {
    router.push(`/dashboard/bookings?userId=${userId}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-semibold text-gray-900">Users</h1>
        <div className="flex space-x-2">
            <div className="relative">
              <input
              type="text"
                placeholder="Search users..."
              className="pl-10 pr-4 py-2 rounded-md bg-white border border-gray-300 text-gray-900 w-64"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
              <select
            className="px-4 py-2 rounded-md bg-white border border-gray-300 text-gray-900"
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as 'all' | 'user' | 'admin')}
              >
            <option value="all">All Roles</option>
            <option value="user">User</option>
            <option value="admin">Admin</option>
              </select>
            </div>
          </div>

      {loading ? (
        <div className="flex justify-center items-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md border border-gray-300 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="p-6 text-center">
              <p className="text-gray-900">No users found.</p>
            </div>
          ) : (
        <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead className="bg-gray-50">
              <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Email
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Role
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Joined
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Actions
                    </th>
              </tr>
            </thead>
                <tbody className="bg-white divide-y divide-gray-700">
                  {filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                          {user.photoURL ? (
                            <img className="h-10 w-10 rounded-full mr-3" src={user.photoURL} alt="" />
                          ) : (
                            <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center mr-3">
                              <span className="text-gray-700 uppercase">{user.name ? user.name.charAt(0) : user.email?.charAt(0)}</span>
                        </div>
                          )}
                          <div className="text-sm font-medium text-gray-900">{user.name || 'Anonymous User'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'
                        }`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-700">{formatDate(user.createdAt)}</div>
                    </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          onClick={() => handleViewUser(user)}
                          className="text-blue-400 hover:text-blue-300"
                        >
                          View
                        </button>
                    </td>
                  </tr>
                  ))}
            </tbody>
          </table>
            </div>
          )}
        </div>
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-gray-300">
            <div className="px-6 py-4 border-b border-gray-300">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">User Details</h3>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="text-gray-400 hover:text-gray-900"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="flex items-center mb-6">
                {selectedUser.photoURL ? (
                  <img className="h-20 w-20 rounded-full mr-4" src={selectedUser.photoURL} alt="" />
                ) : (
                  <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center mr-4">
                    <span className="text-2xl text-gray-700 uppercase">{selectedUser.name ? selectedUser.name.charAt(0) : selectedUser.email?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <h4 className="text-xl font-semibold text-gray-900">{selectedUser.name || 'Anonymous User'}</h4>
                  <p className="text-gray-700">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">User ID</h4>
                  <p className="text-sm text-gray-700 bg-gray-50 p-2 rounded">{selectedUser.id}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Role</h4>
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    selectedUser.role === 'admin' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'
                  }`}>
                    {selectedUser.role}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Joined</h4>
                  <p className="text-sm text-gray-700">{formatDate(selectedUser.createdAt)}</p>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-gray-400 mb-1">Last Login</h4>
                  <p className="text-sm text-gray-700">{selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Never'}</p>
                </div>
              </div>
              
              <div className="border-t border-gray-300 pt-4">
                <div className="flex justify-center">
                  <button
                    onClick={() => {
                      setSelectedUser(null);
                      navigateToBookings(selectedUser.id);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-gray-900 rounded-md"
                  >
                    View Bookings
                  </button>
                </div>
              </div>
            </div>
        </div>
      </div>
      )}
    </div>
  );
} 