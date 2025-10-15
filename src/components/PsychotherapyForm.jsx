// components/PsychotherapyForm.jsx - Updated with Observations Table
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { FaUpload, FaSave } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const PsychotherapyForm = ({ sessionId = null, userRole }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [patients, setPatients] = useState([]);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [psychometricians, setPsychometricians] = useState([]);
  const [psychologists, setPsychologists] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientImage, setPatientImage] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  
  // Form data state
  const [formData, setFormData] = useState({
    patient_id: '',
    session_number: '1',
    session_date: new Date().toISOString().split('T')[0],
    // Modified observations structure to match the image format
    observations: {
      appearance: 'Neat',
      speech: 'Normal',
      eye_contact: 'Normal',
      motor_activity: 'Normal',
      affect: 'Full'
    },
    // Progress is now an object with cells that can be toggled
    progress: {
      cell1: false,
      cell2: false,
      cell3: false,
      cell4: false,
      cell5: false,
      cell6: false,
      cell7: false,
      cell8: false,
      cell9: false,
      cell10: false,
      notes: '' // For additional notes about progress
    },
    // Removed next_steps as requested
    recommendations: '',
    therapist_id: '',
    therapist_signature: '',
    psychologist_id: '',
    psychologist_signature: ''
  });
  
  useEffect(() => {
    // Get current user
    getCurrentUser();
    
    // Fetch patients and staff
    fetchPatients();
    fetchStaff();
    
    // If editing, fetch session data
    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);
  
  const getCurrentUser = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        setCurrentUser(session.session.user);
        
        // Get the user's role
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.session.user.id)
          .single();
          
        if (!roleError && roleData) {
          // If user is a therapist/psychometrician, pre-set the therapist field
          if (roleData.role === 'psychometrician') {
            setFormData(prev => ({
              ...prev,
              therapist_id: session.session.user.id
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };
  
  const fetchStaff = async () => {
    try {
      setLoadingStaff(true);
      
      // First fetch all user roles
      const { data: userRoles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
        
      if (rolesError) throw rolesError;
      
      // Get the user IDs for each role
      const psychometricianIds = userRoles
        .filter(role => role.role === 'psychometrician')
        .map(role => role.user_id);
        
      const psychologistIds = userRoles
        .filter(role => role.role === 'psychologist')
        .map(role => role.user_id);
      
      // Fetch psychometrician details
      if (psychometricianIds.length > 0) {
        const { data: psychUsers, error: psychUsersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', psychometricianIds);
          
        if (!psychUsersError) {
          const psychometriciansData = psychUsers.map(user => ({
            id: user.id,
            full_name: user.full_name || user.email || 'Unknown User'
          }));
          
          setPsychometricians(psychometriciansData);
        }
      }
      
      // Fetch psychologist details
      if (psychologistIds.length > 0) {
        const { data: psychoUsers, error: psychoUsersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', psychologistIds);
          
        if (!psychoUsersError) {
          const psychologistsData = psychoUsers.map(user => ({
            id: user.id,
            full_name: user.full_name || user.email || 'Unknown User'
          }));
          
          setPsychologists(psychologistsData);
        }
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoadingStaff(false);
    }
  };
  
  const fetchSessionData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('psychotherapy_sessions')
        .select(`
          *,
          personal_info (*)
        `)
        .eq('id', sessionId)
        .single();
        
      if (error) throw error;
      
      // Convert old format to new format if needed
      const observations = data.observations || {
        appearance: 'Neat',
        speech: 'Normal',
        eye_contact: 'Normal',
        motor_activity: 'Normal',
        affect: 'Full'
      };

      // Convert old progress string to new progress object format
      let progress = {
        cell1: false,
        cell2: false,
        cell3: false,
        cell4: false,
        cell5: false,
        cell6: false,
        cell7: false,
        cell8: false,
        cell9: false,
        cell10: false,
        notes: data.progress || ''
      };

      // Update form data with fetched session data
      setFormData({
        patient_id: data.patient_id,
        session_number: data.session_number.toString(),
        session_date: data.session_date,
        observations: observations,
        progress: progress,
        // next_steps removed
        recommendations: data.recommendations || '',
        therapist_id: data.therapist_id || '',
        therapist_signature: data.therapist_signature || '',
        psychologist_id: data.psychologist_id || '',
        psychologist_signature: data.psychologist_signature || ''
      });
      
      // Set selected patient
      if (data.personal_info) {
        setSelectedPatient(data.personal_info);
        // Re-fetch patients with the current patient included for editing
        await fetchPatients(data.patient_id);
      }
      
      // Check if there's an image URL
      if (data.patient_image_url) {
        setImageUrl(data.patient_image_url);
      }
    } catch (error) {
      console.error('Error fetching session data:', error);
      alert('Failed to fetch session data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const fetchPatients = async (currentPatientId = null) => {
    try {
      setLoadingPatients(true);
      
      // Fetch all patients
      const { data: allPatients, error: patientError } = await supabase
        .from('personal_info')
        .select('*')
        .order('name');
        
      if (patientError) throw patientError;
      
      setPatients(allPatients || []);

      // Fetch all psychotherapy sessions
      const { data: sessions, error: sessionError } = await supabase
        .from('psychotherapy_sessions')
        .select('patient_id');
      if (sessionError) throw sessionError;

      // Get patient IDs that already have a psychotherapy session
      const sessionPatientIds = new Set((sessions || []).map(s => s.patient_id));

      // Filter patients who do NOT have a psychotherapy session
      let filtered = (allPatients || []).filter(
        p => !sessionPatientIds.has(p.id)
      );

      // If editing an existing session, include the current patient even if they have sessions
      if (currentPatientId) {
        const currentPatient = allPatients.find(p => p.id === currentPatientId);
        if (currentPatient) {
          const isCurrentPatientInFiltered = filtered.some(p => p.id === currentPatientId);
          if (!isCurrentPatientInFiltered) {
            filtered = [...filtered, currentPatient];
          }
        }
      }

      setAvailablePatients(filtered);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
      setAvailablePatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    setFormData({
      ...formData,
      [name]: value
    });
    
    // Clear validation error when field is updated
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: null
      });
    }
    
    // Update selected patient
    if (name === 'patient_id') {
      const patient = availablePatients.find(p => p.id === value);
      setSelectedPatient(patient);
    }
  };

  // Function to handle observation field updates
  const handleObservationChange = (field, value) => {
    setFormData({
      ...formData,
      observations: {
        ...formData.observations,
        [field]: value
      }
    });
  };

  // Function to toggle progress cells
  const toggleProgressCell = (cell) => {
    setFormData({
      ...formData,
      progress: {
        ...formData.progress,
        [cell]: !formData.progress[cell]
      }
    });
  };

  // Function to update progress notes
  const handleProgressNotesChange = (value) => {
    setFormData({
      ...formData,
      progress: {
        ...formData.progress,
        notes: value
      }
    });
  };
  
  const handleImageUpload = async (e) => {
    try {
      const file = e.target.files[0];
      if (!file) return;
      
      // Validate file type (must be an image)
      if (!file.type.match('image.*')) {
        alert('Please upload an image file');
        return;
      }
      
      setPatientImage(file);
      
      // Create a preview URL
      const objectUrl = URL.createObjectURL(file);
      setImageUrl(objectUrl);
    } catch (error) {
      console.error('Error handling image upload:', error);
    }
  };
  
  const uploadImage = async () => {
    if (!patientImage) return null;
    
    try {
      setUploading(true);
      
      // Generate a unique file name
      const fileExt = patientImage.name.split('.').pop();
      const fileName = `patient_images/${Date.now()}.${fileExt}`;
      
      // Upload the image to Supabase storage
      const { data, error } = await supabase.storage
        .from('psychotherapy')
        .upload(fileName, patientImage, {
          cacheControl: '3600',
          upsert: false
        });
        
      if (error) throw error;
      
      // Get the public URL of the uploaded image
      const { data: urlData } = supabase.storage
        .from('psychotherapy')
        .getPublicUrl(fileName);
        
      return urlData.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    } finally {
      setUploading(false);
    }
  };
  
  const validateForm = () => {
    const errors = {};
    
    if (!formData.patient_id) errors.patient_id = 'Patient is required';
    if (!formData.session_number) errors.session_number = 'Session number is required';
    if (!formData.session_date) errors.session_date = 'Session date is required';
    if (!formData.therapist_id) errors.therapist_id = 'Therapist is required';
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    try {
      setLoading(true);
      
      // Upload image if selected
      let imageURL = formData.patient_image_url || '';
      if (patientImage) {
        const uploadedUrl = await uploadImage();
        if (uploadedUrl) {
          imageURL = uploadedUrl;
        }
      }

      // Progress notes for backward compatibility
      const progressNotes = formData.progress.notes || '';
      
      // Prepare data for saving
      const sessionData = {
        patient_id: formData.patient_id,
        session_number: parseInt(formData.session_number),
        session_date: formData.session_date,
        observations: formData.observations,
        progress: formData.progress,
        // next_steps removed
        recommendations: formData.recommendations || '',
        patient_image_url: imageURL,
        therapist_id: formData.therapist_id,
        therapist_signature: formData.therapist_signature || '',
        psychologist_id: formData.psychologist_id || null,
        psychologist_signature: formData.psychologist_signature || '',
        updated_at: new Date().toISOString()
      };
      
      console.log('Session data to save:', sessionData); // Debug log
      
      if (sessionId) {
        // Update existing session
        const { data, error } = await supabase
          .from('psychotherapy_sessions')
          .update(sessionData)
          .eq('id', sessionId)
          .select();
          
        if (error) {
          console.error('Update error:', error);
          throw error;
        }
        
        console.log('Updated session:', data);
        showSuccess('Session updated successfully!');
      } else {
        // Create new session
        sessionData.created_at = new Date().toISOString();
        
        const { data, error } = await supabase
          .from('psychotherapy_sessions')
          .insert([sessionData])
          .select();
          
        if (error) {
          console.error('Insert error:', error);
          throw error;
        }
        
        // Log audit event for session creation
        await logAuditEvent({
          actionType: AUDIT_ACTIONS.CREATE,
          resourceType: RESOURCE_TYPES.SESSION,
          resourceId: data[0]?.id,
          description: 'Psychotherapy session created',
          details: {
            session_id: data[0]?.id,
            session_type: 'psychotherapy',
            patient_id: sessionData.patient_id,
            session_number: sessionData.session_number,
            therapist_id: sessionData.therapist_id,
            psychologist_id: sessionData.psychologist_id,
            created_by_user: sessionData.therapist_id || sessionData.psychologist_id,
            user_role: userRole
          }
        });
        
        console.log('Created session:', data);
        showSuccess('Session created successfully!');
      }
      
      // Navigate back to the psychotherapy list
      navigate('/psychotherapy');
    } catch (error) {
      console.error('Error saving session:', error);
      showError(`Error saving session: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Define appearance options
  const appearanceOptions = ['Neat', 'Disheveled', 'Inappropriate', 'Bizarre', 'Other'];
  const speechOptions = ['Normal', 'Tangential', 'Pressured', 'Impoverished', 'Other'];
  const eyeContactOptions = ['Normal', 'Intense', 'Avoidant', 'Other'];
  const motorActivityOptions = ['Normal', 'Restless', 'Tics', 'Slowed', 'Other'];
  const affectOptions = ['Full', 'Constricted', 'Flat', 'Labile', 'Other'];
  
  return (
    <div className="psychotherapy-form">
      <form onSubmit={handleSubmit}>
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">Personal Information</h5>
          </div>
          <div className="card-body">
            {selectedPatient ? (
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <td><strong>NAME:</strong> {selectedPatient.name}</td>
                    <td><strong>AGE:</strong> {selectedPatient.age}</td>
                    <td><strong>SEX:</strong> {selectedPatient.sex}</td>
                    <td><strong>CIVIL STATUS:</strong> {selectedPatient.civil_status}</td>
                  </tr>
                  <tr>
                    <td colSpan="2"><strong>DATE OF BIRTH:</strong> {selectedPatient.date_of_birth ? new Date(selectedPatient.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                    <td colSpan="2"><strong>PLACE OF BIRTH:</strong> {selectedPatient.place_of_birth}</td>
                  </tr>
                  <tr>
                    <td><strong>NATIONALITY:</strong> {selectedPatient.nationality}</td>
                    <td><strong>RELIGION:</strong> {selectedPatient.religion}</td>
                    <td colSpan="2"><strong>OCCUPATION:</strong> {selectedPatient.occupation}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>ADDRESS:</strong> {selectedPatient.address}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>EDUCATIONAL ATTAINMENT:</strong> {selectedPatient.educational_attainment}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>PURPOSE OF EXAMINATION:</strong> {selectedPatient.purpose_of_examination}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>DATE OF EXAMINATION:</strong> {selectedPatient.date_of_examination ? new Date(selectedPatient.date_of_examination).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>AGENCY/AFFILIATION:</strong> {selectedPatient.agency_affiliation}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <div className="mb-3">
                <label htmlFor="patient_id" className="form-label">Select Patient *</label>
                <select
                  id="patient_id"
                  name="patient_id"
                  className={`form-select ${validationErrors.patient_id ? 'is-invalid' : ''}`}
                  value={formData.patient_id}
                  onChange={handleInputChange}
                  required
                >
                  <option value="">Select Patient</option>
                  {availablePatients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} ({patient.age} / {patient.sex})
                    </option>
                  ))}
                </select>
                {validationErrors.patient_id && (
                  <div className="invalid-feedback">{validationErrors.patient_id}</div>
                )}
                {loadingPatients && (
                  <div className="form-text text-muted">
                    <div className="spinner-border spinner-border-sm me-2" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                    Loading patients...
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">Session Details</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <div className="mb-3">
                  <label htmlFor="session_number" className="form-label">Session Number *</label>
                  <input
                    type="number"
                    id="session_number"
                    name="session_number"
                    className={`form-control ${validationErrors.session_number ? 'is-invalid' : ''}`}
                    value={formData.session_number}
                    onChange={handleInputChange}
                    min="1"
                    required
                  />
                  {validationErrors.session_number && (
                    <div className="invalid-feedback">{validationErrors.session_number}</div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label htmlFor="session_date" className="form-label">Session Date *</label>
                  <input
                    type="date"
                    id="session_date"
                    name="session_date"
                    className={`form-control ${validationErrors.session_date ? 'is-invalid' : ''}`}
                    value={formData.session_date}
                    onChange={handleInputChange}
                    required
                  />
                  {validationErrors.session_date && (
                    <div className="invalid-feedback">{validationErrors.session_date}</div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label htmlFor="patient_image" className="form-label">Patient Image</label>
                  <div className="input-group">
                    <input
                      type="file"
                      className="form-control"
                      id="patient_image"
                      onChange={handleImageUpload}
                      accept="image/*"
                    />
                    <label className="input-group-text" htmlFor="patient_image">
                      <FaUpload />
                    </label>
                  </div>
                  <div className="form-text">Upload a photo of the patient (optional)</div>
                </div>
                
                {imageUrl && (
                  <div className="mb-3">
                    <label className="form-label">Preview</label>
                    <div className="patient-image-preview">
                      <img
                        src={imageUrl}
                        alt="Patient"
                        className="img-thumbnail"
                        style={{ maxHeight: '200px', maxWidth: '100%' }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div className="col-md-6">
                {/* Updated Observations Section - using a table format as in Image 2 */}
                <div className="mb-3">
                  <label className="form-label">Observations</label>
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <tbody>
                        <tr>
                          <td width="30%"><strong>APPEARANCE</strong></td>
                          <td>
                            <select
                              className="form-select"
                              value={formData.observations.appearance}
                              onChange={(e) => handleObservationChange('appearance', e.target.value)}
                            >
                              {appearanceOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>SPEECH</strong></td>
                          <td>
                            <select
                              className="form-select"
                              value={formData.observations.speech}
                              onChange={(e) => handleObservationChange('speech', e.target.value)}
                            >
                              {speechOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>EYE CONTACT</strong></td>
                          <td>
                            <select
                              className="form-select"
                              value={formData.observations.eye_contact}
                              onChange={(e) => handleObservationChange('eye_contact', e.target.value)}
                            >
                              {eyeContactOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>MOTOR ACTIVITY</strong></td>
                          <td>
                            <select
                              className="form-select"
                              value={formData.observations.motor_activity}
                              onChange={(e) => handleObservationChange('motor_activity', e.target.value)}
                            >
                              {motorActivityOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                        <tr>
                          <td><strong>AFFECT</strong></td>
                          <td>
                            <select
                              className="form-select"
                              value={formData.observations.affect}
                              onChange={(e) => handleObservationChange('affect', e.target.value)}
                            >
                              {affectOptions.map(option => (
                                <option key={option} value={option}>{option}</option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                {/* Progress Section with Clickable Cells */}
                <div className="mb-3">
                  <label className="form-label">Progress</label>
                  <div className="progress-cells d-flex flex-wrap">
                    {/* 10 cells that will be filled with color when clicked */}
                    {Array.from({ length: 10 }, (_, i) => (
                      <div 
                        key={`cell${i+1}`}
                        className="progress-cell border"
                        style={{
                          width: '10%',
                          height: '40px',
                          cursor: 'pointer',
                          backgroundColor: formData.progress[`cell${i+1}`] ? '#007bff' : 'transparent'
                        }}
                        onClick={() => toggleProgressCell(`cell${i+1}`)}
                      ></div>
                    ))}
                  </div>
                  <textarea
                    className="form-control mt-2"
                    rows="3"
                    placeholder="Additional notes about patient's progress..."
                    value={formData.progress.notes}
                    onChange={(e) => handleProgressNotesChange(e.target.value)}
                  ></textarea>
                </div>
              </div>
            </div>
            
            <div className="row">
              {/* Next steps removed as requested */}
              
              <div className="col-md-12">
                <div className="mb-3">
                  <label htmlFor="recommendations" className="form-label">Recommendations</label>
                  <textarea
                    id="recommendations"
                    name="recommendations"
                    className="form-control"
                    rows="3"
                    value={formData.recommendations}
                    onChange={handleInputChange}
                    placeholder="Additional recommendations for patient"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">Signatures</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <h6 className="mb-3">Therapist Information</h6>
                <div className="mb-3">
                  <label htmlFor="therapist_id" className="form-label">Therapist (Psychometrician) *</label>
                  <select
                    id="therapist_id"
                    name="therapist_id"
                    className={`form-select ${validationErrors.therapist_id ? 'is-invalid' : ''}`}
                    value={formData.therapist_id}
                    onChange={handleInputChange}
                    disabled={loadingStaff || userRole === 'psychometrician'}
                    required
                  >
                    <option value="">Select Therapist</option>
                    {psychometricians.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.therapist_id && (
                    <div className="invalid-feedback">{validationErrors.therapist_id}</div>
                  )}
                  {loadingStaff && (
                    <div className="form-text text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Loading staff...
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label htmlFor="therapist_signature" className="form-label">Therapist Signature</label>
                  <textarea
                    id="therapist_signature"
                    name="therapist_signature"
                    className="form-control"
                    rows="2"
                    value={formData.therapist_signature}
                    onChange={handleInputChange}
                    placeholder="Enter your full name as digital signature"
                  ></textarea>
                </div>
              </div>
              
              <div className="col-md-6">
                <h6 className="mb-3">Supervising Psychologist</h6>
                <div className="mb-3">
                  <label htmlFor="psychologist_id" className="form-label">Psychologist</label>
                  <select
                    id="psychologist_id"
                    name="psychologist_id"
                    className="form-select"
                    value={formData.psychologist_id}
                    onChange={handleInputChange}
                    disabled={loadingStaff}
                  >
                    <option value="">Select Psychologist (Optional)</option>
                    {psychologists.map(staff => (
                      <option key={staff.id} value={staff.id}>
                        {staff.full_name}
                      </option>
                    ))}
                  </select>
                  {loadingStaff && (
                    <div className="form-text text-muted">
                      <div className="spinner-border spinner-border-sm me-2" role="status">
                        <span className="visually-hidden">Loading...</span>
                      </div>
                      Loading staff...
                    </div>
                  )}
                </div>
                
                <div className="mb-3">
                  <label htmlFor="psychologist_signature" className="form-label">Psychologist Signature</label>
                  <textarea
                    id="psychologist_signature"
                    name="psychologist_signature"
                    className="form-control"
                    rows="2"
                    value={formData.psychologist_signature}
                    onChange={handleInputChange}
                    placeholder="Psychologist's full name as digital signature"
                  ></textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="d-flex justify-content-end">
          <button
            type="button"
            className="btn btn-outline-secondary me-2"
            onClick={() => navigate('/psychotherapy')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading || uploading}
          >
            {loading || uploading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-2" /> Save Session
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default PsychotherapyForm;