// components/Navbar.jsx - Updated with appointment notifications
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase, signOutUser } from '../lib/supabaseClient';
import { FaBell, FaUser, FaSignOutAlt, FaCog, FaCalendarAlt } from 'react-icons/fa';
import logo from '../assets/logo.png';

const Navbar = ({ user, userRole }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const navigate = useNavigate();
  
  useEffect(() => {
    if (user && userRole) {
      fetchNotifications();
      // Set up real-time subscription for notifications
      const subscription = supabase
        .channel('appointment_notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'appointments'
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user, userRole]);
  
  const fetchNotifications = async () => {
    if (!user) return;

    try {
      let query;
      
      if (userRole === 'patient') {
        // For patients: show appointment status updates
        const { data: patientData } = await supabase
          .from('personal_info')
          .select('id')
          .eq('user_id', user.id)
          .single();
          
        if (!patientData) return;
        
        query = supabase
          .from('appointments')
          .select(`
            id, appointment_type, appointment_date, status, queue_number,
            created_at, updated_at
          `)
          .eq('patient_id', patientData.id)
          .in('status', ['approved', 'rejected'])
          .gte('updated_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()) // Last 7 days
          .order('updated_at', { ascending: false })
          .limit(5);
      } else if (userRole === 'psychometrician') {
        // For psychometricians: show pending appointments assigned to them or unassigned
        query = supabase
          .from('appointments')
          .select(`
            id, appointment_type, appointment_date, status, queue_number,
            patient:patient_id(name), created_at
          `)
          .eq('status', 'pending')
          .or(`psychometrician_id.is.null,psychometrician_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(5);
      } else if (userRole === 'admin' || userRole === 'psychologist') {
        // For admin/psychologist: show recent pending appointments
        query = supabase
          .from('appointments')
          .select(`
            id, appointment_type, appointment_date, status, queue_number,
            patient:patient_id(name), created_at
          `)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);
      }
      
      if (query) {
        const { data, error } = await query;
        if (!error && data) {
          setNotifications(data);
          setNotificationCount(data.length);
        } else if (error) {
          console.error('Error fetching notifications:', error);
          // Set empty notifications on error to prevent UI issues
          setNotifications([]);
          setNotificationCount(0);
        }
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
      setNotifications([]);
      setNotificationCount(0);
    }
  };
  
  const toggleUserMenu = () => {
    setShowUserMenu(!showUserMenu);
    setShowNotifications(false);
  };
  
  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    setShowUserMenu(false);
  };
  
  const handleSignOut = async () => {
    try {
      console.log('Starting sign out process...');
      
      // Use the enhanced sign out function from supabaseClient
      const result = await signOutUser();
      
      if (result.success) {
        console.log('Sign out successful, navigating to login...');
      } else {
        console.warn('Sign out completed with warnings:', result.error);
      }
      
      navigate('/');
      // Refresh the page to clear any cached state
      window.location.reload();
      
    } catch (error) {
      console.error('Error in sign out process:', error);
      // Even if there's an error, try to navigate to login and refresh
      navigate('/');
      window.location.reload();
    }
  };
  
  // Get user initials for avatar
  const getUserInitials = () => {
    if (!user || !user.user_metadata) return 'U';
    
    const firstName = user.user_metadata.first_name || '';
    const lastName = user.user_metadata.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName.charAt(0)}${lastName.charAt(0)}`;
    } else if (firstName) {
      return firstName.charAt(0);
    } else if (user.email) {
      return user.email.charAt(0).toUpperCase();
    } else {
      return 'U';
    }
  };
  
  // Get user's full name or email
  const getUserDisplayName = () => {
    if (!user) return 'User';
    
    const firstName = user.user_metadata?.first_name || '';
    const lastName = user.user_metadata?.last_name || '';
    
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    } else if (firstName) {
      return firstName;
    } else {
      return user.email || 'User';
    }
  };

  const getAppointmentTypeLabel = (type) => {
    const types = {
      'psychological_test': 'Psychological Test',
      'neuropsychological_test': 'Neuropsychological Test',
      'neuropsychiatric_test': 'Neuropsychiatric Test',
      'mental_health_consultation': 'Mental Health Consultation',
      'applied_behavioral_analysis': 'Applied Behavioral Analysis',
      'play_therapy': 'Play Therapy',
      'academic_tutor': 'Academic Tutor',
      'sped_evaluation': 'Special Education Evaluation',
      'behavioral_assessment': 'Behavioral Assessment'
    };
    return types[type] || type;
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      pending: 'bg-warning',
      approved: 'bg-success',
      rejected: 'bg-danger',
      completed: 'bg-info',
      cancelled: 'bg-secondary'
    };
    return classes[status] || 'bg-secondary';
  };
  
  return (
    <nav className="navbar navbar-expand-lg navbar-light">
      <div className="container-fluid">
        {/* Mobile menu toggle button */}
        <button 
          className="navbar-toggler d-lg-none" 
          type="button" 
          onClick={() => {
            const sidebar = document.querySelector('.sidebar');
            const overlay = document.querySelector('.sidebar-overlay');
            if (sidebar && overlay) {
              sidebar.classList.toggle('active');
              overlay.classList.toggle('active');
            }
          }}
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <Link className="navbar-brand d-flex align-items-center" to="/">
          <img src={logo} alt="MS GOROSPE Logo" className="me-2" style={{ height: '40px' }} />
          <span className="font-weight-bold" style={{ color: '#ff6b6b', fontWeight: '700' }}>MS GOROSPE</span>
        </Link>
        
        <div className="d-flex align-items-center">
          {/* Notifications */}
          <div className="position-relative me-3">
            <button 
              className="btn btn-light rounded-circle p-2 position-relative" 
              title="Notifications"
              onClick={toggleNotifications}
            >
              <FaBell style={{ color: '#ff6b6b' }} />
              {notificationCount > 0 && (
                <span className="position-absolute top-0 start-100 translate-middle badge rounded-pill" style={{ background: '#ff6b6b', color: 'white' }}>
                  {notificationCount}
                  <span className="visually-hidden">unread notifications</span>
                </span>
              )}
            </button>
            
            {/* Notifications Dropdown */}
            {showNotifications && (
              <div 
                className="position-absolute end-0 mt-2 py-2 bg-white rounded shadow-sm"
                style={{ 
                  width: window.innerWidth < 768 ? '280px' : '320px', 
                  zIndex: 1000,
                  border: '1px solid #e0e0e0',
                  maxHeight: '400px',
                  overflowY: 'auto'
                }}
              >
                <div className="px-3 py-2 border-bottom">
                  <h6 className="mb-0" style={{ color: '#ff6b6b', fontWeight: '600' }}>
                    {userRole === 'patient' ? 'Appointment Updates' : 'Pending Appointments'}
                  </h6>
                </div>
                
                {notifications.length > 0 ? (
                  notifications.map(notification => (
                    <div key={notification.id} className="px-3 py-2 border-bottom">
                      <div className="d-flex justify-content-between align-items-start">
                        <div className="flex-grow-1">
                          <p className="mb-1 small">
                            <strong>{getAppointmentTypeLabel(notification.appointment_type)}</strong>
                          </p>
                          <p className="mb-1 small text-muted">
                            <FaCalendarAlt className="me-1" style={{ color: '#ff9068' }} />
                            {new Date(notification.appointment_date).toLocaleDateString()}
                            {notification.queue_number && ` • Queue #${notification.queue_number}`}
                          </p>
                          {notification.patient && (
                            <p className="mb-1 small text-muted">
                              Patient: {notification.patient.name}
                            </p>
                          )}
                          <small className="text-muted">
                            {userRole === 'patient' ? 
                              new Date(notification.updated_at).toLocaleDateString() :
                              new Date(notification.created_at).toLocaleDateString()
                            }
                          </small>
                        </div>
                        <span className={`badge ${getStatusBadgeClass(notification.status)} ms-2`}>
                          {notification.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="px-3 py-4 text-center text-muted">
                    <p className="mb-0">No new notifications</p>
                  </div>
                )}
                
                <div className="px-3 py-2 text-center border-top">
                  <Link 
                    to={userRole === 'patient' ? '/my-appointments' : '/appointment-management'} 
                    className="small text-decoration-none"
                    style={{ color: '#ff6b6b', fontWeight: '600' }}
                    onClick={() => setShowNotifications(false)}
                  >
                    View All Appointments
                  </Link>
                </div>
              </div>
            )}
          </div>
          
          {/* User Menu */}
          <div className="position-relative">
            <div 
              className="user-avatar rounded-circle d-flex align-items-center justify-content-center"
              style={{ 
                width: '40px', 
                height: '40px', 
                background: 'linear-gradient(135deg, #ff6b6b, #ff9068)',
                color: 'white',
                cursor: 'pointer',
                border: '2px solid rgba(255, 255, 255, 0.8)',
                boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)'
              }}
              onClick={toggleUserMenu}
            >
              {getUserInitials()}
            </div>
            
            {showUserMenu && (
              <div 
                className="position-absolute end-0 mt-2 py-2 bg-white rounded shadow-sm"
                style={{ 
                  width: '200px', 
                  zIndex: 1000,
                  border: '1px solid #e0e0e0'
                }}
              >
                <div className="px-3 py-2 border-bottom">
                  <p className="mb-0 fw-bold" style={{ color: '#ff6b6b' }}>{getUserDisplayName()}</p>
                  <small className="text-muted text-capitalize" style={{ color: '#ff9068' }}>{userRole}</small>
                </div>
                
                {/* Quick appointment actions for patients */}
                {userRole === 'patient' && (
                  <>
                    <Link 
                      to="/book-appointment" 
                      className="dropdown-item py-2 px-3 d-flex align-items-center"
                      style={{ color: '#444' }}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaCalendarAlt className="me-2" style={{ color: '#ff9068' }} />
                      <span>Book Appointment</span>
                    </Link>
                    <Link 
                      to="/my-appointments" 
                      className="dropdown-item py-2 px-3 d-flex align-items-center"
                      style={{ color: '#444' }}
                      onClick={() => setShowUserMenu(false)}
                    >
                      <FaBell className="me-2" style={{ color: '#ff9068' }} />
                      <span>My Appointments</span>
                    </Link>
                  </>
                )}
                
                <Link 
                  to="/settings" 
                  className="dropdown-item py-2 px-3 d-flex align-items-center"
                  style={{ color: '#444' }}
                  onClick={() => setShowUserMenu(false)}
                >
                  <FaCog className="me-2" style={{ color: '#ff9068' }} />
                  <span>Settings</span>
                </Link>
                <button 
                  className="dropdown-item py-2 px-3 d-flex align-items-center"
                  style={{ color: '#ff6b6b' }}
                  onClick={handleSignOut}
                >
                  <FaSignOutAlt className="me-2" style={{ color: '#ff6b6b' }} />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Close dropdowns when clicking outside */}
      {(showUserMenu || showNotifications) && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100"
          style={{ zIndex: 999 }}
          onClick={() => {
            setShowUserMenu(false);
            setShowNotifications(false);
          }}
        />
      )}
      
      {/* Sidebar overlay for mobile */}
      <div className="sidebar-overlay" onClick={() => {
        const sidebar = document.querySelector('.sidebar');
        const overlay = document.querySelector('.sidebar-overlay');
        if (sidebar && overlay) {
          sidebar.classList.remove('active');
          overlay.classList.remove('active');
        }
      }}></div>
    </nav>
  );

};
export default Navbar;