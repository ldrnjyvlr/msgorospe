// pages/AdminPanel.jsx - Updated with audit logging integration
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { FaUserMd, FaUser, FaChartLine, FaCalendarAlt, FaUserPlus, FaUsers, FaShieldAlt } from 'react-icons/fa';
import { useAuditLogger, AUDIT_ACTIONS } from '../utils/auditLogger';
import { Bar, Doughnut } from 'react-chartjs-2';
import { Chart, BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';
import '../styles/AdminPanel.css';

Chart.register(BarElement, ArcElement, CategoryScale, LinearScale, Tooltip, Legend);

const AdminPanel = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalPatients: 0,
    totalPsychometricians: 0,
    totalPsychologists: 0,
    recentTests: [],
    recentPatients: []
  });

  const { logPageView } = useAuditLogger();

  useEffect(() => {
    // Log admin panel access
    logPageView('Admin Panel', {
      user_role: 'admin',
      accessed_sections: ['dashboard', 'stats', 'recent_data']
    });

    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Get counts of patients and staff
      const [patientsCount, psychometriciansCount, psychologistsCount] = await Promise.all([
        supabase.from('personal_info').select('id', { count: 'exact', head: true }),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'psychometrician'),
        supabase.from('user_roles').select('id', { count: 'exact', head: true }).eq('role', 'psychologist')
      ]);
      
      // Get recent patients
      const { data: recentPatientsData } = await supabase
        .from('personal_info')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      // Get recent tests
      const { data: recentTestsData } = await supabase
        .from('psychological_tests')
        .select(`
          id, created_at,
          patient:patient_id (name),
          psychometrician:psychometrician_id (full_name)
        `)
        .order('created_at', { ascending: false })
        .limit(5);
      
      setStats({
        totalPatients: patientsCount.count || 0,
        totalPsychometricians: psychometriciansCount.count || 0,
        totalPsychologists: psychologistsCount.count || 0,
        recentPatients: recentPatientsData || [],
        recentTests: recentTestsData || []
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const violetStyle = {
    backgroundColor: '#7e3f98',
    borderColor: '#7e3f98'
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-panel-container admin-full-width">
      {/* Header Section */}
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
                    <FaShieldAlt size={24} />
                  </div>
                  <div>
                    <h2 className="mb-1 fw-bold text-dark">Admin Dashboard</h2>
                    <p className="mb-0 text-muted">Manage your healthcare system with ease</p>
                  </div>
                </div>
                <Link to="/audit-logs" className="btn shadow-sm" style={{
                  background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '15px',
                  padding: '12px 24px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0px)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                }}>
                  <FaShieldAlt className="me-2" />
                  Audit Logs
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Enhanced Professional Cards */}
      <div className="row mb-5">
        <div className="col-lg-6 mb-4">
          <div
            className="card h-100 shadow-lg border-0 position-relative"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #ff9068 100%)',
              color: '#fff',
              borderRadius: '25px',
              minHeight: 220,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 107, 107, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            }}
          >
            {/* Decorative Elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%'
            }}></div>
            
            <div className="card-body p-4 d-flex flex-column justify-content-between position-relative">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center">
                  <div
                    className="d-flex align-items-center justify-content-center me-3"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '20px',
                      width: 60,
                      height: 60,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <FaUserMd size={30} />
                  </div>
                  <div>
                    <h5 className="card-title mb-1" style={{ fontWeight: 700, fontSize: '1.2rem' }}>Psychometricians</h5>
                    <p className="mb-0 opacity-75" style={{ fontSize: '0.9rem' }}>Test administrators</p>
                  </div>
                </div>
                <div className="text-end">
                  <h1 className="mb-0" style={{ fontWeight: 800, fontSize: '3.5rem' }}>{stats.totalPsychometricians}</h1>
                </div>
              </div>
              <Link
                to="/psychometricians"
                className="btn btn-light btn-sm align-self-start"
                style={{ 
                  fontWeight: 600, 
                  borderRadius: 25,
                  padding: '10px 25px',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }}
              >
                Manage Psychometricians
              </Link>
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div
            className="card h-100 shadow-lg border-0 position-relative"
            style={{
              background: 'linear-gradient(135deg, #ff9068 0%, #ffcc70 100%)',
              color: '#fff',
              borderRadius: '25px',
              minHeight: 220,
              overflow: 'hidden',
              transition: 'all 0.3s ease',
              cursor: 'pointer'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-10px) scale(1.02)';
              e.currentTarget.style.boxShadow = '0 20px 40px rgba(255, 144, 104, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0) scale(1)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.1)';
            }}
          >
            {/* Decorative Elements */}
            <div style={{
              position: 'absolute',
              top: '-50px',
              right: '-50px',
              width: '150px',
              height: '150px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '50%'
            }}></div>
            <div style={{
              position: 'absolute',
              bottom: '-30px',
              left: '-30px',
              width: '100px',
              height: '100px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: '50%'
            }}></div>
            
            <div className="card-body p-4 d-flex flex-column justify-content-between position-relative">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="d-flex align-items-center">
                  <div
                    className="d-flex align-items-center justify-content-center me-3"
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      borderRadius: '20px',
                      width: 60,
                      height: 60,
                      backdropFilter: 'blur(10px)'
                    }}
                  >
                    <FaUserMd size={30} />
                  </div>
                  <div>
                    <h5 className="card-title mb-1" style={{ fontWeight: 700, fontSize: '1.2rem' }}>Psychologists</h5>
                    <p className="mb-0 opacity-75" style={{ fontSize: '0.9rem' }}>Clinical evaluators</p>
                  </div>
                </div>
                <div className="text-end">
                  <h1 className="mb-0" style={{ fontWeight: 800, fontSize: '3.5rem' }}>{stats.totalPsychologists}</h1>
                </div>
              </div>
              <Link
                to="/psychologists"
                className="btn btn-light btn-sm align-self-start"
                style={{ 
                  fontWeight: 600, 
                  borderRadius: 25,
                  padding: '10px 25px',
                  fontSize: '0.95rem',
                  boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.1)';
                }}
              >
                Manage Psychologists
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Security & Monitoring and Statistical Data */}
      <div className="row mb-5">
        <div className="col-lg-8 mb-4 mb-lg-0">
          <div
            className="card shadow-lg border-0 h-100"
            style={{
              borderRadius: '25px',
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(15px)',
              boxShadow: '0 15px 35px rgba(0, 0, 0, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              minHeight: 400,
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 20px 45px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 0, 0, 0.1)';
            }}
          >
            <div
              className="card-header"
              style={{
                background: 'linear-gradient(135deg, #ff6b6b 0%, #ff9068 100%)',
                color: '#fff',
                borderBottom: 'none',
                padding: '2rem',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              {/* Decorative pattern */}
              <div style={{
                position: 'absolute',
                top: '-50px',
                right: '-50px',
                width: '150px',
                height: '150px',
                background: 'rgba(255,255,255,0.1)',
                borderRadius: '50%'
              }}></div>
              <div style={{
                position: 'absolute',
                bottom: '-30px',
                left: '-30px',
                width: '100px',
                height: '100px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '50%'
              }}></div>
              <h4 className="mb-0 d-flex align-items-center" style={{ fontWeight: 800, letterSpacing: 1, color: '#fff' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#fff',
                  borderRadius: '50%',
                  width: 48,
                  height: 48,
                  marginRight: 18,
                  boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)'
                }}>
                  <FaShieldAlt style={{ color: '#ff6b6b', fontSize: 28 }} />
                </span>
                Security & Monitoring
              </h4>
            </div>
            <div className="card-body py-4 px-4 d-flex flex-column justify-content-between" style={{ minHeight: 270 }}>
              <div className="row g-4 flex-grow-1">
                <div className="col-md-6 d-flex">
                  <div
                    className="w-100 p-4 d-flex flex-column align-items-start justify-content-between"
                    style={{
                      background: 'linear-gradient(120deg, rgba(255, 107, 107, 0.1) 80%, #fff 100%)',
                      borderRadius: '1rem',
                      boxShadow: '0 2px 8px rgba(255, 107, 107, 0.1)',
                      border: '1px solid rgba(255, 107, 107, 0.2)',
                      minHeight: 180,
                      flex: 1
                    }}
                  >
                    <div className="mb-3 d-flex align-items-center">
                      <FaShieldAlt size={28} className="text-primary me-2" style={{ background: 'rgba(255, 107, 107, 0.1)', borderRadius: '50%', padding: 6, color: '#ff6b6b' }} />
                      <span className="fw-bold fs-5" style={{ color: '#ff6b6b' }}>Audit Logs</span>
                    </div>
                    <p className="mb-4 text-muted" style={{ fontSize: '1rem' }}>
                      Monitor all user activities and system events for security and compliance.
                    </p>
                    <Link to="/audit-logs" className="btn btn-gradient-primary mt-auto px-4 py-2 rounded-pill" style={{
                      fontWeight: 600,
                      background: 'linear-gradient(90deg, #ff6b6b 0%, #ff9068 100%)',
                      color: '#fff',
                      border: 'none'
                    }}>
                      View Audit Logs
                    </Link>
                  </div>
                </div>
                <div className="col-md-6 d-flex">
                  <div
                    className="w-100 p-4 d-flex flex-column align-items-start justify-content-between"
                    style={{
                      background: 'linear-gradient(120deg, rgba(255, 144, 104, 0.1) 80%, #fff 100%)',
                      borderRadius: '1rem',
                      boxShadow: '0 2px 8px rgba(255, 144, 104, 0.1)',
                      border: '1px solid rgba(255, 144, 104, 0.2)',
                      minHeight: 180,
                      flex: 1
                    }}
                  >
                    <div className="mb-3 d-flex align-items-center">
                      <FaCalendarAlt size={28} className="text-success me-2" style={{ background: 'rgba(255, 144, 104, 0.1)', borderRadius: '50%', padding: 6, color: '#ff9068' }} />
                      <span className="fw-bold fs-5" style={{ color: '#ff9068' }}>All Appointments</span>
                    </div>
                    <p className="mb-4 text-muted" style={{ fontSize: '1rem' }}>
                      Manage and review all appointments scheduled in the system.
                    </p>
                    <Link to="/appointment-management" className="btn btn-gradient-success mt-auto px-4 py-2 rounded-pill" style={{
                      fontWeight: 600,
                      background: 'linear-gradient(90deg, #ff9068 0%, #ffcc70 100%)',
                      color: '#fff',
                      border: 'none'
                    }}>
                      Manage Appointments
                    </Link>
                  </div>
                </div>
              </div>
              {/* Add a nice footer or info to occupy space */}
              <div className="mt-4 text-center">
                <span className="fw-bold" style={{ color: '#ff6b6b', fontSize: 16 }}>
                  Your system is being actively monitored for security and compliance.
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* Statistical Data beside Security & Monitoring */}
        <div className="col-lg-4 d-flex align-items-stretch">
          <div
            className="card shadow-lg border-0 w-100"
            style={{
              borderRadius: '25px',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(15px)',
              padding: '2rem',
              marginTop: '0',
              boxShadow: '0 15px 35px rgba(255, 107, 107, 0.2)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-5px)';
              e.currentTarget.style.boxShadow = '0 20px 45px rgba(255, 107, 107, 0.25)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 15px 35px rgba(255, 107, 107, 0.2)';
            }}
          >
            <div className="d-flex align-items-center mb-3 justify-content-center">
              <FaChartLine size={26} className="me-2" style={{ color: '#ff6b6b', background: '#fff', borderRadius: '50%', padding: 5, boxShadow: '0 2px 8px rgba(255, 107, 107, 0.15)' }} />
              <h6 className="mb-0" style={{ fontWeight: 700, letterSpacing: 1, color: '#2c3e50' }}>
                Statistical Data
              </h6>
            </div>
            <div className="d-flex flex-column align-items-center">
              <Doughnut
                data={{
                  labels: [
                    'Patients',
                    'Psychometricians',
                    'Psychologists'
                  ],
                  datasets: [
                    {
                      label: 'Total',
                      data: [
                        stats.totalPatients,
                        stats.totalPsychometricians,
                        stats.totalPsychologists
                      ],
                      backgroundColor: [
                        '#ff6b6b',
                        '#ff9068',
                        '#ffcc70'
                      ],
                      borderColor: '#fff',
                      borderWidth: 2,
                      hoverOffset: 10
                    }
                  ]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: { display: false },
                    tooltip: { enabled: true }
                  },
                  cutout: '75%'
                }}
                width={140}
                height={140}
              />
              <div className="mt-3 w-100 d-flex justify-content-around flex-wrap">
                <div className="text-center" style={{ minWidth: 80 }}>
                  <div style={{ width: 10, height: 10, background: '#ff6b6b', borderRadius: '50%', display: 'inline-block', marginRight: 5 }}></div>
                  <span className="fw-bold" style={{ fontSize: 12 }}>Patients</span>
                  <div className="fw-bold" style={{ fontSize: 13 }}>{stats.totalPatients}</div>
                </div>
                <div className="text-center" style={{ minWidth: 80 }}>
                  <div style={{ width: 10, height: 10, background: '#ff9068', borderRadius: '50%', display: 'inline-block', marginRight: 5 }}></div>
                  <span className="fw-bold" style={{ fontSize: 12 }}>Psychometricians</span>
                  <div className="fw-bold" style={{ fontSize: 13 }}>{stats.totalPsychometricians}</div>
                </div>
                <div className="text-center" style={{ minWidth: 80 }}>
                  <div style={{ width: 10, height: 10, background: '#ffcc70', borderRadius: '50%', display: 'inline-block', marginRight: 5 }}></div>
                  <span className="fw-bold" style={{ fontSize: 12 }}>Psychologists</span>
                  <div className="fw-bold" style={{ fontSize: 13 }}>{stats.totalPsychologists}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="row">
        {/* Removed Recent Patients and Recent Tests cards */}
      </div>
     
    </div>
  );
};

export default AdminPanel;