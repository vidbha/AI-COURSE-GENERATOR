// src/components/AuthContext.jsx
import React, { createContext, useState, useContext } from 'react';

export const AuthContext = createContext({
  token: null,
  login: () => {},
  logout: () => {},
});

// AuthProvider to wrap your app
export function AuthProvider({ children }) {
  // Initialize state from sessionStorage
  const [token, setToken] = useState(() => sessionStorage.getItem('token') || null);

  const login = (newToken) => {
    if (!newToken) return;
    // Store token in sessionStorage
    sessionStorage.setItem('token', newToken);
    setToken(newToken);
  };

  const logout = () => {
    // Remove token from sessionStorage
    sessionStorage.removeItem('token');
    setToken(null);
  };

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