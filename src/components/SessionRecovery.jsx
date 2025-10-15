// components/SessionRecovery.jsx
import React, { useState } from 'react';
import { supabase, clearSessionData } from '../lib/supabaseClient';

const SessionRecovery = () => {
  const [isClearing, setIsClearing] = useState(false);
  const [status, setStatus] = useState('');

  const clearCorruptedSession = async () => {
    setIsClearing(true);
    setStatus('Clearing corrupted session data...');
    
    try {
      // Use the utility function to clear session data
      clearSessionData();
      
      setStatus('Session cleared. Signing out...');
      
      // Sign out from Supabase to ensure clean state
      await supabase.auth.signOut();
      
      setStatus('Session cleared. Refreshing...');
      
      // Wait a moment then refresh
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
      
    } catch (error) {
      console.error('Error clearing session:', error);
      setStatus('Error occurred. Please try refreshing the page.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="d-flex flex-column align-items-center justify-content-center" style={{ minHeight: '200px' }}>
      <h5>Session Recovery</h5>
      <p className="text-muted">If you're experiencing loading issues, try clearing your session:</p>
      
      <button 
        className="btn btn-warning mb-3"
        onClick={clearCorruptedSession}
        disabled={isClearing}
      >
        {isClearing ? 'Clearing...' : 'Clear Session and Restart'}
      </button>
      
      {status && (
        <div className="alert alert-info">
          {status}
        </div>
      )}
      
      <div className="mt-3">
        <small className="text-muted">
          This will log you out and clear any corrupted session data.
        </small>
      </div>
    </div>
  );
};

export default SessionRecovery;