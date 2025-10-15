// Full updated PsychologicalTestReport.jsx with consistent styling

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FaPrint, FaDownload } from 'react-icons/fa';
import { generatePersonalityInterpretations } from '../utils/personalityInterpretationUtils';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const PsychologicalTestReport = ({ testId, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testData, setTestData] = useState(null);
  const [patientData, setPatientData] = useState(null);
  const [staff, setStaff] = useState({
    psychometrician: null,
    psychologist: null
  });
  
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
    if (!fullName) return 'Client';
    
    // Assumes format "Last, First Middle"
    const parts = fullName.split(',');
    if (parts.length > 1) {
      return parts[0].trim();
    }
    
    // If not in that format, try to get last word
    const nameParts = fullName.split(' ');
    return nameParts[nameParts.length - 1].trim();
  };
  
  // Personalize text with proper pronouns and names
  const personalizeText = (text) => {
    if (!text) return '';
    
    const pronouns = getPronouns(patientData?.sex);
    const lastName = getLastName(patientData?.name);
    
    return text
      .replace(/The Client/g, lastName)
      .replace(/the client/g, lastName.toLowerCase())
      .replace(/\bshe\/he\b/g, pronouns.subject)
      .replace(/\bher\/his\b/g, pronouns.possessive)
      .replace(/\bher\/him\b/g, pronouns.object);
  };
  
  useEffect(() => {
    if (testId) {
      fetchTestData();
    }
  }, [testId]);
  
  const fetchTestData = async () => {
    try {
      setLoading(true);
      
      // Fetch test data with related patient info
      const { data, error } = await supabase
        .from('psychological_tests')
        .select(`
          *,
          personal_info:patient_id (*),
          psychometrician:psychometrician_id (id, full_name),
          psychologist:psychologist_id (id, full_name)
        `)
        .eq('id', testId)
        .single();
        
      if (error) throw error;
      
      // Debug: Log what we're getting from the database
      console.log('Raw data from database:', data);
      console.log('personality_interpretations field:', data.personality_interpretations);
      console.log('personality_interpretation field:', data.personality_interpretation);
      
      // Ensure JSON fields are properly parsed
      if (typeof data.personality_factors === 'string') {
        data.personality_factors = JSON.parse(data.personality_factors);
      }
      if (typeof data.personality_interpretations === 'string') {
        data.personality_interpretations = JSON.parse(data.personality_interpretations);
      }
      if (typeof data.workplace_skills === 'string') {
        data.workplace_skills = JSON.parse(data.workplace_skills);
      }
      
      setTestData(data);
      setPatientData(data.personal_info);
      
      // Set staff data
      setStaff({
        psychometrician: data.psychometrician,
        psychologist: data.psychologist
      });
    } catch (error) {
      console.error('Error fetching test data:', error);
      setError('Failed to load test data: ' + error.message);
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrint = async () => {
    // Log audit event for print action
    await logAuditEvent({
      actionType: AUDIT_ACTIONS.PRINT,
      resourceType: RESOURCE_TYPES.TEST_RESULT,
      resourceId: testId,
      description: 'Psychological test report printed',
      details: {
        test_id: testId,
        test_type: 'psychological',
        patient_id: patientData?.id,
        patient_name: patientData?.name,
        print_type: 'test_report'
      }
    });
    
    window.print();
  };
  
  const handleDownloadPDF = async () => {
    const reportElement = document.getElementById('psychological-report');
    
    if (!reportElement) {
      alert('Report element not found!');
      return;
    }
    
    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pdfWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let position = 0;
      
      while (position < canvas.height) {
        if (position > 0) {
          pdf.addPage();
        }
        
        pdf.addImage(
          imgData,
          'JPEG',
          0,
          0,
          imgWidth,
          imgHeight,
          null,
          'FAST',
          0,
          position / canvas.height
        );
        
        position += (pdfHeight * canvas.width) / imgWidth;
      }
      
      const fileName = `psychological_report_${patientData?.name.replace(/\s+/g, '_')}.pdf`;
      
      // Log audit event for PDF download
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.DOWNLOAD,
        resourceType: RESOURCE_TYPES.TEST_RESULT,
        resourceId: testId,
        description: 'Psychological test report downloaded as PDF',
        details: {
          test_id: testId,
          test_type: 'psychological',
          patient_id: patientData?.id,
          patient_name: patientData?.name,
          file_name: fileName,
          file_type: 'PDF',
          download_type: 'test_report'
        }
      });
      
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };
  
  const getPersonalityFactors = () => {
    if (!testData) return {};
    if (!testData.personality_factors) return {};
    
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
    if (!testData || !patientData) return {};
    
    // Generate interpretations dynamically using the same logic as the form
    const personalityFactors = getPersonalityFactors();
    return generatePersonalityInterpretations(
      personalityFactors, 
      patientData.name, 
      patientData.sex
    );
  };
  
  const getWorkplaceSkills = () => {
    if (!testData) return {};
    if (!testData.workplace_skills) return {};
    
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
  
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '70vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        {error}
      </div>
    );
  }
  
  if (!testData || !patientData) {
    return (
      <div className="alert alert-warning" role="alert">
        Test data or patient information not found.
      </div>
    );
  }
  
  const personalityFactors = getPersonalityFactors();
  const personalityInterpretations = getPersonalityInterpretations();
  const workplaceSkills = getWorkplaceSkills();
  const pronouns = getPronouns(patientData.sex);
  const lastName = getLastName(patientData.name);
  
  return (
    <div className="psychological-test-report">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">Psychological Test Results Report</h4>
        <div>
          <button 
            className="btn btn-outline-primary me-2" 
            onClick={handlePrint}
          >
            <FaPrint className="me-2" /> Print Report
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleDownloadPDF}
          >
            <FaDownload className="me-2" /> Download PDF
          </button>
        </div>
      </div>
      
      <div id="psychological-report" className="report-container">
        <div className="report-header text-center mb-4">
          <div className="d-flex align-items-center justify-content-between mb-2">
            <div className="logo">
              {/* Logo can be added here */}
            </div>
            <div className="flex-grow-1 text-center">
              <h2 className="mb-0">MS GOROSPE</h2>
              <p className="mb-0 fst-italic">Psychological Assessment Center</p>
              <p className="mb-0 fst-italic">"Your Partner in Building Your Human Capital"</p>
              <p className="mb-0 small">2nd Floor Bantay Arcade, Barangay VI, Roxas Dike, Bantay, Ilocos Sur</p>
              <p className="mb-0 small">Contact No: (077-674-0984) Email: msgorospepac@gmail.com</p>
            </div>
            <div className="confidential text-end">
              <h6 className="border border-danger p-2">STRICTLY CONFIDENTIAL</h6>
            </div>
          </div>
          <hr />
          <h3 className="report-title mt-4 mb-4">PSYCHOLOGICAL TEST RESULTS REPORT</h3>
        </div>
        
        <div className="patient-info mb-4">
          <h5 className="section-title bg-light">Personal Information</h5>
          <table className="table table-bordered">
            <tbody>
              <tr>
                <td width="25%"><strong>NAME:</strong> {patientData.name?.toUpperCase()}</td>
                <td width="25%"><strong>AGE:</strong> {patientData.age}</td>
                <td width="25%"><strong>SEX:</strong> {patientData.sex?.toUpperCase()}</td>
                <td width="25%"><strong>CIVIL STATUS:</strong> {patientData.civil_status?.toUpperCase()}</td>
              </tr>
              <tr>
                <td><strong>DATE OF BIRTH:</strong> {patientData.date_of_birth ? new Date(patientData.date_of_birth).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: '2-digit' 
                }).toUpperCase() : 'N/A'}</td>
                <td colSpan="3"><strong>PLACE OF BIRTH:</strong> {patientData.place_of_birth?.toUpperCase()}</td>
              </tr>
              <tr>
                <td><strong>NATIONALITY:</strong> {patientData.nationality?.toUpperCase()}</td>
                <td><strong>RELIGION:</strong> {patientData.religion?.toUpperCase()}</td>
                <td colSpan="2"><strong>OCCUPATION:</strong> {patientData.occupation?.toUpperCase()}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>ADDRESS:</strong> {patientData.address?.toUpperCase()}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>EDUCATIONAL ATTAINMENT:</strong> {patientData.educational_attainment?.toUpperCase()}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>PURPOSE OF EXAMINATION:</strong> {patientData.purpose_of_examination?.toUpperCase()}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>DATE OF EXAMINATION:</strong> {testData.date_of_examination ? new Date(testData.date_of_examination).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: '2-digit' 
                }).toUpperCase() : 'N/A'}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>AGENCY/AFFILIATION:</strong> {patientData.agency_affiliation?.toUpperCase()}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="tests-administered mb-4">
          <h5 className="section-title bg-light">Tests Administered</h5>
          <p>The tests administered to {lastName} were:</p>
          <ol type="a">
            <li><strong>Culture Fair Intelligence Test (CFIT)</strong> - to measure intellectual capacity; and</li>
            <li><strong>16 Personality Factor (16PF)</strong> - to describe a person's behavior in a variety of contexts.</li>
            <li><strong>Workplace Skill Survey (WSS)</strong> - to assess one's basic employment skills.</li>
          </ol>
        </div>
        
        <div className="results mb-4">
          <h5 className="section-title bg-light">Results</h5>
          
          <h6 className="mb-3">a. Culture Fair Intelligence Test (CFIT)</h6>
          <table className="table table-bordered mb-3">
            <thead className="table-light">
              <tr>
                <th className="text-center">CFIT – Scale 3<br />Form A</th>
                <th className="text-center">Raw Score</th>
                <th className="text-center">Percentile</th>
                <th className="text-center">IQ Equivalent</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td></td>
                <td className="text-center">{testData.cfit_raw_score || 'N/A'}</td>
                <td className="text-center">{testData.cfit_percentile || 'N/A'}</td>
                <td className="text-center">{testData.cfit_iq_equivalent || 'N/A'}</td>
              </tr>
            </tbody>
          </table>
          
          <p className="interpretation">
            {personalizeText(testData.cfit_interpretation) || 'No interpretation available.'}
          </p>
          
          <h6 className="mb-3">b. 16 Personality Factors</h6>
          <table className="table table-bordered mb-3">
            <thead className="table-light">
              <tr>
                <th rowSpan="2">FACTORS</th>
                <th colSpan="10" className="text-center">Standard Ten Score (STEN)</th>
              </tr>
              <tr>
                <th className="text-center">1</th>
                <th className="text-center">2</th>
                <th className="text-center">3</th>
                <th className="text-center">4</th>
                <th className="text-center">5</th>
                <th className="text-center">6</th>
                <th className="text-center">7</th>
                <th className="text-center">8</th>
                <th className="text-center">9</th>
                <th className="text-center">10</th>
              </tr>
            </thead>
            <tbody>
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
                
                return (
                  <tr key={key}>
                    <td>{factorLabels[key] || key}</td>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(i => (
                      <td key={i} className="text-center">
                        {score === i ? 'X' : ''}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          <h6 className="mb-3">16PF Interpretations</h6>
          <div className="personality-interpretations">
            {Object.entries(personalityFactors).map(([factor, score]) => {
              const interpretation = personalityInterpretations[factor];
              if (!interpretation) return null;
              
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
                <div key={factor} className="mb-2">
                  <strong>{factorLabels[factor]}:</strong> Score {score} - {interpretation}
                </div>
              );
            })}
          </div>
          
          <h6 className="mb-3 mt-4">c. Workplace Skills Survey</h6>
          <table className="table table-bordered mb-3">
            <thead className="table-light">
              <tr>
                <th>Workplace Skill</th>
                <th>Below Average</th>
                <th>Average</th>
                <th>Above Average</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Communication</td>
                <td className="text-center">{workplaceSkills.communication === 'below_average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.communication === 'average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.communication === 'above_average' ? 'X' : ''}</td>
              </tr>
              <tr>
                <td>Adapting to Change</td>
                <td className="text-center">{workplaceSkills.adaptingToChange === 'below_average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.adaptingToChange === 'average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.adaptingToChange === 'above_average' ? 'X' : ''}</td>
              </tr>
              <tr>
                <td>Problem Solving</td>
                <td className="text-center">{workplaceSkills.problemSolving === 'below_average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.problemSolving === 'average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.problemSolving === 'above_average' ? 'X' : ''}</td>
              </tr>
              <tr>
                <td>Work Ethics</td>
                <td className="text-center">{workplaceSkills.workEthics === 'below_average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.workEthics === 'average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.workEthics === 'above_average' ? 'X' : ''}</td>
              </tr>
              <tr>
                <td>Technological Literacy</td>
                <td className="text-center">{workplaceSkills.technologicalLiteracy === 'below_average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.technologicalLiteracy === 'average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.technologicalLiteracy === 'above_average' ? 'X' : ''}</td>
              </tr>
              <tr>
                <td>Teamwork</td>
                <td className="text-center">{workplaceSkills.teamwork === 'below_average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.teamwork === 'average' ? 'X' : ''}</td>
                <td className="text-center">{workplaceSkills.teamwork === 'above_average' ? 'X' : ''}</td>
              </tr>
              <tr>
                <td colSpan="4">
                  <strong>Summary:</strong> {personalizeText(workplaceSkills.summary) || 'No summary available.'}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="remarks mb-4">
          <h5 className="section-title bg-light">REMARKS</h5>
          <p>{personalizeText(testData.remarks) || "The psychological test result is only suggestive of central behavioral tendencies and should still be correlated with clinical findings."}</p>
          <p><em>*This Psychological Test Report is valid for 6 months from the date of release.</em></p>
        </div>
        
        <div className="signatures mt-5">
          <div className="row">
            <div className="col-6">
              <p className="mb-5">Test Administered by:</p>
              <hr />
              <p>{staff.psychometrician?.full_name || "___________________________"}</p>
            </div>
            <div className="col-6">
              <p className="mb-5">Noted by:</p>
              <hr />
              <p>{staff.psychologist?.full_name || "___________________________"}</p>
            </div>
          </div>
        </div>
        
        <div className="footer mt-5">
          <p><em>*To check the veracity of this report, you may contact us at<br />
          0927 545 0235 or email us at msgorospepac@gmail.com</em></p>
        </div>
      </div>
      
      <style jsx>{`
        .report-container .section-title {
          background-color: #f8f9fa;
          padding: 10px;
          margin-bottom: 15px;
          border-left: 4px solid #dee2e6;
          font-size: 1.1rem;
          font-weight: 500;
        }
        
        .report-container h6 {
          margin-top: 1rem;
          margin-bottom: 0.75rem;
          font-weight: 500;
        }
        
        @media print {
          .report-container .section-title {
            background-color: #f8f9fa !important;
            border-left: 4px solid #dee2e6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PsychologicalTestReport;