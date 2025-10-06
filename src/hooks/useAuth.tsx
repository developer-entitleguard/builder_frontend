import { useState, useEffect, createContext, useContext } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface ApiUser {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string;
  contact: string;
  role: string;
  builderOrganization: {
    id: string;
    name: string;
    address: string;
    contact: string;
    email: string;
    abn: string | null;
    description: string;
    isActive: boolean;
  };
}

interface AuthContextType {
  user: User | ApiUser | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, metadata?: unknown) => Promise<{ error: unknown }>;
  signIn: (email: string, password: string) => Promise<{ error: unknown }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: unknown }>;
  updatePassword: (password: string) => Promise<{ error: unknown }>;
  setApiUser: (user: ApiUser | null) => void;
  getUserFromStorage: () => ApiUser | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | ApiUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = (): boolean => {
    if (!user || 'role' in user === false) return false;
    return (user as ApiUser).role === 'admin';
  };

  useEffect(() => {
    console.log('useAuth - Setting up auth listener');
    
    const checkLocalStorage = () => {
      try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
          const userData = JSON.parse(storedUserData);
          if (userData.userInfo) {
            console.log('useAuth - Found user data in localStorage');
            setUser(userData.userInfo);
            setLoading(false);
            return true;
          }
        }
      } catch (error) {
        console.error('useAuth - Error parsing localStorage data:', error);
        localStorage.removeItem('userData');
      }
      return false; // No valid user data found
    };

    // Get initial session first
    const getInitialSession = async () => {
      console.log('useAuth - Getting initial session');
      
      // Check localStorage first - this should be synchronous
      if (checkLocalStorage()) {
        return; // User data found in localStorage, skip Supabase
      }
      
      // Only check Supabase if no localStorage data
      const { data: { session } } = await supabase.auth.getSession();
      console.log('useAuth - Initial session:', !!session);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('useAuth - Auth state changed:', event, !!session);
        // Only update if we don't have localStorage data
        const hasLocalStorageData = localStorage.getItem('userData');
        if (!hasLocalStorageData) {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      }
    );

    getInitialSession();

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: unknown) => {
    const redirectUrl = `${window.location.origin}/`;
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata as Record<string, unknown>
      }
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    localStorage.removeItem('userData');
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?reset=true`;
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({
      password: password
    });
    return { error };
  };

  const setApiUser = (apiUser: ApiUser | null) => {
    setUser(apiUser);
    setLoading(false);
  };

  const getUserFromStorage = (): ApiUser | null => {
    try {
      const storedUserData = localStorage.getItem('userData');
      if (storedUserData) {
        const userData = JSON.parse(storedUserData);
        return userData.userInfo || null;
      }
    } catch (error) {
      console.error('Error getting user from localStorage:', error);
      localStorage.removeItem('userData');
    }
    return null;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isAdmin: isAdmin(),
      signUp,
      signIn,
      signOut,
      resetPassword,
      updatePassword,
      setApiUser,
      getUserFromStorage
    }}>
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