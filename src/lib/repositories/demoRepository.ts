import {
  INITIAL_INCIDENT_REPORTS,
  INITIAL_INCIDENT_ITEMS,
  INITIAL_FEATURE_REQUESTS,
  INITIAL_QUOTES,
  INITIAL_AI_REPAIR_RUNS,
  DEMO_CLIENTS,
  DEMO_PROJECTS,
  DEMO_USERS,
  DEMO_DEV_COMPANY,
} from '@/lib/demoData';
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
import {
  getOperationalDateString,
  DailyGeneralLimitExceededError,
} from './firebaseRepository';

let devCompanyState: DeveloperCompany = {
  ...DEMO_DEV_COMPANY,
  adminEmail: DEMO_DEV_COMPANY.supportEmail,
};
let clientsState: ClientCompany[] = [...DEMO_CLIENTS];
let projectsState: Project[] = [...DEMO_PROJECTS];
let usersState: UserProfile[] = [...Object.values(DEMO_USERS)];
let invitationsState: UserInvitation[] = [];
let reportsState: IncidentReport[] = [...INITIAL_INCIDENT_REPORTS];
let itemsState: IncidentItem[] = [...INITIAL_INCIDENT_ITEMS];
let featureRequestsState: FeatureRequestItem[] = [...INITIAL_FEATURE_REQUESTS];
let quotesState: Quote[] = [...INITIAL_QUOTES];
let aiRepairRunsState: AiRepairRun[] = [...INITIAL_AI_REPAIR_RUNS];

const dailyQuotaLock: Record<string, string> = {};
const idempotencyStore: Record<string, { report: IncidentReport; items: IncidentItem[] }> = {};

export const demoRepository = {
  async getDeveloperCompany(_id?: string): Promise<DeveloperCompany | null> {
    return devCompanyState;
  },

  async upsertDeveloperCompany(
    payload: Partial<DeveloperCompany> & { id: string; performedByUid: string }
  ): Promise<DeveloperCompany> {
    devCompanyState = {
      ...devCompanyState,
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    return devCompanyState;
  },

  async getClients(developerCompanyId?: string): Promise<ClientCompany[]> {
    if (developerCompanyId) {
      return clientsState.filter((c) => c.developerCompanyId === developerCompanyId);
    }
    return [...clientsState];
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
    const newClient: ClientCompany = {
      id: `client-${Date.now().toString(36)}`,
      developerCompanyId: payload.developerCompanyId || 'dev-pachax-core',
      name: payload.name.trim(),
      taxId: payload.taxId,
      contactEmail: payload.contactEmail.trim(),
      contactPhone: payload.contactPhone,
      address: payload.address,
      billingTier: payload.billingTier,
      status: 'active',
      allowedDomains: payload.allowedDomains || [payload.contactEmail.split('@')[1] || 'empresa.bo'],
      maxDailyGeneralReports: payload.maxDailyGeneralReports || 1,
      slaConfig: payload.slaConfig,
      createdAt: new Date().toISOString(),
    };
    clientsState = [newClient, ...clientsState];
    return newClient;
  },

  async updateClient(
    clientId: string,
    updates: Partial<Omit<ClientCompany, 'id' | 'developerCompanyId' | 'createdAt'>>
  ): Promise<void> {
    clientsState = clientsState.map((c) => (c.id === clientId ? { ...c, ...updates } : c));
  },

  async getProjects(clientCompanyId?: string, developerCompanyId?: string): Promise<Project[]> {
    let list = [...projectsState];
    if (clientCompanyId) list = list.filter((p) => p.clientCompanyId === clientCompanyId);
    if (developerCompanyId) list = list.filter((p) => p.developerCompanyId === developerCompanyId);
    return list;
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
    const newProj: Project = {
      id: `proj-${Date.now().toString(36)}`,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId || 'dev-pachax-core',
      name: payload.name.trim(),
      code: payload.code.trim().toUpperCase(),
      description: payload.description,
      repositoryUrl: payload.repositoryUrl,
      activeBranch: payload.activeBranch || 'main',
      environment: payload.environment,
      techStack: payload.techStack,
      status: 'active',
      publicKey: `pk_demo_${Date.now().toString(36)}`,
      appCheckEnabled: payload.appCheckEnabled ?? true,
      createdAt: new Date().toISOString(),
    };
    projectsState = [newProj, ...projectsState];
    return newProj;
  },

  async updateProject(
    projectId: string,
    updates: Partial<Omit<Project, 'id' | 'clientCompanyId' | 'developerCompanyId' | 'createdAt'>>
  ): Promise<void> {
    projectsState = projectsState.map((p) => (p.id === projectId ? { ...p, ...updates } : p));
  },

  async getUsers(filters?: { developerCompanyId?: string; clientCompanyId?: string }): Promise<UserProfile[]> {
    let list = [...usersState];
    if (filters?.clientCompanyId) list = list.filter((u) => u.clientCompanyId === filters.clientCompanyId);
    if (filters?.developerCompanyId) list = list.filter((u) => u.developerCompanyId === filters.developerCompanyId);
    return list;
  },

  async getInvitations(): Promise<UserInvitation[]> {
    return [...invitationsState];
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
    const inv: UserInvitation = {
      id: `inv-${Date.now().toString(36)}`,
      email: payload.email.trim().toLowerCase(),
      role: payload.role,
      developerCompanyId: payload.developerCompanyId,
      clientCompanyId: payload.clientCompanyId,
      invitedBy: payload.invitedByUid,
      token: 'demo-token',
      status: 'pending',
      expiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
      createdAt: new Date().toISOString(),
    };
    invitationsState = [inv, ...invitationsState];
    return { invitation: inv, mode: 'firestore_direct' };
  },

  async updateUserStatus(targetUid: string, newStatus: 'active' | 'suspended'): Promise<void> {
    usersState = usersState.map((u) => (u.uid === targetUid ? { ...u, status: newStatus } : u));
  },

  async hasSubmittedGeneralReportToday(clientCompanyId: string): Promise<{
    alreadySubmitted: boolean;
    lastReport?: IncidentReport;
    operationalDay: string;
    nextAvailableAt: string;
  }> {
    const operationalDay = getOperationalDateString();
    const nextAvailableAt = `${operationalDay}T23:59:59.999-04:00 (Reinicio 00:00 America/La_Paz)`;
    const quotaKey = `${clientCompanyId}_${operationalDay}`;
    if (dailyQuotaLock[quotaKey]) {
      const existing = reportsState.find((r) => r.id === dailyQuotaLock[quotaKey]);
      return { alreadySubmitted: true, lastReport: existing, operationalDay, nextAvailableAt };
    }
    const existing = reportsState.find(
      (r) =>
        r.clientCompanyId === clientCompanyId &&
        r.category === 'general' &&
        getOperationalDateString(new Date(r.createdAt)) === operationalDay
    );
    return { alreadySubmitted: Boolean(existing), lastReport: existing, operationalDay, nextAvailableAt };
  },

  async getIncidentReports(filters?: {
    clientCompanyId?: string;
    developerCompanyId?: string;
    category?: IncidentCategory;
  }): Promise<IncidentReport[]> {
    let results = [...reportsState];
    if (filters?.clientCompanyId) results = results.filter((r) => r.clientCompanyId === filters.clientCompanyId);
    if (filters?.developerCompanyId) results = results.filter((r) => r.developerCompanyId === filters.developerCompanyId);
    if (filters?.category) results = results.filter((r) => r.category === filters.category);
    return results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getIncidentItems(reportId?: string, clientCompanyId?: string, developerCompanyId?: string): Promise<IncidentItem[]> {
    let results = [...itemsState];
    if (reportId) results = results.filter((i) => i.reportId === reportId);
    if (clientCompanyId) results = results.filter((i) => i.clientCompanyId === clientCompanyId);
    if (developerCompanyId) results = results.filter((i) => i.developerCompanyId === developerCompanyId);
    return results;
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
    const scopedKey = payload.idempotencyKey
      ? `${payload.clientCompanyId}:${payload.projectId}:${payload.idempotencyKey}`
      : null;
    if (scopedKey && idempotencyStore[scopedKey]) {
      return idempotencyStore[scopedKey];
    }

    const operationalDay = getOperationalDateString();
    const quotaKey = `${payload.clientCompanyId}_${operationalDay}`;

    if (payload.category === 'general') {
      const check = await this.hasSubmittedGeneralReportToday(payload.clientCompanyId);
      if (check.alreadySubmitted) {
        throw new DailyGeneralLimitExceededError(
          `Cuota diaria alcanzada hoy (${operationalDay}).`,
          check.nextAvailableAt
        );
      }
    }

    const now = new Date().toISOString();
    const reportId = `rep-${Date.now().toString(36)}`;
    if (payload.category === 'general') {
      dailyQuotaLock[quotaKey] = reportId;
    }

    const createdItems: IncidentItem[] = payload.items.map((it, idx) => ({
      id: `item-${reportId}-${idx + 1}`,
      reportId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId,
      projectId: payload.projectId,
      title: it.title,
      description: it.description,
      moduleAffected: it.moduleAffected,
      originalImageUrl: it.originalImageUrl,
      annotatedImageUrl: it.annotatedImageUrl,
      annotations: it.annotations,
      evidenceFiles: it.evidenceFiles || [],
      status: 'received',
      priority: payload.category === 'critical' ? 'urgent' : it.priority,
      aiFixEligible: true,
      aiFixStatus: 'not_started',
      createdAt: now,
      updatedAt: now,
    }));

    const newReport: IncidentReport = {
      id: reportId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId,
      projectId: payload.projectId,
      projectName: payload.projectName,
      reportedBy: payload.reportedBy,
      category: payload.category,
      title: payload.title,
      itemsCount: createdItems.length,
      status: 'received',
      dailySubmissionConsentConfirmed: payload.dailySubmissionConsentConfirmed,
      criticalJustification: payload.criticalJustification,
      createdAt: now,
      updatedAt: now,
    };

    reportsState = [newReport, ...reportsState];
    itemsState = [...createdItems, ...itemsState];

    const res = { report: newReport, items: createdItems };
    if (scopedKey) idempotencyStore[scopedKey] = res;
    return res;
  },

  async updateIncidentItemStatus(itemId: string, newStatus: IncidentStatus): Promise<void> {
    itemsState = itemsState.map((i) =>
      i.id === itemId ? { ...i, status: newStatus, updatedAt: new Date().toISOString() } : i
    );
  },

  async assignIncidentItem(
    itemId: string,
    assignee: { uid: string; displayName: string; email: string } | null
  ): Promise<void> {
    itemsState = itemsState.map((i) =>
      i.id === itemId ? { ...i, assignedTo: assignee || undefined, updatedAt: new Date().toISOString() } : i
    );
  },

  async addIncidentComment(
    itemId: string,
    comment: Omit<IncidentComment, 'id' | 'createdAt'>
  ): Promise<IncidentComment> {
    const newComment: IncidentComment = {
      ...comment,
      id: `msg-${Date.now().toString(36)}`,
      createdAt: new Date().toISOString(),
    };
    itemsState = itemsState.map((i) =>
      i.id === itemId
        ? { ...i, comments: [...(i.comments || []), newComment], updatedAt: new Date().toISOString() }
        : i
    );
    return newComment;
  },

  async getFeatureRequests(clientCompanyId?: string, developerCompanyId?: string): Promise<FeatureRequestItem[]> {
    let list = [...featureRequestsState];
    if (clientCompanyId) list = list.filter((f) => f.clientCompanyId === clientCompanyId);
    if (developerCompanyId) list = list.filter((f) => f.developerCompanyId === developerCompanyId);
    return list;
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
    const now = new Date().toISOString();
    const newFeat: FeatureRequestItem = {
      id: `feat-${Date.now().toString(36)}`,
      ...payload,
      evidenceFiles: payload.evidenceFiles || [],
      status: 'submitted',
      createdAt: now,
      updatedAt: now,
    };
    featureRequestsState = [newFeat, ...featureRequestsState];
    return newFeat;
  },

  async updateFeatureRequestStatus(requestId: string, status: FeatureRequestStatus, quoteId?: string): Promise<void> {
    featureRequestsState = featureRequestsState.map((f) =>
      f.id === requestId ? { ...f, status, quoteId: quoteId || f.quoteId, updatedAt: new Date().toISOString() } : f
    );
  },

  async getQuotes(clientCompanyId?: string, developerCompanyId?: string): Promise<Quote[]> {
    let list = [...quotesState];
    if (clientCompanyId) list = list.filter((q) => q.clientCompanyId === clientCompanyId);
    if (developerCompanyId) list = list.filter((q) => q.developerCompanyId === developerCompanyId);
    return list;
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
    const now = new Date().toISOString();
    const subtotal = payload.items.reduce((s, i) => s + i.total, 0);
    const newQuote: Quote = {
      id: `QT-DEMO-${Date.now().toString(36).toUpperCase()}`,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId,
      projectId: payload.projectId,
      featureRequestId: payload.featureRequestId,
      title: payload.title,
      description: payload.description,
      items: payload.items,
      subtotal,
      currency: payload.currency,
      estimatedDeliveryDays: payload.estimatedDeliveryDays,
      validUntil: payload.validUntil || new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      status: payload.status || 'sent',
      createdAt: now,
      updatedAt: now,
    };
    quotesState = [newQuote, ...quotesState];
    return newQuote;
  },

  async approveQuote(quoteId: string, approver: { uid: string; displayName: string; email: string }): Promise<void> {
    const now = new Date().toISOString();
    quotesState = quotesState.map((q) =>
      q.id === quoteId ? { ...q, status: 'approved', approvedBy: approver, approvedAt: now, updatedAt: now } : q
    );
  },

  async rejectQuote(quoteId: string, rejecter: { uid: string; displayName: string }, reason: string): Promise<void> {
    const now = new Date().toISOString();
    quotesState = quotesState.map((q) =>
      q.id === quoteId
        ? { ...q, status: 'rejected', rejectedBy: rejecter, rejectedAt: now, rejectionReason: reason, updatedAt: now }
        : q
    );
  },

  async getAiRepairRuns(): Promise<AiRepairRun[]> {
    return [...aiRepairRunsState];
  },

  async triggerAiRepair(payload: {
    incidentItemId: string;
    projectId: string;
    mode: AiRepairMode;
    agentEngine: 'codex-sdk' | 'claude-agent-sdk' | 'hybrid';
    triggeredBy: { uid: string; displayName: string };
  }): Promise<AiRepairRun> {
    const now = new Date().toISOString();
    const newRun: AiRepairRun = {
      id: `ai-run-demo-${Date.now().toString(36)}`,
      incidentItemId: payload.incidentItemId,
      projectId: payload.projectId,
      developerCompanyId: 'dev-pachax-core',
      mode: payload.mode,
      agentEngine: payload.agentEngine,
      stage: 'queued',
      branchName: `fix/ai-${payload.incidentItemId}`,
      filesModified: [],
      retryAttempts: 0,
      maxRetries: 3,
      triggeredBy: payload.triggeredBy,
      logs: [],
      createdAt: now,
    };
    aiRepairRunsState = [newRun, ...aiRepairRunsState];
    return newRun;
  },
};
