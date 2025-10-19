// pages/PsychologicalTests.jsx - Updated with Improved View and Fixed Error

import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { logAuditEvent, AUDIT_ACTIONS, RESOURCE_TYPES } from '../utils/auditLogger';
import PsychologicalTestForm from '../components/PsychologicalTestForm';
import PsychologicalTestReport from '../components/PsychologicalTestReport';
import { FaPlus, FaEye, FaEdit, FaTrash, FaSearch, FaPrint, FaFileAlt, FaTimes, FaDatabase, FaChevronDown } from 'react-icons/fa';
import { Link } from 'react-router-dom';

const PsychologicalTests = ({ userRole }) => {
  const [activeTab, setActiveTab] = useState('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedTestId, setSelectedTestId] = useState(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [patientId, setPatientId] = useState(null);
  const [debugMode, setDebugMode] = useState(true); // Set to false in production
  const [databaseError, setDatabaseError] = useState(null);
  const itemsPerPage = 10;
  
  // State for modal functionality
  const [showModal, setShowModal] = useState(false);
  const [modalContent, setModalContent] = useState('view'); // 'view', 'edit', or 'delete'
  const [profileComplete, setProfileComplete] = useState(true);
  const [profileCreationInProgress, setProfileCreationInProgress] = useState(false);
  const [showSampleDataCreator, setShowSampleDataCreator] = useState(false);

  useEffect(() => {
    // Get current user
    getCurrentUser();
  }, []);

  useEffect(() => {
    // Fetch tests whenever the page, search query, or patientId changes
    if (currentUser || userRole === 'admin' || userRole === 'psychometrician' || userRole === 'psychologist') {
      fetchTests();
    }
  }, [currentPage, searchQuery, patientId, currentUser, userRole]);

  // Helper function to ensure JSON fields are properly parsed
  const processJsonData = (data) => {
    if (!data) return data;
    
    // Create a deep copy to avoid modifying the original
    const processedData = JSON.parse(JSON.stringify(data));
    
    // Process personality_factors
    if (processedData.personality_factors) {
      if (typeof processedData.personality_factors === 'string') {
        try {
          processedData.personality_factors = JSON.parse(processedData.personality_factors);
          if (debugMode) console.log('Parsed personality_factors from string');
        } catch (e) {
          console.error('Error parsing personality_factors:', e);
          processedData.personality_factors = {};
        }
      } else if (typeof processedData.personality_factors !== 'object') {
        console.error('personality_factors is neither string nor object:', typeof processedData.personality_factors);
        processedData.personality_factors = {};
      }
    } else {
      processedData.personality_factors = {};
    }
    
    // Process personality_interpretations
    if (processedData.personality_interpretations) {
      if (typeof processedData.personality_interpretations === 'string') {
        try {
          processedData.personality_interpretations = JSON.parse(processedData.personality_interpretations);
          if (debugMode) console.log('Parsed personality_interpretations from string');
        } catch (e) {
          console.error('Error parsing personality_interpretations:', e);
          processedData.personality_interpretations = {};
        }
      } else if (typeof processedData.personality_interpretations !== 'object') {
        console.error('personality_interpretations is neither string nor object:', typeof processedData.personality_interpretations);
        processedData.personality_interpretations = {};
      }
    } else {
      processedData.personality_interpretations = {};
    }
    
    // Process workplace_skills
    if (processedData.workplace_skills) {
      if (typeof processedData.workplace_skills === 'string') {
        try {
          processedData.workplace_skills = JSON.parse(processedData.workplace_skills);
          if (debugMode) console.log('Parsed workplace_skills from string');
        } catch (e) {
          console.error('Error parsing workplace_skills:', e);
          processedData.workplace_skills = {};
        }
      } else if (typeof processedData.workplace_skills !== 'object') {
        console.error('workplace_skills is neither string nor object:', typeof processedData.workplace_skills);
        processedData.workplace_skills = {};
      }
    } else {
      processedData.workplace_skills = {};
    }
    
    return processedData;
  };

  // Enhanced debug function to help diagnose any issues
  const debugFetchTests = async () => {
    try {
      console.log('Debug: Starting test fetch');
      
      // First, let's check if the psychological_tests table exists and has data
      const { count: totalCount, error: countError } = await supabase
        .from('psychological_tests')
        .select('*', { count: 'exact', head: true });
        
      if (countError) {
        console.error('Debug: Error checking test count:', countError);
        setDatabaseError('Failed to access psychological_tests table: ' + countError.message);
      } else {
        console.log(`Debug: Found ${totalCount} tests in total`);
      }
      
      // Let's get a few sample records regardless of filters
      const { data: sampleTests, error: sampleError } = await supabase
        .from('psychological_tests')
        .select('id, patient_id, cfit_iq_equivalent')
        .limit(5);
        
      if (sampleError) {
        console.error('Debug: Error fetching sample tests:', sampleError);
      } else {
        console.log('Debug: Sample tests:', sampleTests);
      }
      
      // Check if patient_id is valid (if user is a patient)
      if (userRole === 'patient' && patientId) {
        const { data: patientCheck, error: patientError } = await supabase
          .from('personal_info')
          .select('id, name')
          .eq('id', patientId)
          .single();
          
        if (patientError) {
          console.error('Debug: Error checking patient:', patientError);
        } else {
          console.log('Debug: Patient verified:', patientCheck);
        }
        
        // Check if any tests exist for this patient
        const { data: patientTests, error: ptError } = await supabase
          .from('psychological_tests')
          .select('id')
          .eq('patient_id', patientId);
          
        if (ptError) {
          console.error('Debug: Error checking patient tests:', ptError);
        } else {
          console.log(`Debug: Found ${patientTests?.length || 0} tests for patient ${patientId}`);
        }
      }
      
      // This will help identify if there are issues with the database or just with the query
      console.log('Debug: Fetch test completed');
    } catch (e) {
      console.error('Debug: Unexpected error:', e);
      setDatabaseError('Unexpected error during database debugging: ' + e.message);
    }
  };

  // Function to create a patient profile if one doesn't exist
  const createPatientProfile = async () => {
    if (!currentUser || profileCreationInProgress) return;
    
    try {
      setProfileCreationInProgress(true);
      
      // Get user metadata
      const userData = currentUser.user_metadata || {};
      const fullName = userData.full_name || (userData.first_name && userData.last_name 
          ? `${userData.last_name}, ${userData.first_name}` 
          : currentUser.email.split('@')[0]);
      
      console.log("Creating new patient profile for:", fullName);
      
      // Insert new profile
      const { data: newProfile, error: insertError } = await supabase
        .from('personal_info')
        .insert([
          {
            user_id: currentUser.id,
            name: fullName,
            age: 0, // This will need to be updated
            sex: 'Unspecified',
            civil_status: 'Unspecified',
            nationality: 'Filipino', // Default
            religion: 'Unspecified',
            occupation: 'Unspecified',
            address: 'Unspecified',
            educational_attainment: 'Unspecified',
            purpose_of_examination: 'Initial Assessment',
            date_of_examination: new Date().toISOString().split('T')[0],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (insertError) {
        console.error("Error creating patient profile:", insertError);
        throw insertError;
      }
      
      console.log("Created new patient profile:", newProfile);
      
      if (newProfile && newProfile.length > 0) {
        // Log audit event for patient profile creation
        await logAuditEvent({
          actionType: AUDIT_ACTIONS.CREATE,
          resourceType: RESOURCE_TYPES.PATIENT,
          resourceId: newProfile[0].id,
          description: 'Patient profile created for testing',
          details: {
            patient_name: fullName,
            patient_id: newProfile[0].id,
            user_id: currentUser.id
          }
        });
        
        // Successfully created profile
        setPatientId(newProfile[0].id);
        setProfileComplete(true);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error creating patient profile:", error);
      return false;
    } finally {
      setProfileCreationInProgress(false);
    }
  };

  const getCurrentUser = async () => {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (session?.session?.user) {
        setCurrentUser(session.session.user);
        
        if (debugMode) {
          console.log('Current user:', session.session.user);
          console.log('User role:', userRole);
        }
        
        // If user is a patient, get their patient_id
        if (userRole === 'patient') {
          const { data: patientData, error: patientError } = await supabase
            .from('personal_info')
            .select('id')
            .eq('user_id', session.session.user.id)
            .single();
            
          if (patientError) {
            console.error('Error fetching patient info:', patientError);
            setProfileComplete(false);
            
            if (patientError.code === 'PGRST116') {
              // No rows found - create a profile
              const created = await createPatientProfile();
              if (created) {
                // Refresh the data
                const { data: refreshData } = await supabase
                  .from('personal_info')
                  .select('id')
                  .eq('user_id', session.session.user.id)
                  .single();
                  
                if (refreshData) {
                  setPatientId(refreshData.id);
                  setProfileComplete(true);
                }
              }
            }
          } else if (patientData) {
            setPatientId(patientData.id);
            setProfileComplete(true);
            if (debugMode) {
              console.log('Patient ID set to:', patientData.id);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    } finally {
      // Even if there's an error with the user, try to fetch tests
      fetchTests();
    }
  };

  const fetchTests = async () => {
    setLoading(true);
    setDatabaseError(null);
    
    try {
      // Log the start of the fetch operation
      if (debugMode) {
        console.log('Fetching tests with params:', {
          userRole,
          patientId,
          searchQuery,
          currentPage,
          itemsPerPage
        });
        
        // Run debug function to check database status
        await debugFetchTests();
      }
      
      // Initial query
      let query = supabase
        .from('psychological_tests')
        .select(`
          id,
          patient_id,
          cfit_raw_score,
          cfit_percentile,
          cfit_iq_equivalent,
          cfit_interpretation,
          created_at,
          psychometrician_id,
          psychologist_id,
          personality_factors,
          personality_interpretations,
          workplace_skills,
          workplace_skills_interpretation,
          remarks,
          personal_info:patient_id (name, age, sex, purpose_of_examination, place_of_birth, civil_status, nationality, religion, occupation, address, educational_attainment, date_of_examination, agency_affiliation, date_of_birth),
          psychometrician:psychometrician_id (full_name),
          psychologist:psychologist_id (full_name)
        `);
      
      // Apply patient filter for patient users
      if (userRole === 'patient' && patientId) {
        query = query.eq('patient_id', patientId);
        
        if (debugMode) {
          console.log('Applied patient filter with ID:', patientId);
        }
      }
      
      // Order by creation date descending
      query = query.order('created_at', { ascending: false });
      
      // Execute query
      const { data, error } = await query;
      
      if (error) {
        console.error('Error in data query:', error);
        setDatabaseError('Failed to fetch psychological tests: ' + error.message);
        throw error;
      }
      
      if (debugMode) {
        console.log('Raw data from query:', data);
        console.log('Data length:', data?.length || 0);
      }
      
      // Process the data to handle null or missing relationships
      let processedData = (data || []).map(test => {
        // Process JSON fields
        const processed = processJsonData(test);
        
        // Ensure all required fields exist with fallback values
        return {
          ...processed,
          personal_info: processed.personal_info || {
            name: 'Unknown Patient',
            age: 'N/A',
            sex: 'N/A',
            purpose_of_examination: 'N/A'
          },
          psychometrician: processed.psychometrician || { full_name: 'Unassigned' },
          psychologist: processed.psychologist || { full_name: 'Unassigned' }
        };
      });
      
      // Apply client-side filtering for search if needed
      if (searchQuery && searchQuery.trim() !== '') {
        const searchLower = searchQuery.toLowerCase();
        processedData = processedData.filter(test => 
          test.personal_info?.name?.toLowerCase().includes(searchLower)
        );
        
        if (debugMode) {
          console.log('After search filtering:', processedData.length);
        }
      }
      
      // Apply pagination after all filters (client-side)
      const paginatedData = processedData.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );
      
      // Update tests state
      setTests(paginatedData);
      setTotalPages(Math.ceil(processedData.length / itemsPerPage) || 1);
      
      // Debug log
      if (debugMode) {
        console.log('Processed tests:', processedData);
        console.log('Tests count after processing:', processedData.length);
        console.log('Paginated tests:', paginatedData);
      }
    } catch (error) {
      console.error('Error fetching tests:', error);
      // Set empty array to avoid undefined errors
      setTests([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Sample data insertion function
  const insertSampleTestData = async () => {
    try {
      // Get a patient ID or create a new patient
      let usePatientId = patientId;
      
      if (!usePatientId) {
        // Get a random patient ID from the database
        const { data: patients, error: patientError } = await supabase
          .from('personal_info')
          .select('id')
          .limit(1);
          
        if (patientError || !patients || patients.length === 0) {
          // Create a sample patient if none exists
          const { data: newPatient, error: newPatientError } = await supabase
            .from('personal_info')
            .insert([
              {
                name: 'Sample Patient',
                age: 30,
                sex: 'Male',
                civil_status: 'Single',
                nationality: 'Filipino',
                purpose_of_examination: 'Employment',
                date_of_examination: new Date().toISOString().split('T')[0]
              }
            ])
            .select();
            
          if (newPatientError) {
            throw new Error(`Failed to create sample patient: ${newPatientError.message}`);
          }
          
          usePatientId = newPatient[0].id;
          console.log(`Created new sample patient with ID: ${usePatientId}`);
        } else {
          usePatientId = patients[0].id;
          console.log(`Using existing patient with ID: ${usePatientId}`);
        }
      }
      
      // Get staff IDs (psychometrician and psychologist)
      const { data: staffData, error: staffError } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('role', ['psychometrician', 'psychologist'])
        .limit(5);
        
      // Extract IDs by role
      let psychometricianId = null;
      let psychologistId = null;
      
      if (!staffError && staffData && staffData.length > 0) {
        psychometricianId = staffData.find(s => s.role === 'psychometrician')?.user_id || null;
        psychologistId = staffData.find(s => s.role === 'psychologist')?.user_id || null;
      }
      
      // Sample personality factors and workplace skills
      const personalityFactors = {
        warmth: Math.floor(Math.random() * 10) + 1,
        reasoning: Math.floor(Math.random() * 10) + 1,
        emotionalStability: Math.floor(Math.random() * 10) + 1,
        dominance: Math.floor(Math.random() * 10) + 1,
        liveliness: Math.floor(Math.random() * 10) + 1,
        ruleConsciousness: Math.floor(Math.random() * 10) + 1,
        socialBoldness: Math.floor(Math.random() * 10) + 1,
        sensitivity: Math.floor(Math.random() * 10) + 1,
        vigilance: Math.floor(Math.random() * 10) + 1,
        abstractedness: Math.floor(Math.random() * 10) + 1,
        privateness: Math.floor(Math.random() * 10) + 1,
        apprehension: Math.floor(Math.random() * 10) + 1,
        opennessToChange: Math.floor(Math.random() * 10) + 1,
        selfReliance: Math.floor(Math.random() * 10) + 1,
        perfectionism: Math.floor(Math.random() * 10) + 1,
        tension: Math.floor(Math.random() * 10) + 1
      };
      
      const workplaceSkills = {
        communication: ['above_average', 'average', 'below_average'][Math.floor(Math.random() * 3)],
        adaptingToChange: ['above_average', 'average', 'below_average'][Math.floor(Math.random() * 3)],
        problemSolving: ['above_average', 'average', 'below_average'][Math.floor(Math.random() * 3)],
        workEthics: ['above_average', 'average', 'below_average'][Math.floor(Math.random() * 3)],
        technologicalLiteracy: ['above_average', 'average', 'below_average'][Math.floor(Math.random() * 3)],
        teamwork: ['above_average', 'average', 'below_average'][Math.floor(Math.random() * 3)],
        summary: 'This is a sample workplace skills summary generated for testing purposes.'
      };
      
      // Insert sample test data
      const raw_score = Math.floor(Math.random() * 30) + 10;
      const percentile = Math.floor(Math.random() * 100);
      const iq_equivalent = 70 + Math.floor(Math.random() * 60);
      
      const { data: newTest, error: testError } = await supabase
        .from('psychological_tests')
        .insert([
          {
            patient_id: usePatientId,
            cfit_raw_score: raw_score,
            cfit_percentile: percentile,
            cfit_iq_equivalent: iq_equivalent,
            cfit_interpretation: `Sample interpretation for CFIT score of ${iq_equivalent}`,
            personality_factors: personalityFactors,
            personality_interpretations: {
              warmth: 'Sample warmth interpretation',
              reasoning: 'Sample reasoning interpretation',
              emotionalStability: 'Sample emotional stability interpretation',
              dominance: 'Sample dominance interpretation',
              liveliness: 'Sample liveliness interpretation',
              ruleConsciousness: 'Sample rule consciousness interpretation',
              socialBoldness: 'Sample social boldness interpretation',
              sensitivity: 'Sample sensitivity interpretation',
              vigilance: 'Sample vigilance interpretation',
              abstractedness: 'Sample abstractedness interpretation',
              privateness: 'Sample privateness interpretation',
              apprehension: 'Sample apprehension interpretation',
              opennessToChange: 'Sample openness to change interpretation',
              selfReliance: 'Sample self-reliance interpretation',
              perfectionism: 'Sample perfectionism interpretation',
              tension: 'Sample tension interpretation'
            },
            workplace_skills: workplaceSkills,
            workplace_skills_interpretation: workplaceSkills.summary,
            remarks: 'This is a sample test record created for testing purposes.',
            psychometrician_id: psychometricianId,
            psychologist_id: psychologistId,
            created_at: new Date().toISOString()
          }
        ])
        .select();
      
      if (testError) {
        throw new Error(`Failed to create sample test: ${testError.message}`);
      }
      
      console.log('Created sample test data:', newTest);
      
      // Refresh the tests list
      fetchTests();
      
      return { success: true, message: 'Sample test data inserted successfully!' };
    } catch (error) {
      console.error('Error inserting sample data:', error);
      return { success: false, message: `Failed to insert sample data: ${error.message}` };
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTests();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'list') {
      fetchTests();
    }
  };

  const handleFormSuccess = () => {
    // After a test is successfully added, switch back to list tab and refresh the list
    setActiveTab('list');
    fetchTests();
  };

  // Fixed handleViewTest function to ensure we have a valid ID
  const handleViewTest = async (id) => {
    try {
      if (!id) {
        console.error('Invalid test ID: null or undefined');
        alert('Error: Test ID is missing');
        return;
      }
      
      setSelectedTestId(id);
      
      const { data, error } = await supabase
        .from('psychological_tests')
        .select(`
          *,
          personal_info:patient_id (*),
          psychometrician:psychometrician_id (id, full_name),
          psychologist:psychologist_id (id, full_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      
      // Process JSON fields before setting state
      const processedData = processJsonData(data);
      
      // Ensure workplace_skills has the summary from workplace_skills_interpretation if needed
      if (processedData.workplace_skills && !processedData.workplace_skills.summary && processedData.workplace_skills_interpretation) {
        processedData.workplace_skills.summary = processedData.workplace_skills_interpretation;
      }
      
      if (debugMode) {
        console.log('Raw test data:', data);
        console.log('Processed test data:', processedData);
        console.log('personality_factors type:', typeof processedData.personality_factors);
        console.log('personality_interpretations type:', typeof processedData.personality_interpretations);
        console.log('workplace_skills type:', typeof processedData.workplace_skills);
      }
      
      setSelectedTest(processedData);
      
      // For modal view
      if (showModal) {
        setModalContent('view');
      } else {
        setActiveTab('view');
      }
    } catch (error) {
      console.error('Error fetching test details:', error);
      alert('Error loading test details: ' + error.message);
    }
  };
  
  // Fixed openModal function to ensure proper ID passing
  const openModal = (contentType, testId) => {
    if (!testId) {
      console.error('Cannot open modal: Test ID is missing');
      alert('Error: Cannot open test details - ID is missing');
      return;
    }
    
    setModalContent(contentType);
    setSelectedTestId(testId);
    
    if (contentType === 'view' || contentType === 'edit') {
      handleViewTest(testId);
    }
    
    setShowModal(true);
  };

  const confirmDelete = (id) => {
    setSelectedTestId(id);
    setDeleteConfirmation(true);
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('psychological_tests')
        .delete()
        .eq('id', selectedTestId);

      if (error) throw error;
      
      // Log audit event for test deletion
      await logAuditEvent({
        actionType: AUDIT_ACTIONS.DELETE,
        resourceType: RESOURCE_TYPES.TEST_RESULT,
        resourceId: selectedTestId,
        description: 'Psychological test record deleted',
        details: {
          test_id: selectedTestId,
          test_type: 'psychological',
          deleted_by_user: currentUser?.email
        }
      });
      
      // After successful deletion, close the confirmation dialog and refresh the list
      setDeleteConfirmation(false);
      setSelectedTestId(null);
      fetchTests();
      
      // Close modal if open
      if (showModal) {
        closeModal();
      }
    } catch (error) {
      console.error('Error deleting test:', error);
      alert('Error deleting test: ' + error.message);
    }
  };

  // Handle closing the modal
  const closeModal = () => {
    setShowModal(false);
    setSelectedTest(null);
    setSelectedTestId(null);
  };

  // Helper functions for safely accessing personality factors and workplace skills data
  const getPersonalityFactor = (key) => {
    try {
      if (!selectedTest || !selectedTest.personality_factors) return 'N/A';
      
      if (typeof selectedTest.personality_factors === 'string') {
        const parsed = JSON.parse(selectedTest.personality_factors);
        return parsed[key] || 'N/A';
      } 
      return selectedTest.personality_factors[key] || 'N/A';
    } catch (e) {
      console.error(`Error getting personality factor ${key}:`, e);
      return 'N/A';
    }
  };

  const getPersonalityInterpretation = (key) => {
    try {
      if (!selectedTest || !selectedTest.personality_interpretations) return 'N/A';
      
      if (typeof selectedTest.personality_interpretations === 'string') {
        const parsed = JSON.parse(selectedTest.personality_interpretations);
        return parsed[key] || 'N/A';
      }
      return selectedTest.personality_interpretations[key] || 'N/A';
    } catch (e) {
      console.error(`Error getting personality interpretation ${key}:`, e);
      return 'N/A';
    }
  };

  const getWorkplaceSkill = (key) => {
    try {
      if (!selectedTest || !selectedTest.workplace_skills) return 'N/A';
      
      if (typeof selectedTest.workplace_skills === 'string') {
        const parsed = JSON.parse(selectedTest.workplace_skills);
        return parsed[key] || 'N/A';
      }
      return selectedTest.workplace_skills[key] || 'N/A';
    } catch (e) {
      console.error(`Error getting workplace skill ${key}:`, e);
      return 'N/A';
    }
  };

  const getWorkplaceSkillLabel = (value) => {
    if (value === 'above_average') return 'Above Average';
    if (value === 'average') return 'Average';
    if (value === 'below_average') return 'Below Average';
    return 'N/A';
  };

  const renderTestsList = () => {
    return (
      <div className="tests-list">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">Psychological Tests</h4>
          <div>
           
            {(userRole === 'admin' || userRole === 'psychometrician' || userRole === 'psychologist') && (
              <button
                className="btn btn-primary"
                onClick={() => handleTabChange('add')}
              >
                <FaPlus className="me-2" />
                Add New Test
              </button>
            )}
          </div>
        </div>

        {showSampleDataCreator && (
          <div className="card mb-4 bg-light">
            <div className="card-header bg-warning">
              <h5 className="mb-0">Sample Data Creator (Debug Mode)</h5>
            </div>
            <div className="card-body">
              <p>Click the button below to insert sample psychological test data for testing purposes.</p>
              <button 
                className="btn btn-success"
                onClick={async () => {
                  const result = await insertSampleTestData();
                  alert(result.message);
                }}
              >
                <FaDatabase className="me-2" />
                Insert Sample Test Data
              </button>
            </div>
          </div>
        )}

        {databaseError && (
          <div className="alert alert-danger mb-4">
            <h5>Database Error</h5>
            <p>{databaseError}</p>
            <button 
              className="btn btn-sm btn-outline-danger"
              onClick={() => fetchTests()}
            >
              Retry
            </button>
          </div>
        )}

        <div className="card mb-4">
          <div className="card-body">
            <form onSubmit={handleSearch} className="search-box mb-3">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by patient name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-primary" type="submit">
                  <FaSearch />
                </button>
              </div>
            </form>

            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Patient Name</th>
                    <th>Age</th>
                    <th>Sex</th>
                    <th>Purpose</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="6" className="text-center py-4">
                        <div className="spinner-border text-primary" role="status">
                          <span className="visually-hidden">Loading...</span>
                        </div>
                      </td>
                    </tr>
                  ) : tests && tests.length > 0 ? (
                    tests.map((test) => (
                      <tr key={test.id}>
                        <td>{test.personal_info?.name || 'Unknown'}</td>
                        <td>{test.personal_info?.age || 'N/A'}</td>
                        <td>{test.personal_info?.sex || 'N/A'}</td>
                        <td>{test.personal_info?.purpose_of_examination || 'N/A'}</td>
                        <td>{test.created_at ? new Date(test.created_at).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <div className="d-flex">
                            <button
                              className="btn btn-sm btn-outline-success me-2"
                              onClick={() => {
                                setSelectedTestId(test.id);
                                handleViewTest(test.id);
                                setActiveTab('report');
                              }}
                              title="Report"
                            >
                              <FaEye />
                            </button>
                            {(userRole === 'psychometrician' || userRole === 'admin') && (
                              <>
                                <button
                                  className="btn btn-sm btn-outline-warning me-2"
                                  onClick={() => openModal('edit', test.id)}
                                  title="Edit"
                                >
                                  <FaEdit />
                                </button>
                                <button
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => confirmDelete(test.id)}
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
                      <td colSpan="6" className="text-center py-4">
                        {!profileComplete && userRole === 'patient' ? (
                          <div>
                            <p>Your profile needs to be completed before tests can be added.</p>
                            <Link to="/profile/edit" className="btn btn-primary">
                              Complete Profile
                            </Link>
                          </div>
                        ) : (
                          <div>
                            <p>No psychological tests found in the database.</p>
                            {(userRole === 'psychometrician' || userRole === 'admin') && (
                              <div className="mt-3">
                                <button
                                  className="btn btn-primary me-2"
                                  onClick={() => handleTabChange('add')}
                                >
                                  <FaPlus className="me-2" />
                                  Add First Test
                                </button>
                                {debugMode && (
                                  <button
                                    className="btn btn-warning"
                                    onClick={async () => {
                                      const result = await insertSampleTestData();
                                      alert(result.message);
                                    }}
                                  >
                                    <FaDatabase className="me-2" />
                                    Add Sample Test Data
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="d-flex justify-content-center mt-4">
                <nav aria-label="Page navigation">
                  <ul className="pagination">
                    <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                      >
                        Previous
                      </button>
                    </li>
                    {[...Array(totalPages).keys()].map((page) => (
                      <li
                        key={page + 1}
                        className={`page-item ${currentPage === page + 1 ? 'active' : ''}`}
                      >
                        <button
                          className="page-link"
                          onClick={() => handlePageChange(page + 1)}
                        >
                          {page + 1}
                        </button>
                      </li>
                    ))}
                    <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                      <button
                        className="page-link"
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                      >
                        Next
                      </button>
                    </li>
                  </ul>
                </nav>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render test view in a modal
  const renderModalContent = () => {
    if (!selectedTest) return null;
    
    
    if (modalContent === 'edit') {
      return (
        <div className="modal-content">
          <div className="modal-header bg-primary text-white">
            <h5 className="modal-title">Edit Psychological Test</h5>
            <button type="button" className="btn-close" onClick={closeModal}></button>
          </div>
          <div className="modal-body">
            <PsychologicalTestForm 
              testId={selectedTest.id}
              userRole={userRole}
              onSuccess={() => {
                closeModal();
                fetchTests();
              }}
            />
          </div>
        </div>
      );
    }
    
    // Default to view mode
    return (
      <div className="modal-content">
        <div className="modal-header bg-info text-white">
          <h5 className="modal-title">Psychological Test Details</h5>
          <button type="button" className="btn-close" onClick={closeModal}></button>
        </div>
        <div className="modal-body">
          <div className="card mb-3">
            <div className="card-header bg-light">
              <h6 className="mb-0">Patient Information</h6>
            </div>
            <div className="card-body">
              <table className="table table-bordered">
                <tbody>
                  <tr>
                    <td><strong>NAME:</strong> {selectedTest.personal_info?.name || 'N/A'}</td>
                    <td><strong>AGE:</strong> {selectedTest.personal_info?.age || 'N/A'}</td>
                    <td><strong>SEX:</strong> {selectedTest.personal_info?.sex || 'Unspecified'}</td>
                    <td><strong>CIVIL STATUS:</strong> {selectedTest.personal_info?.civil_status || 'Unspecified'}</td>
                  </tr>
                  <tr>
                    <td colSpan="2"><strong>DATE OF BIRTH:</strong> {selectedTest.personal_info?.date_of_birth ? new Date(selectedTest.personal_info.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                    <td colSpan="2"><strong>PLACE OF BIRTH:</strong> {selectedTest.personal_info?.place_of_birth || 'Unspecified'}</td>
                  </tr>
                  <tr>
                    <td><strong>NATIONALITY:</strong> {selectedTest.personal_info?.nationality || 'Filipino'}</td>
                    <td><strong>RELIGION:</strong> {selectedTest.personal_info?.religion || 'Unspecified'}</td>
                    <td colSpan="2"><strong>OCCUPATION:</strong> {selectedTest.personal_info?.occupation || 'Unspecified'}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>ADDRESS:</strong> {selectedTest.personal_info?.address || 'Unspecified'}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>EDUCATIONAL ATTAINMENT:</strong> {selectedTest.personal_info?.educational_attainment || 'Unspecified'}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>PURPOSE OF EXAMINATION:</strong> {selectedTest.personal_info?.purpose_of_examination || 'Initial Assessment'}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>DATE OF EXAMINATION:</strong> {selectedTest.personal_info?.date_of_examination ? new Date(selectedTest.personal_info.date_of_examination).toLocaleDateString() : 'N/A'}</td>
                  </tr>
                  <tr>
                    <td colSpan="4"><strong>AGENCY/AFFILIATION:</strong> {selectedTest.personal_info?.agency_affiliation || ''}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <div className="card mb-3">
            <div className="card-header bg-light">
              <h6 className="mb-0">CFIT Results</h6>
            </div>
            <div className="card-body">
              <div className="row">
                <div className="col-md-4">
                  <p><strong>Raw Score:</strong> {selectedTest.cfit_raw_score || 'N/A'}</p>
                </div>
                <div className="col-md-4">
                  <p><strong>Percentile:</strong> {selectedTest.cfit_percentile || 'N/A'}</p>
                </div>
                <div className="col-md-4">
                  <p><strong>IQ Equivalent:</strong> {selectedTest.cfit_iq_equivalent || 'N/A'}</p>
                </div>
              </div>
              <div className="mt-2">
                <p><strong>Interpretation:</strong></p>
                <p>{selectedTest.cfit_interpretation || 'No interpretation available.'}</p>
              </div>
            </div>
          </div>
          
          <div className="card mb-3">
            <div className="card-header bg-light">
              <h6 className="mb-0">Key Personality Factors</h6>
            </div>
            <div className="card-body">
              <div className="row">
                {['warmth', 'reasoning', 'emotionalStability', 'dominance', 'liveliness', 'ruleConsciousness'].map(key => (
                  <div className="col-md-6" key={key}>
                    <p>
                      <strong>{key.charAt(0).toUpperCase() + key.slice(1)}:</strong> {getPersonalityFactor(key)}
                      {parseInt(getPersonalityFactor(key)) <= 5 ? ' (Low)' : ' (High)'}
                    </p>
                  </div>
                ))}
              </div>
              <div className="mt-2">
                <button className="btn btn-sm btn-outline-info" onClick={() => setActiveTab('view')}>
                  View Full Results
                </button>
              </div>
            </div>
          </div>
          
          <div className="card">
            <div className="card-header bg-light">
              <h6 className="mb-0">Workplace Skills Summary</h6>
            </div>
            <div className="card-body">
              <p>{getWorkplaceSkill('summary') || 'No summary available.'}</p>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <div className="d-flex justify-content-between w-100">
            <div>
              {(userRole === 'psychometrician' || userRole === 'admin') && (
                <>
                  <button className="btn btn-warning me-2" onClick={() => setModalContent('edit')}>
                    <FaEdit className="me-1" /> Edit
                  </button>
                  <button className="btn btn-danger me-2" onClick={() => {
                    closeModal();
                    confirmDelete(selectedTest.id);
                  }}>
                    <FaTrash className="me-1" /> Delete
                  </button>
                </>
              )}
            </div>
            <div>
              <button className="btn btn-secondary" onClick={closeModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderViewTest = () => {
    if (!selectedTest) return null;

    return (
      <div className="view-test">
       
        
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">Psychological Test Results</h4>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handleTabChange('list')}
          >
            Back to List
          </button>
        </div>

       
        <div className="card mb-4">
          <div className="card-header bg-light">
            <h6 className="mb-0">Patient Information</h6>
          </div>
          <div className="card-body">
            <table className="table table-bordered">
              <tbody>
                <tr>
                  <td><strong>NAME:</strong> {selectedTest.personal_info?.name || 'N/A'}</td>
                  <td><strong>AGE:</strong> {selectedTest.personal_info?.age || 'N/A'}</td>
                  <td><strong>SEX:</strong> {selectedTest.personal_info?.sex || 'Unspecified'}</td>
                  <td><strong>CIVIL STATUS:</strong> {selectedTest.personal_info?.civil_status || 'Unspecified'}</td>
                </tr>
                <tr>
                  <td colSpan="2"><strong>DATE OF BIRTH:</strong> {selectedTest.personal_info?.date_of_birth ? new Date(selectedTest.personal_info.date_of_birth).toLocaleDateString() : 'N/A'}</td>
                  <td colSpan="2"><strong>PLACE OF BIRTH:</strong> {selectedTest.personal_info?.place_of_birth || 'Unspecified'}</td>
                </tr>
                <tr>
                  <td><strong>NATIONALITY:</strong> {selectedTest.personal_info?.nationality || 'Filipino'}</td>
                  <td><strong>RELIGION:</strong> {selectedTest.personal_info?.religion || 'Unspecified'}</td>
                  <td colSpan="2"><strong>OCCUPATION:</strong> {selectedTest.personal_info?.occupation || 'Unspecified'}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>ADDRESS:</strong> {selectedTest.personal_info?.address || 'Unspecified'}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>EDUCATIONAL ATTAINMENT:</strong> {selectedTest.personal_info?.educational_attainment || 'Unspecified'}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>PURPOSE OF EXAMINATION:</strong> {selectedTest.personal_info?.purpose_of_examination || 'Initial Assessment'}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>DATE OF EXAMINATION:</strong> {selectedTest.personal_info?.date_of_examination ? new Date(selectedTest.personal_info.date_of_examination).toLocaleDateString() : 'N/A'}</td>
                </tr>
                <tr>
                  <td colSpan="4"><strong>AGENCY/AFFILIATION:</strong> {selectedTest.personal_info?.agency_affiliation || ''}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header primary">
            <h5 className="mb-0 text-white">CFIT Results</h5>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-4">
                <p><strong>Raw Score:</strong> {selectedTest.cfit_raw_score || 'N/A'}</p>
              </div>
              <div className="col-md-4">
                <p><strong>Percentile:</strong> {selectedTest.cfit_percentile || 'N/A'}</p>
              </div>
              <div className="col-md-4">
                <p><strong>IQ Equivalent:</strong> {selectedTest.cfit_iq_equivalent || 'N/A'}</p>
              </div>
            </div>
            <div className="card interpretation-card">
              <div className="card-body">
                <h6 className="card-title">Interpretation</h6>
                <p>{selectedTest.cfit_interpretation || 'No interpretation available.'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header primary">
            <h5 className="mb-0 text-white">16 Personality Factors</h5>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table">
                <thead>
                  <tr>
                    <th>Factor</th>
                    <th>Score</th>
                    <th>Interpretation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>A (Warmth)</td>
                    <td>{getPersonalityFactor('warmth')}</td>
                    <td>
                      {getPersonalityInterpretation('warmth') || 
                        (parseInt(getPersonalityFactor('warmth')) <= 5
                          ? "Reserved, detached, critical, aloof, stiff"
                          : "Outgoing, kindly, easygoing, participating, warm-hearted")}
                    </td>
                  </tr>
                  <tr>
                    <td>B (Reasoning)</td>
                    <td>{getPersonalityFactor('reasoning')}</td>
                    <td>
                      {getPersonalityInterpretation('reasoning') ||
                        (parseInt(getPersonalityFactor('reasoning')) <= 5
                          ? "Concrete thinking, less intelligent, lower general mental capacity"
                          : "Abstract thinking, more intelligent, higher general mental capacity")}
                    </td>
                  </tr>
                  <tr>
                    <td>C (Emotional Stability)</td>
                    <td>{getPersonalityFactor('emotionalStability')}</td>
                    <td>
                      {getPersonalityInterpretation('emotionalStability') ||
                        (parseInt(getPersonalityFactor('emotionalStability')) <= 5
                          ? "Reactive emotionally, affected by feelings, emotionally less stable"
                          : "Emotionally stable, adaptive, mature, faces reality calmly")}
                    </td>
                  </tr>
                  <tr>
                    <td>E (Dominance)</td>
                    <td>{getPersonalityFactor('dominance')}</td>
                    <td>
                      {getPersonalityInterpretation('dominance') ||
                        (parseInt(getPersonalityFactor('dominance')) <= 5
                          ? "Deferential, cooperative, avoids conflict, submissive"
                          : "Dominant, forceful, assertive, competitive, stubborn")}
                    </td>
                  </tr>
                  <tr>
                    <td>F (Liveliness)</td>
                    <td>{getPersonalityFactor('liveliness')}</td>
                    <td>
                      {getPersonalityInterpretation('liveliness') ||
                        (parseInt(getPersonalityFactor('liveliness')) <= 5
                          ? "Serious, restrained, prudent, taciturn, introspective"
                          : "Lively, animated, spontaneous, enthusiastic, cheerful")}
                    </td>
                  </tr>
                  <tr>
                    <td>G (Rule-Consciousness)</td>
                    <td>{getPersonalityFactor('ruleConsciousness')}</td>
                    <td>
                      {getPersonalityInterpretation('ruleConsciousness') ||
                        (parseInt(getPersonalityFactor('ruleConsciousness')) <= 5
                          ? "Expedient, nonconforming, disregards rules"
                          : "Rule-conscious, dutiful, conscientious, conforming")}
                    </td>
                  </tr>
                  <tr>
                    <td>H (Social Boldness)</td>
                    <td>{getPersonalityFactor('socialBoldness')}</td>
                    <td>
                      {getPersonalityInterpretation('socialBoldness') ||
                        (parseInt(getPersonalityFactor('socialBoldness')) <= 5
                          ? "Shy, threat-sensitive, timid, hesitant, intimidated"
                          : "Socially bold, venturesome, thick-skinned, uninhibited")}
                    </td>
                  </tr>
                  <tr>
                    <td>I (Sensitivity)</td>
                    <td>{getPersonalityFactor('sensitivity')}</td>
                    <td>
                      {getPersonalityInterpretation('sensitivity') ||
                        (parseInt(getPersonalityFactor('sensitivity')) <= 5
                          ? "Utilitarian, objective, unsentimental, tough minded"
                          : "Sensitive, aesthetic, sentimental, tender-minded")}
                    </td>
                  </tr>
                  <tr>
                    <td>L (Vigilance)</td>
                    <td>{getPersonalityFactor('vigilance')}</td>
                    <td>
                      {getPersonalityInterpretation('vigilance') ||
                        (parseInt(getPersonalityFactor('vigilance')) <= 5
                          ? "Trusting, accepting conditions, easy to get on with"
                          : "Vigilant, suspicious, skeptical, distrustful, oppositional")}
                    </td>
                  </tr>
                  <tr>
                    <td>M (Abstractedness)</td>
                    <td>{getPersonalityFactor('abstractedness')}</td>
                    <td>
                      {getPersonalityInterpretation('abstractedness') ||
                        (parseInt(getPersonalityFactor('abstractedness')) <= 5
                          ? "Grounded, practical, solution-oriented, down-to-earth"
                          : "Abstract, imaginative, idea-oriented, impractical")}
                    </td>
                  </tr>
                  <tr>
                    <td>N (Privateness)</td>
                    <td>{getPersonalityFactor('privateness')}</td>
                    <td>
                      {getPersonalityInterpretation('privateness') ||
                        (parseInt(getPersonalityFactor('privateness')) <= 5
                          ? "Forthright, genuine, artless, open, guileless, naive"
                          : "Private, discreet, non-disclosing, shrewd, polished")}
                    </td>
                  </tr>
                  <tr>
                    <td>O (Apprehension)</td>
                    <td>{getPersonalityFactor('apprehension')}</td>
                    <td>
                      {getPersonalityInterpretation('apprehension') ||
                        (parseInt(getPersonalityFactor('apprehension')) <= 5
                          ? "Self-assured, unworried, complacent, secure, confident"
                          : "Apprehensive, self-doubting, worried, guilt-prone, insecure")}
                    </td>
                  </tr>
                  <tr>
                    <td>Q1 (Openness to Change)</td>
                    <td>{getPersonalityFactor('opennessToChange')}</td>
                    <td>
                      {getPersonalityInterpretation('opennessToChange') ||
                        (parseInt(getPersonalityFactor('opennessToChange')) <= 5
                          ? "Traditional, attached to familiar, conservative"
                          : "Open to change, experimental, liberal, analytical")}
                    </td>
                  </tr>
                  <tr>
                    <td>Q2 (Self-Reliance)</td>
                    <td>{getPersonalityFactor('selfReliance')}</td>
                    <td>
                      {getPersonalityInterpretation('selfReliance') ||
                        (parseInt(getPersonalityFactor('selfReliance')) <= 5
                          ? "Group-oriented, affiliative, a joiner and follower"
                          : "Self-reliant, solitary, individualistic, self-sufficient")}
                    </td>
                  </tr>
                  <tr>
                    <td>Q3 (Perfectionism)</td>
                    <td>{getPersonalityFactor('perfectionism')}</td>
                    <td>
                      {getPersonalityInterpretation('perfectionism') ||
                        (parseInt(getPersonalityFactor('perfectionism')) <= 5
                          ? "Tolerates disorder, unexacting, flexible, undisciplined"
                          : "Perfectionistic, organized, self-disciplined, compulsive")}
                    </td>
                  </tr>
                  <tr>
                    <td>Q4 (Tension)</td>
                    <td>{getPersonalityFactor('tension')}</td>
                    <td>
                      {getPersonalityInterpretation('tension') ||
                        (parseInt(getPersonalityFactor('tension')) <= 5
                          ? "Relaxed, placid, patient, composed, has low drive"
                          : "Tense, high energy, impatient, driven, frustrated")}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="card mb-4">
          <div className="card-header primary">
            <h5 className="mb-0 text-white">Workplace Skills Survey (WSS)</h5>
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
                  <tr>
                    <td>Communication</td>
                    <td>
                      <span className={`badge ${
                        getWorkplaceSkill('communication') === 'above_average'
                          ? 'bg-success'
                          : getWorkplaceSkill('communication') === 'below_average'
                          ? 'bg-danger'
                          : 'bg-warning'
                      }`}>
                        {getWorkplaceSkillLabel(getWorkplaceSkill('communication'))}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Adapting to Change</td>
                    <td>
                      <span className={`badge ${
                        getWorkplaceSkill('adaptingToChange') === 'above_average'
                          ? 'bg-success'
                          : getWorkplaceSkill('adaptingToChange') === 'below_average'
                          ? 'bg-danger'
                          : 'bg-warning'
                      }`}>
                        {getWorkplaceSkillLabel(getWorkplaceSkill('adaptingToChange'))}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Problem Solving</td>
                    <td>
                      <span className={`badge ${
                        getWorkplaceSkill('problemSolving') === 'above_average'
                          ? 'bg-success'
                          : getWorkplaceSkill('problemSolving') === 'below_average'
                          ? 'bg-danger'
                          : 'bg-warning'
                      }`}>
                        {getWorkplaceSkillLabel(getWorkplaceSkill('problemSolving'))}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Work Ethics</td>
                    <td>
                      <span className={`badge ${
                        getWorkplaceSkill('workEthics') === 'above_average'
                          ? 'bg-success'
                          : getWorkplaceSkill('workEthics') === 'below_average'
                          ? 'bg-danger'
                          : 'bg-warning'
                      }`}>
                        {getWorkplaceSkillLabel(getWorkplaceSkill('workEthics'))}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Technological Literacy</td>
                    <td>
                      <span className={`badge ${
                        getWorkplaceSkill('technologicalLiteracy') === 'above_average'
                          ? 'bg-success'
                          : getWorkplaceSkill('technologicalLiteracy') === 'below_average'
                          ? 'bg-danger'
                          : 'bg-warning'
                      }`}>
                        {getWorkplaceSkillLabel(getWorkplaceSkill('technologicalLiteracy'))}
                      </span>
                    </td>
                  </tr>
                  <tr>
                    <td>Teamwork</td>
                    <td>
                      <span className={`badge ${
                        getWorkplaceSkill('teamwork') === 'above_average'
                          ? 'bg-success'
                          : getWorkplaceSkill('teamwork') === 'below_average'
                          ? 'bg-danger'
                          : 'bg-warning'
                      }`}>
                        {getWorkplaceSkillLabel(getWorkplaceSkill('teamwork'))}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
              
              <div className="card mt-3">
                <div className="card-header bg-light d-flex justify-content-between align-items-center">
                  <h6 className="card-title mb-0">Summary</h6>
                  <button 
                    className="btn btn-sm btn-outline-primary" 
                    type="button" 
                    data-bs-toggle="collapse" 
                    data-bs-target="#workplaceSkillsSummary" 
                    aria-expanded="false" 
                    aria-controls="workplaceSkillsSummary"
                  >
                    <FaChevronDown className="me-1" /> View Details
                  </button>
                </div>
                <div className="collapse" id="workplaceSkillsSummary">
                  <div className="card-body">
                    <p>{getWorkplaceSkill('summary') || 'No summary available.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {selectedTest.remarks && (
          <div className="card mb-4">
            <div className="card-header primary">
              <h5 className="mb-0 text-white">Remarks</h5>
            </div>
            <div className="card-body">
              <p>{selectedTest.remarks}</p>
            </div>
          </div>
        )}

        <div className="d-flex justify-content-between mt-4">
          <button
            className="btn btn-outline-secondary"
            onClick={() => handleTabChange('list')}
          >
            Back to List
          </button>
          <div>
            <button
              className="btn btn-outline-primary me-2"
              onClick={() => setActiveTab('report')}
            >
              <FaFileAlt className="me-2" /> Generate Report
            </button>
            <button
              className="btn btn-primary"
              onClick={() => window.print()}
            >
              <FaPrint className="me-2" /> Print View
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Render add test form
  const renderAddTest = () => {
    return (
      <div className="add-test">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">Add New Psychological Test</h4>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handleTabChange('list')}
          >
            Back to List
          </button>
        </div>
        
        <PsychologicalTestForm 
          userRole={userRole}
          onSuccess={handleFormSuccess}
        />
      </div>
    );
  };

  const renderReport = () => {
    return (
      <div className="report-view">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h4 className="mb-0">Psychological Test Report</h4>
          <button
            className="btn btn-outline-secondary"
            onClick={() => handleTabChange('list')}
          >
            Back to List
          </button>
        </div>
        
        <PsychologicalTestReport 
          testId={selectedTest?.id} 
          onClose={() => handleTabChange('list')}
        />
      </div>
    );
  };

  // Delete confirmation modal
  const renderDeleteConfirmation = () => {
    return (
      <div className={`modal ${deleteConfirmation ? 'd-block' : ''}`} tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Confirm Delete</h5>
              <button
                type="button"
                className="btn-close"
                onClick={() => setDeleteConfirmation(false)}
              ></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete this test result? This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setDeleteConfirmation(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                onClick={handleDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="psychological-tests-page">
      {activeTab === 'list' && renderTestsList()}
      {activeTab === 'view' && renderViewTest()}
      {activeTab === 'add' && renderAddTest()}
      {activeTab === 'report' && renderReport()}
      {deleteConfirmation && renderDeleteConfirmation()}
      
      {/* Modal Container */}
      {showModal && (
        <div className="modal d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PsychologicalTests;