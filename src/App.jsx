// App.jsx - Complete version with audit logging integration
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabaseClient';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import './App.css';
import './styles/ResponsiveForms.css';
import TestResultDetail from './pages/TestResultDetail';

// Auth Handler Component
import AuthHandler from './components/AuthHandler';
import SessionRecovery from './components/SessionRecovery';

// Core Components
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import PsychologicalTests from './pages/PsychologicalTests';
import NeuropsychologicalTests from './pages/NeuropsychologicalTests';
import NeuropsychiatricTests from './pages/NeuropsychiatricTests';
import Psychotherapy from './pages/Psychotherapy';
import ABATherapy from './pages/ABATherapy';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminPanel from './pages/AdminPanel';
import PsychometriciansList from './pages/PsychometriciansList';
import PsychologistsList from './pages/PsychologistsList';
import LandingPage from './pages/LandingPage';
import CompleteProfile from './pages/CompleteProfile';

// Appointment System Components
import AppointmentBooking from './pages/AppointmentBooking';
import AppointmentManagement from './pages/AppointmentManagement';
import MyAppointments from './pages/MyAppointments';

// Psychologist Components
import TestResultsList from './pages/TestResultsList';
import TestResultsView from './pages/TestResultsView';
import ComprehensiveReport from './pages/ComprehensiveReport';

// Specialized Dashboards
import PsychologistDashboard from './pages/PsychologistDashboard';
import Clients from './pages/Clients';
import ClientProfile from './pages/ClientProfile';
import Progress from './pages/Progress';

// Audit Logging Components
import AuditLogsAdmin from './pages/AuditLogsAdmin';

// Error Boundary for audit logging
import ErrorBoundary from './components/ErrorBoundary';

// Utility function for JSON parsing
import { safelyParseJSON } from './utils/jsonHelper';

// Audit logging utilities
import { useAuditLogger, AUDIT_ACTIONS, logAuditEvent, RESOURCE_TYPES } from './utils/auditLogger';

// Notification system
import { NotificationProvider } from './contexts/NotificationContext';

function App() {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);
  const [profileCheckComplete, setProfileCheckComplete] = useState(false);
  const [patientHasProfile, setPatientHasProfile] = useState(true);
  const [sessionError, setSessionError] = useState(false);
  const [initializationError, setInitializationError] = useState(null);

  const { logAuthEvent, logPageView } = useAuditLogger();

  useEffect(() => {
    let mounted = true;
    let initTimeout;

    const initializeApp = async () => {
      try {
        // Set a timeout for initialization
        initTimeout = setTimeout(() => {
          if (mounted && loading) {
            console.error('App initialization timeout');
            setInitializationError('Session initialization is taking too long. There might be corrupted data.');
            setSessionError(true);
            setLoading(false);
          }
        }, 10000); // 10 second timeout

        // Get initial session with error handling
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          console.error('Session error:', error);
          
          // Check if it's a corrupted session error
          if (error.message?.includes('JSON') || error.message?.includes('parse')) {
            setInitializationError('Corrupted session detected. Please clear your session.');
            setSessionError(true);
            setLoading(false);
            return;
          }
          
          throw error;
        }

        setSession(session);
        setUser(session?.user || null);
        
        if (session?.user) {
          await fetchUserRole(session.user.id);
        } else {
          setLoading(false);
          setProfileCheckComplete(true);
        }
        
        clearTimeout(initTimeout);
      } catch (error) {
        console.error('App initialization error:', error);
        
        if (mounted) {
          setInitializationError(error.message);
          setSessionError(true);
          setLoading(false);
        }
      }
    };

    initializeApp();

    // Listen for auth changes with audit logging
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        console.log('Auth state changed:', _event);
        
        if (!mounted) return;

        try {
          // Store current user info before session changes for logout logging
          const currentUser = session?.user || user;
          
          setSession(session);
          setUser(session?.user || null);
          
          // Log authentication events
          if (_event === 'SIGNED_IN' && session?.user) {
            await logAuthEvent(AUDIT_ACTIONS.LOGIN, {
              user_id: session.user.id,
              email: session.user.email,
              login_method: 'email'
            });
          } else if (_event === 'SIGNED_OUT' && currentUser) {
            // Use the user info captured before session was cleared
            await logAuditEvent({
              actionType: AUDIT_ACTIONS.LOGOUT,
              resourceType: RESOURCE_TYPES.USER,
              description: 'User logged out',
              details: {
                logout_type: 'user_initiated'
              },
              userOverride: currentUser // Pass the user info explicitly
            });
          }
          
          if (session?.user) {
            await fetchUserRole(session.user.id);
          } else {
            setUserRole(null);
            setPatientHasProfile(true);
            setLoading(false);
            setProfileCheckComplete(true);
          }
          
          // Clear any session errors on successful auth change
          setSessionError(false);
          setInitializationError(null);
        } catch (error) {
          console.error('Auth state change error:', error);
          setInitializationError(error.message);
          setSessionError(true);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(initTimeout);
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserRole = async (userId) => {
    try {
      console.log('Fetching role for user:', userId);
      
      // Reset flags at the start
      setPatientHasProfile(true);
      setProfileCheckComplete(false);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching user role:', error);
        if (error.code === 'PGRST116') {
          // No role found - check metadata
          const userMetadata = user?.user_metadata;
          if (userMetadata?.role) {
            console.log('Using role from metadata:', userMetadata.role);
            setUserRole(userMetadata.role);
            setProfileCheckComplete(true);
            setLoading(false);
            return;
          }
          // Only default to patient if no metadata role
          setUserRole('patient');
        } else {
          // For other errors, don't set any role
          setProfileCheckComplete(true);
          setLoading(false);
          return;
        }
      } else {
        const role = data?.role || 'patient';
        console.log('User role from database:', role);
        setUserRole(role);
      }
      
      // Only check profile for patients
      if (data?.role === 'patient' || (!data && !user?.user_metadata?.role)) {
        console.log('User is patient, checking profile...');
        await checkPatientProfile(userId);
      } else {
        console.log(`User is ${data?.role}, skipping profile check`);
        setPatientHasProfile(true);
      }
      
      setProfileCheckComplete(true);
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setProfileCheckComplete(true);
    } finally {
      setLoading(false);
    }
  };
  
  const checkPatientProfile = async (userId) => {
    try {
      console.log('Checking patient profile for:', userId);
      
      const { data, error } = await supabase
        .from('personal_info')
        .select('sex, civil_status, date_of_birth')
        .eq('user_id', userId)
        .single();
        
      if (error) {
        if (error.code === 'PGRST116') {
          console.log('No profile found for patient');
          setPatientHasProfile(false);
        } else {
          throw error;
        }
      } else {
        // Check if profile has default values
        const isIncomplete = (
          data.sex === 'Unspecified' || 
          data.civil_status === 'Unspecified' || 
          !data.date_of_birth
        );
        
        console.log('Profile status:', isIncomplete ? 'incomplete' : 'complete');
        setPatientHasProfile(!isIncomplete);
      }
    } catch (error) {
      console.error('Error checking patient profile:', error);
      setPatientHasProfile(false);
    }
  };

  // Determine which dashboard to render based on user role
  const renderDashboard = () => {
    switch(userRole) {
      case 'psychologist':
        return <PsychologistDashboard user={user} />;
      case 'admin':
        return <AdminPanel />;
      default:
        return <Dashboard userRole={userRole} user={user} />;
    }
  };

  // Show session recovery if there's a session error
  if (sessionError) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card">
              <div className="card-body">
                <h4 className="card-title text-danger">Session Error</h4>
                <p className="card-text">
                  {initializationError || 'There was a problem loading your session.'}
                </p>
                <SessionRecovery />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (loading || !profileCheckComplete) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading application...</p>
          <small className="text-muted">
            If this takes too long, try refreshing the page.
          </small>
        </div>
      </div>
    );
  }

  // Only redirect to profile completion if user is a patient
  const shouldRedirectToProfile = userRole === 'patient' && !patientHasProfile;
  console.log('Should redirect to profile:', shouldRedirectToProfile, 'Role:', userRole, 'Has profile:', patientHasProfile);

  return (
    <ErrorBoundary>
      <NotificationProvider>
        <Router>
          <AuthHandler userRole={userRole}>
          {!session ? (
            <>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/session-recovery" element={<SessionRecovery />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </>
          ) : (
            <>
              <Routes>
                {/* Always allow access to reset password page, even when authenticated */}
                <Route path="/reset-password" element={<ResetPassword />} />
                
                {/* All other authenticated routes */}
                <Route path="*" element={
                  <div className="app-container">
                    <Navbar user={user} userRole={userRole} />
                    <div className="content-container">
                      {(userRole === 'admin' || userRole === 'psychometrician' || userRole === 'psychologist') && (
                        <Sidebar userRole={userRole} />
                      )}
                      {userRole === 'patient' && (
                        <Sidebar userRole={userRole} />
                      )}
                      <div className={`main-content ${(userRole === 'admin' || userRole === 'psychometrician' || userRole === 'psychologist' || userRole === 'patient') ? 'with-sidebar' : ''}`}>
                        <Routes>
                          {/* Session recovery route */}
                          <Route path="/session-recovery" element={<SessionRecovery />} />
                          
                          {/* Complete Profile Route - only for patients */}
                          <Route path="/complete-profile" element={
                            userRole === 'patient' ? <CompleteProfile /> : <Navigate to="/" replace />
                          } />
                          
                          {/* Main routing logic */}
                          {shouldRedirectToProfile ? (
                            <Route path="*" element={<Navigate to="/complete-profile" replace />} />
                          ) : (
                            <>
                              {/* Dashboard */}
                              <Route path="/" element={renderDashboard()} />
                              
                              {/* Patient routes */}
                              {userRole === 'patient' && (
                                <>
                                  <Route path="/tests/:testType/:testId" element={<TestResultDetail user={user} />} />
                                  <Route path="/book-appointment" element={<AppointmentBooking user={user} />} />
                                  <Route path="/my-appointments" element={<MyAppointments user={user} />} />
                                </>
                              )}
                              
                              {/* Admin routes */}
                              {userRole === 'admin' && (
                                <>
                                  <Route path="/admin" element={<AdminPanel />} />
                                  <Route path="/psychometricians" element={<PsychometriciansList />} />
                                  <Route path="/psychologists" element={<PsychologistsList />} />
                                  <Route path="/appointment-management" element={<AppointmentManagement user={user} userRole={userRole} />} />
                                  {/* NEW: Add Audit Logs route for admins only */}
                                  <Route path="/audit-logs" element={<AuditLogsAdmin userRole={userRole} />} />
                                </>
                              )}
                              
                              {/* Psychometrician routes */}
                              {userRole === 'psychometrician' && (
                                <>
                                  <Route path="/psychological" element={<PsychologicalTests user={user} userRole={userRole} />} />
                                  <Route path="/neuropsychological" element={<NeuropsychologicalTests user={user} userRole={userRole} />} />
                                  <Route path="/neuropsychiatric" element={<NeuropsychiatricTests user={user} userRole={userRole} />} />
                                  <Route path="/psychotherapy" element={<Psychotherapy user={user} userRole={userRole} />} />
                                  <Route path="/aba-therapy" element={<ABATherapy user={user} userRole={userRole} />} />
                                  <Route path="/appointment-management" element={<AppointmentManagement user={user} userRole={userRole} />} />
                                </>
                              )}
                              
                              {/* Staff shared routes */}
                              {(userRole === 'psychometrician' || userRole === 'psychologist') && (
                                <>
                                  <Route path="/reports" element={<Reports user={user} userRole={userRole} />} />
                                </>
                              )}
                              
                              {/* Psychologist routes */}
                              {userRole === 'psychologist' && (
                                <>
                                  <Route path="/test-results" element={<TestResultsList userRole={userRole} user={user} />} />
                                  <Route path="/test-results/:testType/:testId" element={<TestResultsView userRole={userRole} user={user} />} />
                                  <Route path="/comprehensive-report/:testType/:testId" element={<ComprehensiveReport userRole={userRole} user={user} />} />
                                  <Route path="/appointment-management" element={<AppointmentManagement user={user} userRole={userRole} />} />
                                  {userRole === 'psychologist' && (
                                    <>
                                      <Route path="/clients" element={<Clients />} />
                                      <Route path="/clients/:patientId" element={<ClientProfile />} />
                                      <Route path="/progress" element={<Progress />} />
                                    </>
                                  )}
                                </>
                              )}
                              
                              {/* Common routes for all authenticated users */}
                              <Route path="/settings" element={<Settings user={user} />} />
                              
                              {/* Catch all route */}
                              <Route path="*" element={<Navigate to="/" replace />} />
                            </>
                          )}
                        </Routes>
                      </div>
                    </div>
                  </div>
                } />
              </Routes>
            </>
          )}
        </AuthHandler>
        </Router>
      </NotificationProvider>
    </ErrorBoundary>
  );
}

export default App;