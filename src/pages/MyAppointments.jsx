// pages/MyAppointments.jsx - Enhanced patient appointment management with improved cancellation
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaEye, FaTimes, FaPlus, FaClock, FaCheck, FaExclamationTriangle } from 'react-icons/fa';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const MyAppointments = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [appointments, setAppointments] = useState([]);
  const [personalInfo, setPersonalInfo] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [appointmentToCancel, setAppointmentToCancel] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  const appointmentTypes = [
    { value: 'psychological_test', label: 'Psychological Test' },
    { value: 'neuropsychological_test', label: 'Neuropsychological Test' },
    { value: 'neuropsychiatric_test', label: 'Neuropsychiatric Test' },
    { value: 'mental_health_consultation', label: 'Mental Health Consultation' },
    { value: 'applied_behavioral_analysis', label: 'Applied Behavioral Analysis' },
    { value: 'play_therapy', label: 'Play Therapy' },
    { value: 'academic_tutor', label: 'Academic Tutor' },
    { value: 'sped_evaluation', label: 'Special Education Evaluation' },
    { value: 'behavioral_assessment', label: 'Behavioral Assessment' }
  ];

  useEffect(() => {
    if (user) {
      fetchAppointments();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [appointments, statusFilter]);

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching appointments for user:', user.id);

      // Get patient personal info
      const { data: patientData, error: patientError } = await supabase
        .from('personal_info')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        console.error('Patient data error:', patientError);
        if (patientError.code === 'PGRST116') {
          setError('Your profile is not complete. Please complete your profile before viewing appointments.');
          setLoading(false);
          return;
        } else {
          setError(`Failed to load your profile: ${patientError.message}`);
          setLoading(false);
          return;
        }
      }

      if (!patientData) {
        setError('No profile found. Please complete your profile first.');
        setLoading(false);
        return;
      }

      console.log('Patient data loaded:', patientData);
      setPersonalInfo(patientData);

      // Get appointments without joins to avoid relationship errors
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('appointment_date', { ascending: false });

      if (appointmentsError) {
        console.error('Appointments error:', appointmentsError);
        throw appointmentsError;
      }

      console.log('Appointments loaded:', appointmentsData?.length || 0);
      setAppointments(appointmentsData || []);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      setError(`Failed to load your appointments: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = appointments;

    if (statusFilter !== 'all') {
      filtered = filtered.filter(apt => apt.status === statusFilter);
    }

    setFilteredAppointments(filtered);
  };

  const canCancelAppointment = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    const twentyFourHoursFromNow = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    
    // Can cancel if:
    // 1. Status is pending or approved
    // 2. Appointment is at least 24 hours away
    return (
      (appointment.status === 'pending' || appointment.status === 'approved') &&
      appointmentDate >= twentyFourHoursFromNow
    );
  };

  const getHoursUntilAppointment = (appointment) => {
    const appointmentDate = new Date(appointment.appointment_date);
    const now = new Date();
    const diffInHours = Math.round((appointmentDate - now) / (1000 * 60 * 60));
    return diffInHours;
  };

  const openCancelModal = (appointment) => {
    setAppointmentToCancel(appointment);
    setShowCancelModal(true);
  };

  const closeCancelModal = () => {
    setShowCancelModal(false);
    setAppointmentToCancel(null);
  };

  const handleCancelAppointment = async () => {
    if (!appointmentToCancel) return;

    try {
      setCancelling(appointmentToCancel.id);
      setError(null);

      // Double-check if cancellation is still allowed
      if (!canCancelAppointment(appointmentToCancel)) {
        setError('This appointment can no longer be cancelled. Appointments must be cancelled at least 24 hours in advance.');
        closeCancelModal();
        return;
      }

      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'cancelled',
          updated_at: new Date().toISOString(),
          notes: `Cancelled by patient on ${new Date().toLocaleString()}`
        })
        .eq('id', appointmentToCancel.id);

      if (error) throw error;

      // Log audit event for appointment cancellation
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.APPOINTMENT_CANCELLED,
        resourceType: RESOURCE_TYPES.APPOINTMENT,
        resourceId: appointmentToCancel.id,
        description: 'Appointment cancelled by patient',
        details: {
          appointment_id: appointmentToCancel.id,
          appointment_type: appointmentToCancel.appointment_type,
          appointment_date: appointmentToCancel.appointment_date,
          queue_number: appointmentToCancel.queue_number,
          patient_id: appointmentToCancel.patient_id,
          cancelled_by: 'patient',
          cancellation_reason: 'Patient requested cancellation'
        }
      });

      setSuccess('Appointment cancelled successfully. You can book a new appointment anytime.');
      await fetchAppointments();
      closeCancelModal();
      setShowModal(false);
      setSelectedAppointment(null);

      // Clear success message after 5 seconds
      setTimeout(() => setSuccess(''), 5000);
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      setError(`Failed to cancel appointment: ${error.message}`);
    } finally {
      setCancelling(null);
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
          <p>Loading your appointments...</p>
        </div>
      </div>
    );
  }

  if (error && !personalInfo) {
    return (
      <div className="alert alert-warning">
        <h4 className="alert-heading">Profile Required</h4>
        <p>{error}</p>
        <Link to="/complete-profile" className="btn btn-primary">
          Complete Your Profile
        </Link>
      </div>
    );
  }

  return (
    <div className="my-appointments-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Appointments</h2>
        <Link to="/book-appointment" className="btn btn-primary">
          <FaPlus className="me-2" />
          Book New Appointment
        </Link>
      </div>

      {error && (
        <div className="alert alert-danger alert-dismissible" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible" role="alert">
          <FaCheck className="me-2" />
          <strong>Success:</strong> {success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      {/* Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="card-title text-warning">
                {appointments.filter(apt => apt.status === 'pending').length}
              </h4>
              <p className="card-text">Pending</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="card-title text-success">
                {appointments.filter(apt => apt.status === 'approved').length}
              </h4>
              <p className="card-text">Approved</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="card-title text-info">
                {appointments.filter(apt => apt.status === 'completed').length}
              </h4>
              <p className="card-text">Completed</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="card-title text-muted">
                {appointments.length}
              </h4>
              <p className="card-text">Total</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cancellation Policy Info */}
      <div className="alert alert-info mb-4">
        <h6 className="alert-heading">
          <FaExclamationTriangle className="me-2" />
          Cancellation Policy
        </h6>
        <p className="mb-0">
          You can cancel your appointments up to 24 hours before the scheduled date. 
          Cancelled appointments will free up the slot for other patients to book.
        </p>
      </div>

      {/* Filter */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <label className="form-label">Filter by Status</label>
              <select
                className="form-select"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="col-md-8 d-flex align-items-end">
              <small className="text-muted">
                Showing {filteredAppointments.length} of {appointments.length} appointments
              </small>
            </div>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">
            Appointments ({filteredAppointments.length})
          </h5>
        </div>
        <div className="card-body p-0">
          {filteredAppointments.length > 0 ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Service</th>
                    <th>Date</th>
                    <th>Queue #</th>
                    <th>Status</th>
                    <th>Time Until</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map(appointment => {
                    const hoursUntil = getHoursUntilAppointment(appointment);
                    const canCancel = canCancelAppointment(appointment);
                    
                    return (
                      <tr key={appointment.id}>
                        <td>
                          <strong>
                            {appointmentTypes.find(type => type.value === appointment.appointment_type)?.label}
                          </strong>
                        </td>
                        <td>
                          <FaCalendarAlt className="me-1" />
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
                          {appointment.status !== 'completed' && appointment.status !== 'cancelled' && (
                            <small className={`text-${hoursUntil < 24 ? 'danger' : hoursUntil < 72 ? 'warning' : 'muted'}`}>
                              {hoursUntil > 0 ? `${hoursUntil}h` : 'Past due'}
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="btn-group" role="group">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => openModal(appointment)}
                              title="View Details"
                            >
                              <FaEye />
                            </button>
                            {canCancel && (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => openCancelModal(appointment)}
                                disabled={cancelling === appointment.id}
                                title="Cancel Appointment"
                              >
                                {cancelling === appointment.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                  <FaTimes />
                                )}
                              </button>
                            )}
                            {!canCancel && (appointment.status === 'pending' || appointment.status === 'approved') && (
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                disabled
                                title="Cannot cancel - less than 24 hours remaining"
                              >
                                <FaTimes />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <FaCalendarAlt className="text-muted mb-3" size={48} />
              <h5 className="text-muted">No appointments found</h5>
              <p className="text-muted">
                {statusFilter !== 'all' 
                  ? 'Try changing the filter to see more appointments.'
                  : 'Book your first appointment to get started with our services.'}
              </p>
              {statusFilter === 'all' && (
                <Link to="/book-appointment" className="btn btn-primary">
                  <FaPlus className="me-2" />
                  Book Your First Appointment
                </Link>
              )}
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
                    <h6 className="text-primary">Service Information</h6>
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
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-info">Status & Timing</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td><strong>Status:</strong></td>
                          <td>
                            <span className={`badge ${getStatusBadge(selectedAppointment.status)}`}>
                              {getStatusIcon(selectedAppointment.status)}
                              {selectedAppointment.status.charAt(0).toUpperCase() + selectedAppointment.status.slice(1)}
                            </span>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Time Until:</strong></td>
                          <td>
                            {selectedAppointment.status !== 'completed' && selectedAppointment.status !== 'cancelled' && (
                              <span className={`text-${getHoursUntilAppointment(selectedAppointment) < 24 ? 'danger' : 'muted'}`}>
                                {getHoursUntilAppointment(selectedAppointment) > 0 
                                  ? `${getHoursUntilAppointment(selectedAppointment)} hours`
                                  : 'Past due'}
                              </span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <td><strong>Can Cancel:</strong></td>
                          <td>
                            <span className={`badge ${canCancelAppointment(selectedAppointment) ? 'bg-success' : 'bg-secondary'}`}>
                              {canCancelAppointment(selectedAppointment) ? 'Yes' : 'No'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {selectedAppointment.patient_notes && (
                  <div className="mt-3">
                    <h6 className="text-success">Your Notes</h6>
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

                <div className="mt-3">
                  <small className="text-muted">
                    <strong>Booked:</strong> {new Date(selectedAppointment.created_at).toLocaleString()}
                    {selectedAppointment.updated_at !== selectedAppointment.created_at && (
                      <> | <strong>Last updated:</strong> {new Date(selectedAppointment.updated_at).toLocaleString()}</>
                    )}
                  </small>
                </div>

                {selectedAppointment.status === 'approved' && (
                  <div className="mt-3">
                    <div className="alert alert-success">
                      <h6 className="alert-heading">
                        <FaCheck className="me-2" />
                        Your appointment has been approved!
                      </h6>
                      <p className="mb-0">
                        Please arrive 15 minutes before your scheduled time. You are #{selectedAppointment.queue_number} in the queue for this service.
                      </p>
                    </div>
                  </div>
                )}

                {selectedAppointment.status === 'pending' && (
                  <div className="mt-3">
                    <div className="alert alert-info">
                      <h6 className="alert-heading">
                        <FaClock className="me-2" />
                        Waiting for approval
                      </h6>
                      <p className="mb-0">
                        Your appointment is pending review by our psychometricians. You'll receive a notification once it's processed.
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                {canCancelAppointment(selectedAppointment) && (
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => {
                      closeModal();
                      openCancelModal(selectedAppointment);
                    }}
                  >
                    <FaTimes className="me-2" />
                    Cancel Appointment
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={closeModal}>
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && appointmentToCancel && (
        <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title text-danger">
                  <FaExclamationTriangle className="me-2" />
                  Cancel Appointment
                </h5>
                <button type="button" className="btn-close" onClick={closeCancelModal}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <strong>Are you sure you want to cancel this appointment?</strong>
                </div>
                
                <div className="mb-3">
                  <h6>Appointment Details:</h6>
                  <ul className="list-unstyled">
                    <li><strong>Service:</strong> {appointmentTypes.find(type => type.value === appointmentToCancel.appointment_type)?.label}</li>
                    <li><strong>Date:</strong> {new Date(appointmentToCancel.appointment_date).toLocaleDateString()}</li>
                    <li><strong>Queue:</strong> #{appointmentToCancel.queue_number}</li>
                    <li><strong>Status:</strong> {appointmentToCancel.status}</li>
                  </ul>
                </div>

                <div className="alert alert-info">
                  <h6 className="alert-heading">What happens when you cancel:</h6>
                  <ul className="mb-0">
                    <li>Your appointment will be immediately cancelled</li>
                    <li>The slot will become available for other patients</li>
                    <li>You can book a new appointment anytime</li>
                    <li>This action cannot be undone</li>
                  </ul>
                </div>

                {!canCancelAppointment(appointmentToCancel) && (
                  <div className="alert alert-danger">
                    <strong>Warning:</strong> This appointment is within 24 hours and normally cannot be cancelled. 
                    However, you can still proceed if there are exceptional circumstances.
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleCancelAppointment}
                  disabled={cancelling === appointmentToCancel.id}
                >
                  {cancelling === appointmentToCancel.id ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <FaTimes className="me-2" />
                      Yes, Cancel Appointment
                    </>
                  )}
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={closeCancelModal}
                  disabled={cancelling === appointmentToCancel.id}
                >
                  Keep Appointment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {(showModal || showCancelModal) && <div className="modal-backdrop fade show"></div>}
    </div>
  );
};

export default MyAppointments;