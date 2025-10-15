// pages/ForgotPassword.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import logoImage from '../assets/logo.png';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setSuccess(true);
    } catch (error) {
      console.error('Password reset error:', error);
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
                <i className="fas fa-envelope-open text-success" style={{ fontSize: '3rem' }}></i>
              </div>
              <h4 className="text-success mb-3">Check Your Email</h4>
              <p className="text-muted mb-4">
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <div className="alert alert-info">
                <i className="fas fa-info-circle me-2"></i>
                <small>
                  Please check your email inbox and click the link to reset your password. 
                  The link will expire in 1 hour for security reasons.
                </small>
              </div>
              <div className="mt-4">
                <Link to="/login" className="btn btn-primary">
                  <i className="fas fa-arrow-left me-2"></i>
                  Back to Login
                </Link>
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
          <h4 className="text-center mb-4">Reset Password</h4>
          <p className="text-muted text-center mb-4">
            Enter your email address and we'll send you a link to reset your password.
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
          
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="email" className="form-label">Email Address</label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Enter your email address"
                autoComplete="email"
              />
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-100 py-2 mb-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Sending Reset Link...
                </>
              ) : (
                <>
                  <i className="fas fa-paper-plane me-2"></i>
                  Send Reset Link
                </>
              )}
            </button>
          </form>
          
          <div className="text-center">
            <p className="mb-0">
              Remember your password? <Link to="/login" className="text-decoration-none">Back to Login</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
