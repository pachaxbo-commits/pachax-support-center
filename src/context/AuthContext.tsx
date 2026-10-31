import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserProfile,
  UserRole,
  UserPermissions,
  getDefaultPermissions,
  ROLE_LABELS
} from '@/models/auth';
import { auth, db, isFirebaseConfigured } from '@/lib/firebase';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  User as FirebaseUser,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { DEMO_USERS } from '@/lib/demoData';

interface AuthContextType {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  role: UserRole | null;
  permissions: UserPermissions;
  isLoading: boolean;
  isDemoMode: boolean;
  isSuperAdmin: boolean;
  isDevStaff: boolean;
  isClientUser: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  hasPermission: (key: keyof UserPermissions) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    // Check if demo user saved
    const savedRole = localStorage.getItem('pachax_demo_role') as UserRole | null;
    if (savedRole && DEMO_USERS[savedRole]) {
      return DEMO_USERS[savedRole];
    }
    return DEMO_USERS.client_admin; // Default demo role: Client Admin for immediate preview
  });

  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(!isFirebaseConfigured() || import.meta.env.VITE_APP_MODE === 'demo');

  useEffect(() => {
    if (!isFirebaseConfigured() || !auth) {
      setIsDemoMode(true);
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user && db) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data() as UserProfile;
            setCurrentUser(data);
            setIsDemoMode(false);
          } else {
            // User authenticated in Firebase but profile doc not yet created
            setCurrentUser({
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || user.email?.split('@')[0] || 'Usuario',
              role: 'client_user',
              status: 'active',
              createdAt: new Date().toISOString(),
            });
            setIsDemoMode(false);
          }
        } catch (err) {
          console.error('[AuthContext] Error fetching user profile:', err);
        }
      } else {
        // Fall back to demo mode if no active firebase session
        const savedRole = (localStorage.getItem('pachax_demo_role') as UserRole) || 'client_admin';
        setCurrentUser(DEMO_USERS[savedRole] || DEMO_USERS.client_admin);
        setIsDemoMode(true);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const role = currentUser?.role || null;
  const permissions = role ? getDefaultPermissions(role) : getDefaultPermissions('client_user');

  const isSuperAdmin = role === 'superadmin';
  const isDevStaff = ['superadmin', 'dev_owner', 'dev_admin', 'dev_engineer', 'dev_commercial'].includes(role || '');
  const isClientUser = ['client_admin', 'client_user'].includes(role || '');

  const hasPermission = (key: keyof UserPermissions): boolean => {
    if (!role) return false;
    return permissions[key] ?? false;
  };

  const login = async (email: string, pass: string) => {
    if (isFirebaseConfigured() && auth) {
      await signInWithEmailAndPassword(auth, email, pass);
    } else {
      // Demo login
      const matched = Object.values(DEMO_USERS).find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        setCurrentUser(matched);
        localStorage.setItem('pachax_demo_role', matched.role);
      } else {
        throw new Error('Credenciales inválidas en modo demo. Usa una de las cuentas sugeridas.');
      }
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured() && auth) {
      await firebaseSignOut(auth);
    }
    // In demo, revert to client_user or null
    setCurrentUser(null);
    localStorage.removeItem('pachax_demo_role');
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseConfigured() && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      // Demo feedback
      console.log(`[Demo Auth] Password reset link simulated for ${email}`);
    }
  };

  const sendVerificationEmail = async () => {
    if (isFirebaseConfigured() && auth && auth.currentUser) {
      await sendEmailVerification(auth.currentUser, {
        url: `${window.location.origin}/login`,
        handleCodeInApp: false,
      });
    } else {
      throw new Error('No hay una sesión activa en Firebase para enviar la verificación.');
    }
  };

  const reloadUser = async () => {
    if (isFirebaseConfigured() && auth && auth.currentUser) {
      await auth.currentUser.reload();
      setFirebaseUser(auth.currentUser);
    }
  };

  const switchDemoRole = (newRole: UserRole) => {
    const demoProfile = DEMO_USERS[newRole] || {
      uid: `demo-${newRole}`,
      email: `${newRole}@pachax.bo`,
      displayName: ROLE_LABELS[newRole],
      role: newRole,
      developerCompanyId: 'dev-pachax-core',
      status: 'active',
      createdAt: new Date().toISOString(),
    };
    setCurrentUser(demoProfile);
    localStorage.setItem('pachax_demo_role', newRole);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        role,
        permissions,
        isLoading,
        isDemoMode,
        isSuperAdmin,
        isDevStaff,
        isClientUser,
        login,
        logout,
        resetPassword,
        sendVerificationEmail,
        reloadUser,
        switchDemoRole,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
