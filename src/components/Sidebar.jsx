// components/Sidebar.jsx - Updated with audit logs for admins
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  FaHome, 
  FaBrain, 
  FaHeartbeat, 
  FaComment, 
  FaChartLine, 
  FaCog, 
  FaUsers,
  FaCalendarAlt,
  FaCalendarCheck,
  FaClipboardList,
  FaShieldAlt
} from 'react-icons/fa';

const Sidebar = ({ userRole }) => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path;
  };

  const getLinkStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    padding: '12px 24px',
    color: isActive(path) ? '#2c3e50' : '#2c3e50',
    textDecoration: 'none',
    transition: 'all 0.3s ease',
    borderRadius: '0 25px 25px 0',
    marginRight: '15px',
    background: isActive(path) ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.4), rgba(255, 255, 255, 0.6))' : 'transparent',
    backdropFilter: isActive(path) ? 'blur(15px)' : 'none',
    boxShadow: isActive(path) ? '0 8px 25px rgba(255, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.5)' : 'none',
    border: isActive(path) ? '1px solid rgba(255, 255, 255, 0.3)' : 'none',
    fontWeight: isActive(path) ? '700' : '500',
    fontSize: '15px',
    textShadow: isActive(path) ? '0 1px 2px rgba(255, 255, 255, 0.5)' : 'none'
  });

  const handleMouseEnter = (e, path) => {
    if (!isActive(path)) {
      e.target.style.background = 'rgba(255, 255, 255, 0.2)';
      e.target.style.color = '#1a252f';
      e.target.style.transform = 'translateX(5px)';
      e.target.style.boxShadow = '0 4px 15px rgba(255, 255, 255, 0.2)';
    }
  };

  const handleMouseLeave = (e, path) => {
    if (!isActive(path)) {
      e.target.style.background = 'transparent';
      e.target.style.color = '#2c3e50';
      e.target.style.transform = 'translateX(0px)';
      e.target.style.boxShadow = 'none';
    }
  };

  return (
    <div className="sidebar" style={{
      position: 'fixed',
      top: '60px',
      left: '0',
      width: '250px',
      height: 'calc(100vh - 60px)',
      background: 'linear-gradient(180deg, #ff9a9e 0%, #fecfef 50%, #ff9068 100%)',
      borderRight: 'none',
      padding: '2rem 0',
      overflowY: 'auto',
      zIndex: 1040,
      boxShadow: '4px 0 15px rgba(255, 107, 107, 0.15)'
    }}>
      <ul className="sidebar-menu" style={{
        listStyle: 'none',
        padding: '0',
        margin: '0'
      }}>
        <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
          <Link to="/" style={getLinkStyle('/')}
            onMouseEnter={(e) => handleMouseEnter(e, '/')}
            onMouseLeave={(e) => handleMouseLeave(e, '/')}>
            <FaHome style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
            <span>Dashboard</span>
          </Link>
        </li>
        
        {userRole === 'admin' && (
          <>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/psychometricians" style={getLinkStyle('/psychometricians')}
                onMouseEnter={(e) => handleMouseEnter(e, '/psychometricians')}
                onMouseLeave={(e) => handleMouseLeave(e, '/psychometricians')}>
                <FaUsers style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Psychometricians</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/psychologists" style={getLinkStyle('/psychologists')}
                onMouseEnter={(e) => handleMouseEnter(e, '/psychologists')}
                onMouseLeave={(e) => handleMouseLeave(e, '/psychologists')}>
                <FaUsers style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Psychologists</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/appointment-management" style={getLinkStyle('/appointment-management')}
                onMouseEnter={(e) => handleMouseEnter(e, '/appointment-management')}
                onMouseLeave={(e) => handleMouseLeave(e, '/appointment-management')}>
                <FaCalendarCheck style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>All Appointments</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/audit-logs" style={getLinkStyle('/audit-logs')}
                onMouseEnter={(e) => handleMouseEnter(e, '/audit-logs')}
                onMouseLeave={(e) => handleMouseLeave(e, '/audit-logs')}>
                <FaShieldAlt style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Audit Logs</span>
              </Link>
            </li>
          </>
        )}
        
        {userRole === 'psychometrician' && (
          <>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/psychological" style={getLinkStyle('/psychological')}
                onMouseEnter={(e) => handleMouseEnter(e, '/psychological')}
                onMouseLeave={(e) => handleMouseLeave(e, '/psychological')}>
                <FaBrain style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Psychological</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/neuropsychiatric" style={getLinkStyle('/neuropsychiatric')}
                onMouseEnter={(e) => handleMouseEnter(e, '/neuropsychiatric')}
                onMouseLeave={(e) => handleMouseLeave(e, '/neuropsychiatric')}>
                <FaHeartbeat style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Neuropsychiatric</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/neuropsychological" style={getLinkStyle('/neuropsychological')}
                onMouseEnter={(e) => handleMouseEnter(e, '/neuropsychological')}
                onMouseLeave={(e) => handleMouseLeave(e, '/neuropsychological')}>
                <FaBrain style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Neuropsychological</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/psychotherapy" style={getLinkStyle('/psychotherapy')}
                onMouseEnter={(e) => handleMouseEnter(e, '/psychotherapy')}
                onMouseLeave={(e) => handleMouseLeave(e, '/psychotherapy')}>
                <FaComment style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Psychotherapy</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/aba-therapy" style={getLinkStyle('/aba-therapy')}
                onMouseEnter={(e) => handleMouseEnter(e, '/aba-therapy')}
                onMouseLeave={(e) => handleMouseLeave(e, '/aba-therapy')}>
                <FaComment style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>ABA Therapy</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/appointment-management" style={getLinkStyle('/appointment-management')}
                onMouseEnter={(e) => handleMouseEnter(e, '/appointment-management')}
                onMouseLeave={(e) => handleMouseLeave(e, '/appointment-management')}>
                <FaCalendarCheck style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Manage Appointments</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/reports" style={getLinkStyle('/reports')}
                onMouseEnter={(e) => handleMouseEnter(e, '/reports')}
                onMouseLeave={(e) => handleMouseLeave(e, '/reports')}>
                <FaChartLine style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Reports</span>
              </Link>
            </li>
          </>
        )}
        
        {/* Psychologist-specific sidebar updates */}
        {userRole === 'psychologist' && (
          <>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/clients" style={getLinkStyle('/clients')}
                onMouseEnter={(e) => handleMouseEnter(e, '/clients')}
                onMouseLeave={(e) => handleMouseLeave(e, '/clients')}>
                <FaUsers style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Clients</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/progress" style={getLinkStyle('/progress')}
                onMouseEnter={(e) => handleMouseEnter(e, '/progress')}
                onMouseLeave={(e) => handleMouseLeave(e, '/progress')}>
                <FaChartLine style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Progress</span>
              </Link>
            </li>
          </>
        )}

        
        {/* Patient specific menu items */}
        {userRole === 'patient' && (
          <>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/book-appointment" style={getLinkStyle('/book-appointment')}
                onMouseEnter={(e) => handleMouseEnter(e, '/book-appointment')}
                onMouseLeave={(e) => handleMouseLeave(e, '/book-appointment')}>
                <FaCalendarAlt style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>Book Appointment</span>
              </Link>
            </li>
            <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
              <Link to="/my-appointments" style={getLinkStyle('/my-appointments')}
                onMouseEnter={(e) => handleMouseEnter(e, '/my-appointments')}
                onMouseLeave={(e) => handleMouseLeave(e, '/my-appointments')}>
                <FaCalendarCheck style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
                <span>My Appointments</span>
              </Link>
            </li>
          </>
        )}
        
        <li className="sidebar-menu-item" style={{ margin: '0.5rem 0' }}>
          <Link to="/settings" style={getLinkStyle('/settings')}
            onMouseEnter={(e) => handleMouseEnter(e, '/settings')}
            onMouseLeave={(e) => handleMouseLeave(e, '/settings')}>
            <FaCog style={{ marginRight: '12px', fontSize: '18px', color: '#2c3e50' }} />
            <span>Settings</span>
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default Sidebar;