// pages/NeuropsychiatricTests.jsx - Updated to Handle Enhanced Mental Status Exam
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSearch, FaPrint } from 'react-icons/fa';
import NeuropsychiatricTestForm from '../components/NeuropsychiatricTestForm';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const NeuropsychiatricTests = ({ user, userRole }) => {
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

      // Fetch all neuropsychiatric tests
      const { data: tests, error: testError } = await supabase
        .from('neuropsychiatric_tests')
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
        .from('neuropsychiatric_tests')
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

          let psychologistData = null;
          if (test.psychologist_id) {
            const { data: psychData } = await supabase
              .from('users')
              .select('full_name')
              .eq('id', test.psychologist_id)
              .single();
            psychologistData = psychData;
          }

          return {
            ...test,
            patient: patientData,
            patient_name: patientData?.name || 'Unknown Patient',
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
          .from('neuropsychiatric_tests')
          .delete()
          .eq('id', id);
          
        if (error) throw error;
        
        // Log audit event for test deletion
        await logAuditEvent({
          actionType: AUDIT_ACTIONS.DELETE,
          resourceType: RESOURCE_TYPES.TEST_RESULT,
          resourceId: id,
          description: 'Neuropsychiatric test record deleted',
          details: {
            test_id: id,
            test_type: 'neuropsychiatric',
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

  const handleSearchPatientForAdd = () => {
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
        .from('neuropsychiatric_tests')
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
    <div className="neuropsychiatric-tests-container">
      {view === 'list' && (
        <>
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="mb-0">Neuropsychiatric Tests</h2>
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
                          No neuropsychiatric tests found. Add a new test to get started.
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
            <h5 className="mb-0">Add Neuropsychiatric Test</h5>
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
                  const patient = availablePatients.find(p => p.id === e.target.value);
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
              <NeuropsychiatricTestForm
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
            <h5 className="mb-0">Edit Neuropsychiatric Test</h5>
            <button
              className="btn btn-sm btn-secondary"
              onClick={() => handleViewChange('list')}
            >
              Back to List
            </button>
          </div>
          <div className="card-body">
            <NeuropsychiatricTestForm
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
          <div className="card-header d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              Neuropsychiatric Test Results
            </h5>
            <div>
              <button
                className="btn btn-sm btn-secondary me-2"
                onClick={() => handleViewChange('list')}
              >
                Back to List
              </button>
              {(userRole === 'psychometrician' || userRole === 'psychologist' || userRole === 'admin') && (
                <button
                  className="btn btn-sm btn-outline-warning me-2"
                  onClick={() => handleEdit(selectedTest)}
                >
                  <FaEdit /> Edit
                </button>
              )}
              <button
                className="btn btn-sm btn-primary"
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
            
            {/* Brief Personal History */}
            {selectedTest.brief_personal_history && (
              <div className="card mb-4">
                <div className="card-header bg-light">
                  <h6 className="mb-0">Brief Personal History</h6>
                </div>
                <div className="card-body">
                  <p className="mb-0" style={{ whiteSpace: 'pre-line' }}>
                    {selectedTest.brief_personal_history}
                  </p>
                </div>
              </div>
            )}
            
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
            
            {/* Enhanced Mental Status Examination Display */}
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
            
            {/* Clinical Assessment */}
            <div className="card mb-4">
              <div className="card-header bg-light">
                <h6 className="mb-0">Clinical Assessment</h6>
              </div>
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <h6 className="text-primary">Psychological/Psychiatric History</h6>
                    <div className="border rounded p-3">
                      {selectedTest.psychological_history || "No history provided."}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h6 className="text-primary">Medical History</h6>
                    <div className="border rounded p-3">
                      {selectedTest.medical_history ? (
                        <ul className="list-unstyled mb-0">
                          {Object.entries(selectedTest.medical_history).map(([condition, present]) => {
                            const label = condition
                              .split('_')
                              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                              .join(' ');
                            return present === 'yes' ? (
                              <li key={condition}>
                                <span className="badge bg-info text-dark me-2">✓</span> {label}
                              </li>
                            ) : null;
                          })}
                          {Object.values(selectedTest.medical_history).every(val => val === 'no') && "None reported."}
                        </ul>
                      ) : "No medical history provided."}
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <h6 className="text-primary">Psychological Symptoms</h6>
                    <div className="border rounded p-3">
                      {selectedTest.psychological_symptoms || "No symptoms reported."}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h6 className="text-primary">Risk Assessment</h6>
                    <div className="border rounded p-3">
                      {selectedTest.risk_assessment || "No risk assessment provided."}
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <h6 className="text-primary">Substance Dependency</h6>
                    <div className="border rounded p-3">
                      {selectedTest.substance_dependency || "No substance dependency reported."}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h6 className="text-primary">Stressful Events</h6>
                    <div className="border rounded p-3">
                      {selectedTest.stressful_events || "No stressful events reported."}
                    </div>
                  </div>
                </div>
                
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <h6 className="text-primary">Insight</h6>
                    <div className="border rounded p-3">
                      <span className={`badge ${
                        selectedTest.insight === 'Good' ? 'bg-success' : 
                        selectedTest.insight === 'Fair' ? 'bg-warning' : 
                        'bg-danger'
                      }`}>
                        {selectedTest.insight || "Not assessed"}
                      </span>
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h6 className="text-primary">Judgment</h6>
                    <div className="border rounded p-3">
                      <span className={`badge ${
                        selectedTest.judgment === 'Good' ? 'bg-success' : 
                        selectedTest.judgment === 'Fair' ? 'bg-warning' : 
                        'bg-danger'
                      }`}>
                        {selectedTest.judgment || "Not assessed"}
                      </span>
                    </div>
                  </div>
                </div>
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
                
                {(userRole === 'psychologist' || userRole === 'psychologist' || userRole === 'admin') && (
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
                    <p><strong>Last Updated:</strong> {new Date(selectedTest.updated_at).toLocaleString()}</p>
                  </div>
                  <div className="col-md-6">
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

export default NeuropsychiatricTests;