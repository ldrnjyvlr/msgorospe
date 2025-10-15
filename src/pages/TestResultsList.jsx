// pages/TestResultsList.jsx - List of test results for psychologists to review
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { FaEye, FaComment, FaFilter, FaSearch } from 'react-icons/fa';

const TestResultsList = ({ userRole, user }) => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, pending, reviewed
  const [testTypeFilter, setTestTypeFilter] = useState('all'); // all, psychological, neuropsychological, neuropsychiatric
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    fetchTestResults();
  }, [filter, testTypeFilter, searchTerm, currentPage]);

  const fetchTestResults = async () => {
    try {
      setLoading(true);
      
      // Fetch from all three test tables
      const testTypes = [
        { type: 'psychological', table: 'psychological_tests' },
        { type: 'neuropsychological', table: 'neuropsychological_tests' },
        { type: 'neuropsychiatric', table: 'neuropsychiatric_tests' }
      ];

      let allResults = [];

      for (const testType of testTypes) {
        if (testTypeFilter !== 'all' && testTypeFilter !== testType.type) {
          continue;
        }

        let query = supabase
          .from(testType.table)
          .select(`
            id,
            patient_id,
            remarks,
            created_at,
            updated_at,
            psychometrician:psychometrician_id(full_name),
            psychologist:psychologist_id(full_name),
            patient_info:patient_id(name, age, sex, date_of_examination, purpose_of_examination)
          `);

        // Apply filters
        if (filter === 'pending') {
          query = query.is('psychologist_id', null);
        } else if (filter === 'reviewed') {
          query = query.not('psychologist_id', 'is', null);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) throw error;

        // Add test type to each result
        const resultsWithType = data.map(result => ({
          ...result,
          test_type: testType.type
        }));

        allResults = [...allResults, ...resultsWithType];
      }

      // Apply search filter
      if (searchTerm) {
        allResults = allResults.filter(result => 
          result.patient_info?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          result.patient_info?.purpose_of_examination?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Sort by created_at
      allResults.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

      // Pagination
      const startIndex = (currentPage - 1) * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedResults = allResults.slice(startIndex, endIndex);

      setTestResults(paginatedResults);
      setTotalCount(allResults.length);
    } catch (error) {
      console.error('Error fetching test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalPages = Math.ceil(totalCount / itemsPerPage);

  const getStatusBadge = (result) => {
    if (result.psychologist) {
      return <span className="badge bg-success">Reviewed</span>;
    }
    return <span className="badge bg-warning text-dark">Pending Review</span>;
  };

  const getTestTypeBadge = (testType) => {
    const colors = {
      psychological: 'primary',
      neuropsychological: 'info',
      neuropsychiatric: 'secondary'
    };
    return <span className={`badge bg-${colors[testType]}`}>{testType.charAt(0).toUpperCase() + testType.slice(1)}</span>;
  };

  return (
    <div className="test-results-list">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Test Results for Review</h2>
        <div className="text-muted">
          Total: {totalCount} results
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">Status Filter</label>
              <select 
                className="form-select" 
                value={filter} 
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">All Tests</option>
                <option value="pending">Pending Review</option>
                <option value="reviewed">Reviewed</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">Test Type Filter</label>
              <select 
                className="form-select" 
                value={testTypeFilter} 
                onChange={(e) => setTestTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="psychological">Psychological</option>
                <option value="neuropsychological">Neuropsychological</option>
                <option value="neuropsychiatric">Neuropsychiatric</option>
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Search</label>
              <div className="input-group">
                <span className="input-group-text">
                  <FaSearch />
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by patient name or purpose..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="card">
        <div className="card-body p-0">
          {loading ? (
            <div className="d-flex justify-content-center align-items-center p-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : testResults.length === 0 ? (
            <div className="text-center p-5">
              <p className="text-muted">No test results found.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Patient</th>
                    <th>Test Type</th>
                    <th>Test Date</th>
                    <th>Purpose</th>
                    <th>Psychometrician</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {testResults.map((result) => (
                    <tr key={`${result.test_type}-${result.id}`}>
                      <td>
                        <div>
                          <strong>{result.patient_info?.name || 'Unknown'}</strong>
                          <br />
                          <small className="text-muted">
                            {result.patient_info?.age} years, {result.patient_info?.sex}
                          </small>
                        </div>
                      </td>
                      <td>{getTestTypeBadge(result.test_type)}</td>
                      <td>{new Date(result.patient_info?.date_of_examination || result.created_at).toLocaleDateString()}</td>
                      <td>{result.patient_info?.purpose_of_examination || 'Not specified'}</td>
                      <td>{result.psychometrician?.full_name || 'Not specified'}</td>
                      <td>{getStatusBadge(result)}</td>
                      <td>
                        <div className="btn-group btn-group-sm" role="group">
                          <Link
                            to={`/test-results/${result.test_type}/${result.id}`}
                            className="btn btn-outline-primary"
                            title="View and Add Remarks"
                          >
                            <FaEye className="me-1" />
                            Review
                          </Link>
                          {result.remarks && (
                            <button className="btn btn-outline-info" title="Has remarks">
                              <FaComment />
                            </button>
                          )}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav aria-label="Page navigation">
            <ul className="pagination">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
              </li>
              
              {[...Array(totalPages)].map((_, index) => (
                <li key={index + 1} className={`page-item ${currentPage === index + 1 ? 'active' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setCurrentPage(index + 1)}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
              
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
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
  );
};

export default TestResultsList;