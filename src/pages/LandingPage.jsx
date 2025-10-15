// pages/LandingPage.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FaBrain, FaHeartbeat, FaComment, FaClock, FaMapMarkerAlt, FaEnvelope, FaPhone, FaCheckCircle, FaUserMd, FaHospital } from 'react-icons/fa';
import logoImage from '../assets/logo.png';
import heroImage from '../assets/hero.png';
import aboutImage from '../assets/about.jpg';
import './LandingPage.css'; // Import custom CSS

const services = [
  {
    icon: <FaBrain size={28} />,
    iconClass: 'bg-primary',
    title: 'Psychological Test',
    description: 'Psychological tests are standardized assessments designed to measure an individuals mental and behavioral characteristics. They provide objective data on various aspects, including cognitive abilities, personality traits, emotional states, and aptitude. The results help in diagnosis, treatment planning, and personal development.'
  },
  {
    icon: <FaHeartbeat size={28} />,
    iconClass: 'bg-info',
    title: 'Neuro Psychiatric Screening',
    description: 'This service involves a preliminary evaluation to identify potential neurological or psychiatric conditions that may require further investigation. It is a brief process that helps differentiate between conditions with similar symptoms, ensuring that an individual receives the most appropriate and specialized care.'
  },
  {
    icon: <FaUserMd size={28} />,
    iconClass: 'bg-success',
    title: 'Neuro Psychological Test',
    description: 'Neuropsychological tests are comprehensive evaluations used to assess brain function and behavior. These tests measure various cognitive domains, such as memory, attention, problem-solving, and language. They are often used to diagnose and monitor conditions like traumatic brain injury, dementia, stroke, and learning disabilities.'
  },
  {
    icon: <FaComment size={28} />,
    iconClass: 'bg-warning',
    title: 'Psychotherapy',
    description: 'Psychotherapy, also known as "talk therapy," is a collaborative treatment process between a therapist and a client. It helps individuals explore their thoughts, feelings, and behaviors to gain insight and develop effective coping strategies. Psychotherapy can address a wide range of mental health concerns, including depression, anxiety, trauma, and relationship issues.'
  },
  {
    icon: <FaHospital size={28} />,
    iconClass: 'bg-danger',
    title: 'Clinical Consultation',
    description: 'Clinical consultation provides expert guidance and professional advice on complex mental health cases. This service is typically sought by other professionals, such as doctors, educators, or social workers, to assist in diagnosis, treatment planning, or to gain a different perspective on a clients case.'
  },
  {
    icon: <FaCheckCircle size={28} />,
    iconClass: 'bg-secondary',
    title: 'Personality Assessment',
    description: 'Personality assessment uses standardized tools to evaluate an individuals unique patterns of thinking, feeling, and behaving. The results provide insight into an individuals strengths, preferences, and potential challenges, which can be valuable for career planning, personal development, and improving interpersonal relationships.'
  },
  {
    icon: <FaBrain size={28} />,
    iconClass: 'bg-primary',
    title: 'Cognitive Skills Training',
    description: 'Stress management services provide individuals with practical techniques and strategies to cope with and reduce the negative effects of stress. This can include learning mindfulness, relaxation exercises, time management skills, and cognitive restructuring to build resilience and improve overall well-being.'
  },
  {
    icon: <FaHeartbeat size={28} />,
    iconClass: 'bg-info',
    title: 'Stress Management',
    description: 'Stress management services provide individuals with practical techniques and strategies to cope with and reduce the negative effects of stress. This can include learning mindfulness, relaxation exercises, time management skills, and cognitive restructuring to build resilience and improve overall well-being.'
  },
  {
    icon: <FaUserMd size={28} />,
    iconClass: 'bg-success',
    title: 'Child & Adolescent Services',
    description: 'These services are specifically tailored to address the unique developmental, emotional, and behavioral needs of children and adolescents. They include a range of interventions, such as individual therapy, play therapy, and academic support, to help young people navigate challenges and thrive.'
  },
  {
    icon: <FaComment size={28} />,
    iconClass: 'bg-warning',
    title: 'Family Counseling',
    description: 'Family counseling is a form of psychotherapy that focuses on resolving conflicts and improving communication within a family unit. It helps family members understand each others perspectives and work together to create a healthier, more supportive home environment.'
  }
];

const ServiceModal = ({ show, onClose, title, description }) => {
  React.useEffect(() => {
    if (!show) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [show, onClose]);

  if (!show) return null;
  return (
    <div
      className="custom-modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(255,255,255,0.05)', // less obvious transparency
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        /* Fix for vertical centering on all browsers */
        minHeight: '100vh',
      }}
      onClick={onClose}
    >
      <div
        className="custom-modal-content"
        style={{
          background: '#fff',
          borderRadius: '10px',
          maxWidth: 400,
          width: '90%',
          boxShadow: '0 2px 16px rgba(0,0,0,0.2)',
          padding: '2rem',
          position: 'relative',
        }}
        onClick={e => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 10,
            right: 10,
            background: 'none',
            border: 'none',
            fontSize: 24,
            cursor: 'pointer',
            color: '#888',
          }}
        >
          &times;
        </button>
        <h5 className="modal-title mb-3">{title}</h5>
        <p>{description}</p>
        <div className="text-end mt-4">
          <button className="btn btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
};

const LandingPage = () => {
  const [openModal, setOpenModal] = useState(null);

  // Get the currently selected service
  const selectedService = openModal !== null ? services[openModal] : null;

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar navbar-expand-lg navbar-light fixed-top bg-white py-3 shadow-sm">
        <div className="container">
          <Link className="navbar-brand d-flex align-items-center" to="/">
            <img src={logoImage} alt="MS GOROSPE Logo" height="60" className="me-2 logo-animation" />
            <span className="fw-bold text-primary fs-4">MS GOROSPE</span>
          </Link>
          
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>
          
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <a className="nav-link nav-link-hover" href="#home">Home</a>
              </li>
              <li className="nav-item">
                <a className="nav-link nav-link-hover" href="#services">Services</a>
              </li>
              <li className="nav-item">
                <a className="nav-link nav-link-hover" href="#about">About</a>
              </li>
              <li className="nav-item">
                <a className="nav-link nav-link-hover" href="#contact">Contact</a>
              </li>
            </ul>
            
            <div className="ms-lg-3 mt-3 mt-lg-0 d-flex">
              <Link to="/login" className="btn btn-outline-primary me-2 btn-hover-effect">Log In</Link>
              <Link to="/register" className="btn btn-primary btn-hover-effect">Sign Up</Link>
            </div>
          </div>
        </div>
      </nav>
      
      {/* Hero Section with Background Image */}
      <section 
        id="home" 
        className="landing-hero hero-section"
        style={{
          backgroundImage: `linear-gradient(rgba(130, 162, 231, 0.83), rgba(226, 130, 170, 0.75)), url(${heroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'fixed',
          minHeight: '100vh',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          paddingTop: '80px'
        }}
      >
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-12 text-center">
              <h1 className="hero-title text-pink mb-4 animate-fadeInUp" style={{ fontSize: '3.5rem', fontWeight: '700' }}>
              MS GOROSPE Psychological Assessment Center
              </h1>
              <p className="hero-subtitle text-white mb-5 animate-fadeInUp" style={{ fontSize: '1.3rem', maxWidth: '700px', margin: '0 auto' }}>
                provides expert psychological evaluations and therapy services tailored to your unique needs.
              </p>
              <div className="animate-fadeInUp">
                <Link to="/register" className="btn btn-primary btn-lg px-5 me-3 btn-pulse">Get Started</Link>
                <a href="#services" className="btn btn-outline-white btn-lg px-5">Our Services</a>
              </div>
            </div>
          </div>
        </div>
        
        {/* Animated scroll indicator */}
        <div className="scroll-indicator">
          <div className="mouse"></div>
        </div>
      </section>
      
      {/* Services Section */}
      <section id="services" className="landing-section py-5" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title text-primary fw-bold mb-3">Services</h2>
            <div className="section-divider mx-auto mb-4"></div>
            <p className="lead">We provide professional psychological services designed to support mental wellness and personal growth.</p>
          </div>
          {/* Top row of 5 services */}
          <div className="row g-4 justify-content-center mb-2">
            {services.slice(0, 5).map((service, idx) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-2 d-flex justify-content-center" key={service.title}>
                <div
                  className="service-card h-100 p-3 rounded"
                  style={{ cursor: 'pointer', minWidth: 180, maxWidth: 220, minHeight: 220, maxHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' }}
                >
                  <div className={`service-icon ${service.iconClass} text-white rounded-circle d-flex align-items-center justify-content-center mb-3`} style={{ width: '60px', height: '60px', margin: '0 auto' }}>
                    {service.icon}
                  </div>
                  <h4 className="service-title text-center mb-2 text-primary" style={{ fontSize: '1.05rem' }}>{service.title}</h4>
                  {/* Removed short description here */}
                  <div style={{ flexGrow: 1 }}></div>
                  <button
                    className="btn btn-link mt-3"
                    style={{
                      textDecoration: 'none',
                      color: '#FF8FA3',
                      fontWeight: 500,
                      display: 'block',
                      width: '100%',
                    }}
                    onClick={() => setOpenModal(idx)}
                  >
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
          {/* Bottom row of 5 services */}
          <div className="row g-4 justify-content-center">
            {services.slice(5, 10).map((service, idx) => (
              <div className="col-12 col-sm-6 col-md-4 col-lg-2 d-flex justify-content-center" key={service.title}>
                <div
                  className="service-card h-100 p-3 rounded"
                  style={{ cursor: 'pointer', minWidth: 180, maxWidth: 220, minHeight: 220, maxHeight: 260, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center' }}
                >
                  <div className={`service-icon ${service.iconClass} text-white rounded-circle d-flex align-items-center justify-content-center mb-3`} style={{ width: '60px', height: '60px', margin: '0 auto' }}>
                    {service.icon}
                  </div>
                  <h4 className="service-title text-center mb-2 text-primary" style={{ fontSize: '1.05rem' }}>{service.title}</h4>
                  {/* Removed short description here */}
                  <div style={{ flexGrow: 1 }}></div>
                  <button
                    className="btn btn-link mt-3"
                    style={{
                      textDecoration: 'none',
                      color: '#FF8FA3',
                      fontWeight: 500,
                      display: 'block',
                      width: '100%',
                    }}
                    onClick={() => setOpenModal(idx + 5)}
                  >
                    Learn More
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Render modal ONCE at the end of the section */}
        <ServiceModal
          show={openModal !== null}
          onClose={() => setOpenModal(null)}
          title={selectedService?.title}
          description={selectedService?.description}
        />
      </section>
      
      {/* About Section */}
      <section id="about" className="landing-section py-5 bg-light" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-4 mb-lg-0">
              <div className="about-image-wrapper">
                <img src={aboutImage} alt="About MS GOROSPE" className="img-fluid rounded shadow-lg about-image" />
                <div className="about-image-overlay">
                  <div className="experience-badge">
                    <span className="number">6+</span>
                    <span className="text">Years of Excellence</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="col-lg-6">
              <h2 className="section-title text-primary fw-bold mb-4">About MS Gorospe</h2>
              <div className="section-divider mb-4"></div>
              <p className="mb-4 text-justify">
                MS GOROSPE Psychological Assessment Center (MSGPAC) is a premier provider of psychological assessment services, dedicated to enhancing mental well-being through expert evaluations and innovative solutions.
              </p>
              <p className="mb-5 text-justify">
                Established in 2018 by educator Bonna Mae S. Gorospe, MSGPAC has grown from a child development center into a full-scale psychological assessment facility, serving individuals, schools, and organizations with the highest standards of care.
              </p>
              
              <div className="vision-mission-card mb-4">
                <div className="d-flex align-items-start">
                  <div className="icon-wrapper bg-primary text-white rounded-circle p-3 me-3">
                    <FaBrain size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-2">Vision</h5>
                    <p className="mb-0">
                      To be a leading psychological assessment center committed to enhancing mental well-being through innovative, accurate, and accessible psychological services.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="vision-mission-card">
                <div className="d-flex align-items-start">
                  <div className="icon-wrapper bg-info text-white rounded-circle p-3 me-3">
                    <FaHeartbeat size={20} />
                  </div>
                  <div>
                    <h5 className="fw-bold mb-2">Mission</h5>
                    <p className="mb-0">
                      At MSGPAC, we provide high-quality psychological services that foster mental health awareness and support diverse populations through expert knowledge, advanced technologies, and a holistic approach to mental health.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="landing-section py-5 bg-gradient-primary" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center' }}>
        <div className="container">
          <div className="text-center mb-5">
            <h2 className="section-title text-white fw-bold mb-3">Get in Touch</h2>
            <div className="section-divider bg-white mx-auto mb-4"></div>
            <p className="lead text-white-50">We're here to answer your questions and help you on your journey to mental wellness</p>
          </div>
          
          <div className="row justify-content-center g-4">
            <div className="col-lg-10">
              <div className="row g-4">
                {/* Location Card */}
                <div className="col-md-4">
                  <div className="contact-card h-100 p-4 text-center">
                    <div className="contact-icon-wrapper mx-auto mb-3">
                      <FaMapMarkerAlt size={30} />
                    </div>
                    <h5 className="fw-bold text-dark mb-3">Visit Us</h5>
                    <p className="text-muted mb-0">
                      2nd Floor Bantay Arcade,<br />
                      Barangay VI, Roxas Dike,<br />
                      Bantay, Ilocos Sur
                    </p>
                  </div>
                </div>
                
                {/* Phone Card */}
                <div className="col-md-4">
                  <div className="contact-card h-100 p-4 text-center">
                    <div className="contact-icon-wrapper mx-auto mb-3">
                      <FaPhone size={30} />
                    </div>
                    <h5 className="fw-bold text-dark mb-3">Call Us</h5>
                    <p className="text-muted mb-0">
                      (077) 674-0984<br />
                      0927 545 0235<br />
                      Mon-Fri: 9:00 AM - 5:00 PM
                    </p>
                  </div>
                </div>
                
                {/* Email Card */}
                <div className="col-md-4">
                  <div className="contact-card h-100 p-4 text-center">
                    <div className="contact-icon-wrapper mx-auto mb-3">
                      <FaEnvelope size={30} />
                    </div>
                    <h5 className="fw-bold text-dark mb-3">Email Us</h5>
                    <p className="text-muted mb-0">
                      msgorospepac@gmail.com<br />
                      info@msgorospe.com<br />
                      <span className="small">We'll respond within 24 hours</span>
                    </p>
                  </div>
                </div>
              </div>
              
              {/* CTA Section */}
              <div className="row mt-5">
                <div className="col-12">
                  <div className="cta-section text-center">
                    <h4 className="fw-bold text-white mb-3">Ready to Start Your Journey?</h4>
                    <p className="text-white-50 mb-4">
                      Take the first step towards better mental health. Our team of professionals is ready to support you.
                    </p>
                    <div>
                      <Link to="/register" className="btn btn-white btn-lg px-5 me-3 btn-hover-effect">Book an Appointment</Link>
                      <a href="tel:+639275450235" className="btn btn-outline-white btn-lg px-5 btn-hover-effect">Call Now</a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      
      {/* Footer */}
      <footer className="footer bg-dark text-white py-5">
        <div className="container">
          <div className="row">
            <div className="col-lg-4 mb-4 mb-lg-0">
              <img src={logoImage} alt="MS GOROSPE Logo" className="footer-logo mb-3" style={{maxHeight: '80px', filter: 'brightness(0) invert(1)'}} />
              <p className="text-white-50 mb-4">
                Providing premium psychological assessment services with compassion, expertise, and the highest standards of care.
              </p>
              <div className="social-links">
                <a href="#" className="social-link"><i className="fab fa-facebook-f"></i></a>
                <a href="#" className="social-link"><i className="fab fa-twitter"></i></a>
                <a href="#" className="social-link"><i className="fab fa-instagram"></i></a>
                <a href="#" className="social-link"><i className="fab fa-linkedin-in"></i></a>
              </div>
            </div>
            
            <div className="col-lg-2 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title text-white mb-3">Quick Links</h5>
              <ul className="footer-links list-unstyled">
                <li><a href="#home" className="footer-link">Home</a></li>
                <li><a href="#services" className="footer-link">Services</a></li>
                <li><a href="#about" className="footer-link">About Us</a></li>
                <li><a href="#contact" className="footer-link">Contact</a></li>
                <li><Link to="/login" className="footer-link">Client Login</Link></li>
              </ul>
            </div>
            
            <div className="col-lg-3 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title text-white mb-3">Our Services</h5>
              <ul className="footer-links list-unstyled">
                <li><a href="#services" className="footer-link">Psychological Testing</a></li>
                <li><a href="#services" className="footer-link">Neuropsychiatric Screening</a></li>
                <li><a href="#services" className="footer-link">Cognitive Assessments</a></li>
                <li><a href="#services" className="footer-link">Therapy Services</a></li>
                <li><a href="#services" className="footer-link">Consultation</a></li>
              </ul>
            </div>
            
            <div className="col-lg-3 col-md-6 mb-4 mb-md-0">
              <h5 className="footer-title text-white mb-3">Contact Us</h5>
              <ul className="footer-links list-unstyled">
                <li><a href="tel:+639275450235" className="footer-link">0927 545 0235</a></li>
                <li><a href="tel:+63776740984" className="footer-link">(077) 674-0984</a></li>
                <li><a href="mailto:msgorospepac@gmail.com" className="footer-link">msgorospepac@gmail.com</a></li>
                <li><a href="mailto:info@msgorospe.com" className="footer-link">info@msgorospe.com</a></li>
                <li><a href="#contact" className="footer-link">Get Directions</a></li>
              </ul>
            </div>
          </div>
          
          <div className="row mt-4">
            <div className="col-12 text-center">
              <p className="text-white-50 mb-0">
                &copy; {new Date().getFullYear()} MS GOROSPE Psychological Assessment Center. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;