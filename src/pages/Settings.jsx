// pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaSave, FaLock, FaUser, FaEye, FaEyeSlash } from 'react-icons/fa';

const Settings = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState({
    full_name: '',
    email: user?.email || ''
  });
  const [password, setPassword] = useState({
    current: '',
    new: '',
    confirm: ''
  });
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordMessage, setPasswordMessage] = useState({ text: '', type: '' });
  const [profileMessage, setProfileMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setProfile({
          ...profile,
          full_name: data.full_name || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    
    setProfile({
      ...profile,
      [name]: value
    });
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    
    setPassword({
      ...password,
      [name]: value
    });
  };

  const togglePasswordVisibility = (field) => {
    setShowPassword({
      ...showPassword,
      [field]: !showPassword[field]
    });
  };

  const updateProfile = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('users')
        .update({
          full_name: profile.full_name,
          updated_at: new Date()
        })
        .eq('id', user.id);
        
      if (error) throw error;
      
      setProfileMessage({
        text: 'Profile updated successfully!',
        type: 'success'
      });
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setProfileMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      console.error('Error updating profile:', error);
      
      setProfileMessage({
        text: 'Failed to update profile. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
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

  const updatePassword = async (e) => {
    e.preventDefault();
    
    // Validate new password strength
    const passwordError = validatePassword(password.new);
    if (passwordError) {
      setPasswordMessage({
        text: passwordError,
        type: 'error'
      });
      return;
    }
    
    // Check if passwords match
    if (password.new !== password.confirm) {
      setPasswordMessage({
        text: 'New passwords do not match.',
        type: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Update password using Supabase Auth
      const { error } = await supabase.auth.updateUser({
        password: password.new
      });
      
      if (error) throw error;
      
      // Clear password fields
      setPassword({
        current: '',
        new: '',
        confirm: ''
      });
      
      setPasswordMessage({
        text: 'Password updated successfully!',
        type: 'success'
      });
      
      // Clear the message after 3 seconds
      setTimeout(() => {
        setPasswordMessage({ text: '', type: '' });
      }, 3000);
    } catch (error) {
      console.error('Error updating password:', error);
      
      setPasswordMessage({
        text: 'Failed to update password. Please try again.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !profile.full_name) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border" role="status" style={{ color: '#ff6b6b' }}>
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container" style={{ 
      background: 'white',
      minHeight: '100vh',
      padding: '2rem'
    }}>
      <div className="row mb-4">
        <div className="col-12">
          <div className="card border-0 shadow-lg" style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            borderRadius: '20px'
          }}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center">
                <div className="me-3 p-3 rounded-circle" style={{
                  background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                  color: 'white'
                }}>
                  <FaUser size={24} />
                </div>
                <div>
                  <h2 className="mb-1 fw-bold text-dark">Account Settings</h2>
                  <p className="mb-0 text-muted">Manage your profile and security settings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-lg" style={{
            borderRadius: '1.5rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 24px rgba(255, 107, 107, 0.15)'
          }}>
            <div className="card-header border-0" style={{
              background: 'linear-gradient(90deg, #ff6b6b 0%, #ff9068 100%)',
              color: '#fff',
              borderRadius: '1.5rem 1.5rem 0 0',
              padding: '1.5rem 2rem'
            }}>
              <h5 className="mb-0 d-flex align-items-center" style={{ fontWeight: 800, letterSpacing: 1 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  marginRight: 12,
                  boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)'
                }}>
                  <FaUser style={{ color: '#ff6b6b', fontSize: 20 }} />
                </span>
                Profile Information
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={updateProfile}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label fw-bold" style={{ color: '#ff6b6b' }}>Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={profile.email}
                    disabled
                    style={{
                      borderRadius: '10px',
                      border: '2px solid rgba(255, 107, 107, 0.2)',
                      padding: '12px 16px',
                      fontSize: '16px'
                    }}
                  />
                  <small className="form-text text-muted">
                    Email address cannot be changed.
                  </small>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="full_name" className="form-label fw-bold" style={{ color: '#ff6b6b' }}>Full Name</label>
                  <input
                    type="text"
                    className="form-control"
                    id="full_name"
                    name="full_name"
                    value={profile.full_name}
                    onChange={handleProfileChange}
                    required
                    style={{
                      borderRadius: '10px',
                      border: '2px solid rgba(255, 107, 107, 0.2)',
                      padding: '12px 16px',
                      fontSize: '16px'
                    }}
                  />
                </div>
                
                
                {profileMessage.text && (
                  <div className={`alert alert-${profileMessage.type === 'success' ? 'success' : 'danger'} mb-3`} role="alert">
                    {profileMessage.text}
                  </div>
                )}
                
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
                  disabled={loading}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0px)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" /> Save Changes
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
        
        <div className="col-md-6 mb-4">
          <div className="card border-0 shadow-lg" style={{
            borderRadius: '1.5rem',
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
            boxShadow: '0 4px 24px rgba(255, 107, 107, 0.15)'
          }}>
            <div className="card-header border-0" style={{
              background: 'linear-gradient(90deg, #ff9068 0%, #ffcc70 100%)',
              color: '#fff',
              borderRadius: '1.5rem 1.5rem 0 0',
              padding: '1.5rem 2rem'
            }}>
              <h5 className="mb-0 d-flex align-items-center" style={{ fontWeight: 800, letterSpacing: 1 }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  marginRight: 12,
                  boxShadow: '0 2px 8px rgba(255, 144, 104, 0.2)'
                }}>
                  <FaLock style={{ color: '#ff9068', fontSize: 20 }} />
                </span>
                Change Password
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={updatePassword}>
                <div className="mb-3">
                  <label htmlFor="new" className="form-label fw-bold" style={{ color: '#ff9068' }}>New Password</label>
                  <div className="input-group">
                    <input
                      type={showPassword.new ? "text" : "password"}
                      className="form-control"
                      id="new"
                      name="new"
                      value={password.new}
                      onChange={handlePasswordChange}
                      required
                      minLength="8"
                      style={{
                        borderRadius: '10px',
                        border: '2px solid rgba(255, 144, 104, 0.2)',
                        padding: '12px 16px',
                        fontSize: '16px'
                      }}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => togglePasswordVisibility('new')}
                      style={{
                        background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '0 10px 10px 0',
                        padding: '12px 16px'
                      }}
                    >
                      {showPassword.new ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                  <small className="form-text text-muted">
                    {"Password must be at least 12 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)."}
                  </small>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="confirm" className="form-label fw-bold" style={{ color: '#ff9068' }}>Confirm New Password</label>
                  <div className="input-group">
                    <input
                      type={showPassword.confirm ? "text" : "password"}
                      className="form-control"
                      id="confirm"
                      name="confirm"
                      value={password.confirm}
                      onChange={handlePasswordChange}
                      required
                      minLength="8"
                      style={{
                        borderRadius: '10px',
                        border: '2px solid rgba(255, 144, 104, 0.2)',
                        padding: '12px 16px',
                        fontSize: '16px'
                      }}
                    />
                    <button
                      type="button"
                      className="btn"
                      onClick={() => togglePasswordVisibility('confirm')}
                      style={{
                        background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '0 10px 10px 0',
                        padding: '12px 16px'
                      }}
                    >
                      {showPassword.confirm ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>
                
                {passwordMessage.text && (
                  <div className={`alert alert-${passwordMessage.type === 'success' ? 'success' : 'danger'} mb-3`} role="alert">
                    {passwordMessage.text}
                  </div>
                )}
                
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
                  disabled={loading}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 8px 25px rgba(255, 144, 104, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0px)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Updating...
                    </>
                  ) : (
                    <>
                      <FaSave className="me-2" /> Update Password
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
          
          
        </div>
      </div>
    </div>
  );
};

export default Settings;