import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import AuthenticationService from '../services/authentication.service';
import { apiUrl } from '../api/api';

const AuthContext = createContext(null);

// Helper to decode JWT token
const decodeToken = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Error decoding token:', e);
    return null;
  }
};

// Get dashboard path based on role
export const getDashboardByRole = (role) => {
  const roleLower = role?.toLowerCase();
  switch (roleLower) {
    case 'admin':
    case 'administrator':
      return '/admin';
    case 'manager':
    case 'officer':
      return '/manager';
    case 'executive':
      return '/executive';
    case 'user':
    default:
      return '/user';
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Ref always holds the latest token — interceptors read from here so they
  // never need to be re-registered when the token changes (avoids the
  // child-effect-before-parent-effect race condition that causes 401s).
  const tokenRef = useRef(null);
  useEffect(() => { tokenRef.current = accessToken; }, [accessToken]);

  // Register interceptors ONCE on mount.
  useEffect(() => {
    const requestInterceptor = apiUrl.interceptors.request.use(
      (config) => {
        if (tokenRef.current) {
          config.headers.Authorization = `Bearer ${tokenRef.current}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor to handle token expiry
    const responseInterceptor = apiUrl.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        const requestUrl = originalRequest?.url || '';

        // Skip refresh logic for auth endpoints to prevent infinite loops
        const isAuthEndpoint =
          requestUrl.includes('tickets/auth/login') ||
          requestUrl.includes('tickets/auth/refresh') ||
          requestUrl.includes('tickets/auth/logout') ||
          requestUrl.includes('tickets/auth/forgot-password') ||
          requestUrl.includes('tickets/auth/password-reset');

        // If 401/403 and not already retrying, try to refresh token
        if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry && !isAuthEndpoint) {
          originalRequest._retry = true;

          try {
            const response = await AuthenticationService.refresh();
            const newToken = response.data.accessToken;

            if (newToken) {
              tokenRef.current = newToken;          // update ref immediately
              setAccessToken(newToken);             // update state for UI
              const decoded = decodeToken(newToken);
              if (decoded?.UserInfo) {
                setUser(decoded.UserInfo);
                setIsAuthenticated(true);
              }

              originalRequest.headers.Authorization = `Bearer ${newToken}`;
              return apiUrl(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed — log user out
            tokenRef.current = null;
            setUser(null);
            setAccessToken(null);
            setIsAuthenticated(false);
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );

    return () => {
      apiUrl.interceptors.request.eject(requestInterceptor);
      apiUrl.interceptors.response.eject(responseInterceptor);
    };
  }, []); // ← empty deps: register once, read token from ref

  // Try to refresh token on mount (persist session)
  const refreshSession = useCallback(async () => {
    try {
      const response = await AuthenticationService.refresh();
      const token = response.data.accessToken;

      if (token) {
        tokenRef.current = token;   // sync ref IMMEDIATELY so interceptor has it
        setAccessToken(token);
        const decoded = decodeToken(token);
        if (decoded?.UserInfo) {
          setUser(decoded.UserInfo);
          setIsAuthenticated(true);
          return true;
        }
      }
      return false;
    } catch (error) {
      console.log('No active session');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  // On mount, try to restore session from cookie
  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  // Login function
  const login = async (credentials) => {
    try {
      const response = await AuthenticationService.login(credentials);
      const token = response.data.token;
      
      if (token) {
        tokenRef.current = token;
        setAccessToken(token);
        const decoded = decodeToken(token);
        
        if (decoded?.UserInfo) {
          setUser(decoded.UserInfo);
          setIsAuthenticated(true);
          return { 
            success: true, 
            user: decoded.UserInfo,
            mfaRequired: decoded.UserInfo.mfa_required && !decoded.UserInfo.mfa_completed,
            mfaEnabled: decoded.UserInfo.mfa_enabled,
            mfaVerified: decoded.UserInfo.mfa_verified,
            passPending: decoded.UserInfo.pass_pending
          };
        }
      }
      
      return { success: false, message: 'Login failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      return { success: false, message };
    }
  };

  // Logout function
  const logout = async () => {
    try {
      await AuthenticationService.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      tokenRef.current = null;
      setUser(null);
      setAccessToken(null);
      setIsAuthenticated(false);
    }
  };

  // MFA Challenge
  const mfaChallenge = async (code) => {
    try {
      const response = await AuthenticationService.mfaChallenge(code);
      const token = response.data.accessToken;
      
      if (token) {
        tokenRef.current = token;
        setAccessToken(token);
        const decoded = decodeToken(token);
        
        if (decoded?.UserInfo) {
          setUser(decoded.UserInfo);
          setIsAuthenticated(true);
          return { success: true, user: decoded.UserInfo };
        }
      }
      
      return { success: false, message: 'MFA verification failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'MFA verification failed';
      return { success: false, message };
    }
  };

  // MFA Setup
  const mfaSetup = async () => {
    try {
      const response = await AuthenticationService.mfaSetup();
      return { success: true, data: response.data };
    } catch (error) {
      const message = error.response?.data?.message || 'MFA setup failed';
      return { success: false, message };
    }
  };

  // MFA Verify
  const mfaVerify = async (code) => {
    try {
      const response = await AuthenticationService.mfaVerify(code);
      const token = response.data.accessToken;
      
      if (token) {
        tokenRef.current = token;
        setAccessToken(token);
        const decoded = decodeToken(token);
        
        if (decoded?.UserInfo) {
          setUser(decoded.UserInfo);
          setIsAuthenticated(true);
          return { success: true, user: decoded.UserInfo, codes: response.data.codes };
        }
      }
      
      return { success: false, message: 'MFA verification failed' };
    } catch (error) {
      const message = error.response?.data?.message || 'MFA verification failed';
      return { success: false, message };
    }
  };

  const value = {
    user,
    accessToken,
    isAuthenticated,
    loading,
    login,
    logout,
    mfaChallenge,
    mfaSetup,
    mfaVerify,
    refreshSession,
    getDashboardByRole,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
