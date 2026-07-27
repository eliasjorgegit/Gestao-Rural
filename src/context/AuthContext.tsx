import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  getIdToken 
} from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

export interface AppUser {
  uid: string;
  email?: string | null;
  displayName?: string | null;
}

interface AuthContextType {
  user: AppUser | null;
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
  const [user, setUser] = useState<AppUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    const checkLocalToken = async () => {
      const savedToken = localStorage.getItem('local_auth_token');
      if (savedToken) {
        try {
          const res = await fetch('/api/auth/me', {
            headers: {
              'Authorization': `Bearer ${savedToken}`
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (isMounted) {
              setToken(savedToken);
              setUser({
                uid: data.user.uid,
                email: data.user.email,
              });
              setLoading(false);
              return true;
            }
          } else {
            localStorage.removeItem('local_auth_token');
          }
        } catch (e) {
          console.error("Error checking local token:", e);
          localStorage.removeItem('local_auth_token');
        }
      }
      return false;
    };

    const initAuth = async () => {
      const hasLocalSession = await checkLocalToken();

      const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
          try {
            // Firebase user takes active session
            localStorage.removeItem('local_auth_token');
            const idToken = await getIdToken(currentUser, true);
            setToken(idToken);
            setUser({
              uid: currentUser.uid,
              email: currentUser.email,
              displayName: currentUser.displayName,
            });
            
            // Sync with backend
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
          if (isMounted) setLoading(false);
        } else if (!hasLocalSession) {
          if (isMounted) {
            setUser(null);
            setToken(null);
            setLoading(false);
          }
        }
      });

      return unsubscribe;
    };

    let unsubscribeFn: (() => void) | undefined;
    initAuth().then(unsub => {
      unsubscribeFn = unsub;
    });

    return () => {
      isMounted = false;
      if (unsubscribeFn) unsubscribeFn();
    };
  }, []);

  const login = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('local_auth_token');
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
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao realizar login.');
      }

      localStorage.setItem('local_auth_token', data.token);
      setToken(data.token);
      setUser({
        uid: data.user.uid,
        email: data.user.email,
      });
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const registerWithEmail = async (email: string, pass: string) => {
    try {
      setLoading(true);
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao cadastrar usuário.');
      }

      localStorage.setItem('local_auth_token', data.token);
      setToken(data.token);
      setUser({
        uid: data.user.uid,
        email: data.user.email,
      });
      setLoading(false);
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('local_auth_token');
      if (auth.currentUser) {
        await signOut(auth);
      }
      setUser(null);
      setToken(null);
      setLoading(false);
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
      throw error;
    }
  };

  // Helper to make authenticated requests with automatic token refresh for Firebase users
  const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let currentToken = token;
    
    // If logged in via Firebase
    if (auth.currentUser) {
      currentToken = await getIdToken(auth.currentUser);
      setToken(currentToken);
    } else {
      currentToken = localStorage.getItem('local_auth_token') || token;
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
      if (auth.currentUser) {
        const freshToken = await getIdToken(auth.currentUser, true);
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
