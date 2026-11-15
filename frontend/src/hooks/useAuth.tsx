import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithGoogle: () => void;
  loginAsDemo: () => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      setIsLoading(true);
      const userData = await api.getMe();
      setUser(userData);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Check if redirected from OAuth callback with token param
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    if (urlToken) {
      localStorage.setItem('reachinbox_token', urlToken);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    fetchUser();
  }, []);

  const loginWithGoogle = () => {
    const backendUrl = import.meta.env.VITE_API_URL || 'https://eachinbox-scheduler.onrender.com';
    window.location.href = `${backendUrl.replace(/\/$/, '')}/api/auth/google`;
  };

  const loginAsDemo = async () => {
    try {
      setIsLoading(true);
      const demoUser = await api.loginDemo();
      if ((demoUser as any)?.token || demoUser.id) {
        localStorage.setItem('reachinbox_token', (demoUser as any)?.token || demoUser.id);
      }
      setUser(demoUser);
    } catch (err) {
      console.error('Demo login error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('reachinbox_token');
      localStorage.removeItem('reachinbox_user');
      setUser(null);
      window.location.href = '/login';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        loginWithGoogle,
        loginAsDemo,
        logout,
        refetchUser: fetchUser,
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
