// pages/Reports.jsx - Fixed version with corrected test fetching
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { FaFileAlt, FaSearch, FaFilePdf, FaPrint, FaChartBar, FaEye } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './Reports.css';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';

const Reports = ({ user, userRole }) => {
  const [reportType, setReportType] = useState('psychological');
  const [tests, setTests] = useState([]);
  const [filteredTests, setFilteredTests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setFullYear(new Date().getFullYear() - 1)).toISOString().split('T')[0], // 1 year ago
    endDate: new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0] // 30 days in future
  });
  const [stats, setStats] = useState({
    totalTests: 0,
    byType: {
      psychological: 0,
      neuropsychological: 0,
      neuropsychiatric: 0,
      psychotherapy: 0,
      aba: 0
    },
    recentTests: []
  });

  useEffect(() => {
    if (user && userRole) {
      fetchStatistics();
      fetchReports(reportType);
    }
  }, [reportType, user, userRole]);

  useEffect(() => {
    const filtered = tests.filter(test => {
      if (!searchQuery) return true;
      return test.patient_name?.toLowerCase().includes(searchQuery.toLowerCase());
    });
    setFilteredTests(filtered);
  }, [tests, searchQuery]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      console.log('Fetching statistics...');
      
      // Fetch counts for each test type with simpler queries
      const promises = [
        supabase.from('psychological_tests').select('id', { count: 'exact', head: true }),
        supabase.from('neuropsychological_tests').select('id', { count: 'exact', head: true }),
        supabase.from('neuropsychiatric_tests').select('id', { count: 'exact', head: true }),
        supabase.from('psychotherapy_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('aba_therapy_sessions').select('id', { count: 'exact', head: true })
      ];

      const [psychological, neuropsychological, neuropsychiatric, psychotherapy, aba] = await Promise.all(promises);
      
      console.log('Statistics results:', {
        psychological: psychological.count,
        neuropsychological: neuropsychological.count,
        neuropsychiatric: neuropsychiatric.count,
        psychotherapy: psychotherapy.count,
        aba: aba.count
      });

      // Get recent tests with simple query
      const { data: recentPsychological } = await supabase
        .from('psychological_tests')
        .select('id, created_at, patient_id')
        .order('created_at', { ascending: false })
        .limit(5);

      console.log('Recent tests:', recentPsychological);

      const formattedRecentTests = recentPsychological?.map(test => ({
        ...test,
        type: 'psychological',
        patient_name: `Patient ID: ${test.patient_id}`
      })) || [];

      setStats({
        totalTests: (psychological.count || 0) + (neuropsychological.count || 0) + 
                   (neuropsychiatric.count || 0) + (psychotherapy.count || 0) + (aba.count || 0),
        byType: {
          psychological: psychological.count || 0,
          neuropsychological: neuropsychological.count || 0,
          neuropsychiatric: neuropsychiatric.count || 0,
          psychotherapy: psychotherapy.count || 0,
          aba: aba.count || 0
        },
        recentTests: formattedRecentTests
      });
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async (type) => {
    try {
      setLoading(true);
      setTests([]);
      setSelectedTest(null);
      
      console.log(`=== FETCHING ${type.toUpperCase()} REPORTS ===`);
      console.log('Date range:', dateRange);
      console.log('User:', user);
      console.log('UserRole:', userRole);
      
      // Quick database structure check
      console.log('=== CHECKING DATABASE STRUCTURE ===');
      
      // Check what patient tables exist
      const patientTableChecks = ['patients', 'personal_info', 'patient_info', 'client_info'];
      for (const table of patientTableChecks) {
        try {
          const { data: sampleData, error } = await supabase
            .from(table)
            .select('id, name')
            .limit(3);
          
          if (!error && sampleData) {
            console.log(`✅ Table '${table}' exists with data:`, sampleData);
          }
        } catch (err) {
          console.log(`❌ Table '${table}' doesn't exist or error:`, err.message);
        }
      }
      
      let data = [];
      let error = null;
      
      // First, let's try to get ALL records without any filters to see if there's data
      console.log(`Step 1: Checking if ${type} table has any data...`);
      
      let tableName = '';
      let dateColumn = 'created_at';
      
      switch (type) {
        case 'psychological':
          tableName = 'psychological_tests';
          break;
        case 'neuropsychological':
          tableName = 'neuropsychological_tests';
          break;
        case 'neuropsychiatric':
          tableName = 'neuropsychiatric_tests';
          break;
        case 'psychotherapy':
          tableName = 'psychotherapy_sessions';
          dateColumn = 'session_date';
          break;
        case 'aba':
          tableName = 'aba_therapy_sessions';
          dateColumn = 'session_date';
          break;
        default:
          console.error('Unknown report type:', type);
          return;
      }
      
      // Check if table has any data at all
      const { data: allData, error: allError, count } = await supabase
        .from(tableName)
        .select('*', { count: 'exact' })
        .limit(10);
      
      console.log(`Total records in ${tableName}:`, count);
      console.log(`Sample data from ${tableName}:`, allData);
      console.log(`Error (if any):`, allError);
      
      if (allError) {
        console.error(`Error accessing ${tableName}:`, allError);
        throw allError;
      }
      
      if (!allData || allData.length === 0) {
        console.warn(`No data found in ${tableName} table`);
        setTests([]);
        setFilteredTests([]);
        return;
      }
      
      // Now let's try with date filtering
      console.log(`Step 2: Applying date filter (${dateRange.startDate} to ${dateRange.endDate})...`);
      
      ({ data, error } = await supabase
        .from(tableName)
        .select('*')
        .gte(dateColumn, dateRange.startDate)
        .lte(dateColumn, dateRange.endDate + (dateColumn === 'session_date' ? '' : 'T23:59:59'))
        .order(dateColumn, { ascending: false }));
      
      console.log(`Date-filtered query result for ${tableName}:`, { data, error });
      
      if (error) {
        console.error(`Date filter error for ${tableName}:`, error);
        // If date filtering fails, try without it
        console.log('Trying without date filter...');
        ({ data, error } = await supabase
          .from(tableName)
          .select('*')
          .order(dateColumn, { ascending: false })
          .limit(50));
      }
      
      if (error) {
        console.error(`Final error for ${tableName}:`, error);
        throw error;
      }
      
      console.log(`Records found after filtering: ${data?.length || 0}`);
      
      if (data && data.length > 0) {
        console.log('Sample test record structure:', data[0]);
        console.log('Patient IDs in the data:', data.map(test => test.patient_id));
      }
      
      if (!data || data.length === 0) {
        console.warn(`No ${type} records found in date range ${dateRange.startDate} to ${dateRange.endDate}`);
        
        // Let's check what dates actually exist in the table
        const { data: dateCheck } = await supabase
          .from(tableName)
          .select(dateColumn)
          .order(dateColumn, { ascending: false })
          .limit(5);
        
        console.log(`Recent dates in ${tableName}:`, dateCheck?.map(d => d[dateColumn]));
        
        setTests([]);
        setFilteredTests([]);
        return;
      }
      
      // Step 3: Try to get patient data and user data
      console.log('Step 3: Fetching patient and user data...');
      let testsWithPatientName = [];
      
      for (const test of data) {
        console.log(`Processing test ${test.id} with patient_id: ${test.patient_id}`);
        
        let patientData = null;
        let psychometricianData = null;
        let psychologistData = null;
        let therapistData = null;
        
        // Fetch patient data - try multiple table names
        if (test.patient_id) {
          try {
            console.log(`Trying to fetch patient with ID: ${test.patient_id}`);
            
            // First try 'patients' table
            let { data: patient, error: patientError } = await supabase
              .from('patients')
              .select('*')
              .eq('id', test.patient_id)
              .single();
            
            if (patientError || !patient) {
              console.log(`Patient not found in 'patients' table, trying 'personal_info'...`);
              // Try 'personal_info' table
              ({ data: patient, error: patientError } = await supabase
                .from('personal_info')
                .select('*')
                .eq('id', test.patient_id)
                .single());
            }
            
            if (patientError || !patient) {
              console.log(`Patient not found in 'personal_info' table either. Checking what tables exist...`);
              
              // Let's see what patient-related tables exist
              const { data: tables, error: tablesError } = await supabase
                .rpc('get_table_names') // This might not work, but let's try
                .catch(() => null);
              
              console.log('Available tables:', tables);
              
              // Try a few more common table names
              const possibleTableNames = ['patient_info', 'patient_details', 'client_info', 'clients'];
              
              for (const tableName of possibleTableNames) {
                try {
                  ({ data: patient, error: patientError } = await supabase
                    .from(tableName)
                    .select('*')
                    .eq('id', test.patient_id)
                    .single());
                  
                  if (!patientError && patient) {
                    console.log(`Found patient in '${tableName}' table:`, patient);
                    break;
                  }
                } catch (err) {
                  console.log(`Table '${tableName}' doesn't exist or error:`, err.message);
                }
              }
            }
            
            if (patientError) {
              console.warn(`Could not fetch patient ${test.patient_id} from any table:`, patientError);
              
              // Let's also check if the patient_id is actually valid by checking if it exists in any patient table
              console.log('Checking if patient ID exists in database...');
              
              // Try to get a list of all patient IDs to see what's available
              const { data: allPatients, error: allPatientsError } = await supabase
                .from('patients')
                .select('id, name')
                .limit(10);
              
              if (!allPatientsError) {
                console.log('Sample patient IDs from patients table:', allPatients?.map(p => ({ id: p.id, name: p.name })));
              } else {
                console.log('Error fetching sample patients:', allPatientsError);
                
                // Try personal_info table
                const { data: allPersonalInfo, error: allPersonalInfoError } = await supabase
                  .from('personal_info')
                  .select('id, name')
                  .limit(10);
                
                if (!allPersonalInfoError) {
                  console.log('Sample patient IDs from personal_info table:', allPersonalInfo?.map(p => ({ id: p.id, name: p.name })));
                } else {
                  console.log('Error fetching sample personal_info:', allPersonalInfoError);
                }
              }
            } else {
              patientData = patient;
              console.log(`Found patient data for ${test.patient_id}:`, patient?.name);
            }
          } catch (err) {
            console.warn(`Error fetching patient ${test.patient_id}:`, err);
          }
        } else {
          console.warn('No patient_id found in test:', test);
        }
        
        // Fetch psychometrician data
        if (test.psychometrician_id) {
          try {
            const { data: psychometrician, error: psychometricianError } = await supabase
              .from('users')
              .select('*')
              .eq('id', test.psychometrician_id)
              .single();
            
            if (!psychometricianError && psychometrician) {
              psychometricianData = psychometrician;
              console.log(`Found psychometrician: ${psychometrician.full_name}`);
            }
          } catch (err) {
            console.warn(`Error fetching psychometrician ${test.psychometrician_id}:`, err);
          }
        }
        
        // Fetch psychologist data
        if (test.psychologist_id) {
          try {
            const { data: psychologist, error: psychologistError } = await supabase
              .from('users')
              .select('*')
              .eq('id', test.psychologist_id)
              .single();
            
            if (!psychologistError && psychologist) {
              psychologistData = psychologist;
              console.log(`Found psychologist: ${psychologist.full_name}`);
            }
          } catch (err) {
            console.warn(`Error fetching psychologist ${test.psychologist_id}:`, err);
          }
        }
        
        
        // Fetch therapist data (for psychotherapy sessions)
        if (test.therapist_id) {
          try {
            const { data: therapist, error: therapistError } = await supabase
              .from('users')
              .select('*')
              .eq('id', test.therapist_id)
              .single();
            
            if (!therapistError && therapist) {
              therapistData = therapist;
              console.log(`Found therapist: ${therapist.full_name}`);
            }
          } catch (err) {
            console.warn(`Error fetching therapist ${test.therapist_id}:`, err);
          }
        }
        
        // Build the complete test object
        const processedTest = {
          ...test,
          patient: patientData,
          patient_name: patientData?.name || 'Unknown Patient',
          psychometrician: psychometricianData,
          psychologist: psychologistData,
          therapist: therapistData,
          psychometrician_name: psychometricianData?.full_name || therapistData?.full_name || 'Unassigned',
          psychologist_name: psychologistData?.full_name || 'Unassigned'
        };
        
        console.log(`Processed test for patient: ${processedTest.patient_name}, psychometrician: ${processedTest.psychometrician_name}, psychologist: ${processedTest.psychologist_name}`);
        
        testsWithPatientName.push(processedTest);
      }
      
      console.log('Final processed tests:', testsWithPatientName);
      
      setTests(testsWithPatientName);
      setFilteredTests(testsWithPatientName);
      
    } catch (error) {
      console.error(`=== ERROR FETCHING ${type.toUpperCase()} REPORTS ===`, error);
      setTests([]);
      setFilteredTests([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDateRangeChange = (field, value) => {
    setDateRange({
      ...dateRange,
      [field]: value
    });
  };

  const handleFilter = () => {
    fetchReports(reportType);
  };

  const handleSelectTest = (test) => {
    setSelectedTest(test);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedTest(null);
  };

  const handlePrint = async () => {
    // Log audit event for print action
    await logAuditEvent({
      actionType: AUDIT_ACTIONS.PRINT,
      resourceType: RESOURCE_TYPES.TEST_RESULT,
      resourceId: selectedTest?.id,
      description: `${reportType} test report printed`,
      details: {
        test_id: selectedTest?.id,
        test_type: reportType,
        patient_id: selectedTest?.patient_id,
        patient_name: selectedTest?.patient_name,
        print_type: 'test_report',
        printed_by: user.email,
        user_role: userRole
      }
    });
    
    const printContent = document.getElementById('report-content');
    const WindowPrint = window.open('', '', 'width=900,height=650');
    WindowPrint.document.write('<html><head><title>Report</title>');
    WindowPrint.document.write('<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet">');
    WindowPrint.document.write('<style>.signature-line { border-bottom: 1px solid #000; margin: 20px auto; width: 200px; display: inline-block; }</style>');
    WindowPrint.document.write('</head><body>');
    WindowPrint.document.write(printContent.innerHTML);
    WindowPrint.document.write('</body></html>');
    WindowPrint.document.close();
    WindowPrint.focus();
    setTimeout(() => {
      WindowPrint.print();
      WindowPrint.close();
    }, 1000);
  };

  const handleGeneratePDF = async () => {
    const reportElement = document.getElementById('report-content');
    
    if (!reportElement) {
      alert('No report selected to generate PDF');
      return;
    }
    
    try {
      const canvas = await html2canvas(reportElement, {
        scale: 2,
        useCORS: true
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
      const imgX = (pdfWidth - imgWidth * ratio) / 2;
      const imgY = 30;
      
      pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
      
      const patientName = selectedTest?.patient_name?.replace(/\s+/g, '_') || 'patient';
      const fileName = `${reportType}_report_${patientName}_${new Date().toISOString().split('T')[0]}.pdf`;
      
      // Log audit event for PDF download
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.DOWNLOAD,
        resourceType: RESOURCE_TYPES.TEST_RESULT,
        resourceId: selectedTest?.id,
        description: `${reportType} test report downloaded as PDF`,
        details: {
          test_id: selectedTest?.id,
          test_type: reportType,
          patient_id: selectedTest?.patient_id,
          patient_name: selectedTest?.patient_name,
          file_name: fileName,
          file_type: 'PDF',
          download_type: 'test_report',
          downloaded_by: user.email,
          user_role: userRole
        }
      });
      
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF: ' + error.message);
    }
  };

  const renderReportList = () => {
    if (loading) {
      return (
        <div className="d-flex justify-content-center my-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Patient Name</th>
              <th>Date</th>
              <th>{reportType === 'psychotherapy' || reportType === 'aba' ? 'Therapist' : 'Psychometrician'}</th>
              <th>{reportType === 'neuropsychiatric' ? 'Psychiatrist' : 'Psychologist'}</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTests.length > 0 ? (
              filteredTests.map(test => (
                <tr key={test.id} className={selectedTest?.id === test.id ? 'table-primary' : ''}>
                  <td>{test.patient_name}</td>
                  <td>{new Date(test.created_at || test.session_date).toLocaleDateString()}</td>
                  <td>{test.psychometrician_name}</td>
                  <td>{test.psychologist_name}</td>
                  <td>
                    <button 
                      className="btn btn-sm btn-info me-2"
                      onClick={() => handleSelectTest(test)}
                    >
                      <FaEye /> View
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="5" className="text-center">
                  No reports found for the selected criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const renderReportContent = () => {
    if (!selectedTest) return null;

    switch (reportType) {
      case 'psychological':
        return (
          <div className="test-results">
            <h5 className="mb-3">Culture Fair Intelligence Test (CFIT)</h5>
            <div className="card mb-4">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-4">
                    <p><strong>Raw Score:</strong> {selectedTest.cfit_raw_score}</p>
                  </div>
                  <div className="col-md-4">
                    <p><strong>Percentile:</strong> {selectedTest.cfit_percentile}</p>
                  </div>
                  <div className="col-md-4">
                    <p><strong>IQ Equivalent:</strong> {selectedTest.cfit_iq_equivalent}</p>
                  </div>
                </div>
                <div className="mt-3">
                  <h6>Interpretation:</h6>
                  <p>{selectedTest.cfit_interpretation}</p>
                </div>
              </div>
            </div>
            
            <h5 className="mb-3">16PF (Personality Factors)</h5>
            <div className="card mb-4">
              <div className="card-body">
                {selectedTest.personality_factors && (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th rowSpan="2">Factor</th>
                          <th colSpan="10" className="text-center">Standard Ten Score (STEN)</th>
                        </tr>
                        <tr>
                          {[1,2,3,4,5,6,7,8,9,10].map(n => (
                            <th key={`sten-${n}`} className="text-center">{n}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const orderedFactors = [
                            'warmth',
                            'reasoning',
                            'emotionalStability',
                            'dominance',
                            'liveliness',
                            'ruleConsciousness',
                            'socialBoldness',
                            'sensitivity',
                            'vigilance',
                            'abstractedness',
                            'privateness',
                            'apprehension',
                            'opennessToChange',
                            'selfReliance',
                            'perfectionism',
                            'tension'
                          ];
                          const factorMappings = {
                            'warmth': { name: "A (Warmth)" },
                            'reasoning': { name: "B (Reasoning)" },
                            'emotionalStability': { name: "C (Emotional Stability)" },
                            'dominance': { name: "E (Dominance)" },
                            'liveliness': { name: "F (Liveliness)" },
                            'ruleConsciousness': { name: "G (Rule-Consciousness)" },
                            'socialBoldness': { name: "H (Social Boldness)" },
                            'sensitivity': { name: "I (Sensitivity)" },
                            'vigilance': { name: "L (Vigilance)" },
                            'abstractedness': { name: "M (Abstractedness)" },
                            'privateness': { name: "N (Privateness)" },
                            'apprehension': { name: "O (Apprehension)" },
                            'opennessToChange': { name: "Q1 (Openness to Change)" },
                            'selfReliance': { name: "Q2 (Self-Reliance)" },
                            'perfectionism': { name: "Q3 (Perfectionism)" },
                            'tension': { name: "Q4 (Tension)" }
                          };
                          return orderedFactors
                            .filter(f => selectedTest.personality_factors.hasOwnProperty(f))
                            .map(factor => {
                              const score = parseInt(selectedTest.personality_factors[factor]);
                              const factorName = (factorMappings[factor]?.name) || factor;
                              return (
                                <tr key={factor}>
                                  <td>{factorName}</td>
                                  {[1,2,3,4,5,6,7,8,9,10].map(n => (
                                    <td key={`${factor}-${n}`} className="text-center">
                                      {score === n ? 'X' : ''}
                                    </td>
                                  ))}
                                </tr>
                              );
                            });
                        })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            {selectedTest.personality_factors && (
              <div className="mt-3">
                <h6>16PF Combined Interpretation</h6>
                <p className="mb-0">
                  {(() => {
                    const factorMappings = {
                      'warmth': { 
                        name: 'A (Warmth)',
                        low: 'may be uncomfortable in situations where the close relationships they seek are inaccessible',
                        high: 'can be quite uncomfortable in situations that call for extensive interaction'
                      },
                      'reasoning': { 
                        name: 'B (Reasoning)',
                        low: "may not accurately reflect one's reasoning ability",
                        high: 'has a higher reasoning ability'
                      },
                      'emotionalStability': { 
                        name: 'C (Emotional Stability)',
                        low: 'tends to feel a certain lack of control over life',
                        high: 'makes adaptive or proactive choices in managing their life'
                      },
                      'dominance': { 
                        name: 'E (Dominance)',
                        low: 'is self-effacing and willing to set aside their wishes and feelings',
                        high: 'tends to be forceful, vocal in expressing their wishes and opinions even when not invited to do so, and pushy about obtaining what they want'
                      },
                      'liveliness': { 
                        name: 'F (Liveliness)',
                        low: 'tends to inhibit their spontaneity, sometimes to the point of appearing constricted or saturnine',
                        high: 'is enthusiastic, spontaneous and attention seeking'
                      },
                      'ruleConsciousness': { 
                        name: 'G (Rule-Consciousness)',
                        low: 'tends to eschew rules and regulations, doing so either because they have a poorly developed sense of right and wrong',
                        high: 'is rule-conscious, they tends to perceive themselves as strict follower of rules, principles and manners'
                      },
                      'socialBoldness': { 
                        name: 'H (Social Boldness)',
                        low: 'finds speaking in front of a group to be a difficult experience',
                        high: "tends to initiate social contacts and isn't shy in the face of new social settings"
                      },
                      'sensitivity': { 
                        name: 'I (Sensitivity)',
                        low: "tends to be concerned with utility and objectivity and may exclude people's feelings from consideration",
                        high: 'tends to base judgements on personal tastes'
                      },
                      'vigilance': { 
                        name: 'L (Vigilance)',
                        low: 'tends to expect fair treatment, loyalty, and good intentions from others',
                        high: 'expects to be misunderstood or taken advantage of'
                      },
                      'abstractedness': { 
                        name: 'M (Abstractedness)',
                        low: 'may not be able to generate possible solutions to problems',
                        high: 'tends to reflect an intense inner life rather than a focus on the outer environment'
                      },
                      'privateness': { 
                        name: 'N (Privateness)',
                        low: 'tends to talk about their self readily',
                        high: 'tends to be personally guarded'
                      },
                      'apprehension': { 
                        name: 'O (Apprehension)',
                        low: 'tends to be more self-assured',
                        high: 'tends to worry about things and to feel apprehensive'
                      },
                      'opennessToChange': { 
                        name: 'Q1 (Openness to Change)',
                        low: 'prefers life to be predictable and familiar, even if life is not ideal',
                        high: 'tends to think of ways to improve things'
                      },
                      'selfReliance': { 
                        name: 'Q2 (Self-Reliance)',
                        low: 'prefers to be around people and likes to do things with others',
                        high: 'enjoys time alone and prefers to make decisions for themselves'
                      },
                      'perfectionism': { 
                        name: 'Q3 (Perfectionism)',
                        low: 'may not be able to muster a clear motivation for behaving in planful or organized ways, especially if these behaviors are unimportant to them',
                        high: 'tends to be organized, to keep things in their proper places, and to plan ahead'
                      },
                      'tension': { 
                        name: 'Q4 (Tension)',
                        low: 'is patient and slow to become frustrated',
                        high: 'tends to have restless energy and to be fidgety when made to wait'
                      }
                    };
                    const parts = [];
                    Object.entries(selectedTest.personality_factors).forEach(([factor, score]) => {
                      const mapping = factorMappings[factor];
                      if (!mapping) return;
                      const isHigh = parseInt(score) > 5;
                      const sentence = `${mapping.name}: ${isHigh ? mapping.high : mapping.low}.`;
                      parts.push(sentence);
                    });
                    return parts.join(' ');
                  })()}
                </p>
              </div>
            )}
            
            <h5 className="mb-3">Workplace Skills Survey (WSS)</h5>
            <div className="card mb-4">
              <div className="card-body">
                {selectedTest.workplace_skills && (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Skill Area</th>
                          <th>Rating</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedTest.workplace_skills).map(([skill, value]) => {
                          const skillName = skill === 'summary' ? 'Overall Rating' : 
                            skill.split(/(?=[A-Z])/).join(' ').replace(/^./, str => str.toUpperCase());
                            
                          if (skill === 'summary') {
                            return (
                              <tr key={skill} className="table-info">
                                <td><strong>{skillName}</strong></td>
                                <td><strong>{value}</strong></td>
                              </tr>
                            );
                          }
                            
                          return (
                            <tr key={skill}>
                              <td>{skillName}</td>
                              <td>
                                <span className={`badge ${
                                  value === 'above_average' ? 'bg-success' :
                                  value === 'average' ? 'bg-primary' :
                                  value === 'below_average' ? 'bg-warning' : 'bg-secondary'
                                }`}>
                                  {value?.replace('_', ' ').replace(/^./, str => str.toUpperCase())}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
                {selectedTest.workplace_skills_interpretation && (
                  <div className="mt-3">
                    <h6>Workplace Skills Interpretation:</h6>
                    <p>{selectedTest.workplace_skills_interpretation}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'neuropsychological':
        return (
          <div className="test-results">
            <h5 className="mb-3">Mini-Mental State Examination (MMSE)</h5>
            <div className="card mb-4">
              <div className="card-body">
                {selectedTest.mmse_results && (
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
                )}
              </div>
            </div>
            
            <h5 className="mb-3">Culture Fair Intelligence Test (CFIT)</h5>
            <div className="card mb-4">
              <div className="card-body">
                {selectedTest.cfit_results && (
                  <>
                    <div className="row">
                      <div className="col-md-4">
                        <p><strong>Raw Score:</strong> {selectedTest.cfit_results?.raw_score || "N/A"}</p>
                      </div>
                      <div className="col-md-4">
                        <p><strong>Percentile:</strong> {selectedTest.cfit_results?.percentile || "N/A"}</p>
                      </div>
                      <div className="col-md-4">
                        <p><strong>IQ Equivalent:</strong> {selectedTest.cfit_results?.iq_equivalent || "N/A"}</p>
                      </div>
                    </div>
                    {selectedTest.cfit_results?.interpretation && (
                      <div className="mt-3">
                        <h6>Interpretation</h6>
                        <p>{selectedTest.cfit_results.interpretation}</p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'neuropsychiatric':
        return (
          <div className="test-results">
            <h5 className="mb-3">Mental Status Examination</h5>
            <div className="card mb-4">
              <div className="card-body">
                {selectedTest.mental_status_exam && (
                  <div className="table-responsive">
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Assessment Area</th>
                          <th>Score/Description</th>
                          <th>Interpretation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedTest.mental_status_exam).map(([key, value]) => {
                          const label = key
                            .split('_')
                            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                            .join(' ');
                            
                          // Handle both numeric scores and text descriptions
                          const isNumeric = !isNaN(parseInt(value));
                          let interpretation = "";
                          
                          if (isNumeric) {
                            const score = parseInt(value);
                            interpretation = score >= 4 ? "Normal/Good" : score >= 3 ? "Mild impairment" : "Significant impairment";
                          } else {
                            interpretation = "Qualitative assessment";
                          }
                          
                          return (
                            <tr key={key}>
                              <td>{label}</td>
                              <td>
                                {isNumeric ? (
                                  <span className={`badge ${parseInt(value) >= 4 ? 'bg-success' : parseInt(value) >= 3 ? 'bg-warning' : 'bg-danger'}`}>
                                    {value || "N/A"}
                                  </span>
                                ) : (
                                  <span>{value || "N/A"}</span>
                                )}
                              </td>
                              <td>{interpretation}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
            
            <h5 className="mb-3">Clinical Assessment</h5>
            <div className="card mb-4">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <h6>Risk Assessment</h6>
                    <p className="border rounded p-3">
                      {selectedTest.risk_assessment || "No risk assessment provided."}
                    </p>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <h6>Substance Dependency</h6>
                    <p className="border rounded p-3">
                      {selectedTest.substance_dependency || "No substance dependency reported."}
                    </p>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h6>Stressful Events</h6>
                    <p className="border rounded p-3">
                      {selectedTest.stressful_events || "No stressful events reported."}
                    </p>
                  </div>
                </div>
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <h6>Medical History</h6>
                    <div className="border rounded p-3">
                      {selectedTest.medical_history && typeof selectedTest.medical_history === 'object' ? (
                        <div className="row">
                          {Object.entries(selectedTest.medical_history).map(([condition, value]) => (
                            <div key={condition} className="col-md-6">
                              <span className={`badge ${value === 'yes' ? 'bg-warning' : 'bg-success'} me-1 mb-1`}>
                                {condition.replace('_', ' ').toUpperCase()}: {value}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>No medical history provided.</p>
                      )}
                    </div>
                  </div>
                  <div className="col-md-6 mb-3">
                    <h6>Observations</h6>
                    <div className="border rounded p-3">
                      {selectedTest.observations && typeof selectedTest.observations === 'object' ? (
                        <div>
                          {Object.entries(selectedTest.observations).map(([key, value]) => (
                            <p key={key} className="mb-1">
                              <strong>{key.replace('_', ' ').toUpperCase()}:</strong> {value}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <p>No observations provided.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'psychotherapy':
        return (
          <div className="test-results">
            <h5 className="mb-3">Session Information</h5>
            <div className="card mb-4">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Session Number:</strong> {selectedTest.session_number}</p>
                    <p><strong>Session Date:</strong> {new Date(selectedTest.session_date).toLocaleDateString()}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Therapist:</strong> {selectedTest.therapist?.full_name || 'Not assigned'}</p>
                    <p><strong>Psychologist:</strong> {selectedTest.psychologist?.full_name || 'Not assigned'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <h5 className="mb-3">Session Details</h5>
            <div className="card mb-4">
              <div className="card-body">
                <div className="mb-3">
                  <h6>Observations</h6>
                  <div className="border rounded p-3">
                    {selectedTest.observations && typeof selectedTest.observations === 'object' ? (
                      <div>
                        {Object.entries(selectedTest.observations).map(([key, value]) => (
                          <p key={key} className="mb-1">
                            <strong>{key.replace('_', ' ').toUpperCase()}:</strong> {value}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p>{selectedTest.observation || selectedTest.observations || 'No observations recorded'}</p>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <h6>Progress</h6>
                  <div className="border rounded p-3">
                    {selectedTest.progress && typeof selectedTest.progress === 'object' ? (
                      <div>
                        <div className="row">
                          {Object.entries(selectedTest.progress).map(([key, value]) => {
                            if (key === 'notes') {
                              return (
                                <div key={key} className="col-12 mt-3">
                                  <p><strong>Notes:</strong> {value || 'No notes'}</p>
                                </div>
                              );
                            }
                            if (key.startsWith('cell')) {
                              const cellNumber = key.replace('cell', '');
                              return (
                                <div key={key} className="col-md-4 mb-2">
                                  <span className={`badge ${value ? 'bg-success' : 'bg-secondary'}`}>
                                    Goal {cellNumber}: {value ? 'Achieved' : 'Not Achieved'}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    ) : (
                      <p>{selectedTest.progress_old || selectedTest.progress || 'No progress recorded'}</p>
                    )}
                  </div>
                </div>
                
                {selectedTest.recommendations && (
                  <div className="mb-3">
                    <h6>Recommendations</h6>
                    <p className="border rounded p-3">
                      {selectedTest.recommendations}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      case 'aba':
        return (
          <div className="test-results">
            <h5 className="mb-3">ABA Session Information</h5>
            <div className="card mb-4">
              <div className="card-body">
                <div className="row">
                  <div className="col-md-6">
                    <p><strong>Session Number:</strong> {selectedTest.session_number}</p>
                    <p><strong>Session Date:</strong> {new Date(selectedTest.session_date).toLocaleDateString()}</p>
                  </div>
                  <div className="col-md-6">
                    <p><strong>Therapist:</strong> {selectedTest.therapist?.full_name || 'Not assigned'}</p>
                    <p><strong>Psychologist:</strong> {selectedTest.psychologist?.full_name || 'Not assigned'}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <h5 className="mb-3">Behavioral Assessment</h5>
            <div className="card mb-4">
              <div className="card-body">
                <div className="mb-3">
                  <h6>Target Behaviors</h6>
                  <div className="border rounded p-3">
                    {selectedTest.target_behaviors && typeof selectedTest.target_behaviors === 'object' ? (
                      <div>
                        {Object.entries(selectedTest.target_behaviors).map(([key, value]) => (
                          <p key={key} className="mb-1">
                            <strong>{key.replace('_', ' ').toUpperCase()}:</strong> {value}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p>{selectedTest.target_behaviors || 'No target behaviors recorded'}</p>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <h6>Intervention Strategies</h6>
                  <div className="border rounded p-3">
                    {selectedTest.intervention_strategies && typeof selectedTest.intervention_strategies === 'object' ? (
                      <div>
                        {Object.entries(selectedTest.intervention_strategies).map(([key, value]) => (
                          <p key={key} className="mb-1">
                            <strong>{key.replace('_', ' ').toUpperCase()}:</strong> {value}
                          </p>
                        ))}
                      </div>
                    ) : (
                      <p>{selectedTest.intervention_strategies || 'No intervention strategies recorded'}</p>
                    )}
                  </div>
                </div>
                
                <div className="mb-3">
                  <h6>Progress Tracking</h6>
                  <div className="border rounded p-3">
                    {selectedTest.progress_tracking && typeof selectedTest.progress_tracking === 'object' ? (
                      <div>
                        <div className="row">
                          {Object.entries(selectedTest.progress_tracking).map(([key, value]) => {
                            if (key === 'notes') {
                              return (
                                <div key={key} className="col-12 mt-3">
                                  <p><strong>Notes:</strong> {value || 'No notes'}</p>
                                </div>
                              );
                            }
                            if (key.startsWith('goal')) {
                              const goalNumber = key.replace('goal', '');
                              return (
                                <div key={key} className="col-md-4 mb-2">
                                  <span className={`badge ${value ? 'bg-success' : 'bg-secondary'}`}>
                                    Goal {goalNumber}: {value ? 'Achieved' : 'In Progress'}
                                  </span>
                                </div>
                              );
                            }
                            return null;
                          })}
                        </div>
                      </div>
                    ) : (
                      <p>{selectedTest.progress_tracking || 'No progress tracking recorded'}</p>
                    )}
                  </div>
                </div>
                
                {selectedTest.recommendations && (
                  <div className="mb-3">
                    <h6>Recommendations</h6>
                    <p className="border rounded p-3">
                      {selectedTest.recommendations}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="reports-container">
      <h2 className="mb-4">Reports & Analytics</h2>

      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <h5 className="card-title">Total Tests</h5>
              <h2 className="card-text">{stats.totalTests}</h2>
            </div>
          </div>
        </div>
        <div className="col-md-9">
          <div className="card">
            <div className="card-body">
              <h5 className="card-title">Tests by Type</h5>
              <div className="row text-center">
                <div className="col-md-3">
                  <h6>Psychological</h6>
                  <h3>{stats.byType.psychological}</h3>
                </div>
                <div className="col-md-2">
                  <h6>Neuropsychological</h6>
                  <h3>{stats.byType.neuropsychological}</h3>
                </div>
                <div className="col-md-2">
                  <h6>Neuropsychiatric</h6>
                  <h3>{stats.byType.neuropsychiatric}</h3>
                </div>
                <div className="col-md-2">
                  <h6>Psychotherapy</h6>
                  <h3>{stats.byType.psychotherapy}</h3>
                </div>
                <div className="col-md-2">
                  <h6>ABA</h6>
                  <h3>{stats.byType.aba}</h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row mb-4">
            <div className="col-md-4">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by patient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-outline-secondary" type="button">
                  <FaSearch />
                </button>
              </div>
            </div>
            <div className="col-md-2">
              <div className="input-group">
                <span className="input-group-text">From</span>
                <input
                  type="date"
                  className="form-control"
                  value={dateRange.startDate}
                  onChange={(e) => handleDateRangeChange('startDate', e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <div className="input-group">
                <span className="input-group-text">To</span>
                <input
                  type="date"
                  className="form-control"
                  value={dateRange.endDate}
                  onChange={(e) => handleDateRangeChange('endDate', e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-2">
              <button className="btn btn-primary w-100" onClick={handleFilter}>
                Apply Filter
              </button>
            </div>
            <div className="col-md-2">
              <button 
                className="btn btn-secondary w-100" 
                onClick={() => {
                  console.log('Fetching all records without date filter...');
                  setDateRange({
                    startDate: '2020-01-01',
                    endDate: '2030-12-31'
                  });
                  setTimeout(() => fetchReports(reportType), 100);
                }}
              >
                Show All
              </button>
            </div>
          </div>
        </div>
        
        <div className="card-header">
          <ul className="nav nav-tabs card-header-tabs">
            <li className="nav-item">
              <button 
                className={`nav-link ${reportType === 'psychological' ? 'active' : ''}`}
                onClick={() => setReportType('psychological')}
              >
                Psychological
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${reportType === 'neuropsychological' ? 'active' : ''}`}
                onClick={() => setReportType('neuropsychological')}
              >
                Neuropsychological
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${reportType === 'neuropsychiatric' ? 'active' : ''}`}
                onClick={() => setReportType('neuropsychiatric')}
              >
                Neuropsychiatric
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${reportType === 'psychotherapy' ? 'active' : ''}`}
                onClick={() => setReportType('psychotherapy')}
              >
                Psychotherapy
              </button>
            </li>
            <li className="nav-item">
              <button 
                className={`nav-link ${reportType === 'aba' ? 'active' : ''}`}
                onClick={() => setReportType('aba')}
              >
                ABA
              </button>
            </li>
          </ul>
        </div>
        <div className="card-body">
          
          {renderReportList()}
        </div>
      </div>
      
      {/* Modal for displaying test results */}
      {showModal && selectedTest && (
        <div className="reports-modal">
          <div className="modal-dialog modal-xl modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header d-flex justify-content-between align-items-center">
                <h4 className="modal-title mb-0 fw-bold">
                  {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Test Report
                </h4>
                <div>
                  <button 
                    className="btn btn-outline-primary me-2"
                    onClick={handlePrint}
                  >
                    <FaPrint className="me-1" /> Print
                  </button>
                  <button 
                    className="btn btn-outline-danger me-2"
                    onClick={handleGeneratePDF}
                  >
                    <FaFilePdf className="me-1" /> Export PDF
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-outline-secondary" 
                    onClick={handleCloseModal}
                    aria-label="Close"
                  >
                    ✕ Close
                  </button>
                </div>
              </div>
              <div className="modal-body" id="report-content">
                <div className="report-header text-center mb-4">
                  <h2 className="mb-0">MS GOROSPE</h2>
                  <p className="mb-0 fst-italic">Psychological Assessment Center</p>
                  <p className="mb-0 fst-italic">"Your Partner in Building Your Human Capital"</p>
                  <hr />
                  <h3 className="mt-3">
                    {reportType.charAt(0).toUpperCase() + reportType.slice(1)} Test Report
                  </h3>
                </div>
                
                <div className="mb-5">
                  <h5 className="mb-4 text-primary fw-bold">
                    <i className="fas fa-user me-2"></i>Personal Information
                  </h5>
                  <div className="personal-info-table">
                    <table className="table table-borderless mb-0">
                      <tbody>
                        <tr>
                          <th>NAME</th>
                          <td>{selectedTest.patient?.name?.toUpperCase() || 'N/A'}</td>
                          <th>AGE</th>
                          <td>{selectedTest.patient?.age || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th>SEX</th>
                          <td>{selectedTest.patient?.sex?.toUpperCase() || 'N/A'}</td>
                          <th>CIVIL STATUS</th>
                          <td>{selectedTest.patient?.civil_status?.toUpperCase() || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th>DATE OF BIRTH</th>
                          <td>{selectedTest.patient?.date_of_birth ? new Date(selectedTest.patient.date_of_birth).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: '2-digit' 
                          }).toUpperCase() : 'N/A'}</td>
                          <th>PLACE OF BIRTH</th>
                          <td>{selectedTest.patient?.place_of_birth?.toUpperCase() || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th>NATIONALITY</th>
                          <td>{selectedTest.patient?.nationality?.toUpperCase() || 'N/A'}</td>
                          <th>RELIGION</th>
                          <td>{selectedTest.patient?.religion?.toUpperCase() || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th>OCCUPATION</th>
                          <td>{selectedTest.patient?.occupation?.toUpperCase() || 'N/A'}</td>
                          <th>EDUCATIONAL ATTAINMENT</th>
                          <td>{selectedTest.patient?.educational_attainment?.toUpperCase() || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th>ADDRESS</th>
                          <td colSpan="3">{selectedTest.patient?.address?.toUpperCase() || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th>PURPOSE OF EXAMINATION</th>
                          <td colSpan="3">{selectedTest.patient?.purpose_of_examination?.toUpperCase() || 'N/A'}</td>
                        </tr>
                        <tr>
                          <th>DATE OF EXAMINATION</th>
                          <td colSpan="3">{selectedTest.created_at ? new Date(selectedTest.created_at).toLocaleDateString('en-US', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: '2-digit' 
                          }).toUpperCase() : 'N/A'}</td>
                        </tr>
                        <tr>
                          <th>AGENCY/AFFILIATION</th>
                          <td colSpan="3">{selectedTest.patient?.agency_affiliation?.toUpperCase() || 'N/A'}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div className="test-info-section">
                  <h5 className="mb-4 text-primary fw-bold">
                    <i className="fas fa-clipboard-list me-2"></i>Test Information
                  </h5>
                  <div className="row">
                    <div className="col-md-6">
                      <div className="test-info-table">
                        <table className="table table-borderless mb-0">
                          <tbody>
                            <tr>
                              <th>Date of Examination:</th>
                              <td>{new Date(selectedTest.created_at || selectedTest.session_date).toLocaleDateString()}</td>
                            </tr>
                            <tr>
                              <th>{reportType === 'psychotherapy' || reportType === 'aba' ? 'Therapist' : 'Psychometrician'}:</th>
                              <td>{selectedTest.psychometrician_name}</td>
                            </tr>
                            <tr>
                              <th>{reportType === 'neuropsychiatric' ? 'Psychiatrist' : 'Psychologist'}:</th>
                              <td>{selectedTest.psychologist_name}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
                
                {renderReportContent()}

                <div className="mt-4">
                  <h5 className="mb-3">Remarks</h5>
                  <div className="card">
                    <div className="card-body">
                      <p>{selectedTest.remarks || "No remarks provided."}</p>
                    </div>
                  </div>
                </div>
                
                <div className="signatures mt-5">
                  <div className="row">
                    <div className="col-6">
                      <div className="text-center">
                        <p>Prepared by:</p>
                        <div className="signature-line">
                          _______________________________
                        </div>
                        <p className="mb-0">{selectedTest.psychometrician_name}</p>
                        <p className="text-muted">{reportType === 'psychotherapy' || reportType === 'aba' ? 'Therapist' : 'Psychometrician'}</p>
                      </div>
                    </div>
                    <div className="col-6">
                      <div className="text-center">
                        <p>Noted by:</p>
                        <div className="signature-line">
                          _______________________________
                        </div>
                        <p className="mb-0">{selectedTest.psychologist_name}</p>
                        <p className="text-muted">{reportType === 'neuropsychiatric' ? 'Psychiatrist' : 'Psychologist'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleCloseModal}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;