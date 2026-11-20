import React, { createContext, useContext, useState, useEffect } from 'react';

export interface UserSession {
  userId: string;
  fullName: string;
  email?: string;
  mobile?: string;
  role: 'CUSTOMER' | 'ADMIN';
}

interface AuthContextType {
  user: UserSession | null;
  login: (userData: UserSession) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: () => {},
  logout: () => {},
  isAdmin: false
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserSession | null>(() => {
    const saved = localStorage.getItem('mifd_session');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  const login = (userData: UserSession) => {
    setUser(userData);
    localStorage.setItem('mifd_session', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('mifd_session');
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <AuthContext.Provider value={{ user, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
