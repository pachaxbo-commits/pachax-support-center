import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  UserRole,
  UserProfile,
  UserPermissions,
  getDefaultPermissions,
} from '@/models/auth';
import { DEMO_USERS } from '@/lib/demoData';
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

export type ProfileStatus = 'loading' | 'ready' | 'unauthenticated' | 'missing_profile' | 'suspended' | 'error';

interface AuthContextValue {
  currentUser: UserProfile | null;
  firebaseUser: FirebaseUser | null;
  permissions: UserPermissions;
  isLoading: boolean;
  isDemoMode: boolean;
  profileStatus: ProfileStatus;
  authError: string | null;
  login: (email: string, password?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendVerificationEmail: () => Promise<void>;
  reloadUser: () => Promise<void>;
  switchDemoRole: (role: UserRole) => void;
  role: UserRole | null;
  isClientRole: boolean;
  isDevStaff: boolean;
  isSuperAdmin: boolean;
}

const EMPTY_PERMISSIONS: UserPermissions = {
  canReportCritical: false,
  canReportGeneral: false,
  canRequestChanges: false,
  canApproveQuotes: false,
  canManageClientUsers: false,
  canViewAllClients: false,
  canManageDevStaff: false,
  canTriggerAiRepair: false,
  canPublishToProd: false,
  canManageIntegrations: false,
  canViewAuditLogs: false,
};

export function isSandboxDemoEnabled(): boolean {
  return import.meta.env.VITE_APP_MODE === 'demo' && !import.meta.env.PROD;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const sandboxAllowed = isSandboxDemoEnabled() || (!isFirebaseConfigured() && !import.meta.env.PROD);

  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDemoMode, setIsDemoMode] = useState<boolean>(sandboxAllowed && !isFirebaseConfigured());
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);

  const resolveFirebaseProfile = useCallback(async (user: FirebaseUser, forceRefreshToken = false): Promise<UserProfile> => {
    if (!db) {
      throw new Error('Base de datos Firestore no inicializada.');
    }

    const tokenResult = await user.getIdTokenResult(forceRefreshToken);
    const claims = tokenResult.claims;

    const userDocRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      setProfileStatus('missing_profile');
      setCurrentUser(null);
      throw new Error('PROFILE_NOT_CONFIGURED: Tu cuenta está autenticada pero aún no tiene un perfil operativo asignado en PACHAX Support Center.');
    }

    const data = userDoc.data() as UserProfile;

    if (data.status === 'suspended') {
      setProfileStatus('suspended');
      setCurrentUser(null);
      throw new Error('ACCOUNT_SUSPENDED: Esta cuenta ha sido suspendida por administración.');
    }

    const validRoles: UserRole[] = [
      'superadmin',
      'dev_owner',
      'dev_admin',
      'dev_engineer',
      'dev_commercial',
      'client_admin',
      'client_user',
    ];

    const resolvedRole = (claims.role && validRoles.includes(claims.role as UserRole))
      ? (claims.role as UserRole)
      : data.role;

    if (!resolvedRole || !validRoles.includes(resolvedRole)) {
      setProfileStatus('missing_profile');
      setCurrentUser(null);
      throw new Error('INVALID_ROLE: El perfil del usuario no posee un rol válido.');
    }

    const resolvedProfile: UserProfile = {
      ...data,
      uid: user.uid,
      email: user.email || data.email,
      displayName: data.displayName || user.displayName || user.email?.split('@')[0] || 'Usuario',
      role: resolvedRole,
      developerCompanyId: (claims.developerCompanyId as string | undefined) || data.developerCompanyId,
      clientCompanyId: (claims.clientCompanyId as string | undefined) || data.clientCompanyId,
      status: data.status || 'active',
    };

    setCurrentUser(resolvedProfile);
    setProfileStatus('ready');
    setAuthError(null);
    return resolvedProfile;
  }, []);

  useEffect(() => {
    // Clean up any legacy demo localStorage key in production/live mode
    if (!sandboxAllowed) {
      try {
        localStorage.removeItem('pachax_demo_role');
      } catch {
        // ignore storage errors
      }
    }

    if (isFirebaseConfigured() && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        setFirebaseUser(user);
        if (user) {
          setIsDemoMode(false);
          setIsLoading(true);
          try {
            await resolveFirebaseProfile(user, false);
          } catch (err: any) {
            const msg = err?.message || 'Error al verificar el perfil del usuario en Firestore.';
            if (!msg.startsWith('PROFILE_NOT_CONFIGURED') && !msg.startsWith('ACCOUNT_SUSPENDED') && !msg.startsWith('INVALID_ROLE')) {
              setProfileStatus('error');
            }
            setAuthError(msg);
            setCurrentUser(null);
          } finally {
            setIsLoading(false);
          }
        } else {
          // Unauthenticated in Firebase
          if (sandboxAllowed && import.meta.env.VITE_APP_MODE === 'demo') {
            const savedRole = localStorage.getItem('pachax_demo_role') as UserRole | null;
            const demoUser = (savedRole && DEMO_USERS[savedRole]) ? DEMO_USERS[savedRole] : DEMO_USERS.client_admin;
            setCurrentUser(demoUser);
            setIsDemoMode(true);
            setProfileStatus('ready');
            setAuthError(null);
          } else {
            setCurrentUser(null);
            setIsDemoMode(false);
            setProfileStatus('unauthenticated');
            setAuthError(null);
          }
          setIsLoading(false);
        }
      });
      return () => unsubscribe();
    } else if (sandboxAllowed) {
      const savedRole = localStorage.getItem('pachax_demo_role') as UserRole | null;
      const demoUser = (savedRole && DEMO_USERS[savedRole]) ? DEMO_USERS[savedRole] : DEMO_USERS.client_admin;
      setCurrentUser(demoUser);
      setIsDemoMode(true);
      setProfileStatus('ready');
      setIsLoading(false);
    } else {
      setCurrentUser(null);
      setIsDemoMode(false);
      setProfileStatus('error');
      setAuthError('Configuración de Firebase ausente en entorno de producción.');
      setIsLoading(false);
    }
  }, [sandboxAllowed, resolveFirebaseProfile]);

  const login = async (email: string, password?: string): Promise<UserProfile> => {
    setIsLoading(true);
    setAuthError(null);
    try {
      if (isFirebaseConfigured() && auth && password) {
        const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
        setFirebaseUser(cred.user);
        setIsDemoMode(false);
        const profile = await resolveFirebaseProfile(cred.user, true);
        return profile;
      }

      if (sandboxAllowed) {
        const matchedDemo = Object.values(DEMO_USERS).find(
          (u) => u.email.toLowerCase() === email.toLowerCase().trim()
        );
        if (matchedDemo) {
          setCurrentUser(matchedDemo);
          setIsDemoMode(true);
          setProfileStatus('ready');
          localStorage.setItem('pachax_demo_role', matchedDemo.role);
          return matchedDemo;
        }
      }

      throw new Error('Credenciales inválidas o contraseña requerida.');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      if (!sandboxAllowed) {
        localStorage.removeItem('pachax_demo_role');
      }
      if (isFirebaseConfigured() && auth) {
        await firebaseSignOut(auth);
      }
      setCurrentUser(null);
      setFirebaseUser(null);
      setProfileStatus('unauthenticated');
      setAuthError(null);
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    if (isFirebaseConfigured() && auth) {
      await sendPasswordResetEmail(auth, email.trim());
    } else if (!sandboxAllowed) {
      throw new Error('El servicio de autenticación no está disponible.');
    }
  };

  const sendVerificationEmail = async () => {
    if (isFirebaseConfigured() && auth && auth.currentUser) {
      await sendEmailVerification(auth.currentUser);
    } else {
      throw new Error('No hay una sesión activa de Firebase para enviar la verificación.');
    }
  };

  const reloadUser = async () => {
    if (isFirebaseConfigured() && auth && auth.currentUser) {
      await auth.currentUser.reload();
      const updated = auth.currentUser;
      setFirebaseUser({ ...updated } as FirebaseUser);
      await resolveFirebaseProfile(updated, true);
    }
  };

  const switchDemoRole = (newRole: UserRole) => {
    if (!sandboxAllowed) {
      console.warn('[Security] switchDemoRole está deshabilitado fuera del modo demo.');
      return;
    }
    const targetUser = DEMO_USERS[newRole];
    if (targetUser) {
      setCurrentUser(targetUser);
      setIsDemoMode(true);
      setProfileStatus('ready');
      localStorage.setItem('pachax_demo_role', newRole);
    }
  };

  const role: UserRole | null = currentUser ? currentUser.role : null;
  const permissions: UserPermissions = currentUser
    ? {
        ...getDefaultPermissions(currentUser.role),
        ...(currentUser.permissionsOverride || {}),
      }
    : EMPTY_PERMISSIONS;

  const isClientRole = role === 'client_admin' || role === 'client_user';
  const isDevStaff =
    role === 'superadmin' ||
    role === 'dev_owner' ||
    role === 'dev_admin' ||
    role === 'dev_engineer' ||
    role === 'dev_commercial';
  const isSuperAdmin = role === 'superadmin';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        permissions,
        isLoading,
        isDemoMode,
        profileStatus,
        authError,
        login,
        logout,
        resetPassword,
        sendVerificationEmail,
        reloadUser,
        switchDemoRole,
        role,
        isClientRole,
        isDevStaff,
        isSuperAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe utilizarse dentro de un AuthProvider');
  }
  return ctx;
}
