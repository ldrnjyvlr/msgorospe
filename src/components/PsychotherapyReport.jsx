// components/PsychotherapyReport.jsx - Updated to match form
import React from 'react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { FaPrint, FaDownload } from 'react-icons/fa';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const PsychotherapyReport = ({ sessionData, onClose }) => {
  const handlePrint = async () => {
    // Log audit event for print action
    await logAuditEvent({
      actionType: AUDIT_ACTIONS.PRINT,
      resourceType: RESOURCE_TYPES.SESSION,
      resourceId: sessionData.id,
      description: 'Psychotherapy session report printed',
      details: {
        session_id: sessionData.id,
        session_type: 'psychotherapy',
        session_number: sessionData.session_number || '1',
        patient_id: sessionData.patient_id,
        patient_name: sessionData.personal_info?.name,
        print_type: 'session_report'
      }
    });
    
    window.print();
  };

  const handleDownloadPDF = async () => {
    const reportElement = document.getElementById('psychotherapy-report');
    
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
      
      const patientName = sessionData.personal_info?.name?.replace(/\s+/g, '_') || 'patient';
      const sessionNumber = sessionData.session_number || '1';
      const fileName = `psychotherapy_session_${sessionNumber}_${patientName}.pdf`;
      
      // Log audit event for PDF download
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.DOWNLOAD,
        resourceType: RESOURCE_TYPES.SESSION,
        resourceId: sessionData.id,
        description: 'Psychotherapy session report downloaded as PDF',
        details: {
          session_id: sessionData.id,
          session_type: 'psychotherapy',
          session_number: sessionNumber,
          patient_id: sessionData.patient_id,
          patient_name: sessionData.personal_info?.name,
          file_name: fileName,
          file_type: 'PDF',
          download_type: 'session_report'
        }
      });
      
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };

  if (!sessionData) {
    return (
      <div className="alert alert-warning" role="alert">
        No session data available.
      </div>
    );
  }

  // Helper function to render progress
  const renderProgress = () => {
    if (typeof sessionData.progress === 'string') {
      // Handle old string format
      return sessionData.progress || 'No progress recorded';
    } else if (typeof sessionData.progress === 'object') {
      // Handle new object format
      return (
        <div>
          <div className="progress-cells d-flex flex-wrap mb-3">
            {Array.from({ length: 10 }, (_, i) => (
              <div 
                key={`cell${i+1}`}
                className="progress-cell border"
                style={{
                  width: '10%',
                  height: '40px',
                  backgroundColor: sessionData.progress[`cell${i+1}`] ? '#007bff' : 'transparent'
                }}
              ></div>
            ))}
          </div>
          <p>{sessionData.progress.notes || 'No additional notes recorded'}</p>
        </div>
      );
    }
    return 'No progress recorded';
  };

  // Helper function to render observations
  const renderObservations = () => {
    if (typeof sessionData.observations === 'string') {
      // Handle old string format
      return sessionData.observations || 'No observations recorded';
    } else if (typeof sessionData.observations === 'object') {
      // Handle new object format with table
      return (
        <table className="table table-bordered">
          <tbody>
            <tr>
              <td width="30%"><strong>APPEARANCE</strong></td>
              <td>{sessionData.observations.appearance || 'Not recorded'}</td>
            </tr>
            <tr>
              <td><strong>SPEECH</strong></td>
              <td>{sessionData.observations.speech || 'Not recorded'}</td>
            </tr>
            <tr>
              <td><strong>EYE CONTACT</strong></td>
              <td>{sessionData.observations.eye_contact || 'Not recorded'}</td>
            </tr>
            <tr>
              <td><strong>MOTOR ACTIVITY</strong></td>
              <td>{sessionData.observations.motor_activity || 'Not recorded'}</td>
            </tr>
            <tr>
              <td><strong>AFFECT</strong></td>
              <td>{sessionData.observations.affect || 'Not recorded'}</td>
            </tr>
          </tbody>
        </table>
      );
    }
    return 'No observations recorded';
  };

  return (
    <div className="psychotherapy-report">
      <div className="d-flex justify-content-between align-items-center mb-4 no-print">
        <h4 className="mb-0">Psychotherapy Session Report</h4>
        <div>
          <button 
            className="btn btn-outline-secondary me-2" 
            onClick={onClose}
          >
            Back to Session
          </button>
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
      
      <div id="psychotherapy-report" className="report-container">
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
          <h3 className="report-title mt-4 mb-4">PSYCHOTHERAPY SESSION REPORT</h3>
        </div>
        
        <div className="patient-info mb-4">
          <h5 className="section-title">Personal Information</h5>
          <table className="table table-bordered">
            <tbody>
              <tr>
                <td><strong>NAME:</strong> {sessionData.personal_info?.name}</td>
                <td><strong>AGE:</strong> {sessionData.personal_info?.age}</td>
                <td><strong>SEX:</strong> {sessionData.personal_info?.sex}</td>
                <td><strong>CIVIL STATUS:</strong> {sessionData.personal_info?.civil_status}</td>
              </tr>
              <tr>
                <td colSpan="2"><strong>DATE OF BIRTH:</strong> {sessionData.personal_info?.date_of_birth ? new Date(sessionData.personal_info.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                <td colSpan="2"><strong>PLACE OF BIRTH:</strong> {sessionData.personal_info?.place_of_birth}</td>
              </tr>
              <tr>
                <td><strong>NATIONALITY:</strong> {sessionData.personal_info?.nationality}</td>
                <td><strong>RELIGION:</strong> {sessionData.personal_info?.religion}</td>
                <td colSpan="2"><strong>OCCUPATION:</strong> {sessionData.personal_info?.occupation}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>ADDRESS:</strong> {sessionData.personal_info?.address}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>EDUCATIONAL ATTAINMENT:</strong> {sessionData.personal_info?.educational_attainment}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>PURPOSE OF EXAMINATION:</strong> {sessionData.personal_info?.purpose_of_examination}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>DATE OF EXAMINATION:</strong> {sessionData.personal_info?.date_of_examination ? new Date(sessionData.personal_info.date_of_examination).toLocaleDateString() : 'N/A'}</td>
              </tr>
              <tr>
                <td colSpan="4"><strong>AGENCY/AFFILIATION:</strong> {sessionData.personal_info?.agency_affiliation}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="session-info mb-4">
          <h5 className="section-title">Session Information</h5>
          <table className="table table-bordered">
            <tbody>
              <tr>
                <td width="50%"><strong>SESSION NUMBER:</strong> {sessionData.session_number}</td>
                <td width="50%"><strong>SESSION DATE:</strong> {new Date(sessionData.session_date).toLocaleDateString()}</td>
              </tr>
              <tr>
                <td><strong>THERAPIST:</strong> {sessionData.therapist?.full_name || 'Not assigned'}</td>
                <td><strong>SUPERVISING PSYCHOLOGIST:</strong> {sessionData.psychologist?.full_name || 'Not assigned'}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="session-details mb-4">
          <h5 className="section-title">Session Details</h5>
          
          <div className="mb-4">
            <h6>Observations</h6>
            <div className="border p-3 rounded">
              {renderObservations()}
            </div>
          </div>
          
          <div className="mb-4">
            <h6>Progress</h6>
            <div className="border p-3 rounded">
              {renderProgress()}
            </div>
          </div>
          
          {/* Next steps section removed */}
          
          {sessionData.recommendations && (
            <div className="mb-4">
              <h6>Recommendations</h6>
              <div className="border p-3 rounded">
                {sessionData.recommendations}
              </div>
            </div>
          )}
        </div>
        
        {sessionData.patient_image_url && (
          <div className="patient-image mb-4">
            <h5 className="section-title">Patient Image</h5>
            <div className="text-center">
              <img
                src={sessionData.patient_image_url}
                alt="Patient"
                className="img-fluid"
                style={{ maxHeight: '400px', maxWidth: '80%' }}
              />
            </div>
          </div>
        )}
        
        <div className="signatures mt-5">
          <div className="row">
            <div className="col-6">
              <div className="signature-block">
                <p className="mb-5">Prepared by:</p>
                <div className="signature-line">
                  {sessionData.therapist_signature || '_______________________________'}
                </div>
                <p className="mb-0">{sessionData.therapist?.full_name || 'Therapist Name'}</p>
                <p className="text-muted">Psychometrician/Therapist</p>
              </div>
            </div>
            <div className="col-6">
              <div className="signature-block">
                <p className="mb-5">Noted by:</p>
                <div className="signature-line">
                  {sessionData.psychologist_signature || '_______________________________'}
                </div>
                <p className="mb-0">{sessionData.psychologist?.full_name || 'Psychologist Name'}</p>
                <p className="text-muted">Licensed Psychologist</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer mt-5">
          <p className="text-center"><em>*This Psychotherapy Session Report is valid for 6 months from the date of release.</em></p>
          <p className="text-center small"><em>*To check the veracity of this report, you may contact us at<br />
          0927 545 0235 or email us at msgorospepac@gmail.com</em></p>
        </div>
      </div>
      
      <style jsx>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          .report-container {
            margin: 0;
            padding: 20px;
          }
          
          .signature-line {
            border-bottom: 1px solid #000;
            height: 30px;
            margin-bottom: 10px;
          }
          
          .page-break {
            page-break-after: always;
          }
        }
        
        .report-container {
          background: white;
          padding: 30px;
          margin: 20px auto;
          max-width: 800px;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
        }
        
        .section-title {
          background-color: #f8f9fa;
          padding: 10px;
          margin-bottom: 15px;
          border-left: 4px solid #007bff;
        }
        
        .signature-block {
          text-align: center;
          margin-top: 50px;
        }
        
        .signature-line {
          border-bottom: 1px solid #000;
          margin: 20px auto;
          width: 80%;
          text-align: center;
          padding: 5px;
        }
      `}</style>
    </div>
  );
};

export default PsychotherapyReport;