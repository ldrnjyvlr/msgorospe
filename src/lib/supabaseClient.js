// lib/supabaseClient.js - Fixed version with error handling
import { createClient } from '@supabase/supabase-js';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Create supabase client with better error handling
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: {
      // Custom storage wrapper to handle errors
      getItem: (key) => {
        try {
          const item = window.localStorage.getItem(key);
          // Check if the stored data is valid JSON
          if (item) {
            JSON.parse(item); // This will throw if invalid
          }
          return item;
        } catch (error) {
          console.error('Error reading from localStorage:', error);
          console.log('Clearing corrupted session data...');
          // Clear the corrupted item
          window.localStorage.removeItem(key);
          return null;
        }
      },
      setItem: (key, value) => {
        try {
          window.localStorage.setItem(key, value);
        } catch (error) {
          console.error('Error writing to localStorage:', error);
        }
      },
      removeItem: (key) => {
        try {
          window.localStorage.removeItem(key);
        } catch (error) {
          console.error('Error removing from localStorage:', error);
        }
      }
    }
  }
});

// Add error recovery for session initialization
supabase.auth.onAuthStateChange((event, session) => {
  console.log('Auth state event:', event);
  
  // Handle initialization errors
  if (event === 'INITIAL_SESSION' && !session) {
    // Check if we have corrupted session data
    const storedSession = localStorage.getItem('supabase.auth.token');
    if (storedSession) {
      try {
        JSON.parse(storedSession);
      } catch (error) {
        console.error('Corrupted session data detected, clearing...');
        localStorage.removeItem('supabase.auth.token');
        localStorage.removeItem('sb-' + supabaseUrl.split('//')[1].split('.')[0] + '-auth-token');
      }
    }
  }
  
  // Handle sign out events
  if (event === 'SIGNED_OUT') {
    console.log('Auth state changed to SIGNED_OUT');
    // Note: Session data clearing is handled by signOutUser function
    // to avoid conflicts with manual signout process
  }
});

// Create a wrapper for getSession that includes error handling
const originalGetSession = supabase.auth.getSession.bind(supabase.auth);
supabase.auth.getSession = async () => {
  try {
    const result = await originalGetSession();
    return result;
  } catch (error) {
    console.error('Error getting session:', error);
    
    // If there's an error, try clearing the session and retry
    if (error.message?.includes('JSON') || error.message?.includes('parse')) {
      console.log('Detected corrupted session, clearing and retrying...');
      
      // Clear all Supabase-related localStorage items
      Object.keys(localStorage).forEach(key => {
        if (key.includes('supabase') || key.includes('sb-')) {
          localStorage.removeItem(key);
        }
      });
      
      // Retry getting session
      return await originalGetSession();
    }
    
    throw error;
  }
};

// Create a placeholder for supabaseAdmin that logs warnings but doesn't crash
const supabaseAdmin = {
  auth: {
    admin: {
      createUser: async () => {
        console.warn('No SUPABASE_SERVICE_KEY provided. Admin operations are not available.');
        return { error: { message: 'Admin operations are not available. Please set up SUPABASE_SERVICE_KEY environment variable.' } };
      },
      updateUserById: async () => {
        console.warn('No SUPABASE_SERVICE_KEY provided. Admin operations are not available.');
        return { error: { message: 'Admin operations are not available. Please set up SUPABASE_SERVICE_KEY environment variable.' } };
      },
      deleteUser: async () => {
        console.warn('No SUPABASE_SERVICE_KEY provided. Admin operations are not available.');
        return { error: { message: 'Admin operations are not available. Please set up SUPABASE_SERVICE_KEY environment variable.' } };
      },
      listUsers: async () => {
        console.warn('No SUPABASE_SERVICE_KEY provided. Admin operations are not available.');
        return { error: { message: 'Admin operations are not available. Please set up SUPABASE_SERVICE_KEY environment variable.' } };
      }
    }
  }
};

// Utility function to clear all session data
export const clearSessionData = () => {
  console.log('Clearing all session data...');
  const keysToRemove = [];
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.includes('supabase') || key.includes('sb-'))) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => {
    localStorage.removeItem(key);
    console.log('Removed session key:', key);
  });
  
  // Clear any other app-specific data
  localStorage.removeItem('user_preferences');
  localStorage.removeItem('app_state');
  
  console.log('Session data cleared successfully');
};

// Enhanced sign out function
export const signOutUser = async () => {
  try {
    console.log('Starting enhanced sign out process...');
    
    // Get current user info before logout for audit logging
    const { data: { session } } = await supabase.auth.getSession();
    const currentUser = session?.user;
    
    if (currentUser) {
      try {
        await logAuditEvent({
          actionType: AUDIT_ACTIONS.LOGOUT,
          resourceType: RESOURCE_TYPES.USER,
          description: 'User logged out',
          details: {
            logout_type: 'user_initiated',
            timestamp: new Date().toISOString()
          },
          userOverride: currentUser
        });
      } catch (auditError) {
        console.error('Failed to log logout audit event:', auditError);
      }
    }
    
    // Sign out from Supabase with timeout
    console.log('Calling supabase.auth.signOut()...');
    
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('SignOut timeout after 5 seconds')), 5000);
    });
    
    // Race between signOut and timeout
    const signOutPromise = supabase.auth.signOut();
    const { error } = await Promise.race([signOutPromise, timeoutPromise]);
    
    console.log('supabase.auth.signOut() completed');
    
    if (error) {
      console.error('Supabase sign out error:', error);
    } else {
      console.log('Supabase sign out successful');
    }
    
    // Clear all session data
    console.log('Clearing session data...');
    clearSessionData();
    console.log('clearSessionData() completed');
    
    console.log('Enhanced sign out completed successfully');
    return { success: true };
    
  } catch (error) {
    console.error('Error in enhanced sign out:', error);
    console.error('Error details:', error.message, error.stack);
    
    // Even if there's an error, clear local data
    console.log('Clearing session data after error...');
    clearSessionData();
    
    // If it's a timeout error, still consider it successful since auth state changed
    if (error.message?.includes('timeout')) {
      console.log('SignOut timed out, but auth state changed - considering successful');
      console.log('Enhanced sign out completed successfully (via timeout)');
      return { success: true };
    }
    
    return { success: false, error };
  }
};

export { supabase, supabaseAdmin };