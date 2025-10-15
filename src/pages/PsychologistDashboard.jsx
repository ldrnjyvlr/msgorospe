// pages/PsychologistDashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { 
  FaBrain, 
  FaUser,
  FaUsers,
  FaPlayCircle,
  FaStopCircle,
  FaArrowRight
} from 'react-icons/fa';

const PsychologistDashboard = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [totalPatients, setTotalPatients] = useState(0);
  const [ongoingClients, setOngoingClients] = useState(0);
  const [terminatedClients, setTerminatedClients] = useState(0);
  const [referredClients, setReferredClients] = useState(0);

  useEffect(() => {
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('Fetching data for psychologist:', user.id);
      
      // Get total patients count in the system (same logic as Clients.jsx)
      const { data: patientsData, error: totalPatientsError } = await supabase
        .from('personal_info')
        .select('id, name, age, sex')
        .order('name', { ascending: true });
      
      if (totalPatientsError) {
        console.error('Total patients count error:', totalPatientsError);
        throw totalPatientsError;
      }
      
      const totalPatientsCount = patientsData ? patientsData.length : 0;
      
      // Get ongoing clients count (status = 'active' or 'ongoing')
      const { count: ongoingCount, error: ongoingError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('psychologist_id', user.id)
        .in('status', ['active', 'ongoing']);
      
      if (ongoingError) {
        console.error('Ongoing clients count error:', ongoingError);
        throw ongoingError;
      }
      
      // Get terminated clients count (status = 'terminated')
      const { count: terminatedCount, error: terminatedError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('psychologist_id', user.id)
        .eq('status', 'terminated');
      
      if (terminatedError) {
        console.error('Terminated clients count error:', terminatedError);
        throw terminatedError;
      }
      
      // Get referred clients count (status = 'referred')
      const { count: referredCount, error: referredError } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('psychologist_id', user.id)
        .eq('status', 'referred');
      
      if (referredError) {
        console.error('Referred clients count error:', referredError);
        throw referredError;
      }
      
      console.log('Client counts:', {
        totalPatients: totalPatientsCount,
        ongoing: ongoingCount,
        terminated: terminatedCount,
        referred: referredCount
      });
      
      // Update state
      setTotalPatients(totalPatientsCount || 0);
      setOngoingClients(ongoingCount || 0);
      setTerminatedClients(terminatedCount || 0);
      setReferredClients(referredCount || 0);
    } catch (error) {
      console.error('Error in fetchData:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="psychologist-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0 modern-dashboard-title">
          <FaBrain className="me-3" />
          Psychologist Dashboard
        </h1>
        <div className="text-end">
          <p className="text-muted mb-0">Welcome back, {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Psychologist'}</p>
          <small className="text-muted">Today is {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</small>
        </div>
      </div>
      
      {/* Modern Statistics Cards */}
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="stat-card modern-card total-clients-card">
            <div className="card-header-gradient"></div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                <FaUsers className="text-white" />
              </div>
            </div>
            <h2 className="count modern-count">{totalPatients}</h2>
            <div className="label modern-label">Total Patients</div>
            <div className="text-muted small modern-subtext">All patients in the system</div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="stat-card modern-card ongoing-clients-card">
            <div className="card-header-gradient"></div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                <FaPlayCircle className="text-white" />
              </div>
            </div>
            <h2 className="count modern-count">{ongoingClients}</h2>
            <div className="label modern-label">Ongoing</div>
            <div className="text-muted small modern-subtext">Active therapy sessions</div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="stat-card modern-card terminated-clients-card">
            <div className="card-header-gradient"></div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                <FaStopCircle className="text-white" />
              </div>
            </div>
            <h2 className="count modern-count">{terminatedClients}</h2>
            <div className="label modern-label">Terminated</div>
            <div className="text-muted small modern-subtext">Completed sessions</div>
          </div>
        </div>
        
        <div className="col-md-3">
          <div className="stat-card modern-card referred-clients-card">
            <div className="card-header-gradient"></div>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div className="icon rounded-circle d-flex align-items-center justify-content-center modern-icon">
                <FaArrowRight className="text-white" />
              </div>
            </div>
            <h2 className="count modern-count">{referredClients}</h2>
            <div className="label modern-label">Referred</div>
            <div className="text-muted small modern-subtext">Transferred to specialists</div>
          </div>
        </div>
      </div>
      

      {/* Modern CSS for enhanced dashboard */}
      <style jsx>{`
        /* Dashboard Title */
        .modern-dashboard-title {
          color: #2d3748;
          font-weight: 700;
          font-size: 2rem;
        }
        
        /* Base stat card styling */
        .stat-card {
          background: #fff;
          border: 1px solid #e3e6f0;
          border-radius: 0.75rem;
          padding: 1.5rem;
          margin-bottom: 1rem;
          box-shadow: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }
        
        .stat-card:hover {
          box-shadow: 0 0.5rem 2.5rem 0 rgba(58, 59, 69, 0.25);
          transform: translateY(-4px);
        }
        
        /* Modern card enhancements */
        .modern-card {
          border: none;
          border-radius: 1rem;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
          background: linear-gradient(135deg, #ffffff 0%, #f8f9fc 100%);
        }
        
        .modern-card:hover {
          box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
          transform: translateY(-6px);
        }
        
        /* Card header gradients */
        .card-header-gradient {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          border-radius: 1rem 1rem 0 0;
        }
        
        .total-clients-card .card-header-gradient {
          background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
        }
        
        .ongoing-clients-card .card-header-gradient {
          background: linear-gradient(90deg, #43e97b 0%, #38f9d7 100%);
        }
        
        .terminated-clients-card .card-header-gradient {
          background: linear-gradient(90deg, #f093fb 0%, #f5576c 100%);
        }
        
        .referred-clients-card .card-header-gradient {
          background: linear-gradient(90deg, #fa709a 0%, #fee140 100%);
        }
        
        /* Modern icons */
        .modern-icon {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
        }
        
        .total-clients-card .modern-icon {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .ongoing-clients-card .modern-icon {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
        
        .terminated-clients-card .modern-icon {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        .referred-clients-card .modern-icon {
          background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
        }
        
        /* Modern typography */
        .modern-count {
          font-size: 2.5rem;
          font-weight: 800;
          color: #2d3748;
          margin: 0;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        
        .modern-label {
          font-size: 0.875rem;
          font-weight: 600;
          text-transform: uppercase;
          color: #718096;
          margin-bottom: 0.5rem;
          letter-spacing: 0.5px;
        }
        
        .modern-subtext {
          color: #a0aec0;
          font-size: 0.8rem;
        }
        
        /* Responsive Design */
        @media (max-width: 768px) {
          .modern-count {
            font-size: 2rem;
          }
          
          .modern-icon {
            width: 3rem;
            height: 3rem;
          }
          
          .modern-dashboard-title {
            font-size: 1.5rem;
          }
        }
        
        /* Animation for cards on load */
        .modern-card {
          animation: slideInUp 0.6s ease-out;
        }
        
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default PsychologistDashboard;