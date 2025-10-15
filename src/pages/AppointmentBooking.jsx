// pages/AppointmentBooking.jsx - Fixed clean version
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { FaCalendarAlt, FaClock, FaUsers, FaCheckCircle, FaExclamationTriangle } from 'react-icons/fa';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const AppointmentBooking = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [personalInfo, setPersonalInfo] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [queueInfo, setQueueInfo] = useState({});

  const appointmentTypes = [
    { 
      value: 'psychological_test', 
      label: 'Psychological Test', 
      maxSlots: 50,
      description: 'Comprehensive psychological assessment including cognitive and personality evaluation'
    },
    { 
      value: 'neuropsychological_test', 
      label: 'Neuropsychological Test', 
      maxSlots: 50,
      description: 'Assessment of brain-behavior relationships and cognitive functioning'
    },
    { 
      value: 'neuropsychiatric_test', 
      label: 'Neuropsychiatric Test', 
      maxSlots: 50,
      description: 'Evaluation of psychiatric symptoms related to neurological conditions'
    },
    { 
      value: 'mental_health_consultation', 
      label: 'Mental Health Consultation', 
      maxSlots: 15,
      description: 'Professional consultation for mental health concerns and treatment planning'
    },
    { 
      value: 'applied_behavioral_analysis', 
      label: 'Applied Behavioral Analysis', 
      maxSlots: 15,
      description: 'Systematic approach to understanding and changing behavior patterns'
    },
    { 
      value: 'play_therapy', 
      label: 'Play Therapy', 
      maxSlots: 15,
      description: 'Therapeutic intervention using play to help children express and process emotions'
    },
    { 
      value: 'academic_tutor', 
      label: 'Academic Tutor', 
      maxSlots: 15,
      description: 'Educational support and academic skill development'
    },
    { 
      value: 'sped_evaluation', 
      label: 'Special Education Evaluation', 
      maxSlots: 15,
      description: 'Assessment for special education needs and accommodations'
    },
    { 
      value: 'behavioral_assessment', 
      label: 'Behavioral Assessment', 
      maxSlots: 15,
      description: 'Comprehensive evaluation of behavioral patterns and interventions'
    }
  ];

  useEffect(() => {
    if (user) {
      fetchPatientData();
    }
  }, [user]);

  useEffect(() => {
    if (selectedType && selectedDate) {
      fetchQueueInfo();
    }
  }, [selectedType, selectedDate]);

  const fetchPatientData = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Fetching patient data for user:', user.id);

      // Get patient personal info with better error handling
      const { data: patientData, error: patientError } = await supabase
        .from('personal_info')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (patientError) {
        console.error('Patient data error:', patientError);
        if (patientError.code === 'PGRST116') {
          setError('Your profile is not complete. Please complete your profile before booking appointments.');
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

      // Get existing appointments with better error handling
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('*')
        .eq('patient_id', patientData.id)
        .order('appointment_date', { ascending: true });

      if (appointmentsError) {
        console.error('Appointments error:', appointmentsError);
        // Don't fail completely if appointments can't be loaded
        setAppointments([]);
      } else {
        setAppointments(appointmentsData || []);
      }

    } catch (error) {
      console.error('Error in fetchPatientData:', error);
      setError(`An unexpected error occurred: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchQueueInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('queue_number')
        .eq('appointment_date', selectedDate)
        .eq('appointment_type', selectedType)
        .neq('status', 'cancelled')
        .order('queue_number', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Queue info error:', error);
        setQueueInfo({});
        return;
      }

      const currentMaxQueue = data && data.length > 0 ? data[0].queue_number : 0;
      const nextQueueNumber = currentMaxQueue + 1;
      const appointmentTypeInfo = appointmentTypes.find(type => type.value === selectedType);
      const maxSlots = appointmentTypeInfo?.maxSlots || 15;

      setQueueInfo({
        nextQueueNumber,
        maxSlots,
        slotsRemaining: maxSlots - currentMaxQueue,
        isAvailable: nextQueueNumber <= maxSlots
      });
    } catch (error) {
      console.error('Error fetching queue info:', error);
      setQueueInfo({});
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!personalInfo || !selectedType || !selectedDate) return;

    setSubmitting(true);
    setError(null);
    setSuccess('');

    try {
      // Check if slots are still available
      await fetchQueueInfo();
      
      if (!queueInfo.isAvailable) {
        setError('Sorry, no more slots available for this service on the selected date.');
        setSubmitting(false);
        return;
      }

      // Create appointment
      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            patient_id: personalInfo.id,
            appointment_type: selectedType,
            appointment_date: selectedDate,
            queue_number: queueInfo.nextQueueNumber,
            patient_notes: patientNotes.trim() || null,
            status: 'pending'
          }
        ])
        .select();

      if (error) {
        console.error('Insert appointment error:', error);
        throw error;
      }

      // Log audit event for appointment booking
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.APPOINTMENT_BOOKED,
        resourceType: RESOURCE_TYPES.APPOINTMENT,
        resourceId: data[0]?.id,
        description: 'Appointment booked successfully',
        details: {
          appointment_id: data[0]?.id,
          appointment_type: selectedType,
          appointment_date: selectedDate,
          queue_number: queueInfo.nextQueueNumber,
          patient_id: personalInfo.id,
          patient_name: personalInfo.name,
          patient_notes: patientNotes.trim() || null,
          status: 'pending'
        }
      });

      setSuccess(`Appointment booked successfully! You are #${queueInfo.nextQueueNumber} in the queue for this service.`);
      
      // Reset form
      setSelectedType('');
      setSelectedDate('');
      setPatientNotes('');
      setQueueInfo({});

      // Refresh appointments
      await fetchPatientData();

    } catch (error) {
      console.error('Error booking appointment:', error);
      setError(`Failed to book appointment: ${error.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-warning',
      approved: 'bg-success',
      rejected: 'bg-danger',
      completed: 'bg-info',
      cancelled: 'bg-secondary'
    };
    return badges[status] || 'bg-secondary';
  };

  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30); // Allow booking up to 30 days in advance
    return maxDate.toISOString().split('T')[0];
  };

  const isSunday = (dateString) => {
    const date = new Date(dateString);
    return date.getDay() === 0; // Sunday is 0
  };

  const handleDateChange = (e) => {
    const selectedDateValue = e.target.value;
    
    if (selectedDateValue && isSunday(selectedDateValue)) {
      setError('Sorry, appointments cannot be booked on Sundays. Please select a different date.');
      setSelectedDate('');
      return;
    }
    
    setSelectedDate(selectedDateValue);
    setError(null);
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

  if (error && !personalInfo) {
    return (
      <div className="alert alert-warning">
        <h4 className="alert-heading">Profile Required</h4>
        <p>{error}</p>
        <div className="mt-3">
          <Link to="/complete-profile" className="btn btn-primary me-2">
            Complete Your Profile
          </Link>
          <button onClick={() => fetchPatientData()} className="btn btn-outline-secondary">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="appointment-booking-container">
      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h4 className="mb-0">
                <FaCalendarAlt className="me-2" />
                Book New Appointment
              </h4>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <FaExclamationTriangle className="me-2" />
                  {error}
                </div>
              )}
              
              {success && (
                <div className="alert alert-success" role="alert">
                  <FaCheckCircle className="me-2" />
                  {success}
                </div>
              )}

              {personalInfo && (
                <div className="mb-3">
                  <small className="text-muted">
                    Booking appointment for: <strong>{personalInfo.name}</strong>
                  </small>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="appointmentType" className="form-label">
                    <strong>Select Service Type</strong>
                  </label>
                  <select
                    id="appointmentType"
                    className="form-select"
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    required
                  >
                    <option value="">Choose a service...</option>
                    {appointmentTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label} (Max {type.maxSlots} slots/day)
                      </option>
                    ))}
                  </select>
                  
                  {selectedType && (
                    <div className="mt-2">
                      <small className="text-muted">
                        {appointmentTypes.find(type => type.value === selectedType)?.description}
                      </small>
                    </div>
                  )}
                </div>

                <div className="mb-4">
                  <label htmlFor="appointmentDate" className="form-label">
                    <strong>Tentative date</strong>
                  </label>
                  <input
                    type="date"
                    id="appointmentDate"
                    className="form-control"
                    value={selectedDate}
                    onChange={handleDateChange}
                    min={getMinDate()}
                    max={getMaxDate()}
                    required
                  />
                  <small className="text-muted">
                   *This date may vary to the availability of the staff/ center please wait for the email or call<br/>
                   *Sundays are not available for appointment booking
                  </small>
                </div>

                {queueInfo.nextQueueNumber && (
                  <div className="alert alert-info">
                    <h6>Queue Information</h6>
                    <p className="mb-2">
                      <strong>Your queue number will be: #{queueInfo.nextQueueNumber}</strong>
                    </p>
                    <p className="mb-0">
                      Slots remaining: {queueInfo.slotsRemaining} / {queueInfo.maxSlots}
                    </p>
                    {!queueInfo.isAvailable && (
                      <p className="text-danger mb-0">
                        <strong>No more slots available for this date and service!</strong>
                      </p>
                    )}
                  </div>
                )}

                <div className="mb-4">
                  <label htmlFor="patientNotes" className="form-label">
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="patientNotes"
                    className="form-control"
                    rows="3"
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    placeholder="Any additional information or specific concerns you'd like to share..."
                  />
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submitting || !queueInfo.isAvailable || !personalInfo}
                  >
                    {submitting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Booking Appointment...
                      </>
                    ) : (
                      'Book Appointment'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">My Recent Appointments</h5>
            </div>
            <div className="card-body">
              {appointments.length > 0 ? (
                <div className="appointment-list">
                  {appointments.slice(0, 5).map(appointment => (
                    <div key={appointment.id} className="appointment-item mb-3 p-3 border rounded">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="mb-1">
                          {appointmentTypes.find(type => type.value === appointment.appointment_type)?.label}
                        </h6>
                        <span className={`badge ${getStatusBadge(appointment.status)}`}>
                          {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                        </span>
                      </div>
                      <p className="mb-1">
                        <FaCalendarAlt className="me-1" />
                        {new Date(appointment.appointment_date).toLocaleDateString()}
                      </p>
                      <p className="mb-1">
                        <FaUsers className="me-1" />
                        Queue: #{appointment.queue_number}
                      </p>
                    </div>
                  ))}
                  <Link to="/my-appointments" className="btn btn-sm btn-outline-primary">
                    View All Appointments
                  </Link>
                </div>
              ) : (
                <p className="text-muted text-center">No appointments booked yet.</p>
              )}
            </div>
          </div>

          <div className="card mt-4">
            <div className="card-header">
              <h6 className="mb-0">Important Information</h6>
            </div>
            <div className="card-body">
              <ul className="list-unstyled">
                <li className="mb-2">
                  <small>• Appointments are subject to approval by our psychometricians</small>
                </li>
                <li className="mb-2">
                  <small>• You'll receive a notification once your appointment is approved</small>
                </li>
                <li className="mb-2">
                  <small>• Please arrive 15 minutes before your scheduled time</small>
                </li>
                <li className="mb-0">
                  <small>• Cancellations must be made at least 24 hours in advance</small>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentBooking;