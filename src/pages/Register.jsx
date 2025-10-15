// pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaTimes, FaEye, FaEyeSlash } from 'react-icons/fa';
import logoImage from '../assets/logo.png';

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'patient',  // Default role
    terms_accepted: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
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
    // Reset error
    setError(null);

    // Check required fields
    if (!formData.full_name || !formData.email || !formData.password || !formData.confirm_password) {
      setError('All fields are required');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate password strength
    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return false;
    }

    // Check password and confirm password match
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return false;
    }

    // Check terms acceptance
    if (!formData.terms_accepted) {
      setError('You must accept the terms and conditions');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Register user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: formData.role
          }
        }
      });

      if (authError) throw authError;

      // If registration successful, show success message
      setSuccess(true);

      // Note: No need to create personal_info here - the AuthHandler component
      // will handle this automatically when the user confirms their email.

    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'An error occurred during registration');
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
            <div className="alert alert-success mb-4">
              <h5>Registration Successful!</h5>
              <p>We've sent a confirmation link to your email address. Please check your inbox and click the link to verify your account.</p>
              <p>Once your email is verified, you'll be able to log in and complete your profile.</p>
            </div>
            <div className="d-grid">
              <Link to="/login" className="btn btn-primary">
                Go to Login
              </Link>
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
          <h4 className="text-center mb-4">Create an Account</h4>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="full_name" className="form-label">Full Name</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaUser />
                </span>
                <input
                  type="text"
                  className="form-control"
                  id="full_name"
                  name="full_name"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                />
              </div>
            </div>
            
            <div className="mb-3">
              <label htmlFor="email" className="form-label">Email Address</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaEnvelope />
                </span>
                <input
                  type="email"
                  className="form-control"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>
            
            <div className="mb-3">
              <label htmlFor="password" className="form-label">Password</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaLock />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-control"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ borderLeft: 'none' }}
                >
                  {showPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
              <div className="form-text">
                Password must be at least 12 characters long
              </div>
            </div>
            
            <div className="mb-3">
              <label htmlFor="confirm_password" className="form-label">Confirm Password</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaLock />
                </span>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className="form-control"
                  id="confirm_password"
                  name="confirm_password"
                  value={formData.confirm_password}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  required
                />
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ borderLeft: 'none' }}
                >
                  {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                </button>
              </div>
            </div>
            
            <div className="mb-3">
              <label htmlFor="role" className="form-label">Register as</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaIdCard />
                </span>
                <select
                  className="form-select"
                  id="role"
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                >
                  <option value="patient">Patient</option>
                </select>
              </div>
            </div>
            
            <div className="mb-3 form-check">
              <input
                type="checkbox"
                className="form-check-input"
                id="terms_accepted"
                name="terms_accepted"
                checked={formData.terms_accepted}
                onChange={handleChange}
                required
              />
              <label className="form-check-label" htmlFor="terms_accepted">
                I agree to the <a href="#" className="text-decoration-none text-primary" onClick={(e) => { e.preventDefault(); setShowTermsModal(true); }}>Terms and Conditions</a> and <a href="#" className="text-decoration-none text-primary" onClick={(e) => { e.preventDefault(); setShowPrivacyModal(true); }}>Privacy Policy</a>
              </label>
            </div>
            
            <button
              type="submit"
              className="btn btn-primary w-100 py-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating Account...
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <p className="mb-0">
              Already have an account? <Link to="/login" className="text-decoration-none">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>

      {/* Terms and Conditions Modal */}
      {showTermsModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Terms and Conditions</h5>
                <button type="button" className="btn-close" onClick={() => setShowTermsModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                <h6>1. Acceptance of Terms</h6>
                <p>By accessing and using MS GOROSPE Psychological Assessment Center's services, you accept and agree to be bound by the terms and provision of this agreement.</p>
                
                <h6>2. Use License</h6>
                <p>Permission is granted to temporarily access MS GOROSPE's psychological assessment services for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.</p>
                
                <h6>3. Privacy and Confidentiality</h6>
                <p>We are committed to protecting your privacy and maintaining the confidentiality of your psychological assessment data. All information provided will be handled in accordance with professional ethical standards and applicable privacy laws.</p>
                
                <h6>4. Professional Standards</h6>
                <p>All psychological assessments and services are provided by licensed professionals in accordance with established psychological assessment standards and ethical guidelines.</p>
                
                <h6>5. Limitation of Liability</h6>
                <p>MS GOROSPE shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from the use or inability to use our services.</p>
                
                <h6>6. Accuracy of Information</h6>
                <p>Users are responsible for providing accurate and truthful information during assessments. Inaccurate information may affect the validity of assessment results.</p>
                
                <h6>7. Intellectual Property</h6>
                <p>All content, including psychological tests, reports, and methodologies, are proprietary to MS GOROSPE and protected by intellectual property laws.</p>
                
                <h6>8. Modification of Terms</h6>
                <p>MS GOROSPE reserves the right to modify these terms at any time. Continued use of the service constitutes acceptance of any modifications.</p>
                
                <h6>9. Contact Information</h6>
                <p>For questions regarding these terms, please contact MS GOROSPE Psychological Assessment Center.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTermsModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Policy Modal */}
      {showPrivacyModal && (
        <div className="modal fade show d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Privacy Policy</h5>
                <button type="button" className="btn-close" onClick={() => setShowPrivacyModal(false)}>
                  <FaTimes />
                </button>
              </div>
              <div className="modal-body" style={{maxHeight: '70vh', overflowY: 'auto'}}>
                <h6>1. Information We Collect</h6>
                <p>We collect information you provide directly to us, such as when you create an account, complete psychological assessments, or communicate with us. This includes personal information, assessment responses, and contact details.</p>
                
                <h6>2. How We Use Your Information</h6>
                <p>We use the information we collect to:</p>
                <ul>
                  <li>Provide psychological assessment services</li>
                  <li>Generate assessment reports and interpretations</li>
                  <li>Communicate with you about your appointments and results</li>
                  <li>Improve our services and user experience</li>
                  <li>Comply with legal and professional obligations</li>
                </ul>
                
                <h6>3. Information Sharing and Disclosure</h6>
                <p>We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as required by law or professional ethical standards. Information may be shared with:</p>
                <ul>
                  <li>Licensed mental health professionals involved in your care</li>
                  <li>Authorized healthcare providers with your consent</li>
                  <li>Legal authorities when required by law</li>
                </ul>
                
                <h6>4. Data Security</h6>
                <p>We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All data is encrypted and stored securely.</p>
                
                <h6>5. Your Rights</h6>
                <p>You have the right to:</p>
                <ul>
                  <li>Access your personal information</li>
                  <li>Correct inaccurate information</li>
                  <li>Request deletion of your data (subject to legal and professional retention requirements)</li>
                  <li>Withdraw consent for data processing</li>
                </ul>
                
                <h6>6. Data Retention</h6>
                <p>We retain your personal information and assessment data for as long as necessary to provide services and comply with legal and professional requirements. Psychological records are typically retained for a minimum of 7 years as per professional standards.</p>
                
                <h6>7. Cookies and Tracking</h6>
                <p>We use cookies and similar technologies to improve your experience on our platform, analyze usage patterns, and ensure security.</p>
                
                <h6>8. Children's Privacy</h6>
                <p>Our services are not intended for children under 13. We do not knowingly collect personal information from children under 13 without parental consent.</p>
                
                <h6>9. Changes to Privacy Policy</h6>
                <p>We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.</p>
                
                <h6>10. Contact Us</h6>
                <p>If you have questions about this privacy policy, please contact MS GOROSPE Psychological Assessment Center.</p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowPrivacyModal(false)}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Register;