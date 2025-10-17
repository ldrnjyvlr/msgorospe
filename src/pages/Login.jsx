// pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoImage from '../assets/logo.png';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  const getUserFriendlyError = (error) => {
    const message = error.message || error.toString();
    
    if (message.includes('Database error granting user')) {
      return 'There was a database configuration issue. Please contact support or try again in a few minutes.';
    }
    
    if (message.includes('Invalid login credentials')) {
      return 'Invalid email or password. Please check your credentials and try again.';
    }
    
    if (message.includes('Email not confirmed')) {
      return 'Please check your email and click the confirmation link before signing in.';
    }
    
    if (message.includes('Too many requests')) {
      return 'Too many login attempts. Please wait a few minutes before trying again.';
    }
    
    if (message.includes('User not found')) {
      return 'No account found with this email address.';
    }
    
    if (message.includes('Password')) {
      return 'Incorrect password. Please try again.';
    }
    
    // Return original message if no specific handling
    return message;
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('Attempting login for:', email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      });

      if (error) {
        console.error('Auth error details:', {
          message: error.message,
          status: error.status,
          details: error
        });
        
        throw new Error(getUserFriendlyError(error));
      }

      if (data.user) {
        console.log('Login successful for user:', data.user.id);
        
        // Optional: Verify user exists in your users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .eq('id', data.user.id)
          .single();
        
        if (userError && userError.code === 'PGRST116') {
          // User doesn't exist in users table, create them
          console.log('User not found in users table, creating...');
          const { error: insertError } = await supabase
            .from('users')
            .insert({
              id: data.user.id,
              email: data.user.email,
              full_name: data.user.user_metadata?.full_name || data.user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            });
          
          if (insertError) {
            console.error('Error creating user profile:', insertError);
            // Don't throw error here, continue with login
          }
        }
        
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card bg-white">
        <div className="text-center p-4 border-bottom">
          <img src={logoImage} alt="MS GOROSPE Logo" height="80" />
          <h2 className="mt-3 text-primary">MS GOROSPE</h2>
          <p className="text-muted">Psychological Assessment Center</p>
        </div>
        <div className="p-4">
          <h4 className="text-center mb-4">Log In</h4>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              <div className="d-flex align-items-start">
                <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
                <div>
                  <strong>Login Failed:</strong>
                  <div className="mt-1">{error}</div>
                  {error.includes('database configuration') && (
                    <div className="mt-2 small">
                      <strong>For administrators:</strong> Check Supabase logs and database triggers/policies.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email"
                autoComplete="email"
              />
            </div>
            
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-group">
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  tabIndex={-1}
                  onClick={() => setShowPassword((prev) => !prev)}
                  style={{ borderLeft: 0 }}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            
            <div className="mb-3 d-flex justify-content-between align-items-center">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="rememberMe"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="rememberMe">
                  Remember me
                </label>
              </div>
              <Link to="/forgot-password" className="text-decoration-none">
                <i className="fas fa-key me-1"></i>
                Forgot Password?
              </Link>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-100 py-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Signing in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="mb-0">
              Don't have an account? <Link to="/register" className="text-decoration-none">Register here</Link>
            </p>
          </div>
          
          <div className="mt-3 text-center">
            <Link to="/" className="btn btn-secondary btn-sm d-flex align-items-center justify-content-center mx-auto" style={{width: 'fit-content'}}>
              <i className="fas fa-arrow-left me-2"></i>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;