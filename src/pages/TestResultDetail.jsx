// TestResultDetail.jsx - Individual test result view component
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FaArrowLeft, FaPrint, FaFilePdf } from 'react-icons/fa';
import { safelyParseJSON } from '../utils/jsonHelper';

const TestResultDetail = ({ user }) => {
  const { testType, testId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user && testId && testType) {
      fetchTestDetails();
    }
  }, [user, testId, testType]);

  const fetchTestDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      let query;
      switch (testType) {
        case 'psychological':
          query = supabase
            .from('psychological_tests')
            .select(`
              *,
              patient:patient_id(name, age, sex),
              psychometrician:psychometrician_id(full_name),
              psychologist:psychologist_id(full_name)
            `)
            .eq('id', testId)
            .single();
          break;
          
        case 'neuropsychological':
          query = supabase
            .from('neuropsychological_tests')
            .select(`
              *,
              patient:patient_id(name, age, sex),
              psychometrician:psychometrician_id(full_name),
              psychologist:psychologist_id(full_name)
            `)
            .eq('id', testId)
            .single();
          break;
          
        case 'neuropsychiatric':
          query = supabase
            .from('neuropsychiatric_tests')
            .select(`
              *,
              patient:patient_id(name, age, sex),
              psychometrician:psychometrician_id(full_name),
              psychologist:psychologist_id(full_name)
            `)
            .eq('id', testId)
            .single();
          break;
          
        default:
          throw new Error('Invalid test type');
      }

      const { data, error } = await query;

      if (error) throw error;

      // Parse JSON fields
      let processedData = { ...data };
      if (testType === 'psychological') {
        processedData.personality_factors = safelyParseJSON(data.personality_factors);
        processedData.personality_interpretations = safelyParseJSON(data.personality_interpretations);
        processedData.workplace_skills = safelyParseJSON(data.workplace_skills);
      } else if (testType === 'neuropsychological') {
        processedData.mmse_results = safelyParseJSON(data.mmse_results);
        processedData.cfit_results = safelyParseJSON(data.cfit_results);
        processedData.bpi_results = safelyParseJSON(data.bpi_results);
        processedData.wss_results = safelyParseJSON(data.wss_results);
      } else if (testType === 'neuropsychiatric') {
        processedData.mental_status_exam = safelyParseJSON(data.mental_status_exam);
        processedData.medical_history = safelyParseJSON(data.medical_history);
        processedData.psychological_symptoms = safelyParseJSON(data.psychological_symptoms);
        processedData.risk_assessment = safelyParseJSON(data.risk_assessment);
        processedData.substance_dependency = safelyParseJSON(data.substance_dependency);
        processedData.stressful_events = safelyParseJSON(data.stressful_events);
      }

      setTestData(processedData);
    } catch (error) {
      console.error('Error fetching test details:', error);
      setError('Failed to load test results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error || !testData) {
    return (
      <div className="container mt-5">
        <div className="alert alert-danger">
          <h4 className="alert-heading">Error</h4>
          <p>{error || 'Test data not found'}</p>
          <button className="btn btn-primary" onClick={handleBack}>
            <FaArrowLeft className="me-2" /> Back to Results
          </button>
        </div>
      </div>
    );
  }

  const renderTestContent = () => {
    switch (testType) {
      case 'psychological':
        return renderPsychologicalContent();
      case 'neuropsychological':
        return renderNeuropsychologicalContent();
      case 'neuropsychiatric':
        return renderNeuropsychiatricContent();
      default:
        return <p>Invalid test type</p>;
    }
  };

  const renderPsychologicalContent = () => {
    return (
      <>
        {/* CFIT Results */}
        <div className="card mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="mb-0">CFIT (Culture Fair Intelligence Test) Results</h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <div className="metric-box">
                  <label>Raw Score</label>
                  <div className="value">{testData.cfit_raw_score || 'N/A'}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="metric-box">
                  <label>Percentile</label>
                  <div className="value">{testData.cfit_percentile || 'N/A'}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="metric-box">
                  <label>IQ Equivalent</label>
                  <div className="value">{testData.cfit_iq_equivalent || 'N/A'}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="metric-box">
                  <label>Classification</label>
                  <div className="value">
                    {testData.cfit_iq_equivalent >= 130 ? 'Very Superior' :
                     testData.cfit_iq_equivalent >= 120 ? 'Superior' :
                     testData.cfit_iq_equivalent >= 110 ? 'High Average' :
                     testData.cfit_iq_equivalent >= 90 ? 'Average' :
                     testData.cfit_iq_equivalent >= 80 ? 'Low Average' :
                     testData.cfit_iq_equivalent >= 70 ? 'Borderline' :
                     'Below 70'}
                  </div>
                </div>
              </div>
            </div>
            
            {testData.cfit_interpretation && (
              <div className="mt-4">
                <h6>Professional Interpretation:</h6>
                <div className="interpretation-box">
                  {testData.cfit_interpretation}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Personality Factors */}
        {testData.personality_factors && Object.keys(testData.personality_factors).length > 0 && (
          <div className="card mb-4">
            <div className="card-header bg-info text-white">
              <h5 className="mb-0">16 Personality Factors (16PF) Assessment</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {Object.entries(testData.personality_factors).map(([key, value]) => {
                  if (key === 'summary') return null;
                  
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
                  
                  const label = factorLabels[key] || key;
                  const percentage = (value / 10) * 100;
                  const interpretation = testData.personality_interpretations?.[key];
                  
                  return (
                    <div key={key} className="col-md-6 mb-3">
                      <div className="personality-trait">
                        <div className="d-flex justify-content-between mb-1">
                          <span className="trait-name">{label}</span>
                          <span className="trait-value">{value}/10</span>
                        </div>
                        <div className="progress mb-2">
                          <div 
                            className={`progress-bar ${percentage >= 70 ? 'bg-success' : percentage >= 40 ? 'bg-warning' : 'bg-danger'}`} 
                            role="progressbar" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        {interpretation && interpretation.trim() && (
                          <div className="trait-interpretation">
                            <small className="text-muted">{interpretation}</small>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {testData.personality_interpretation && (
                <div className="mt-4">
                  <h6>Overall Personality Profile:</h6>
                  <div className="interpretation-box">
                    {testData.personality_interpretation}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Workplace Skills */}
        {testData.workplace_skills && Object.keys(testData.workplace_skills).length > 0 && (
          <div className="card mb-4">
            <div className="card-header bg-success text-white">
              <h5 className="mb-0">Workplace Skills Assessment</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {Object.entries(testData.workplace_skills)
                  .filter(([key]) => key !== 'summary')
                  .map(([key, value]) => {
                    const label = key
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())
                      .trim();
                    
                    const getBadgeClass = (val) => {
                      if (val === 'above_average' || val === 'excellent') return 'badge-success';
                      if (val === 'below_average' || val === 'poor') return 'badge-danger';
                      return 'badge-warning';
                    };
                    
                    const getLabel = (val) => {
                      if (val === 'above_average') return 'Above Average';
                      if (val === 'below_average') return 'Below Average';
                      if (val === 'excellent') return 'Excellent';
                      if (val === 'poor') return 'Poor';
                      return 'Average';
                    };
                    
                    return (
                      <div key={key} className="col-md-4 mb-3">
                        <div className="skill-item">
                          <p className="skill-name">{label}</p>
                          <span className={`badge ${getBadgeClass(value)}`}>
                            {getLabel(value)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
              
              {testData.workplace_skills_interpretation && (
                <div className="mt-4">
                  <h6>Workplace Skills Summary:</h6>
                  <div className="interpretation-box">
                    {testData.workplace_skills_interpretation}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Remarks */}
        {testData.remarks && (
          <div className="card mb-4">
            <div className="card-header bg-secondary text-white">
              <h5 className="mb-0">Professional Remarks</h5>
            </div>
            <div className="card-body">
              {testData.remarks && (
                <div className="mb-3">
                  <h6>Psychologist's Remarks:</h6>
                  <div className="interpretation-box">
                    {testData.remarks}
                  </div>
                </div>
              )}
              
            </div>
          </div>
        )}
      </>
    );
  };

  const renderNeuropsychologicalContent = () => {
    // Similar structure for neuropsychological tests
    return (
      <>
        {/* MMSE Results */}
        {testData.mmse_results && (
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Mini-Mental State Examination (MMSE)</h5>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-6">
                  <div className="metric-box">
                    <label>Total Score</label>
                    <div className="value">{testData.mmse_results.total_score || 0}/30</div>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="metric-box">
                    <label>Cognitive Status</label>
                    <div className="value">
                      {testData.mmse_results.total_score >= 24 ? 'Normal' :
                       testData.mmse_results.total_score >= 19 ? 'Mild Impairment' :
                       testData.mmse_results.total_score >= 10 ? 'Moderate Impairment' :
                       'Severe Impairment'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add other neuropsychological test sections */}
      </>
    );
  };

  const renderNeuropsychiatricContent = () => {
    // Similar structure for neuropsychiatric tests
    return (
      <>
        {/* Mental Status Exam */}
        {testData.mental_status_exam && (
          <div className="card mb-4">
            <div className="card-header bg-primary text-white">
              <h5 className="mb-0">Mental Status Examination</h5>
            </div>
            <div className="card-body">
              <div className="row">
                {Object.entries(testData.mental_status_exam).map(([key, value]) => {
                  const label = key
                    .replace(/_/g, ' ')
                    .replace(/^./, str => str.toUpperCase());
                  
                  return (
                    <div key={key} className="col-md-6 mb-3">
                      <div className="status-item">
                        <strong>{label}:</strong>
                        <p className="mb-0">{value || 'Not assessed'}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Add other neuropsychiatric test sections */}
      </>
    );
  };

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{testType.charAt(0).toUpperCase() + testType.slice(1)} Test Results</h2>
        <div>
          <button className="btn btn-outline-secondary me-2" onClick={handleBack}>
            <FaArrowLeft className="me-2" /> Back
          </button>
          <button className="btn btn-outline-primary me-2" onClick={handlePrint}>
            <FaPrint className="me-2" /> Print
          </button>
          <button className="btn btn-outline-danger">
            <FaFilePdf className="me-2" /> Export PDF
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-dark text-white">
          <h5 className="mb-0">Patient Information</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-4">
              <p><strong>Name:</strong> {testData.patient?.name || 'N/A'}</p>
              <p><strong>Age:</strong> {testData.patient?.age || 'N/A'}</p>
              <p><strong>Sex:</strong> {testData.patient?.sex || 'N/A'}</p>
            </div>
            <div className="col-md-4">
              <p><strong>Test Date:</strong> {new Date(testData.created_at).toLocaleDateString()}</p>
              <p><strong>Psychometrician:</strong> {testData.psychometrician?.full_name || 'Not assigned'}</p>
              <p><strong>Psychologist:</strong> {testData.psychologist?.full_name || 'Pending review'}</p>
            </div>
            <div className="col-md-4">
              <p><strong>Test ID:</strong> {testData.id}</p>
              <p><strong>Last Updated:</strong> {new Date(testData.updated_at).toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {renderTestContent()}
      
      <style jsx>{`
        .personality-trait {
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 0.5rem;
          border: 1px solid #dee2e6;
          margin-bottom: 1rem;
        }
        
        .trait-name {
          font-weight: 600;
          color: #495057;
        }
        
        .trait-value {
          font-weight: bold;
          color: #007bff;
        }
        
        .trait-interpretation {
          margin-top: 0.5rem;
          padding-top: 0.5rem;
          border-top: 1px solid #dee2e6;
        }
        
        .interpretation-box {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 0.5rem;
          border-left: 4px solid #007bff;
          font-style: italic;
          white-space: pre-wrap;
        }
        
        .metric-box {
          text-align: center;
          padding: 1rem;
          background: #f8f9fa;
          border-radius: 0.5rem;
          border: 1px solid #dee2e6;
          margin-bottom: 1rem;
        }
        
        .metric-box label {
          display: block;
          font-size: 0.875rem;
          color: #6c757d;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 0.5rem;
        }
        
        .metric-box .value {
          font-size: 1.75rem;
          font-weight: bold;
          color: #007bff;
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
          .personality-trait,
          .skill-item,
          .metric-box {
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
        }
      `}</style>
    </div>
  );
};

export default TestResultDetail;