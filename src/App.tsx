import React, { useState, useEffect } from 'react';
import { LoginPage } from './pages/LoginPage';
import { InventoryPage } from './pages/InventoryPage';
import { loadConfig } from './config';
import { LanguageProvider } from './contexts/LanguageContext';
import { ToastProvider } from './components/common/ToastContainer';
import { isAuthenticated } from './services/auth';

function App() {
  const [configLoaded, setConfigLoaded] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const initApp = async () => {
      try {
        await loadConfig();
        setConfigLoaded(true);

        const authenticated = isAuthenticated();
        setIsLoggedIn(authenticated);

        console.log('Authentication check:', {
          authenticated,
          userSession: sessionStorage.getItem('user_session') ? 'exists' : 'missing'
        });
      } catch (error) {
        console.error('Failed to load configuration:', error);
      } finally {
        setIsCheckingAuth(false);
      }
    };

    initApp();
  }, []);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  if (!configLoaded || isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <ToastProvider>
      <LanguageProvider>
        {isLoggedIn ? (
          <InventoryPage onLogout={handleLogout} />
        ) : (
          <LoginPage onLogin={handleLogin} />
        )}
      </LanguageProvider>
    </ToastProvider>
  );
}

export default App;