// contexts/NotificationContext.jsx - Global notification management
import React, { createContext, useContext, useState, useCallback } from 'react';
import Notification from '../components/Notification';

const NotificationContext = createContext();

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now() + Math.random();
    const newNotification = {
      id,
      ...notification,
      show: true
    };
    
    setNotifications(prev => [...prev, newNotification]);
    
    // Auto remove after duration
    setTimeout(() => {
      removeNotification(id);
    }, notification.duration || 4000);
    
    return id;
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const showSuccess = useCallback((message, duration = 4000) => {
    return addNotification({
      type: 'success',
      message,
      duration
    });
  }, [addNotification]);

  const showError = useCallback((message, duration = 5000) => {
    return addNotification({
      type: 'error',
      message,
      duration
    });
  }, [addNotification]);

  const showInfo = useCallback((message, duration = 4000) => {
    return addNotification({
      type: 'info',
      message,
      duration
    });
  }, [addNotification]);

  const value = {
    addNotification,
    removeNotification,
    showSuccess,
    showError,
    showInfo,
    notifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      {/* Render all notifications */}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          {...notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
};
