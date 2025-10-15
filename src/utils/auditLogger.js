// utils/auditLogger.js - Fixed version
import { supabase } from '../lib/supabaseClient';

// Action types for consistent logging
export const AUDIT_ACTIONS = {
  // Authentication
  LOGIN: 'login',
  LOGOUT: 'logout',
  
  // CRUD operations
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  
  // Access and navigation
  VIEW: 'view',
  DOWNLOAD: 'download',
  PRINT: 'print',
  
  // Specific medical actions
  APPOINTMENT_BOOKED: 'appointment_booked',
  APPOINTMENT_CANCELLED: 'appointment_cancelled'
};

// Resource types
export const RESOURCE_TYPES = {
  USER: 'user',
  PATIENT: 'patient',
  PSYCHOLOGICAL_TEST: 'psychological_test',
  NEUROPSYCHOLOGICAL_TEST: 'neuropsychological_test',
  NEUROPSYCHIATRIC_TEST: 'neuropsychiatric_test',
  PSYCHOTHERAPY_SESSION: 'psychotherapy_session',
  APPOINTMENT: 'appointment',
  REPORT: 'report',
  PROFILE: 'profile',
  SYSTEM: 'system',
  AUTHENTICATION: 'authentication'
};

// Severity levels
export const SEVERITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

// Main audit logging function
export const logAuditEvent = async ({
  actionType,
  resourceType = null,
  resourceId = null,
  description,
  details = {},
  status = 'success',
  severityLevel = SEVERITY_LEVELS.LOW,
  userOverride = null // For system actions or when logging for other users
}) => {
  try {
    // Get current user and session info
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError) {
      console.error('Error getting session for audit log:', sessionError);
      return false;
    }

    const currentUser = userOverride || session?.user;

    if (!currentUser) {
      console.warn('No user found for audit logging');
      return false;
    }

    // Get user role
    let userRole = 'unknown';
    try {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', currentUser.id)
        .single();

      userRole = roleData?.role || currentUser.user_metadata?.role || 'unknown';
    } catch (error) {
      console.warn('Could not fetch user role for audit log:', error);
    }

    // Get client information
    const clientInfo = getClientInfo();

    // Prepare audit log entry
    const auditEntry = {
      user_id: currentUser.id,
      user_email: currentUser.email,
      user_role: userRole,
      action_type: actionType,
      resource_type: resourceType,
      resource_id: resourceId ? String(resourceId) : null,
      action_description: description,
      details: {
        ...details,
        timestamp: new Date().toISOString(),
        client_info: clientInfo
      },
      ip_address: clientInfo.ip,
      user_agent: clientInfo.userAgent,
      session_id: session?.access_token ? hashString(session.access_token.substring(0, 20)) : null,
      status: status,
      severity_level: severityLevel
    };
    
    // Insert audit log
    const { error } = await supabase
      .from('audit_logs')
      .insert([auditEntry]);
    
    if (error) {
      console.error('Error inserting audit log:', error);
      return false;
    }
    
    // Log critical events to console for immediate attention
    if (severityLevel === SEVERITY_LEVELS.CRITICAL || severityLevel === SEVERITY_LEVELS.HIGH) {
      console.warn(`[AUDIT ${severityLevel.toUpperCase()}] ${description}`, {
        user: currentUser.email,
        action: actionType,
        resource: `${resourceType}:${resourceId}`,
        details
      });
    }
    
    return true;
  } catch (error) {
    console.error('Audit logging failed:', error);
    return false;
  }
};

// Helper function to get client information
const getClientInfo = () => {
  return {
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
    ip: null, // Will be populated by server-side functions
    platform: typeof navigator !== 'undefined' ? navigator.platform : '',
    language: typeof navigator !== 'undefined' ? navigator.language : '',
    screen_resolution: typeof window !== 'undefined' ? `${window.screen.width}x${window.screen.height}` : '',
    timezone: typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : '',
    timestamp: new Date().toISOString()
  };
};

// Simple hash function for session IDs (for privacy)
const hashString = (str) => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36);
};

// Specialized logging functions for common actions

// Authentication logging
export const logAuthEvent = async (action, details = {}) => {
  const severityLevel = SEVERITY_LEVELS.LOW;
  const description = {
    [AUDIT_ACTIONS.LOGIN]: 'User logged in successfully',
    [AUDIT_ACTIONS.LOGOUT]: 'User logged out'
  }[action] || 'Authentication event';
  
  return await logAuditEvent({
    actionType: action,
    resourceType: RESOURCE_TYPES.USER,
    description,
    details,
    severityLevel
  });
};

// Patient data access logging
export const logPatientDataAccess = async (patientId, action, details = {}) => {
  const description = `Patient data ${action}`;
  const severityLevel = SEVERITY_LEVELS.MEDIUM; // Patient data access is always significant
  
  return await logAuditEvent({
    actionType: action,
    resourceType: RESOURCE_TYPES.PATIENT,
    resourceId: patientId,
    description,
    details,
    severityLevel
  });
};

// Test result logging
export const logTestAction = async (testType, testId, action, details = {}) => {
  const description = `${testType} test ${action}`;
  const severityLevel = action === AUDIT_ACTIONS.DELETE ? SEVERITY_LEVELS.HIGH : SEVERITY_LEVELS.MEDIUM;
  
  return await logAuditEvent({
    actionType: action,
    resourceType: testType,
    resourceId: testId,
    description,
    details,
    severityLevel
  });
};

// Appointment logging
export const logAppointmentAction = async (appointmentId, action, details = {}) => {
  const description = `Appointment ${action}`;
  const severityLevel = SEVERITY_LEVELS.LOW;
  
  return await logAuditEvent({
    actionType: action,
    resourceType: RESOURCE_TYPES.APPOINTMENT,
    resourceId: appointmentId,
    description,
    details,
    severityLevel
  });
};

// Report access logging
export const logReportAccess = async (reportType, action, details = {}) => {
  const description = `${reportType} report ${action}`;
  const severityLevel = SEVERITY_LEVELS.LOW;
  
  return await logAuditEvent({
    actionType: action,
    resourceType: RESOURCE_TYPES.REPORT,
    description,
    details,
    severityLevel
  });
};

// Security event logging
export const logSecurityEvent = async (eventType, description, details = {}) => {
  return await logAuditEvent({
    actionType: eventType,
    resourceType: RESOURCE_TYPES.SYSTEM,
    description,
    details,
    status: 'failed',
    severityLevel: SEVERITY_LEVELS.HIGH
  });
};

// Profile update logging
export const logProfileUpdate = async (profileType, profileId, changes, details = {}) => {
  return await logAuditEvent({
    actionType: AUDIT_ACTIONS.UPDATE,
    resourceType: profileType,
    resourceId: profileId,
    description: `${profileType} profile updated`,
    details: {
      changes,
      ...details
    },
    severityLevel: SEVERITY_LEVELS.MEDIUM
  });
};

// Bulk logging for multiple actions (useful for batch operations)
export const logBulkActions = async (actions) => {
  const results = [];
  
  for (const action of actions) {
    const result = await logAuditEvent(action);
    results.push(result);
  }
  
  return results;
};

// FIXED: Function to get audit logs (for admin interface)
export const getAuditLogs = async ({
  limit = 50,
  offset = 0,
  filters = {},
  sortBy = 'created_at',
  sortOrder = 'desc'
}) => {
  try {
    console.log('getAuditLogs called with:', { limit, offset, filters, sortBy, sortOrder });
    
    // Build the base query without joins
    let query = supabase
      .from('audit_logs')
      .select('*', { count: 'exact' }) // Get exact count
      .order(sortBy, { ascending: sortOrder === 'asc' });
    
    // Apply filters only if they have values
    if (filters.userId && filters.userId.trim()) {
      // Check if it's an email or user ID
      if (filters.userId.includes('@')) {
        query = query.ilike('user_email', `%${filters.userId}%`);
      } else {
        query = query.eq('user_id', filters.userId);
      }
    }
    
    if (filters.actionType && filters.actionType.trim()) {
      query = query.eq('action_type', filters.actionType);
    }
    
    if (filters.resourceType && filters.resourceType.trim()) {
      query = query.eq('resource_type', filters.resourceType);
    }
    
    if (filters.userRole && filters.userRole.trim()) {
      query = query.eq('user_role', filters.userRole);
    }
    
    if (filters.severityLevel && filters.severityLevel.trim()) {
      query = query.eq('severity_level', filters.severityLevel);
    }
    
    if (filters.status && filters.status.trim()) {
      query = query.eq('status', filters.status);
    }
    
    // Apply date filters only if they exist
    if (filters.dateFrom && filters.dateFrom.trim()) {
      query = query.gte('created_at', filters.dateFrom + 'T00:00:00.000Z');
    }
    
    if (filters.dateTo && filters.dateTo.trim()) {
      query = query.lte('created_at', filters.dateTo + 'T23:59:59.999Z');
    }
    
    // Apply pagination
    if (limit > 0) {
      query = query.range(offset, offset + limit - 1);
    }
    
    console.log('Executing query...');
    const { data, error, count } = await query;
    
    console.log('Query result:', { 
      dataLength: data?.length, 
      count, 
      error: error?.message,
      firstItem: data?.[0]
    });
    
    if (error) {
      console.error('Supabase query error:', error);
      throw error;
    }
    
    return { 
      data: data || [], 
      count: count || 0, 
      error: null 
    };
    
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return { 
      data: [], 
      count: 0, 
      error: {
        message: error.message,
        details: error
      }
    };
  }
};

// Function to get audit statistics
export const getAuditStatistics = async (timeRange = '30 days') => {
  try {
    // Get basic statistics from audit logs directly
    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('user_email, user_role, action_type, status, created_at')
      .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());
    
    if (error) throw error;
    
    // Calculate summary statistics
    const uniqueUsers = new Set(logs.map(log => log.user_email)).size;
    const totalActions = logs.length;
    const loginCount = logs.filter(log => log.action_type === 'login').length;
    const failedActions = logs.filter(log => log.status === 'failed').length;
    
    const stats = {
      totalUsers: uniqueUsers,
      totalActions: totalActions,
      loginCount: loginCount,
      failedActions: failedActions,
      byRole: {},
      topUsers: []
    };
    
    // Group by role
    const roleStats = {};
    logs.forEach(log => {
      const role = log.user_role || 'unknown';
      if (!roleStats[role]) {
        roleStats[role] = {
          userEmails: new Set(),
          totalActions: 0,
          loginCount: 0,
          failedActions: 0
        };
      }
      
      roleStats[role].userEmails.add(log.user_email);
      roleStats[role].totalActions++;
      if (log.action_type === 'login') roleStats[role].loginCount++;
      if (log.status === 'failed') roleStats[role].failedActions++;
    });
    
    // Convert to final format
    Object.keys(roleStats).forEach(role => {
      stats.byRole[role] = {
        userCount: roleStats[role].userEmails.size,
        totalActions: roleStats[role].totalActions,
        loginCount: roleStats[role].loginCount,
        failedActions: roleStats[role].failedActions
      };
    });
    
    return { stats, error: null };
  } catch (error) {
    console.error('Error fetching audit statistics:', error);
    return { stats: null, error };
  }
};


// React hook for audit logging
export const useAuditLogger = () => {
  const logEvent = async (eventData) => {
    return await logAuditEvent(eventData);
  };
  
  const logPageView = async (pageName, details = {}) => {
    return await logAuditEvent({
      actionType: AUDIT_ACTIONS.VIEW,
      resourceType: RESOURCE_TYPES.SYSTEM,
      description: `Viewed ${pageName} page`,
      details,
      severityLevel: SEVERITY_LEVELS.LOW
    });
  };
  
  const logFormSubmission = async (formName, success = true, details = {}) => {
    return await logAuditEvent({
      actionType: success ? AUDIT_ACTIONS.CREATE : 'form_error',
      resourceType: RESOURCE_TYPES.SYSTEM,
      description: `${formName} form ${success ? 'submitted successfully' : 'submission failed'}`,
      details,
      status: success ? 'success' : 'failed',
      severityLevel: success ? SEVERITY_LEVELS.LOW : SEVERITY_LEVELS.MEDIUM
    });
  };
  
  return {
    logEvent,
    logPageView,
    logFormSubmission,
    logAuthEvent,
    logPatientDataAccess,
    logTestAction,
    logAppointmentAction,
    logReportAccess,
    logSecurityEvent,
    logProfileUpdate
  };
};