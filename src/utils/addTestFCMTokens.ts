import { db } from '@/configs/firebase';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';

/**
 * Add test FCM tokens to existing users for testing purposes
 */
export const addTestFCMTokens = async () => {
  try {
    console.log('🔧 Adding test FCM tokens to existing users...');
    
    // Fetch all users from Firebase
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    console.log(`📱 Found ${users.length} users in database`);
    
    // Generate test FCM tokens for each user
    const testTokens = [
      'dGVzdF90b2tlbl8xMjM0NTY3ODkwYWJjZGVmZ2hpams=', // Test token 1
      'dGVzdF90b2tlbl8yMzQ1Njc4OTBhYmNkZWZnaGlqazEy', // Test token 2
      'dGVzdF90b2tlbl8zNDU2Nzg5MGFiY2RlZmdoaWprMTIz', // Test token 3
      'dGVzdF90b2tlbl80NTY3ODkwYWJjZGVmZ2hpamsxMjM0', // Test token 4
      'dGVzdF90b2tlbl81Njc4OTBhYmNkZWZnaGlqazEyMzQ1'  // Test token 5
    ];
    
    let updatedCount = 0;
    
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const testToken = testTokens[i % testTokens.length]; // Cycle through test tokens
      
      try {
        // Update user document with FCM token
        await updateDoc(doc(db, 'users', user.id), {
          fcmToken: testToken,
          lastTokenUpdate: new Date().toISOString()
        });
        
        console.log(`✅ Added FCM token to user: ${user.email || user.fullName || user.id}`);
        updatedCount++;
      } catch (error) {
        console.error(`❌ Failed to update user ${user.id}:`, error);
      }
    }
    
    console.log(`🎉 Successfully added FCM tokens to ${updatedCount} users`);
    
    return {
      success: true,
      message: `Added FCM tokens to ${updatedCount} users`,
      updatedCount
    };
  } catch (error) {
    console.error('❌ Error adding test FCM tokens:', error);
    throw error;
  }
};

/**
 * Remove test FCM tokens from users (cleanup function)
 */
export const removeTestFCMTokens = async () => {
  try {
    console.log('🧹 Removing test FCM tokens from users...');
    
    // Fetch all users from Firebase
    const usersSnapshot = await getDocs(collection(db, 'users'));
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    
    let removedCount = 0;
    
    for (const user of users) {
      if (user.fcmToken && user.fcmToken.startsWith('dGVzdF90b2tlbl8')) {
        try {
          // Remove FCM token from user document
          await updateDoc(doc(db, 'users', user.id), {
            fcmToken: null,
            lastTokenUpdate: null
          });
          
          console.log(`✅ Removed test FCM token from user: ${user.email || user.fullName || user.id}`);
          removedCount++;
        } catch (error) {
          console.error(`❌ Failed to remove token from user ${user.id}:`, error);
        }
      }
    }
    
    console.log(`🎉 Successfully removed test FCM tokens from ${removedCount} users`);
    
    return {
      success: true,
      message: `Removed test FCM tokens from ${removedCount} users`,
      removedCount
    };
  } catch (error) {
    console.error('❌ Error removing test FCM tokens:', error);
    throw error;
  }
};
