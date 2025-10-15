// pages/PsychologistsList.jsx - Fixed version with user prop
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaUserPlus, FaEdit, FaTrash, FaSearch, FaUsers, FaEnvelope, FaCalendarAlt, FaEye, FaEyeSlash } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const PsychologistsList = () => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(true);
  const [psychologists, setPsychologists] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [currentUser, setCurrentUser] = useState(null); // Add state for current user
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    confirm_password: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    fetchPsychologists();
    getCurrentUser(); // Get current user on component mount
  }, []);

  // Get current logged-in user
  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const fetchPsychologists = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // First get all user_roles with psychologist role
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('id, user_id, created_at')
        .eq('role', 'psychologist');
        
      if (roleError) {
        console.error('Error fetching roles:', roleError);
        throw roleError;
      }
      
      if (!roleData || roleData.length === 0) {
        setPsychologists([]);
        setLoading(false);
        return;
      }
      
      console.log("Role data:", roleData);
      
      // Get user IDs to fetch user details
      const userIds = roleData.map(item => item.user_id);
      
      // Fetch user details in a separate query
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .in('id', userIds);
        
      if (userError) {
        console.error('Error fetching users:', userError);
        throw userError;
      }
      
      console.log("User data:", userData);

      // Try to fetch emails from auth.users via admin API with pagination (for missing/incorrect emails)
      let emailMap = {};
      try {
        let page = 1;
        const perPage = 100;
        // Paginate until no more users returned or a sane limit of 100 pages
        // Avoids missing emails when there are more than the default page size
        for (let i = 0; i < 100; i++) {
          const { data: authData, error: authError } = await supabase.auth.admin.listUsers({ page, perPage });
          if (authError) break;
          if (!authData?.users?.length) break;
          authData.users.forEach(u => {
            emailMap[u.id] = u.email;
          });
          page += 1;
        }
        console.log("Auth emails fetched (count):", Object.keys(emailMap).length);
      } catch (adminError) {
        console.warn('Admin API not available for fetching auth emails');
      }
      
      // Create the combined data array with proper email priority
      const combined = roleData.map(role => {
        const user = userData?.find(u => u.id === role.user_id) || {};

        // Priority: 1) Email from users table, 2) Email from auth API, 3) Not available
        let email = 'Email not available';
        if (user.email && user.email !== 'null' && String(user.email).trim() !== '') {
          email = user.email;
        } else if (emailMap[role.user_id]) {
          email = emailMap[role.user_id] || 'Email not available';
        }

        return {
          id: role.id,
          user_id: role.user_id,
          email,
          full_name: user.full_name || 'Unnamed User',
          avatar_url: user.avatar_url || null,
          created_at: role.created_at
        };
      });
      
      console.log("Combined data:", combined);
      setPsychologists(combined);
    } catch (err) {
      console.error('Error in fetchPsychologists:', err);
      setError(err.message || 'Failed to fetch psychologists');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery) {
      fetchPsychologists();
      return;
    }
    
    const filtered = psychologists.filter(user => 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    
    setPsychologists(filtered);
  };

  const validatePassword = (password) => {
    if (password.length < 12) {
      return 'Password must be at least 12 characters long';
    }
    if (!/(?=.*[a-z])/.test(password)) {
      return 'Password must contain at least one lowercase letter';
    }
    if (!/(?=.*[A-Z])/.test(password)) {
      return 'Password must contain at least one uppercase letter';
    }
    if (!/(?=.*\d)/.test(password)) {
      return 'Password must contain at least one number';
    }
    if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(password)) {
      return 'Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)';
    }
    return null;
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.email) errors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) errors.email = 'Email is invalid';
    
    if (!formData.full_name) errors.full_name = 'Full name is required';
    
    if (showAddModal) {
      if (!formData.password) errors.password = 'Password is required';
      else {
        const passwordError = validatePassword(formData.password);
        if (passwordError) errors.password = passwordError;
      }
      
      if (!formData.confirm_password) errors.confirm_password = 'Please confirm password';
      else if (formData.password !== formData.confirm_password) errors.confirm_password = 'Passwords do not match';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log("Adding new psychologist...");
      
      // Use Supabase signUp with special options
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: 'psychologist'
          },
          emailRedirectTo: `${window.location.origin}/login`,
          // Skip the email confirmation step
          shouldCreateUser: true
        }
      });
      
      if (authError) {
        console.error('Auth error:', authError);
        
        // If email already exists, try to just add the role
        if (authError.message.includes('already registered')) {
          // Try to find existing user by email
          const { data: existingUser } = await supabase
            .from('users')
            .select('id')
            .eq('email', formData.email)
            .single();
            
          if (existingUser) {
            // Check if they already have a psychologist role
            const { data: existingRole } = await supabase
              .from('user_roles')
              .select('id')
              .eq('user_id', existingUser.id)
              .eq('role', 'psychologist')
              .single();
              
            if (existingRole) {
              throw new Error('This user is already a psychologist');
            }
            
            // Add psychologist role to existing user
            const { error: roleError } = await supabase
              .from('user_roles')
              .upsert([{
                user_id: existingUser.id,
                role: 'psychologist',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              }]);
              
            if (roleError) throw roleError;
            
            setFormData({
              email: '',
              password: '',
              full_name: '',
              confirm_password: ''
            });
            setShowAddModal(false);
            await fetchPsychologists();
            showSuccess('Psychologist role added to existing user!');
            return;
          }
        }
        
        throw authError;
      }
      
      // Get the new user ID
      let newUserId = authData.user?.id;
      
      if (!newUserId) {
        // If no user ID but no error, check session
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.email === formData.email) {
          newUserId = session.user.id;
        } else {
          throw new Error('User creation failed - no user ID returned');
        }
      }
      
      console.log("New user created with ID:", newUserId);
      
      // Add to users table
      const { error: userError } = await supabase
        .from('users')
        .upsert([{
          id: newUserId,
          full_name: formData.full_name,
          email: formData.email,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
        
      if (userError) {
        console.error('User table error:', userError);
        // Continue anyway - auth user exists
      }
      
      // Add user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert([{
          user_id: newUserId,
          role: 'psychologist',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }]);
        
      if (roleError) {
        console.error('Role assignment error:', roleError);
        // Continue anyway - user exists
      }
      
      // Create a "pre-confirmed" record to track this user - only if admin_created_users table exists
      if (currentUser) {
        try {
          const { error: confirmError } = await supabase
            .from('admin_created_users')
            .insert([{
              user_id: newUserId,
              email: formData.email,
              created_by: currentUser.id, // Use current user ID
              auto_confirmed: true,
              created_at: new Date().toISOString()
            }]);
            
          if (confirmError) {
            console.warn('Could not track admin-created user:', confirmError);
            // Continue anyway - this table might not exist
          }
        } catch (tableError) {
          console.warn('admin_created_users table might not exist:', tableError);
          // Continue anyway
        }
      }
      
      // Close modal and reset form
      setFormData({
        email: '',
        password: '',
        full_name: '',
        confirm_password: ''
      });
      setShowAddModal(false);
      
      // Refresh list
      await fetchPsychologists();
      
      // Log audit event for user creation
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.CREATE,
        resourceType: RESOURCE_TYPES.USER,
        resourceId: newUserId,
        description: 'New psychologist user created',
        details: {
          user_email: formData.email,
          user_name: formData.full_name,
          role: 'psychologist',
          created_by_admin: true
        }
      });
      
      showSuccess(`Psychologist account created! The user can log in immediately with their email and password. Note: They may receive a confirmation email which they can ignore.`);
    } catch (err) {
      console.error('Error adding psychologist:', err);
      
      let errorMsg = err.message || 'Failed to add psychologist';
      
      if (err.message?.includes('duplicate key')) {
        errorMsg = 'A user with this email already exists';
      } else if (err.message?.includes('already registered')) {
        errorMsg = 'This email is already registered. The user may already have an account.';
      } else if (err.message?.includes('row-level security')) {
        errorMsg = 'You do not have permission to add users. Please check your admin configuration.';
      }
      
      setError(errorMsg);
      showError(`Failed to add psychologist. ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      password: '',
      confirm_password: ''
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Update user in users table
      const { error } = await supabase
        .from('users')
        .update({
          full_name: formData.full_name,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedUser.user_id);
        
      if (error) {
        console.error('Update user error:', error);
        throw error;
      }
      
      // If password was provided, update it using auth.updateUser
      if (formData.password) {
        // This requires admin privileges or the user to be logged in
        // Since we're an admin panel, we'll need to use admin functions
        try {
          const { error: passwordError } = await supabase.auth.admin.updateUserById(
            selectedUser.user_id,
            { password: formData.password }
          );
          
          if (passwordError) {
            console.error('Password update error:', passwordError);
            throw passwordError;
          }
        } catch (adminError) {
          console.warn('Could not update password via admin API:', adminError);
          // The admin API might not be available, just warn and continue
          showError('Note: Password update requires admin privileges. The user may need to reset their password themselves.');
        }
      }
      
      // Close modal and reset form
      setShowEditModal(false);
      setSelectedUser(null);
      setFormData({
        email: '',
        password: '',
        full_name: '',
        confirm_password: ''
      });
      
      // Log audit event for user update
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.UPDATE,
        resourceType: RESOURCE_TYPES.USER,
        resourceId: selectedUser.user_id,
        description: 'Psychologist user updated',
        details: {
          updated_user_id: selectedUser.user_id,
          updated_user_email: selectedUser.email,
          updated_fields: {
            full_name: formData.full_name,
            password_updated: !!formData.password
          },
          role: 'psychologist',
          updated_by_admin: true
        }
      });
      
      // Refresh list
      await fetchPsychologists();
      
      showSuccess('Psychologist updated successfully!');
    } catch (err) {
      console.error('Error updating psychologist:', err);
      
      let errorMsg = err.message || 'Failed to update psychologist';
      
      if (err.message?.includes('row-level security')) {
        errorMsg = 'You do not have permission to update users. Please contact your administrator.';
      }
      
      setError(errorMsg);
      showError(`Failed to update psychologist. ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this psychologist? This action cannot be undone.')) {
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // First delete the user_role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);
        
      if (roleError) {
        console.error('Delete role error:', roleError);
        throw roleError;
      }
      
      // Then delete from users table
      const { error: userError } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
        
      if (userError) {
        console.error('Delete user error:', userError);
        throw userError;
      }
      
      // For auth user deletion, we'll need admin rights
      // But if not available, at least handle the UI update
      try {
        await supabase.auth.admin.deleteUser(userId);
      } catch (authError) {
        console.warn('Could not delete auth user (requires admin rights):', authError);
        // Continue anyway since we've deleted the role and user record
      }
      
      // Log audit event for user deletion
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.DELETE,
        resourceType: RESOURCE_TYPES.USER,
        resourceId: userId,
        description: 'Psychologist user deleted',
        details: {
          deleted_user_id: userId,
          role: 'psychologist',
          deleted_by_admin: true
        }
      });
      
      // Refresh list
      await fetchPsychologists();
      
      showSuccess('Psychologist deleted successfully from the system. Note: The auth record may still exist but the user can no longer log in as a psychologist.');
    } catch (err) {
      console.error('Error deleting psychologist:', err);
      
      let errorMsg = err.message || 'Failed to delete psychologist';
      
      if (err.message?.includes('row-level security')) {
        errorMsg = 'You do not have permission to delete users. Please contact your administrator.';
      }
      
      setError(errorMsg);
      showError(`Failed to delete psychologist. ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="psychologists-container" style={{ 
      minHeight: '100vh', 
      background: 'white',
      padding: '2rem 0'
    }}>
      <div className="container">
        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px'
            }}>
              <div className="card-body p-4">
                <div className="d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center">
                    <div className="me-3 p-3 rounded-circle" style={{
                      background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                      color: 'white'
                    }}>
                      <FaUsers size={24} />
                    </div>
                    <div>
                      <h2 className="mb-1 fw-bold text-dark">Manage Psychologists</h2>
                      <p className="mb-0 text-muted">Add, edit, and manage psychologist accounts</p>
                    </div>
                  </div>
                  <button 
                    className="btn shadow-sm" 
                    style={{
                      background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '15px',
                      padding: '12px 24px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease',
                      transform: 'translateY(0px)'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0px)';
                      e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                    }}
                    onClick={() => {
                      setFormData({
                        email: '',
                        password: '',
                        full_name: '',
                        confirm_password: ''
                      });
                      setFormErrors({});
                      setError(null);
                      setShowPassword(false);
                      setShowConfirmPassword(false);
                      setShowAddModal(true);
                    }}
                  >
                    <FaUserPlus className="me-2" /> Add Psychologist
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="row mb-4">
            <div className="col-12">
              <div className="alert alert-danger border-0 shadow-sm" style={{
                borderRadius: '15px',
                background: 'linear-gradient(45deg, #ff6b6b, #ff5722)',
                color: 'white',
                border: 'none'
              }} role="alert">
                <strong><i className="fas fa-exclamation-triangle me-2"></i>Error:</strong> {error}
              </div>
            </div>
          </div>
        )}

        <div className="row mb-4">
          <div className="col-12">
            <div className="card border-0 shadow-lg" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px'
            }}>
              <div className="card-body p-4">
                <h5 className="card-title mb-3 d-flex align-items-center">
                  <FaSearch className="me-2" style={{ color: '#ff6b6b' }} />
                  Search Psychologists
                </h5>
                <div className="input-group" style={{ borderRadius: '15px' }}>
                  <input
                    type="text"
                    className="form-control border-0 shadow-sm"
                    style={{
                      borderRadius: '15px 0 0 15px',
                      padding: '12px 20px',
                      fontSize: '16px',
                      background: '#f8f9fa'
                    }}
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button 
                    className="btn shadow-sm" 
                    type="button"
                    style={{
                      background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '0 15px 15px 0',
                      padding: '12px 20px',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = 'linear-gradient(45deg, #ff9068, #ff6b6b)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = 'linear-gradient(45deg, #ff6b6b, #ff9068)';
                    }}
                    onClick={handleSearch}
                  >
                    <FaSearch />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="row">
          <div className="col-12">
            <div className="card border-0 shadow-lg" style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderRadius: '20px'
            }}>
              <div className="card-body p-0">
                <div className="table-responsive" style={{ borderRadius: '20px', overflow: 'hidden' }}>
                  <table className="table table-hover mb-0" style={{
                    borderRadius: '20px',
                    overflow: 'hidden'
                  }}>
                    <thead style={{
                      background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                      color: 'white'
                    }}>
                      <tr>
                        <th style={{ border: 'none', padding: '20px', fontWeight: '600' }}>
                          <FaUsers className="me-2" />Name
                        </th>
                        <th style={{ border: 'none', padding: '20px', fontWeight: '600' }}>
                          <FaEnvelope className="me-2" />Email
                        </th>
                        <th style={{ border: 'none', padding: '20px', fontWeight: '600' }}>
                          <FaCalendarAlt className="me-2" />Date Added
                        </th>
                        <th style={{ border: 'none', padding: '20px', fontWeight: '600' }}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? (
                        <tr>
                          <td colSpan="4" className="text-center py-5" style={{ 
                            border: 'none', 
                            background: 'rgba(255, 107, 107, 0.05)' 
                          }}>
                            <div className="d-flex flex-column align-items-center">
                              <div className="spinner-border mb-3" role="status" style={{
                                width: '3rem',
                                height: '3rem',
                                color: '#ff6b6b'
                              }}>
                                <span className="visually-hidden">Loading...</span>
                              </div>
                              <h6 className="mb-0" style={{ color: '#ff6b6b' }}>Loading psychologists...</h6>
                            </div>
                          </td>
                        </tr>
                      ) : psychologists.length > 0 ? (
                        psychologists.map((user, index) => (
                          <tr key={user.id} style={{
                            border: 'none',
                            background: index % 2 === 0 ? 'rgba(255, 107, 107, 0.02)' : 'white',
                            transition: 'all 0.3s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(255, 107, 107, 0.08)';
                            e.currentTarget.style.transform = 'translateY(-1px)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = index % 2 === 0 ? 'rgba(255, 107, 107, 0.02)' : 'white';
                            e.currentTarget.style.transform = 'translateY(0px)';
                          }}>
                            <td style={{ border: 'none', padding: '20px' }}>
                              <div className="d-flex align-items-center">
                                {user.avatar_url ? (
                                  <img
                                    src={user.avatar_url}
                                    alt={user.full_name}
                                    className="rounded-circle me-3 shadow-sm"
                                    width="50"
                                    height="50"
                                    style={{ border: '3px solid #ff6b6b' }}
                                  />
                                ) : (
                                  <div 
                                    className="rounded-circle me-3 d-flex justify-content-center align-items-center text-white shadow-sm"
                                    style={{ 
                                      width: 50, 
                                      height: 50,
                                      background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                                      fontSize: '18px',
                                      fontWeight: '600'
                                    }}
                                  >
                                    {user.full_name.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div>
                                  <h6 className="mb-1 fw-bold text-dark">{user.full_name}</h6>
                                  <small className="text-muted">Psychologist</small>
                                </div>
                              </div>
                            </td>
                            <td style={{ border: 'none', padding: '20px' }}>
                              <span className={`${user.email === 'Email not available' ? 'text-muted font-italic' : 'text-dark'} fw-medium`}>
                                {user.email}
                              </span>
                            </td>
                            <td style={{ border: 'none', padding: '20px' }}>
                              <span className="text-dark fw-medium">
                                {new Date(user.created_at).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </span>
                            </td>
                            <td style={{ border: 'none', padding: '20px' }}>
                              <div className="d-flex gap-2">
                                <button 
                                  className="btn btn-sm shadow-sm"
                                  style={{
                                    background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: '10px',
                                    padding: '8px 16px',
                                    fontWeight: '500',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(255, 144, 104, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0px)';
                                    e.target.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                                  }}
                                  onClick={() => handleEditUser(user)}
                                >
                                  <FaEdit className="me-1" /> Edit
                                </button>
                                <button 
                                  className="btn btn-sm shadow-sm"
                                  style={{
                                    background: 'linear-gradient(45deg, #ff6b6b, #ff5722)',
                                    border: 'none',
                                    color: 'white',
                                    borderRadius: '10px',
                                    padding: '8px 16px',
                                    fontWeight: '500',
                                    transition: 'all 0.3s ease'
                                  }}
                                  onMouseEnter={(e) => {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 6px 20px rgba(255, 107, 107, 0.4)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.target.style.transform = 'translateY(0px)';
                                    e.target.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
                                  }}
                                  onClick={() => handleDeleteUser(user.user_id)}
                                >
                                  <FaTrash className="me-1" /> Delete
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-5" style={{ 
                            border: 'none',
                            background: 'rgba(255, 107, 107, 0.05)'
                          }}>
                            <div className="d-flex flex-column align-items-center">
                              <div className="mb-3 p-4 rounded-circle" style={{
                                background: 'rgba(255, 107, 107, 0.1)',
                                color: '#ff6b6b'
                              }}>
                                <FaUsers size={32} />
                              </div>
                              <h6 className="text-dark mb-2">No psychologists found</h6>
                              <p className="text-muted mb-0">Add a new psychologist to get started.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Add Psychologist Modal */}
      {showAddModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ 
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)'
        }}>
          <div className="modal-dialog modal-lg" style={{ 
            marginTop: '5vh',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <div className="modal-content border-0 shadow-lg" style={{
              borderRadius: '20px',
              overflow: 'hidden'
            }}>
              <div className="modal-header border-0 p-4" style={{
                background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center">
                  <div className="me-3 p-2 rounded-circle" style={{
                    background: 'rgba(255, 255, 255, 0.2)'
                  }}>
                    <FaUserPlus size={20} />
                  </div>
                  <div>
                    <h5 className="modal-title mb-1 fw-bold">Add New Psychologist</h5>
                    <small className="opacity-75">Create a new psychologist account</small>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white shadow-sm"
                  style={{
                    filter: 'brightness(0) invert(1)',
                    borderRadius: '50%',
                    padding: '8px'
                  }}
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4" style={{ background: '#f8f9fa' }}>
                {error && (
                  <div className="alert alert-danger border-0 mb-4" style={{
                    borderRadius: '15px',
                    background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                    color: 'white'
                  }} role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>{error}
                  </div>
                )}
                <form onSubmit={handleAddUser}>
                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <label htmlFor="full_name" className="form-label fw-semibold text-dark">
                        <FaUsers className="me-2" style={{ color: '#ff6b6b' }} />Full Name
                      </label>
                      <input
                        type="text"
                        className={`form-control border-0 shadow-sm ${formErrors.full_name ? 'is-invalid' : ''}`}
                        style={{
                          borderRadius: '15px',
                          padding: '12px 20px',
                          fontSize: '16px',
                          background: 'white'
                        }}
                        id="full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder="Enter full name"
                        required
                      />
                      {formErrors.full_name && (
                        <div className="invalid-feedback">{formErrors.full_name}</div>
                      )}
                    </div>
                    <div className="col-md-6 mb-4">
                      <label htmlFor="email" className="form-label fw-semibold text-dark">
                        <FaEnvelope className="me-2" style={{ color: '#ff6b6b' }} />Email Address
                      </label>
                      <input
                        type="email"
                        className={`form-control border-0 shadow-sm ${formErrors.email ? 'is-invalid' : ''}`}
                        style={{
                          borderRadius: '15px',
                          padding: '12px 20px',
                          fontSize: '16px',
                          background: 'white'
                        }}
                        id="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                        required
                      />
                      {formErrors.email && (
                        <div className="invalid-feedback">{formErrors.email}</div>
                      )}
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <label htmlFor="password" className="form-label fw-semibold text-dark">
                        Password
                      </label>
                      <div className="position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`form-control border-0 shadow-sm ${formErrors.password ? 'is-invalid' : ''}`}
                          style={{
                            borderRadius: '15px',
                            padding: '12px 50px 12px 20px',
                            fontSize: '16px',
                            background: 'white'
                          }}
                          id="password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter password"
                          required
                        />
                        <button
                          type="button"
                          className="btn position-absolute"
                          style={{
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'transparent',
                            color: '#667eea'
                          }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        {formErrors.password && (
                          <div className="invalid-feedback">{formErrors.password}</div>
                        )}
                      </div>
                    </div>
                    <div className="col-md-6 mb-4">
                      <label htmlFor="confirm_password" className="form-label fw-semibold text-dark">
                        Confirm Password
                      </label>
                      <div className="position-relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={`form-control border-0 shadow-sm ${formErrors.confirm_password ? 'is-invalid' : ''}`}
                          style={{
                            borderRadius: '15px',
                            padding: '12px 50px 12px 20px',
                            fontSize: '16px',
                            background: 'white'
                          }}
                          id="confirm_password"
                          name="confirm_password"
                          value={formData.confirm_password}
                          onChange={handleInputChange}
                          placeholder="Confirm password"
                          required
                        />
                        <button
                          type="button"
                          className="btn position-absolute"
                          style={{
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'transparent',
                            color: '#667eea'
                          }}
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        {formErrors.confirm_password && (
                          <div className="invalid-feedback">{formErrors.confirm_password}</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="d-flex justify-content-end pt-3 border-top" style={{ 
                    borderColor: 'rgba(255, 107, 107, 0.1) !important' 
                  }}>
                    <button
                      type="button"
                      className="btn me-3 shadow-sm"
                      style={{
                        background: '#6c757d',
                        border: 'none',
                        color: 'white',
                        borderRadius: '15px',
                        padding: '12px 24px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#5a6268';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#6c757d';
                        e.target.style.transform = 'translateY(0px)';
                      }}
                      onClick={() => setShowAddModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn shadow-sm"
                      style={{
                        background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '15px',
                        padding: '12px 24px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(45deg, #ff9068, #ff6b6b)';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(45deg, #ff6b6b, #ff9068)';
                        e.target.style.transform = 'translateY(0px)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Adding...
                        </>
                      ) : (
                        <>
                          <FaUserPlus className="me-2" />
                          Add Psychologist
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Psychologist Modal */}
      {showEditModal && (
        <div className="modal show d-block" tabIndex="-1" style={{ 
          backgroundColor: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(5px)'
        }}>
          <div className="modal-dialog modal-lg" style={{ 
            marginTop: '5vh',
            animation: 'modalSlideIn 0.3s ease-out'
          }}>
            <div className="modal-content border-0 shadow-lg" style={{
              borderRadius: '20px',
              overflow: 'hidden'
            }}>
              <div className="modal-header border-0 p-4" style={{
                background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                color: 'white'
              }}>
                <div className="d-flex align-items-center">
                  <div className="me-3 p-2 rounded-circle" style={{
                    background: 'rgba(255, 255, 255, 0.2)'
                  }}>
                    <FaEdit size={20} />
                  </div>
                  <div>
                    <h5 className="modal-title mb-1 fw-bold">Edit Psychologist</h5>
                    <small className="opacity-75">Update psychologist information</small>
                  </div>
                </div>
                <button 
                  type="button" 
                  className="btn-close btn-close-white shadow-sm"
                  style={{
                    filter: 'brightness(0) invert(1)',
                    borderRadius: '50%',
                    padding: '8px'
                  }}
                  onClick={() => setShowEditModal(false)}
                ></button>
              </div>
              <div className="modal-body p-4" style={{ background: '#f8f9fa' }}>
                {error && (
                  <div className="alert alert-danger border-0 mb-4" style={{
                    borderRadius: '15px',
                    background: 'linear-gradient(45deg, #ff6b6b, #ee5a24)',
                    color: 'white'
                  }} role="alert">
                    <i className="fas fa-exclamation-triangle me-2"></i>{error}
                  </div>
                )}
                <form onSubmit={handleUpdateUser}>
                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <label htmlFor="edit_full_name" className="form-label fw-semibold text-dark">
                        <FaUsers className="me-2" style={{ color: '#ff9068' }} />Full Name
                      </label>
                      <input
                        type="text"
                        className={`form-control border-0 shadow-sm ${formErrors.full_name ? 'is-invalid' : ''}`}
                        style={{
                          borderRadius: '15px',
                          padding: '12px 20px',
                          fontSize: '16px',
                          background: 'white'
                        }}
                        id="edit_full_name"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder="Enter full name"
                        required
                      />
                      {formErrors.full_name && (
                        <div className="invalid-feedback">{formErrors.full_name}</div>
                      )}
                    </div>
                    <div className="col-md-6 mb-4">
                      <label htmlFor="edit_email" className="form-label fw-semibold text-dark">
                        <FaEnvelope className="me-2" style={{ color: '#ff9068' }} />Email Address
                      </label>
                      <input
                        type="email"
                        className={`form-control border-0 shadow-sm ${formErrors.email ? 'is-invalid' : ''}`}
                        style={{
                          borderRadius: '15px',
                          padding: '12px 20px',
                          fontSize: '16px',
                          background: 'white'
                        }}
                        id="edit_email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="Enter email address"
                        disabled
                      />
                      <small className="form-text text-muted mt-2">
                        <i className="fas fa-info-circle me-1"></i>
                        Email is managed in auth and not editable here.
                      </small>
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6 mb-4">
                      <label htmlFor="edit_password" className="form-label fw-semibold text-dark">
                        New Password <small className="text-muted">(leave blank to keep current)</small>
                      </label>
                      <div className="position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`form-control border-0 shadow-sm ${formErrors.password ? 'is-invalid' : ''}`}
                          style={{
                            borderRadius: '15px',
                            padding: '12px 50px 12px 20px',
                            fontSize: '16px',
                            background: 'white'
                          }}
                          id="edit_password"
                          name="password"
                          value={formData.password}
                          onChange={handleInputChange}
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          className="btn position-absolute"
                          style={{
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            border: 'none',
                            background: 'transparent',
                            color: '#ff9068'
                          }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        {formErrors.password && (
                          <div className="invalid-feedback">{formErrors.password}</div>
                        )}
                      </div>
                    </div>
                    {formData.password && (
                      <div className="col-md-6 mb-4">
                        <label htmlFor="edit_confirm_password" className="form-label fw-semibold text-dark">
                          Confirm New Password
                        </label>
                        <div className="position-relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            className={`form-control border-0 shadow-sm ${formErrors.confirm_password ? 'is-invalid' : ''}`}
                            style={{
                              borderRadius: '15px',
                              padding: '12px 50px 12px 20px',
                              fontSize: '16px',
                              background: 'white'
                            }}
                            id="edit_confirm_password"
                            name="confirm_password"
                            value={formData.confirm_password}
                            onChange={handleInputChange}
                            placeholder="Confirm new password"
                          />
                          <button
                            type="button"
                            className="btn position-absolute"
                            style={{
                              right: '10px',
                              top: '50%',
                              transform: 'translateY(-50%)',
                              border: 'none',
                              background: 'transparent',
                              color: '#ff9068'
                            }}
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          >
                            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                          </button>
                          {formErrors.confirm_password && (
                            <div className="invalid-feedback">{formErrors.confirm_password}</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="d-flex justify-content-end pt-3 border-top" style={{ 
                    borderColor: 'rgba(255, 144, 104, 0.1) !important' 
                  }}>
                    <button
                      type="button"
                      className="btn me-3 shadow-sm"
                      style={{
                        background: '#6c757d',
                        border: 'none',
                        color: 'white',
                        borderRadius: '15px',
                        padding: '12px 24px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#5a6268';
                        e.target.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#6c757d';
                        e.target.style.transform = 'translateY(0px)';
                      }}
                      onClick={() => setShowEditModal(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn shadow-sm"
                      style={{
                        background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '15px',
                        padding: '12px 24px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = 'linear-gradient(45deg, #ffcc70, #ff9068)';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(255, 144, 104, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'linear-gradient(45deg, #ff9068, #ffcc70)';
                        e.target.style.transform = 'translateY(0px)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                      }}
                      disabled={loading}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <FaEdit className="me-2" />
                          Update Psychologist
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <style jsx>{`
        @keyframes modalSlideIn {
          from { opacity: 0; transform: translateY(-50px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .table-hover tbody tr:hover { background-color: rgba(255, 107, 107, 0.08) !important; }
        @media (max-width: 768px) {
          .btn { font-size: 14px !important; padding: 8px 16px !important; }
          .modal-dialog { margin: 1rem !important; }
          .card-body { padding: 1.5rem !important; }
        }
      `}</style>
    </div>
  );
};

export default PsychologistsList;