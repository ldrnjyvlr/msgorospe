// components/AuthHandler.jsx - Fixed to prevent admin users from being treated as patients
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useAuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger';
/**
 * This component handles authentication events and performs additional operations
 * required for new users, such as creating patient profiles automatically.
 */
const AuthHandler = ({ children, userRole }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        if (event === 'SIGNED_IN') {
          // User just signed in - ensure their records are properly set up
          if (session?.user) {
            setIsProcessing(true);
            await handleUserSignIn(session.user);
            setIsProcessing(false);
          }
        } else if (event === 'USER_UPDATED') {
          // Handle email confirmations and other user updates
          if (session?.user) {
            setIsProcessing(true);
            await handleUserUpdate(session.user);
            setIsProcessing(false);
          }
        }
      }
    );

    // Cleanup listener on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, [navigate, userRole]);

  // Handle user sign in
  const handleUserSignIn = async (authUser) => {
    try {
      // 1. Check if the user exists in the users table
      await ensureUserRecord(authUser);
      
      // 2. Check if user has a role
      const role = await ensureUserRole(authUser);
      
      // 3. Only create patient info if the user is actually a patient
      if (role === 'patient') {
        await ensurePatientInfo(authUser);
      } else {
        console.log(`User is ${role}, skipping patient info creation`);
      }
      
      console.log('User setup complete for:', authUser.email);
      
    } catch (error) {
      console.error('Error in handleUserSignIn:', error);
    }
  };
  
  // Handle user update (like email confirmation)
  const handleUserUpdate = async (authUser) => {
    try {
      // Similar to sign in, but we'll check specifically after email confirmation
      if (authUser.email_confirmed_at && authUser.confirmed_at) {
        console.log('User confirmed email:', authUser.email);
        
        // Ensure all required records exist
        await ensureUserRecord(authUser);
        const role = await ensureUserRole(authUser);
        
        // Only create patient info if user is a patient
        if (role === 'patient') {
          await ensurePatientInfo(authUser);
        }
      }
    } catch (error) {
      console.error('Error in handleUserUpdate:', error);
    }
  };

  // Ensure user record exists in users table
  const ensureUserRecord = async (authUser) => {
    try {
      // Check if user exists
      const { data: existingUser, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', authUser.id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        console.error('Error checking for existing user:', userError);
        throw userError;
      }

      // If user doesn't exist, create one
      if (!existingUser) {
        const { error } = await supabase
          .from('users')
          .insert([
            {
              id: authUser.id,
              full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
              email: authUser.email,
              avatar_url: authUser.user_metadata?.avatar_url || null,
              created_at: new Date(),
              updated_at: new Date()
            }
          ]);

        if (error) {
          console.error('Error creating user record:', error);
          throw error;
        }

        console.log('Created new user record for:', authUser.email);
      }
    } catch (error) {
      console.error('Error in ensureUserRecord:', error);
      throw error;
    }
  };

  // Ensure user has a role and return it
  const ensureUserRole = async (authUser) => {
    try {
      // Check if role exists
      const { data: existingRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .single();

      if (roleError && roleError.code !== 'PGRST116') {
        console.error('Error checking user role:', roleError);
        throw roleError;
      }

      // If role already exists, return it
      if (existingRole) {
        console.log(`User ${authUser.email} has role: ${existingRole.role}`);
        return existingRole.role;
      }
      
      // No existing role - check metadata for role
      const metadataRole = authUser.user_metadata?.role;
      
      // IMPORTANT: Don't default to patient for all users
      // Only default to patient if no role is specified in metadata
      let role = 'patient';
      
      if (metadataRole) {
        // Use the role from metadata if available
        role = metadataRole;
        console.log(`Using role from metadata: ${role}`);
      } else {
        // Check if this user might be an admin based on email domain or other criteria
        if (authUser.email && authUser.email.includes('@admin.')) {
          role = 'admin';
        }
        console.log(`No metadata role, defaulting to: ${role}`);
      }
      
      // Create the role
      const { error } = await supabase
        .from('user_roles')
        .insert([
          {
            user_id: authUser.id,
            role: role,
            created_at: new Date(),
            updated_at: new Date()
          }
        ]);

      if (error) {
        console.error('Error creating user role:', error);
        throw error;
      }

      console.log(`Created ${role} role for user:`, authUser.email);
      return role;
    } catch (error) {
      console.error('Error in ensureUserRole:', error);
      throw error;
    }
  };

  // Ensure patient has personal info
  const ensurePatientInfo = async (authUser) => {
    try {
      // Double-check that user is actually a patient
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', authUser.id)
        .single();

      if (roleError) {
        console.error('Error checking user role for patient info:', roleError);
        throw roleError;
      }

      // Only proceed if user is confirmed to be a patient
      if (roleData.role !== 'patient') {
        console.log(`User is ${roleData.role}, not creating patient info`);
        return;
      }

      // Check if personal_info already exists
      const { data: existingInfo, error: infoError } = await supabase
        .from('personal_info')
        .select('id, sex, civil_status')
        .eq('user_id', authUser.id)
        .single();

      if (infoError && infoError.code !== 'PGRST116') {
        console.error('Error checking for existing patient info:', infoError);
        throw infoError;
      }

      // If personal_info doesn't exist, create it
      if (!existingInfo) {
        const fullName = authUser.user_metadata?.full_name || authUser.email.split('@')[0];
        const nameParts = fullName.split(' ');
        let formattedName = fullName;

        // Format name as "Last, First Middle" if possible
        if (nameParts.length > 1) {
          const lastName = nameParts[nameParts.length - 1];
          const firstMiddle = nameParts.slice(0, nameParts.length - 1).join(' ');
          formattedName = `${lastName}, ${firstMiddle}`;
        }

        const { error } = await supabase
          .from('personal_info')
          .insert([
            {
              user_id: authUser.id,
              name: formattedName,
              sex: 'Unspecified',
              civil_status: 'Unspecified',
              date_of_birth: null,
              place_of_birth: 'Unspecified',
              nationality: 'Filipino',
              religion: 'Unspecified',
              occupation: 'Unspecified',
              address: 'Unspecified',
              educational_attainment: 'Unspecified',
              purpose_of_examination: 'Initial Assessment',
              date_of_examination: new Date(),
              created_at: new Date(),
              updated_at: new Date()
            }
          ]);

        if (error) {
          console.error('Error creating patient personal info:', error);
          throw error;
        }

        console.log('Created personal info for patient:', authUser.email);
      }
      
      // If record exists but is incomplete, navigate to complete profile
      // Only do this for patients
      else if (
        existingInfo.sex === 'Unspecified' || 
        existingInfo.civil_status === 'Unspecified'
      ) {
        // Use setTimeout to avoid navigate during render
        setTimeout(() => {
          navigate('/complete-profile');
        }, 100);
      }
    } catch (error) {
      console.error('Error in ensurePatientInfo:', error);
      throw error;
    }
  };

  // We don't need to show a loading state as this happens in the background
  // Just render the children as normal
  return <>{children}</>;
};

export default AuthHandler;