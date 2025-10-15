import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaUser, FaCalendarAlt, FaEye, FaTimes } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';

const Progress = () => {
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [patientProfile, setPatientProfile] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const { showSuccess, showError } = useNotification();

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('personal_info')
          .select(`
            id, 
            name, 
            age, 
            sex,
            client_sessions!inner(client_id)
          `)
          .order('name', { ascending: true });
        if (error) throw error;
        setPatients(data || []);
      } catch (e) {
        console.error('Failed to load patient list', e);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return patients;
    return patients.filter(p => (p.name || '').toLowerCase().includes(q) || String(p.id).includes(q));
  }, [patients, query]);

  // Load patient profile
  const loadPatientProfile = async (patientId) => {
    try {
      setProfileLoading(true);
      const { data, error } = await supabase
        .from('personal_info')
        .select('*')
        .eq('id', patientId)
        .single();
      
      if (error) throw error;
      setPatientProfile(data);
    } catch (error) {
      console.error('Error loading patient profile:', error);
      showError('Failed to load patient profile');
    } finally {
      setProfileLoading(false);
    }
  };

  // Load sessions for selected patient
  const loadSessions = async (patientId) => {
    try {
      setSessionsLoading(true);
      const { data, error } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('client_id', patientId)
        .order('session_number', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
    } catch (error) {
      console.error('Error loading sessions:', error);
      showError('Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  // Handle patient selection
  const handlePatientSelect = (patient) => {
    setSelectedPatient(patient);
    setShowModal(true);
    loadPatientProfile(patient.id);
    loadSessions(patient.id);
  };

  // Handle modal close
  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedPatient(null);
    setPatientProfile(null);
    setSessions([]);
  };


  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0 modern-dashboard-title">
          <FaUser className="me-3" />
          Client Progress & Sessions
        </h1>
      </div>

      {/* Patient Search and Selection */}
      <div className="card modern-table-card mb-4">
        <div className="card-header modern-card-header">
          <h5 className="mb-0 modern-card-title">
            <FaUser className="me-2" />
            Select Client
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="Search client by name or ID"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              {selectedPatient && (
                <div className="alert alert-info mb-0">
                  <strong>Selected:</strong> {selectedPatient.name} (ID: {selectedPatient.id})
                </div>
              )}
            </div>
          </div>
          
          {loading ? (
            <div className="text-center py-3">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">No clients found.</div>
          ) : (
            <div className="client-list mt-3">
              {filtered.map(patient => {
                // Parse name to format as "Lastname, Firstname MiddleName"
                const formatName = (name) => {
                  if (!name) return 'Unnamed';
                  const cleanName = name.trim().replace(/,/g, '');
                  const nameParts = cleanName.split(' ');
                  if (nameParts.length === 1) return nameParts[0];
                  if (nameParts.length === 2) return `${nameParts[0]}, ${nameParts[1]}`;
                  return `${nameParts[0]}, ${nameParts.slice(1).join(' ')}`;
                };

                return (
                  <div 
                    key={patient.id} 
                    className={`client-item ${selectedPatient?.id === patient.id ? 'selected' : ''}`} 
                    role="button" 
                    onClick={() => handlePatientSelect(patient)}
                  >
                    <div className="client-avatar">
                      <div className="avatar-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white"/>
                          <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="white"/>
                        </svg>
                      </div>
                    </div>
                    <div className="client-info">
                      <div className="client-name">{formatName(patient.name)}</div>
                      <div className="client-details">
                        ID: {patient.id} • {patient.age} years old, {patient.sex}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Client Profile & Sessions Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h5 className="modal-title">
                <FaUser className="me-2" />
                {selectedPatient?.name ? (() => {
                  const formatName = (name) => {
                    if (!name) return 'Unnamed';
                    const cleanName = name.trim().replace(/,/g, '');
                    const nameParts = cleanName.split(' ');
                    if (nameParts.length === 1) return nameParts[0];
                    if (nameParts.length === 2) return `${nameParts[0]}, ${nameParts[1]}`;
                    return `${nameParts[0]}, ${nameParts.slice(1).join(' ')}`;
                  };
                  return formatName(selectedPatient.name);
                })() : 'Client Profile'}
              </h5>
              <button type="button" className="btn-close" onClick={handleCloseModal}>
                <FaTimes />
              </button>
            </div>
            
            <div className="modal-body">
              {/* Client Profile */}
              <div className="card modern-table-card mb-4">
                <div className="card-header modern-card-header">
                  <h6 className="mb-0 modern-card-title">
                    <FaUser className="me-2" />
                    Client Profile
                  </h6>
                </div>
                <div className="card-body">
                  {profileLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading profile...</span>
                      </div>
                    </div>
                  ) : patientProfile ? (
                    <div className="row">
                      <div className="col-md-6">
                        <p><strong>Name:</strong> {patientProfile.name || '—'}</p>
                        <p><strong>Age:</strong> {patientProfile.age ?? '—'}</p>
                        <p><strong>Sex:</strong> {patientProfile.sex || '—'}</p>
                        <p><strong>Civil Status:</strong> {patientProfile.civil_status || '—'}</p>
                        <p><strong>Date of Birth:</strong> {patientProfile.date_of_birth ? new Date(patientProfile.date_of_birth).toLocaleDateString() : '—'}</p>
                        <p><strong>Place of Birth:</strong> {patientProfile.place_of_birth || '—'}</p>
                      </div>
                      <div className="col-md-6">
                        <p><strong>Nationality:</strong> {patientProfile.nationality || '—'}</p>
                        <p><strong>Religion:</strong> {patientProfile.religion || '—'}</p>
                        <p><strong>Address:</strong> {patientProfile.address || '—'}</p>
                        <p><strong>Occupation:</strong> {patientProfile.occupation || '—'}</p>
                        <p><strong>Educational Attainment:</strong> {patientProfile.educational_attainment || '—'}</p>
                        <p><strong>Purpose of Examination:</strong> {patientProfile.purpose_of_examination || '—'}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-muted py-3">
                      No profile data available
                    </div>
                  )}
                </div>
              </div>

              {/* Sessions Management */}
              <div className="card modern-table-card">
                <div className="card-header modern-card-header">
                  <h6 className="mb-0 modern-card-title">
                    <FaCalendarAlt className="me-2" />
                    Sessions
                  </h6>
                </div>
                
                <div className="card-body">

                  {/* Sessions List */}
                  {sessionsLoading ? (
                    <div className="text-center py-3">
                      <div className="spinner-border text-primary" role="status">
                        <span className="visually-hidden">Loading sessions...</span>
                      </div>
                    </div>
                  ) : sessions.length === 0 ? (
                    <div className="text-center text-muted py-3">
                      <FaCalendarAlt className="mb-2" size={32} />
                      <h6>No sessions recorded yet</h6>
                      <p>Sessions will appear here once they are added to the system</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover modern-table">
                        <thead className="modern-table-header">
                          <tr>
                            <th className="modern-th">Session #</th>
                            <th className="modern-th">Date</th>
                            <th className="modern-th">Services</th>
                            <th className="modern-th">Notes</th>
                            <th className="modern-th">File</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sessions.map((session) => (
                            <tr key={session.id} className="modern-table-row">
                              <td className="modern-td">
                                <span className="session-number-badge">
                                  {session.session_number}
                                </span>
                              </td>
                              <td className="modern-td">
                                <span className="date-badge">
                                  {new Date(session.session_date).toLocaleDateString()}
                                </span>
                              </td>
                              <td className="modern-td">
                                <span className="service-badge">
                                  {session.services_acquired || '—'}
                                </span>
                              </td>
                              <td className="modern-td">
                                {session.notes ? (
                                  <span 
                                    title={session.notes}
                                    className="notes-preview"
                                  >
                                    {session.notes.length > 30 
                                      ? `${session.notes.substring(0, 30)}...` 
                                      : session.notes}
                                  </span>
                                ) : '—'}
                              </td>
                              <td className="modern-td">
                                {session.uploaded_file_url ? (
                                  <a 
                                    href={session.uploaded_file_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="btn btn-sm modern-view-btn"
                                  >
                                    <FaEye className="me-1" /> View File
                                  </a>
                                ) : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modern CSS Styles */}
      <style jsx>{`
        .modern-dashboard-title {
          color: #2d3748;
          font-weight: 700;
          font-size: 2rem;
        }
        
        .modern-table-card {
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
        
        .client-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        
        .client-item {
          display: flex;
          align-items: center;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .client-item:hover {
          border-color: #667eea;
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.15);
          transform: translateY(-1px);
        }
        
        .client-item.selected {
          border-color: #667eea;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
          box-shadow: 0 2px 8px rgba(102, 126, 234, 0.2);
        }
        
        .client-avatar {
          margin-right: 1rem;
          flex-shrink: 0;
        }
        
        .avatar-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .client-info {
          flex: 1;
          min-width: 0;
        }
        
        .client-name {
          font-weight: 600;
          color: #2d3748;
          font-size: 1rem;
          margin-bottom: 0.25rem;
        }
        
        .client-details {
          font-size: 0.875rem;
          color: #718096;
        }
        
        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1050;
          padding: 1rem;
        }
        
        .modal-content {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
          max-width: 90vw;
          max-height: 90vh;
          width: 1200px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .modal-header {
          padding: 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #f7fafc 0%, #edf2f7 100%);
        }
        
        .modal-title {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #2d3748;
        }
        
        .btn-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #718096;
          cursor: pointer;
          padding: 0.5rem;
          border-radius: 0.5rem;
          transition: all 0.2s;
        }
        
        .btn-close:hover {
          background: #e2e8f0;
          color: #2d3748;
        }
        
        .modal-body {
          padding: 1.5rem;
          overflow-y: auto;
          flex: 1;
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
        }
        
        .modern-td {
          border: none;
          padding: 1rem 1.5rem;
          vertical-align: middle;
        }
        
        .session-number-badge {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .date-badge {
          background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
          color: #9c4221;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .service-badge {
          background: linear-gradient(135deg, #e6fffa 0%, #b2f5ea 100%);
          color: #234e52;
          padding: 0.25rem 0.75rem;
          border-radius: 1rem;
          font-size: 0.8rem;
          font-weight: 600;
        }
        
        .notes-preview {
          color: #4a5568;
          font-size: 0.9rem;
          max-width: 200px;
          display: inline-block;
        }
        
        .modern-view-btn {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
          color: white;
          border: none;
          border-radius: 0.5rem;
          padding: 0.5rem 1rem;
          font-weight: 600;
          transition: all 0.3s;
        }
        
        .modern-view-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 15px rgba(67, 233, 123, 0.4);
          color: white;
        }
        
        @media (max-width: 768px) {
          .modern-dashboard-title {
            font-size: 1.5rem;
          }
          
          .modal-content {
            width: 95vw;
            max-height: 95vh;
          }
          
          .modal-header {
            padding: 1rem;
          }
          
          .modal-body {
            padding: 1rem;
          }
          
          .modal-title {
            font-size: 1.1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default Progress;


