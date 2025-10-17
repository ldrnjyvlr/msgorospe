// pages/LandingPage.jsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FaBrain, FaHeartbeat, FaComment, FaClock, FaMapMarkerAlt, FaEnvelope, FaPhone, FaCheckCircle, FaUserMd, FaHospital, FaEye, FaEyeSlash } from 'react-icons/fa';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Navigation } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import logoImage from '../assets/logo.png';
import heroImage from '../assets/center.png';
import aboutImage from '../assets/about.jpg';
import { supabase } from '../lib/supabaseClient';
import './LandingPage.css'; // Import custom CSS

const services = [
  {
    icon: <FaBrain size={28} />,
    iconClass: 'bg-primary',
    title: 'Psychological Test',
    description: 'Psychological tests are standardized assessments designed to measure an individuals mental and behavioral characteristics. They provide objective data on various aspects, including cognitive abilities, personality traits, emotional states, and aptitude. The results help in diagnosis, treatment planning, and personal development.'
  },
  {
    icon: <FaHeartbeat size={28} />,
    iconClass: 'bg-info',
    title: 'Neuro Psychiatric Screening',
    description: 'This service involves a preliminary evaluation to identify potential neurological or psychiatric conditions that may require further investigation. It is a brief process that helps differentiate between conditions with similar symptoms, ensuring that an individual receives the most appropriate and specialized care.'
  },
  {
    icon: <FaUserMd size={28} />,
    iconClass: 'bg-success',
    title: 'Neuro Psychological Test',
    description: 'Neuropsychological tests are comprehensive evaluations used to assess brain function and behavior. These tests measure various cognitive domains, such as memory, attention, problem-solving, and language. They are often used to diagnose and monitor conditions like traumatic brain injury, dementia, stroke, and learning disabilities.'
  },
  {
    icon: <FaComment size={28} />,
    iconClass: 'bg-warning',
    title: 'Psychotherapy',
    description: 'Psychotherapy, also known as "talk therapy," is a collaborative treatment process between a therapist and a client. It helps individuals explore their thoughts, feelings, and behaviors to gain insight and develop effective coping strategies. Psychotherapy can address a wide range of mental health concerns, including depression, anxiety, trauma, and relationship issues.'
  },
  {
    icon: <FaHospital size={28} />,
    iconClass: 'bg-danger',
    title: 'Clinical Consultation',
    description: 'Clinical consultation provides expert guidance and professional advice on complex mental health cases. This service is typically sought by other professionals, such as doctors, educators, or social workers, to assist in diagnosis, treatment planning, or to gain a different perspective on a clients case.'
  },
  {
    icon: <FaCheckCircle size={28} />,
    iconClass: 'bg-secondary',
    title: 'Personality Assessment',
    description: 'Personality assessment uses standardized tools to evaluate an individuals unique patterns of thinking, feeling, and behaving. The results provide insight into an individuals strengths, preferences, and potential challenges, which can be valuable for career planning, personal development, and improving interpersonal relationships.'
  },
  {
    icon: <FaBrain size={28} />,
    iconClass: 'bg-primary',
    title: 'Cognitive Skills Training',
    description: 'Stress management services provide individuals with practical techniques and strategies to cope with and reduce the negative effects of stress. This can include learning mindfulness, relaxation exercises, time management skills, and cognitive restructuring to build resilience and improve overall well-being.'
  },
  {
    icon: <FaHeartbeat size={28} />,
    iconClass: 'bg-info',
    title: 'Stress Management',
    description: 'Stress management services provide individuals with practical techniques and strategies to cope with and reduce the negative effects of stress. This can include learning mindfulness, relaxation exercises, time management skills, and cognitive restructuring to build resilience and improve overall well-being.'
  },
  {
    icon: <FaUserMd size={28} />,
    iconClass: 'bg-success',
    title: 'Child & Adolescent Services',
    description: 'These services are specifically tailored to address the unique developmental, emotional, and behavioral needs of children and adolescents. They include a range of interventions, such as individual therapy, play therapy, and academic support, to help young people navigate challenges and thrive.'
  },
  {
    icon: <FaComment size={28} />,
    iconClass: 'bg-warning',
    title: 'Family Counseling',
    description: 'Family counseling is a form of psychotherapy that focuses on resolving conflicts and improving communication within a family unit. It helps family members understand each others perspectives and work together to create a healthier, more supportive home environment.'
  }
];

const ServiceModal = ({ show, onClose, title, description }) => {
  React.useEffect(() => {
    if (!show) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [show, onClose]);

  if (!show) return null;
  return (
    <div
      className="custom-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(255,255,255,0.05)', // less obvious transparency
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        /* Fix for vertical centering on all browsers */
        minHeight: '100vh',
      }}
      onClick={onClose}
    >
      <div
        className="custom-modal-content"
        style={{
          background: '#fff',
          borderRadius: '10px',
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          padding: '2rem',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#888',
          }}
        >
          &times;
        </button>
        <h5 className="modal-title mb-3">{title}</h5>
        <p>{description}</p>
        <div className="text-end mt-4">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const RegisterModal = ({ show, onClose, setShowLoginModal }) => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirm_password: '',
    role: 'patient',
    terms_accepted: false
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const navigate = useNavigate();

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
    setError(null);

    if (!formData.full_name || !formData.email || !formData.password || !formData.confirm_password) {
      setError('All fields are required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      setError(passwordError);
      return false;
    }

    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match');
      return false;
    }

    if (!formData.terms_accepted) {
      setError('You must accept the terms and conditions');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
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

      setSuccess(true);
    } catch (error) {
      console.error('Registration error:', error);
      setError(error.message || 'An error occurred during registration');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!show) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [show, onClose]);

  if (!show) return null;

  if (success) {
    return (
      <div
        className="custom-modal-overlay"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(255,255,255,0.05)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
        }}
        onClick={onClose}
      >
        <div
          className="login-modal-content"
          style={{
            background: '#fff',
            borderRadius: '15px',
            maxWidth: 450,
            width: '90%',
            boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
            padding: '2.5rem 2rem',
            position: 'relative',
          }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{
              position: 'absolute',
              top: 15,
              right: 15,
              background: 'none',
              border: 'none',
              fontSize: 28,
              cursor: 'pointer',
              color: '#888',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => e.target.style.color = '#FF8FA3'}
            onMouseLeave={(e) => e.target.style.color = '#888'}
          >
            &times;
          </button>
          
          <div className="text-center mb-4">
            <img src={logoImage} alt="MS GOROSPE Logo" height="60" className="mb-3" />
            <h4 className="text-primary mb-2">Registration Successful!</h4>
            <p className="text-muted small">We've sent a confirmation link to your email address. Please check your inbox and click the link to verify your account.</p>
          </div>
          
          <div className="alert alert-success mb-4">
            <div className="d-flex align-items-start">
              <i className="fas fa-check-circle me-2 mt-1"></i>
              <div>
                <strong>Account Created Successfully!</strong>
                <div className="mt-1">Once your email is verified, you'll be able to log in and complete your profile.</div>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <button className="btn btn-primary w-100 py-3 mb-3" onClick={onClose} style={{ 
              borderRadius: '8px', 
              fontSize: '1rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #FF8FA3 0%, #FFB3BA 100%)',
              border: 'none',
              transition: 'all 0.3s ease'
            }}>
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div
      className="custom-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(255,255,255,0.05)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
      onClick={onClose}
    >
      <div
        className="login-modal-content"
        style={{
          background: '#fff',
          borderRadius: '15px',
          maxWidth: 500,
          width: '90%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          padding: '2.5rem 2rem',
          position: 'relative',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 15,
            right: 15,
            background: 'none',
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            color: '#888',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.color = '#FF8FA3'}
          onMouseLeave={(e) => e.target.style.color = '#888'}
        >
          &times;
        </button>
        
        <div className="text-center mb-4">
          <img src={logoImage} alt="MS GOROSPE Logo" height="60" className="mb-3" />
          <h4 className="text-primary mb-2">Create an Account</h4>
          <p className="text-muted small">Join MS GOROSPE Psychological Assessment Center</p>
        </div>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            <div className="d-flex align-items-start">
              <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
              <div>
                <strong>Registration Failed:</strong>
                <div className="mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label htmlFor="modalFullName" className="form-label">Full Name</label>
            <input
              type="text"
              className="form-control"
              id="modalFullName"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              required
              placeholder="Enter your full name"
              style={{ borderRadius: '8px', border: '2px solid #f0f0f0', padding: '12px' }}
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="modalEmail" className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              id="modalEmail"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="Enter your email"
              style={{ borderRadius: '8px', border: '2px solid #f0f0f0', padding: '12px' }}
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="modalPassword" className="form-label">Password</label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                id="modalPassword"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Create a password"
                style={{ borderRadius: '8px 0 0 8px', border: '2px solid #f0f0f0', padding: '12px' }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                style={{ 
                  borderLeft: 0, 
                  border: '2px solid #f0f0f0', 
                  borderLeft: 'none',
                  borderRadius: '0 8px 8px 0',
                  padding: '12px'
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            <div className="form-text">Password must be at least 12 characters long</div>
          </div>
          
          <div className="mb-3">
            <label htmlFor="modalConfirmPassword" className="form-label">Confirm Password</label>
            <div className="input-group">
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="form-control"
                id="modalConfirmPassword"
                name="confirm_password"
                value={formData.confirm_password}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
                style={{ borderRadius: '8px 0 0 8px', border: '2px solid #f0f0f0', padding: '12px' }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                tabIndex={-1}
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                style={{ 
                  borderLeft: 0, 
                  border: '2px solid #f0f0f0', 
                  borderLeft: 'none',
                  borderRadius: '0 8px 8px 0',
                  padding: '12px'
                }}
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div className="mb-3">
            <label htmlFor="modalRole" className="form-label">Register as</label>
            <select
              className="form-select"
              id="modalRole"
              name="role"
              value={formData.role}
              onChange={handleChange}
              style={{ borderRadius: '8px', border: '2px solid #f0f0f0', padding: '12px' }}
            >
              <option value="patient">Patient</option>
            </select>
          </div>
          
          <div className="mb-4 form-check">
            <input
              className="form-check-input"
              type="checkbox"
              id="modalTermsAccepted"
              name="terms_accepted"
              checked={formData.terms_accepted}
              onChange={handleChange}
              required
            />
            <label className="form-check-label" htmlFor="modalTermsAccepted">
              I agree to the <button type="button" className="btn-link text-primary" onClick={() => setShowTermsModal(true)}>Terms and Conditions</button> and <button type="button" className="btn-link text-primary" onClick={() => setShowPrivacyModal(true)}>Privacy Policy</button>
            </label>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary w-100 py-3 mb-3"
            disabled={loading}
            style={{ 
              borderRadius: '8px', 
              fontSize: '1rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #FF8FA3 0%, #FFB3BA 100%)',
              border: 'none',
              transition: 'all 0.3s ease'
            }}
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
        
        <div className="text-center">
          <p className="mb-3 text-muted small">
            Already have an account? <button onClick={() => { onClose(); setShowLoginModal(true); }} className="text-primary text-decoration-none fw-medium btn-link">Sign in here</button>
          </p>
        </div>
      </div>
    </div>
  );
};

const LoginModal = ({ show, onClose, setShowRegisterModal }) => {
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
        
        // Close modal and redirect
        onClose();
        navigate('/');
      }
    } catch (error) {
      console.error('Login error:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!show) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [show, onClose]);

  if (!show) return null;
  
  return (
    <div
      className="custom-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(255,255,255,0.05)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
      }}
      onClick={onClose}
    >
      <div
        className="login-modal-content"
        style={{
          background: '#fff',
          borderRadius: '15px',
          maxWidth: 450,
          width: '90%',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          padding: '2.5rem 2rem',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 15,
            right: 15,
            background: 'none',
            border: 'none',
            fontSize: 28,
            cursor: 'pointer',
            color: '#888',
            transition: 'color 0.2s',
          }}
          onMouseEnter={(e) => e.target.style.color = '#FF8FA3'}
          onMouseLeave={(e) => e.target.style.color = '#888'}
        >
          &times;
        </button>
        
        <div className="text-center mb-4">
          <img src={logoImage} alt="MS GOROSPE Logo" height="60" className="mb-3" />
          <h4 className="text-primary mb-2">Welcome Back</h4>
          <p className="text-muted small">Sign in to your account</p>
        </div>
        
        {error && (
          <div className="alert alert-danger" role="alert">
            <div className="d-flex align-items-start">
              <i className="fas fa-exclamation-triangle me-2 mt-1"></i>
              <div>
                <strong>Login Failed:</strong>
                <div className="mt-1">{error}</div>
              </div>
            </div>
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-3">
            <label htmlFor="modalEmail" className="form-label">Email Address</label>
            <input
              type="email"
              className="form-control"
              id="modalEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              autoComplete="email"
              style={{ borderRadius: '8px', border: '2px solid #f0f0f0', padding: '12px' }}
            />
          </div>
          
          <div className="mb-3">
            <label htmlFor="modalPassword" className="form-label">Password</label>
            <div className="input-group">
              <input
                type={showPassword ? "text" : "password"}
                className="form-control"
                id="modalPassword"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter your password"
                autoComplete="current-password"
                style={{ borderRadius: '8px 0 0 8px', border: '2px solid #f0f0f0', padding: '12px' }}
              />
              <button
                type="button"
                className="btn btn-outline-secondary"
                tabIndex={-1}
                onClick={() => setShowPassword((prev) => !prev)}
                style={{ 
                  borderLeft: 0, 
                  border: '2px solid #f0f0f0', 
                  borderLeft: 'none',
                  borderRadius: '0 8px 8px 0',
                  padding: '12px'
                }}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          
          <div className="mb-4 d-flex justify-content-between align-items-center">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="modalRememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <label className="form-check-label" htmlFor="modalRememberMe">
                Remember me
              </label>
            </div>
            <Link to="/forgot-password" className="text-decoration-none small" onClick={onClose}>
              <i className="fas fa-key me-1"></i>
              Forgot Password?
            </Link>
          </div>
          
          <button
            type="submit"
            className="btn btn-primary w-100 py-3 mb-3"
            disabled={loading}
            style={{ 
              borderRadius: '8px', 
              fontSize: '1rem',
              fontWeight: '600',
              background: 'linear-gradient(135deg, #FF8FA3 0%, #FFB3BA 100%)',
              border: 'none',
              transition: 'all 0.3s ease'
            }}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="text-center">
          <p className="mb-3 text-muted small">
            Don't have an account? <button onClick={() => { onClose(); setShowRegisterModal(true); }} className="text-primary text-decoration-none fw-medium btn-link">Sign up here</button>
          </p>
        </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const [openModal, setOpenModal] = useState(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Function to close mobile menu
  const closeMobileMenu = () => {
    const navbarCollapse = document.getElementById('navbarNav');
    if (navbarCollapse && navbarCollapse.classList.contains('show')) {
      const navbarToggler = document.querySelector('.navbar-toggler');
      if (navbarToggler) {
        navbarToggler.click();
      }
    }
  };

  // Function to scroll to services section
  const scrollToServices = (e) => {
    e.preventDefault();
    const servicesSection = document.getElementById('services');
    const navbar = document.querySelector('.navbar');
    
    if (servicesSection) {
      // Calculate precise positioning
      const navbarHeight = navbar ? navbar.offsetHeight : 80; // Default navbar height
      const servicesOffsetTop = servicesSection.offsetTop;
      const targetPosition = servicesOffsetTop - navbarHeight - 10; // Extra 10px margin
      
      // Scroll to the exact position with precise control
      window.scrollTo({
        top: Math.max(0, targetPosition), // Ensure we don't scroll to negative position
        behavior: 'smooth'
      });
      
      // Add a slight delay to ensure smooth scrolling completes
      setTimeout(() => {
        // Fine-tune the position if needed
        const currentScroll = window.pageYOffset;
        const servicesTop = servicesSection.offsetTop;
        const navbarBottom = navbarHeight;
        
        // If services section is not perfectly positioned, adjust
        if (Math.abs(currentScroll - (servicesTop - navbarBottom)) > 5) {
          window.scrollTo({
            top: servicesTop - navbarBottom,
            behavior: 'smooth'
          });
        }
      }, 300);
    }
    
    // Close mobile menu
    closeMobileMenu();
  };

  // Bootstrap collapse functionality is now handled by the global import

  // Get the currently selected service
  const selectedService = openModal !== null ? services[openModal] : null;

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light fixed-top bg-white py-3 shadow-sm">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img src={logoImage} alt="MS GOROSPE Logo" height="60" className="me-2 logo-animation" />
            <span className="fw-bold text-primary fs-4">MS GOROSPE</span>
          </Link>
          
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
            aria-controls="navbarNav"
            aria-expanded="false"
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link nav-link-hover" href="#home" onClick={closeMobileMenu}>Home</a>
              </li>
              <li className="nav-item">
                <a 
                  className="nav-link nav-link-hover" 
                  href="#services"
                  onClick={scrollToServices}
                >
                  Services
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link nav-link-hover" href="#about" onClick={closeMobileMenu}>About</a>
              </li>
              <li className="nav-item">
                <a className="nav-link nav-link-hover" href="#contact" onClick={closeMobileMenu}>Contact</a>
              </li>
            </ul>
            
            <div className="ms-lg-3 mt-3 mt-lg-0 d-flex flex-column flex-lg-row align-items-center gap-2 gap-lg-2">
              <button onClick={() => { setShowLoginModal(true); closeMobileMenu(); }} className="btn btn-outline-primary btn-sm btn-hover-effect" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>Log In</button>
              <button onClick={() => { setShowRegisterModal(true); closeMobileMenu(); }} className="btn btn-primary btn-sm btn-hover-effect" style={{ fontSize: '0.875rem', padding: '0.375rem 0.75rem' }}>Sign Up</button>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section with Background Image */}
      <section 
        id="home" 
        className="landing-hero hero-section"
        style={{
          backgroundImage: `linear-gradient(rgba(130, 162, 231, 0.83), rgba(226, 130, 170, 0.75)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          height: '100vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '80px',
          paddingBottom: '0'
        }}
      >
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-12 text-center">
              <h1 className="hero-title text-pink mb-4 animate-fadeInUp" style={{ fontSize: '3.5rem', fontWeight: '700' }}>
              MS GOROSPE Psychological Assessment Center
              </h1>
              <p className="hero-subtitle text-white mb-5 animate-fadeInUp" style={{ fontSize: '1.3rem', maxWidth: '700px', margin: '0 auto' }}>
                provides expert psychological evaluations and therapy services tailored to your unique needs.
              </p>
              <div className="animate-fadeInUp d-flex flex-column flex-sm-row gap-2 gap-sm-3 justify-content-center align-items-center">
                <button onClick={() => setShowRegisterModal(true)} className="btn btn-primary btn-lg px-4 px-sm-5 btn-pulse">Get Started</button>
                <a 
                  href="#services" 
                  className="btn btn-outline-white btn-lg px-4 px-sm-5"
                  onClick={scrollToServices}
                >
                  Our Services
                </a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Animated scroll indicator */}
        <div className="scroll-indicator">
          <div className="mouse"></div>
        </div>
      </section>
      
      {/* Services Section */}
      <section id="services" className="landing-section py-5" style={{ backgroundColor: '#ffffff', minHeight: 'auto' }}>
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title text-primary fw-bold mb-3" style={{ fontSize: '2.5rem', color: '#FF8FA3' }}>Services</h2>
            <div className="section-divider mx-auto mb-4" style={{ width: '60px', height: '3px', backgroundColor: '#FF8FA3' }}></div>
            <p className="lead text-muted" style={{ fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto' }}>
              We provide professional psychological services designed to support mental wellness and personal growth.
            </p>
          </div>
          
          {/* Desktop Services Grid - Hidden on small mobile screens */}
          <div className="d-none d-md-block">
            <div className="row g-4 justify-content-center">
              {services.map((service, idx) => (
                <div className="col-6 col-md-4 col-lg-2 d-flex justify-content-center" key={service.title}>
                  <div
                    className="service-card h-100 p-4 rounded shadow-sm"
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      width: '100%',
                      backgroundColor: '#ffffff',
                      border: 'none',
                      borderRadius: '12px',
                      transition: 'all 0.3s ease',
                      minHeight: '200px'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(255, 143, 163, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.08)';
                    }}
                  >
                    <div 
                      className="service-icon text-white rounded-circle d-flex align-items-center justify-content-center mb-3" 
                      style={{ 
                        width: '80px', 
                        height: '80px', 
                        margin: '0 auto',
                        backgroundColor: service.iconClass === 'bg-primary' ? '#FF8FA3' :
                                       service.iconClass === 'bg-info' ? '#17a2b8' :
                                       service.iconClass === 'bg-success' ? '#28a745' :
                                       service.iconClass === 'bg-warning' ? '#ffc107' :
                                       service.iconClass === 'bg-danger' ? '#dc3545' :
                                       '#6c757d',
                        boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      {service.icon}
                    </div>
                    <h4 className="service-title text-center mb-3" style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600',
                      color: '#FF8FA3',
                      lineHeight: '1.3'
                    }}>
                      {service.title}
                    </h4>
                    <button
                      className="btn btn-link"
                      style={{
                        textDecoration: 'none',
                        color: '#FF8FA3',
                        fontWeight: '500',
                        fontSize: '0.9rem',
                        padding: '0',
                        border: 'none',
                        background: 'none'
                      }}
                      onClick={() => setOpenModal(idx)}
                    >
                      Learn More
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Services Carousel - Only on small mobile screens */}
          <div className="d-md-none">
            <Swiper
              modules={[Pagination, Navigation]}
              spaceBetween={20}
              slidesPerView={1}
              pagination={{ 
                clickable: true,
                dynamicBullets: true,
                bulletClass: 'swiper-pagination-bullet-custom',
                bulletActiveClass: 'swiper-pagination-bullet-active-custom'
              }}
              navigation={false}
              breakpoints={{
                576: {
                  slidesPerView: 2,
                  spaceBetween: 20,
                },
                768: {
                  slidesPerView: 3,
                  spaceBetween: 30,
                }
              }}
              className="services-swiper"
            >
              {services.map((service, idx) => (
                <SwiperSlide key={service.title}>
                  <div
                    className="service-card-mobile h-100 p-4 rounded shadow-sm"
                    style={{ 
                      cursor: 'pointer', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'center', 
                      alignItems: 'center',
                      backgroundColor: '#ffffff',
                      border: 'none',
                      borderRadius: '15px',
                      transition: 'all 0.3s ease',
                      minHeight: '250px',
                      margin: '0 10px'
                    }}
                    onClick={() => setOpenModal(idx)}
                  >
                    <div 
                      className="service-icon-mobile text-white rounded-circle d-flex align-items-center justify-content-center mb-3" 
                      style={{ 
                        width: '90px', 
                        height: '90px', 
                        margin: '0 auto',
                        backgroundColor: service.iconClass === 'bg-primary' ? '#FF8FA3' :
                                       service.iconClass === 'bg-info' ? '#17a2b8' :
                                       service.iconClass === 'bg-success' ? '#28a745' :
                                       service.iconClass === 'bg-warning' ? '#ffc107' :
                                       service.iconClass === 'bg-danger' ? '#dc3545' :
                                       '#6c757d',
                        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.15)',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      {service.icon}
                    </div>
                    <h4 className="service-title-mobile text-center mb-3" style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: '600',
                      color: '#FF8FA3',
                      lineHeight: '1.3'
                    }}>
                      {service.title}
                    </h4>
                    <button
                      className="btn btn-link"
                      style={{
                        textDecoration: 'none',
                        color: '#FF8FA3',
                        fontWeight: '500',
                        fontSize: '1rem',
                        padding: '0',
                        border: 'none',
                        background: 'none'
                      }}
                    >
                      Learn More
                    </button>
                  </div>
                </SwiperSlide>
              ))}
            </Swiper>
          </div>
        </div>
        {/* Render modal ONCE at the end of the section */}
        <ServiceModal
          show={openModal !== null}
          onClose={() => setOpenModal(null)}
          title={selectedService?.title}
          description={selectedService?.description}
        />
      </section>
      
      {/* About Section */}
      <section id="about" className="landing-section py-5 bg-light" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <div className="about-image-wrapper">
                <img src={aboutImage} alt="About MS GOROSPE" className="img-fluid rounded shadow-lg about-image" />
                <div className="about-image-overlay">
                  <div className="experience-badge">
                    <span className="number">6+</span>
                    <span className="text">Years of Excellence</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <h2 className="section-title text-primary fw-bold mb-4">About MS Gorospe</h2>
              <div className="section-divider mb-4"></div>
              <p className="mb-4 text-justify">
                MS GOROSPE Psychological Assessment Center (MSGPAC) is a premier provider of psychological assessment services, dedicated to enhancing mental well-being through expert evaluations and innovative solutions.
              </p>
              <p className="mb-5 text-justify">
                Established in 2018 by educator Bonna Mae S. Gorospe, MSGPAC has grown from a child development center into a full-scale psychological assessment facility, serving individuals, schools, and organizations with the highest standards of care.
              </p>
              
              <div className="vision-mission-card mb-4">
                <div className="d-flex align-items-start">
                  <div className="icon-wrapper bg-primary text-white rounded-circle p-3 me-3">
                    <FaBrain size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-2">Vision</h5>
                    <p className="mb-0">
                      To be a leading psychological assessment center committed to enhancing mental well-being through innovative, accurate, and accessible psychological services.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="vision-mission-card">
                <div className="d-flex align-items-start">
                  <div className="icon-wrapper bg-info text-white rounded-circle p-3 me-3">
                    <FaHeartbeat size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-2">Mission</h5>
                    <p className="mb-0">
                      At MSGPAC, we provide high-quality psychological services that foster mental health awareness and support diverse populations through expert knowledge, advanced technologies, and a holistic approach to mental health.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="landing-section py-5 bg-gradient-primary" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title text-white fw-bold mb-3">Get in Touch</h2>
            <div className="section-divider bg-white mx-auto mb-4"></div>
            <p className="lead text-white-50">We're here to answer your questions and help you on your journey to mental wellness</p>
          </div>
          
          <div className="row justify-content-center g-4">
            <div className="col-lg-10">
              <div className="row g-4 justify-content-center">
                {/* Location Card */}
                <div className="col-12 col-sm-6 col-lg-4">
                  <div className="contact-card h-100 p-4 text-center">
                    <div className="contact-icon-wrapper mx-auto mb-3">
                      <FaMapMarkerAlt size={30} />
                    </div>
                    <h5 className="fw-bold text-dark mb-3">Visit Us</h5>
                    <p className="text-muted mb-0">
                      2nd Floor Bantay Arcade,<br />
                      Barangay VI, Roxas Dike,<br />
                      Bantay, Ilocos Sur
                    </p>
                  </div>
                </div>
                
                {/* Phone Card */}
                <div className="col-12 col-sm-6 col-lg-4">
                  <div className="contact-card h-100 p-4 text-center">
                    <div className="contact-icon-wrapper mx-auto mb-3">
                      <FaPhone size={30} />
                    </div>
                    <h5 className="fw-bold text-dark mb-3">Call Us</h5>
                    <p className="text-muted mb-0">
                      <a href="tel:+63776740984" className="text-muted text-decoration-none">(077) 674-0984</a><br />
                      <a href="tel:+639275450235" className="text-muted text-decoration-none">0927 545 0235</a><br />
                      Mon-Fri: 9:00 AM - 5:00 PM
                    </p>
                  </div>
                </div>
                
                {/* Email Card */}
                <div className="col-12 col-sm-6 col-lg-4">
                  <div className="contact-card h-100 p-4 text-center">
                    <div className="contact-icon-wrapper mx-auto mb-3">
                      <FaEnvelope size={30} />
                    </div>
                    <h5 className="fw-bold text-dark mb-3">Email Us</h5>
                    <p className="text-muted mb-0">
                      <a href="mailto:msgorospepac@gmail.com" className="text-muted text-decoration-none">msgorospepac@gmail.com</a><br />
                      <a href="mailto:info@msgorospe.com" className="text-muted text-decoration-none">info@msgorospe.com</a><br />
                      <span className="small text-muted">We'll respond within 24 hours</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* CTA Section */}
              <div className="row mt-5">
                <div className="col-12">
                  <div className="cta-section text-center">
                    <h4 className="fw-bold text-white mb-3">Ready to Start Your Journey?</h4>
                    <p className="text-white-50 mb-4">
                      Take the first step towards better mental health. Our team of professionals is ready to support you.
                    </p>
                    <div className="d-flex flex-column flex-sm-row gap-2 gap-sm-3 justify-content-center align-items-center">
                      <button onClick={() => setShowRegisterModal(true)} className="btn btn-white btn-lg px-4 px-sm-5 btn-hover-effect">Book an Appointment</button>
                      <a href="tel:+639275450235" className="btn btn-outline-white btn-lg px-4 px-sm-5 btn-hover-effect">Call Now</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer bg-dark text-white py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-4 mb-4 mb-lg-0">
              <img src={logoImage} alt="MS GOROSPE Logo" className="footer-logo mb-3" style={{maxHeight: '80px', filter: 'brightness(0) invert(1)'}} />
              <p className="text-white-50 mb-4">
                Providing premium psychological assessment services with compassion, expertise, and the highest standards of care.
              </p>
              <div className="social-links">
                <a href="#" className="social-link"><i className="fab fa-facebook-f"></i></a>
                <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
                <a href="#" className="social-link"><i className="fab fa-instagram"></i></a>
                <a href="#" className="social-link"><i className="fab fa-linkedin-in"></i></a>
              </div>
            </div>
            
            <div className="col-lg-2 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title text-white mb-3">Quick Links</h5>
              <ul className="footer-links list-unstyled">
                <li><a href="#home" className="footer-link">Home</a></li>
                <li><a href="#services" className="footer-link">Services</a></li>
                <li><a href="#about" className="footer-link">About Us</a></li>
                <li><a href="#contact" className="footer-link">Contact</a></li>
                <li><button onClick={() => { setShowLoginModal(true); closeMobileMenu(); }} className="footer-link btn-link" style={{background: 'none', border: 'none', padding: '0'}}>Client Login</button></li>
              </ul>
            </div>
            
            <div className="col-lg-3 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title text-white mb-3">Our Services</h5>
              <ul className="footer-links list-unstyled">
                <li><a href="#services" className="footer-link">Psychological Testing</a></li>
                <li><a href="#services" className="footer-link">Neuropsychiatric Screening</a></li>
                <li><a href="#services" className="footer-link">Cognitive Assessments</a></li>
                <li><a href="#services" className="footer-link">Therapy Services</a></li>
                <li><a href="#services" className="footer-link">Consultation</a></li>
              </ul>
            </div>
            
            <div className="col-lg-3 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title text-white mb-3">Contact Us</h5>
              <ul className="footer-links list-unstyled">
                <li><a href="tel:+639275450235" className="footer-link">0927 545 0235</a></li>
                <li><a href="tel:+63776740984" className="footer-link">(077) 674-0984</a></li>
                <li><a href="mailto:msgorospepac@gmail.com" className="footer-link">msgorospepac@gmail.com</a></li>
                <li><a href="mailto:info@msgorospe.com" className="footer-link">info@msgorospe.com</a></li>
                <li><a href="#contact" className="footer-link">Get Directions</a></li>
              </ul>
            </div>
          </div>
          
          <div className="row mt-4">
            <div className="col-12 text-center">
              <p className="text-white-50 mb-0">
                &copy; {new Date().getFullYear()} MS GOROSPE Psychological Assessment Center. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Login Modal */}
      <LoginModal 
        show={showLoginModal} 
        onClose={() => setShowLoginModal(false)} 
        setShowRegisterModal={setShowRegisterModal}
      />
      
      {/* Register Modal */}
      <RegisterModal 
        show={showRegisterModal} 
        onClose={() => setShowRegisterModal(false)} 
        setShowLoginModal={setShowLoginModal}
      />
    </div>
  );
};

export default LandingPage;