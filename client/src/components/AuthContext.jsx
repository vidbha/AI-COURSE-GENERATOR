// src/components/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from 'react';

export const AuthContext = createContext({
  token: null,
  login: () => {},
  logout: () => {},
});

// AuthProvider to wrap your app
export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);

  const login = (newToken) => {
    if (!newToken) return;
    localStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  // keep token in sync if changed in another tab
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'token') {
        setToken(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// convenience hook
export function useAuth() {
  return useContext(AuthContext);
}
