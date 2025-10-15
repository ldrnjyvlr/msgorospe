// pages/ComprehensiveReport.jsx - Comprehensive report with proper styling
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useParams, useNavigate } from 'react-router-dom';
import { FaPrint, FaDownload, FaEdit, FaTimes, FaSave, FaFileAlt, FaUser } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const ComprehensiveReport = ({ userRole, user }) => {
  const { testType, testId } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  
  const [loading, setLoading] = useState(true);
  const [testData, setTestData] = useState(null);
  const [patientInfo, setPatientInfo] = useState(null);
  const [professionalReport, setProfessionalReport] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Permission checks
  const canEditPsychologistReport = userRole === 'psychologist';
  const canEditAnyReport = userRole === 'admin';

  useEffect(() => {
    fetchData();
  }, [testId, testType]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch test data
      let query;
      const commonColumns = `
        id,
        patient_id,
        remarks,
        created_at,
        psychometrician:psychometrician_id(full_name),
        psychologist:psychologist_id(full_name)
      `;

      switch (testType) {
        case 'psychological':
          query = supabase
            .from('psychological_tests')
            .select(`
              ${commonColumns},
              cfit_raw_score,
              cfit_percentile,
              cfit_iq_equivalent,
              cfit_interpretation,
              personality_factors,
              personality_interpretation,
              workplace_skills,
              workplace_skills_interpretation
            `);
          break;
        case 'neuropsychological':
          query = supabase
            .from('neuropsychological_tests')
            .select(`
              ${commonColumns},
              mmse_results,
              cfit_results,
              bpi_results,
              wss_results
            `);
          break;
        case 'neuropsychiatric':
          query = supabase
            .from('neuropsychiatric_tests')
            .select(`
              ${commonColumns},
              mental_status_exam,
              psychological_history,
              medical_history,
              psychological_symptoms,
              risk_assessment,
              substance_dependency,
              stressful_events,
              insight,
              judgment
            `);
          break;
        default:
          throw new Error('Invalid test type');
      }

      const { data: test, error } = await query.eq('id', testId).single();
      if (error) throw error;
      setTestData(test);

      // Fetch patient information
      if (test.patient_id) {
        const { data: patient, error: patientError } = await supabase
          .from('personal_info')
          .select('*')
          .eq('id', test.patient_id)
          .single();

        if (patientError) throw patientError;
        setPatientInfo(patient);
      }

      // Fetch professional report
      const { data: report, error: reportError } = await supabase
        .from('professional_reports')
        .select(`
          *,
          psychologist:psychologist_id(full_name, email),
        `)
        .eq('test_id', testId)
        .eq('test_type', testType)
        .single();

      if (reportError && reportError.code !== 'PGRST116') {
        console.error('Error fetching report:', reportError);
      } else if (report) {
        setProfessionalReport(report);
        setEditData(report);
      } else {
        // Create empty report structure if none exists
        const emptyReport = {
          psychologist_remarks: '',
          psychologist_interpretation: '',
          final_diagnosis: '',
          recommendations: ''
        };
        setProfessionalReport(emptyReport);
        setEditData(emptyReport);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load report data');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveReport = async () => {
    try {
      setSaving(true);
      
      const updateData = {
        test_id: testId,
        test_type: testType,
        updated_at: new Date().toISOString()
      };

      // Add fields based on user role
      if (canEditPsychologistReport || canEditAnyReport) {
        updateData.psychologist_id = user.id;
        updateData.psychologist_remarks = editData.psychologist_remarks;
        updateData.psychologist_interpretation = editData.psychologist_interpretation;
      }


      if (canEditAnyReport) {
        updateData.final_diagnosis = editData.final_diagnosis;
        updateData.recommendations = editData.recommendations;
      }

      // Upsert the report
      const { error } = await supabase
        .from('professional_reports')
        .upsert(updateData, {
          onConflict: 'test_id, test_type'
        });

      if (error) throw error;

      // Log audit event for professional report update
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.UPDATE,
        resourceType: RESOURCE_TYPES.REPORT,
        resourceId: testId,
        description: `Professional report updated for ${testType} test`,
        details: {
          test_id: testId,
          test_type: testType,
          updated_fields: Object.keys(updateData),
          patient_id: testData?.patient_id,
          updated_by: user.email,
          user_role: userRole,
          report_type: 'professional_report'
        }
      });

      // Refresh data
      await fetchData();
      setIsEditing(false);
      showSuccess('Report saved successfully!');
    } catch (error) {
      console.error('Error saving report:', error);
      showError('Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handlePrint = async () => {
    // Log audit event for print action
    await logAuditEvent({
      actionType: AUDIT_ACTIONS.PRINT,
      resourceType: RESOURCE_TYPES.REPORT,
      resourceId: testId,
      description: `Professional report printed for ${testType} test`,
      details: {
        test_id: testId,
        test_type: testType,
        patient_id: testData?.patient_id,
        patient_name: patientInfo?.name,
        print_type: 'professional_report',
        printed_by: user.email,
        user_role: userRole
      }
    });
    
    window.print();
  };

  const getTestTypeLabel = () => {
    switch (testType) {
      case 'psychological':
        return 'Psychological Assessment';
      case 'neuropsychological':
        return 'Neuropsychological Assessment';
      case 'neuropsychiatric':
        return 'Neuropsychiatric Assessment';
      default:
        return 'Assessment';
    }
  };

  const renderTestResults = () => {
    if (!testData) return null;

    switch (testType) {
      case 'psychological':
        return (
          <div className="test-results">
            <h5 className="section-title">CFIT Test Results</h5>
            
            <div className="table-responsive">
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <td className="fw-bold">Raw Score:</td>
                    <td>{testData.cfit_raw_score || 'N/A'}</td>
                    <td className="fw-bold">Percentile:</td>
                    <td>{testData.cfit_percentile || 'N/A'}</td>
                  </tr>
                  <tr>
                    <td className="fw-bold">IQ Equivalent:</td>
                    <td>{testData.cfit_iq_equivalent || 'N/A'}</td>
                    <td className="fw-bold">Interpretation:</td>
                    <td>{testData.cfit_interpretation || 'Pending'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {testData.personality_factors && (
              <div className="mt-4">
                <h6 className="section-title">Personality Assessment</h6>
                <div className="bg-light p-3 rounded">
                  <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(testData.personality_factors, null, 2)}
                  </pre>
                </div>
                {testData.personality_interpretation && (
                  <div className="interpretation mt-3">
                    <h6>Interpretation:</h6>
                    <p>{testData.personality_interpretation}</p>
                  </div>
                )}
              </div>
            )}

            {testData.workplace_skills && (
              <div className="mt-4">
                <h6 className="section-title">Workplace Skills Assessment</h6>
                <div className="bg-light p-3 rounded">
                  <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(testData.workplace_skills, null, 2)}
                  </pre>
                </div>
                {testData.workplace_skills_interpretation && (
                  <div className="interpretation mt-3">
                    <h6>Interpretation:</h6>
                    <p>{testData.workplace_skills_interpretation}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );

      case 'neuropsychological':
        return (
          <div className="test-results">
            <h5 className="section-title">Neuropsychological Test Results</h5>
            
            {Object.entries({
              'MMSE Results': testData.mmse_results,
              'CFIT Results': testData.cfit_results,
              'BPI Results': testData.bpi_results,
              'WSS Results': testData.wss_results
            }).map(([label, data]) => data && (
              <div key={label} className="mt-4">
                <h6 className="text-primary">{label}</h6>
                <div className="bg-light p-3 rounded">
                  <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(data, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        );

      case 'neuropsychiatric':
        return (
          <div className="test-results">
            <h5 className="section-title">Neuropsychiatric Assessment Results</h5>
            
            <div className="table-responsive">
              <table className="table table-bordered">
                <tbody>
                  {Object.entries({
                    'Mental Status Exam': testData.mental_status_exam,
                    'Psychological History': testData.psychological_history,
                    'Medical History': testData.medical_history,
                    'Psychological Symptoms': testData.psychological_symptoms,
                    'Risk Assessment': testData.risk_assessment,
                    'Substance Dependency': testData.substance_dependency,
                    'Stressful Events': testData.stressful_events,
                    'Insight': testData.insight,
                    'Judgment': testData.judgment
                  }).map(([label, data]) => (
                    <tr key={label}>
                      <td width="30%" className="fw-bold">{label}:</td>
                      <td>
                        {typeof data === 'object' ? (
                          <pre className="mb-0" style={{ whiteSpace: 'pre-wrap' }}>
                            {JSON.stringify(data, null, 2)}
                          </pre>
                        ) : (
                          data || 'Not provided'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger m-4">
        <h5>Error</h5>
        <p>{error}</p>
        <button onClick={() => navigate(-1)} className="btn btn-outline-danger">
          Go Back
        </button>
      </div>
    );
  }

  return (
    <div className="comprehensive-report">
      {/* Print Header - Only visible when printing */}
      <div className="print-only">
        <div className="report-header">
          <h2 className="report-title">MS GOROSPE Psychological Assessment Center</h2>
          <h3 className="text-primary">{getTestTypeLabel()} Report</h3>
          <p className="text-muted">Report Generated: {new Date().toLocaleDateString()}</p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <h2 className="text-primary">Comprehensive Assessment Report</h2>
        <div className="d-flex gap-2">
          <button onClick={handlePrint} className="btn btn-outline-primary">
            <FaPrint className="me-2" />
            Print Report
          </button>
          <button onClick={() => window.print()} className="btn btn-outline-success">
            <FaDownload className="me-2" />
            Save as PDF
          </button>
          {(canEditPsychologistReport || canEditAnyReport) && !isEditing && (
            <button onClick={() => setIsEditing(true)} className="btn btn-primary">
              <FaEdit className="me-2" />
              Edit Report
            </button>
          )}
          <button onClick={() => navigate(-1)} className="btn btn-outline-secondary">
            <FaTimes className="me-2" />
            Close
          </button>
        </div>
      </div>

      {/* Patient Information */}
      {patientInfo && (
        <div className="card mb-4">
          <div className="card-header primary">
            <h5 className="mb-0">
              <FaUser className="me-2" />
              Patient Information
            </h5>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <div className="mb-3">
                  <div className="text-muted small">Name</div>
                  <div className="fw-bold">{patientInfo.name}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Age / Sex</div>
                  <div className="fw-bold">{patientInfo.age} / {patientInfo.sex}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Date of Birth</div>
                  <div className="fw-bold">{patientInfo.date_of_birth || 'Not provided'}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-3">
                  <div className="text-muted small">Civil Status</div>
                  <div className="fw-bold">{patientInfo.civil_status}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Occupation</div>
                  <div className="fw-bold">{patientInfo.occupation}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Education</div>
                  <div className="fw-bold">{patientInfo.educational_attainment}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-3">
                  <div className="text-muted small">Address</div>
                  <div className="fw-bold">{patientInfo.address}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Nationality</div>
                  <div className="fw-bold">{patientInfo.nationality}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Religion</div>
                  <div className="fw-bold">{patientInfo.religion}</div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="mb-3">
                  <div className="text-muted small">Examination Date</div>
                  <div className="fw-bold">{patientInfo.date_of_examination}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Purpose</div>
                  <div className="fw-bold">{patientInfo.purpose_of_examination}</div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Agency</div>
                  <div className="fw-bold">{patientInfo.agency_affiliation || 'N/A'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="card mb-4">
        <div className="card-header primary">
          <h5 className="mb-0">
            <FaFileAlt className="me-2" />
            {getTestTypeLabel()} Results
          </h5>
        </div>
        <div className="card-body">
          {renderTestResults()}
          
          {testData && testData.remarks && (
            <div className="mt-4">
              <h6 className="section-title">Psychometrician's Remarks</h6>
              <div className="interpretation">
                <p className="mb-0">{testData.remarks}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Professional Interpretations */}
      <div className="card mb-4">
        <div className="card-header primary">
          <h5 className="mb-0">Professional Interpretations</h5>
        </div>
        <div className="card-body">
          {/* Psychologist Section */}
          <div className="mb-4 pb-4 border-bottom">
            <h6 className="text-primary fw-bold">Psychologist's Evaluation</h6>
            {isEditing && (canEditPsychologistReport || canEditAnyReport) ? (
              <div>
                <div className="mb-3">
                  <label className="form-label">Psychologist Remarks:</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={editData.psychologist_remarks || ''}
                    onChange={(e) => setEditData({...editData, psychologist_remarks: e.target.value})}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Psychologist Interpretation:</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    value={editData.psychologist_interpretation || ''}
                    onChange={(e) => setEditData({...editData, psychologist_interpretation: e.target.value})}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <div className="text-muted small">Remarks</div>
                  <div className="interpretation">
                    {professionalReport?.psychologist_remarks || 'No remarks yet'}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Interpretation</div>
                  <div className="interpretation">
                    {professionalReport?.psychologist_interpretation || 'No interpretation yet'}
                  </div>
                </div>
                {professionalReport?.psychologist && (
                  <div className="text-muted small mt-2">
                    By: <span className="fw-bold">{professionalReport.psychologist.full_name}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Psychiatrist Section */}
          <div className="mb-4 pb-4 border-bottom">
            <h6 className="text-primary fw-bold">Psychiatrist's Evaluation</h6>
            {isEditing && canEditAnyReport ? (
              <div>
                <div className="mb-3">
                  <label className="form-label">Psychiatrist Remarks:</label>
                  <textarea
                    className="form-control"
                    rows="4"
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Psychiatrist Interpretation:</label>
                  <textarea
                    className="form-control"
                    rows="6"
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <div className="text-muted small">Remarks</div>
                  <div className="interpretation">
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Interpretation</div>
                  <div className="interpretation">
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Final Diagnosis and Recommendations */}
          <div>
            <h6 className="text-primary fw-bold">Summary and Recommendations</h6>
            {isEditing && canEditAnyReport ? (
              <div>
                <div className="mb-3">
                  <label className="form-label">Final Diagnosis:</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={editData.final_diagnosis || ''}
                    onChange={(e) => setEditData({...editData, final_diagnosis: e.target.value})}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Recommendations:</label>
                  <textarea
                    className="form-control"
                    rows="6"
                    value={editData.recommendations || ''}
                    onChange={(e) => setEditData({...editData, recommendations: e.target.value})}
                  />
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-3">
                  <div className="text-muted small">Diagnosis</div>
                  <div className="interpretation">
                    {professionalReport?.final_diagnosis || 'Pending'}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-muted small">Recommendations</div>
                  <div className="interpretation">
                    {professionalReport?.recommendations || 'No recommendations yet'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Save/Cancel buttons */}
          {isEditing && (
            <div className="mt-4 d-flex gap-2">
              <button 
                onClick={handleSaveReport} 
                className="btn btn-success"
                disabled={saving}
              >
                <FaSave className="me-1" />
                {saving ? 'Saving...' : 'Save Report'}
              </button>
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditData(professionalReport || {});
                }} 
                className="btn btn-outline-secondary"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Report Footer */}
      <div className="card signatures">
        <div className="card-body text-center">
          <div className="row">
            <div className="col-md-4">
              <div className="mb-4">
                <div className="text-muted small">Prepared by</div>
                <div className="fw-bold mt-2">{testData?.psychometrician?.full_name || '___________________'}</div>
                <div className="small">Psychometrician</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-4">
                <div className="text-muted small">Reviewed by</div>
                <div className="fw-bold mt-2">
                  {professionalReport?.psychologist?.full_name || '___________________'}
                </div>
                <div className="small">Psychologist</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="mb-4">
                <div className="text-muted small">Additional Review by</div>
                <div className="fw-bold mt-2">
                </div>
                <div className="small">Psychiatrist</div>
              </div>
            </div>
          </div>
          <div className="text-muted small mt-4">
            Report generated on: {new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Print Styles */}
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          .comprehensive-report {
            padding: 20px;
          }
          
          .card {
            box-shadow: none !important;
            border: 1px solid #000 !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
          }
          
          .card-header {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: #333 !important;
            color: white !important;
          }
          
          .card-header.primary {
            background-color: #7e3f98 !important;
          }
          
          body {
            font-size: 12pt;
          }
          
          .table {
            border: 1px solid #000 !important;
          }
          
          .table td, .table th {
            border: 1px solid #000 !important;
          }
          
          pre {
            white-space: pre-wrap;
            word-wrap: break-word;
            font-size: 10pt;
          }
          
          .interpretation {
            background-color: #f8f9fa !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          
          .signatures {
            page-break-before: always;
          }
        }
        
        .print-only {
          display: none;
        }
        
        .section-title {
          font-weight: 600;
          margin-bottom: 1rem;
          color: #7e3f98;
          border-bottom: 1px solid #dee2e6;
          padding-bottom: 0.5rem;
        }
        
        .interpretation {
          background-color: #f8f9fa;
          padding: 1rem;
          border-radius: 0.5rem;
          font-style: italic;
          white-space: pre-wrap;
        }
        
        .gap-2 {
          gap: 0.5rem;
        }
      `}</style>
    </div>
  );
};

export default ComprehensiveReport;