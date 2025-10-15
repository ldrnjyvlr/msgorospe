// pages/ResetPassword.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoImage from '../assets/logo.png';

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('Invalid or expired reset link. Please request a new password reset.');
      return;
    }

    // Set the session with the tokens from the URL
    const setSession = async () => {
      try {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Session error:', error);
          setError('Invalid or expired reset link. Please request a new password reset.');
        } else {
          console.log('Session set successfully for password reset');
        }
      } catch (error) {
        console.error('Error setting session:', error);
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    };

    setSession();
  }, [searchParams]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validate passwords
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        throw error;
      }

      // Sign out the user after password reset to prevent auto-redirect to dashboard
      await supabase.auth.signOut();
      
      setSuccess(true);
      
      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (error) {
      console.error('Password update error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card bg-white">
          <div className="text-center p-4 border-bottom">
            <img src={logoImage} alt="MS GOROSPE Logo" height="80" />
            <h2 className="mt-3 text-primary">MS GOROSPE</h2>
            <p className="text-muted">Psychological Assessment Center</p>
          </div>
          <div className="p-4">
            <div className="text-center">
              <div className="mb-4">
                <i className="fas fa-check-circle text-success" style={{ fontSize: '3rem' }}></i>
              </div>
              <h4 className="text-success mb-3">Password Reset Successful</h4>
              <p className="text-muted mb-4">
                Your password has been successfully updated. You can now log in with your new password.
              </p>
              <div className="alert alert-success">
                <i className="fas fa-info-circle me-2"></i>
                <small>
                  You will be automatically redirected to the login page in a few seconds.
                </small>
              </div>
              <div className="mt-4">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-primary"
                >
                  <i className="fas fa-sign-in-alt me-2"></i>
                  Go to Login
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card bg-white">
        <div className="text-center p-4 border-bottom">
          <img src={logoImage} alt="MS GOROSPE Logo" height="80" />
          <h2 className="mt-3 text-primary">MS GOROSPE</h2>
          <p className="text-muted">Psychological Assessment Center</p>
        </div>
        <div className="p-4">
          <h4 className="text-center mb-4">Set New Password</h4>
          <p className="text-muted text-center mb-4">
            Please enter your new password below.
          </p>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              <div className="d-flex align-items-start">
                <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                <div>
                  <strong>Error:</strong>
                  <div className="mt-1">{error}</div>
                </div>
              </div>
            </div>
          )}

          <div className="alert alert-info">
            <i className="fas fa-info-circle me-2"></i>
            <small>
              Password must be at least 12 characters long and contain at least one uppercase letter, 
              one lowercase letter, one number, and one special character.
            </small>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="password" className="form-label">New Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{ borderLeft: 0 }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
              <div className="input-group">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control"
                  id="confirmPassword"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  placeholder="Confirm your new password"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  tabIndex={-1}
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  style={{ borderLeft: 0 }}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-100 py-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Updating Password...
                </>
              ) : (
                <>
                  <i className="fas fa-save me-2"></i>
                  Update Password
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
