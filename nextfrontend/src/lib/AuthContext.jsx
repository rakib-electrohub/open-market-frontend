import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { parseApiResponse } from '@/api/apiClient';
import { appParams } from '@/lib/app-params';

export const AuthContext = createContext();

const handleResponse = async (response) => {
  if (!response.ok) {
    const errorBody = await parseApiResponse(response).catch(() => ({}));
    const error = new Error(errorBody.message || 'Failed to load app state');
    error.status = response.status;
    error.data = errorBody;
    throw error;
  }
  return parseApiResponse(response);
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [appPublicSettings, setAppPublicSettings] = useState(null);

  useEffect(() => {
    checkAppState();
  }, []);

  const fetchPublicSettings = async () => {
    try {
      // Fetch SiteSettings from the server
      const settings = await apiClient.entities.SiteSettings.list();
      const settingsMap = {};
      settings.forEach(s => {
        if (settingsMap[s.key] === undefined) {
          settingsMap[s.key] = s.value;
        }
      });
      return settingsMap;
    } catch (error) {
      console.error('Failed to fetch settings:', error);
      return {};
    }
  };

  const checkAppState = async () => {
    setIsLoadingPublicSettings(true);
    setAuthError(null);

    try {
      const publicSettings = await fetchPublicSettings();
      setAppPublicSettings(publicSettings);
      await checkUserAuth();
    } catch (error) {
      if (error.status === 401) {
        setIsAuthenticated(false);
        setAuthChecked(true);
      } else {
        setAuthError({
          type: 'unknown',
          message: error.message || 'Failed to load app state',
        });
      }
    } finally {
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  const checkUserAuth = async () => {
    setIsLoadingAuth(true);
    setAuthError(null);
    try {
      const currentUser = await apiClient.auth.me();
      setUser(currentUser);
      setIsAuthenticated(true);
      return currentUser;
    } catch (error) {
      if (error.status !== 401 && error.status !== 403) {
        setAuthError({
          type: 'unknown',
          message: error.message || 'Failed to verify authentication',
        });
      }
      setIsAuthenticated(false);
      setUser(null);
      return null;
    } finally {
      setIsLoadingAuth(false);
      setAuthChecked(true);
    }
  };

  const logout = async (shouldRedirect = true) => {
    setUser(null);
    setIsAuthenticated(false);
    await apiClient.auth.logout();
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    apiClient.auth.redirectToLogin(window.location.href);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoadingAuth,
        isLoadingPublicSettings,
        authError,
        appPublicSettings,
        authChecked,
        logout,
        navigateToLogin,
        checkUserAuth,
        checkAppState,
        refreshPublicSettings: async () => {
          const publicSettings = await fetchPublicSettings();
          setAppPublicSettings(publicSettings);
          return publicSettings;
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
