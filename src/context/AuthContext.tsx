import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  getIdToken,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const idToken = await getIdToken(currentUser, true);
          setToken(idToken);
          
          // Sync with the backend to ensure user is registered in PostgreSQL
          await fetch('/api/auth/sync', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${idToken}`
            }
          });
        } catch (error) {
          console.error("Error obtaining token or syncing:", error);
        }
      } else {
        setToken(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      throw error;
    }
  };

  const loginWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Error signing in with Email:", error);
      setLoading(false);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      await createUserWithEmailAndPassword(auth, email, pass);
    } catch (error) {
      console.error("Error registering with Email:", error);
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      await signOut(auth);
      setUser(null);
      setToken(null);
      setLoading(false);
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
      throw error;
    }
  };

  // Helper to make authenticated requests with automatic token refresh
  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let currentToken = token;
    
    // If we have a user but token might be expired, refresh it
    if (user) {
      currentToken = await getIdToken(user);
      setToken(currentToken);
    }

    const headers = {
      ...options.headers,
      'Content-Type': 'application/json',
      ...(currentToken ? { 'Authorization': `Bearer ${currentToken}` } : {})
    };

    const res = await fetch(url, {
      ...options,
      headers
    });

    if (res.status === 401) {
      // Token might have expired, try refreshing once
      if (user) {
        const freshToken = await getIdToken(user, true);
        setToken(freshToken);
        return fetch(url, {
          ...options,
          headers: {
            ...options.headers,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${freshToken}`
          }
        });
      }
    }

    return res;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, loginWithEmail, registerWithEmail, logout, fetchWithAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
