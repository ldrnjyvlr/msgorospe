// pages/CompleteProfile.jsx - FIXED VERSION
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { FaUser, FaSave, FaExclamationTriangle } from 'react-icons/fa';

const CompleteProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [personalInfo, setPersonalInfo] = useState({
    name: '',
    age: '',
    sex: '',
    civil_status: '',
    date_of_birth: '',
    place_of_birth: '',
    nationality: '',
    contact_number: '',
    religion: '',
    occupation: '',
    agency_affiliation: '',
    address: '',
    educational_attainment: '',
    purpose_of_examination: 'Initial Assessment',
  });

  // Atomic address fields
  const [addressFields, setAddressFields] = useState({
    brgy: '',
    city: '',
    province: '',
    country: 'Philippines'
  });

  // Atomic place of birth fields
  const [birthplaceFields, setBirthplaceFields] = useState({
    brgy: '',
    city: '',
    province: '',
    country: 'Philippines'
  });
  const [error, setError] = useState(null);

  // Helper function to parse existing address into atomic fields
  const parseAddress = (addressString) => {
    if (!addressString) return { brgy: '', city: '', province: '', country: 'Philippines' };
    
    // Simple parsing logic - can be enhanced based on your address format
    const parts = addressString.split(',').map(part => part.trim());
    
    return {
      brgy: parts[0] || '',
      city: parts[1] || '',
      province: parts[2] || '',
      country: parts[3] || 'Philippines'
    };
  };

  // Helper function to concatenate atomic address fields
  const concatenateAddress = (addressFields) => {
    const { brgy, city, province, country } = addressFields;
    const parts = [brgy, city, province, country].filter(part => part.trim());
    return parts.join(', ');
  };

  // Helper function to parse existing place of birth into atomic fields
  const parseBirthplace = (birthplaceString) => {
    if (!birthplaceString) return { brgy: '', city: '', province: '', country: 'Philippines' };
    
    // Simple parsing logic - can be enhanced based on your address format
    const parts = birthplaceString.split(',').map(part => part.trim());
    
    return {
      brgy: parts[0] || '',
      city: parts[1] || '',
      province: parts[2] || '',
      country: parts[3] || 'Philippines'
    };
  };

  // Helper function to concatenate atomic place of birth fields
  const concatenateBirthplace = (birthplaceFields) => {
    const { brgy, city, province, country } = birthplaceFields;
    const parts = [brgy, city, province, country].filter(part => part.trim());
    return parts.join(', ');
  };

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          navigate('/login');
          return;
        }
        
        setUser(session.user);
        
        // CHECK USER ROLE FIRST
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
          
        if (roleData) {
          setUserRole(roleData.role);
          
          // IF NOT A PATIENT, REDIRECT TO DASHBOARD
          if (roleData.role !== 'patient') {
            navigate('/');
            return;
          }
        }
        
        // Only patients need to complete profile
        const { data, error } = await supabase
          .from('personal_info')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
          
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching profile:', error);
          throw error;
        }
        
        if (data) {
          // If profile is already complete, redirect to dashboard
          if (data.sex !== 'Unspecified' && data.civil_status !== 'Unspecified' && data.date_of_birth) {
            navigate('/');
            return;
          }
          
          // Prepare date field
          let dob = data.date_of_birth ? new Date(data.date_of_birth).toISOString().split('T')[0] : '';
          
          // Set form data from existing profile
          setPersonalInfo({
            name: data.name || '',
            age: data.age || '',
            sex: data.sex || '',
            civil_status: data.civil_status || '',
            date_of_birth: dob,
            place_of_birth: data.place_of_birth || '',
            nationality: data.nationality || '',
            contact_number: data.contact_number || '',
            religion: data.religion || '',
            occupation: data.occupation || '',
            agency_affiliation: data.agency_affiliation || '',
            address: data.address || '',
            educational_attainment: data.educational_attainment || '',
            purpose_of_examination: data.purpose_of_examination || 'Initial Assessment',
          });

          // Parse existing address into atomic fields
          setAddressFields(parseAddress(data.address));

          // Parse existing place of birth into atomic fields
          setBirthplaceFields(parseBirthplace(data.place_of_birth));
        }
      } catch (error) {
        console.error('Error in getUser:', error);
        setError('Failed to load profile information. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    getUser();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPersonalInfo({
      ...personalInfo,
      [name]: value
    });
  };

  const handleAddressFieldChange = (e) => {
    const { name, value } = e.target;
    const updatedAddressFields = {
      ...addressFields,
      [name]: value
    };
    setAddressFields(updatedAddressFields);
    
    // Update the main address field with concatenated value
    setPersonalInfo({
      ...personalInfo,
      address: concatenateAddress(updatedAddressFields)
    });
  };

  const handleBirthplaceFieldChange = (e) => {
    const { name, value } = e.target;
    const updatedBirthplaceFields = {
      ...birthplaceFields,
      [name]: value
    };
    setBirthplaceFields(updatedBirthplaceFields);
    
    // Update the main place_of_birth field with concatenated value
    setPersonalInfo({
      ...personalInfo,
      place_of_birth: concatenateBirthplace(updatedBirthplaceFields)
    });
  };

  const calculateAge = (dob) => {
    if (!dob) return '';
    
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age.toString();
  };

  const handleDateOfBirthChange = (e) => {
    const dob = e.target.value;
    const calculatedAge = calculateAge(dob);
    
    setPersonalInfo({
      ...personalInfo,
      date_of_birth: dob,
      age: calculatedAge
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      // Only update if user is a patient
      if (userRole !== 'patient') {
        navigate('/');
        return;
      }
      
      // Prepare data for update or insert
      const profileData = {
        ...personalInfo,
        address: concatenateAddress(addressFields), // Ensure address is properly concatenated
        place_of_birth: concatenateBirthplace(birthplaceFields), // Ensure place of birth is properly concatenated
        user_id: user.id,
        updated_at: new Date().toISOString()
      };
      
      // First try to update
      const { data: existingProfile } = await supabase
        .from('personal_info')
        .select('id')
        .eq('user_id', user.id)
        .single();
        
      if (existingProfile) {
        // Update existing record
        const { error } = await supabase
          .from('personal_info')
          .update(profileData)
          .eq('user_id', user.id);
          
        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase
          .from('personal_info')
          .insert([{
            ...profileData,
            created_at: new Date().toISOString()
          }]);
          
        if (error) throw error;
      }
      
      // Success! Show success message briefly before navigating
      console.log('Profile updated successfully, navigating to dashboard...');
      
      // Show success feedback to user
      setError(null);
      setSuccess(true);
      
      // Small delay to show success state, then navigate
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 1500);
      
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile. Please try again.');
      setSaving(false); // Only set saving to false on error
    }
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

 // If non-patient user somehow got here, redirect immediately
  if (userRole && userRole !== 'patient') {
    console.log('Non-patient user on complete profile page, redirecting');
    navigate('/');
    return null;
  }

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-10">
          <div className="card shadow-sm">
            <div className="card-header bg-primary text-white">
              <h4 className="mb-0">
                <FaUser className="me-2" /> Complete Your Profile
              </h4>
            </div>
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <FaExclamationTriangle className="me-2" /> {error}
                </div>
              )}
              
              {success && (
                <div className="alert alert-success" role="alert">
                  <i className="fas fa-check-circle me-2"></i> Profile saved successfully! Redirecting to dashboard...
                </div>
              )}
              
              <div className="alert alert-info mb-4">
                <p className="mb-0">
                  Welcome to MS GOROSPE Psychological Assessment Center! Please complete your profile to continue.
                  This information is needed for your assessment process.
                </p>
              </div>
              
              <form onSubmit={handleSubmit}>
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="name" className="form-label">Full Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="name"
                      name="name"
                      value={personalInfo.name}
                      onChange={handleInputChange}
                      placeholder="Last, First Middle"
                      required
                    />
                    <small className="form-text text-muted">Format: Last, First Middle</small>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="date_of_birth" className="form-label">Date of Birth *</label>
                    <input
                      type="date"
                      className="form-control"
                      id="date_of_birth"
                      name="date_of_birth"
                      value={personalInfo.date_of_birth}
                      onChange={handleDateOfBirthChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-4">
                    <label htmlFor="age" className="form-label">Age</label>
                    <input
                      type="number"
                      className="form-control"
                      id="age"
                      name="age"
                      value={personalInfo.age}
                      onChange={handleInputChange}
                      readOnly
                    />
                    <small className="form-text text-muted">Auto-calculated from birth date</small>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="sex" className="form-label">Sex *</label>
                    <select
                      className="form-select"
                      id="sex"
                      name="sex"
                      value={personalInfo.sex}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Sex</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label htmlFor="civil_status" className="form-label">Civil Status *</label>
                    <select
                      className="form-select"
                      id="civil_status"
                      name="civil_status"
                      value={personalInfo.civil_status}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Civil Status</option>
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                      <option value="Divorced">Divorced</option>
                    </select>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Place of Birth *</label>
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <label htmlFor="birthplace_brgy" className="form-label small">Barangay</label>
                      <input
                        type="text"
                        className="form-control"
                        id="birthplace_brgy"
                        name="brgy"
                        value={birthplaceFields.brgy}
                        onChange={handleBirthplaceFieldChange}
                        placeholder="Barangay Name"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="birthplace_city" className="form-label small">City/Municipality</label>
                      <input
                        type="text"
                        className="form-control"
                        id="birthplace_city"
                        name="city"
                        value={birthplaceFields.city}
                        onChange={handleBirthplaceFieldChange}
                        placeholder="City or Municipality"
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <label htmlFor="birthplace_province" className="form-label small">Province</label>
                      <input
                        type="text"
                        className="form-control"
                        id="birthplace_province"
                        name="province"
                        value={birthplaceFields.province}
                        onChange={handleBirthplaceFieldChange}
                        placeholder="Province"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="birthplace_country" className="form-label small">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        id="birthplace_country"
                        name="country"
                        value={birthplaceFields.country}
                        onChange={handleBirthplaceFieldChange}
                        required
                      />
                    </div>
                  </div>
                  <small className="form-text text-muted">
                    Place of birth: {personalInfo.place_of_birth || 'Enter place of birth components above'}
                  </small>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="nationality" className="form-label">Nationality *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="nationality"
                      name="nationality"
                      value={personalInfo.nationality}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="contact_number" className="form-label">Contact Number *</label>
                    <input
                      type="tel"
                      className="form-control"
                      id="contact_number"
                      name="contact_number"
                      value={personalInfo.contact_number}
                      onChange={handleInputChange}
                      placeholder="+63 9XX XXX XXXX"
                      required
                    />
                    <small className="form-text text-muted">Include country code (e.g., +63 for Philippines)</small>
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="religion" className="form-label">Religion</label>
                    <select
                      className="form-select"
                      id="religion"
                      name="religion"
                      value={personalInfo.religion}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Religion</option>
                      <option value="Roman Catholic">Roman Catholic</option>
                      <option value="Iglesia ni Cristo">Iglesia ni Cristo</option>
                      <option value="Philippine Independent Church">Philippine Independent Church</option>
                      <option value="Seventh-day Adventist">Seventh-day Adventist</option>
                      <option value="Baptist">Baptist</option>
                      <option value="Methodist">Methodist</option>
                      <option value="Presbyterian">Presbyterian</option>
                      <option value="United Church of Christ in the Philippines">United Church of Christ in the Philippines</option>
                      <option value="Jehovah's Witnesses">Jehovah's Witnesses</option>
                      <option value="Mormon (LDS)">Mormon (LDS)</option>
                      <option value="Islam">Islam</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Hinduism">Hinduism</option>
                      <option value="Judaism">Judaism</option>
                      <option value="Sikhism">Sikhism</option>
                      <option value="Bahá'í">Bahá'í</option>
                      <option value="Atheist">Atheist</option>
                      <option value="Agnostic">Agnostic</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="occupation" className="form-label">Occupation *</label>
                    <input
                      type="text"
                      className="form-control"
                      id="occupation"
                      name="occupation"
                      value={personalInfo.occupation}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-12">
                    <label htmlFor="agency_affiliation" className="form-label">Agency Affiliation</label>
                    <select
                      className="form-select"
                      id="agency_affiliation"
                      name="agency_affiliation"
                      value={personalInfo.agency_affiliation}
                      onChange={handleInputChange}
                    >
                      <option value="">Select Agency Affiliation</option>
                      <option value="Government Agency">Government Agency</option>
                      <option value="Private Company">Private Company</option>
                      <option value="Educational Institution">Educational Institution</option>
                      <option value="Healthcare Facility">Healthcare Facility</option>
                      <option value="Non-Governmental Organization (NGO)">Non-Governmental Organization (NGO)</option>
                      <option value="Religious Organization">Religious Organization</option>
                      <option value="Military/Armed Forces">Military/Armed Forces</option>
                      <option value="Law Enforcement">Law Enforcement</option>
                      <option value="Social Services">Social Services</option>
                      <option value="Counseling Center">Counseling Center</option>
                      <option value="Rehabilitation Center">Rehabilitation Center</option>
                      <option value="Mental Health Facility">Mental Health Facility</option>
                      <option value="Corporate">Corporate</option>
                      <option value="Freelance/Self-employed">Freelance/Self-employed</option>
                      <option value="Student">Student</option>
                      <option value="Unemployed">Unemployed</option>
                      <option value="Retired">Retired</option>
                      <option value="Other">Other</option>
                    </select>
                    <small className="form-text text-muted">
                      Select the type of agency, organization, or institution you are affiliated with
                    </small>
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Address</label>
                  <div className="row mb-2">
                    <div className="col-md-6">
                      <label htmlFor="brgy" className="form-label small">Barangay</label>
                      <input
                        type="text"
                        className="form-control"
                        id="brgy"
                        name="brgy"
                        value={addressFields.brgy}
                        onChange={handleAddressFieldChange}
                        placeholder="Barangay Name"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="city" className="form-label small">City/Municipality</label>
                      <input
                        type="text"
                        className="form-control"
                        id="city"
                        name="city"
                        value={addressFields.city}
                        onChange={handleAddressFieldChange}
                        placeholder="City or Municipality"
                        required
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <label htmlFor="province" className="form-label small">Province</label>
                      <input
                        type="text"
                        className="form-control"
                        id="province"
                        name="province"
                        value={addressFields.province}
                        onChange={handleAddressFieldChange}
                        placeholder="Province"
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="country" className="form-label small">Country</label>
                      <input
                        type="text"
                        className="form-control"
                        id="country"
                        name="country"
                        value={addressFields.country}
                        onChange={handleAddressFieldChange}
                        required
                      />
                    </div>
                  </div>
                  <small className="form-text text-muted">
                    Complete address: {personalInfo.address || 'Enter address components above'}
                  </small>
                </div>
                
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label htmlFor="educational_attainment" className="form-label">Educational Attainment *</label>
                    <select
                      className="form-select"
                      id="educational_attainment"
                      name="educational_attainment"
                      value={personalInfo.educational_attainment}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="">Select Educational Attainment</option>
                      <option value="Elementary">Elementary</option>
                      <option value="High School">High School</option>
                      <option value="Vocational">Vocational</option>
                      <option value="College Undergraduate">College Undergraduate</option>
                      <option value="College Graduate">College Graduate</option>
                      <option value="Post Graduate">Post Graduate</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="purpose_of_examination" className="form-label">Purpose of Examination *</label>
                    <select
                      className="form-select"
                      id="purpose_of_examination"
                      name="purpose_of_examination"
                      value={personalInfo.purpose_of_examination}
                      onChange={handleInputChange}
                      required
                    >
                      <option value="Initial Assessment">Initial Assessment</option>
                      <option value="Pre-Employment">Pre-Employment</option>
                      <option value="Promotion">Promotion</option>
                      <option value="Annual Check-up">Annual Check-up</option>
                      <option value="Clinical Evaluation">Clinical Evaluation</option>
                      <option value="Educational Assessment">Educational Assessment</option>
                      <option value="Legal Assessment">Legal Assessment</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                
                <div className="d-grid gap-2 mt-4">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving || success}
                  >
                    {saving ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Saving...
                      </>
                    ) : success ? (
                      <>
                        <i className="fas fa-check me-2"></i> Saved Successfully!
                      </>
                    ) : (
                      <>
                        <FaSave className="me-2" /> Save Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;