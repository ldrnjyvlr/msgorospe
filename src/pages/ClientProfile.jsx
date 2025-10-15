import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import SessionManagement from '../components/SessionManagement';

const ClientProfile = () => {
  const { patientId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: pData, error: pErr } = await supabase
        .from('personal_info')
        .select('*')
        .eq('id', patientId)
        .single();
      if (pErr) throw pErr;
      setProfile(pData);
    } catch (e) {
      console.error('Failed to load client data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [patientId]);



  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '60vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <div className="alert alert-warning">Client not found.</div>;
  }

  return (
    <div className="container-fluid">
      <div className="card mb-3">
        <div className="card-header">
          <h5 className="mb-0">Client Profile</h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <p><strong>Name:</strong> {profile.name || '—'}</p>
              <p><strong>Age:</strong> {profile.age ?? '—'}</p>
              <p><strong>Sex:</strong> {profile.sex || '—'}</p>
              <p><strong>Civil Status:</strong> {profile.civil_status || '—'}</p>
              <p><strong>Date of Birth:</strong> {profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString() : '—'}</p>
              <p><strong>Place of Birth:</strong> {profile.place_of_birth || '—'}</p>
            </div>
            <div className="col-md-6">
              <p><strong>Nationality:</strong> {profile.nationality || '—'}</p>
              <p><strong>Religion:</strong> {profile.religion || '—'}</p>
              <p><strong>Address:</strong> {profile.address || '—'}</p>
              <p><strong>Occupation:</strong> {profile.occupation || '—'}</p>
              <p><strong>Educational Attainment:</strong> {profile.educational_attainment || '—'}</p>
            </div>
          </div>
          <div className="row">
            <div className="col-md-6">
              <p><strong>Purpose of Examination:</strong> {profile.purpose_of_examination || '—'}</p>
            </div>
            <div className="col-md-3">
              <p><strong>Date of Testing:</strong> {profile.date_of_examination ? new Date(profile.date_of_examination).toLocaleDateString() : '—'}</p>
            </div>
            <div className="col-md-3">
              <p><strong>Agency/Affiliation:</strong> {profile.agency_affiliation || '—'}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Session Management Section */}
      <div className="mt-4">
        <SessionManagement clientId={patientId} />
      </div>

    </div>
  );
};

export default ClientProfile;



