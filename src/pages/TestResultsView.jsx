// pages/TestResultsView.jsx - Fixed version with simplified queries
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import { FaEdit, FaSave, FaTimes, FaFileAlt, FaUser } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const TestResultsView = ({ userRole, user }) => {
  const { testType, testId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [psychometrician, setPsychometrician] = useState(null);
  const [psychologist, setPsychologist] = useState(null);
  const [isEditingRemarks, setIsEditingRemarks] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [interpretation, setInterpretation] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  
  // Access control: only psychologists can add remarks
  const canAddRemarks = userRole === 'psychologist';

  useEffect(() => {
    fetchTestData();
  }, [testId, testType]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching test data for:', testType, testId);
      
      let tableName;
      switch (testType) {
        case 'psychological':
          tableName = 'psychological_tests';
          break;
        case 'neuropsychological':
          tableName = 'neuropsychological_tests';
          break;
        case 'neuropsychiatric':
          tableName = 'neuropsychiatric_tests';
          break;
        default:
          throw new Error('Invalid test type');
      }

      // First, get the test data
      const { data: test, error: testError } = await supabase
        .from(tableName)
        .select('*')
        .eq('id', testId)
        .single();

      if (testError) {
        console.error('Error fetching test:', testError);
        throw testError;
      }

      if (!test) {
        throw new Error('Test not found');
      }

      console.log('Test data:', test);
      console.log('Personality interpretations in test data:', test.personality_interpretations);
      console.log('Personality interpretation (singular) in test data:', test.personality_interpretation);
      setTestData(test);
      setRemarks(test.remarks || '');
      
      // For psychological tests, also get interpretation
      if (testType === 'psychological') {
        setInterpretation(test.cfit_interpretation || '');
      }

      // Fetch patient information if patient_id exists
      if (test.patient_id) {
        const { data: patient, error: patientError } = await supabase
          .from('personal_info')
          .select('*')
          .eq('id', test.patient_id)
          .single();

        if (!patientError && patient) {
          console.log('Patient info:', patient);
          setPatientInfo(patient);
        }
      }

      // Fetch psychometrician info if psychometrician_id exists
      if (test.psychometrician_id) {
        const { data: psychometricianData, error: psychometricianError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', test.psychometrician_id)
          .single();

        if (!psychometricianError && psychometricianData) {
          console.log('Psychometrician:', psychometricianData);
          setPsychometrician(psychometricianData);
        }
      }

      // Fetch psychologist info if psychologist_id exists
      if (test.psychologist_id) {
        const { data: psychologistData, error: psychologistError } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', test.psychologist_id)
          .single();

        if (!psychologistError && psychologistData) {
          console.log('Psychologist:', psychologistData);
          setPsychologist(psychologistData);
        }
      }


    } catch (error) {
      console.error('Error in fetchTestData:', error);
      setError(error.message || 'Failed to load test data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRemarks = async () => {
    try {
      setSaving(true);
      setError(null);
      
      let tableName;
      const updates = {
        remarks: remarks,
        updated_at: new Date().toISOString()
      };

      // Add psychologist ID to the update if not already set
      if (userRole === 'psychologist' && testType === 'psychological' && !testData.psychologist_id) {
        updates.psychologist_id = user.id;
      }

      // For psychological tests, also save interpretation if provided
      if (testType === 'psychological' && interpretation !== null) {
        updates.cfit_interpretation = interpretation;
      }

      // Determine table name
      switch (testType) {
        case 'psychological':
          tableName = 'psychological_tests';
          break;
        case 'neuropsychological':
          tableName = 'neuropsychological_tests';
          break;
        case 'neuropsychiatric':
          tableName = 'neuropsychiatric_tests';
          break;
        default:
          throw new Error('Invalid test type');
      }

      console.log('Saving to table:', tableName, 'Updates:', updates);

      const { error } = await supabase
        .from(tableName)
        .update(updates)
        .eq('id', testId);

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      // Log audit event for test result update
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.UPDATE,
        resourceType: RESOURCE_TYPES.TEST_RESULT,
        resourceId: testId,
        description: `${testType} test result updated`,
        details: {
          test_id: testId,
          test_type: testType,
          updated_fields: Object.keys(updates),
          patient_id: testData?.patient_id,
          updated_by: user.email,
          user_role: userRole,
          psychologist_id: updates.psychologist_id || testData?.psychologist_id
        }
      });

      // Refresh data
      await fetchTestData();
      setIsEditingRemarks(false);
      showSuccess('Remarks saved successfully!');
    } catch (error) {
      console.error('Error saving remarks:', error);
      showError(error.message || 'Failed to save remarks. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Helper functions for psychological test display
  const getPersonalityFactors = () => {
    if (!testData || !testData.personality_factors) return {};
    
    if (typeof testData.personality_factors === 'string') {
      try {
        return JSON.parse(testData.personality_factors);
      } catch (e) {
        console.error('Failed to parse personality_factors:', e);
        return {};
      }
    }
    
    return testData.personality_factors;
  };

  const getPersonalityInterpretations = () => {
    // Strictly use interpretations generated and saved by the form
    const interpretationsData = testData?.personality_interpretations;

    if (!testData || !interpretationsData) {
      console.log('No personality interpretations found');
      return {};
    }

    if (typeof interpretationsData === 'string') {
      try {
        const parsed = JSON.parse(interpretationsData);
        console.log('Parsed personality interpretations:', parsed);
        return parsed;
      } catch (e) {
        console.error('Failed to parse personality interpretations:', e);
        return {};
      }
    }

    console.log('Personality interpretations (object):', interpretationsData);
    return interpretationsData;
  };

  const getWorkplaceSkills = () => {
    if (!testData || !testData.workplace_skills) return {};
    
    if (typeof testData.workplace_skills === 'string') {
      try {
        return JSON.parse(testData.workplace_skills);
      } catch (e) {
        console.error('Failed to parse workplace_skills:', e);
        return {};
      }
    }
    
    return testData.workplace_skills;
  };

  const getIQClassification = (iq) => {
    if (!iq) return 'Not determined';
    if (iq >= 130) return 'Very Superior';
    if (iq >= 120) return 'Superior';
    if (iq >= 110) return 'High Average';
    if (iq >= 90) return 'Average';
    if (iq >= 80) return 'Low Average';
    if (iq >= 70) return 'Borderline';
    return 'Below Average';
  };

  const getSkillBadgeClass = (rating) => {
    switch (rating) {
      case 'above_average':
        return 'badge-success';
      case 'below_average':
        return 'badge-danger';
      default:
        return 'badge-warning';
    }
  };

  const getSkillLabel = (rating) => {
    switch (rating) {
      case 'above_average':
        return 'Above Average';
      case 'below_average':
        return 'Below Average';
      default:
        return 'Average';
    }
  };

  const renderTestResults = () => {
    if (!testData) return null;

    switch (testType) {
      case 'psychological':
        const personalityFactors = getPersonalityFactors();
        const personalityInterpretations = getPersonalityInterpretations();
        const workplaceSkills = getWorkplaceSkills();

        return (
          <div className="test-results">
            {/* CFIT Results */}
            <div className="mb-4">
              <h5 className="text-primary mb-3">
                <i className="fas fa-brain me-2"></i>
                Culture Fair Intelligence Test (CFIT) Results
              </h5>
              <div className="row mb-3">
                <div className="col-md-3">
                  <div className="metric-card">
                    <div className="metric-value">{testData.cfit_raw_score || 'N/A'}</div>
                    <div className="metric-label">Raw Score</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="metric-card">
                    <div className="metric-value">{testData.cfit_percentile || 'N/A'}</div>
                    <div className="metric-label">Percentile</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="metric-card">
                    <div className="metric-value">{testData.cfit_iq_equivalent || 'N/A'}</div>
                    <div className="metric-label">IQ Equivalent</div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="metric-card">
                    <div className="metric-value">{getIQClassification(testData.cfit_iq_equivalent)}</div>
                    <div className="metric-label">Classification</div>
                  </div>
                </div>
              </div>
              
              <div className="interpretation-section">
                <h6>Professional Interpretation:</h6>
                {isEditingRemarks && userRole === 'psychologist' ? (
                  <textarea
                    className="form-control"
                    rows="4"
                    value={interpretation}
                    onChange={(e) => setInterpretation(e.target.value)}
                    placeholder="Enter CFIT interpretation..."
                  />
                ) : (
                  <div className="interpretation-box">
                    {testData.cfit_interpretation || 'No interpretation available.'}
                  </div>
                )}
              </div>
            </div>

            {/* Personality Factors */}
            {Object.keys(personalityFactors).length > 0 && (
              <div className="mb-4">
                <h5 className="text-success mb-3">
                  <i className="fas fa-chart-bar me-2"></i>
                  16 Personality Factors (16PF) Assessment
                </h5>
                
                {/* Debug info - remove in production */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="alert alert-info">
                    <strong>Debug Info:</strong>
                    <br />Personality Factors: {Object.keys(personalityFactors).length} factors
                    <br />Personality Interpretations: {Object.keys(personalityInterpretations).length} interpretations
                    <br />Available interpretations: {Object.keys(personalityInterpretations).join(', ')}
                    <br />Test data keys: {Object.keys(testData || {}).join(', ')}
                    <br />Raw personality_interpretations: {typeof testData?.personality_interpretations}
                    <br />Raw personality_interpretation: {typeof testData?.personality_interpretation}
                  </div>
                )}
                
                <div className="row">
                  {Object.entries(personalityFactors).map(([key, value]) => {
                    const factorLabels = {
                      warmth: 'A (Warmth)',
                      reasoning: 'B (Reasoning)',
                      emotionalStability: 'C (Emotional Stability)',
                      dominance: 'E (Dominance)',
                      liveliness: 'F (Liveliness)',
                      ruleConsciousness: 'G (Rule-Consciousness)',
                      socialBoldness: 'H (Social Boldness)',
                      sensitivity: 'I (Sensitivity)',
                      vigilance: 'L (Vigilance)',
                      abstractedness: 'M (Abstractedness)',
                      privateness: 'N (Privateness)',
                      apprehension: 'O (Apprehension)',
                      opennessToChange: 'Q1 (Openness to Change)',
                      selfReliance: 'Q2 (Self-Reliance)',
                      perfectionism: 'Q3 (Perfectionism)',
                      tension: 'Q4 (Tension)'
                    };
                    
                    const score = parseInt(value);
                    const percentage = (score / 10) * 100;
                    
                    return (
                      <div key={key} className="col-md-6 mb-3">
                        <div className="personality-factor-item">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="factor-name">{factorLabels[key] || key}</span>
                            <span className="factor-score">{score}/10</span>
                          </div>
                          <div className="progress mb-2">
                            <div 
                              className={`progress-bar ${
                                percentage >= 70 ? 'bg-success' : 
                                percentage >= 40 ? 'bg-warning' : 'bg-danger'
                              }`} 
                              role="progressbar" 
                              style={{ width: `${percentage}%` }}
                            ></div>
                          </div>
                          {(personalityInterpretations[key] && personalityInterpretations[key].trim()) ? (
                            <div className="factor-interpretation">
                              <small className="text-muted">{personalityInterpretations[key]}</small>
                            </div>
                          ) : (
                            <div className="factor-interpretation">
                              <small className="text-muted">No interpretation available for this factor.</small>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Workplace Skills */}
            {Object.keys(workplaceSkills).length > 0 && (
              <div className="mb-4">
                <h5 className="text-warning mb-3">
                  <i className="fas fa-briefcase me-2"></i>
                  Workplace Skills Survey (WSS) Assessment
                </h5>
                <div className="row">
                  {Object.entries(workplaceSkills)
                    .filter(([key]) => key !== 'summary')
                    .map(([key, value]) => {
                      const skillLabels = {
                        communication: 'Communication',
                        adaptingToChange: 'Adapting to Change',
                        problemSolving: 'Problem Solving',
                        workEthics: 'Work Ethics',
                        technologicalLiteracy: 'Technological Literacy',
                        teamwork: 'Teamwork'
                      };
                      
                      return (
                        <div key={key} className="col-md-4 mb-3">
                          <div className="skill-item">
                            <div className="skill-name">{skillLabels[key] || key}</div>
                            <span className={`badge ${getSkillBadgeClass(value)}`}>
                              {getSkillLabel(value)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
                
                {workplaceSkills.summary && (
                  <div className="mt-4">
                    <h6>Workplace Skills Summary:</h6>
                    <div className="interpretation-box">
                      {workplaceSkills.summary}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'neuropsychological':
        return (
          <div className="test-results">
            {testData.mmse_results && (
              <div className="mb-4">
                <h6>MMSE Results</h6>
                <pre className="bg-light p-3 rounded">
                  {JSON.stringify(testData.mmse_results, null, 2)}
                </pre>
              </div>
            )}
            {testData.cfit_results && (
              <div className="mb-4">
                <h6>CFIT Results</h6>
                <pre className="bg-light p-3 rounded">
                  {JSON.stringify(testData.cfit_results, null, 2)}
                </pre>
              </div>
            )}
            {testData.bpi_results && (
              <div className="mb-4">
                <h6>BPI Results</h6>
                <pre className="bg-light p-3 rounded">
                  {JSON.stringify(testData.bpi_results, null, 2)}
                </pre>
              </div>
            )}
            {testData.wss_results && (
              <div className="mb-4">
                <h6>WSS Results</h6>
                <pre className="bg-light p-3 rounded">
                  {JSON.stringify(testData.wss_results, null, 2)}
                </pre>
              </div>
            )}
          </div>
        );

      case 'neuropsychiatric':
        return (
          <div className="test-results">
            {testData.mental_status_exam && (
              <div className="mb-3">
                <h6>Mental Status Exam</h6>
                <pre className="bg-light p-3 rounded">
                  {typeof testData.mental_status_exam === 'object'
                    ? JSON.stringify(testData.mental_status_exam, null, 2)
                    : testData.mental_status_exam}
                </pre>
              </div>
            )}
            {testData.psychological_history && (
              <div className="mb-3">
                <h6>Psychological History</h6>
                <p>{testData.psychological_history}</p>
              </div>
            )}
            {testData.psychological_symptoms && (
              <div className="mb-3">
                <h6>Psychological Symptoms</h6>
                <p>{testData.psychological_symptoms}</p>
              </div>
            )}
            {testData.risk_assessment && (
              <div className="mb-3">
                <h6>Risk Assessment</h6>
                <p>{testData.risk_assessment}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-50">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="test-results-view">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          {testType.charAt(0).toUpperCase() + testType.slice(1)} Test Results
        </h2>
        <button onClick={() => navigate(-1)} className="btn btn-outline-secondary">
          <FaTimes className="me-2" />
          Close
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <strong>Error:</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {/* Patient Information Card */}
      {patientInfo && (
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">
              <FaUser className="me-2" />
              Patient Information
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-4">
                <p><strong>Name:</strong> {patientInfo.name}</p>
                <p><strong>Age:</strong> {patientInfo.age}</p>
                <p><strong>Sex:</strong> {patientInfo.sex}</p>
              </div>
              <div className="col-md-4">
                <p><strong>Date of Examination:</strong> {patientInfo.date_of_examination ? new Date(patientInfo.date_of_examination).toLocaleDateString() : 'N/A'}</p>
                <p><strong>Purpose:</strong> {patientInfo.purpose_of_examination}</p>
                <p><strong>Civil Status:</strong> {patientInfo.civil_status}</p>
              </div>
              <div className="col-md-4">
                <p><strong>Occupation:</strong> {patientInfo.occupation}</p>
                <p><strong>Education:</strong> {patientInfo.educational_attainment}</p>
                <p><strong>Nationality:</strong> {patientInfo.nationality}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results Card */}
      <div className="card mb-4">
        <div className="card-header bg-info text-white">
          <h5 className="mb-0">
            <FaFileAlt className="me-2" />
            Test Results
          </h5>
        </div>
        <div className="card-body">
          {renderTestResults()}
          
          {/* Test Administration Info */}
          <div className="mt-4 pt-3 border-top">
            <div className="row text-muted">
              <div className="col-md-6">
                <p><small>Administered by: {psychometrician?.full_name || 'Not specified'}</small></p>
              </div>
              <div className="col-md-6">
                <p><small>Reviewed by: {psychologist?.full_name || 'Pending review'}</small></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Remarks Card */}
      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Professional Remarks</h5>
          {canAddRemarks && !isEditingRemarks && (
            <button 
              onClick={() => setIsEditingRemarks(true)} 
              className="btn btn-sm btn-primary"
            >
              <FaEdit className="me-1" />
              {testData.remarks ? 'Edit Remarks' : 'Add Remarks'}
            </button>
          )}
        </div>
        <div className="card-body">
          {isEditingRemarks ? (
            <div>
              <div className="mb-3">
                <label htmlFor="remarks" className="form-label">Remarks:</label>
                <textarea
                  id="remarks"
                  className="form-control"
                  rows="6"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter your professional remarks here..."
                />
              </div>
              <div className="d-flex gap-2">
                <button 
                  onClick={handleSaveRemarks} 
                  className="btn btn-success"
                  disabled={saving}
                >
                  <FaSave className="me-1" />
                  {saving ? 'Saving...' : 'Save Remarks'}
                </button>
                <button 
                  onClick={() => {
                    setIsEditingRemarks(false);
                    setRemarks(testData.remarks || '');
                    if (testType === 'psychological') {
                      setInterpretation(testData.cfit_interpretation || '');
                    }
                  }} 
                  className="btn btn-outline-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              {testData.remarks ? (
                <p className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>{testData.remarks}</p>
              ) : (
                <p className="text-muted mb-0">No remarks have been added yet.</p>
              )}
              {testData.updated_at && testData.remarks && (
                <small className="text-muted d-block mt-2">
                  Last updated: {new Date(testData.updated_at).toLocaleString()}
                </small>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Custom Styles for Enhanced Psychological Test Display */}
      <style jsx>{`
        .metric-card {
          text-align: center;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 0.5rem;
          border: 1px solid #dee2e6;
          margin-bottom: 1rem;
        }
        
        .metric-value {
          font-size: 1.75rem;
          font-weight: bold;
          color: #007bff;
          margin-bottom: 0.5rem;
        }
        
        .metric-label {
          font-size: 0.875rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        
        .interpretation-section {
          margin-top: 1.5rem;
        }
        
        .interpretation-box {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 0.5rem;
          border-left: 4px solid #007bff;
          font-style: italic;
          white-space: pre-wrap;
        }
        
        .personality-factor-item {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 0.5rem;
          border: 1px solid #dee2e6;
          margin-bottom: 1rem;
        }
        
        .factor-name {
          font-weight: 600;
          color: #495057;
        }
        
        .factor-score {
          font-weight: bold;
          color: #007bff;
        }
        
        .factor-interpretation {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #dee2e6;
        }
        
        .skill-item {
          text-align: center;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 0.5rem;
          border: 1px solid #dee2e6;
          margin-bottom: 1rem;
        }
        
        .skill-name {
          font-weight: 600;
          color: #495057;
          margin-bottom: 0.5rem;
          display: block;
        }
        
        .badge {
          font-size: 0.75rem;
          padding: 0.375rem 0.75rem;
        }
        
        .badge-success {
          background-color: #28a745;
        }
        
        .badge-warning {
          background-color: #ffc107;
          color: #212529;
        }
        
        .badge-danger {
          background-color: #dc3545;
        }
        
        .progress {
          height: 0.75rem;
        }
        
        .progress-bar {
          transition: width 0.3s ease;
        }
        
        @media print {
          .metric-card {
            border: 1px solid #000 !important;
            background: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .interpretation-box {
            border-left: 4px solid #000 !important;
            background: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .personality-factor-item,
          .skill-item {
            border: 1px solid #000 !important;
            background: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .progress-bar {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .badge {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}</style>
    </div>
  );
};

export default TestResultsView;