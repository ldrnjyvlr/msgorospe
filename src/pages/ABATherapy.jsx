// pages/ABATherapy.jsx - ABA Therapy Sessions Management
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSearch, FaPrint } from 'react-icons/fa';
import ABATherapyForm from '../components/ABATherapyForm';
import ABATherapyReport from '../components/ABATherapyReport';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const ABATherapy = ({ userRole }) => {
  const { showSuccess, showError } = useNotification();
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSessionId, setSelectedSessionId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [editSessionId, setEditSessionId] = useState(null);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchSessions();
  }, [currentPage, searchQuery]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      // First, get the base query for counting
      let countQuery = supabase
        .from('aba_therapy_sessions')
        .select('*', { count: 'exact', head: true });

      // Apply search filter if provided
      if (searchQuery) {
        // Join with personal_info to search by patient name
        countQuery = supabase
          .from('aba_therapy_sessions')
          .select(`
            *,
            personal_info!inner(name)
          `, { count: 'exact', head: true })
          .ilike('personal_info.name', `%${searchQuery}%`);
      }

      const { count, error: countError } = await countQuery;
      if (countError) throw countError;

      setTotalPages(Math.ceil(count / itemsPerPage));

      // Fetch paginated records with simpler query
      let query = supabase
        .from('aba_therapy_sessions')
        .select(`
          *,
          personal_info!patient_id (*)
        `)
        .order('session_date', { ascending: false })
        .order('session_number', { ascending: false })
        .range(
          (currentPage - 1) * itemsPerPage,
          currentPage * itemsPerPage - 1
        );

      // Apply search filter if provided
      if (searchQuery) {
        query = query.ilike('personal_info.name', `%${searchQuery}%`);
      }

      const { data: sessionsData, error: sessionsError } = await query;
      if (sessionsError) throw sessionsError;

      // Now fetch user data separately for therapists and psychologists
      const userIds = [];
      sessionsData?.forEach(session => {
        if (session.therapist_id) userIds.push(session.therapist_id);
        if (session.psychologist_id) userIds.push(session.psychologist_id);
      });

      let usersData = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', [...new Set(userIds)]);
          
        if (!usersError && users) {
          users.forEach(user => {
            usersData[user.id] = user;
          });
        }
      }

      // Combine the data
      const processedSessions = sessionsData?.map(session => ({
        ...session,
        therapist: session.therapist_id ? usersData[session.therapist_id] : null,
        psychologist: session.psychologist_id ? usersData[session.psychologist_id] : null
      })) || [];

      setSessions(processedSessions);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      alert('Failed to fetch sessions: ' + error.message);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSessions();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'list') {
      setEditSessionId(null);
      fetchSessions();
    }
  };

  const handleViewSession = async (id) => {
    try {
      // First get the session with patient info
      const { data: sessionData, error: sessionError } = await supabase
        .from('aba_therapy_sessions')
        .select(`
          *,
          personal_info!patient_id (*)
        `)
        .eq('id', id)
        .single();

      if (sessionError) throw sessionError;

      // Then get the staff info separately
      const userIds = [];
      if (sessionData.therapist_id) userIds.push(sessionData.therapist_id);
      if (sessionData.psychologist_id) userIds.push(sessionData.psychologist_id);

      let staffData = {};
      if (userIds.length > 0) {
        const { data: users, error: usersError } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', userIds);
          
        if (!usersError && users) {
          users.forEach(user => {
            staffData[user.id] = user;
          });
        }
      }

      // Combine the data
      const fullSessionData = {
        ...sessionData,
        therapist: sessionData.therapist_id ? staffData[sessionData.therapist_id] : null,
        psychologist: sessionData.psychologist_id ? staffData[sessionData.psychologist_id] : null
      };

      setSelectedSession(fullSessionData);
      setActiveTab('view');
    } catch (error) {
      console.error('Error fetching session details:', error);
      alert('Failed to fetch session details: ' + error.message);
    }
  };

  const handleEditSession = (id) => {
    setEditSessionId(id);
    setActiveTab('edit');
  };

  const confirmDelete = (id) => {
    setSelectedSessionId(id);
    setDeleteConfirmation(true);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('aba_therapy_sessions')
        .delete()
        .eq('id', selectedSessionId);

      if (error) throw error;
      
      // Log audit event for session deletion
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.DELETE,
        resourceType: RESOURCE_TYPES.SESSION,
        resourceId: selectedSessionId,
        description: 'ABA therapy session deleted',
        details: {
          session_id: selectedSessionId,
          session_type: 'aba_therapy'
        }
      });
      
      setDeleteConfirmation(false);
      setSelectedSessionId(null);
      showSuccess('Session deleted successfully!');
      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      showError('Failed to delete session: ' + error.message);
    }
  };

  const handleFormSuccess = () => {
    setActiveTab('list');
    setEditSessionId(null);
    fetchSessions();
  };

  // Helper function to get progress text
  const getProgressText = (progress) => {
    if (!progress) return 'No progress recorded';
    
    if (typeof progress === 'string') {
      // For old string format
      return progress.length > 50 ? `${progress.substring(0, 50)}...` : progress;
    } else if (typeof progress === 'object') {
      // For object format, check if notes is a string
      if (progress.notes && typeof progress.notes === 'string') {
        return progress.notes.length > 50 ? `${progress.notes.substring(0, 50)}...` : progress.notes;
      } else {
        // For object format without string notes, show a summary
        const filledCells = Object.keys(progress).filter(key => key.startsWith('cell') && progress[key]).length;
        return `${filledCells}/10 cells filled`;
      }
    } else {
      // Fallback
      return 'Progress recorded';
    }
  };

  const renderSessionsList = () => {
    return (
      <div className="sessions-list">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">ABA Therapy Sessions</h4>
          <button
            className="btn btn-primary"
            onClick={() => handleTabChange('add')}
          >
            <FaPlus className="me-2" />
            New Session
          </button>
        </div>

        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleSearch} className="search-box mb-3">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by patient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">
                  <FaSearch />
                </button>
              </div>
            </form>

            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Session #</th>
                    <th>Date</th>
                    <th>Progress</th>
                    <th>Therapist</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : sessions.length > 0 ? (
                    sessions.map((session) => (
                      <tr key={session.id}>
                        <td>{session.personal_info?.name || 'Unknown'}</td>
                        <td>{session.session_number}</td>
                        <td>{new Date(session.session_date).toLocaleDateString()}</td>
                        <td>
                          {/* Now handling both string and object progress formats */}
                          {getProgressText(session.progress)}
                        </td>
                        <td>{session.therapist?.full_name || 'Not assigned'}</td>
                        <td>
                          <div className="d-flex">
                            <button
                              className="btn btn-sm btn-outline-primary me-2"
                              onClick={() => handleViewSession(session.id)}
                              title="View"
                            >
                              <FaEye />
                            </button>
                            {(userRole === 'psychometrician' || userRole === 'psychologist' || userRole === 'admin') && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-warning me-2"
                                  onClick={() => handleEditSession(session.id)}
                                  title="Edit"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => confirmDelete(session.id)}
                                  title="Delete"
                                >
                                  <FaTrash />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        No ABA therapy sessions found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <nav aria-label="Page navigation">
                  <ul className="pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(totalPages).keys()].map((page) => (
                      <li
                        key={page + 1}
                        className={`page-item ${currentPage === page + 1 ? 'active' : ''}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(page + 1)}
                        >
                          {page + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Function to render progress in view mode
  const renderProgressView = (progress) => {
    if (!progress) return 'No progress recorded';
    
    if (typeof progress === 'string') {
      // For old string format
      return progress;
    } else if (typeof progress === 'object') {
      // For new object format with cells and notes
      return (
        <div>
          <div className="progress-cells d-flex flex-wrap mb-3">
            {Array.from({ length: 10 }, (_, i) => (
              <div 
                key={`cell${i+1}`}
                className="progress-cell border"
                style={{
                  width: '10%',
                  height: '40px',
                  backgroundColor: progress[`cell${i+1}`] ? '#007bff' : 'transparent'
                }}
              ></div>
            ))}
          </div>
          <p>{typeof progress.notes === 'string' ? (progress.notes || 'No additional notes recorded') : 'No additional notes recorded'}</p>
        </div>
      );
    }
    
    return 'No progress recorded';
  };

  // Function to render observations in view mode
  const renderObservationsView = (observations) => {
    if (!observations) return 'No observations recorded';
    
    if (typeof observations === 'string') {
      // For old string format
      return observations;
    } else if (typeof observations === 'object') {
      // For new object format with table
      return (
        <table className="table table-bordered">
          <tbody>
            <tr>
              <td width="30%"><strong>APPEARANCE</strong></td>
              <td>{observations.appearance || 'Not recorded'}</td>
            </tr>
            <tr>
              <td><strong>SPEECH</strong></td>
              <td>{observations.speech || 'Not recorded'}</td>
            </tr>
            <tr>
              <td><strong>EYE CONTACT</strong></td>
              <td>{observations.eye_contact || 'Not recorded'}</td>
            </tr>
            <tr>
              <td><strong>MOTOR ACTIVITY</strong></td>
              <td>{observations.motor_activity || 'Not recorded'}</td>
            </tr>
            <tr>
              <td><strong>AFFECT</strong></td>
              <td>{observations.affect || 'Not recorded'}</td>
            </tr>
          </tbody>
        </table>
      );
    }
    
    return 'No observations recorded';
  };

  const renderViewSession = () => {
    if (!selectedSession) return null;

    return (
      <div className="view-session">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">ABA Therapy Session Details</h4>
          <div>
            <button
              className="btn btn-outline-secondary me-2"
              onClick={() => handleTabChange('list')}
            >
              Back to List
            </button>
            {(userRole === 'psychometrician' || userRole === 'psychologist' || userRole === 'admin') && (
              <button
                className="btn btn-outline-warning me-2"
                onClick={() => handleEditSession(selectedSession.id)}
              >
                <FaEdit className="me-2" /> Edit Session
              </button>
            )}
            <button
              className="btn btn-primary"
              onClick={() => setActiveTab('report')}
            >
              <FaPrint className="me-2" /> View Report
            </button>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header bg-light">
            <h6 className="mb-0">Personal Information</h6>
          </div>
          <div className="card-body">
            <table className="table table-bordered">
              <tbody>
                <tr>
                  <td><strong>NAME:</strong> {selectedSession.personal_info?.name}</td>
                  <td><strong>AGE:</strong> {selectedSession.personal_info?.age}</td>
                  <td><strong>SEX:</strong> {selectedSession.personal_info?.sex}</td>
                  <td><strong>CIVIL STATUS:</strong> {selectedSession.personal_info?.civil_status}</td>
                </tr>
                <tr>
                  <td colSpan="2"><strong>DATE OF BIRTH:</strong> {selectedSession.personal_info?.date_of_birth ? new Date(selectedSession.personal_info.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                  <td colSpan="2"><strong>PLACE OF BIRTH:</strong> {selectedSession.personal_info?.place_of_birth}</td>
                </tr>
                <tr>
                  <td><strong>NATIONALITY:</strong> {selectedSession.personal_info?.nationality}</td>
                  <td><strong>RELIGION:</strong> {selectedSession.personal_info?.religion}</td>
                  <td colSpan="2"><strong>OCCUPATION:</strong> {selectedSession.personal_info?.occupation}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>ADDRESS:</strong> {selectedSession.personal_info?.address}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>EDUCATIONAL ATTAINMENT:</strong> {selectedSession.personal_info?.educational_attainment}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>PURPOSE OF EXAMINATION:</strong> {selectedSession.personal_info?.purpose_of_examination}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>DATE OF EXAMINATION:</strong> {selectedSession.personal_info?.date_of_examination ? new Date(selectedSession.personal_info.date_of_examination).toLocaleDateString() : 'N/A'}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>AGENCY/AFFILIATION:</strong> {selectedSession.personal_info?.agency_affiliation}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Session Information</h5>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-6">
                <p><strong>Session Number:</strong> {selectedSession.session_number}</p>
                <p><strong>Session Date:</strong> {new Date(selectedSession.session_date).toLocaleDateString()}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Therapist:</strong> {selectedSession.therapist?.full_name || 'Not assigned'}</p>
                <p><strong>Psychologist:</strong> {selectedSession.psychologist?.full_name || 'Not assigned'}</p>
              </div>
            </div>
            
            <div className="mb-3">
              <h6>Observations</h6>
              <div className="border p-3 rounded">
                {/* Using the helper function to render observations */}
                {renderObservationsView(selectedSession.observations)}
              </div>
            </div>
            
            <div className="mb-3">
              <h6>Progress</h6>
              <div className="border p-3 rounded">
                {/* Using the helper function to render progress */}
                {renderProgressView(selectedSession.progress)}
              </div>
            </div>
            
            {selectedSession.recommendations && (
              <div className="mb-3">
                <h6>Recommendations</h6>
                <p className="border p-3 rounded">{selectedSession.recommendations}</p>
              </div>
            )}
            
            {selectedSession.patient_image_url && (
              <div className="mb-3">
                <h6>Patient Image</h6>
                <img
                  src={selectedSession.patient_image_url}
                  alt="Patient"
                  className="img-thumbnail"
                  style={{ maxHeight: '300px', maxWidth: '100%' }}
                />
              </div>
            )}
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">Signatures</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <p><strong>Therapist Signature:</strong></p>
                <p className="border p-3 rounded">{selectedSession.therapist_signature || 'Not signed'}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Psychologist Signature:</strong></p>
                <p className="border p-3 rounded">{selectedSession.psychologist_signature || 'Not signed'}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render add session form
  const renderAddSession = () => {
    return (
      <div className="add-session">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">New ABA Therapy Session</h4>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handleTabChange('list')}
          >
            Back to List
          </button>
        </div>
        
        <ABATherapyForm 
          userRole={userRole} 
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  };

  // Render edit session form
  const renderEditSession = () => {
    return (
      <div className="edit-session">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">Edit ABA Therapy Session</h4>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handleTabChange('list')}
          >
            Back to List
          </button>
        </div>
        
        <ABATherapyForm 
          sessionId={editSessionId}
          userRole={userRole} 
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  };

  // Render report view
  const renderReport = () => {
    if (!selectedSession) return null;

    return <ABATherapyReport 
      sessionData={selectedSession} 
      onClose={() => setActiveTab('view')}
    />;
  };

  // Delete confirmation modal
  const renderDeleteConfirmation = () => {
    return (
      <div 
        className={`modal ${deleteConfirmation ? 'd-block' : ''}`} 
        tabIndex="-1" 
        style={{ backgroundColor: deleteConfirmation ? 'rgba(0,0,0,0.5)' : 'transparent' }}
      >
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Confirm Delete</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setDeleteConfirmation(false)}
              ></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this session? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="aba-therapy-page">
      {activeTab === 'list' && renderSessionsList()}
      {activeTab === 'view' && renderViewSession()}
      {activeTab === 'add' && renderAddSession()}
      {activeTab === 'edit' && renderEditSession()}
      {activeTab === 'report' && renderReport()}
      {deleteConfirmation && renderDeleteConfirmation()}
    </div>
  );
};

export default ABATherapy;
