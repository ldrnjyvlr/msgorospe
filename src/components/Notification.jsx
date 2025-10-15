// components/Notification.jsx - Modern notification system
import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

const Notification = ({ 
  type = 'success', 
  message, 
  duration = 4000, 
  onClose, 
  show = true 
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      setIsAnimating(true);
      
      // Auto-hide after duration
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      if (onClose) onClose();
    }, 300); // Match animation duration
  };

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="notification-icon" />;
      case 'error':
        return <FaExclamationTriangle className="notification-icon" />;
      case 'info':
        return <FaInfoCircle className="notification-icon" />;
      default:
        return <FaCheckCircle className="notification-icon" />;
    }
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success':
        return 'notification-success';
      case 'error':
        return 'notification-error';
      case 'info':
        return 'notification-info';
      default:
        return 'notification-success';
    }
  };

  return (
    <div className={`notification-container ${isAnimating ? 'notification-show' : 'notification-hide'}`}>
      <div className={`notification ${getTypeClass()}`}>
        <div className="notification-content">
          {getIcon()}
          <span className="notification-message">{message}</span>
        </div>
        <button 
          className="notification-close" 
          onClick={handleClose}
          aria-label="Close notification"
        >
          <FaTimes />
        </button>
      </div>
    </div>
  );
};

export default Notification;
