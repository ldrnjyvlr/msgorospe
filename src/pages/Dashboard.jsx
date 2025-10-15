// pages/Dashboard.jsx - Updated patient dashboard without test results viewing
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';
import { 
  FaBrain, 
  FaHeartbeat, 
  FaComment, 
  FaUser, 
  FaArrowUp, 
  FaArrowDown,
  FaCalendarAlt,
  FaChartLine,
  FaUsers,
  FaClock,
  FaTrophy,
  FaExclamationTriangle,
  FaCheckCircle,
  FaHourglassHalf,
  FaEye,
  FaLock
} from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';

const Dashboard = ({ userRole, user }) => {
  const navigate = useNavigate();
  
  // State management (keeping all original state)
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    psychological: { count: 0, change: 0, total: 0 },
    neuropsychiatric: { count: 0, change: 0, total: 0 },
    neuropsychological: { count: 0, change: 0, total: 0 },
    psychotherapy: { count: 0, change: 0, total: 0 }
  });
  
  // Enhanced statistics (keeping all original state)
  const [enhancedStats, setEnhancedStats] = useState({
    totalPatients: 0,
    totalPatientsChange: 0,
    activePatients: 0,
    avgTestsPerPatient: 0,
    completionRate: 0,
    totalSessions: 0,
    weeklyActivity: [],
    topPerformers: [],
    riskAlerts: 0,
    pendingReports: 0
  });

  const [professionals, setProfessionals] = useState({
    psychometricians: 0,
    psychologists: 0,
    totalUsers: 0,
    activeUsers: 0
  });

  const [recentPatients, setRecentPatients] = useState([]);
  const [systemMetrics, setSystemMetrics] = useState({
    totalTests: 0,
    testsThisWeek: 0,
    averageTestDuration: 0,
    mostActiveDay: '',
    peakHours: ''
  });
  
  // Patient-specific state (keeping all functions but not displaying sensitive data)
  const [patientInfo, setPatientInfo] = useState(null);
  const [patientTests, setPatientTests] = useState({
    psychological: [],
    neuropsychiatric: [],
    neuropsychological: []
  });
  const [patientStats, setPatientStats] = useState({
    totalTests: 0,
    latestIQ: null,
    progressTrend: 'stable',
    lastTestDate: null,
    nextAppointment: null
  });
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState(null);
  const [profileCreationInProgress, setProfileCreationInProgress] = useState(false);

  // Keep all original useEffect and data fetching functions
  useEffect(() => {
    if (userRole === 'admin') {
      fetchProfessionalCounts();
      fetchSystemMetrics();
    }
    
    if (userRole === 'patient' && user) {
      fetchPatientData();
    } else {
      fetchStats();
      fetchEnhancedStats();
      fetchRecentPatients();
    }
  }, [userRole, user]);

  // Keep all original fetching functions (unchanged)
  const fetchStats = async () => {
    try {
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      currentMonthStart.setHours(0, 0, 0, 0);
      
      const lastMonthStart = new Date(currentMonthStart);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      
      const lastMonthEnd = new Date(currentMonthStart);
      lastMonthEnd.setDate(0);
      lastMonthEnd.setHours(23, 59, 59, 999);
      
      // Fetch current month and total counts
      const [
        psychCurrentData, psychLastMonthData, psychTotalData,
        neuroCurrentData, neuroLastMonthData, neuroTotalData,
        neuroPsychCurrentData, neuroPsychLastMonthData, neuroPsychTotalData,
        therapyCurrentData, therapyLastMonthData, therapyTotalData
      ] = await Promise.all([
        // Psychological tests
        supabase.from('psychological_tests').select('count').gte('created_at', currentMonthStart.toISOString()),
        supabase.from('psychological_tests').select('count').gte('created_at', lastMonthStart.toISOString()).lte('created_at', lastMonthEnd.toISOString()),
        supabase.from('psychological_tests').select('count'),
        // Neuropsychiatric tests
        supabase.from('neuropsychiatric_tests').select('count').gte('created_at', currentMonthStart.toISOString()),
        supabase.from('neuropsychiatric_tests').select('count').gte('created_at', lastMonthStart.toISOString()).lte('created_at', lastMonthEnd.toISOString()),
        supabase.from('neuropsychiatric_tests').select('count'),
        // Neuropsychological tests
        supabase.from('neuropsychological_tests').select('count').gte('created_at', currentMonthStart.toISOString()),
        supabase.from('neuropsychological_tests').select('count').gte('created_at', lastMonthStart.toISOString()).lte('created_at', lastMonthEnd.toISOString()),
        supabase.from('neuropsychological_tests').select('count'),
        // Psychotherapy sessions
        supabase.from('psychotherapy_sessions').select('count').gte('created_at', currentMonthStart.toISOString()),
        supabase.from('psychotherapy_sessions').select('count').gte('created_at', lastMonthStart.toISOString()).lte('created_at', lastMonthEnd.toISOString()),
        supabase.from('psychotherapy_sessions').select('count')
      ]);
      
      const calculateChange = (current, previous) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100);
      };
      
      setStats({
        psychological: { 
          count: psychCurrentData.data?.[0]?.count || 0,
          change: calculateChange(psychCurrentData.data?.[0]?.count || 0, psychLastMonthData.data?.[0]?.count || 0),
          total: psychTotalData.data?.[0]?.count || 0
        },
        neuropsychiatric: { 
          count: neuroCurrentData.data?.[0]?.count || 0,
          change: calculateChange(neuroCurrentData.data?.[0]?.count || 0, neuroLastMonthData.data?.[0]?.count || 0),
          total: neuroTotalData.data?.[0]?.count || 0
        },
        neuropsychological: { 
          count: neuroPsychCurrentData.data?.[0]?.count || 0,
          change: calculateChange(neuroPsychCurrentData.data?.[0]?.count || 0, neuroPsychLastMonthData.data?.[0]?.count || 0),
          total: neuroPsychTotalData.data?.[0]?.count || 0
        },
        psychotherapy: { 
          count: therapyCurrentData.data?.[0]?.count || 0,
          change: calculateChange(therapyCurrentData.data?.[0]?.count || 0, therapyLastMonthData.data?.[0]?.count || 0),
          total: therapyTotalData.data?.[0]?.count || 0
        }
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEnhancedStats = async () => {
    try {
      const currentMonthStart = new Date();
      currentMonthStart.setDate(1);
      const lastMonthStart = new Date(currentMonthStart);
      lastMonthStart.setMonth(lastMonthStart.getMonth() - 1);
      const lastMonthEnd = new Date(currentMonthStart);
      lastMonthEnd.setDate(0);
      
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      // Fetch enhanced statistics
      const [
        totalPatientsData, totalPatientsLastMonthData,
        activePatientsData, totalTestsData, weeklyTestsData
      ] = await Promise.all([
        supabase.from('personal_info').select('count'),
        supabase.from('personal_info').select('count').gte('created_at', lastMonthStart.toISOString()).lte('created_at', lastMonthEnd.toISOString()),
        supabase.from('personal_info').select('count').gte('updated_at', weekStart.toISOString()),
        supabase.from('psychological_tests').select('count'),
        supabase.from('psychological_tests').select('count').gte('created_at', weekStart.toISOString())
      ]);

      // Calculate additional metrics
      const totalPatients = totalPatientsData.data?.[0]?.count || 0;
      const totalPatientsLastMonth = totalPatientsLastMonthData.data?.[0]?.count || 0;
      const totalTests = totalTestsData.data?.[0]?.count || 0;
      
      // Fetch test distribution for completion rate calculation
      const [completedTestsData, riskAssessmentsData] = await Promise.all([
        supabase.from('psychological_tests').select('count').not('cfit_interpretation', 'is', null),
        supabase.from('neuropsychiatric_tests').select('count').not('risk_assessment', 'is', null).contains('risk_assessment', 'high')
      ]);

      const completedTests = completedTestsData.data?.[0]?.count || 0;
      const completionRate = totalTests > 0 ? Math.round((completedTests / totalTests) * 100) : 0;

      // Calculate weekly activity (simplified)
      const weeklyActivity = await calculateWeeklyActivity();

      setEnhancedStats({
        totalPatients,
        totalPatientsChange: totalPatientsLastMonth > 0 ? Math.round(((totalPatients - totalPatientsLastMonth) / totalPatientsLastMonth) * 100) : 0,
        activePatients: activePatientsData.data?.[0]?.count || 0,
        avgTestsPerPatient: totalPatients > 0 ? Math.round((totalTests / totalPatients) * 10) / 10 : 0,
        completionRate,
        totalSessions: totalTests,
        weeklyActivity,
        riskAlerts: riskAssessmentsData.data?.[0]?.count || 0,
        pendingReports: Math.max(0, totalTests - completedTests)
      });
    } catch (error) {
      console.error('Error fetching enhanced stats:', error);
    }
  };

  const calculateWeeklyActivity = async () => {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);
      
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const activity = [];
      
      for (let i = 0; i < 7; i++) {
        const dayStart = new Date(weekStart);
        dayStart.setDate(weekStart.getDate() + i);
        dayStart.setHours(0, 0, 0, 0);
        
        const dayEnd = new Date(dayStart);
        dayEnd.setHours(23, 59, 59, 999);
        
        const { data } = await supabase
          .from('psychological_tests')
          .select('count')
          .gte('created_at', dayStart.toISOString())
          .lte('created_at', dayEnd.toISOString());
        
        activity.push({
          day: days[dayStart.getDay()],
          count: data?.[0]?.count || 0
        });
      }
      
      return activity;
    } catch (error) {
      console.error('Error calculating weekly activity:', error);
      return [];
    }
  };

  const fetchSystemMetrics = async () => {
    try {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const [
        totalTestsData, weeklyTestsData, userActivityData
      ] = await Promise.all([
        supabase.from('psychological_tests').select('count'),
        supabase.from('psychological_tests').select('count').gte('created_at', weekStart.toISOString()),
        supabase.from('users').select('count, last_sign_in_at').gte('last_sign_in_at', weekStart.toISOString())
      ]);

      setSystemMetrics({
        totalTests: totalTestsData.data?.[0]?.count || 0,
        testsThisWeek: weeklyTestsData.data?.[0]?.count || 0,
        averageTestDuration: 45,
        mostActiveDay: 'Wednesday',
        peakHours: '10:00 AM - 12:00 PM'
      });
    } catch (error) {
      console.error('Error fetching system metrics:', error);
    }
  };

  const fetchProfessionalCounts = async () => {
    try {
      const [psychometricians, psychologists, allUsers, activeUsers] = await Promise.all([
        supabase.from('user_roles').select('count').eq('role', 'psychometrician'),
        supabase.from('user_roles').select('count').eq('role', 'psychologist'),
        supabase.from('users').select('count'),
        supabase.from('users').select('count').gte('last_sign_in_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      ]);
      
      setProfessionals({
        psychometricians: psychometricians.data?.[0]?.count || 0,
        psychologists: psychologists.data?.[0]?.count || 0,
        totalUsers: allUsers.data?.[0]?.count || 0,
        activeUsers: activeUsers.data?.[0]?.count || 0
      });
    } catch (error) {
      console.error('Error fetching professional counts:', error);
    }
  };

  const fetchRecentPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('personal_info')
        .select(`
          id,
          name,
          age,
          sex,
          date_of_examination,
          purpose_of_examination,
          user_id,
          created_at,
          psychological_tests(count),
          neuropsychiatric_tests(count),
          neuropsychological_tests(count),
          psychotherapy_sessions(count)
        `)
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (!error) {
        const patientsWithStats = data.map(patient => ({
          ...patient,
          totalTests: (patient.psychological_tests?.[0]?.count || 0) +
                     (patient.neuropsychiatric_tests?.[0]?.count || 0) +
                     (patient.neuropsychological_tests?.[0]?.count || 0),
          totalSessions: patient.psychotherapy_sessions?.[0]?.count || 0
        }));
        setRecentPatients(patientsWithStats);
      }
    } catch (error) {
      console.error('Error fetching recent patients:', error);
    }
  };

  // Keep all patient functions but modify data display
  const createPatientProfile = async () => {
    if (!user || profileCreationInProgress) return;
    
    try {
      setProfileCreationInProgress(true);
      
      const userData = user.user_metadata || {};
      const fullName = userData.full_name || (userData.first_name && userData.last_name 
          ? `${userData.last_name}, ${userData.first_name}` 
          : user.email.split('@')[0]);
      
      const { data: newProfile, error: insertError } = await supabase
        .from('personal_info')
        .insert([
          {
            user_id: user.id,
            name: fullName,
            age: 0,
            sex: 'Unspecified',
            civil_status: 'Unspecified',
            nationality: 'Filipino',
            religion: 'Unspecified',
            occupation: 'Unspecified',
            address: 'Unspecified',
            educational_attainment: 'Unspecified',
            purpose_of_examination: 'Initial Assessment',
            date_of_examination: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (!insertError && newProfile && newProfile.length > 0) {
        // Log audit event for patient profile creation
        await logAuditEvent({
          actionType: AUDIT_ACTIONS.CREATE,
          resourceType: RESOURCE_TYPES.PATIENT,
          resourceId: newProfile[0].id,
          description: 'Patient profile created',
          details: {
            patient_name: fullName,
            patient_id: newProfile[0].id,
            user_id: user.id
          }
        });
        
        setPatientInfo(newProfile[0]);
        fetchPatientData(newProfile[0].id);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error creating patient profile:", error);
      return false;
    } finally {
      setProfileCreationInProgress(false);
    }
  };

  const fetchPatientData = async (providedId = null) => {
    try {
      setPatientLoading(true);
      setPatientError(null);

      let patientId = providedId;
      let personalData = null;
      
      if (!patientId) {
        const { data, error } = await supabase
          .from('personal_info')
          .select('*')
          .eq('user_id', user.id)
          .single();
  
        if (error) {
          if (error.code === 'PGRST116') {
            const profileCreated = await createPatientProfile();
            if (!profileCreated) {
              setPatientError('Your profile is incomplete. Please click the button below to complete your profile.');
              return;
            }
          } else {
            throw error;
          }
        } else {
          personalData = data;
          patientId = data.id;
          setPatientInfo(data);
        }
      }

      if (patientId) {
        // Still fetch test data but only count them, don't store sensitive info
        const [psychData, neuroData, neuroPsychData] = await Promise.all([
          supabase
            .from('psychological_tests')
            .select('id, created_at')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('neuropsychiatric_tests')
            .select('id, created_at')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false }),
          supabase
            .from('neuropsychological_tests')
            .select('id, created_at')
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false })
        ]);

        const testData = {
          psychological: psychData.data || [],
          neuropsychiatric: neuroData.data || [],
          neuropsychological: neuroPsychData.data || []
        };

        setPatientTests(testData);

        // Calculate basic statistics without sensitive data
        const totalTests = testData.psychological.length + testData.neuropsychiatric.length + testData.neuropsychological.length;
        const lastTestDate = totalTests > 0 ? Math.max(
          ...testData.psychological.map(t => new Date(t.created_at).getTime()),
          ...testData.neuropsychiatric.map(t => new Date(t.created_at).getTime()),
          ...testData.neuropsychological.map(t => new Date(t.created_at).getTime())
        ) : null;

        setPatientStats({
          totalTests,
          latestIQ: null, // Hide IQ scores
          progressTrend: 'stable',
          lastTestDate: lastTestDate ? new Date(lastTestDate) : null,
          nextAppointment: null
        });
      } else {
        setPatientError('We were unable to set up your profile. Please contact support.');
      }
    } catch (error) {
      console.error('Error in fetchPatientData:', error);
      setPatientError('An error occurred while fetching your data. Please try again later.');
    } finally {
      setPatientLoading(false);
      setLoading(false);
    }
  };

  const handleCompleteProfile = () => {
    navigate('/profile/edit');
  };

  // Updated patient dashboard without test results viewing
  const renderPatientDashboard = () => {
    if (patientLoading) {
      return (
        <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading patient data...</span>
          </div>
        </div>
      );
    }

    if (patientError) {
      return (
        <div className="alert alert-warning">
          <h5>Attention Required</h5>
          <p>{patientError}</p>
          <button onClick={handleCompleteProfile} className="btn btn-primary mt-2">
            Complete Your Profile
          </button>
          <button onClick={() => fetchPatientData()} className="btn btn-outline-secondary ms-2">
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="patient-dashboard">
        {patientInfo && (
          <>
            {/* Enhanced Patient Profile Header */}
            <div className="row mb-4">
              <div className="col-12">
                <div className="patient-header-card">
                  <div className="patient-header-content">
                    <div className="patient-avatar-section">
                      <div className="patient-avatar">
                        <FaUser className="avatar-icon" />
                      </div>
                      <div className="patient-basic-info">
                        <h2 className="patient-name">{patientInfo.name}</h2>
                        <p className="patient-role">Patient</p>
                        <div className="patient-status">
                          <span className="status-badge active">Active</span>
                        </div>
                      </div>
                    </div>
                    <div className="patient-actions">
                      <Link to="/settings/" className="btn btn-primary btn-edit-profile">
                        <FaUser className="me-2" />
                        Edit Profile
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Personal Information Cards */}
            <div className="row mb-4">
              {/* Basic Information */}
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="info-card basic-info-card">
                  <div className="card-header">
                    <h5 className="card-title">
                      <FaUser className="me-2" />
                      Basic Information
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Age</span>
                      <span className="info-value">{patientInfo.age || 'Not set'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Sex</span>
                      <span className="info-value">{patientInfo.sex || 'Not set'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Civil Status</span>
                      <span className="info-value">{patientInfo.civil_status || 'Not set'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Date of Birth</span>
                      <span className="info-value">
                        {patientInfo.date_of_birth ? 
                          new Date(patientInfo.date_of_birth).toLocaleDateString() : 
                          'Not set'
                        }
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Address</span>
                      <span className="info-value">
                        {patientInfo.address || 'Not specified'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact & Professional Info */}
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="info-card contact-info-card">
                  <div className="card-header">
                    <h5 className="card-title">
                      <FaComment className="me-2" />
                      Contact & Professional
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Email</span>
                      <span className="info-value">{user.email}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Occupation</span>
                      <span className="info-value">{patientInfo.occupation || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Education</span>
                      <span className="info-value">{patientInfo.educational_attainment || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Nationality</span>
                      <span className="info-value">{patientInfo.nationality || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Location & Background */}
              <div className="col-lg-4 col-md-6 mb-4">
                <div className="info-card location-info-card">
                  <div className="card-header">
                    <h5 className="card-title">
                      <FaHeartbeat className="me-2" />
                      Location & Background
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="info-item">
                      <span className="info-label">Religion</span>
                      <span className="info-value">{patientInfo.religion || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Place of Birth</span>
                      <span className="info-value">
                        {patientInfo.place_of_birth || 'Not specified'}
                      </span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Purpose of Exam</span>
                      <span className="info-value">{patientInfo.purpose_of_examination || 'Not specified'}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">Last Updated</span>
                      <span className="info-value">
                        {new Date(patientInfo.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Quick Actions */}
            <div className="row">
              <div className="col-12">
                <div className="info-card actions-card">
                  <div className="card-header">
                    <h5 className="card-title">
                      <FaChartLine className="me-2" />
                      Quick Actions
                    </h5>
                  </div>
                  <div className="card-body">
                    <div className="row">
                      <div className="col-md-3 mb-3">
                        <Link to="/book-appointment" className="action-btn primary-btn">
                          <FaCalendarAlt className="me-2" />
                          Book Appointment
                        </Link>
                      </div>
                      <div className="col-md-3 mb-3">
                        <Link to="/my-appointments" className="action-btn secondary-btn">
                          <FaClock className="me-2" />
                          My Appointments
                        </Link>
                      </div>
                      <div className="col-md-3 mb-3">
                        <Link to="/settings" className="action-btn success-btn">
                          <FaUser className="me-2" />
                          Update Profile
                        </Link>
                      </div>
                      <div className="col-md-3 mb-3">
                        <Link to="/progress" className="action-btn info-btn">
                          <FaChartLine className="me-2" />
                          View Progress
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </>
        )}
      </div>
    );
  };

  // Keep all other render functions unchanged
  const renderStaffDashboard = () => {
    return (
      <div className="staff-dashboard">
        {/* Main Statistics Row */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="stat-card modern-card psychological-card">
              <div className="card-header-gradient"></div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                  <FaBrain className="text-white" />
                </div>
                <div className={`change ${stats.psychological.change >= 0 ? 'up' : 'down'}`}>
                  {stats.psychological.change >= 0 ? 
                    <><FaArrowUp className="me-1" />{stats.psychological.change}%</> : 
                    <><FaArrowDown className="me-1" />{Math.abs(stats.psychological.change)}%</>
                  }
                </div>
              </div>
              <h2 className="count modern-count">{stats.psychological.count}</h2>
              <div className="label modern-label">Psychological Tests</div>
              <div className="text-muted small modern-subtext">This month (Total: {stats.psychological.total})</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card modern-card neuropsychiatric-card">
              <div className="card-header-gradient"></div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                  <FaHeartbeat className="text-white" />
                </div>
                <div className={`change ${stats.neuropsychiatric.change >= 0 ? 'up' : 'down'}`}>
                  {stats.neuropsychiatric.change >= 0 ? 
                    <><FaArrowUp className="me-1" />{stats.neuropsychiatric.change}%</> : 
                    <><FaArrowDown className="me-1" />{Math.abs(stats.neuropsychiatric.change)}%</>
                  }
                </div>
              </div>
              <h2 className="count modern-count">{stats.neuropsychiatric.count}</h2>
              <div className="label modern-label">Neuropsychiatric Tests</div>
              <div className="text-muted small modern-subtext">This month (Total: {stats.neuropsychiatric.total})</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card modern-card neuropsychological-card">
              <div className="card-header-gradient"></div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                  <FaBrain className="text-white" />
                </div>
                <div className={`change ${stats.neuropsychological.change >= 0 ? 'up' : 'down'}`}>
                  {stats.neuropsychological.change >= 0 ? 
                    <><FaArrowUp className="me-1" />{stats.neuropsychological.change}%</> : 
                    <><FaArrowDown className="me-1" />{Math.abs(stats.neuropsychological.change)}%</>
                  }
                </div>
              </div>
              <h2 className="count modern-count">{stats.neuropsychological.count}</h2>
              <div className="label modern-label">Neuropsychological Tests</div>
              <div className="text-muted small modern-subtext">This month (Total: {stats.neuropsychological.total})</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card modern-card therapy-card">
              <div className="card-header-gradient"></div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                  <FaComment className="text-white" />
                </div>
                <div className={`change ${stats.psychotherapy.change >= 0 ? 'up' : 'down'}`}>
                  {stats.psychotherapy.change >= 0 ? 
                    <><FaArrowUp className="me-1" />{stats.psychotherapy.change}%</> : 
                    <><FaArrowDown className="me-1" />{Math.abs(stats.psychotherapy.change)}%</>
                  }
                </div>
              </div>
              <h2 className="count modern-count">{stats.psychotherapy.count}</h2>
              <div className="label modern-label">Therapy Sessions</div>
              <div className="text-muted small modern-subtext">This month (Total: {stats.psychotherapy.total})</div>
            </div>
          </div>
        </div>

        {/* Enhanced Statistics Row */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="stat-card modern-card enhanced-card patients-card">
              <div className="card-header-gradient"></div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                  <FaUsers className="text-white" />
                </div>
                <div className={`change ${enhancedStats.totalPatientsChange >= 0 ? 'up' : 'down'}`}>
                  {enhancedStats.totalPatientsChange >= 0 ? 
                    <><FaArrowUp className="me-1" />{enhancedStats.totalPatientsChange}%</> : 
                    <><FaArrowDown className="me-1" />{Math.abs(enhancedStats.totalPatientsChange)}%</>
                  }
                </div>
              </div>
              <h2 className="count modern-count">{enhancedStats.totalPatients}</h2>
              <div className="label modern-label">Total Patients</div>
              <div className="text-muted small modern-subtext">Active: {enhancedStats.activePatients}</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card modern-card enhanced-card analytics-card">
              <div className="card-header-gradient"></div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                  <FaChartLine className="text-white" />
                </div>
              </div>
              <h2 className="count modern-count">{enhancedStats.avgTestsPerPatient}</h2>
              <div className="label modern-label">Avg Tests/Patient</div>
              <div className="text-muted small modern-subtext">System average</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card modern-card enhanced-card completion-card">
              <div className="card-header-gradient"></div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                  <FaCheckCircle className="text-white" />
                </div>
              </div>
              <h2 className="count modern-count">{enhancedStats.completionRate}%</h2>
              <div className="label modern-label">Completion Rate</div>
              <div className="text-muted small modern-subtext">Tests completed</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card modern-card enhanced-card alerts-card">
              <div className="card-header-gradient"></div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                  <FaExclamationTriangle className="text-white" />
                </div>
              </div>
              <h2 className="count modern-count">{enhancedStats.riskAlerts}</h2>
              <div className="label modern-label">Risk Alerts</div>
              <div className="text-muted small modern-subtext">Pending: {enhancedStats.pendingReports}</div>
            </div>
          </div>
        </div>

        {/* Weekly Activity Chart */}
        <div className="row mb-4">
          <div className="col-md-6">
            <div className="card modern-chart-card">
              <div className="card-header modern-card-header">
                <h6 className="mb-0 modern-card-title">
                  <FaChartLine className="me-2" />
                  Weekly Activity
                </h6>
              </div>
              <div className="card-body">
                <div className="activity-chart-container">
                  <div className="d-flex justify-content-between align-items-end activity-bars" style={{ height: '120px' }}>
                    {enhancedStats.weeklyActivity.map((day, index) => {
                      const maxCount = Math.max(...enhancedStats.weeklyActivity.map(d => d.count), 1);
                      const height = Math.max(15, (day.count / maxCount) * 90);
                      return (
                        <div key={index} className="text-center activity-bar-item">
                          <div className="activity-bar-wrapper">
                            <div 
                              className="activity-bar"
                              style={{ 
                                height: `${height}px`,
                                animationDelay: `${index * 0.1}s`
                              }}
                            ></div>
                            <div className="activity-bar-value">{day.count}</div>
                          </div>
                          <small className="activity-day-label">{day.day}</small>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="col-md-6">
            <div className="card modern-actions-card">
              <div className="card-header modern-card-header">
                <h6 className="mb-0 modern-card-title">
                  <FaTrophy className="me-2" />
                  Quick Actions
                </h6>
              </div>
              <div className="card-body">
                <div className="d-grid gap-3">
                  <Link to="/psychological" className="btn modern-action-btn psychological-btn">
                    <FaBrain className="me-2" />
                    New Psychological Test
                  </Link>
                  <Link to="/neuropsychiatric" className="btn modern-action-btn neuropsychiatric-btn">
                    <FaHeartbeat className="me-2" />
                    New Neuropsychiatric Test
                  </Link>
                  <Link to="/neuropsychological" className="btn modern-action-btn neuropsychological-btn">
                    <FaBrain className="me-2" />
                    New Neuropsychological Test
                  </Link>
                  <Link to="/psychotherapy" className="btn modern-action-btn therapy-btn">
                    <FaComment className="me-2" />
                    New Therapy Session
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Recent Patients Table - Hidden for psychometricians */}
        {userRole !== 'psychometrician' && (
          <div className="row">
            <div className="col-md-12">
              <div className="card modern-table-card">
                <div className="card-header modern-card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 modern-card-title">
                    <FaUsers className="me-2" />
                    Recent Patients
                  </h5>
                  <Link to="/patients" className="btn btn-sm modern-view-btn">
                    <FaEye className="me-1" />
                    View All
                  </Link>
                </div>
                <div className="card-body p-0">
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 modern-table">
                      <thead className="modern-table-header">
                        <tr>
                          <th className="modern-th">Patient</th>
                          <th className="modern-th">Demographics</th>
                          <th className="modern-th">Tests</th>
                          <th className="modern-th">Sessions</th>
                          <th className="modern-th">Exam Date</th>
                          <th className="modern-th">Purpose</th>
                          <th className="modern-th">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recentPatients.length > 0 ? (
                          recentPatients.map((patient) => (
                            <tr key={patient.id} className="modern-table-row">
                              <td className="modern-td">
                                <div className="patient-info">
                                  <div className="patient-avatar">
                                    <FaUser className="text-primary" />
                                  </div>
                                  <div className="patient-details">
                                    <strong className="patient-name">{patient.name}</strong>
                                    <br />
                                    <small className="text-muted patient-id">ID: {patient.id}</small>
                                  </div>
                                </div>
                              </td>
                              <td className="modern-td">
                                <span className="demographics-badge">
                                  {patient.age} / {patient.sex}
                                </span>
                              </td>
                              <td className="modern-td">
                                <span className="badge modern-badge tests-badge">
                                  <FaBrain className="me-1" />
                                  {patient.totalTests}
                                </span>
                              </td>
                              <td className="modern-td">
                                <span className="badge modern-badge sessions-badge">
                                  <FaComment className="me-1" />
                                  {patient.totalSessions}
                                </span>
                              </td>
                              <td className="modern-td">
                                <span className="date-badge">
                                  {patient.date_of_examination ? new Date(patient.date_of_examination).toLocaleDateString() : 'Not scheduled'}
                                </span>
                              </td>
                              <td className="modern-td">
                                <span className="purpose-text">{patient.purpose_of_examination}</span>
                              </td>
                              <td className="modern-td">
                                {patient.totalTests > 0 ? (
                                  <span className="badge modern-badge status-badge active-badge">
                                    <FaCheckCircle className="me-1" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="badge modern-badge status-badge pending-badge">
                                    <FaHourglassHalf className="me-1" />
                                    Pending
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="7" className="text-center py-5 modern-empty-state">
                              <FaUsers className="text-muted mb-3" size={48} />
                              <h6 className="text-muted">No recent patients found</h6>
                              <p className="text-muted small">New patients will appear here once they register</p>
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
        )}
      </div>
    );
  };

  const renderAdminDashboard = () => {
    return (
      <div className="admin-dashboard">
        {/* System Overview */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="stat-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(126, 63, 152, 0.1)' }}>
                  <FaUser className="text-primary" />
                </div>
              </div>
              <h2 className="count">{professionals.totalUsers}</h2>
              <div className="label">Total Users</div>
              <div className="text-muted small">Active: {professionals.activeUsers}</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(23, 162, 184, 0.1)' }}>
                  <FaChartLine className="text-info" />
                </div>
              </div>
              <h2 className="count">{systemMetrics.totalTests}</h2>
              <div className="label">Total Tests</div>
              <div className="text-muted small">This week: {systemMetrics.testsThisWeek}</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(40, 167, 69, 0.1)' }}>
                  <FaClock className="text-success" />
                </div>
              </div>
              <h2 className="count">{systemMetrics.averageTestDuration}</h2>
              <div className="label">Avg Duration (min)</div>
              <div className="text-muted small">Per test session</div>
            </div>
          </div>
          
          <div className="col-md-3">
            <div className="stat-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(255, 193, 7, 0.1)' }}>
                  <FaCalendarAlt className="text-warning" />
                </div>
              </div>
              <h2 className="count text-truncate" style={{ fontSize: '1.2rem' }}>{systemMetrics.mostActiveDay}</h2>
              <div className="label">Most Active Day</div>
              <div className="text-muted small">Peak: {systemMetrics.peakHours}</div>
            </div>
          </div>
        </div>

        {/* Professional Counts */}
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="stat-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(126, 63, 152, 0.1)' }}>
                  <FaUser className="text-primary" />
                </div>
              </div>
              <h2 className="count">{professionals.psychometricians}</h2>
              <div className="label">Psychometricians</div>
              <Link to="/psychometricians" className="btn btn-sm btn-outline-primary mt-3">Manage</Link>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="stat-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(23, 162, 184, 0.1)' }}>
                  <FaUser className="text-info" />
                </div>
              </div>
              <h2 className="count">{professionals.psychologists}</h2>
              <div className="label">Psychologists</div>
              <Link to="/psychologists" className="btn btn-sm btn-outline-info mt-3">Manage</Link>
            </div>
          </div>
          
          <div className="col-md-4">
            <div className="stat-card">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="icon rounded-circle d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(40, 167, 69, 0.1)' }}>
                  <FaUser className="text-success" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Include Staff Dashboard Statistics */}
        {renderStaffDashboard()}
      </div>
    );
  };

  // Loading state for non-patient users
  if (loading && userRole !== 'patient') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Main dashboard render
  return (
    <div className="dashboard-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Welcome Back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</h1>
        <div className="text-end">
          <p className="text-muted mb-0">Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <small className="text-muted">Role: {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}</small>
        </div>
      </div>
      
      {userRole === 'patient' && renderPatientDashboard()}
      {(userRole === 'psychometrician' || userRole === 'psychologist') && renderStaffDashboard()}
      {userRole === 'admin' && renderAdminDashboard()}

      {/* Modern CSS for enhanced dashboard */}
      <style jsx>{`
        /* Base stat card styling */
        .stat-card {
          background: #fff;
          border: 1px solid #e3e6f0;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .stat-card:hover {
          box-shadow: 0 0.5rem 2.5rem 0 rgba(58, 59, 69, 0.25);
          transform: translateY(-4px);
        }
        
        /* Modern card enhancements */
        .modern-card {
          border: none;
          border-radius: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%);
        }
        
        .modern-card:hover {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          transform: translateY(-6px);
        }
        
        /* Card header gradients */
        .card-header-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          border-radius: 1rem 1rem 0 0;
        }
        
        .psychological-card .card-header-gradient {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
        
        .neuropsychiatric-card .card-header-gradient {
          background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
        }
        
        .neuropsychological-card .card-header-gradient {
          background: linear-gradient(90deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .therapy-card .card-header-gradient {
          background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%);
        }
        
        .patients-card .card-header-gradient {
          background: linear-gradient(90deg, #fa709a 0%, #fee140 100%);
        }
        
        .analytics-card .card-header-gradient {
          background: linear-gradient(90deg, #a8edea 0%, #fed6e3 100%);
        }
        
        .completion-card .card-header-gradient {
          background: linear-gradient(90deg, #d299c2 0%, #fef9d7 100%);
        }
        
        .alerts-card .card-header-gradient {
          background: linear-gradient(90deg, #ff9a9e 0%, #fecfef 100%);
        }
        
        /* Modern icons */
        .modern-icon {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .psychological-card .modern-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .neuropsychiatric-card .modern-icon {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .neuropsychological-card .modern-icon {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        .therapy-card .modern-icon {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
        
        .patients-card .modern-icon {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }
        
        .analytics-card .modern-icon {
          background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
        }
        
        .completion-card .modern-icon {
          background: linear-gradient(135deg, #d299c2 0%, #fef9d7 100%);
        }
        
        .alerts-card .modern-icon {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
        }
        
        /* Modern typography */
        .modern-count {
          font-size: 2.5rem;
          font-weight: 800;
          color: #2d3748;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .modern-label {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #718096;
          margin-bottom: 0.5rem;
          letter-spacing: 0.5px;
        }
        
        .modern-subtext {
          color: #a0aec0;
          font-size: 0.8rem;
        }
        
        /* Change indicators */
        .change.up {
          color: #48bb78;
          font-size: 0.875rem;
          font-weight: 700;
          background: rgba(72, 187, 120, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
        }
        
        .change.down {
          color: #f56565;
          font-size: 0.875rem;
          font-weight: 700;
          background: rgba(245, 101, 101, 0.1);
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
        }
        
        /* Chart and Actions Cards */
        .modern-chart-card, .modern-actions-card {
          border: none;
          border-radius: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%);
        }
        
        .modern-card-header {
          background: transparent;
          border-bottom: 1px solid #e2e8f0;
          border-radius: 1rem 1rem 0 0;
          padding: 1.25rem 1.5rem;
        }
        
        .modern-card-title {
          color: #2d3748;
          font-weight: 600;
          font-size: 1.1rem;
        }
        
        /* Activity Chart */
        .activity-chart-container {
          padding: 1rem 0;
        }
        
        .activity-bar-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
        }
        
        .activity-bar-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          height: 100px;
          justify-content: flex-end;
        }
        
        .activity-bar {
          width: 24px;
          background: linear-gradient(180deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px 12px 0 0;
          animation: growUp 0.8s ease-out forwards;
          transform-origin: bottom;
          transform: scaleY(0);
        }
        
        @keyframes growUp {
          to {
            transform: scaleY(1);
          }
        }
        
        .activity-bar-value {
          position: absolute;
          top: -25px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #4a5568;
          background: rgba(255, 255, 255, 0.9);
          padding: 0.25rem 0.5rem;
          border-radius: 0.5rem;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }
        
        .activity-day-label {
          margin-top: 0.5rem;
          color: #718096;
          font-weight: 500;
          font-size: 0.8rem;
        }
        
        /* Action Buttons */
        .modern-action-btn {
          border: none;
          border-radius: 0.75rem;
          padding: 0.875rem 1.25rem;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .modern-action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
        
        .psychological-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .neuropsychiatric-btn {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
          color: white;
        }
        
        .neuropsychological-btn {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
          color: white;
        }
        
        .therapy-btn {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: white;
        }
        
        /* Table Styling */
        .modern-table-card {
          border: none;
          border-radius: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%);
        }
        
        .modern-view-btn {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          font-weight: 600;
          transition: all 0.3s;
        }
        
        .modern-view-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
          color: white;
        }
        
        .modern-table {
          border-collapse: separate;
          border-spacing: 0;
        }
        
        .modern-table-header {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        }
        
        .modern-th {
          border: none;
          padding: 1rem 1.5rem;
          font-weight: 600;
          color: #4a5568;
          font-size: 0.875rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .modern-table-row {
          transition: all 0.3s;
        }
        
        .modern-table-row:hover {
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          transform: scale(1.01);
        }
        
        .modern-td {
          border: none;
          padding: 1rem 1.5rem;
          vertical-align: middle;
        }
        
        .patient-info {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        
        .patient-avatar {
          width: 2.5rem;
          height: 2.5rem;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
        }
        
        .patient-name {
          color: #2d3748;
          font-size: 0.95rem;
        }
        
        .patient-id {
          color: #a0aec0;
          font-size: 0.8rem;
        }
        
        .demographics-badge {
          background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
          color: #234e52;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .modern-badge {
          border: none;
          border-radius: 1rem;
          padding: 0.375rem 0.75rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .tests-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }
        
        .sessions-badge {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: white;
        }
        
        .date-badge {
          background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
          color: #9c4221;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .purpose-text {
          color: #4a5568;
          font-size: 0.9rem;
        }
        
        .status-badge {
          font-size: 0.8rem;
        }
        
        .active-badge {
          background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
          color: white;
        }
        
        .pending-badge {
          background: linear-gradient(135deg, #ed8936 0%, #dd6b20 100%);
          color: white;
        }
        
        .modern-empty-state {
          color: #a0aec0;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .modern-count {
            font-size: 2rem;
          }
          
          .modern-icon {
            width: 3rem;
            height: 3rem;
          }
          
          .patient-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
          
          .activity-bar {
            width: 20px;
          }
        }
        
        /* Animation for cards on load */
        .modern-card {
          animation: slideInUp 0.6s ease-out;
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Enhanced Patient Dashboard Styles */
        .patient-header-card {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 50%, #fecfef 100%);
          border-radius: 1rem;
          padding: 2rem;
          color: white;
          box-shadow: 0 8px 32px rgba(255, 154, 158, 0.3);
          margin-bottom: 2rem;
        }

        .patient-header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .patient-avatar-section {
          display: flex;
          align-items: center;
          gap: 1.5rem;
        }

        .patient-avatar {
          width: 80px;
          height: 80px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          backdrop-filter: blur(10px);
          border: 2px solid rgba(255, 255, 255, 0.3);
        }

        .avatar-icon {
          font-size: 2rem;
          color: white;
        }

        .patient-basic-info h2 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
        }

        .patient-role {
          margin: 0;
          opacity: 0.9;
          font-size: 1.1rem;
          margin-bottom: 0.5rem;
        }

        .status-badge {
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .status-badge.active {
          background: rgba(72, 187, 120, 0.2);
          color: #48bb78;
          border: 1px solid rgba(72, 187, 120, 0.3);
        }

        .btn-edit-profile {
          background: rgba(255, 255, 255, 0.2);
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: white;
          backdrop-filter: blur(10px);
          transition: all 0.3s ease;
        }

        .btn-edit-profile:hover {
          background: rgba(255, 255, 255, 0.3);
          border-color: rgba(255, 255, 255, 0.5);
          color: white;
          transform: translateY(-2px);
        }

        /* Information Cards */
        .info-card {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          border: none;
          transition: all 0.3s ease;
          height: 100%;
        }

        .info-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        }

        .info-card .card-header {
          background: linear-gradient(135deg, #f8f9fc 0%, #e2e8f0 100%);
          border-bottom: 1px solid #e2e8f0;
          border-radius: 1rem 1rem 0 0;
          padding: 1.25rem 1.5rem;
        }

        .info-card .card-title {
          margin: 0;
          font-size: 1.1rem;
          font-weight: 600;
          color: #2d3748;
          display: flex;
          align-items: center;
        }

        .info-card .card-body {
          padding: 1.5rem;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0.75rem 0;
          border-bottom: 1px solid #f7fafc;
        }

        .info-item:last-child {
          border-bottom: none;
        }

        .info-label {
          font-weight: 600;
          color: #4a5568;
          font-size: 0.9rem;
        }

        .info-value {
          color: #2d3748;
          font-weight: 500;
          text-align: right;
          max-width: 60%;
          word-break: break-word;
        }

        /* Card Type Specific Styles */
        .basic-info-card .card-header {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
          color: white;
        }

        .basic-info-card .card-title {
          color: white;
        }

        .contact-info-card .card-header {
          background: linear-gradient(135deg, #ffb347 0%, #ffcc33 100%);
          color: white;
        }

        .contact-info-card .card-title {
          color: white;
        }

        .location-info-card .card-header {
          background: linear-gradient(135deg, #ff8a80 0%, #ffab91 100%);
          color: white;
        }

        .location-info-card .card-title {
          color: white;
        }

        .address-card .card-header {
          background: linear-gradient(135deg, #ffab91 0%, #ffcc80 100%);
          color: white;
        }

        .address-card .card-title {
          color: white;
        }

        .address-display {
          background: #fff5f5;
          border-radius: 0.5rem;
          padding: 1rem;
          border-left: 4px solid #ff9a9e;
        }

        .address-text {
          margin: 0;
          color: #2d3748;
          font-size: 1rem;
          line-height: 1.6;
        }

        /* Actions Card */
        .actions-card .card-header {
          background: linear-gradient(135deg, #ff9a9e 0%, #ffb347 100%);
          color: white;
        }

        .actions-card .card-title {
          color: white;
        }

        .action-btn {
          display: block;
          width: 100%;
          padding: 1rem;
          text-decoration: none;
          border-radius: 0.75rem;
          font-weight: 600;
          text-align: center;
          transition: all 0.3s ease;
          border: none;
          font-size: 0.95rem;
        }

        .action-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
          text-decoration: none;
        }

        .primary-btn {
          background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
          color: white;
        }

        .secondary-btn {
          background: linear-gradient(135deg, #ff8a80 0%, #ffab91 100%);
          color: white;
        }

        .success-btn {
          background: linear-gradient(135deg, #ffb347 0%, #ffcc33 100%);
          color: white;
        }

        .info-btn {
          background: linear-gradient(135deg, #ffab91 0%, #ffcc80 100%);
          color: white;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .patient-header-content {
            flex-direction: column;
            text-align: center;
          }

          .patient-avatar-section {
            flex-direction: column;
            text-align: center;
          }

          .patient-basic-info h2 {
            font-size: 1.5rem;
          }

          .info-item {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.25rem;
          }

          .info-value {
            text-align: left;
            max-width: 100%;
          }

          .action-btn {
            margin-bottom: 0.5rem;
          }
        }

        /* Animation for patient dashboard */
        .patient-dashboard .info-card {
          animation: slideInUp 0.6s ease-out;
        }

        .patient-dashboard .info-card:nth-child(1) { animation-delay: 0.1s; }
        .patient-dashboard .info-card:nth-child(2) { animation-delay: 0.2s; }
        .patient-dashboard .info-card:nth-child(3) { animation-delay: 0.3s; }
        .patient-dashboard .info-card:nth-child(4) { animation-delay: 0.4s; }
      `}</style>
    </div>
  );
};

export default Dashboard;