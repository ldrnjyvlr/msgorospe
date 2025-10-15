// pages/AppointmentManagement.jsx - Restricted to Admin and Psychometricians only
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaCalendarAlt, FaCheck, FaTimes, FaEye, FaClock, FaUsers, FaFilter, FaSync, FaExclamationTriangle } from 'react-icons/fa';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const AppointmentManagement = ({ user, userRole }) => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [dailyStats, setDailyStats] = useState({});
  const [processing, setProcessing] = useState(null);

  const appointmentTypes = [
    { value: 'psychological_test', label: 'Psychological Test', maxSlots: 50 },
    { value: 'neuropsychological_test', label: 'Neuropsychological Test', maxSlots: 50 },
    { value: 'neuropsychiatric_test', label: 'Neuropsychiatric Test', maxSlots: 50 },
    { value: 'mental_health_consultation', label: 'Mental Health Consultation', maxSlots: 15 },
    { value: 'applied_behavioral_analysis', label: 'Applied Behavioral Analysis', maxSlots: 15 },
    { value: 'play_therapy', label: 'Play Therapy', maxSlots: 15 },
    { value: 'academic_tutor', label: 'Academic Tutor', maxSlots: 15 },
    { value: 'sped_evaluation', label: 'Special Education Evaluation', maxSlots: 15 },
    { value: 'behavioral_assessment', label: 'Behavioral Assessment', maxSlots: 15 }
  ];

  // Check if user has access to appointment management
  const hasAccess = userRole === 'admin' || userRole === 'psychometrician';

  useEffect(() => {
    if (hasAccess) {
      fetchAppointments();
    } else {
      setLoading(false);
    }
  }, [hasAccess]);

  useEffect(() => {
    if (hasAccess) {
      applyFilters();
    }
  }, [appointments, statusFilter, typeFilter, dateFilter, hasAccess]);

  // If user doesn't have access, show restricted access message
  if (!hasAccess) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-8">
            <div className="card border-danger">
              <div className="card-header bg-danger text-white">
                <h5 className="mb-0">
                  <FaExclamationTriangle className="me-2" />
                  Access Restricted
                </h5>
              </div>
              <div className="card-body text-center">
                <FaUsers className="text-muted mb-3" size={64} />
                <h4 className="text-danger mb-3">Appointment Management Access Denied</h4>
                <p className="text-muted mb-4">
                  This section is restricted to <strong>Administrators</strong> and <strong>Psychometricians</strong> only.
                </p>
                <div className="alert alert-info">
                  <h6 className="alert-heading">Your Role: {userRole?.charAt(0).toUpperCase() + userRole?.slice(1) || 'Unknown'}</h6>
                  <p className="mb-0">
                    {userRole === 'psychologist' && 'As a Psychologist, you have access to patient records and clinical tools, but not appointment scheduling management.'}
                    {userRole === 'patient' && 'As a Patient, you can view and manage your own appointments through "My Appointments" section.'}
                    {!userRole && 'Your role could not be determined. Please contact the administrator.'}
                  </p>
                </div>
                <div className="mt-4">
                  <p className="text-muted">
                    If you believe this is an error, please contact your system administrator.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching appointments for user role:', userRole, 'User ID:', user.id);

      // Method 1: Try using the view with relationships first
      let appointmentsData = null;
      let appointmentsError = null;

      try {
        console.log('Attempting to fetch from appointments_with_details view...');
        const { data, error } = await supabase
          .from('appointments_with_details')
          .select('*')
          .order('created_at', { ascending: false })
          .order('appointment_date', { ascending: false })
          .order('queue_number', { ascending: false });

        if (!error && data) {
          appointmentsData = data;
          console.log('Successfully fetched from view:', data.length, 'appointments');
        } else {
          throw error;
        }
      } catch (viewError) {
        console.log('View method failed, trying direct relationship query...', viewError);
        
        // Method 2: Try using Supabase relationship syntax
        try {
          const { data, error } = await supabase
            .from('appointments')
            .select(`
              *,
              patient:patient_id (
                id,
                name,
                age,
                sex,
                user_id,
                civil_status,
                occupation
              ),
              psychometrician:psychometrician_id (
                id,
                email,
                raw_user_meta_data
              )
            `)
            .order('created_at', { ascending: false })
            .order('appointment_date', { ascending: false })
            .order('queue_number', { ascending: false });

          if (!error && data) {
            appointmentsData = data.map(apt => ({
              ...apt,
              patient_name: apt.patient?.name,
              patient_age: apt.patient?.age,
              patient_sex: apt.patient?.sex,
              patient_user_id: apt.patient?.user_id,
              psychometrician_name: apt.psychometrician?.raw_user_meta_data?.full_name,
              psychometrician_email: apt.psychometrician?.email
            }));
            console.log('Successfully fetched with relationships:', data.length, 'appointments');
          } else {
            throw error;
          }
        } catch (relationError) {
          console.log('Relationship method failed, using fallback...', relationError);
          
          // Method 3: Fallback to separate queries (original method but improved)
          const { data: rawAppointments, error: rawError } = await supabase
            .from('appointments')
            .select('*')
            .order('created_at', { ascending: false })
            .order('appointment_date', { ascending: false })
            .order('queue_number', { ascending: false });

          if (rawError) throw rawError;

          console.log('Raw appointments fetched:', rawAppointments?.length || 0);

          if (!rawAppointments || rawAppointments.length === 0) {
            appointmentsData = [];
          } else {
            // Get unique patient IDs
            const patientIds = [...new Set(rawAppointments.map(apt => apt.patient_id).filter(Boolean))];
            console.log('Patient IDs to fetch:', patientIds);

            // Fetch patient info separately
            let patientsData = [];
            if (patientIds.length > 0) {
              const { data: patients, error: patientsError } = await supabase
                .from('personal_info')
                .select('id, name, age, sex, user_id, civil_status, occupation')
                .in('id', patientIds);

              if (patientsError) {
                console.error('Patients fetch error:', patientsError);
                // Continue without patient data
                patientsData = [];
              } else {
                patientsData = patients || [];
                console.log('Patients data fetched:', patientsData.length);
              }
            }

            // Get unique psychometrician IDs
            const psychometricianIds = [...new Set(rawAppointments.map(apt => apt.psychometrician_id).filter(Boolean))];
            let psychometriciansData = [];
            
            if (psychometricianIds.length > 0) {
              const { data: psychometricians, error: psychError } = await supabase
                .from('auth.users')
                .select('id, email, raw_user_meta_data')
                .in('id', psychometricianIds);

              if (!psychError && psychometricians) {
                psychometriciansData = psychometricians;
              }
            }

            // Combine data
            appointmentsData = rawAppointments.map(appointment => {
              const patient = patientsData.find(p => p.id === appointment.patient_id);
              const psychometrician = psychometriciansData.find(p => p.id === appointment.psychometrician_id);
              
              return {
                ...appointment,
                patient_name: patient?.name || 'Unknown Patient',
                patient_age: patient?.age || 'N/A',
                patient_sex: patient?.sex || 'N/A',
                patient_user_id: patient?.user_id,
                patient_civil_status: patient?.civil_status,
                patient_occupation: patient?.occupation,
                psychometrician_name: psychometrician?.raw_user_meta_data?.full_name,
                psychometrician_email: psychometrician?.email,
                // Determine assignment status
                assignmentStatus: appointment.psychometrician_id 
                  ? (appointment.psychometrician_id === user.id ? 'Assigned to you' : 'Assigned to other')
                  : 'Unassigned'
              };
            });
          }
        }
      }

      // Apply role-based filtering
      if (userRole === 'psychometrician') {
        // For psychometricians: show unassigned appointments AND appointments assigned to them
        appointmentsData = appointmentsData.filter(apt => 
          !apt.psychometrician_id || apt.psychometrician_id === user.id
        );
      }
      // For admin: show all appointments (no filter needed)

      console.log('Final appointments with all data:', appointmentsData.length);
      console.log('Sample appointment:', appointmentsData[0]);

      setAppointments(appointmentsData);
      calculateDailyStats(appointmentsData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError(`Failed to load appointments: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const calculateDailyStats = (appointmentsData) => {
    const stats = {};
    appointmentsData.forEach(appointment => {
      const date = appointment.appointment_date;
      const type = appointment.appointment_type;
      
      if (!stats[date]) {
        stats[date] = {};
      }
      
      if (!stats[date][type]) {
        stats[date][type] = {
          total: 0,
          pending: 0,
          approved: 0,
          maxSlots: appointmentTypes.find(t => t.value === type)?.maxSlots || 15
        };
      }
      
      stats[date][type].total++;
      if (appointment.status === 'pending') {
        stats[date][type].pending++;
      } else if (appointment.status === 'approved') {
        stats[date][type].approved++;
      }
    });
    
    setDailyStats(stats);
  };

  const applyFilters = () => {
    let filtered = appointments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    if (typeFilter !== 'all') {
      filtered = filtered.filter(apt => apt.appointment_type === typeFilter);
    }

    if (dateFilter) {
      filtered = filtered.filter(apt => apt.appointment_date === dateFilter);
    }

    setFilteredAppointments(filtered);
  };

  const handleStatusChange = async (appointmentId, newStatus, notes = '') => {
    try {
      setProcessing(appointmentId);
      setError(null);

      const updateData = {
        status: newStatus,
        updated_at: new Date().toISOString()
      };

      // If approving, assign to current user if not already assigned
      if (newStatus === 'approved' && userRole === 'psychometrician') {
        updateData.psychometrician_id = user.id;
      }

      if (notes.trim()) {
        updateData.notes = notes.trim();
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      // Log audit event for appointment status change
      await logAuditEvent({
        actionType: newStatus === 'cancelled' ? AUDIT_ACTIONS.APPOINTMENT_CANCELLED : AUDIT_ACTIONS.UPDATE,
        resourceType: RESOURCE_TYPES.APPOINTMENT,
        resourceId: appointmentId,
        description: `Appointment ${newStatus} by ${userRole}`,
        details: {
          appointment_id: appointmentId,
          old_status: selectedAppointment?.status,
          new_status: newStatus,
          updated_by: user.email,
          user_role: userRole,
          notes: notes.trim() || null,
          psychometrician_id: newStatus === 'approved' && userRole === 'psychometrician' ? user.id : null
        }
      });

      setSuccess(`Appointment ${newStatus} successfully!`);
      setShowModal(false);
      setSelectedAppointment(null);
      await fetchAppointments(); // Refresh the data

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000);
    } catch (error) {
      console.error('Error updating appointment:', error);
      setError(`Failed to update appointment: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning text-dark',
      approved: 'bg-success',
      rejected: 'bg-danger',
      completed: 'bg-info',
      cancelled: 'bg-secondary'
    };
    return badges[status] || 'bg-secondary';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <FaClock className="me-1" />,
      approved: <FaCheck className="me-1" />,
      rejected: <FaTimes className="me-1" />,
      completed: <FaCheck className="me-1" />,
      cancelled: <FaTimes className="me-1" />
    };
    return icons[status] || null;
  };

  const openModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="text-center">
          <div className="spinner-border text-primary mb-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p>Loading appointments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="appointment-management-container" style={{ 
      overflow: 'hidden', 
      minHeight: '100vh',
      background: 'white',
      padding: '2rem'
    }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div className="d-flex align-items-center">
          <div className="me-3 p-3 rounded-circle" style={{
            background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
            color: 'white'
          }}>
            <FaCalendarAlt size={24} />
          </div>
          <div>
            <h2 className="mb-1 fw-bold text-dark">Appointment Management</h2>
            <small className="text-muted">
              {userRole === 'admin' && 'Administrator View - All Appointments'}
              {userRole === 'psychometrician' && 'Psychometrician View - Your Assignments & Unassigned'}
            </small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-sm shadow-sm"
            onClick={() => fetchAppointments()}
            disabled={loading}
            style={{
              background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
              border: 'none',
              color: 'white',
              borderRadius: '15px',
              padding: '8px 16px',
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
            }}
          >
            <FaSync className={`me-2 ${loading ? 'fa-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible" role="alert">
          <strong>Success:</strong> {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Role-specific Notice */}
      {userRole === 'psychometrician' && (
        <div className="alert alert-info mb-4">
          <h6 className="alert-heading">
            <FaUsers className="me-2" />
            Psychometrician Dashboard
          </h6>
          <p className="mb-0">
            You can see and manage unassigned appointments and appointments assigned to you. 
            Approving an appointment will automatically assign it to you.
          </p>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div
            className="card h-100 shadow border-0 text-center"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 60%, #ff9068 100%)',
              color: '#fff',
              borderRadius: '1rem',
              minHeight: 120,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="card-body d-flex flex-column justify-content-center">
              <h4 className="card-title mb-2" style={{ fontWeight: 700, fontSize: '2rem' }}>
                {appointments.filter(apt => apt.status === 'pending').length}
              </h4>
              <p className="card-text mb-0" style={{ fontWeight: 600, letterSpacing: 1 }}>Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className="card h-100 shadow border-0 text-center"
            style={{
              background: 'linear-gradient(135deg, #ff9068 60%, #ffcc70 100%)',
              color: '#fff',
              borderRadius: '1rem',
              minHeight: 120,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="card-body d-flex flex-column justify-content-center">
              <h4 className="card-title mb-2" style={{ fontWeight: 700, fontSize: '2rem' }}>
                {appointments.filter(apt => apt.status === 'approved').length}
              </h4>
              <p className="card-text mb-0" style={{ fontWeight: 600, letterSpacing: 1 }}>Approved</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className="card h-100 shadow border-0 text-center"
            style={{
              background: 'linear-gradient(135deg, #ffcc70 60%, #ffd89b 100%)',
              color: '#fff',
              borderRadius: '1rem',
              minHeight: 120,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="card-body d-flex flex-column justify-content-center">
              <h4 className="card-title mb-2" style={{ fontWeight: 700, fontSize: '2rem' }}>
                {appointments.filter(apt => apt.status === 'completed').length}
              </h4>
              <p className="card-text mb-0" style={{ fontWeight: 600, letterSpacing: 1 }}>Completed</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className="card h-100 shadow border-0 text-center"
            style={{
              background: 'linear-gradient(135deg, #ffd89b 60%, #ffeaa7 100%)',
              color: '#fff',
              borderRadius: '1rem',
              minHeight: 120,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="card-body d-flex flex-column justify-content-center">
              <h4 className="card-title mb-2" style={{ fontWeight: 700, fontSize: '2rem' }}>
                {appointments.length}
              </h4>
              <p className="card-text mb-0" style={{ fontWeight: 600, letterSpacing: 1 }}>Total {userRole === 'psychometrician' ? '(Yours)' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4 shadow border-0" style={{
        borderRadius: '1.5rem',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(255, 107, 107, 0.15)',
        border: 'none'
      }}>
        <div
          className="card-header"
          style={{
            background: 'linear-gradient(90deg, #ff6b6b 0%, #ff9068 100%)',
            color: '#fff',
            borderBottom: 'none',
            padding: '1.5rem 2rem'
          }}
        >
          <h6 className="mb-0 d-flex align-items-center" style={{ fontWeight: 800, letterSpacing: 1 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              borderRadius: '50%',
              width: 32,
              height: 32,
              marginRight: 12,
              boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)'
            }}>
              <FaFilter style={{ color: '#ff6b6b', fontSize: 16 }} />
            </span>
            Filters
          </h6>
        </div>
        <div className="card-body" style={{ padding: '2rem' }}>
          <div className="row">
            <div className="col-md-3">
              <label className="form-label fw-bold" style={{ color: '#ff6b6b' }}>Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 107, 107, 0.2)',
                  padding: '10px 15px'
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label fw-bold" style={{ color: '#ff9068' }}>Service Type</label>
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 144, 104, 0.2)',
                  padding: '10px 15px'
                }}
              >
                <option value="all">All Services</option>
                {appointmentTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label fw-bold" style={{ color: '#ffcc70' }}>Date</label>
              <input
                type="date"
                className="form-control"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                style={{
                  borderRadius: '10px',
                  border: '2px solid rgba(255, 204, 112, 0.2)',
                  padding: '10px 15px'
                }}
              />
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button
                className="btn w-100 shadow-sm"
                onClick={() => {
                  setStatusFilter('all');
                  setTypeFilter('all');
                  setDateFilter('');
                }}
                style={{
                  background: 'linear-gradient(45deg, #ffd89b, #ffeaa7)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: '15px',
                  padding: '10px 15px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 8px 25px rgba(255, 216, 155, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0px)';
                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Statistics removed per request */}

      {/* Appointments List */}
      <div className="card shadow border-0" style={{
        borderRadius: '1.5rem',
        overflow: 'hidden',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(255, 107, 107, 0.15)',
        border: 'none'
      }}>
        <div
          className="card-header"
          style={{
            background: 'linear-gradient(90deg, #ff6b6b 0%, #ff9068 100%)',
            color: '#fff',
            borderBottom: 'none',
            padding: '1.5rem 2rem'
          }}
        >
          <h5 className="mb-0 d-flex align-items-center" style={{ fontWeight: 800, letterSpacing: 1 }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#fff',
              borderRadius: '50%',
              width: 40,
              height: 40,
              marginRight: 15,
              boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)'
            }}>
              <FaUsers style={{ color: '#ff6b6b', fontSize: 20 }} />
            </span>
            Appointments ({filteredAppointments.length})
          </h5>
        </div>
        <div className="card-body p-0">
          {filteredAppointments.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead style={{
                  background: 'linear-gradient(90deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 144, 104, 0.1) 100%)',
                  borderBottom: '2px solid rgba(255, 107, 107, 0.2)'
                }}>
                  <tr>
                    <th style={{ color: '#ff6b6b', fontWeight: '700', padding: '1rem' }}>Patient</th>
                    <th style={{ color: '#ff9068', fontWeight: '700', padding: '1rem' }}>Service</th>
                    <th style={{ color: '#ffcc70', fontWeight: '700', padding: '1rem' }}>Date</th>
                    <th style={{ color: '#ffd89b', fontWeight: '700', padding: '1rem' }}>Queue #</th>
                    <th style={{ color: '#ff6b6b', fontWeight: '700', padding: '1rem' }}>Status</th>
                    <th style={{ color: '#ffcc70', fontWeight: '700', padding: '1rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map(appointment => (
                    <tr key={appointment.id}>
                      <td>
                        <div>
                          <strong>{appointment.patient_name || 'Unknown Patient'}</strong>
                          <br />
                          <small className="text-muted">
                            {appointment.patient_age} years, {appointment.patient_sex}
                          </small>
                        </div>
                      </td>
                      <td>
                        <span className="badge bg-light text-dark">
                          {appointmentTypes.find(type => type.value === appointment.appointment_type)?.label}
                        </span>
                      </td>
                      <td>
                        <FaCalendarAlt className="me-1 text-muted" />
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                      </td>
                      <td>
                        <span className="badge bg-secondary">
                          #{appointment.queue_number}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${getStatusBadge(appointment.status)}`}>
                          {getStatusIcon(appointment.status)}
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </td>
                      <td>
                        <div className="btn-group" role="group">
                          <button
                            className="btn btn-sm shadow-sm"
                            onClick={() => openModal(appointment)}
                            title="View Details"
                            style={{
                              background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                              border: 'none',
                              color: 'white',
                              borderRadius: '8px',
                              padding: '6px 12px',
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
                            }}
                          >
                            <FaEye />
                          </button>
                          {appointment.status === 'pending' && (
                            <>
                              <button
                                className="btn btn-sm shadow-sm"
                                onClick={() => handleStatusChange(appointment.id, 'approved')}
                                disabled={processing === appointment.id}
                                title="Approve"
                                style={{
                                  background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                                  border: 'none',
                                  color: 'white',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontWeight: '600',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 8px 25px rgba(255, 144, 104, 0.4)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'translateY(0px)';
                                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                                }}
                              >
                                {processing === appointment.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <FaCheck />
                                )}
                              </button>
                              <button
                                className="btn btn-sm shadow-sm"
                                onClick={() => handleStatusChange(appointment.id, 'rejected')}
                                disabled={processing === appointment.id}
                                title="Reject"
                                style={{
                                  background: 'linear-gradient(45deg, #ff6b6b, #ff8a80)',
                                  border: 'none',
                                  color: 'white',
                                  borderRadius: '8px',
                                  padding: '6px 12px',
                                  fontWeight: '600',
                                  transition: 'all 0.3s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.target.disabled) {
                                    e.target.style.transform = 'translateY(-2px)';
                                    e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.transform = 'translateY(0px)';
                                  e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                                }}
                              >
                                {processing === appointment.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <FaTimes />
                                )}
                              </button>
                            </>
                          )}
                          {appointment.status === 'approved' && (
                            <button
                              className="btn btn-sm shadow-sm"
                              onClick={() => handleStatusChange(appointment.id, 'completed')}
                              disabled={processing === appointment.id}
                              title="Mark as Completed"
                              style={{
                                background: 'linear-gradient(45deg, #ffcc70, #ffd89b)',
                                border: 'none',
                                color: 'white',
                                borderRadius: '8px',
                                padding: '6px 12px',
                                fontWeight: '600',
                                transition: 'all 0.3s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!e.target.disabled) {
                                  e.target.style.transform = 'translateY(-2px)';
                                  e.target.style.boxShadow = '0 8px 25px rgba(255, 204, 112, 0.4)';
                                }
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.transform = 'translateY(0px)';
                                e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                              }}
                            >
                              {processing === appointment.id ? (
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                              ) : (
                                'Complete'
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <FaUsers className="text-muted mb-3" size={48} />
              <h5 className="text-muted">No appointments found</h5>
              <p className="text-muted">
                {statusFilter !== 'all' || typeFilter !== 'all' || dateFilter 
                  ? 'Try adjusting your filters to see more appointments.'
                  : userRole === 'psychometrician' 
                    ? 'No unassigned appointments or appointments assigned to you.'
                    : 'No appointments have been booked yet.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {showModal && selectedAppointment && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Appointment Details</h5>
                <button type="button" className="btn-close" onClick={closeModal}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="text-primary">Patient Information</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Name:</strong></td>
                          <td>{selectedAppointment.patient_name}</td>
                        </tr>
                        <tr>
                          <td><strong>Age:</strong></td>
                          <td>{selectedAppointment.patient_age}</td>
                        </tr>
                        <tr>
                          <td><strong>Sex:</strong></td>
                          <td>{selectedAppointment.patient_sex}</td>
                        </tr>
                        {selectedAppointment.patient_civil_status && (
                          <tr>
                            <td><strong>Civil Status:</strong></td>
                            <td>{selectedAppointment.patient_civil_status}</td>
                          </tr>
                        )}
                        {selectedAppointment.patient_occupation && (
                          <tr>
                            <td><strong>Occupation:</strong></td>
                            <td>{selectedAppointment.patient_occupation}</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-info">Appointment Details</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Service:</strong></td>
                          <td>{appointmentTypes.find(type => type.value === selectedAppointment.appointment_type)?.label}</td>
                        </tr>
                        <tr>
                          <td><strong>Date:</strong></td>
                          <td>{new Date(selectedAppointment.appointment_date).toLocaleDateString()}</td>
                        </tr>
                        <tr>
                          <td><strong>Queue Number:</strong></td>
                          <td>#{selectedAppointment.queue_number}</td>
                        </tr>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={`badge ${getStatusBadge(selectedAppointment.status)}`}>
                              {getStatusIcon(selectedAppointment.status)}
                              {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {selectedAppointment.patient_notes && (
                  <div className="mt-3">
                    <h6 className="text-success">Patient Notes</h6>
                    <div className="border rounded p-3 bg-light">
                      {selectedAppointment.patient_notes}
                    </div>
                  </div>
                )}
                
                {selectedAppointment.notes && (
                  <div className="mt-3">
                    <h6 className="text-warning">Professional Notes</h6>
                    <div className="border rounded p-3 bg-light">
                      {selectedAppointment.notes}
                    </div>
                  </div>
                )}

                <div className="mt-4">
                  <small className="text-muted">
                    <strong>Created:</strong> {new Date(selectedAppointment.created_at).toLocaleString()}
                    {selectedAppointment.updated_at !== selectedAppointment.created_at && (
                      <> | <strong>Last updated:</strong> {new Date(selectedAppointment.updated_at).toLocaleString()}</>
                    )}
                  </small>
                </div>
              </div>
              <div className="modal-footer">
                {selectedAppointment.status === 'pending' && (
                  <>
                    <button
                      type="button"
                      className="btn shadow-sm"
                      onClick={() => handleStatusChange(selectedAppointment.id, 'approved')}
                      disabled={processing === selectedAppointment.id}
                      style={{
                        background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '15px',
                        padding: '10px 20px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 25px rgba(255, 144, 104, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0px)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      {processing === selectedAppointment.id ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaCheck className="me-2" />
                          Approve
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      className="btn shadow-sm"
                      onClick={() => handleStatusChange(selectedAppointment.id, 'rejected')}
                      disabled={processing === selectedAppointment.id}
                      style={{
                        background: 'linear-gradient(45deg, #ff6b6b, #ff8a80)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '15px',
                        padding: '10px 20px',
                        fontWeight: '600',
                        transition: 'all 0.3s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (!e.target.disabled) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 25px rgba(255, 107, 107, 0.4)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0px)';
                        e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                      }}
                    >
                      {processing === selectedAppointment.id ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Processing...
                        </>
                      ) : (
                        <>
                          <FaTimes className="me-2" />
                          Reject
                        </>
                      )}
                    </button>
                  </>
                )}
                {selectedAppointment.status === 'approved' && (
                  <button
                    type="button"
                    className="btn shadow-sm"
                    onClick={() => handleStatusChange(selectedAppointment.id, 'completed')}
                    disabled={processing === selectedAppointment.id}
                    style={{
                      background: 'linear-gradient(45deg, #ffcc70, #ffd89b)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '15px',
                      padding: '10px 20px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!e.target.disabled) {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(255, 204, 112, 0.4)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0px)';
                      e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                    }}
                  >
                    {processing === selectedAppointment.id ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Processing...
                      </>
                    ) : (
                      <>
                        <FaCheck className="me-2" />
                        Mark as Completed
                      </>
                    )}
                  </button>
                )}
                <button 
                  type="button" 
                  className="btn shadow-sm" 
                  onClick={closeModal}
                  style={{
                    background: 'linear-gradient(45deg, #ffd89b, #ffeaa7)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '15px',
                    padding: '10px 20px',
                    fontWeight: '600',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 8px 25px rgba(255, 216, 155, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0px)';
                    e.target.style.boxShadow = '0 4px 15px rgba(0, 0, 0, 0.1)';
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default AppointmentManagement;