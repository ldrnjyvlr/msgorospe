// pages/NeuropsychologicalTests.jsx - Updated with Enhanced Mental Status Exam and CFIT
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSearch, FaPrint } from 'react-icons/fa';
import NeuropsychologicalTestForm from '../components/NeuropsychologicalTestForm';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const NeuropsychologicalTests = ({ user, userRole }) => {
  const { showSuccess, showError } = useNotification();
  const [view, setView] = useState('list'); // 'list', 'add', 'view', 'edit'
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredTests, setFilteredTests] = useState([]);
  const [selectedPatientInfo, setSelectedPatientInfo] = useState(null);
  const [patients, setPatients] = useState([]);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);

  useEffect(() => {
    fetchTests();
    fetchPatients();
  }, []);

  useEffect(() => {
    if (tests.length > 0 && searchQuery) {
      const filtered = tests.filter(test => 
        test.patient_name && test.patient_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredTests(filtered);
    } else {
      setFilteredTests(tests);
    }
  }, [tests, searchQuery]);

  const fetchPatients = async () => {
    try {
      setLoadingPatients(true);
      // Fetch all patients
      const { data: allPatients, error: patientError } = await supabase
        .from('personal_info')
        .select('*')
        .order('name');
      if (patientError) throw patientError;
      setPatients(allPatients || []);

      // Fetch all neuropsychological tests
      const { data: tests, error: testError } = await supabase
        .from('neuropsychological_tests')
        .select('patient_id');
      if (testError) throw testError;

      // Get patient IDs that already have a test
      const testedPatientIds = new Set((tests || []).map(t => t.patient_id));

      // Filter patients who do NOT have a test
      const filtered = (allPatients || []).filter(
        p => !testedPatientIds.has(p.id)
      );

      setAvailablePatients(filtered);
    } catch (error) {
      console.error('Error fetching patients:', error);
      setPatients([]);
      setAvailablePatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  const fetchTests = async () => {
    try {
      setLoading(true);
      
      const { data: testsData, error: testsError } = await supabase
        .from('neuropsychological_tests')
        .select('*')
        .order('created_at', { ascending: false });

      if (testsError) throw testsError;

      const testsWithDetails = await Promise.all(
        testsData.map(async (test) => {
          const { data: patientData } = await supabase
            .from('personal_info')
            .select('*')
            .eq('id', test.patient_id)
            .single();

          let psychometricianData = null;
          if (test.psychometrician_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', test.psychometrician_id)
              .single();
            psychometricianData = userData;
          }

          let psychologistData = null;
          if (test.psychologist_id) {
            const { data: userData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', test.psychologist_id)
              .single();
            psychologistData = userData;
          }

          return {
            ...test,
            patient: patientData,
            patient_name: patientData?.name || 'Unknown Patient',
            psychometrician_name: psychometricianData?.full_name || 'Unassigned',
            psychologist_name: psychologistData?.full_name || 'Unassigned'
          };
        })
      );

      setTests(testsWithDetails);
      setFilteredTests(testsWithDetails);
    } catch (error) {
      console.error('Error fetching tests:', error);
      setTests([]);
      setFilteredTests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewChange = (newView, testData = null) => {
    setView(newView);
    if (testData) {
      setSelectedTest(testData);
    } else {
      setSelectedTest(null);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this test record? This action cannot be undone.')) {
      try {
        const { error } = await supabase
          .from('neuropsychological_tests')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Log audit event for test deletion
        await logAuditEvent({
          actionType: AUDIT_ACTIONS.DELETE,
          resourceType: RESOURCE_TYPES.TEST_RESULT,
          resourceId: id,
          description: 'Neuropsychological test record deleted',
          details: {
            test_id: id,
            test_type: 'neuropsychological',
            deleted_by_user: user?.email
          }
        });
        
        fetchTests();
        showSuccess('Test record deleted successfully.');
      } catch (error) {
        console.error('Error deleting test:', error);
        showError('Failed to delete the test. Please try again.');
      }
    }
  };

  const handleEdit = (test) => {
    setSelectedTest(test);
    setSelectedPatientInfo(test.patient);
    setEditingTestId(test.id);
    setView('edit');
  };

  const handleSearchPatient = async () => {
    const patient = patients.find(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    
    if (patient) {
      setSelectedPatientInfo(patient);
    } else {
      alert('No patient found with that name. Please check and try again.');
      setSelectedPatientInfo(null);
    }
  };

  const handleUpdateRemarks = async (testId, remarks) => {
    try {
      const { error } = await supabase
        .from('neuropsychological_tests')
        .update({ remarks })
        .eq('id', testId);
        
      if (error) throw error;
      
      showSuccess('Remarks updated successfully.');
      fetchTests();
    } catch (error) {
      console.error('Error updating remarks:', error);
      showError('Failed to update remarks. Please try again.');
    }
  };

  const handlePrintReport = () => {
    window.print();
  };

  // Helper function to calculate total MMSE score from mental_status_exam
  const calculateMMSETotal = (mentalStatusExam) => {
    if (!mentalStatusExam) return 0;
    
    const scores = [
      parseInt(mentalStatusExam.orientation_score) || 0,
      parseInt(mentalStatusExam.registration_score) || 0,
      parseInt(mentalStatusExam.attention_calculation_score) || 0,
      parseInt(mentalStatusExam.recall_score) || 0,
      parseInt(mentalStatusExam.language_score) || 0,
      parseInt(mentalStatusExam.copying_score) || 0
    ];
    
    return scores.reduce((sum, score) => sum + score, 0);
  };

  if (loading && view === 'list') {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="neuropsychological-tests-container">
      {view === 'list' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Neuropsychological Tests</h2>
            {(userRole === 'psychometrician' || userRole === 'psychologist' || userRole === 'admin') && (
              <button className="btn btn-primary" onClick={() => handleViewChange('add')}>
                <FaPlus className="me-2" /> Add New Test
              </button>
            )}
          </div>
          
          <div className="card mb-4">
            <div className="card-body">
              <div className="input-group mb-3">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search patients by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-outline-secondary" type="button">
                  <FaSearch />
                </button>
              </div>
              
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Patient Name</th>
                      <th>Age</th>
                      <th>Sex</th>
                      <th>Purpose</th>
                      <th>Date Created</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTests.length > 0 ? (
                      filteredTests.map((test) => (
                        <tr key={test.id}>
                          <td>{test.patient_name}</td>
                          <td>{test.patient?.age || 'N/A'}</td>
                          <td>{test.patient?.sex || 'N/A'}</td>
                          <td>{test.patient?.purpose_of_examination || 'N/A'}</td>
                          <td>{new Date(test.created_at).toLocaleDateString()}</td>
                          <td>
                            <div className="d-flex">
                              <button 
                                className="btn btn-sm btn-outline-primary me-2" 
                                onClick={() => handleViewChange('view', test)}
                                title="View"
                              >
                                <FaEye />
                              </button>
                              
                              {(userRole === 'psychometrician' || userRole === 'psychologist' || userRole === 'admin') && (
                                <>
                                  <button 
                                    className="btn btn-sm btn-outline-warning me-2" 
                                    onClick={() => handleEdit(test)}
                                    title="Edit"
                                  >
                                    <FaEdit />
                                  </button>
                                  <button 
                                    className="btn btn-sm btn-outline-danger" 
                                    onClick={() => handleDelete(test.id)}
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
                        <td colSpan="6" className="text-center">
                          No neuropsychological tests found. Add a new test to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
      
      {view === 'add' && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Add Neuropsychological Test</h5>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleViewChange('list')}
            >
              Back to List
            </button>
          </div>
          <div className="card-body">
            <div className="mb-4">
              <label className="form-label">Select Patient:</label>
              <select
                className="form-select"
                value={selectedPatientInfo ? selectedPatientInfo.id : ''}
                onChange={e => {
                  const patient = patients.find(p => p.id === e.target.value);
                  setSelectedPatientInfo(patient || null);
                }}
                disabled={loadingPatients}
              >
                <option value="">-- Select a patient --</option>
                {availablePatients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name} ({patient.age} y/o, {patient.sex})
                  </option>
                ))}
              </select>
            </div>
            {selectedPatientInfo && (
              <NeuropsychologicalTestForm
                patientInfo={selectedPatientInfo}
                userRole={userRole}
                userId={user.id}
                onSuccess={() => {
                  fetchTests();
                  handleViewChange('list');
                }}
              />
            )}
          </div>
        </div>
      )}
      
      {view === 'edit' && selectedTest && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">Edit Neuropsychological Test</h5>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleViewChange('list')}
            >
              Back to List
            </button>
          </div>
          <div className="card-body">
            <NeuropsychologicalTestForm
              patientInfo={selectedPatientInfo}
              userRole={userRole}
              userId={user.id}
              testData={selectedTest}
              testId={editingTestId}
              onSuccess={() => {
                fetchTests();
                handleViewChange('list');
              }}
            />
          </div>
        </div>
      )}
      
      {view === 'view' && selectedTest && (
        <div className="card">
          <div className="card-header d-flex justify-content-between align-items-center bg-primary text-white">
            <h5 className="mb-0">
              Neuropsychological Test Results
            </h5>
            <div>
              <button
                className="btn btn-sm btn-light me-2"
                onClick={() => handleViewChange('list')}
              >
                Back to List
              </button>
              {(userRole === 'psychometrician' || userRole === 'psychologist' || userRole === 'admin') && (
                <button
                  className="btn btn-sm btn-warning me-2"
                  onClick={() => handleEdit(selectedTest)}
                >
                  <FaEdit /> Edit
                </button>
              )}
              <button
                className="btn btn-sm btn-light"
                onClick={handlePrintReport}
              >
                <FaPrint /> Print Report
              </button>
            </div>
          </div>
          <div className="card-body">
            {/* Patient Information */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">Personal Information</h6>
              </div>
              <div className="card-body">
                <table className="table table-bordered">
                  <tbody>
                    <tr>
                      <td><strong>NAME:</strong> {selectedTest.patient?.name}</td>
                      <td><strong>AGE:</strong> {selectedTest.patient?.age}</td>
                      <td><strong>SEX:</strong> {selectedTest.patient?.sex}</td>
                      <td><strong>CIVIL STATUS:</strong> {selectedTest.patient?.civil_status}</td>
                    </tr>
                    <tr>
                      <td colSpan="2"><strong>DATE OF BIRTH:</strong> {selectedTest.patient?.date_of_birth ? new Date(selectedTest.patient.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                      <td colSpan="2"><strong>PLACE OF BIRTH:</strong> {selectedTest.patient?.place_of_birth}</td>
                    </tr>
                    <tr>
                      <td><strong>NATIONALITY:</strong> {selectedTest.patient?.nationality}</td>
                      <td><strong>RELIGION:</strong> {selectedTest.patient?.religion}</td>
                      <td colSpan="2"><strong>OCCUPATION:</strong> {selectedTest.patient?.occupation}</td>
                    </tr>
                    <tr>
                      <td colSpan="4"><strong>ADDRESS:</strong> {selectedTest.patient?.address}</td>
                    </tr>
                    <tr>
                      <td colSpan="4"><strong>EDUCATIONAL ATTAINMENT:</strong> {selectedTest.patient?.educational_attainment}</td>
                    </tr>
                    <tr>
                      <td colSpan="4"><strong>PURPOSE OF EXAMINATION:</strong> {selectedTest.patient?.purpose_of_examination}</td>
                    </tr>
                    <tr>
                      <td colSpan="4"><strong>DATE OF EXAMINATION:</strong> {selectedTest.patient?.date_of_examination ? new Date(selectedTest.patient.date_of_examination).toLocaleDateString() : 'N/A'}</td>
                    </tr>
                    <tr>
                      <td colSpan="4"><strong>AGENCY/AFFILIATION:</strong> {selectedTest.patient?.agency_affiliation}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Observations */}
            {selectedTest.observations && (
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h6 className="mb-0">Observations</h6>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <tbody>
                        <tr>
                          <td width="30%"><strong>APPEARANCE</strong></td>
                          <td>{selectedTest.observations.appearance || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>SPEECH</strong></td>
                          <td>{selectedTest.observations.speech || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>EYE CONTACT</strong></td>
                          <td>{selectedTest.observations.eye_contact || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>MOTOR ACTIVITY</strong></td>
                          <td>{selectedTest.observations.motor_activity || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>AFFECT</strong></td>
                          <td>{selectedTest.observations.affect || 'Not assessed'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Enhanced Mental Status Examination */}
            {selectedTest.mental_status_exam && (
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h6 className="mb-0">Mental Status Examination</h6>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th width="20%">Area</th>
                          <th width="15%">Score</th>
                          <th width="15%">Status</th>
                          <th width="50%">Description</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td><strong>ORIENTATION</strong></td>
                          <td>
                            {selectedTest.mental_status_exam.orientation_score || '0'}/
                            {selectedTest.mental_status_exam.orientation_total || '10'}
                          </td>
                          <td>-</td>
                          <td>{selectedTest.mental_status_exam.orientation_description || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>REGISTRATION</strong></td>
                          <td>
                            {selectedTest.mental_status_exam.registration_score || '0'}/
                            {selectedTest.mental_status_exam.registration_total || '3'}
                          </td>
                          <td>-</td>
                          <td>{selectedTest.mental_status_exam.registration_description || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>ATTENTION AND CALCULATION</strong></td>
                          <td>
                            {selectedTest.mental_status_exam.attention_calculation_score || '0'}/
                            {selectedTest.mental_status_exam.attention_calculation_total || '5'}
                          </td>
                          <td>-</td>
                          <td>{selectedTest.mental_status_exam.attention_calculation_description || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>RECALL</strong></td>
                          <td>
                            {selectedTest.mental_status_exam.recall_score || '0'}/
                            {selectedTest.mental_status_exam.recall_total || '3'}
                          </td>
                          <td>-</td>
                          <td>{selectedTest.mental_status_exam.recall_description || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>LANGUAGE</strong></td>
                          <td>
                            {selectedTest.mental_status_exam.language_score || '0'}/
                            {selectedTest.mental_status_exam.language_total || '9'}
                          </td>
                          <td>-</td>
                          <td>{selectedTest.mental_status_exam.language_description || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>COPYING</strong></td>
                          <td>
                            {selectedTest.mental_status_exam.copying_score || '0'}/
                            {selectedTest.mental_status_exam.copying_total || '1'}
                          </td>
                          <td>-</td>
                          <td>{selectedTest.mental_status_exam.copying_description || 'Not assessed'}</td>
                        </tr>
                        <tr>
                          <td><strong>MEMORY</strong></td>
                          <td>-</td>
                          <td>
                            <span className={`badge ${
                              selectedTest.mental_status_exam.memory_was === 'was' 
                                ? 'bg-success' 
                                : 'bg-warning'
                            }`}>
                              {selectedTest.mental_status_exam.memory_was || 'Not assessed'}
                            </span>
                          </td>
                          <td>Memory {selectedTest.mental_status_exam.memory_was || 'not'} assessed appropriately</td>
                        </tr>
                        <tr>
                          <td><strong>CONCENTRATION</strong></td>
                          <td>-</td>
                          <td>
                            <span className={`badge ${
                              selectedTest.mental_status_exam.concentration_was === 'was' 
                                ? 'bg-success' 
                                : 'bg-warning'
                            }`}>
                              {selectedTest.mental_status_exam.concentration_was || 'Not assessed'}
                            </span>
                          </td>
                          <td>Concentration {selectedTest.mental_status_exam.concentration_was || 'not'} adequate</td>
                        </tr>
                        <tr>
                          <td><strong>ABSTRACT THINKING</strong></td>
                          <td>-</td>
                          <td>
                            <span className={`badge ${
                              selectedTest.mental_status_exam.abstract_thinking_was === 'was' 
                                ? 'bg-success' 
                                : 'bg-warning'
                            }`}>
                              {selectedTest.mental_status_exam.abstract_thinking_was || 'Not assessed'}
                            </span>
                          </td>
                          <td>Abstract thinking {selectedTest.mental_status_exam.abstract_thinking_was || 'not'} demonstrated</td>
                        </tr>
                        <tr>
                          <td><strong>THOUGHT PROCESS</strong></td>
                          <td>-</td>
                          <td>
                            <span className={`badge ${
                              selectedTest.mental_status_exam.thought_process_was === 'was' 
                                ? 'bg-success' 
                                : 'bg-warning'
                            }`}>
                              {selectedTest.mental_status_exam.thought_process_was || 'Not assessed'}
                            </span>
                          </td>
                          <td>Thought process {selectedTest.mental_status_exam.thought_process_was || 'not'} organized</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="alert alert-info mt-3">
                    <strong>Total MMSE Score: </strong>
                    {calculateMMSETotal(selectedTest.mental_status_exam)}/31
                    <div>
                      <small>
                        Interpretation: 
                        {(() => {
                          const total = calculateMMSETotal(selectedTest.mental_status_exam);
                          if (total >= 24) return " Normal cognitive function (24-31)";
                          if (total >= 19) return " Mild cognitive impairment (19-23)";
                          if (total >= 10) return " Moderate cognitive impairment (10-18)";
                          return " Severe cognitive impairment (0-9)";
                        })()}
                      </small>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* MMSE Results (Legacy Support) */}
            {selectedTest.mmse_results && (
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h6 className="mb-0">Mini-Mental State Examination (MMSE) - Legacy</h6>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Category</th>
                          <th>Score</th>
                          <th>Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Orientation</td>
                          <td>{selectedTest.mmse_results?.orientation || "N/A"}</td>
                          <td>
                            {parseInt(selectedTest.mmse_results?.orientation) >= 8 
                              ? "Good orientation to time and place" 
                              : "Disorientation present"}
                          </td>
                        </tr>
                        <tr>
                          <td>Registration</td>
                          <td>{selectedTest.mmse_results?.registration || "N/A"}</td>
                          <td>
                            {parseInt(selectedTest.mmse_results?.registration) >= 2 
                              ? "Adequate registration abilities" 
                              : "Impaired registration"}
                          </td>
                        </tr>
                        <tr>
                          <td>Attention & Calculation</td>
                          <td>{selectedTest.mmse_results?.attention_calculation || "N/A"}</td>
                          <td>
                            {parseInt(selectedTest.mmse_results?.attention_calculation) >= 4 
                              ? "Good concentration and calculation" 
                              : "Difficulty with concentration/calculation"}
                          </td>
                        </tr>
                        <tr>
                          <td>Recall</td>
                          <td>{selectedTest.mmse_results?.recall || "N/A"}</td>
                          <td>
                            {parseInt(selectedTest.mmse_results?.recall) >= 2 
                              ? "Intact short-term recall" 
                              : "Impaired recall abilities"}
                          </td>
                        </tr>
                        <tr>
                          <td>Language</td>
                          <td>{selectedTest.mmse_results?.language || "N/A"}</td>
                          <td>
                            {parseInt(selectedTest.mmse_results?.language) >= 7 
                              ? "Language functions intact" 
                              : "Language impairment present"}
                          </td>
                        </tr>
                        <tr>
                          <td>Copying</td>
                          <td>{selectedTest.mmse_results?.copying || "N/A"}</td>
                          <td>
                            {parseInt(selectedTest.mmse_results?.copying) >= 1 
                              ? "Adequate visuospatial skills" 
                              : "Impaired visuospatial abilities"}
                          </td>
                        </tr>
                        <tr className="table-info">
                          <td><strong>Total Score</strong></td>
                          <td>
                            <strong>
                              {selectedTest.mmse_results 
                                ? Object.values(selectedTest.mmse_results).reduce((sum, val) => sum + (parseInt(val) || 0), 0) 
                                : "N/A"}/30
                            </strong>
                          </td>
                          <td>
                            <strong>
                              {selectedTest.mmse_results &&
                                (() => {
                                  const total = Object.values(selectedTest.mmse_results).reduce(
                                    (sum, val) => sum + (parseInt(val) || 0), 0
                                  );
                                  if (total >= 24) return "Normal cognitive function";
                                  if (total >= 19) return "Mild cognitive impairment";
                                  if (total >= 10) return "Moderate cognitive impairment";
                                  return "Severe cognitive impairment";
                                })()
                              }
                            </strong>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
            {/* CFIT Results - Updated with reordered fields */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">Culture Fair Intelligence Test (CFIT)</h6>
              </div>
              <div className="card-body">
                {selectedTest.cfit_results ? (
                  <>
                    <div className="table-responsive">
                      <table className="table table-bordered">
                        <thead>
                          <tr>
                            <th>Score Type</th>
                            <th>Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td>Raw Score</td>
                            <td>{selectedTest.cfit_results?.raw_score || "N/A"}</td>
                          </tr>
                          <tr>
                            <td>IQ Equivalent</td>
                            <td>{selectedTest.cfit_results?.iq_equivalent || "N/A"}</td>
                          </tr>
                          <tr>
                            <td>Percentile</td>
                            <td>{selectedTest.cfit_results?.percentile || "N/A"}</td>
                          </tr>
                          <tr>
                            <td>Mental Classification</td>
                            <td>
                              {selectedTest.cfit_results?.iq_equivalent && (() => {
                                const iq = parseInt(selectedTest.cfit_results.iq_equivalent);
                                if (iq >= 130) return "Very Superior";
                                if (iq >= 120) return "Superior";
                                if (iq >= 110) return "High Average";
                                if (iq >= 90) return "Average";
                                if (iq >= 80) return "Low Average";
                                if (iq >= 70) return "Borderline";
                                return "Extremely Low";
                              })()}
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    {selectedTest.cfit_results?.interpretation && (
                      <div className="mt-3">
                        <h6>Interpretation</h6>
                        <p className="border rounded p-3">{selectedTest.cfit_results.interpretation}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-muted">No CFIT results available.</p>
                )}
              </div>
            </div>
            
            {/* BPI Results */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">Basic Personality Inventory (BPI)</h6>
              </div>
              <div className="card-body">
                {selectedTest.bpi_results ? (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Scale</th>
                          <th>Score</th>
                          <th>Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedTest.bpi_results).map(([key, value]) => {
                          const formattedKey = key.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ');
                          
                          return (
                            <tr key={key}>
                              <td>{formattedKey}</td>
                              <td>
                                <span className={`badge ${
                                  value === 'high' ? 'bg-warning' : 'bg-success'
                                }`}>
                                  {value}
                                </span>
                              </td>
                              <td>
                                {value === 'high' ? 'Above normal range' : 'Within normal range'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">No BPI results available.</p>
                )}
              </div>
            </div>
            
            {/* WSS Results */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">Workplace Skills Survey (WSS)</h6>
              </div>
              <div className="card-body">
                {selectedTest.wss_results ? (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Skill Area</th>
                          <th>Rating</th>
                          <th>Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedTest.wss_results).map(([key, value]) => {
                          if (key === 'summary') return null;
                          
                          const formattedKey = key.split('_').map(word => 
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' ');
                          
                          let interpretation = "";
                          if (value === 'Excellent' || value === 'Above Average') {
                            interpretation = "Strong competency";
                          } else if (value === 'Average') {
                            interpretation = "Adequate skill level";
                          } else if (value === 'Below Average' || value === 'Poor') {
                            interpretation = "Needs improvement";
                          }
                          
                          return (
                            <tr key={key}>
                              <td>{formattedKey}</td>
                              <td>
                                <span className={`badge ${
                                  value === 'Excellent' || value === 'Above Average' ? 'bg-success' : 
                                  value === 'Average' ? 'bg-primary' : 
                                  'bg-warning'
                                }`}>
                                  {value}
                                </span>
                              </td>
                              <td>{interpretation}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted">No WSS results available.</p>
                )}
              </div>
            </div>
            
            {/* Professional Remarks */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">Professional Remarks</h6>
              </div>
              <div className="card-body">
                <div className="border rounded p-3 mb-3">
                  {selectedTest.remarks || "No remarks provided yet."}
                </div>
                
                {(userRole === 'psychologist' || userRole === 'admin') && (
                  <div>
                    <textarea 
                      className="form-control mb-2"
                      rows="4"
                      placeholder="Add or update professional remarks..."
                      defaultValue={selectedTest.remarks}
                      id="remarksInput"
                    ></textarea>
                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        const newRemarks = document.getElementById('remarksInput').value;
                        handleUpdateRemarks(selectedTest.id, newRemarks);
                      }}
                    >
                      Update Remarks
                    </button>
                  </div>
                )}
              </div>
            </div>
            
            {/* Test Information */}
            <div className="card">
              <div className="card-header bg-light">
                <h6 className="mb-0">Test Information</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Date Created:</strong> {new Date(selectedTest.created_at).toLocaleString()}</p>
                    <p><strong>Psychometrician:</strong> {selectedTest.psychometrician_name}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Last Updated:</strong> {new Date(selectedTest.updated_at).toLocaleString()}</p>
                    <p><strong>Psychologist:</strong> {selectedTest.psychologist_name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default NeuropsychologicalTests;