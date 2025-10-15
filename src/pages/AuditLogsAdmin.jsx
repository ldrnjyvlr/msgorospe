import React, { useState, useEffect } from 'react';
import { 
  FaShieldAlt, 
  FaSearch, 
  FaFilter, 
  FaDownload, 
  FaEye, 
  FaExclamationTriangle,
  FaUsers,
  FaChartLine,
  FaCalendarAlt,
  FaClock,
  FaCheckCircle,
  FaTimesCircle
} from 'react-icons/fa';
import { getAuditLogs, getAuditStatistics, AUDIT_ACTIONS, RESOURCE_TYPES, SEVERITY_LEVELS } from '../utils/auditLogger';

const AuditLogsAdmin = ({ userRole }) => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statistics, setStatistics] = useState(null);
  const [selectedLog, setSelectedLog] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    actionType: '',
    resourceType: '',
    userRole: '',
    status: '',
    userEmail: '', // changed from userId
    dateFrom: '', // Start with no date filter to show all records
    dateTo: ''    // Start with no date filter to show all records
  });
  
  const logsPerPage = 25;

  // React hooks must be called before any conditional returns
  useEffect(() => {
    if (userRole === 'admin') {
      fetchAuditLogs();
      fetchStatistics();
    }
  }, [currentPage, filters, userRole]);

  // Check if user has admin access
  if (userRole !== 'admin') {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger" role="alert">
          <FaExclamationTriangle className="me-2" />
          <strong>Access Denied:</strong> Only administrators can access audit logs.
        </div>
      </div>
    );
  }

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      setError(null);
      const offset = (currentPage - 1) * logsPerPage;
      
      console.log('Fetching audit logs with filters:', filters);
      
      const result = await getAuditLogs({
        limit: logsPerPage,
        offset,
        filters,
        sortBy: 'created_at',
        sortOrder: 'desc'
      });
      
      console.log('Audit logs API result:', result);
      
      if (result.error) {
        console.error('API Error details:', result.error);
        setError(result.error);
        setAuditLogs([]);
        setTotalCount(0);
      } else {
        const logs = result.data || [];
        const count = result.count || 0;
        
        console.log('Setting audit logs:', logs.length, 'total count:', count);
        
        setAuditLogs(logs);
        setTotalCount(count);
      }
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError({
        message: error.message || 'Failed to fetch audit logs',
        details: error
      });
      setAuditLogs([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const { stats, error } = await getAuditStatistics();
      if (!error && stats) {
        setStatistics(stats);
      }
    } catch (error) {
      console.error('Error fetching audit statistics:', error);
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      actionType: '',
      resourceType: '',
      userRole: '',
      status: '',
      userEmail: '', // changed from userId
      dateFrom: '',
      dateTo: ''
    });
    setCurrentPage(1);
  };


  const loadAllRecords = () => {
    clearFilters();
    fetchAuditLogs();
  };

  const exportLogs = async () => {
    try {
      const { data } = await getAuditLogs({
        limit: 10000,
        offset: 0,
        filters
      });

      // Convert to CSV
      const headers = [
        'Timestamp', 'User Email', 'User Role', 'Action Type', 'Resource Type', 
        'Resource ID', 'Description', 'Status', 'IP Address'
      ];

      const csvContent = [
        headers.join(','),
        ...data.map(log => [
          new Date(log.created_at).toISOString(),
          log.user_email || '',
          log.user_role || '',
          log.action_type || '',
          log.resource_type || '',
          log.resource_id || '',
          `"${(log.action_description || '').replace(/"/g, '""')}"`,
          log.status || '',
          log.ip_address || ''
        ].join(','))
      ].join('\n');

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error exporting logs:', error);
      alert('Failed to export logs');
    }
  };

  const getSeverityBadgeClass = (severity) => {
    const classes = {
      low: 'bg-success',
      medium: 'bg-warning',
      high: 'bg-danger',
      critical: 'bg-danger'
    };
    return classes[severity] || 'bg-secondary';
  };

  const getStatusBadgeClass = (status) => {
    const classes = {
      success: 'bg-success',
      failed: 'bg-danger',
      blocked: 'bg-warning'
    };
    return classes[status] || 'bg-secondary';
  };

  const renderStatistics = () => {
    if (!statistics) return null;
    
    return (
      <div className="row mb-4">
        <div className="col-md-3 mb-3">
          <div
            className="card h-100 shadow border-0"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 60%, #ff9068 100%)',
              color: '#fff',
              borderRadius: '1rem',
              minHeight: 140,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="card-body d-flex flex-column justify-content-between">
              <div className="d-flex align-items-center mb-2">
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    marginRight: 16
                  }}
                >
                  <FaChartLine size={28} />
                </div>
                <div>
                  <h6 className="card-title mb-1" style={{ fontWeight: 600, letterSpacing: 1 }}>Total Actions</h6>
                  <h3 className="mb-0" style={{ fontWeight: 700 }}>{statistics.totalActions.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className="card h-100 shadow border-0"
            style={{
              background: 'linear-gradient(135deg, #ff9068 60%, #ffcc70 100%)',
              color: '#fff',
              borderRadius: '1rem',
              minHeight: 140,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="card-body d-flex flex-column justify-content-between">
              <div className="d-flex align-items-center mb-2">
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    marginRight: 16
                  }}
                >
                  <FaUsers size={28} />
                </div>
                <div>
                  <h6 className="card-title mb-1" style={{ fontWeight: 600, letterSpacing: 1 }}>Active Users</h6>
                  <h3 className="mb-0" style={{ fontWeight: 700 }}>{statistics.totalUsers}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className="card h-100 shadow border-0"
            style={{
              background: 'linear-gradient(135deg, #ffcc70 60%, #ffd89b 100%)',
              color: '#fff',
              borderRadius: '1rem',
              minHeight: 140,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="card-body d-flex flex-column justify-content-between">
              <div className="d-flex align-items-center mb-2">
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    marginRight: 16
                  }}
                >
                  <FaCheckCircle size={28} />
                </div>
                <div>
                  <h6 className="card-title mb-1" style={{ fontWeight: 600, letterSpacing: 1 }}>Total Logins</h6>
                  <h3 className="mb-0" style={{ fontWeight: 700 }}>{statistics.loginCount.toLocaleString()}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-3 mb-3">
          <div
            className="card h-100 shadow border-0"
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 40%, #ff9068 80%)',
              color: '#fff',
              borderRadius: '1rem',
              minHeight: 140,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div className="card-body d-flex flex-column justify-content-between">
              <div className="d-flex align-items-center mb-2">
                <div
                  className="d-flex align-items-center justify-content-center"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    borderRadius: '50%',
                    width: 48,
                    height: 48,
                    marginRight: 16
                  }}
                >
                  <FaTimesCircle size={28} />
                </div>
                <div>
                  <h6 className="card-title mb-1" style={{ fontWeight: 600, letterSpacing: 1 }}>Failed Actions</h6>
                  <h3 className="mb-0" style={{ fontWeight: 700 }}>{statistics.failedActions}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderFilters = () => {
    return (
      <div className="card mb-4 shadow border-0" style={{
        borderRadius: '1.5rem',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(255, 107, 107, 0.15)'
      }}>
        <div 
          className="card-header"
          style={{
            background: 'linear-gradient(90deg, #ff6b6b 0%, #ff9068 100%)',
            color: '#fff',
            borderBottom: 'none',
            borderRadius: '1.5rem 1.5rem 0 0',
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
        <div className="card-body">
          <div className="row">
            <div className="col-md-2">
              <label className="form-label">Action Type</label>
              <select
                className="form-select form-select-sm"
                value={filters.actionType}
                onChange={(e) => handleFilterChange('actionType', e.target.value)}
              >
                <option value="">All Actions</option>
                {Object.values(AUDIT_ACTIONS).map(action => (
                  <option key={action} value={action}>
                    {action.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Resource Type</label>
              <select
                className="form-select form-select-sm"
                value={filters.resourceType}
                onChange={(e) => handleFilterChange('resourceType', e.target.value)}
              >
                <option value="">All Resources</option>
                {Object.values(RESOURCE_TYPES).map(resource => (
                  <option key={resource} value={resource}>
                    {resource.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">User Role</label>
              <select
                className="form-select form-select-sm"
                value={filters.userRole}
                onChange={(e) => handleFilterChange('userRole', e.target.value)}
              >
                <option value="">All Roles</option>
                <option value="admin">Admin</option>
                <option value="psychometrician">Psychometrician</option>
                <option value="psychologist">Psychologist</option>
                <option value="patient">Patient</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">From Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">To Date</label>
              <input
                type="date"
                className="form-control form-control-sm"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
          </div>
          <div className="row mt-3">
            <div className="col-md-4">
              <label className="form-label">User Email</label>
              <input
                type="text"
                className="form-control form-control-sm"
                placeholder="Search by user email..."
                value={filters.userEmail}
                onChange={(e) => handleFilterChange('userEmail', e.target.value)}
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>
            <div className="col-md-6 d-flex align-items-end">
              <button 
                className="btn btn-sm me-2"
                style={{
                  background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '15px',
                  fontWeight: '600'
                }}
                onClick={exportLogs}
              >
                <FaDownload className="me-2" />
                Export CSV
              </button>
              <button 
                className="btn btn-sm me-2"
                style={{
                  background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '15px',
                  fontWeight: '600'
                }}
                onClick={loadAllRecords}
              >
                Load All Records
              </button>
              <button 
                className="btn btn-outline-secondary btn-sm"
                style={{
                  borderRadius: '15px',
                  fontWeight: '600'
                }}
                onClick={clearFilters}
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLogDetail = () => {
    if (!selectedLog) return null;
    
    return (
      <div className="modal fade show" style={{ display: 'block' }} tabIndex="-1">
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Audit Log Details</h5>
              <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
            </div>
            <div className="modal-body">
              <div className="row">
                <div className="col-md-6">
                  <h6 className="text-primary">Basic Information</h6>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Timestamp:</strong></td>
                        <td>{new Date(selectedLog.created_at).toLocaleString()}</td>
                      </tr>
                      <tr>
                        <td><strong>User:</strong></td>
                        <td>{selectedLog.user_email}</td>
                      </tr>
                      <tr>
                        <td><strong>Role:</strong></td>
                        <td>
                          <span className="badge bg-info">{selectedLog.user_role}</span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Action:</strong></td>
                        <td>
                          <span className="badge bg-primary">{selectedLog.action_type}</span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>Resource:</strong></td>
                        <td>{selectedLog.resource_type || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>Resource ID:</strong></td>
                        <td>{selectedLog.resource_id || 'N/A'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="col-md-6">
                  <h6 className="text-success">Status & Security</h6>
                  <table className="table table-sm">
                    <tbody>
                      <tr>
                        <td><strong>Status:</strong></td>
                        <td>
                          <span className={`badge ${getStatusBadgeClass(selectedLog.status)}`}>
                            {selectedLog.status}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td><strong>IP Address:</strong></td>
                        <td>{selectedLog.ip_address || 'Unknown'}</td>
                      </tr>
                      <tr>
                        <td><strong>Session ID:</strong></td>
                        <td>{selectedLog.session_id || 'N/A'}</td>
                      </tr>
                      <tr>
                        <td><strong>User Agent:</strong></td>
                        <td className="small">{selectedLog.user_agent || 'Unknown'}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="mt-3">
                <h6 className="text-warning">Description</h6>
                <div className="border rounded p-3 bg-light">
                  {selectedLog.action_description}
                </div>
              </div>
              
              {selectedLog.details && (
                <div className="mt-3">
                  <h6 className="text-info">Additional Details</h6>
                  <div className="border rounded p-3 bg-light">
                    <pre className="mb-0 small">
                      {JSON.stringify(selectedLog.details, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button 
                type="button" 
                className="btn"
                style={{
                  background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '15px',
                  fontWeight: '600'
                }}
                onClick={() => setShowModal(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const totalPages = Math.ceil(totalCount / logsPerPage);

  return (
    <div className="audit-logs-admin" style={{ 
      overflow: 'hidden', 
      minHeight: '100vh',
      background: 'white',
      padding: '2rem'
    }}>
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
                    <h2 className="mb-1 fw-bold text-dark">Audit Logs & Security Monitoring</h2>
                    <p className="mb-0 text-muted">Monitor all user activities and system events</p>
                  </div>
                </div>
                <div className="d-flex align-items-center">
                  <span className="badge me-2" style={{
                    background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                    color: 'white',
                    borderRadius: '15px',
                    padding: '8px 16px'
                  }}>
                    <FaClock className="me-1" />
                    Last updated: {new Date().toLocaleTimeString()}
                  </span>
                  <button 
                    className="btn shadow-sm"
                    style={{
                      background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                      border: 'none',
                      color: 'white',
                      borderRadius: '15px',
                      padding: '12px 24px',
                      fontWeight: '600',
                      transition: 'all 0.3s ease'
                    }}
                    onClick={() => {
                      fetchAuditLogs();
                      fetchStatistics();
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
                    Refresh
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {renderStatistics()}
      {renderFilters()}

      {/* Error Display */}
      {error && (
        <div className="alert alert-danger mb-3">
          <strong>Error loading audit logs:</strong> {error.message}
        </div>
      )}

      <div className="card shadow border-0" style={{
        borderRadius: '1.5rem',
        background: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(10px)',
        boxShadow: '0 4px 24px rgba(255, 107, 107, 0.15)'
      }}>
        <div 
          className="card-header d-flex justify-content-between align-items-center"
          style={{
            background: 'linear-gradient(90deg, #ff6b6b 0%, #ff9068 100%)',
            color: '#fff',
            borderBottom: 'none',
            borderRadius: '1.5rem 1.5rem 0 0',
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
              width: 32,
              height: 32,
              marginRight: 12,
              boxShadow: '0 2px 8px rgba(255, 107, 107, 0.2)'
            }}>
              <FaShieldAlt style={{ color: '#ff6b6b', fontSize: 16 }} />
            </span>
            Audit Logs ({totalCount.toLocaleString()} total)
          </h5>
          <div className="text-white small" style={{ fontWeight: 600 }}>
            Showing {((currentPage - 1) * logsPerPage) + 1} - {Math.min(currentPage * logsPerPage, totalCount)} of {totalCount}
          </div>
        </div>
        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : (auditLogs && auditLogs.length > 0) ? (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Timestamp</th>
                    <th>User</th>
                    <th>Role</th>
                    <th>Action</th>
                    <th>Resource</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                      <td>
                        <div className="small">
                          <FaCalendarAlt className="me-1" />
                          {new Date(log.created_at).toLocaleDateString()}
                          <br />
                          <FaClock className="me-1" />
                          {new Date(log.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td>
                        <div className="small">
                          {log.user_email}
                          {log.ip_address && (
                            <div className="text-muted">
                              IP: {log.ip_address}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: 'linear-gradient(45deg, #ffcc70, #ffd89b)',
                          color: '#333',
                          fontWeight: '600'
                        }}>{log.user_role}</span>
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                          color: 'white',
                          fontWeight: '600'
                        }}>{log.action_type}</span>
                        <div className="small text-muted mt-1">
                          {log.action_description}
                        </div>
                      </td>
                      <td>
                        {log.resource_type && (
                          <div className="small">
                            <div>{log.resource_type}</div>
                            {log.resource_id && (
                              <div className="text-muted">ID: {log.resource_id}</div>
                            )}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge" style={{
                          background: log.status === 'success' ? 'linear-gradient(45deg, #ffcc70, #ffd89b)' : 
                                   log.status === 'failed' ? 'linear-gradient(45deg, #ff6b6b, #ff9068)' :
                                   'linear-gradient(45deg, #ff9068, #ffcc70)',
                          color: log.status === 'success' ? '#333' : 'white',
                          fontWeight: '600'
                        }}>
                          {log.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn btn-sm"
                          style={{
                            background: 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                            border: 'none',
                            color: 'white',
                            borderRadius: '15px',
                            fontWeight: '600'
                          }}
                          onClick={() => {
                            setSelectedLog(log);
                            setShowModal(true);
                          }}
                          title="View Details"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-5">
              <div className="text-muted mb-3">
                <h5>No audit logs found for the selected criteria</h5>
                <p>Current filters may be too restrictive. Try:</p>
                <ul className="list-unstyled">
                  <li>• Extending the date range</li>
                  <li>• Clearing some filters</li>
                  <li>• Loading all records</li>
                </ul>
              </div>
              <div className="d-flex justify-content-center gap-2">
                <button 
                  className="btn btn-sm"
                  style={{
                    background: 'linear-gradient(45deg, #ff9068, #ffcc70)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '15px',
                    fontWeight: '600'
                  }}
                  onClick={loadAllRecords}
                >
                  Load All Records
                </button>
                <button 
                  className="btn btn-outline-secondary btn-sm"
                  style={{
                    borderRadius: '15px',
                    fontWeight: '600'
                  }}
                  onClick={clearFilters}
                >
                  Clear All Filters
                </button>
              </div>
            </div>
          )}
        </div>
        
        {totalPages > 1 && (
          <div className="card-footer">
            <nav aria-label="Audit logs pagination">
              <ul className="pagination mb-0 justify-content-center">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    style={{
                      background: currentPage === 1 ? '#f8f9fa' : 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                      color: currentPage === 1 ? '#6c757d' : 'white',
                      border: 'none',
                      borderRadius: '15px',
                      fontWeight: '600',
                      margin: '0 2px'
                    }}
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </button>
                </li>
                
                {[...Array(Math.min(5, totalPages))].map((_, index) => {
                  const pageNumber = Math.max(1, currentPage - 2) + index;
                  if (pageNumber > totalPages) return null;
                  
                  return (
                    <li
                      key={pageNumber}
                      className={`page-item ${currentPage === pageNumber ? 'active' : ''}`}
                    >
                      <button
                        className="page-link"
                        style={{
                          background: currentPage === pageNumber ? 'linear-gradient(45deg, #ff6b6b, #ff9068)' : 'white',
                          color: currentPage === pageNumber ? 'white' : '#ff6b6b',
                          border: '1px solid #ff6b6b',
                          borderRadius: '15px',
                          fontWeight: '600',
                          margin: '0 2px'
                        }}
                        onClick={() => setCurrentPage(pageNumber)}
                      >
                        {pageNumber}
                      </button>
                    </li>
                  );
                })}
                
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    style={{
                      background: currentPage === totalPages ? '#f8f9fa' : 'linear-gradient(45deg, #ff6b6b, #ff9068)',
                      color: currentPage === totalPages ? '#6c757d' : 'white',
                      border: 'none',
                      borderRadius: '15px',
                      fontWeight: '600',
                      margin: '0 2px'
                    }}
                    onClick={() => setCurrentPage(currentPage + 1)}
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

      {showModal && renderLogDetail()}
      
      {showModal && (
        <div className="modal-backdrop fade show"></div>
      )}
    </div>
  );
};

export default AuditLogsAdmin;