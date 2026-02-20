import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth, getDashboardByRole } from '../context/AuthContext';

// Loading spinner component
const LoadingSpinner = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    fontSize: '18px'
  }}>
    <div>Loading...</div>
  </div>
);

// ProtectedRoute - requires authentication
export const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    // Redirect to login, save the attempted URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check role-based access if roles specified
  if (allowedRoles.length > 0) {
    const userRole = user?.role?.toLowerCase();
    const hasAccess = allowedRoles.some(role => role.toLowerCase() === userRole);
    
    if (!hasAccess) {
      // Redirect to appropriate dashboard based on user's role
      return <Navigate to={getDashboardByRole(user?.role)} replace />;
    }
  }

  return children;
};

// PublicRoute - only accessible when NOT authenticated
export const PublicRoute = ({ children }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (isAuthenticated && user) {
    // Redirect to appropriate dashboard based on role
    return <Navigate to={getDashboardByRole(user?.role)} replace />;
  }

  return children;
};

export default ProtectedRoute;
