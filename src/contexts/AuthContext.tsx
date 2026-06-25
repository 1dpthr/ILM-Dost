import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, UserRole } from '../types/user';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string, role?: UserRole) => Promise<void>;
  signUp: (email: string, password: string, name: string, role?: UserRole) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const DEMO_STUDENT: User = {
  id: 'demo-student-123',
  email: 'student@ilmdost.com',
  user_metadata: {
    name: 'Demo Student',
    role: 'student',
  },
};

const DEMO_TEACHER: User = {
  id: 'demo-teacher-123',
  email: 'teacher@ilmdost.com',
  user_metadata: {
    name: 'Demo Teacher',
    role: 'teacher',
  },
};

const DEMO_ADMIN: User = {
  id: 'demo-admin-123',
  email: 'admin@ilmdost.com',
  user_metadata: {
    name: 'Demo Admin',
    role: 'admin',
  },
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for stored demo session
    const storedUser = localStorage.getItem('ilmdost_user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        localStorage.removeItem('ilmdost_user');
      }
    }
    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string, role: UserRole = 'student') => {
    if (email === 'student@ilmdost.com' || email === 'demo@ilmdost.com' || email === '') {
      const demoUser = { ...DEMO_STUDENT };
      setUser(demoUser);
      localStorage.setItem('ilmdost_user', JSON.stringify(demoUser));
      return;
    }

    if (email === 'teacher@ilmdost.com') {
      const demoUser = { ...DEMO_TEACHER };
      setUser(demoUser);
      localStorage.setItem('ilmdost_user', JSON.stringify(demoUser));
      return;
    }

    if (email === 'admin@ilmdost.com') {
      const demoUser = { ...DEMO_ADMIN };
      setUser(demoUser);
      localStorage.setItem('ilmdost_user', JSON.stringify(demoUser));
      return;
    }

    const existingUsers = JSON.parse(localStorage.getItem('ilmdost_users') || '[]');
    const foundUser = existingUsers.find((u: any) => u.email === email);

    if (foundUser) {
      setUser(foundUser);
      localStorage.setItem('ilmdost_user', JSON.stringify(foundUser));
    } else {
      const customUser: User = {
        id: `user-${Date.now()}`,
        email,
        user_metadata: {
          name: email.split('@')[0],
          role,
        },
      };
      setUser(customUser);
      localStorage.setItem('ilmdost_user', JSON.stringify(customUser));
    }
  };

  const signUp = async (email: string, password: string, name: string, role: UserRole = 'student') => {
    // Prevent admin role signup - admins can only be added by existing admins
    if (role === 'admin') {
      throw new Error('Admin accounts can only be created by existing administrators');
    }

    const newUser: User = {
      id: `user-${Date.now()}`,
      email,
      user_metadata: {
        name,
        role,
      },
    };

    const existingUsers = JSON.parse(localStorage.getItem('ilmdost_users') || '[]');
    existingUsers.push(newUser);
    localStorage.setItem('ilmdost_users', JSON.stringify(existingUsers));

    setUser(newUser);
    localStorage.setItem('ilmdost_user', JSON.stringify(newUser));
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('ilmdost_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};
