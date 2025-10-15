import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNotification } from '../contexts/NotificationContext';

const SessionManagement = ({ clientId }) => {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingSession, setEditingSession] = useState(null);
  const [newSession, setNewSession] = useState({
    session_number: 1,
    session_date: new Date().toISOString().split('T')[0],
    services_acquired: '',
    notes: '',
    file: null
  });
  const { showSuccess, showError } = useNotification();

  // Load sessions for the client
  const loadSessions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('client_sessions')
        .select('*')
        .eq('client_id', clientId)
        .order('session_number', { ascending: true });

      if (error) throw error;
      setSessions(data || []);
      
      // Set next session number
      const nextSessionNumber = data && data.length > 0 
        ? Math.max(...data.map(s => s.session_number)) + 1 
        : 1;
      setNewSession(prev => ({ ...prev, session_number: nextSessionNumber }));
    } catch (error) {
      console.error('Error loading sessions:', error);
      showError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      loadSessions();
    }
  }, [clientId]);

  // Handle file upload to Supabase Storage
  const uploadFile = async (file) => {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `session-files/${clientId}/${fileName}`;

    try {
      const { data, error } = await supabase.storage
        .from('session-files')
        .upload(filePath, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('session-files')
        .getPublicUrl(filePath);

      return {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Save session
  const saveSession = async (sessionData) => {
    try {
      setSaving(true);
      
      let fileData = null;
      if (sessionData.file) {
        fileData = await uploadFile(sessionData.file);
      }

      const sessionRecord = {
        client_id: clientId,
        session_number: sessionData.session_number,
        session_date: sessionData.session_date,
        services_acquired: sessionData.services_acquired,
        notes: sessionData.notes,
        ...(fileData && {
          uploaded_file_url: fileData.url,
          uploaded_file_name: fileData.name,
          file_size: fileData.size,
          file_type: fileData.type
        })
      };

      let result;
      if (editingSession) {
        // Update existing session
        const { data, error } = await supabase
          .from('client_sessions')
          .update(sessionRecord)
          .eq('id', editingSession.id)
          .select()
          .single();

        if (error) throw error;
        result = data;
        
        setSessions(prev => prev.map(s => s.id === editingSession.id ? result : s));
        setEditingSession(null);
        showSuccess('Session updated successfully');
      } else {
        // Create new session
        const { data, error } = await supabase
          .from('client_sessions')
          .insert([sessionRecord])
          .select()
          .single();

        if (error) throw error;
        result = data;
        
        setSessions(prev => [...prev, result]);
        showSuccess('Session saved successfully');
      }

      // Reset form with next session number
      const updatedSessions = editingSession 
        ? sessions.map(s => s.id === editingSession.id ? result : s)
        : [...sessions, result];
      
      setNewSession({
        session_number: Math.max(...updatedSessions.map(s => s.session_number), 0) + 1,
        session_date: new Date().toISOString().split('T')[0],
        services_acquired: '',
        notes: '',
        file: null
      });

    } catch (error) {
      console.error('Error saving session:', error);
      showError('Failed to save session');
    } finally {
      setSaving(false);
    }
  };

  // Delete session
  const deleteSession = async (sessionId) => {
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('client_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      setSessions(prev => {
        const updatedSessions = prev.filter(s => s.id !== sessionId);
        // Update next session number after deletion
        const nextSessionNumber = updatedSessions.length > 0 
          ? Math.max(...updatedSessions.map(s => s.session_number)) + 1 
          : 1;
        setNewSession(prevForm => ({ 
          ...prevForm, 
          session_number: nextSessionNumber 
        }));
        return updatedSessions;
      });
      showSuccess('Session deleted successfully');
    } catch (error) {
      console.error('Error deleting session:', error);
      showError('Failed to delete session');
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    saveSession(newSession);
  };

  // Handle edit session
  const handleEdit = (session) => {
    setEditingSession(session);
    setNewSession({
      session_number: session.session_number,
      session_date: session.session_date,
      services_acquired: session.services_acquired || '',
      notes: session.notes || '',
      file: null
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setEditingSession(null);
    setNewSession({
      session_number: Math.max(...sessions.map(s => s.session_number), 0) + 1,
      session_date: new Date().toISOString().split('T')[0],
      services_acquired: '',
      notes: '',
      file: null
    });
  };

  // Handle file change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setNewSession(prev => ({ ...prev, file }));
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '200px' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading sessions...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Sessions</h5>
          <button 
            type="button" 
            className="btn btn-primary btn-sm"
            onClick={() => {
              const nextSessionNumber = sessions.length > 0 
                ? Math.max(...sessions.map(s => s.session_number)) + 1 
                : 1;
              setNewSession(prev => ({ 
                ...prev, 
                session_number: nextSessionNumber,
                session_date: new Date().toISOString().split('T')[0],
                services_acquired: '',
                notes: '',
                file: null
              }));
              setEditingSession(null);
            }}
          >
            Add Session
          </button>
        </div>
        
        <div className="card-body">
          {/* Session Form */}
          <form onSubmit={handleSubmit} className="mb-4">
            <div className="row">
              <div className="col-md-2">
                <label className="form-label">Session Number</label>
                <input
                  type="number"
                  className="form-control"
                  value={newSession.session_number}
                  onChange={(e) => setNewSession(prev => ({ ...prev, session_number: parseInt(e.target.value) }))}
                  min="1"
                  required
                />
              </div>
              
              <div className="col-md-2">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  className="form-control"
                  value={newSession.session_date}
                  onChange={(e) => setNewSession(prev => ({ ...prev, session_date: e.target.value }))}
                  required
                />
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Services Acquired</label>
                <select
                  className="form-select"
                  value={newSession.services_acquired}
                  onChange={(e) => setNewSession(prev => ({ ...prev, services_acquired: e.target.value }))}
                >
                  <option value="">Select service</option>
                  <option value="Psychotherapy">Psychotherapy</option>
                  <option value="Mental Health Consultation">Mental Health Consultation</option>
                  <option value="Reffered">Reffered</option>
                  <option value="Terminate">Terminate</option>
                </select>
              </div>
              
              <div className="col-md-3">
                <label className="form-label">Upload File</label>
                <input
                  type="file"
                  className="form-control"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
                />
              </div>
              
              <div className="col-md-2">
                <label className="form-label">&nbsp;</label>
                <div className="d-flex gap-2">
                  <button 
                    type="submit" 
                    className="btn btn-success"
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  {editingSession && (
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            </div>
            
            <div className="row mt-3">
              <div className="col-12">
                <label className="form-label">Notes</label>
                <textarea
                  className="form-control"
                  rows="3"
                  value={newSession.notes}
                  onChange={(e) => setNewSession(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Enter notes"
                />
              </div>
            </div>
          </form>

          {/* Sessions List */}
          {sessions.length === 0 ? (
            <div className="text-center text-muted py-4">
              No sessions recorded yet.
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-striped">
                <thead>
                  <tr>
                    <th>Session #</th>
                    <th>Date</th>
                    <th>Services</th>
                    <th>Notes</th>
                    <th>File</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sessions.map((session) => (
                    <tr key={session.id}>
                      <td>{session.session_number}</td>
                      <td>{new Date(session.session_date).toLocaleDateString()}</td>
                      <td>{session.services_acquired || '—'}</td>
                      <td>
                        {session.notes ? (
                          <span 
                            title={session.notes}
                            style={{ 
                              display: 'inline-block', 
                              maxWidth: '200px', 
                              overflow: 'hidden', 
                              textOverflow: 'ellipsis', 
                              whiteSpace: 'nowrap' 
                            }}
                          >
                            {session.notes}
                          </span>
                        ) : '—'}
                      </td>
                      <td>
                        {session.uploaded_file_url ? (
                          <a 
                            href={session.uploaded_file_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="btn btn-sm btn-outline-primary"
                          >
                            View File
                          </a>
                        ) : '—'}
                      </td>
                      <td>
                        <div className="btn-group btn-group-sm">
                          <button 
                            className="btn btn-outline-primary"
                            onClick={() => handleEdit(session)}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn btn-outline-danger"
                            onClick={() => deleteSession(session.id)}
                          >
                            Delete
                          </button>
                        </div>
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
  );
};

export default SessionManagement;
