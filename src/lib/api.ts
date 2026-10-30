import {
  IncidentReport,
  IncidentItem,
  IncidentStatus,
  IncidentCategory,
} from '@/models/incident';
import { FeatureRequestItem, FeatureRequestStatus } from '@/models/featureRequest';
import { Quote } from '@/models/quote';
import { AiRepairRun, AiRepairMode } from '@/models/aiRepair';
import { ClientCompany } from '@/models/company';
import { Project } from '@/models/project';
import {
  INITIAL_INCIDENT_REPORTS,
  INITIAL_INCIDENT_ITEMS,
  INITIAL_FEATURE_REQUESTS,
  INITIAL_QUOTES,
  INITIAL_AI_REPAIR_RUNS,
  DEMO_CLIENTS,
  DEMO_PROJECTS,
} from './demoData';
import { isFirebaseConfigured, db } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';

// In-Memory state for interactive sessions
let incidentReportsState: IncidentReport[] = [...INITIAL_INCIDENT_REPORTS];
let incidentItemsState: IncidentItem[] = [...INITIAL_INCIDENT_ITEMS];
let featureRequestsState: FeatureRequestItem[] = [...INITIAL_FEATURE_REQUESTS];
let quotesState: Quote[] = [...INITIAL_QUOTES];
let aiRepairRunsState: AiRepairRun[] = [...INITIAL_AI_REPAIR_RUNS];
let clientsState: ClientCompany[] = [...DEMO_CLIENTS];
let projectsState: Project[] = [...DEMO_PROJECTS];

export const api = {
  // --- CLIENTS & PROJECTS ---
  async getClients(): Promise<ClientCompany[]> {
    return clientsState;
  },

  async getProjects(clientId?: string): Promise<Project[]> {
    if (clientId) {
      return projectsState.filter((p) => p.clientCompanyId === clientId);
    }
    return projectsState;
  },

  // --- INCIDENTS ---
  async getIncidentReports(filters?: { clientCompanyId?: string; category?: IncidentCategory }): Promise<IncidentReport[]> {
    let result = [...incidentReportsState];
    if (filters?.clientCompanyId) {
      result = result.filter((r) => r.clientCompanyId === filters.clientCompanyId);
    }
    if (filters?.category) {
      result = result.filter((r) => r.category === filters.category);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getIncidentReportById(id: string): Promise<IncidentReport | null> {
    const found = incidentReportsState.find((r) => r.id === id);
    return found || null;
  },

  async getIncidentItems(reportId?: string, clientCompanyId?: string): Promise<IncidentItem[]> {
    let result = [...incidentItemsState];
    if (reportId) {
      result = result.filter((item) => item.reportId === reportId);
    }
    if (clientCompanyId) {
      result = result.filter((item) => item.clientCompanyId === clientCompanyId);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async getIncidentItemById(id: string): Promise<IncidentItem | null> {
    return incidentItemsState.find((item) => item.id === id) || null;
  },

  async createIncidentReport(payload: {
    clientCompanyId: string;
    developerCompanyId: string;
    projectId: string;
    projectName?: string;
    reportedBy: { uid: string; displayName: string; email: string };
    category: IncidentCategory;
    title: string;
    criticalJustification?: string;
    dailyConsent?: boolean;
    items: {
      title: string;
      description: string;
      moduleAffected: string;
      priority: 'low' | 'medium' | 'high' | 'urgent';
      originalImageUrl?: string;
      annotatedImageUrl?: string;
      annotations?: any[];
      evidenceFiles?: any[];
    }[];
  }): Promise<IncidentReport> {
    const reportId = `rep-${payload.category}-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const newReport: IncidentReport = {
      id: reportId,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId,
      projectId: payload.projectId,
      projectName: payload.projectName || 'Proyecto PACHAX',
      reportedBy: payload.reportedBy,
      category: payload.category,
      title: payload.title,
      itemsCount: payload.items.length,
      status: 'received',
      dailySubmissionConsentConfirmed: payload.dailyConsent,
      criticalJustification: payload.criticalJustification,
      createdAt: now,
      updatedAt: now,
    };

    const newItems: IncidentItem[] = payload.items.map((it, idx) => ({
      id: `item-${reportId}-${idx + 1}`,
      reportId: reportId,
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

    incidentReportsState = [newReport, ...incidentReportsState];
    incidentItemsState = [...newItems, ...incidentItemsState];

    // Persist to Firestore if live connection
    if (isFirebaseConfigured() && db) {
      try {
        await addDoc(collection(db, 'incidentReports'), {
          ...newReport,
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[API] Could not sync report to live Firestore:', e);
      }
    }

    return newReport;
  },

  async updateIncidentItemStatus(itemId: string, status: IncidentStatus): Promise<void> {
    incidentItemsState = incidentItemsState.map((it) =>
      it.id === itemId ? { ...it, status, updatedAt: new Date().toISOString() } : it
    );
  },

  // --- FEATURE REQUESTS ---
  async getFeatureRequests(clientCompanyId?: string): Promise<FeatureRequestItem[]> {
    let result = [...featureRequestsState];
    if (clientCompanyId) {
      result = result.filter((r) => r.clientCompanyId === clientCompanyId);
    }
    return result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async createFeatureRequest(payload: {
    clientCompanyId: string;
    developerCompanyId: string;
    projectId: string;
    projectName?: string;
    title: string;
    description: string;
    businessJustification: string;
    isConsideredFreeByClient: boolean;
    freeRationale?: string;
    changeScope: 'client_specific' | 'template' | 'core';
    annotatedImageUrl?: string;
    reportedBy: { uid: string; displayName: string; email: string };
  }): Promise<FeatureRequestItem> {
    const id = `feat-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const newItem: FeatureRequestItem = {
      id,
      clientCompanyId: payload.clientCompanyId,
      developerCompanyId: payload.developerCompanyId,
      projectId: payload.projectId,
      projectName: payload.projectName,
      title: payload.title,
      description: payload.description,
      businessJustification: payload.businessJustification,
      isConsideredFreeByClient: payload.isConsideredFreeByClient,
      freeRationale: payload.freeRationale,
      changeScope: payload.changeScope,
      annotatedImageUrl: payload.annotatedImageUrl,
      evidenceFiles: [],
      status: 'submitted',
      reportedBy: payload.reportedBy,
      createdAt: now,
      updatedAt: now,
    };

    featureRequestsState = [newItem, ...featureRequestsState];
    return newItem;
  },

  // --- QUOTES ---
  async getQuotes(clientCompanyId?: string): Promise<Quote[]> {
    let result = [...quotesState];
    if (clientCompanyId) {
      result = result.filter((q) => q.clientCompanyId === clientCompanyId);
    }
    return result;
  },

  async approveQuote(quoteId: string, approver: { uid: string; displayName: string; email: string }): Promise<void> {
    quotesState = quotesState.map((q) =>
      q.id === quoteId
        ? {
            ...q,
            status: 'approved',
            approvedBy: approver,
            approvedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : q
    );
  },

  async rejectQuote(quoteId: string, reason: string, user: { uid: string; displayName: string }): Promise<void> {
    quotesState = quotesState.map((q) =>
      q.id === quoteId
        ? {
            ...q,
            status: 'rejected',
            rejectedBy: user,
            rejectionReason: reason,
            rejectedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        : q
    );
  },

  // --- AI REPAIRS ---
  async getAiRepairRuns(): Promise<AiRepairRun[]> {
    return [...aiRepairRunsState].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async triggerAiRepair(
    incidentItemId: string,
    mode: AiRepairMode,
    triggeredBy: { uid: string; displayName: string }
  ): Promise<AiRepairRun> {
    const item = incidentItemsState.find((it) => it.id === incidentItemId);
    const id = `run-ai-${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const newRun: AiRepairRun = {
      id,
      incidentItemId,
      projectId: item?.projectId || 'proj-sanjose-pos',
      developerCompanyId: item?.developerCompanyId || 'dev-pachax-core',
      mode,
      agentEngine: 'claude-agent-sdk',
      stage: 'inspecting_repository',
      branchName: `fix/ai-patch-${incidentItemId.slice(0, 8)}`,
      filesModified: ['src/services/billingHandler.ts'],
      retryAttempts: 0,
      maxRetries: 3,
      triggeredBy,
      logs: [
        {
          id: `log-${Date.now()}-1`,
          stage: 'queued',
          message: `Iniciando orquestación en modo "${mode}".`,
          timestamp: now,
          severity: 'info',
        },
        {
          id: `log-${Date.now()}-2`,
          stage: 'inspecting_repository',
          message: 'Verificando repositorio GitHub autorizado y creando rama de trabajo aislada.',
          timestamp: now,
          severity: 'info',
        },
      ],
      createdAt: now,
    };

    aiRepairRunsState = [newRun, ...aiRepairRunsState];

    // Mark incident item as analyzing
    incidentItemsState = incidentItemsState.map((it) =>
      it.id === incidentItemId
        ? { ...it, aiFixStatus: 'analyzing', aiRepairRunId: id, updatedAt: now }
        : it
    );

    return newRun;
  },
};
