// components/LoadingDebugger.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const LoadingDebugger = () => {
  const [debugInfo, setDebugInfo] = useState([]);
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [checks, setChecks] = useState({
    authCheck: 'pending',
    sessionCheck: 'pending',
    userCheck: 'pending',
    roleCheck: 'pending',
    profileCheck: 'pending'
  });

  const addDebugMessage = (message, type = 'info') => {
    const timestamp = new Date().toISOString();
    setDebugInfo(prev => [...prev, { timestamp, message, type }]);
    console.log(`[DEBUG ${timestamp}] ${message}`);
  };

  useEffect(() => {
    runDebugSequence();
  }, []);

  const runDebugSequence = async () => {
    addDebugMessage('Starting debug sequence...', 'info');

    // 1. Check Supabase connection
    try {
      addDebugMessage('Checking Supabase connection...', 'info');
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        addDebugMessage(`Supabase connection error: ${error.message}`, 'error');
        setChecks(prev => ({ ...prev, authCheck: 'failed' }));
        return;
      }
      
      addDebugMessage('Supabase connected successfully', 'success');
      setChecks(prev => ({ ...prev, authCheck: 'passed' }));
      setSession(session);

      // 2. Check session
      if (session) {
        addDebugMessage('Session found', 'success');
        setChecks(prev => ({ ...prev, sessionCheck: 'passed' }));
        setUser(session.user);
        
        // 3. Check user
        if (session.user) {
          addDebugMessage(`User found: ${session.user.email}`, 'success');
          setChecks(prev => ({ ...prev, userCheck: 'passed' }));
          
          // 4. Check user role
          await checkUserRole(session.user.id);
          
          // 5. Check profile (if patient)
          const role = await getUserRole(session.user.id);
          if (role === 'patient') {
            await checkUserProfile(session.user.id);
          } else {
            addDebugMessage('User is not a patient, skipping profile check', 'info');
            setChecks(prev => ({ ...prev, profileCheck: 'skipped' }));
          }
        } else {
          addDebugMessage('No user in session', 'warning');
          setChecks(prev => ({ ...prev, userCheck: 'failed' }));
        }
      } else {
        addDebugMessage('No session found', 'warning');
        setChecks(prev => ({ ...prev, sessionCheck: 'failed' }));
      }
    } catch (error) {
      addDebugMessage(`Unexpected error: ${error.message}`, 'error');
      console.error('Debug sequence error:', error);
    }
  };

  const checkUserRole = async (userId) => {
    try {
      addDebugMessage(`Checking role for user: ${userId}`, 'info');
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          addDebugMessage('No role found in database', 'warning');
          setChecks(prev => ({ ...prev, roleCheck: 'not_found' }));
        } else {
          addDebugMessage(`Error fetching role: ${error.message}`, 'error');
          setChecks(prev => ({ ...prev, roleCheck: 'failed' }));
        }
        return;
      }

      const role = data?.role || 'unknown';
      addDebugMessage(`User role found: ${role}`, 'success');
      setUserRole(role);
      setChecks(prev => ({ ...prev, roleCheck: 'passed' }));
    } catch (error) {
      addDebugMessage(`Role check error: ${error.message}`, 'error');
      setChecks(prev => ({ ...prev, roleCheck: 'failed' }));
    }
  };

  const getUserRole = async (userId) => {
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      
      return data?.role;
    } catch (error) {
      return null;
    }
  };

  const checkUserProfile = async (userId) => {
    try {
      addDebugMessage(`Checking profile for patient: ${userId}`, 'info');
      
      const { data, error } = await supabase
        .from('personal_info')
        .select('id, sex, civil_status, date_of_birth')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          addDebugMessage('No patient profile found', 'warning');
          setChecks(prev => ({ ...prev, profileCheck: 'not_found' }));
        } else {
          addDebugMessage(`Error fetching profile: ${error.message}`, 'error');
          setChecks(prev => ({ ...prev, profileCheck: 'failed' }));
        }
        return;
      }

      const isIncomplete = (
        data.sex === 'Unspecified' || 
        data.civil_status === 'Unspecified' || 
        !data.date_of_birth
      );

      if (isIncomplete) {
        addDebugMessage('Patient profile is incomplete', 'warning');
        setChecks(prev => ({ ...prev, profileCheck: 'incomplete' }));
      } else {
        addDebugMessage('Patient profile is complete', 'success');
        setChecks(prev => ({ ...prev, profileCheck: 'passed' }));
      }
    } catch (error) {
      addDebugMessage(`Profile check error: ${error.message}`, 'error');
      setChecks(prev => ({ ...prev, profileCheck: 'failed' }));
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'passed':
        return '✅';
      case 'failed':
        return '❌';
      case 'pending':
        return '⏳';
      case 'not_found':
        return '❓';
      case 'incomplete':
        return '⚠️';
      case 'skipped':
        return '➖';
      default:
        return '❔';
    }
  };

  const getMessageClass = (type) => {
    switch (type) {
      case 'error':
        return 'alert-danger';
      case 'warning':
        return 'alert-warning';
      case 'success':
        return 'alert-success';
      default:
        return 'alert-info';
    }
  };

  return (
    <div className="container mt-4">
      <div className="card">
        <div className="card-header">
          <h3>Loading Debug Panel</h3>
        </div>
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-12">
              <h5>Status Checks</h5>
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>Auth Connection</td>
                    <td>{getStatusIcon(checks.authCheck)} {checks.authCheck}</td>
                  </tr>
                  <tr>
                    <td>Session Check</td>
                    <td>{getStatusIcon(checks.sessionCheck)} {checks.sessionCheck}</td>
                  </tr>
                  <tr>
                    <td>User Check</td>
                    <td>{getStatusIcon(checks.userCheck)} {checks.userCheck}</td>
                  </tr>
                  <tr>
                    <td>Role Check</td>
                    <td>{getStatusIcon(checks.roleCheck)} {checks.roleCheck}</td>
                  </tr>
                  <tr>
                    <td>Profile Check</td>
                    <td>{getStatusIcon(checks.profileCheck)} {checks.profileCheck}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="row mb-4">
            <div className="col-12">
              <h5>Current State</h5>
              <table className="table table-sm">
                <tbody>
                  <tr>
                    <td>Session</td>
                    <td>{session ? 'Active' : 'None'}</td>
                  </tr>
                  <tr>
                    <td>User</td>
                    <td>{user?.email || 'None'}</td>
                  </tr>
                  <tr>
                    <td>Role</td>
                    <td>{userRole || 'Unknown'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="row">
            <div className="col-12">
              <h5>Debug Log</h5>
              <div className="debug-log" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {debugInfo.map((info, index) => (
                  <div
                    key={index}
                    className={`alert ${getMessageClass(info.type)} p-2 mb-1`}
                    style={{ fontSize: '0.85rem' }}
                  >
                    <small className="text-muted">{info.timestamp}</small>
                    <br />
                    {info.message}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3">
            <button 
              className="btn btn-primary"
              onClick={runDebugSequence}
            >
              Re-run Debug Sequence
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoadingDebugger;