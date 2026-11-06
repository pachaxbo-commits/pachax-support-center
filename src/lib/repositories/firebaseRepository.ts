import { db, functions, isFirebaseConfigured } from '@/lib/firebase';
import { storageService } from '@/services/storageService';
import {
  collection,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import {
  IncidentReport,
  IncidentItem,
  IncidentStatus,
  IncidentCategory,
  AnnotationItem,
  EvidenceFile,
  IncidentComment,
} from '@/models/incident';
import { FeatureRequestItem, FeatureRequestStatus, ChangeScope } from '@/models/featureRequest';
import { Quote, QuoteLineItem, QuoteStatus } from '@/models/quote';
import { AiRepairRun, AiRepairMode } from '@/models/aiRepair';
import { ClientCompany, DeveloperCompany } from '@/models/company';
import { Project } from '@/models/project';
import { UserProfile, UserInvitation, UserRole } from '@/models/auth';

export function getOperationalDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/La_Paz',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch {
    return date.toISOString().split('T')[0];
  }
}

export class DailyGeneralLimitExceededError extends Error {
  public readonly nextAvailableWindow: string;
  constructor(message: string, nextAvailableWindow: string) {
    super(message);
    this.name = 'DailyGeneralLimitExceededError';
    this.nextAvailableWindow = nextAvailableWindow;
  }
}

function assertDb() {
  if (!isFirebaseConfigured() || !db) {
    throw new Error('La conexión a Firebase Firestore no está inicializada.');
  }
  return db;
}

function normalizeTimestamp(val: any): string {
  if (!val) return new Date().toISOString();
  if (typeof val === 'string') return val;
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  return new Date().toISOString();
}

export const firebaseRepository = {
  // ---------------------------------------------------------------------------
  // 0. DEVELOPER COMPANIES (PACHAX ONBOARDING & CONFIG)
  // ---------------------------------------------------------------------------
  async getDeveloperCompany(id: string = 'dev-pachax-core'): Promise<DeveloperCompany | null> {
    const firestore = assertDb();
    const docRef = doc(firestore, 'developerCompanies', id);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const data = snap.data() as any;
    return {
      ...data,
      id: snap.id,
      createdAt: normalizeTimestamp(data.createdAt),
      updatedAt: data.updatedAt ? normalizeTimestamp(data.updatedAt) : undefined,
    } as DeveloperCompany;
  },

  async upsertDeveloperCompany(
    payload: Partial<DeveloperCompany> & { id: string; performedByUid: string }
  ): Promise<DeveloperCompany> {
    const firestore = assertDb();
    const docRef = doc(firestore, 'developerCompanies', payload.id);
    const existingSnap = await getDoc(docRef);
    const nowIso = new Date().toISOString();

    const record: DeveloperCompany = {
      id: payload.id,
      name: payload.name?.trim() || 'PACHAX',
      legalName: payload.legalName?.trim() || undefined,
      taxId: payload.taxId?.trim() || undefined,
      slug: payload.slug?.trim() || 'pachax',
      adminEmail: payload.adminEmail?.trim() || 'pachax.bo@gmail.com',
      supportEmail: payload.supportEmail?.trim() || 'pachax.bo@gmail.com',
      supportPhone: payload.supportPhone?.trim() || undefined,
      address: payload.address?.trim() || undefined,
      website: payload.website?.trim() || 'https://support.pachax.bo',
      slaConfig: {
        criticalResponseHours: payload.slaConfig?.criticalResponseHours,
        generalResponseHours: payload.slaConfig?.generalResponseHours,
        policyNotes:
          payload.slaConfig?.policyNotes ||
          'Política de SLA sujeta a las condiciones del contrato vigente de cada empresa cliente.',
      },
      incidentPolicies: payload.incidentPolicies || {
        defaultDailyGeneralQuota: 1,
        requireVisualEvidence: false,
        criticalRequiresJustification: true,
      },
      commercialConfig: payload.commercialConfig || {
        defaultCurrency: 'USD',
        quoteValidityDays: 15,
      },
      telegramConfig: payload.telegramConfig || {
        botEnabled: false,
      },
      emailConfig: payload.emailConfig || {
        senderAddress: 'pachax.bo@gmail.com',
        senderName: 'PACHAX Support Center',
      },
      status: payload.status || 'active',
      createdAt: existingSnap.exists()
        ? normalizeTimestamp(existingSnap.data()?.createdAt)
        : nowIso,
      updatedAt: nowIso,
    };

    // Strip undefined fields for Firestore compatibility
    const cleanRecord = JSON.parse(JSON.stringify(record));
    await setDoc(docRef, {
      ...cleanRecord,
      serverUpdatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(firestore, 'auditLogs'), {
      action: existingSnap.exists() ? 'DEVELOPER_COMPANY_UPDATED' : 'DEVELOPER_COMPANY_INITIALIZED',
      developerCompanyId: payload.id,
      performedBy: payload.performedByUid,
      timestamp: serverTimestamp(),
    });

    return record;
  },

  // ---------------------------------------------------------------------------
  // 1. CLIENT COMPANIES
  // ---------------------------------------------------------------------------
  async getClients(developerCompanyId?: string): Promise<ClientCompany[]> {
    const firestore = assertDb();
    const q = developerCompanyId
      ? query(collection(firestore, 'clientCompanies'), where('developerCompanyId', '==', developerCompanyId))
      : query(collection(firestore, 'clientCompanies'));
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
        createdAt: normalizeTimestamp(data.createdAt),
        updatedAt: data.updatedAt ? normalizeTimestamp(data.updatedAt) : undefined,
      } as ClientCompany;
    });
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createClient(payload: {
    name: string;
    taxId?: string;
    contactEmail: string;
    contactPhone?: string;
    address?: string;
    billingTier: 'starter' | 'business' | 'enterprise';
    allowedDomains?: string[];
    maxDailyGeneralReports?: number;
    developerCompanyId?: string;
    slaConfig?: {
      criticalResponseHours?: number;
      generalResponseHours?: number;
      contractReference?: string;
    };
    performedByUid: string;
  }): Promise<ClientCompany> {
    const firestore = assertDb();
    const cleanName = payload.name.trim();
    const cleanEmail = payload.contactEmail.trim().toLowerCase();

    if (!cleanName || cleanName.length < 2) {
      throw new Error('El nombre comercial de la empresa cliente es obligatorio.');
    }
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('El correo electrónico de contacto no es válido.');
    }

    const devId = payload.developerCompanyId || 'dev-pachax-core';

    // Check duplicates within developerCompanyId
    const existingClients = await this.getClients(devId);
    const duplicateName = existingClients.find(
      (c) => c.name.toLowerCase() === cleanName.toLowerCase()
    );
    if (duplicateName) {
      throw new Error(`Ya existe una empresa cliente registrada con el nombre "${cleanName}".`);
    }

    if (payload.taxId?.trim()) {
      const duplicateTax = existingClients.find(
        (c) => c.taxId && c.taxId.trim() === payload.taxId!.trim()
      );
      if (duplicateTax) {
        throw new Error(`Ya existe una empresa cliente registrada con el NIT "${payload.taxId.trim()}".`);
      }
    }

    const slug = cleanName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 24);
    const clientId = `client-${slug}-${Date.now().toString(36).slice(-4)}`;
    const nowIso = new Date().toISOString();

    const domainPart = cleanEmail.split('@')[1];
    const allowedDomains =
      payload.allowedDomains && payload.allowedDomains.length > 0
        ? payload.allowedDomains
        : domainPart
        ? [domainPart]
        : [];

    const newClient: ClientCompany = {
      id: clientId,
      developerCompanyId: devId,
      name: cleanName,
      taxId: payload.taxId?.trim() || undefined,
      contactEmail: cleanEmail,
      contactPhone: payload.contactPhone?.trim() || undefined,
      address: payload.address?.trim() || undefined,
      billingTier: payload.billingTier,
      status: 'active',
      allowedDomains,
      maxDailyGeneralReports: payload.maxDailyGeneralReports || 1,
      slaConfig: payload.slaConfig,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    const cleanDoc = JSON.parse(JSON.stringify(newClient));
    await setDoc(doc(firestore, 'clientCompanies', clientId), {
      ...cleanDoc,
      serverCreatedAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'auditLogs'), {
      action: 'CLIENT_COMPANY_CREATED',
      clientCompanyId: clientId,
      clientName: cleanName,
      developerCompanyId: devId,
      performedBy: payload.performedByUid,
      timestamp: serverTimestamp(),
    });

    return newClient;
  },

  async updateClient(
    clientId: string,
    updates: Partial<Omit<ClientCompany, 'id' | 'developerCompanyId' | 'createdAt'>>,
    performedByUid: string,
    developerCompanyId: string = 'dev-pachax-core'
  ): Promise<void> {
    const firestore = assertDb();
    const docRef = doc(firestore, 'clientCompanies', clientId);
    const cleanUpdates = JSON.parse(
      JSON.stringify({
        ...updates,
        updatedAt: new Date().toISOString(),
      })
    );
    await updateDoc(docRef, cleanUpdates);

    await addDoc(collection(firestore, 'auditLogs'), {
      action: 'CLIENT_COMPANY_UPDATED',
      clientCompanyId: clientId,
      developerCompanyId,
      performedBy: performedByUid,
      timestamp: serverTimestamp(),
    });
  },

  // ---------------------------------------------------------------------------
  // 2. PROJECTS & APPS
  // ---------------------------------------------------------------------------
  async getProjects(clientCompanyId?: string, developerCompanyId?: string): Promise<Project[]> {
    const firestore = assertDb();
    let q = query(collection(firestore, 'projects'));
    if (clientCompanyId) {
      q = query(collection(firestore, 'projects'), where('clientCompanyId', '==', clientCompanyId));
    } else if (developerCompanyId) {
      q = query(collection(firestore, 'projects'), where('developerCompanyId', '==', developerCompanyId));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
        createdAt: normalizeTimestamp(data.createdAt),
      } as Project;
    });
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async createProject(payload: {
    clientCompanyId: string;
    developerCompanyId?: string;
    name: string;
    code: string;
    description?: string;
    repositoryUrl?: string;
    activeBranch?: string;
    environment: 'production' | 'staging' | 'development';
    techStack: Project['techStack'];
    appCheckEnabled?: boolean;
    performedByUid: string;
  }): Promise<Project> {
    const firestore = assertDb();
    const cleanName = payload.name.trim();
    const cleanCode = payload.code.trim().toUpperCase().replace(/[^A-Z0-9-_]/g, '');

    if (!cleanName) throw new Error('El nombre del proyecto es obligatorio.');
    if (!cleanCode) throw new Error('El código identificador del proyecto es obligatorio.');
    if (!payload.clientCompanyId) throw new Error('Debe seleccionar una empresa cliente válida.');

    // Verify client company exists
    const clientSnap = await getDoc(doc(firestore, 'clientCompanies', payload.clientCompanyId));
    if (!clientSnap.exists()) {
      throw new Error('La empresa cliente seleccionada no existe en Firestore.');
    }

    const clientData = clientSnap.data() as ClientCompany;
    const devId = clientData.developerCompanyId || payload.developerCompanyId || 'dev-pachax-core';

    // Check duplicate code
    const existingProjects = await this.getProjects(undefined, devId);
    if (existingProjects.some((p) => p.code.toUpperCase() === cleanCode)) {
      throw new Error(`Ya existe un proyecto registrado con el código "${cleanCode}".`);
    }

    const slug = cleanCode.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const projectId = `proj-${slug}-${Date.now().toString(36).slice(-4)}`;
    const randomHex = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');
    const publicKey = `pk_${payload.environment === 'production' ? 'live' : 'test'}_${slug}_${randomHex}`;
    const nowIso = new Date().toISOString();

    const newProject: Project = {
      id: projectId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: devId,
      name: cleanName,
      code: cleanCode,
      description: payload.description?.trim() || undefined,
      repositoryUrl: payload.repositoryUrl?.trim() || undefined,
      activeBranch: payload.activeBranch?.trim() || 'main',
      environment: payload.environment,
      techStack: payload.techStack && payload.techStack.length > 0 ? payload.techStack : ['react'],
      status: 'active',
      publicKey,
      appCheckEnabled: payload.appCheckEnabled ?? true,
      createdAt: nowIso,
    };

    const cleanDoc = JSON.parse(JSON.stringify(newProject));
    await setDoc(doc(firestore, 'projects', projectId), {
      ...cleanDoc,
      serverCreatedAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'auditLogs'), {
      action: 'PROJECT_CREATED',
      projectId,
      projectCode: cleanCode,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: devId,
      performedBy: payload.performedByUid,
      timestamp: serverTimestamp(),
    });

    return newProject;
  },

  async updateProject(
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'clientCompanyId' | 'developerCompanyId' | 'createdAt'>>,
    performedByUid: string,
    developerCompanyId: string = 'dev-pachax-core'
  ): Promise<void> {
    const firestore = assertDb();
    const docRef = doc(firestore, 'projects', projectId);
    const cleanUpdates = JSON.parse(JSON.stringify(updates));
    await updateDoc(docRef, cleanUpdates);

    await addDoc(collection(firestore, 'auditLogs'), {
      action: 'PROJECT_UPDATED',
      projectId,
      developerCompanyId,
      performedBy: performedByUid,
      timestamp: serverTimestamp(),
    });
  },

  // ---------------------------------------------------------------------------
  // 3. USERS & INVITATIONS
  // ---------------------------------------------------------------------------
  async getUsers(filters?: { developerCompanyId?: string; clientCompanyId?: string }): Promise<UserProfile[]> {
    const firestore = assertDb();
    let q = query(collection(firestore, 'users'));
    if (filters?.clientCompanyId) {
      q = query(collection(firestore, 'users'), where('clientCompanyId', '==', filters.clientCompanyId));
    } else if (filters?.developerCompanyId) {
      q = query(collection(firestore, 'users'), where('developerCompanyId', '==', filters.developerCompanyId));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        uid: data.uid || d.id,
        createdAt: normalizeTimestamp(data.createdAt),
      } as UserProfile;
    });
  },

  async getInvitations(developerCompanyId?: string): Promise<UserInvitation[]> {
    const firestore = assertDb();
    const q = developerCompanyId
      ? query(collection(firestore, 'userInvitations'), where('developerCompanyId', '==', developerCompanyId))
      : query(collection(firestore, 'userInvitations'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        email: data.email,
        role: data.role,
        developerCompanyId: data.developerCompanyId,
        clientCompanyId: data.clientCompanyId,
        invitedBy: data.invitedBy,
        token: data.token || '***',
        status: data.status || 'pending',
        expiresAt: normalizeTimestamp(data.expiresAt),
        createdAt: normalizeTimestamp(data.createdAt),
      } as UserInvitation;
    });
  },

  async createInvitation(payload: {
    email: string;
    displayName: string;
    role: UserRole;
    developerCompanyId: string;
    clientCompanyId?: string;
    invitedByUid: string;
    invitedByEmail: string;
  }): Promise<{ invitation: UserInvitation; mode: 'cloud_function' | 'firestore_direct' }> {
    const firestore = assertDb();
    const cleanEmail = payload.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('Correo electrónico inválido.');
    }

    const isClientTarget = payload.role === 'client_admin' || payload.role === 'client_user';
    if (isClientTarget && !payload.clientCompanyId) {
      throw new Error('Para invitar un usuario de cliente debe seleccionar una empresa cliente registrada.');
    }

    // Try Cloud Function first if deployed
    if (functions) {
      try {
        const inviteFn = httpsCallable<any, any>(functions, 'inviteUser');
        const res = await inviteFn({
          email: cleanEmail,
          displayName: payload.displayName.trim(),
          role: payload.role,
          developerCompanyId: payload.developerCompanyId,
          clientCompanyId: isClientTarget ? payload.clientCompanyId : null,
        });
        if (res.data?.success) {
          const nowIso = new Date().toISOString();
          const expiresIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
          return {
            mode: 'cloud_function',
            invitation: {
              id: res.data.invitationId,
              email: cleanEmail,
              role: payload.role,
              developerCompanyId: payload.developerCompanyId,
              clientCompanyId: isClientTarget ? payload.clientCompanyId : undefined,
              invitedBy: payload.invitedByUid,
              token: res.data.token || 'enviado',
              status: 'pending',
              expiresAt: expiresIso,
              createdAt: nowIso,
            },
          };
        }
      } catch (fnErr: any) {
        // Only fall back to direct Firestore write if the Cloud Function is not deployed yet (not-found / internal / network)
        const code = fnErr?.code || '';
        if (code.includes('permission-denied') || code.includes('invalid-argument')) {
          throw fnErr;
        }
      }
    }

    // Direct administrative invitation record in Firestore (protected by firestore.rules for superadmin / dev_admin)
    const nowIso = new Date().toISOString();
    const expiresIso = new Date(Date.now() + 48 * 3600 * 1000).toISOString();
    const randomToken = Array.from({ length: 32 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    const docRef = await addDoc(collection(firestore, 'userInvitations'), {
      email: cleanEmail,
      displayName: payload.displayName.trim(),
      role: payload.role,
      developerCompanyId: payload.developerCompanyId,
      clientCompanyId: isClientTarget ? payload.clientCompanyId : null,
      invitedBy: payload.invitedByUid,
      invitedByEmail: payload.invitedByEmail,
      status: 'pending',
      expiresAt: expiresIso,
      createdAt: nowIso,
      serverCreatedAt: serverTimestamp(),
    });

    await addDoc(collection(firestore, 'auditLogs'), {
      action: 'USER_INVITATION_CREATED',
      invitationId: docRef.id,
      targetEmail: cleanEmail,
      targetRole: payload.role,
      developerCompanyId: payload.developerCompanyId,
      clientCompanyId: isClientTarget ? payload.clientCompanyId : null,
      performedBy: payload.invitedByUid,
      timestamp: serverTimestamp(),
    });

    return {
      mode: 'firestore_direct',
      invitation: {
        id: docRef.id,
        email: cleanEmail,
        role: payload.role,
        developerCompanyId: payload.developerCompanyId,
        clientCompanyId: isClientTarget ? payload.clientCompanyId : undefined,
        invitedBy: payload.invitedByUid,
        token: randomToken,
        status: 'pending',
        expiresAt: expiresIso,
        createdAt: nowIso,
      },
    };
  },

  async updateUserStatus(
    targetUid: string,
    newStatus: 'active' | 'suspended',
    performedByUid: string,
    developerCompanyId: string = 'dev-pachax-core'
  ): Promise<void> {
    if (targetUid === performedByUid) {
      throw new Error('Por seguridad no puedes suspender ni alterar el estado de tu propia cuenta.');
    }

    const firestore = assertDb();

    if (functions) {
      try {
        const statusFn = httpsCallable<any, any>(functions, 'setUserAccountStatus');
        const res = await statusFn({ targetUid, newStatus });
        if (res.data?.success) return;
      } catch (fnErr: any) {
        const code = fnErr?.code || '';
        if (
          code.includes('permission-denied') ||
          code.includes('failed-precondition') ||
          code.includes('invalid-argument')
        ) {
          throw fnErr;
        }
      }
    }

    await updateDoc(doc(firestore, 'users', targetUid), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });

    await addDoc(collection(firestore, 'auditLogs'), {
      action: `USER_STATUS_${newStatus.toUpperCase()}`,
      targetUid,
      developerCompanyId,
      performedBy: performedByUid,
      timestamp: serverTimestamp(),
    });
  },

  // ---------------------------------------------------------------------------
  // 4. DAILY QUOTA CHECK
  // ---------------------------------------------------------------------------
  async hasSubmittedGeneralReportToday(clientCompanyId: string): Promise<{
    alreadySubmitted: boolean;
    lastReport?: IncidentReport;
    operationalDay: string;
    nextAvailableAt: string;
  }> {
    const operationalDay = getOperationalDateString();
    const nextAvailableAt = `${operationalDay}T23:59:59.999-04:00 (Reinicio 00:00 America/La_Paz)`;
    const firestore = assertDb();

    const quotaDoc = await getDoc(doc(firestore, 'dailyQuotas', `${clientCompanyId}_${operationalDay}`));
    if (quotaDoc.exists() && (quotaDoc.data()?.count || 0) >= 1) {
      return {
        alreadySubmitted: true,
        operationalDay,
        nextAvailableAt,
      };
    }

    const q = query(
      collection(firestore, 'incidentReports'),
      where('clientCompanyId', '==', clientCompanyId),
      where('category', '==', 'general')
    );
    const snap = await getDocs(q);
    const todayMatch = snap.docs
      .map((d) => ({ ...(d.data() as any), id: d.id, createdAt: normalizeTimestamp(d.data().createdAt) } as IncidentReport))
      .find((r) => getOperationalDateString(new Date(r.createdAt)) === operationalDay);

    return {
      alreadySubmitted: Boolean(todayMatch),
      lastReport: todayMatch,
      operationalDay,
      nextAvailableAt,
    };
  },

  // ---------------------------------------------------------------------------
  // 5. INCIDENT REPORTS & ITEMS
  // ---------------------------------------------------------------------------
  async getIncidentReports(filters?: {
    clientCompanyId?: string;
    developerCompanyId?: string;
    category?: IncidentCategory;
  }): Promise<IncidentReport[]> {
    const firestore = assertDb();
    let q = query(collection(firestore, 'incidentReports'));
    if (filters?.clientCompanyId) {
      q = query(collection(firestore, 'incidentReports'), where('clientCompanyId', '==', filters.clientCompanyId));
    } else if (filters?.developerCompanyId) {
      q = query(collection(firestore, 'incidentReports'), where('developerCompanyId', '==', filters.developerCompanyId));
    }

    const snap = await getDocs(q);
    let results = snap.docs.map((d) => {
      const data = d.data() as any;
      const reportedBy =
        typeof data.reportedBy === 'string'
          ? {
              uid: data.reportedBy,
              displayName: data.reportedByEmail?.split('@')[0] || 'Usuario',
              email: data.reportedByEmail || '',
            }
          : data.reportedBy;

      return {
        ...data,
        id: d.id,
        reportedBy,
        createdAt: normalizeTimestamp(data.createdAt),
        updatedAt: normalizeTimestamp(data.updatedAt),
      } as IncidentReport;
    });

    if (filters?.category) {
      results = results.filter((r) => r.category === filters.category);
    }
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getIncidentItems(reportId?: string, clientCompanyId?: string, developerCompanyId?: string): Promise<IncidentItem[]> {
    const firestore = assertDb();
    let q = query(collection(firestore, 'incidentItems'));
    if (reportId) {
      q = query(collection(firestore, 'incidentItems'), where('reportId', '==', reportId));
    } else if (clientCompanyId) {
      q = query(collection(firestore, 'incidentItems'), where('clientCompanyId', '==', clientCompanyId));
    } else if (developerCompanyId) {
      q = query(collection(firestore, 'incidentItems'), where('developerCompanyId', '==', developerCompanyId));
    }

    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
        evidenceFiles: data.evidenceFiles || [],
        comments: data.comments || [],
        createdAt: normalizeTimestamp(data.createdAt),
        updatedAt: normalizeTimestamp(data.updatedAt),
      } as IncidentItem;
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createIncidentReport(payload: {
    clientCompanyId: string;
    developerCompanyId: string;
    projectId: string;
    projectName: string;
    reportedBy: { uid: string; displayName: string; email: string };
    category: IncidentCategory;
    title: string;
    dailySubmissionConsentConfirmed?: boolean;
    criticalJustification?: string;
    emergencyPhone?: string;
    idempotencyKey?: string;
    items: {
      title: string;
      description: string;
      moduleAffected: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      originalImageUrl?: string;
      annotatedImageUrl?: string;
      annotations?: AnnotationItem[];
      evidenceFiles?: EvidenceFile[];
    }[];
  }): Promise<{ report: IncidentReport; items: IncidentItem[] }> {
    const firestore = assertDb();

    if (!payload.clientCompanyId || !payload.projectId) {
      throw new Error('Debe seleccionar un proyecto válido asociado a una empresa cliente.');
    }

    if (payload.category === 'general') {
      const quotaStatus = await this.hasSubmittedGeneralReportToday(payload.clientCompanyId);
      if (quotaStatus.alreadySubmitted) {
        throw new DailyGeneralLimitExceededError(
          `Cuota diaria alcanzada: La empresa ya registró su lote consolidado hoy (${quotaStatus.operationalDay}).`,
          quotaStatus.nextAvailableAt
        );
      }
    }

    const now = new Date().toISOString();
    const reportId = `rep-${payload.category === 'critical' ? 'crit' : 'gen'}-${Date.now().toString(36)}`;

    // Upload images to Cloud Storage if present
    const processedItems: IncidentItem[] = [];
    for (let idx = 0; idx < payload.items.length; idx++) {
      const raw = payload.items[idx];
      const itemId = `item-${reportId}-${idx + 1}`;
      let finalOriginalUrl = raw.originalImageUrl;
      let finalAnnotatedUrl = raw.annotatedImageUrl;

      if (
        (raw.originalImageUrl && raw.originalImageUrl.startsWith('data:')) ||
        (raw.annotatedImageUrl && raw.annotatedImageUrl.startsWith('data:'))
      ) {
        const uploaded = await storageService.uploadIncidentEvidencePair({
          developerCompanyId: payload.developerCompanyId,
          clientCompanyId: payload.clientCompanyId,
          projectId: payload.projectId,
          reportId,
          itemId,
          originalDataUrl: raw.originalImageUrl,
          annotatedDataUrl: raw.annotatedImageUrl,
        });
        finalOriginalUrl = uploaded.originalUrl;
        finalAnnotatedUrl = uploaded.annotatedUrl;
      }

      processedItems.push({
        id: itemId,
        reportId,
        clientCompanyId: payload.clientCompanyId,
        developerCompanyId: payload.developerCompanyId,
        projectId: payload.projectId,
        title: raw.title.trim(),
        description: raw.description.trim(),
        moduleAffected: raw.moduleAffected || 'General',
        originalImageUrl: finalOriginalUrl,
        annotatedImageUrl: finalAnnotatedUrl,
        annotations: raw.annotations || [],
        evidenceFiles: raw.evidenceFiles || [],
        status: 'received',
        priority: payload.category === 'critical' ? 'urgent' : raw.priority,
        aiFixEligible: true,
        aiFixStatus: 'not_started',
        createdAt: now,
        updatedAt: now,
      });
    }

    const newReport: IncidentReport = {
      id: reportId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId,
      projectId: payload.projectId,
      projectName: payload.projectName,
      reportedBy: payload.reportedBy,
      category: payload.category,
      title: payload.title.trim(),
      itemsCount: processedItems.length,
      status: 'received',
      dailySubmissionConsentConfirmed: payload.dailySubmissionConsentConfirmed,
      criticalJustification: payload.criticalJustification?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    if (payload.category === 'general') {
      if (!functions) {
        throw new Error('Cloud Functions no está inicializado para procesar el lote diario de incidencias.');
      }
      const submitBatchFn = httpsCallable<any, any>(functions, 'submitGeneralIncidentBatch');
      await submitBatchFn({
        clientCompanyId: payload.clientCompanyId,
        developerCompanyId: payload.developerCompanyId,
        projectId: payload.projectId,
        title: payload.title.trim(),
        items: processedItems,
        dailyConsent: payload.dailySubmissionConsentConfirmed,
        idempotencyKey: payload.idempotencyKey || reportId,
      });
      return { report: newReport, items: processedItems };
    }

    // Critical incident: try Cloud Function first, or write directly via validated Firestore rules
    if (functions) {
      try {
        const submitCritFn = httpsCallable<any, any>(functions, 'submitCriticalIncident');
        await submitCritFn({
          clientCompanyId: payload.clientCompanyId,
          developerCompanyId: payload.developerCompanyId,
          projectId: payload.projectId,
          title: payload.title.trim(),
          description: processedItems[0]?.description || payload.title.trim(),
          moduleAffected: processedItems[0]?.moduleAffected || 'General',
          criticalJustification: payload.criticalJustification?.trim(),
          emergencyPhone: payload.emergencyPhone || null,
          originalImageUrl: processedItems[0]?.originalImageUrl || null,
          annotatedImageUrl: processedItems[0]?.annotatedImageUrl || null,
          annotations: processedItems[0]?.annotations || [],
          evidenceFiles: processedItems[0]?.evidenceFiles || [],
          idempotencyKey: payload.idempotencyKey || reportId,
        });
        return { report: newReport, items: processedItems };
      } catch (fnErr: any) {
        const code = fnErr?.code || '';
        if (
          code.includes('permission-denied') ||
          code.includes('invalid-argument') ||
          code.includes('resource-exhausted')
        ) {
          throw fnErr;
        }
      }
    }

    // Direct Firestore write matching strict firestore.rules keys
    await setDoc(doc(firestore, 'incidentReports', reportId), {
      id: reportId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId,
      projectId: payload.projectId,
      projectName: payload.projectName,
      reportedBy: payload.reportedBy.uid,
      reportedByEmail: payload.reportedBy.email,
      category: 'critical',
      title: payload.title.trim(),
      itemsCount: processedItems.length,
      status: 'received',
      criticalJustification: payload.criticalJustification?.trim() || '',
      emergencyPhone: payload.emergencyPhone || null,
      createdAt: now,
      updatedAt: now,
    });

    for (const item of processedItems) {
      await setDoc(doc(firestore, 'incidentItems', item.id), {
        id: item.id,
        reportId,
        clientCompanyId: item.clientCompanyId,
        developerCompanyId: item.developerCompanyId,
        projectId: item.projectId,
        title: item.title,
        description: item.description,
        moduleAffected: item.moduleAffected,
        originalImageUrl: item.originalImageUrl || null,
        annotatedImageUrl: item.annotatedImageUrl || null,
        annotations: item.annotations || [],
        evidenceFiles: item.evidenceFiles || [],
        status: 'received',
        priority: 'urgent',
        aiFixEligible: true,
        aiFixStatus: 'not_started',
        createdAt: now,
        updatedAt: now,
      });
    }

    return { report: newReport, items: processedItems };
  },

  async updateIncidentItemStatus(itemId: string, newStatus: IncidentStatus): Promise<void> {
    const firestore = assertDb();
    await updateDoc(doc(firestore, 'incidentItems', itemId), {
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
  },

  async assignIncidentItem(
    itemId: string,
    assignee: { uid: string; displayName: string; email: string } | null
  ): Promise<void> {
    const firestore = assertDb();
    await updateDoc(doc(firestore, 'incidentItems', itemId), {
      assignedTo: assignee,
      updatedAt: new Date().toISOString(),
    });
  },

  async addIncidentComment(itemId: string, comment: Omit<IncidentComment, 'id' | 'createdAt'>): Promise<IncidentComment> {
    const firestore = assertDb();
    const itemRef = doc(firestore, 'incidentItems', itemId);
    const snap = await getDoc(itemRef);
    if (!snap.exists()) {
      throw new Error('El ítem de incidencia no existe.');
    }
    const existingComments: IncidentComment[] = snap.data()?.comments || [];
    const newComment: IncidentComment = {
      ...comment,
      id: `msg-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    const updatedComments = [...existingComments, newComment];
    await updateDoc(itemRef, {
      comments: updatedComments,
      updatedAt: new Date().toISOString(),
    });
    return newComment;
  },

  // ---------------------------------------------------------------------------
  // 6. FEATURE REQUESTS
  // ---------------------------------------------------------------------------
  async getFeatureRequests(clientCompanyId?: string, developerCompanyId?: string): Promise<FeatureRequestItem[]> {
    const firestore = assertDb();
    let q = query(collection(firestore, 'featureRequests'));
    if (clientCompanyId) {
      q = query(collection(firestore, 'featureRequests'), where('clientCompanyId', '==', clientCompanyId));
    } else if (developerCompanyId) {
      q = query(collection(firestore, 'featureRequests'), where('developerCompanyId', '==', developerCompanyId));
    }
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data() as any;
      const reportedBy =
        typeof data.reportedBy === 'string'
          ? {
              uid: data.reportedBy,
              displayName: data.reportedByEmail?.split('@')[0] || 'Usuario',
              email: data.reportedByEmail || '',
            }
          : data.reportedBy;
      return {
        ...data,
        id: d.id,
        reportedBy,
        evidenceFiles: data.evidenceFiles || [],
        createdAt: normalizeTimestamp(data.createdAt),
        updatedAt: normalizeTimestamp(data.updatedAt),
      } as FeatureRequestItem;
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createFeatureRequest(payload: {
    clientCompanyId: string;
    developerCompanyId: string;
    projectId: string;
    projectName: string;
    title: string;
    description: string;
    businessJustification: string;
    isConsideredFreeByClient: boolean;
    freeRationale?: string;
    changeScope: ChangeScope;
    annotatedImageUrl?: string;
    annotations?: AnnotationItem[];
    evidenceFiles?: EvidenceFile[];
    reportedBy: { uid: string; displayName: string; email: string };
  }): Promise<FeatureRequestItem> {
    const firestore = assertDb();
    if (!payload.clientCompanyId || !payload.projectId) {
      throw new Error('Debe seleccionar un proyecto válido asociado a la empresa cliente.');
    }

    const now = new Date().toISOString();
    const requestId = `feat-${Date.now().toString(36)}`;
    let finalAnnotatedUrl = payload.annotatedImageUrl;

    if (payload.annotatedImageUrl && payload.annotatedImageUrl.startsWith('data:')) {
      const uploaded = await storageService.uploadIncidentImage({
        developerCompanyId: payload.developerCompanyId,
        clientCompanyId: payload.clientCompanyId,
        projectId: payload.projectId,
        reportId: requestId,
        itemId: `${requestId}_mockup`,
        type: 'annotated',
        dataUrlOrBase64: payload.annotatedImageUrl,
      });
      finalAnnotatedUrl = uploaded.url;
    }

    const newFeature: FeatureRequestItem = {
      id: requestId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId,
      projectId: payload.projectId,
      projectName: payload.projectName,
      title: payload.title.trim(),
      description: payload.description.trim(),
      businessJustification: payload.businessJustification.trim(),
      isConsideredFreeByClient: payload.isConsideredFreeByClient,
      freeRationale: payload.freeRationale?.trim(),
      changeScope: payload.changeScope,
      annotatedImageUrl: finalAnnotatedUrl,
      annotations: payload.annotations || [],
      evidenceFiles: payload.evidenceFiles || [],
      status: 'submitted',
      reportedBy: payload.reportedBy,
      createdAt: now,
      updatedAt: now,
    };

    // firestore.rules requires reportedBy == request.auth.uid on create and status == 'submitted'
    const firestoreDoc = JSON.parse(
      JSON.stringify({
        ...newFeature,
        reportedBy: payload.reportedBy.uid,
        reportedByEmail: payload.reportedBy.email,
        reportedByName: payload.reportedBy.displayName,
      })
    );
    await setDoc(doc(firestore, 'featureRequests', requestId), firestoreDoc);

    return newFeature;
  },

  async updateFeatureRequestStatus(requestId: string, status: FeatureRequestStatus, quoteId?: string): Promise<void> {
    const firestore = assertDb();
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date().toISOString(),
    };
    if (quoteId) updates.quoteId = quoteId;
    await updateDoc(doc(firestore, 'featureRequests', requestId), updates);
  },

  // ---------------------------------------------------------------------------
  // 7. QUOTES (COMMERCIAL ESTIMATES)
  // ---------------------------------------------------------------------------
  async getQuotes(clientCompanyId?: string, developerCompanyId?: string): Promise<Quote[]> {
    const firestore = assertDb();
    let q = query(collection(firestore, 'quotes'));
    if (clientCompanyId) {
      q = query(collection(firestore, 'quotes'), where('clientCompanyId', '==', clientCompanyId));
    } else if (developerCompanyId) {
      q = query(collection(firestore, 'quotes'), where('developerCompanyId', '==', developerCompanyId));
    }

    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
        items: data.items || [],
        createdAt: normalizeTimestamp(data.createdAt),
        updatedAt: normalizeTimestamp(data.updatedAt),
      } as Quote;
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createQuote(payload: {
    clientCompanyId: string;
    developerCompanyId: string;
    projectId: string;
    featureRequestId?: string;
    title: string;
    description: string;
    items: QuoteLineItem[];
    currency: 'USD' | 'BOB';
    estimatedDeliveryDays: number;
    validUntil?: string;
    status?: QuoteStatus;
    performedByUid: string;
  }): Promise<Quote> {
    const firestore = assertDb();
    if (!payload.clientCompanyId || !payload.projectId) {
      throw new Error('Debe seleccionar una empresa cliente y un proyecto válido para emitir la cotización.');
    }
    if (!payload.title.trim()) {
      throw new Error('El título de la cotización es obligatorio.');
    }

    const subtotal = payload.items.reduce((sum, i) => sum + i.total, 0);
    if (subtotal <= 0) {
      throw new Error('El monto total de la cotización debe ser mayor a 0.');
    }

    const now = new Date().toISOString();
    const quoteId = `QT-${new Date().getFullYear()}-${Date.now().toString(36).toUpperCase().slice(-5)}`;
    const validUntil =
      payload.validUntil ||
      new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const newQuote: Quote = {
      id: quoteId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId || 'dev-pachax-core',
      projectId: payload.projectId,
      featureRequestId: payload.featureRequestId || undefined,
      title: payload.title.trim(),
      description: payload.description.trim(),
      items: payload.items,
      subtotal,
      currency: payload.currency,
      estimatedDeliveryDays: payload.estimatedDeliveryDays,
      validUntil,
      status: payload.status || 'sent',
      createdAt: now,
      updatedAt: now,
    };

    const cleanDoc = JSON.parse(JSON.stringify(newQuote));
    await setDoc(doc(firestore, 'quotes', quoteId), cleanDoc);

    if (payload.featureRequestId) {
      try {
        await this.updateFeatureRequestStatus(payload.featureRequestId, 'quoted', quoteId);
      } catch {
        // non-blocking if featureRequest doesn't exist
      }
    }

    await addDoc(collection(firestore, 'auditLogs'), {
      action: 'QUOTE_CREATED',
      quoteId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: newQuote.developerCompanyId,
      subtotal,
      currency: payload.currency,
      performedBy: payload.performedByUid,
      timestamp: serverTimestamp(),
    });

    return newQuote;
  },

  async approveQuote(
    quoteId: string,
    approver: { uid: string; displayName: string; email: string }
  ): Promise<void> {
    const firestore = assertDb();
    const now = new Date().toISOString();
    await updateDoc(doc(firestore, 'quotes', quoteId), {
      status: 'approved',
      approvedBy: approver,
      approvedAt: now,
    });
  },

  async rejectQuote(
    quoteId: string,
    rejecter: { uid: string; displayName: string },
    reason: string
  ): Promise<void> {
    const firestore = assertDb();
    const now = new Date().toISOString();
    await updateDoc(doc(firestore, 'quotes', quoteId), {
      status: 'rejected',
      rejectionReason: reason,
      rejectedAt: now,
    });
  },

  // ---------------------------------------------------------------------------
  // 8. AI REPAIR RUNS (READ-ONLY UNTIL PHASE 3 AGENTS ARE ENABLED)
  // ---------------------------------------------------------------------------
  async getAiRepairRuns(developerCompanyId: string = 'dev-pachax-core'): Promise<AiRepairRun[]> {
    const firestore = assertDb();
    const q = query(
      collection(firestore, 'aiRepairRuns'),
      where('developerCompanyId', '==', developerCompanyId)
    );
    const snap = await getDocs(q);
    const list = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        ...data,
        id: d.id,
        logs: data.logs || [],
        filesModified: data.filesModified || [],
        createdAt: normalizeTimestamp(data.createdAt),
      } as AiRepairRun;
    });
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async triggerAiRepair(_payload: {
    incidentItemId: string;
    projectId: string;
    mode: AiRepairMode;
    agentEngine: 'codex-sdk' | 'claude-agent-sdk' | 'hybrid';
    triggeredBy: { uid: string; displayName: string };
  }): Promise<AiRepairRun> {
    throw new Error(
      'FASE_3_PENDIENTE: El motor de reparación autónoma con IA (Codex SDK / Claude Agent SDK) aún no está habilitado en producción. No se generan ejecuciones simuladas.'
    );
  },
};
