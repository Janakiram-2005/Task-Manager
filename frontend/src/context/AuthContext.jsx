import React, { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem("adminToken") || "");
  const [expiresAt, setExpiresAt] = useState(() => {
    const raw = localStorage.getItem("adminTokenExpiresAt");
    return raw ? parseInt(raw, 10) : 0;
  });

  useEffect(() => {
    if (!token) return;
    if (expiresAt && Date.now() > expiresAt) {
      setToken("");
      setExpiresAt(0);
      localStorage.removeItem("adminToken");
      localStorage.removeItem("adminTokenExpiresAt");
    }
  }, [token, expiresAt]);

  const login = (newToken, expiresInMinutes) => {
    const expiry = Date.now() + expiresInMinutes * 60 * 1000;
    setToken(newToken);
    setExpiresAt(expiry);
    localStorage.setItem("adminToken", newToken);
    localStorage.setItem("adminTokenExpiresAt", String(expiry));
  };

  const logout = () => {
    setToken("");
    setExpiresAt(0);
    localStorage.removeItem("adminToken");
    localStorage.removeItem("adminTokenExpiresAt");
  };

  const isAdmin = !!token && (!expiresAt || Date.now() < expiresAt);

  return (
    <AuthContext.Provider value={{ token, isAdmin, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

