// components/NeuropsychologicalTestForm.jsx - Updated with Enhanced Mental Status Exam and Auto-CFIT
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaSave } from 'react-icons/fa';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const NeuropsychologicalTestForm = ({ patientInfo, userRole, userId, onSuccess }) => {
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    // Added observations object similar to neuropsychiatric test
    observations: {
      appearance: 'Neat',
      speech: 'Normal',
      eye_contact: 'Normal',
      motor_activity: 'Normal',
      affect: 'Full'
    },
    // Enhanced mental_status_exam with scores and descriptions
    mental_status_exam: {
      // Numerical items (will display as X/total)
      orientation_score: '',
      orientation_total: '10',
      registration_score: '',
      registration_total: '3',
      attention_calculation_score: '',
      attention_calculation_total: '1',
      recall_score: '',
      recall_total: '3',
      language_score: '',
      language_total: '1',
      copying_score: '',
      copying_total: '1',
      // Text descriptions
      orientation_description: 'The client answered questions about time and place.',
      registration_description: 'The client repeated words correctly.',
      attention_calculation_description: 'The client was able to focus during the examination and perform calculations.',
      recall_description: 'The client recalled words mentioned by the examiner.',
      language_description: 'The client has good verbal and written communication skills.',
      copying_description: 'The client was able to copy the image presented.'
    },
    // Renamed and restructured for Basic Personality Inventory
    bpi_results: {
      hypochondriasis: 'low',
      depression: 'high',
      denial: 'high',
      interpersonal_problems: 'low',
      alienation: 'high',
      persecutory_ideas: 'low',
      anxiety: 'high',
      thinking_disorder: 'high',
      impulse_expression: 'high',
      social_introversion: 'high',
      self_depreciation: 'low',
      deviation: 'high'
    },
    // Will keep the same wss_results structure but change the UI
    wss_results: {
      communication: 'Average',
      adapting_to_change: 'Average',
      problem_solving: 'Average',
      work_ethics: 'Average',
      technological_literacy: 'Average',
      teamwork: 'Average'
    },
    // CFIT results with auto-calculation - reordered fields
    cfit_results: {
      raw_score: '',
      iq_equivalent: '',
      percentile: '',
      interpretation: ''
    },
    remarks: ''
  });

  // CFIT conversion table
  const cfitConversionTable = {
    7: { percentile: 1, iq: 55 },
    8: { percentile: 1, iq: 57 },
    9: { percentile: 1, iq: 60 },
    10: { percentile: 1, iq: 63 },
    11: { percentile: 2, iq: 67 },
    12: { percentile: 3, iq: 70 },
    13: { percentile: 4, iq: 72 },
    14: { percentile: 6, iq: 75 },
    15: { percentile: 8, iq: 78 },
    16: { percentile: 12, iq: 81 },
    17: { percentile: 17, iq: 85 },
    18: { percentile: 25, iq: 88 },
    19: { percentile: 28, iq: 91 },
    20: { percentile: 35, iq: 94 },
    21: { percentile: 40, iq: 96 },
    22: { percentile: 50, iq: 100 },
    23: { percentile: 58, iq: 105 },
    24: { percentile: 65, iq: 106 },
    25: { percentile: 72, iq: 109 },
    26: { percentile: 79, iq: 113 },
    27: { percentile: 84, iq: 116 },
    28: { percentile: 86, iq: 117 },
    29: { percentile: 90, iq: 121 },
    30: { percentile: 93, iq: 124 },
    31: { percentile: 96, iq: 128 },
    32: { percentile: 67, iq: 131 },
    33: { percentile: 98, iq: 133 },
    34: { percentile: 99, iq: 137 },
    35: { percentile: 99, iq: 140 },
    36: { percentile: 99, iq: 142 },
    37: { percentile: 99, iq: 145 },
    38: { percentile: 99, iq: 149 },
    39: { percentile: 99, iq: 152 },
    40: { percentile: 99, iq: 155 },
    41: { percentile: 99, iq: 157 },
    42: { percentile: 99, iq: 161 },
    43: { percentile: 99, iq: 165 },
    44: { percentile: 99, iq: 167 },
    45: { percentile: 99, iq: 169 },
    46: { percentile: 99, iq: 173 },
    47: { percentile: 99, iq: 176 },
    48: { percentile: 99, iq: 179 }
  };

  // Utility functions for personalization
  const getPronouns = (gender) => {
    if (!gender) return { subject: 'they', object: 'them', possessive: 'their' };
    
    const normalizedGender = gender.toLowerCase();
    if (normalizedGender === 'male' || normalizedGender === 'boy') {
      return { subject: 'he', object: 'him', possessive: 'his' };
    } else if (normalizedGender === 'female' || normalizedGender === 'girl') {
      return { subject: 'she', object: 'her', possessive: 'her' };
    }
    
    return { subject: 'they', object: 'them', possessive: 'their' };
  };
  
  const getLastName = (fullName) => {
    if (!fullName) return 'the client';
    
    // Assumes format "Last, First Middle"
    const parts = fullName.split(',');
    if (parts.length > 1) {
      return parts[0].trim();
    }
    
    // If not in that format, try to get last word
    const nameParts = fullName.split(' ');
    return nameParts[nameParts.length - 1].trim();
  };

  const handleInputChange = (section, field, value) => {
    // Handle CFIT raw score with validation (similar to PsychologicalTestForm)
    if (section === 'cfit_results' && field === 'raw_score') {
      let val = value;
      if (val === '') {
        setFormData({
          ...formData,
          [section]: {
            ...formData[section],
            [field]: ''
          }
        });
        return;
      }
      let num = parseInt(val, 10);
      if (isNaN(num)) num = '';
      if (num > 49) num = 49;
      if (num < 1) num = 1;
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: num
        }
      });
      calculateCFIT(num);
      return;
    }

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

  // Calculate CFIT IQ Equivalent and percentile based on raw score - AUTO CALCULATION
  const calculateCFIT = (rawScore) => {
    const score = parseInt(rawScore);
    if (!score || !patientInfo) {
      setFormData(prev => ({
        ...prev,
        cfit_results: {
          ...prev.cfit_results,
          iq_equivalent: "0",
          percentile: "0",
          interpretation: ""
        }
      }));
      return;
    }
    
    // Get conversion data from table
    const conversionData = cfitConversionTable[score];
    
    if (!conversionData) {
      // Handle scores outside the table range
      let percentile, iqEquivalent;
      if (score < 7) {
        percentile = 1;
        iqEquivalent = 50;
      } else if (score > 48) {
        percentile = 99;
        iqEquivalent = 180;
      } else {
        return; // Should not happen
      }
      
      // Update form data
      setFormData(prev => ({
        ...prev,
        cfit_results: {
          ...prev.cfit_results,
          iq_equivalent: iqEquivalent.toString(),
          percentile: percentile.toString(),
          interpretation: generateCFITInterpretation(iqEquivalent)
        }
      }));
      return;
    }
    
    // Generate personalized interpretation
    const interpretation = generateCFITInterpretation(conversionData.iq);
    
    // Update form data
    setFormData(prev => ({
      ...prev,
      cfit_results: {
        ...prev.cfit_results,
        iq_equivalent: conversionData.iq.toString(),
        percentile: conversionData.percentile.toString(),
        interpretation: interpretation
      }
    }));
  };

  const generateCFITInterpretation = (iqEquivalent) => {
    const pronouns = getPronouns(patientInfo.sex);
    const lastName = getLastName(patientInfo.name);
    
    let interpretation = "";
    if (iqEquivalent >= 130) {
      interpretation = `${lastName} obtained a "Superior" score on the Culture Fair Intelligence Test which indicates an exceptional ability to perceive relationships in shapes and in figures. This only signifies mental efficiency to acquire and use knowledge for solving problems and adapting to the world. ${lastName} is fully equipped with the ability to think abstractly and the capacity to effortlessly create solutions to daily problems.`;
    } else if (iqEquivalent >= 120) {
      interpretation = `${lastName} obtained a "Superior" score on the Culture Fair Intelligence Test which indicates an exceptional ability to perceive relationships in shapes and in figures. This only signifies mental efficiency to acquire and use knowledge for solving problems and adapting to the world. ${lastName} is fully equipped with the ability to think abstractly and the capacity to effortlessly create solutions to daily problems.`;
    } else if (iqEquivalent >= 110) {
      interpretation = `${lastName} obtained a "High Average" score in the Culture Fair Intelligence Test which indicates a more than satisfactory ability to perceive relationships in shapes and in figures. This revealed ability with different perceptual tasks that measure composite non-verbal intelligence. ${lastName} can learn new things without difficulty and apply appropriate knowledge as the situation requires.`;
    } else if (iqEquivalent >= 90) {
      interpretation = `${lastName} obtained an "Average" score in the Culture Fair Intelligence Test which indicates a satisfactory ability to perceive relationships in shapes and in figures. This signifies adequate equipment with the necessary aptitude to execute job related tasks that involve cognitive ability as well as perceiving relationships in shapes and figures.`;
    } else if (iqEquivalent >= 80) {
      interpretation = `${lastName} obtained a "Low Average" score in the Culture Fair Intelligence Test which indicates a slight ineptness in perceiving relationships in shapes and in figures. ${lastName} may need a considerable time and effort to apply knowledge and to learn new things.`;
    } else {
      interpretation = `${lastName} obtained a "Below Average" score in the Culture Fair Intelligence Test which indicates ineptness in perceiving relationships between shapes and figures. ${lastName} may need a considerable time and effort to apply knowledge and to learn new things.`;
    }
    
    return interpretation;
  };

  // Get BPI interpretations based on scale and score
  const getBPIInterpretation = (scale, score) => {
    const interpretations = {
      hypochondriasis: {
        low: 'has no bodily concern',
        high: 'tends to have complaints regarding peculiar pains'
      },
      depression: {
        low: 'usual feelings of confidence, cheerfulness and persistence, even when experiencing disappointment',
        high: 'is inclined to be down-hearted and show extreme despondency'
      },
      denial: {
        low: 'accepts feelings as part of themselves',
        high: 'may lack insight into their feelings and the causes of their own behavior'
      },
      interpersonal_problems: {
        low: 'experiences less than average irritation from noise, changes in routine, disappointment, and mistakes of others',
        high: 'tends to show extreme annoyance by life\'s inconvenience, frustrations, or disappointments'
      },
      alienation: {
        low: 'ordinarily displays socially acceptable ethical attitudes and is socially responsible',
        high: 'tends to express attitudes markedly different from common social codes'
      },
      persecutory_ideas: {
        low: 'trusts others and does not feel threatened',
        high: 'tends to have difficulty trusting others'
      },
      anxiety: {
        low: 'remains calm and unruffled even when confronted by unexpected occurrences',
        high: 'tends to be easily scared. Little things, even idea, can cause a frenzy of anxiety'
      },
      thinking_disorder: {
        low: 'can generally concentrate and maintain sensible conversations',
        high: 'tends to be confused, distractible and disorganized'
      },
      impulse_expression: {
        low: 'generally has the patience to cope with lengthy and tedious tasks',
        high: 'tends to be prone to undertake risky and reckless actions'
      },
      social_introversion: {
        low: 'seeks others out and likes to talk to many people',
        high: 'tends to be uncomfortable when around others'
      },
      self_depreciation: {
        low: 'believes in their own ability to accomplish things',
        high: 'generally expresses a low opinion of themselves and refuses to take credit for any accomplishment'
      },
      deviation: {
        low: 'generally shows behavior patterns similar to those of a majority of people',
        high: 'shows behavior patterns very different from most people'
      }
    };

    return interpretations[scale] ? interpretations[scale][score] : '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('neuropsychological_tests')
        .insert([
          {
            patient_id: patientInfo.id,
            observations: formData.observations,
            mental_status_exam: formData.mental_status_exam,
            cfit_results: formData.cfit_results,
            bpi_results: formData.bpi_results,
            wss_results: formData.wss_results,
            remarks: formData.remarks,
            psychometrician_id: userId
          }
        ])
        .select();
      
      if (error) throw error;
      
      // Log audit event for test creation
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.CREATE,
        resourceType: RESOURCE_TYPES.TEST_RESULT,
        resourceId: data[0]?.id,
        description: 'Neuropsychological test record created',
        details: {
          test_id: data[0]?.id,
          test_type: 'neuropsychological',
          patient_id: patientInfo.id,
          patient_name: patientInfo.name,
          created_by_user: userId,
          user_role: userRole
        }
      });
      
      showSuccess('Neuropsychological test record saved successfully!');
      if (onSuccess) onSuccess();
    } catch (error) {
      console.error('Error saving test record:', error);
      showError('Failed to save the test record. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Define appearance options for observations
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

      {/* Added Observations Section */}
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
                          // Only allow values from 0-10
                          if (value === '' || (parseInt(value) >= 0 && parseInt(value) <= 10)) {
                            handleInputChange('mental_status_exam', 'orientation_score', value);
                          }
                        }}
                        onKeyDown={(e) => {
                          // Allow backspace, delete, arrow keys, tab, and numbers 0-9
                          const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
                          if (!allowedKeys.includes(e.key)) {
                            e.preventDefault();
                          }
                        }}
                        min="0"
                        max="10"
                        placeholder="0"
                      />
                      <span className="input-group-text">/10</span>
                    </div>
                  </td>
                  <td>
                    <div className="form-control" style={{minHeight: '60px', padding: '8px'}}>
                      The client answered {formData.mental_status_exam.orientation_score || '0'}/10 questions correctly about time and place.
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


      {/* Updated CFIT with Auto-calculation - Matching PsychologicalTestForm */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Culture Fair Intelligence Test (CFIT)</h5>
        </div>
        <div className="card-body">
          <div className="row mb-3">
            <div className="col-md-4">
              <label htmlFor="raw_score" className="form-label">Raw Score *</label>
              <input
                type="number"
                className="form-control"
                id="raw_score"
                min="1"
                max="49"
                value={formData.cfit_results.raw_score}
                onChange={(e) => {
                  handleInputChange('cfit_results', 'raw_score', e.target.value);
                  calculateCFIT(e.target.value);
                }}
                required
              />
              <small className="form-text text-muted">Enter raw score to auto-calculate IQ and percentile</small>
            </div>
            <div className="col-md-4">
              <label htmlFor="iq_equivalent" className="form-label">IQ Equivalent *</label>
              <input
                type="number"
                className="form-control"
                id="iq_equivalent"
                min="0"
                value={formData.cfit_results.iq_equivalent}
                readOnly
                required
              />
              <small className="form-text text-muted">Auto-calculated from raw score</small>
            </div>
            <div className="col-md-4">
              <label htmlFor="percentile" className="form-label">Percentile *</label>
              <input
                type="number"
                className="form-control"
                id="percentile"
                min="0"
                max="99"
                value={formData.cfit_results.percentile}
                readOnly
                required
              />
              <small className="form-text text-muted">Auto-calculated from raw score</small>
            </div>
          </div>
          
          <div className="mb-4">
            <label htmlFor="cfit_interpretation" className="form-label">Interpretation (Editable)</label>
            <textarea
              id="cfit_interpretation"
              className="form-control"
              rows="5"
              value={formData.cfit_results.interpretation}
              onChange={(e) => handleInputChange('cfit_results', 'interpretation', e.target.value)}
            ></textarea>
            <small className="form-text text-muted">Auto-generated based on IQ equivalent, but can be customized</small>
          </div>

          <div className="alert alert-info">
            <strong>IQ Classification: </strong>
            {(() => {
              const iq = parseInt(formData.cfit_results.iq_equivalent);
              if (!iq) return "Not yet determined";
              if (iq >= 130) return "Very Superior (130+)";
              if (iq >= 120) return "Superior (120-129)";
              if (iq >= 110) return "High Average (110-119)";
              if (iq >= 90) return "Average (90-109)";
              if (iq >= 80) return "Low Average (80-89)";
              if (iq >= 70) return "Borderline (70-79)";
              return "Extremely Low (Below 70)";
            })()}
          </div>
        </div>
      </div>

      {/* Modified BPI to Basic Personality Inventory */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Basic Personality Inventory (BPI)</h5>
        </div>
        <div className="card-body">
          <p className="mb-3">The client's scores in the 12 scales of Basic Personality Inventory are presented as follows:</p>
          
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead>
                <tr>
                  <th>Scale</th>
                  <th>Low Score</th>
                  <th>High Score</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(formData.bpi_results).map(([scale, value]) => {
                  // Format scale name from snake_case to Title Case
                  const label = scale
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                    
                  return (
                    <tr key={scale}>
                      <td>{label}</td>
                      <td>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name={`bpi_${scale}`}
                            id={`bpi_${scale}_low`}
                            checked={value === 'low'}
                            onChange={() => handleInputChange('bpi_results', scale, 'low')}
                          />
                          <label className="form-check-label" htmlFor={`bpi_${scale}_low`}></label>
                        </div>
                      </td>
                      <td>
                        <div className="form-check">
                          <input
                            className="form-check-input"
                            type="radio"
                            name={`bpi_${scale}`}
                            id={`bpi_${scale}_high`}
                            checked={value === 'high'}
                            onChange={() => handleInputChange('bpi_results', scale, 'high')}
                          />
                          <label className="form-check-label" htmlFor={`bpi_${scale}_high`}></label>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <h6 className="mb-3">BPI Interpretation:</h6>
            <div className="border rounded p-3">
              {Object.entries(formData.bpi_results).map(([scale, value]) => {
                // Format scale name from snake_case to Title Case
                const label = scale
                  .split('_')
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                  .join(' ');
                
                return (
                  <div key={scale} className="mb-2">
                    <strong>{label}</strong>
                    <p>- {getBPIInterpretation(scale, value)}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Updated Workplace Skills Survey to match image */}
      <div className="card mb-4">
        <div className="card-header bg-light">
          <h5 className="mb-0">Workplace Skills Survey (WSS)</h5>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Workplace Skill</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(formData.wss_results).map(([skill, value]) => {
                  // Format skill name from snake_case to Title Case
                  const label = skill
                    .split('_')
                    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                    .join(' ');
                  
                  return (
                    <tr key={skill}>
                      <td>{label}</td>
                      <td>
                        <select
                          className="form-select"
                          value={value}
                          onChange={(e) => handleInputChange('wss_results', skill, e.target.value)}
                        >
                          <option value="Poor">Poor</option>
                          <option value="Below Average">Below Average</option>
                          <option value="Average">Average</option>
                          <option value="Above Average">Above Average</option>
                          <option value="Excellent">Excellent</option>
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-4">
            <h6 className="mb-3">Workplace Skills Summary (Editable)</h6>
            <textarea
              className="form-control"
              rows="4"
              placeholder="Enter a summary of the client's workplace skills..."
            ></textarea>
          </div>
        </div>
      </div>
      
      {userRole === 'psychologist' && (
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h5 className="mb-0">Professional Remarks</h5>
          </div>
          <div className="card-body">
            <textarea
              className="form-control"
              rows="4"
              value={formData.remarks}
              onChange={(e) => handleInputChange(null, 'remarks', e.target.value)}
              placeholder="Enter professional remarks, observations, and recommendations..."
            ></textarea>
          </div>
        </div>
      )}
      
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

export default NeuropsychologicalTestForm;