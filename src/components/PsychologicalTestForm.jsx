// components/PsychologicalTestForm.jsx - Updated with Blue-filled Range Sliders
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaSave, FaCheck } from 'react-icons/fa';
import { generatePersonalityInterpretations } from '../utils/personalityInterpretationUtils';
import { useNotification } from '../contexts/NotificationContext';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const PsychologicalTestForm = ({ testId = null, onSuccess, userRole }) => {
  const navigate = useNavigate();
  const { showSuccess, showError } = useNotification();
  const [loading, setLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [availablePatients, setAvailablePatients] = useState([]);
  const [step, setStep] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [currentUser, setCurrentUser] = useState(null);
  const [currentPatient, setCurrentPatient] = useState(null);
  const [selectedPatient, setSelectedPatient] = useState(null);
  
  // Form data state
  const [formData, setFormData] = useState({
    patient_id: '',
    date_of_examination: new Date().toISOString().split('T')[0],
    // CFIT data - REORDERED: Raw Score, IQ Equivalent, Percentile
    cfit_raw_score: '',
    cfit_iq_equivalent: '',
    cfit_percentile: '',
    cfit_interpretation: '',
    // 16PF data with interpretations
    personality_factors: {
      warmth: '5',
      reasoning: '5',
      emotionalStability: '5',
      dominance: '5',
      liveliness: '5',
      ruleConsciousness: '5',
      socialBoldness: '5',
      sensitivity: '5',
      vigilance: '5',
      abstractedness: '5',
      privateness: '5',
      apprehension: '5',
      opennessToChange: '5',
      selfReliance: '5',
      perfectionism: '5',
      tension: '5'
    },
    personality_interpretations: {
      warmth: '',
      reasoning: '',
      emotionalStability: '',
      dominance: '',
      liveliness: '',
      ruleConsciousness: '',
      socialBoldness: '',
      sensitivity: '',
      vigilance: '',
      abstractedness: '',
      privateness: '',
      apprehension: '',
      opennessToChange: '',
      selfReliance: '',
      perfectionism: '',
      tension: ''
    },
    // Workplace Skills data
    workplace_skills: {
      communication: 'average',
      adaptingToChange: 'average',
      problemSolving: 'average',
      workEthics: 'average',
      technologicalLiteracy: 'average',
      teamwork: 'average',
      summary: ''
    },
    remarks: 'The psychological test result is only suggestive of central behavioral tendencies and should still be correlated with clinical findings.'
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
  
  // Utility functions for personalization (keeping only CFIT-specific ones)
  const getPronouns = (gender) => {
    if (!gender) return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves' };
    
    const normalizedGender = gender.toLowerCase();
    if (normalizedGender === 'male' || normalizedGender === 'boy') {
      return { subject: 'he', object: 'him', possessive: 'his', reflexive: 'himself' };
    } else if (normalizedGender === 'female' || normalizedGender === 'girl') {
      return { subject: 'she', object: 'her', possessive: 'her', reflexive: 'herself' };
    }
    
    return { subject: 'they', object: 'them', possessive: 'their', reflexive: 'themselves' };
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
  
  // Effects
  useEffect(() => {
    getCurrentUser();
    fetchPatients();
    
    if (testId) {
      fetchTestData();
    }
  }, [testId]);
  
  // Update personality interpretations when patient or scores change
  useEffect(() => {
    if (selectedPatient) {
      generatePersonalityInterpretationsForm();
    }
  }, [selectedPatient, formData.personality_factors]);
  
  // Fetch test data for editing
  const fetchTestData = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('psychological_tests')
        .select('*')
        .eq('id', testId)
        .single();
        
      if (error) throw error;
      
      // Update form data with fetched test data
      setFormData({
        ...formData,
        ...data
      });
    } catch (error) {
      console.error('Error fetching test data:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Get current logged in user
  const getCurrentUser = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        const currentUserId = session.session.user.id;
        setCurrentUser(session.session.user);
        
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', currentUserId)
          .single();
          
        if (userError) throw userError;
        
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', currentUserId)
          .single();
          
        if (roleError) throw roleError;
        
        const userRole = roleData?.role;
        
        if (userRole === 'psychometrician') {
          // Auto-assign current user as psychometrician if needed
        }
        
        if (userRole === 'patient') {
          const { data: patientData, error: patientError } = await supabase
            .from('personal_info')
            .select('id')
            .eq('user_id', currentUserId)
            .single();
            
          if (patientError) throw patientError;
          
          if (patientData) {
            setCurrentPatient(patientData);
            setFormData(prev => ({
              ...prev,
              patient_id: patientData.id
            }));
          }
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };
  
  // Fetch patients
  const fetchPatients = async () => {
    try {
      // Fetch all patients
      const { data: allPatients, error: patientError } = await supabase
        .from('personal_info')
        .select('id, name, age, sex')
        .order('name');

      if (patientError) throw patientError;

      setPatients(allPatients || []);

      // Fetch all psychological tests
      const { data: tests, error: testError } = await supabase
        .from('psychological_tests')
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
    }
  };
  
  
  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Clamp cfit_raw_score to 49
    if (name === 'cfit_raw_score') {
      let val = value;
      if (val === '') {
        setFormData({
          ...formData,
          [name]: ''
        });
        return;
      }
      let num = parseInt(val, 10);
      if (isNaN(num)) num = '';
      if (num > 49) num = 49;
      if (num < 1) num = 1;
      setFormData({
        ...formData,
        [name]: num
      });
      calculateCFIT(num);
      return;
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData({
        ...formData,
        [parent]: {
          ...formData[parent],
          [child]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }

    // Update selected patient
    if (name === 'patient_id') {
      const patient = patients.find(p => p.id === value);
      setSelectedPatient(patient);
    }
  };

  // Auto-calculate CFIT based on raw score
  const calculateCFIT = (rawScore) => {
    const score = parseInt(rawScore);
    if (!score || !selectedPatient) {
      setFormData(prev => ({
        ...prev,
        cfit_iq_equivalent: "0",
        cfit_percentile: "0",
        cfit_interpretation: ""
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
        cfit_iq_equivalent: iqEquivalent.toString(),
        cfit_percentile: percentile.toString(),
        cfit_interpretation: generateCFITInterpretation(iqEquivalent)
      }));
      return;
    }

    // Generate personalized interpretation
    const interpretation = generateCFITInterpretation(conversionData.iq);

    // Update form data
    setFormData(prev => ({
      ...prev,
      cfit_iq_equivalent: conversionData.iq.toString(),
      cfit_percentile: conversionData.percentile.toString(),
      cfit_interpretation: interpretation
    }));
  };

  const generateCFITInterpretation = (iqEquivalent) => {
    const pronouns = getPronouns(selectedPatient?.sex);
    const lastName = getLastName(selectedPatient?.name);
    
    let interpretation = "";
    if (iqEquivalent >= 121) {
      interpretation = `${lastName} obtained a "Superior" score on the Culture Fair Intelligence Test which indicates exceptional ability to perceive relationships in shapes and figures. This signifies high mental efficiency to acquire and use knowledge for solving problems and adapting to the world. ${lastName} is fully equipped with the ability to think abstractly and the capacity to effortlessly create solutions to ${pronouns.possessive} daily problems..`;
    } else if (iqEquivalent >= 111) {
      interpretation = `${lastName} obtained an "Above Average" score on the Culture Fair Intelligence Test which indicates an outstanding ability to perceive relationships in shapes and in figures. This signifies ${pronouns.possessive} competence involving different perceptual tasks indicative of her above average non-verbal intelligence. ${lastName} can learn new things without difficulty and apply appropriate knowledge as the situation requires.`;
    } else if (iqEquivalent >= 104) {
      interpretation = `${lastName} obtained a "High Average" score on the Culture Fair Intelligence Test which indicates a more than satisfactory ability to perceive relationships in shapes and in figures. This revealed ${pronouns.possessive} ability with different perceptual tasks that measure ${pronouns.possessive} composite non-verbal intelligence. ${lastName} can learn new things without difficulty and apply appropriate knowledge as the situation requires.`;
    } else if (iqEquivalent >= 96) {
      interpretation = `${lastName} obtained an "Average" score on the Culture Fair Intelligence Test which indicates a satisfactory ability to perceive relationships in shapes and in figures. This signifies that ${lastName} is adequately equipped with the necessary aptitude to execute job related tasks that involve cognitive ability as well as perceiving relationships in shapes and figures.`;
    } else if (iqEquivalent >= 89) {
      interpretation = `${lastName} obtained a "Low Average" score on the Culture Fair Intelligence Test which indicates a slight ineptness in perceiving relationships in shapes and in figures. ${lastName} may need a considerable time and effort to apply knowledge and to learn new things.`;
    } else if (iqEquivalent >= 79) {
      interpretation = `${lastName} obtained a "Below Average" score on the Culture Fair Intelligence Test which indicates ineptness in perceiving relationships between shapes and figures. ${lastName} may need a considerable time and effort to apply knowledge and to learn new things.`;
    } else if (iqEquivalent >= 72) {
      interpretation = `${lastName} obtained a "Low" score on the Culture Fair Intelligence Test which indicates ineptness in perceiving relationships between shapes and figures. ${lastName} may need a considerable time and effort to apply knowledge and to learn new things.`;
    } else if (iqEquivalent >= 1) {
      interpretation = `${lastName} obtained a "Very Low" score on the Culture Fair Intelligence Test which indicates ineptness in perceiving relationships between shapes and figures. ${lastName} may need a considerable time and effort to apply knowledge and to learn new things.`;
    } else {
      interpretation = `${lastName} obtained a score outside the standard range for the Culture Fair Intelligence Test.`;
    }
    
    return interpretation;
  };
  
  // Generate personality interpretations based on scores
  const generatePersonalityInterpretationsForm = () => {
    if (!selectedPatient) return;
    
    const interpretations = generatePersonalityInterpretations(
      formData.personality_factors,
      selectedPatient.name,
      selectedPatient.sex
    );
    
    setFormData(prev => ({
      ...prev,
      personality_interpretations: interpretations
    }));
  };
  
  // Generate workplace skills summary
  const generateWorkplaceSkillsSummary = () => {
    const { workplace_skills } = formData;
    
    // Count occurrences of each rating
    const ratings = {
      above_average: 0,
      average: 0,
      below_average: 0
    };
    
    ['communication', 'adaptingToChange', 'problemSolving', 'workEthics', 'technologicalLiteracy', 'teamwork'].forEach(skill => {
      if (workplace_skills[skill]) {
        ratings[workplace_skills[skill]]++;
      }
    });
    
    // Determine overall rating
    let overallRating;
    if (ratings.above_average > ratings.below_average && ratings.above_average >= ratings.average) {
      overallRating = "above_average";
    } else if (ratings.below_average > ratings.above_average && ratings.below_average >= ratings.average) {
      overallRating = "below_average";
    } else {
      overallRating = "average";
    }
    
    // Generate personalized summary
    let summary = "";
    if (selectedPatient) {
      const lastName = getLastName(selectedPatient.name);
      const pronouns = getPronouns(selectedPatient.sex);
      
      if (overallRating === "above_average") {
        summary = `${lastName} obtained a composite rating of "Above Average." This signifies that ${lastName} has competence and the necessary abilities and skills needed in the different areas of workplace success across industries and job levels.`;
      } else if (overallRating === "below_average") {
        summary = `${lastName} obtained a composite rating of "Below Average". This signifies that ${lastName} has significant limitations in the different areas of workplace success across industries and job levels.`;
      } else {
        summary = `${lastName} obtained a composite rating of "Average." This signifies that though ${lastName} has the necessary abilities and skills needed in the different areas of workplace success across industries and job levels, further improvement and development is needed.`;
      }
    }
    
    // Update the formData with the new summary
    setFormData({
      ...formData,
      workplace_skills: {
        ...workplace_skills,
        summary: summary
      }
    });
  };
  
  // Validate form
  const validateForm = () => {
    const errors = {};
    
    if (!formData.patient_id) errors.patient_id = 'Patient is required';
    
    if (step === 2) {
      if (!formData.cfit_raw_score) errors.cfit_raw_score = 'Raw score is required';
      if (!formData.cfit_iq_equivalent) errors.cfit_iq_equivalent = 'IQ Equivalent is required';
      if (!formData.cfit_percentile) errors.cfit_percentile = 'Percentile is required';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // Handle submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    
    try {
      setLoading(true);
      
      // Generate workplace skills summary if not set
      if (!formData.workplace_skills.summary) {
        generateWorkplaceSkillsSummary();
      }
      
      // Prepare data for saving
      const testData = {
        patient_id: formData.patient_id,
        cfit_raw_score: formData.cfit_raw_score,
        cfit_percentile: formData.cfit_percentile,
        cfit_iq_equivalent: formData.cfit_iq_equivalent,
        cfit_interpretation: formData.cfit_interpretation,
        personality_factors: formData.personality_factors,
        personality_interpretations: formData.personality_interpretations,
        workplace_skills: formData.workplace_skills,
        workplace_skills_interpretation: formData.workplace_skills.summary,
        remarks: formData.remarks,
        updated_at: new Date()
      };
      
      if (testId) {
        const { error } = await supabase
          .from('psychological_tests')
          .update(testData)
          .eq('id', testId);
          
        if (error) throw error;
      } else {
        testData.created_at = new Date();
        
        const { data, error } = await supabase
          .from('psychological_tests')
          .insert([testData])
          .select();
          
        if (error) throw error;
        
        // Log audit event for test creation
        await logAuditEvent({
          actionType: AUDIT_ACTIONS.CREATE,
          resourceType: RESOURCE_TYPES.TEST_RESULT,
          resourceId: data[0]?.id,
          description: 'Psychological test record created',
          details: {
            test_id: data[0]?.id,
            test_type: 'psychological',
            patient_id: testData.patient_id,
            created_by_user: testData.psychologist_id,
            user_role: userRole
          }
        });
        
        console.log('New test created:', data);
      }
      
      showSuccess('Test data saved successfully!');
      
      if (onSuccess) {
        onSuccess();
      } else {
        navigate('/psychological-tests');
      }
    } catch (error) {
      console.error('Error saving test data:', error);
      showError('Failed to save test data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Move to next/previous step
  const nextStep = () => {
    if (validateForm()) {
      setStep(step + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  const prevStep = () => {
    setStep(step - 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Render patient info step
  const renderPatientInfo = () => {
    return (
      <div className="patient-info-step">
        <h5 className="mb-4">Patient Information</h5>
        
        <div className="mb-3">
          <label htmlFor="patient_id" className="form-label">Patient *</label>
          <select
            id="patient_id"
            name="patient_id"
            className={`form-select ${formErrors.patient_id ? 'is-invalid' : ''}`}
            value={formData.patient_id}
            onChange={handleInputChange}
            disabled={userRole === 'patient'}
            required
          >
            <option value="">Select Patient</option>
            {availablePatients.map(patient => (
              <option key={patient.id} value={patient.id}>
                {patient.name} ({patient.age} / {patient.sex})
              </option>
            ))}
          </select>
          {formErrors.patient_id && (
            <div className="invalid-feedback">{formErrors.patient_id}</div>
          )}
        </div>
        
        <div className="mb-3">
          <label htmlFor="date_of_examination" className="form-label">Date of Examination</label>
          <input
            type="date"
            id="date_of_examination"
            name="date_of_examination"
            className="form-control"
            value={formData.date_of_examination}
            onChange={handleInputChange}
          />
        </div>
        
        
        <div className="d-flex justify-content-end mt-4">
          <button
            type="button"
            className="btn btn-primary"
            onClick={nextStep}
          >
            Next <FaArrowRight className="ms-1" />
          </button>
        </div>
      </div>
    );
  };
  
  // Render CFIT step - UPDATED with auto-calculation and reordered fields
  const renderCFITData = () => {
    return (
      <div className="cfit-data-step">
        <h5 className="mb-4">Culture Fair Intelligence Test (CFIT)</h5>
        
        <div className="row mb-3">
          <div className="col-md-4">
            <label htmlFor="cfit_raw_score" className="form-label">Raw Score *</label>
            <input
              type="number"
              id="cfit_raw_score"
              name="cfit_raw_score"
              className={`form-control ${formErrors.cfit_raw_score ? 'is-invalid' : ''}`}
              value={formData.cfit_raw_score}
              onChange={(e) => {
                handleInputChange(e);
                calculateCFIT(e.target.value);
              }}
              required
              min="1"
              max="49" // <-- Limit raw score to 49 only
            />
            {formErrors.cfit_raw_score && (
              <div className="invalid-feedback">{formErrors.cfit_raw_score}</div>
            )}
            <small className="form-text text-muted">Enter raw score to auto-calculate IQ and percentile</small>
          </div>
          
          <div className="col-md-4">
            <label htmlFor="cfit_iq_equivalent" className="form-label">IQ Equivalent *</label>
            <input
              type="number"
              id="cfit_iq_equivalent"
              name="cfit_iq_equivalent"
              className={`form-control ${formErrors.cfit_iq_equivalent ? 'is-invalid' : ''}`}
              value={formData.cfit_iq_equivalent}
              readOnly // <-- Make this field read-only
              required
            />
            {formErrors.cfit_iq_equivalent && (
              <div className="invalid-feedback">{formErrors.cfit_iq_equivalent}</div>
            )}
            <small className="form-text text-muted">Auto-calculated from raw score</small>
          </div>
          
          <div className="col-md-4">
            <label htmlFor="cfit_percentile" className="form-label">Percentile *</label>
            <input
              type="number"
              id="cfit_percentile"
              name="cfit_percentile"
              className={`form-control ${formErrors.cfit_percentile ? 'is-invalid' : ''}`}
              value={formData.cfit_percentile}
              readOnly // <-- Make this field read-only
              required
            />
            {formErrors.cfit_percentile && (
              <div className="invalid-feedback">{formErrors.cfit_percentile}</div>
            )}
            <small className="form-text text-muted">Auto-calculated from raw score</small>
          </div>
        </div>
        
        <div className="mb-4">
          <label htmlFor="cfit_interpretation" className="form-label">Interpretation (Editable)</label>
          <textarea
            id="cfit_interpretation"
            name="cfit_interpretation"
            className="form-control"
            rows="5"
            value={formData.cfit_interpretation}
            onChange={handleInputChange}
          ></textarea>
          <small className="form-text text-muted">Auto-generated based on IQ equivalent, but can be customized</small>
        </div>

        <div className="alert alert-info">
          <strong>IQ Classification: </strong>
          {(() => {
            const iq = parseInt(formData.cfit_iq_equivalent);
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
        
        <div className="d-flex justify-content-between mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={prevStep}
          >
            <FaArrowLeft className="me-1" /> Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={nextStep}
          >
            Next <FaArrowRight className="ms-1" />
          </button>
        </div>
      </div>
    );
  };
  
  // Render personality factors step with enhanced blue-filled range sliders
  const renderPersonalityData = () => {
    const personalityFactors = [
      { key: 'warmth', label: 'A (Warmth)' },
      { key: 'reasoning', label: 'B (Reasoning)' },
      { key: 'emotionalStability', label: 'C (Emotional Stability)' },
      { key: 'dominance', label: 'E (Dominance)' },
      { key: 'liveliness', label: 'F (Liveliness)' },
      { key: 'ruleConsciousness', label: 'G (Rule-Consciousness)' },
      { key: 'socialBoldness', label: 'H (Social Boldness)' },
      { key: 'sensitivity', label: 'I (Sensitivity)' },
      { key: 'vigilance', label: 'L (Vigilance)' },
      { key: 'abstractedness', label: 'M (Abstractedness)' },
      { key: 'privateness', label: 'N (Privateness)' },
      { key: 'apprehension', label: 'O (Apprehension)' },
      { key: 'opennessToChange', label: 'Q1 (Openness to Change)' },
      { key: 'selfReliance', label: 'Q2 (Self-Reliance)' },
      { key: 'perfectionism', label: 'Q3 (Perfectionism)' },
      { key: 'tension', label: 'Q4 (Tension)' }
    ];

    return (
      <div className="personality-data-step">
        <style jsx>{`
          /* Enhanced range slider styling with blue fill */
          .custom-range-wrapper {
            position: relative;
            margin: 15px 0;
          }
          
          .custom-range {
            -webkit-appearance: none;
            appearance: none;
            width: 100%;
            height: 8px;
            border-radius: 5px;
            background: #e9ecef;
            outline: none;
            opacity: 0.7;
            transition: opacity 0.2s;
            cursor: pointer;
          }
          
          .custom-range:hover {
            opacity: 1;
          }
          
          .custom-range::-webkit-slider-thumb {
            -webkit-appearance: none;
            appearance: none;
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #007bff;
            cursor: pointer;
            border: 2px solid #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
          }
          
          .custom-range::-webkit-slider-thumb:hover {
            background: #0056b3;
            transform: scale(1.1);
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
          }
          
          .custom-range::-moz-range-thumb {
            width: 20px;
            height: 20px;
            border-radius: 50%;
            background: #007bff;
            cursor: pointer;
            border: 2px solid #fff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            transition: all 0.2s ease;
          }
          
          .custom-range::-moz-range-thumb:hover {
            background: #0056b3;
            transform: scale(1.1);
            box-shadow: 0 3px 6px rgba(0,0,0,0.3);
          }
          
          /* Blue fill track effect */
          .range-fill {
            position: absolute;
            top: 50%;
            left: 0;
            height: 8px;
            background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
            border-radius: 5px;
            transform: translateY(-50%);
            transition: width 0.2s ease;
            pointer-events: none;
            z-index: 1;
          }
          
          .custom-range {
            position: relative;
            z-index: 2;
            background: transparent;
          }
          
          .range-track {
            position: absolute;
            top: 50%;
            left: 0;
            width: 100%;
            height: 8px;
            background: #e9ecef;
            border-radius: 5px;
            transform: translateY(-50%);
            z-index: 0;
          }
          
          .range-labels {
            display: flex;
            justify-content: space-between;
            margin-top: 8px;
            font-size: 0.75rem;
            color: #6c757d;
          }
          
          .score-display {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: 35px;
            height: 35px;
            background: linear-gradient(135deg, #007bff, #0056b3);
            color: white;
            border-radius: 50%;
            font-weight: bold;
            font-size: 1rem;
            margin-left: 15px;
            box-shadow: 0 2px 4px rgba(0,123,255,0.3);
            transition: all 0.2s ease;
          }
          
          .score-display:hover {
            transform: scale(1.05);
            box-shadow: 0 3px 6px rgba(0,123,255,0.4);
          }
          
          .factor-row {
            padding: 20px;
            margin-bottom: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #007bff;
            transition: all 0.3s ease;
          }
          
          .factor-row:hover {
            background: #e3f2fd;
            box-shadow: 0 2px 8px rgba(0,123,255,0.1);
          }
          
          .factor-label {
            font-weight: 600;
            color: #495057;
            margin-bottom: 8px;
            display: block;
          }
          
          .interpretation-textarea {
            transition: all 0.2s ease;
            border: 1px solid #ced4da;
          }
          
          .interpretation-textarea:focus {
            border-color: #007bff;
            box-shadow: 0 0 0 0.2rem rgba(0,123,255,0.25);
          }

          @media print {
            .custom-range-wrapper, .score-display, .factor-row {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
        `}</style>
        
        <h5 className="mb-4">16 Personality Factors (16PF)</h5>
        <p className="text-muted mb-4">
          Adjust the sliders to set scores for each personality factor. The blue portion represents the current score level.
        </p>
        
        <div className="personality-factors-container">
          {personalityFactors.map(({ key, label }) => {
            const currentValue = parseInt(formData.personality_factors[key]);
            const fillWidth = ((currentValue - 1) / 9) * 100; // Convert 1-10 scale to percentage
            
            return (
              <div key={key} className="factor-row">
                <div className="row align-items-center">
                  <div className="col-md-2">
                    <label className="factor-label">{label}</label>
                  </div>
                  <div className="col-md-3">
                    <div className="custom-range-wrapper">
                      <div className="range-track"></div>
                      <div 
                        className="range-fill" 
                        style={{ width: `${fillWidth}%` }}
                      ></div>
                      <input
                        type="range"
                        className="custom-range"
                        min="1"
                        max="10"
                        step="1"
                        id={`personality_factors.${key}`}
                        name={`personality_factors.${key}`}
                        value={formData.personality_factors[key]}
                        onChange={handleInputChange}
                      />
                      <div className="range-labels">
                        <span>1</span>
                        <span>5</span>
                        <span>10</span>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-1">
                    <div className="score-display">
                      {formData.personality_factors[key]}
                    </div>
                  </div>
                  <div className="col-md-6">
                    <textarea
                      className="form-control interpretation-textarea"
                      rows="2"
                      name={`personality_interpretations.${key}`}
                      value={formData.personality_interpretations[key]}
                      onChange={handleInputChange}
                      placeholder={`Enter interpretation for ${label.toLowerCase()}...`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="alert alert-info mt-4">
          <h6 className="alert-heading">Scoring Guide:</h6>
          <div className="row">
            <div className="col-md-6">
              <strong>Low Scores (1-5):</strong> Generally indicate one end of the personality dimension
            </div>
            <div className="col-md-6">
              <strong>High Scores (6-10):</strong> Generally indicate the opposite end of the personality dimension
            </div>
          </div>
        </div>
        
        <div className="d-flex justify-content-between mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={prevStep}
          >
            <FaArrowLeft className="me-1" /> Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={nextStep}
          >
            Next <FaArrowRight className="ms-1" />
          </button>
        </div>
      </div>
    );
  };
  
  // Render workplace skills step
  const renderWorkplaceSkills = () => {
    return (
      <div className="workplace-skills-step">
        <h5 className="mb-4">Workplace Skills Survey (WSS)</h5>
        
        <div className="card mb-4">
          <div className="card-body">
            <table className="table table-bordered">
              <thead className="table-light">
                <tr>
                  <th>Workplace Skill</th>
                  <th>Rating</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Communication</td>
                  <td>
                    <select
                      className="form-select"
                      id="workplace_skills.communication"
                      name="workplace_skills.communication"
                      value={formData.workplace_skills.communication}
                      onChange={handleInputChange}
                    >
                      <option value="below_average">Below Average</option>
                      <option value="average">Average</option>
                      <option value="above_average">Above Average</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Adapting to Change</td>
                  <td>
                    <select
                      className="form-select"
                      id="workplace_skills.adaptingToChange"
                      name="workplace_skills.adaptingToChange"
                      value={formData.workplace_skills.adaptingToChange}
                      onChange={handleInputChange}
                    >
                      <option value="below_average">Below Average</option>
                      <option value="average">Average</option>
                      <option value="above_average">Above Average</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Problem Solving</td>
                  <td>
                    <select
                      className="form-select"
                      id="workplace_skills.problemSolving"
                      name="workplace_skills.problemSolving"
                      value={formData.workplace_skills.problemSolving}
                      onChange={handleInputChange}
                    >
                      <option value="below_average">Below Average</option>
                      <option value="average">Average</option>
                      <option value="above_average">Above Average</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Work Ethics</td>
                  <td>
                    <select
                      className="form-select"
                      id="workplace_skills.workEthics"
                      name="workplace_skills.workEthics"
                      value={formData.workplace_skills.workEthics}
                      onChange={handleInputChange}
                    >
                      <option value="below_average">Below Average</option>
                      <option value="average">Average</option>
                      <option value="above_average">Above Average</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Technological Literacy</td>
                  <td>
                    <select
                      className="form-select"
                      id="workplace_skills.technologicalLiteracy"
                      name="workplace_skills.technologicalLiteracy"
                      value={formData.workplace_skills.technologicalLiteracy}
                      onChange={handleInputChange}
                    >
                      <option value="below_average">Below Average</option>
                      <option value="average">Average</option>
                      <option value="above_average">Above Average</option>
                    </select>
                  </td>
                </tr>
                <tr>
                  <td>Teamwork</td>
                  <td>
                    <select
                      className="form-select"
                      id="workplace_skills.teamwork"
                      name="workplace_skills.teamwork"
                      value={formData.workplace_skills.teamwork}
                      onChange={handleInputChange}
                    >
                      <option value="below_average">Below Average</option>
                      <option value="average">Average</option>
                      <option value="above_average">Above Average</option>
                    </select>
                  </td>
                </tr>
              </tbody>
            </table>
            
            <div className="mt-3">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={generateWorkplaceSkillsSummary}
              >
                Generate Summary <FaCheck className="ms-1" />
              </button>
            </div>
          </div>
        </div>
        
        <div className="mb-3">
          <label htmlFor="workplace_skills.summary" className="form-label">Workplace Skills Summary (Editable)</label>
          <textarea
            className="form-control"
            id="workplace_skills.summary"
            name="workplace_skills.summary"
            rows="5"
            value={formData.workplace_skills.summary}
            onChange={handleInputChange}
          ></textarea>
          <small className="form-text text-muted">Click "Generate Summary" or write a custom summary</small>
        </div>
        
        <div className="mb-3">
          <label htmlFor="remarks" className="form-label">Remarks</label>
          <textarea
            className="form-control"
            id="remarks"
            name="remarks"
            rows="3"
            value={formData.remarks}
            onChange={handleInputChange}
          ></textarea>
        </div>
        
        <div className="d-flex justify-content-between mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={prevStep}
          >
            <FaArrowLeft className="me-1" /> Back
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={nextStep}
          >
            Next <FaArrowRight className="ms-1" /> Preview Report
          </button>
        </div>
      </div>
    );
  };
  
  // Render preview step
  const renderPreview = () => {
    const patient = patients.find(p => p.id === formData.patient_id);
    
    return (
      <div className="preview-step">
        <h5 className="mb-4">Preview & Submit Test Results</h5>
        
        <div className="card mb-3">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">Patient Information</h6>
          </div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <p><strong>Name:</strong> {patient?.name}</p>
                <p><strong>Age:</strong> {patient?.age}</p>
                <p><strong>Sex:</strong> {patient?.sex}</p>
              </div>
              <div className="col-md-6">
                <p><strong>Date of Examination:</strong> {formData.date_of_examination}</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="card mb-3">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">Culture Fair Intelligence Test (CFIT)</h6>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-4">
                <strong>Raw Score:</strong> {formData.cfit_raw_score}
              </div>
              <div className="col-md-4">
                <strong>IQ Equivalent:</strong> {formData.cfit_iq_equivalent}
              </div>
              <div className="col-md-4">
                <strong>Percentile:</strong> {formData.cfit_percentile}
              </div>
            </div>
            <div>
              <strong>Interpretation:</strong>
              <p className="mt-2">{formData.cfit_interpretation}</p>
            </div>
          </div>
        </div>
        
        <div className="card mb-3">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">16 Personality Factors (16PF)</h6>
          </div>
          <div className="card-body">
            {Object.entries(formData.personality_factors).map(([factor, score]) => {
              const interpretation = formData.personality_interpretations[factor];
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
              
              return (
                <div key={factor} className="mb-3">
                  <strong>{factorLabels[factor]}: Score {score}</strong>
                  {interpretation && <p className="ms-3">{interpretation}</p>}
                </div>
              );
            })}
          </div>
        </div>
        
        <div className="card mb-3">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">Workplace Skills Survey (WSS)</h6>
          </div>
          <div className="card-body">
            <div className="mb-3">
              <strong>Ratings:</strong>
              <ul>
                <li>Communication: {formData.workplace_skills.communication.replace('_', ' ')}</li>
                <li>Adapting to Change: {formData.workplace_skills.adaptingToChange.replace('_', ' ')}</li>
                <li>Problem Solving: {formData.workplace_skills.problemSolving.replace('_', ' ')}</li>
                <li>Work Ethics: {formData.workplace_skills.workEthics.replace('_', ' ')}</li>
                <li>Technological Literacy: {formData.workplace_skills.technologicalLiteracy.replace('_', ' ')}</li>
                <li>Teamwork: {formData.workplace_skills.teamwork.replace('_', ' ')}</li>
              </ul>
            </div>
            <div>
              <strong>Summary:</strong>
              <p>{formData.workplace_skills.summary}</p>
            </div>
          </div>
        </div>
        
        <div className="card mb-3">
          <div className="card-header bg-primary text-white">
            <h6 className="mb-0">Remarks</h6>
          </div>
          <div className="card-body">
            <p>{formData.remarks}</p>
          </div>
        </div>
        
        <div className="d-flex justify-content-between mt-4">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={prevStep}
          >
            <FaArrowLeft className="me-1" /> Back
          </button>
          <button
            type="submit"
            className="btn btn-success"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-1" /> Save Test Report
              </>
            )}
          </button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="psychological-test-form">
      <h4 className="mb-4">{testId ? 'Edit Psychological Test' : 'New Psychological Test'}</h4>
      
      <div className="progress mb-4">
        <div 
          className="progress-bar" 
          role="progressbar" 
          style={{ width: `${(step / 5) * 100}%` }}
          aria-valuenow={step} 
          aria-valuemin="1" 
          aria-valuemax="5"
        >
          Step {step} of 5
        </div>
      </div>
      
      <div className="card">
        <div className="card-body">
          <form onSubmit={handleSubmit}>
            {step === 1 && renderPatientInfo()}
            {step === 2 && renderCFITData()}
            {step === 3 && renderPersonalityData()}
            {step === 4 && renderWorkplaceSkills()}
            {step === 5 && renderPreview()}
          </form>
        </div>
      </div>
    </div>
  );
};

export default PsychologicalTestForm;