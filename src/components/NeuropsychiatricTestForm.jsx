// components/NeuropsychiatricTestForm.jsx - Updated with Enhanced Mental Status Exam
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaSave } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const NeuropsychiatricTestForm = ({ patientInfo, userRole, userId, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    brief_personal_history: '',
    observations: {
      appearance: 'Neat',
      speech: 'Normal',
      eye_contact: 'Normal',
      motor_activity: 'Normal',
      affect: 'Full'
    },
    mental_status_exam: {
      // Numerical items (will display as X/total)
      orientation_score: '',
      orientation_total: '10',
      registration_score: '',
      registration_total: '3',
      attention_calculation_score: '',
      attention_calculation_total: '5',
      recall_score: '',
      recall_total: '3',
      language_score: '',
      language_total: '9',
      copying_score: '',
      copying_total: '1',
      // Text descriptions
      orientation_description: 'The client answered questions about time and place.',
      registration_description: 'The client repeated words correctly.',
      attention_calculation_description: 'The client was able to focus during the examination and perform calculations.',
      recall_description: 'The client recalled words mentioned by the examiner.',
      language_description: 'The client has good verbal and written communication skills.',
      copying_description: 'The client was able to copy the image presented.',
      // Dropdown items removed
    },
    psychological_history: '',
    medical_history: {
      diabetes: 'no',
      hypertension: 'no',
      heart_disease: 'no',
      stroke: 'no',
      seizure: 'no',
      head_injury: 'no',
      cancer: 'no',
      thyroid_disorder: 'no',
      respiratory_disease: 'no',
      other: 'no'
    },
    psychological_symptoms: '',
    risk_assessment: '',
    substance_dependency: '',
    stressful_events: '',
    insight: '',
    judgment: '',
    remarks: ''
  });

  const handleInputChange = (section, field, value) => {
    if (section) {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Prepare the test data based on the user's role
      const testData = {
        patient_id: patientInfo.id,
        brief_personal_history: formData.brief_personal_history,
        observations: formData.observations,
        mental_status_exam: formData.mental_status_exam,
        psychological_history: formData.psychological_history,
        medical_history: formData.medical_history,
        psychological_symptoms: formData.psychological_symptoms,
        risk_assessment: formData.risk_assessment,
        substance_dependency: formData.substance_dependency,
        stressful_events: formData.stressful_events,
        insight: formData.insight,
        judgment: formData.judgment,
        remarks: formData.remarks
      };

      // Assign the appropriate field based on user role
      if (userRole === 'psychometrician') {
        testData.psychometrician_id = userId;
      } else if (userRole === 'psychologist') {
        testData.psychologist_id = userId;
      } else if (userRole === 'psychologist') {
        testData.psychometrician_id = userId;
      }

      const { data, error } = await supabase
        .from('neuropsychiatric_tests')
        .insert([testData])
        .select();
      
      if (error) throw error;
      
      // Log audit event for test creation
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.CREATE,
        resourceType: RESOURCE_TYPES.TEST_RESULT,
        resourceId: data[0]?.id,
        description: 'Neuropsychiatric test record created',
        details: {
          test_id: data[0]?.id,
          test_type: 'neuropsychiatric',
          patient_id: patientInfo.id,
          patient_name: patientInfo.name,
          created_by_user: userId,
          user_role: userRole
        }
      });
      
      showSuccess('Neuropsychiatric test record saved successfully!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving test record:', error);
      showError('Failed to save the test record: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Define appearance options
  const appearanceOptions = ['Neat', 'Disheveled', 'Inappropriate', 'Bizarre', 'Other'];
  const speechOptions = ['Normal', 'Tangential', 'Pressured', 'Impoverished', 'Other'];
  const eyeContactOptions = ['Normal', 'Intense', 'Avoidant', 'Other'];
  const motorActivityOptions = ['Normal', 'Restless', 'Tics', 'Slowed', 'Other'];
  const affectOptions = ['Full', 'Constricted', 'Flat', 'Labile', 'Other'];

  return (
    <form onSubmit={handleSubmit}>
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Personal Information</h5>
        </div>
        <div className="card-body">
          <table className="table table-bordered">
            <tbody>
              <tr>
                <td><strong>NAME:</strong> {patientInfo.name}</td>
                <td><strong>AGE:</strong> {patientInfo.age}</td>
                <td><strong>SEX:</strong> {patientInfo.sex}</td>
                <td><strong>CIVIL STATUS:</strong> {patientInfo.civil_status}</td>
              </tr>
              <tr>
                <td colSpan="2"><strong>DATE OF BIRTH:</strong> {patientInfo.date_of_birth ? new Date(patientInfo.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                <td colSpan="2"><strong>PLACE OF BIRTH:</strong> {patientInfo.place_of_birth}</td>
              </tr>
              <tr>
                <td><strong>NATIONALITY:</strong> {patientInfo.nationality}</td>
                <td><strong>RELIGION:</strong> {patientInfo.religion}</td>
                <td colSpan="2"><strong>OCCUPATION:</strong> {patientInfo.occupation}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>ADDRESS:</strong> {patientInfo.address}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>EDUCATIONAL ATTAINMENT:</strong> {patientInfo.educational_attainment}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>PURPOSE OF EXAMINATION:</strong> {patientInfo.purpose_of_examination}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>DATE OF EXAMINATION:</strong> {patientInfo.date_of_examination ? new Date(patientInfo.date_of_examination).toLocaleDateString() : 'N/A'}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>AGENCY/AFFILIATION:</strong> {patientInfo.agency_affiliation}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Brief Personal History Section */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Brief Personal History</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <textarea
              id="brief_personal_history"
              className="form-control"
              rows="6"
              value={formData.brief_personal_history}
              onChange={(e) => handleInputChange(null, 'brief_personal_history', e.target.value)}
              placeholder="Enter a brief personal history of the client including family background, education, work history, and current situation..."
            ></textarea>
          </div>
        </div>
      </div>

      {/* Observations Section */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Observations</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <tbody>
                <tr>
                  <td width="30%"><strong>APPEARANCE</strong></td>
                  <td>
                    <select
                      className="form-select"
                      value={formData.observations.appearance}
                      onChange={(e) => handleInputChange('observations', 'appearance', e.target.value)}
                    >
                      {appearanceOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>SPEECH</strong></td>
                  <td>
                    <select
                      className="form-select"
                      value={formData.observations.speech}
                      onChange={(e) => handleInputChange('observations', 'speech', e.target.value)}
                    >
                      {speechOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>EYE CONTACT</strong></td>
                  <td>
                    <select
                      className="form-select"
                      value={formData.observations.eye_contact}
                      onChange={(e) => handleInputChange('observations', 'eye_contact', e.target.value)}
                    >
                      {eyeContactOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>MOTOR ACTIVITY</strong></td>
                  <td>
                    <select
                      className="form-select"
                      value={formData.observations.motor_activity}
                      onChange={(e) => handleInputChange('observations', 'motor_activity', e.target.value)}
                    >
                      {motorActivityOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                </tr>
                <tr>
                  <td><strong>AFFECT</strong></td>
                  <td>
                    <select
                      className="form-select"
                      value={formData.observations.affect}
                      onChange={(e) => handleInputChange('observations', 'affect', e.target.value)}
                    >
                      {affectOptions.map(option => (
                        <option key={option} value={option}>{option}</option>
                      ))}
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Enhanced Mental Status Examination */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Mental Status Examination</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th width="20%">Area</th>
                  <th width="30%">Score</th>
                  <th width="50%">Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>ORIENTATION</strong></td>
                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.mental_status_exam.orientation_score}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow values from 1-10
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 10)) {
                            handleInputChange('mental_status_exam', 'orientation_score', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow backspace, delete, arrow keys, tab, and numbers 1-9, 0
                          const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                          if (!allowedKeys.includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        min="1"
                        max="10"
                        placeholder="0"
                      />
                      <span className="input-group-text">/10</span>
                    </div>
                  </td>
                  <td>
                    <div className="form-control" style={{minHeight: '60px', padding: '8px'}}>
                      The client answered {formData.mental_status_exam.orientation_score || '1'}/10 questions correctly about time and place.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td><strong>REGISTRATION</strong></td>
                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.mental_status_exam.registration_score}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow values from 0-3 and limit to 1 digit
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 3 && value.length <= 1)) {
                            handleInputChange('mental_status_exam', 'registration_score', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow backspace, delete, arrow keys, tab, and numbers 0-3 only
                          const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '0', '1', '2', '3'];
                          if (!allowedKeys.includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        min="0"
                        max="3"
                        placeholder="0"
                      />
                      <span className="input-group-text">/3</span>
                    </div>
                  </td>
                  <td>
                    <div className="form-control" style={{minHeight: '60px', padding: '8px'}}>
                      The client repeated {formData.mental_status_exam.registration_score || '0'}/3 words correctly.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td><strong>ATTENTION AND CALCULATION</strong></td>
                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.mental_status_exam.attention_calculation_score}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow values 0-1 and limit to 1 digit
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 1 && value.length <= 1)) {
                            handleInputChange('mental_status_exam', 'attention_calculation_score', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow backspace, delete, arrow keys, tab, and numbers 0-1 only
                          const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '0', '1'];
                          if (!allowedKeys.includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        min="0"
                        max="1"
                        placeholder="0"
                      />
                      <span className="input-group-text">/1</span>
                    </div>
                  </td>
                  <td>
                    <div className="form-control" style={{minHeight: '60px', padding: '8px'}}>
                      The client {formData.mental_status_exam.attention_calculation_score === '1' ? 'was' : 'wasn\'t'} able to focus during the examination and perform calculations.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td><strong>RECALL</strong></td>
                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.mental_status_exam.recall_score}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow values from 0-3 and limit to 1 digit
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 3 && value.length <= 1)) {
                            handleInputChange('mental_status_exam', 'recall_score', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow backspace, delete, arrow keys, tab, and numbers 0-3 only
                          const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '0', '1', '2', '3'];
                          if (!allowedKeys.includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        min="0"
                        max="3"
                        placeholder="0"
                      />
                      <span className="input-group-text">/3</span>
                    </div>
                  </td>
                  <td>
                    <div className="form-control" style={{minHeight: '60px', padding: '8px'}}>
                      The client recalled {formData.mental_status_exam.recall_score || '0'}/3 words mentioned by the examiner.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td><strong>LANGUAGE</strong></td>
                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.mental_status_exam.language_score}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow values 0-1 and limit to 1 digit
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 1 && value.length <= 1)) {
                            handleInputChange('mental_status_exam', 'language_score', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow backspace, delete, arrow keys, tab, and numbers 0-1 only
                          const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '0', '1'];
                          if (!allowedKeys.includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        min="0"
                        max="1"
                        placeholder="0"
                      />
                      <span className="input-group-text">/1</span>
                    </div>
                  </td>
                  <td>
                    <div className="form-control" style={{minHeight: '60px', padding: '8px'}}>
                      The client {formData.mental_status_exam.language_score === '1' ? 'has' : 'doesn\'t have'} good verbal and written communication skills.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td><strong>COPYING</strong></td>
                  <td>
                    <div className="input-group">
                      <input
                        type="number"
                        className="form-control"
                        value={formData.mental_status_exam.copying_score}
                        onChange={(e) => {
                          const value = e.target.value;
                          // Only allow values 0-1 and limit to 1 digit
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 1 && value.length <= 1)) {
                            handleInputChange('mental_status_exam', 'copying_score', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow backspace, delete, arrow keys, tab, and numbers 0-1 only
                          const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '0', '1'];
                          if (!allowedKeys.includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        min="0"
                        max="1"
                        placeholder="0"
                      />
                      <span className="input-group-text">/1</span>
                    </div>
                  </td>
                  <td>
                    <div className="form-control" style={{minHeight: '60px', padding: '8px'}}>
                      The client {formData.mental_status_exam.copying_score === '1' ? 'was' : 'wasn\'t'} able to copy the image presented.
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Clinical History & Assessment</h5>
        </div>
        <div className="card-body">
          <div className="mb-3">
            <label htmlFor="psychological_history" className="form-label">Psychological/Psychiatric History</label>
            <textarea
              id="psychological_history"
              className="form-control"
              rows="3"
              value={formData.psychological_history}
              onChange={(e) => handleInputChange(null, 'psychological_history', e.target.value)}
            ></textarea>
          </div>
          
          <div className="mb-3">
            <label className="form-label">Medical History (Check all that apply)</label>
            <div className="row">
              {Object.entries(formData.medical_history).map(([condition, value]) => {
                const label = condition
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                  
                return (
                  <div key={condition} className="col-md-4 mb-2">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`medical_${condition}`}
                        checked={value === 'yes'}
                        onChange={(e) => handleInputChange('medical_history', condition, e.target.checked ? 'yes' : 'no')}
                      />
                      <label className="form-check-label" htmlFor={`medical_${condition}`}>
                        {label}
                      </label>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          <div className="mb-3">
            <label htmlFor="psychological_symptoms" className="form-label">Psychological Symptoms</label>
            <textarea
              id="psychological_symptoms"
              className="form-control"
              rows="3"
              value={formData.psychological_symptoms}
              onChange={(e) => handleInputChange(null, 'psychological_symptoms', e.target.value)}
            ></textarea>
          </div>
          
          <div className="mb-3">
            <label htmlFor="risk_assessment" className="form-label">Risk Assessment</label>
            <textarea
              id="risk_assessment"
              className="form-control"
              rows="3"
              value={formData.risk_assessment}
              onChange={(e) => handleInputChange(null, 'risk_assessment', e.target.value)}
            ></textarea>
            <small className="form-text text-muted">
              Include assessment of suicide risk, homicide risk, self-harm risk, and other potential risks.
            </small>
          </div>
          
          <div className="mb-3">
            <label htmlFor="substance_dependency" className="form-label">Substance Dependency</label>
            <textarea
              id="substance_dependency"
              className="form-control"
              rows="2"
              value={formData.substance_dependency}
              onChange={(e) => handleInputChange(null, 'substance_dependency', e.target.value)}
            ></textarea>
          </div>
          
          <div className="mb-3">
            <label htmlFor="stressful_events" className="form-label">Stressful Events</label>
            <textarea
              id="stressful_events"
              className="form-control"
              rows="2"
              value={formData.stressful_events}
              onChange={(e) => handleInputChange(null, 'stressful_events', e.target.value)}
            ></textarea>
          </div>
          
          <div className="row">
            <div className="col-md-6 mb-3">
              <label htmlFor="insight" className="form-label">Insight</label>
              <select
                id="insight"
                className="form-select"
                value={formData.insight}
                onChange={(e) => handleInputChange(null, 'insight', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="None">None</option>
              </select>
            </div>
            <div className="col-md-6 mb-3">
              <label htmlFor="judgment" className="form-label">Judgment</label>
              <select
                id="judgment"
                className="form-select"
                value={formData.judgment}
                onChange={(e) => handleInputChange(null, 'judgment', e.target.value)}
              >
                <option value="">Select...</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Poor">Poor</option>
                <option value="Impaired">Impaired</option>
              </select>
            </div>
          </div>
          
          {(userRole === 'psychologist' || userRole === 'admin') && (
            <div className="mb-3">
              <label htmlFor="remarks" className="form-label">Professional Remarks</label>
              <textarea
                id="remarks"
                className="form-control"
                rows="4"
                value={formData.remarks}
                onChange={(e) => handleInputChange(null, 'remarks', e.target.value)}
              ></textarea>
            </div>
          )}
        </div>
      </div>
      
      <div className="text-end">
        <button 
          type="button" 
          className="btn btn-secondary me-2"
          onClick={() => onSuccess ? onSuccess() : null}
        >
          Cancel
        </button>
        <button 
          type="submit" 
          className="btn btn-primary"
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Saving...
            </>
          ) : (
            <>
              <FaSave className="me-2" /> Save Test Results
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default NeuropsychiatricTestForm;