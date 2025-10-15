// components/PatientProfileHandler.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';

const PatientProfileHandler = ({ user, onProfileLoaded }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [showDebug, setShowDebug] = useState(false);
  
  useEffect(() => {
    if (user) {
      checkAndCreateProfile();
    }
  }, [user]);
  
  const checkAndCreateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log("Checking profile for user ID:", user.id);
      
      // First try to get existing profile
      const { data: existingProfile, error: fetchError } = await supabase
        .from('personal_info')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      // If profile exists, return it
      if (existingProfile) {
        console.log("Found existing profile:", existingProfile);
        setPatientInfo(existingProfile);
        onProfileLoaded(existingProfile.id);
        return;
      }
      
      // Create new profile if it doesn't exist
      if (fetchError && fetchError.code === 'PGRST116') { // No rows returned
        console.log("No profile found, creating new one");
        
        const userData = user.user_metadata || {};
        const fullName = userData.full_name || (userData.first_name && userData.last_name 
            ? `${userData.last_name}, ${userData.first_name}` 
            : user.email.split('@')[0]);
        
        // Insert new profile
        const { data: newProfile, error: insertError } = await supabase
          .from('personal_info')
          .insert([
            {
              user_id: user.id,
              name: fullName,
              age: 0, // This will need to be updated
              sex: 'Unspecified',
              civil_status: 'Unspecified',
              nationality: 'Filipino', // Default
              religion: 'Unspecified',
              occupation: 'Unspecified',
              address: 'Unspecified',
              educational_attainment: 'Unspecified',
              purpose_of_examination: 'Initial Assessment',
              date_of_examination: new Date().toISOString().split('T')[0],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
          ])
          .select();
        
        if (insertError) {
          console.error("Error creating profile:", insertError);
          setError("We couldn't create your profile automatically. Please try again.");
          return;
        }
        
        console.log("Created new profile:", newProfile);
        
        if (newProfile && newProfile.length > 0) {
          setPatientInfo(newProfile[0]);
          onProfileLoaded(newProfile[0].id);
        }
      } else if (fetchError) {
        // Handle other errors
        console.error("Error checking profile:", fetchError);
        setError("There was an error checking your profile. Please try again.");
      }
    } catch (error) {
      console.error("Exception in profile handling:", error);
      setError("An unexpected error occurred. Please try again later.");
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
    return (
      <div className="d-flex justify-content-center my-3">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading patient profile...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="alert alert-warning">
        <h5>Profile Error</h5>
        <p>{error}</p>
        <Link to="/profile/edit" className="btn btn-primary">Complete Your Profile</Link>
        <button 
          className="btn btn-outline-secondary ms-2"
          onClick={() => checkAndCreateProfile()}
        >
          Try Again
        </button>
      </div>
    );
  }
  
  // If no errors and not loading, then the profile is loaded or created
  return (
    <>
      {showDebug && (
        <div className="card bg-light mb-3">
          <div className="card-header bg-info text-white">
            <h5 className="mb-0">Profile Debug Info</h5>
          </div>
          <div className="card-body">
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Patient ID:</strong> {patientInfo?.id}</p>
            <p><strong>Name:</strong> {patientInfo?.name}</p>
            <pre>{JSON.stringify(patientInfo, null, 2)}</pre>
          </div>
        </div>
      )}
    </>
  );
};

export default PatientProfileHandler;