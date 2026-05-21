import { LoginData, LoginResponse } from '../types/auth';
import { apiCall } from '../utils/api';

export const login = async (credentials: LoginData): Promise<LoginResponse> => {
  return await apiCall('/api/session/login', {
    method: 'POST',
    body: {
      Data: credentials,
    },
  });
};

export const saveUserSession = (userData: any) => {
  // Store the complete user session data
  sessionStorage.setItem('user_session', JSON.stringify(userData));
  
  // Also store individual fields for backward compatibility
  sessionStorage.setItem('loggedGUID', userData.GUID || '');
  sessionStorage.setItem('loggedEmployer', userData.Employer || '');
  sessionStorage.setItem('loggedID', userData.ID || '');
  sessionStorage.setItem('loggedName', userData.Name || '');
  sessionStorage.setItem('loggedTime', userData.loginTime || '');
  sessionStorage.setItem('loggedLevel', userData.level || '');
  
  return userData;
};

export const logout = () => {
  // Clear all authentication-related data
  sessionStorage.removeItem('user_session');
  sessionStorage.removeItem('loggedGUID');
  sessionStorage.removeItem('loggedEmployer');
  sessionStorage.removeItem('loggedID');
  sessionStorage.removeItem('loggedName');
  sessionStorage.removeItem('loggedPassword');
  sessionStorage.removeItem('loggedTime');
  sessionStorage.removeItem('loggedLevel');
  
  window.location.reload();
};

export const getUserSession = () => {
  const session = sessionStorage.getItem('user_session');
  if (!session) return null;
  
  try {
    const userData = JSON.parse(session);
    
    // Verify essential fields exist
    if (!userData.GUID || !userData.ID || !userData.Name) {
      return null;
    }
    
    // Check if login time is within 24 hours (if loginTime exists)
    if (userData.loginTime) {
      try {
        const loginTime = new Date(userData.loginTime).getTime();
        const now = new Date().getTime();
        const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
        
        if (hoursDiff > 24) {
          return null;
        }
      } catch (error) {
        console.warn('Invalid login time format:', userData.loginTime);
        // Don't fail authentication just because of time format issues
      }
    }
    
    return userData;
  } catch (error) {
    console.error('Failed to parse user session:', error);
    return null;
  }
};

export const isAuthenticated = () => {
  const userData = getUserSession();
  return !!userData;
};

// Helper functions to access individual fields
export const getLoggedGUID = () => {
  const userData = getUserSession();
  return userData?.GUID || sessionStorage.getItem('loggedGUID');
};

export const getLoggedEmployer = () => {
  const userData = getUserSession();
  return userData?.Employer || sessionStorage.getItem('loggedEmployer');
};

export const getLoggedID = () => {
  const userData = getUserSession();
  return userData?.ID || sessionStorage.getItem('loggedID');
};

export const getLoggedName = () => {
  const userData = getUserSession();
  return userData?.Name || sessionStorage.getItem('loggedName');
};

export const getLoggedTime = () => {
  const userData = getUserSession();
  return userData?.loginTime || sessionStorage.getItem('loggedTime');
};

export const getLoggedLevel = () => {
  const userData = getUserSession();
  return userData?.level || sessionStorage.getItem('loggedLevel');
};