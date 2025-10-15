import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

const Clients = () => {
  const [patients, setPatients] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('personal_info')
          .select('id, name, age, sex')
          .order('name', { ascending: true });
        if (error) throw error;
        setPatients(data || []);
      } catch (e) {
        console.error('Failed to load patients', e);
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = !q
      ? patients
      : patients.filter(p => (p.name || '').toLowerCase().includes(q) || String(p.id).includes(q));
    return [...base].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [patients, query]);

  return (
    <div className="container-fluid">
      <div className="card mb-3">
        <div className="card-body">
          <input
            type="text"
            className="form-control"
            placeholder="Search by name or ID"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h5 className="mb-0">Clients</h5>
        </div>
        <div className="card-body">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-5 text-muted">No clients found.</div>
          ) : (
            <div className="client-list">
              {filtered.map(p => {
                // Parse name to format as "Lastname, Firstname MiddleName"
                // Database format is already "lastname firstname middlename"
                const formatName = (name) => {
                  if (!name) return 'Unnamed';
                  // Remove any existing commas and clean the name
                  const cleanName = name.trim().replace(/,/g, '');
                  const nameParts = cleanName.split(' ');
                  if (nameParts.length === 1) return nameParts[0];
                  if (nameParts.length === 2) return `${nameParts[0]}, ${nameParts[1]}`;
                  // For 3+ parts, first part is lastname, rest are firstname middlename
                  return `${nameParts[0]}, ${nameParts.slice(1).join(' ')}`;
                };

                return (
                  <div key={p.id} className="client-item" role="button" onClick={() => navigate(`/clients/${p.id}`)}>
                    <div className="client-avatar">
                      <div className="avatar-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="white"/>
                          <path d="M12 14C7.58172 14 4 17.5817 4 22H20C20 17.5817 16.4183 14 12 14Z" fill="white"/>
                        </svg>
                      </div>
                    </div>
                    <div className="client-info">
                      <div className="client-name">{formatName(p.name)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Clients;


