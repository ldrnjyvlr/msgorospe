// components/ErrorBoundary.jsx - Error boundary with audit logging
import React from 'react';
import { logAuditEvent, AUDIT_ACTIONS, SEVERITY_LEVELS } from '../utils/auditLogger';
import { FaExclamationTriangle, FaRedo, FaHome } from 'react-icons/fa'; // Changed FaRefresh to FaRedo

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      errorId: null
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    // Generate unique error ID for tracking
    const errorId = `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.setState({
      error: error,
      errorInfo: errorInfo,
      errorId: errorId
    });

    // Log application error with comprehensive details
    try {
      await logAuditEvent({
        actionType: 'application_error',
        resourceType: 'system',
        resourceId: errorId,
        description: `Critical application error occurred: ${error.message}`,
        details: {
          error_id: errorId,
          error_message: error.message,
          error_stack: error.stack,
          component_stack: errorInfo.componentStack,
          error_boundary_props: this.props,
          browser_info: {
            user_agent: navigator.userAgent,
            url: window.location.href,
            referrer: document.referrer,
            timestamp: new Date().toISOString(),
            viewport: `${window.innerWidth}x${window.innerHeight}`,
            screen_resolution: `${window.screen.width}x${window.screen.height}`, // Fixed screen reference
            color_depth: window.screen.colorDepth, // Fixed screen reference
            pixel_ratio: window.devicePixelRatio,
            language: navigator.language,
            platform: navigator.platform,
            cookie_enabled: navigator.cookieEnabled,
            online: navigator.onLine
          },
          performance_info: {
            memory: navigator.memory ? {
              used: navigator.memory.usedJSHeapSize,
              total: navigator.memory.totalJSHeapSize,
              limit: navigator.memory.jsHeapSizeLimit
            } : null,
            connection: navigator.connection ? {
              effective_type: navigator.connection.effectiveType,
              downlink: navigator.connection.downlink,
              rtt: navigator.connection.rtt
            } : null
          },
          react_info: {
            react_version: React.version,
            error_boundary_location: errorInfo.componentStack.split('\n')[1]?.trim()
          }
        },
        status: 'failed',
        severityLevel: SEVERITY_LEVELS.CRITICAL
      });

      // Also log to console for immediate debugging
      console.group(`🚨 CRITICAL ERROR [${errorId}]`);
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Props:', this.props);
      console.error('User Agent:', navigator.userAgent);
      console.error('URL:', window.location.href);
      console.groupEnd();

      // If in development, also show detailed error
      if (process.env.NODE_ENV === 'development') {
        console.warn('Error Boundary caught an error in development mode');
      }
    } catch (loggingError) {
      // Fallback logging if audit system fails
      console.error('Failed to log error to audit system:', loggingError);
      console.error('Original error that caused the failure:', error, errorInfo);
      
      // Try to log to local storage as backup
      try {
        const errorLog = {
          timestamp: new Date().toISOString(),
          errorId,
          message: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
          url: window.location.href,
          userAgent: navigator.userAgent
        };
        
        const existingErrors = JSON.parse(localStorage.getItem('errorBoundaryLogs') || '[]');
        existingErrors.push(errorLog);
        
        // Keep only last 10 errors
        if (existingErrors.length > 10) {
          existingErrors.splice(0, existingErrors.length - 10);
        }
        
        localStorage.setItem('errorBoundaryLogs', JSON.stringify(existingErrors));
      } catch (storageError) {
        console.error('Could not save error to local storage:', storageError);
      }
    }
  }

  handleReload = () => {
    // Clear error state and reload the page
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
    window.location.reload();
  };

  handleGoHome = () => {
    // Clear error state and navigate to home
    this.setState({ hasError: false, error: null, errorInfo: null, errorId: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      const isDevelopment = process.env.NODE_ENV === 'development';
      
      return (
        <div className="error-boundary-container">
          <div className="container mt-5">
            <div className="row justify-content-center">
              <div className="col-md-8 col-lg-6">
                <div className="card border-danger">
                  <div className="card-header bg-danger text-white">
                    <h4 className="mb-0">
                      <FaExclamationTriangle className="me-2" />
                      Application Error
                    </h4>
                  </div>
                  <div className="card-body">
                    <div className="text-center mb-4">
                      <FaExclamationTriangle className="text-danger mb-3" size={64} />
                      <h5 className="text-danger">Something went wrong</h5>
                      <p className="text-muted">
                        We're sorry, but something unexpected happened. The error has been logged 
                        and will be reviewed by our technical team.
                      </p>
                    </div>

                    {this.state.errorId && (
                      <div className="alert alert-info">
                        <strong>Error ID:</strong> <code>{this.state.errorId}</code>
                        <br />
                        <small className="text-muted">
                          Please reference this ID when contacting support.
                        </small>
                      </div>
                    )}

                    <div className="d-grid gap-2 mb-3">
                      <button 
                        className="btn btn-primary"
                        onClick={this.handleReload}
                      >
                        <FaRedo className="me-2" />
                        Reload Page
                      </button>
                      <button 
                        className="btn btn-outline-secondary"
                        onClick={this.handleGoHome}
                      >
                        <FaHome className="me-2" />
                        Go to Home Page
                      </button>
                    </div>

                    {isDevelopment && this.state.error && (
                      <div className="mt-4">
                        <div className="card bg-light">
                          <div className="card-header">
                            <h6 className="mb-0 text-danger">Development Error Details</h6>
                          </div>
                          <div className="card-body">
                            <h6>Error Message:</h6>
                            <div className="alert alert-danger">
                              <code>{this.state.error.message}</code>
                            </div>
                            
                            <h6>Error Stack:</h6>
                            <pre className="bg-dark text-white p-3 rounded small" style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '200px' }}>
                              {this.state.error.stack}
                            </pre>
                            
                            <h6>Component Stack:</h6>
                            <pre className="bg-secondary text-white p-3 rounded small" style={{ fontSize: '0.75rem', overflow: 'auto', maxHeight: '150px' }}>
                              {this.state.errorInfo.componentStack}
                            </pre>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-top">
                      <h6 className="text-muted">Troubleshooting Tips:</h6>
                      <ul className="text-muted small">
                        <li>Try refreshing the page</li>
                        <li>Clear your browser cache and cookies</li>
                        <li>Make sure you have a stable internet connection</li>
                        <li>Try using a different browser</li>
                        <li>If the problem persists, contact technical support</li>
                      </ul>
                    </div>
                  </div>
                  <div className="card-footer text-center text-muted">
                    <small>
                      MS GOROSPE Psychological Assessment System
                      <br />
                      Error occurred at: {new Date().toLocaleString()}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <style jsx>{`
            .error-boundary-container {
              min-height: 100vh;
              background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
              padding: 20px 0;
            }
            
            pre {
              white-space: pre-wrap;
              word-wrap: break-word;
            }
            
            code {
              background-color: #f8f9fa;
              padding: 2px 4px;
              border-radius: 3px;
              font-size: 0.9em;
            }
            
            .alert code {
              background-color: transparent;
            }
          `}</style>
        </div>
      );
    }

    // If no error, render children normally
    return this.props.children;
  }
}

export default ErrorBoundary;