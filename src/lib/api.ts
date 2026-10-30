import {
  IncidentReport,
  IncidentItem,
  IncidentStatus,
  IncidentCategory,
} from '@/models/incident';
import { FeatureRequestItem } from '@/models/featureRequest';
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
import { isFirebaseConfigured, db, functions } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { storageService, StorageUnavailableError } from '@/services/storageService';

// In-Memory state for instant interactive reactivity & preview sessions
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
    if (isFirebaseConfigured() && db) {
      try {
        const snap = await getDocs(collection(db, 'clientCompanies'));
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as ClientCompany);
          clientsState = list;
          return list;
        }
      } catch (e) {
        console.warn('[Firestore] Error leyendo clientCompanies, usando datos base:', e);
      }
    }
    return clientsState;
  },

  async getProjects(clientId?: string): Promise<Project[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const q = clientId
          ? query(collection(db, 'projects'), where('clientCompanyId', '==', clientId))
          : collection(db, 'projects');
        const snap = await getDocs(q);
        if (!snap.empty) {
          const list = snap.docs.map((d) => d.data() as Project);
          projectsState = list;
          return list;
        }
      } catch (e) {
        console.warn('[Firestore] Error leyendo projects:', e);
      }
    }
    if (clientId) {
      return projectsState.filter((p) => p.clientCompanyId === clientId);
    }
    return projectsState;
  },

  // --- INCIDENTS ---
  async getIncidentReports(filters?: { clientCompanyId?: string; category?: IncidentCategory }): Promise<IncidentReport[]> {
    if (isFirebaseConfigured() && db) {
      try {
        let q = collection(db, 'incidentReports');
        if (filters?.clientCompanyId && filters?.category) {
          const complexQ = query(
            q,
            where('clientCompanyId', '==', filters.clientCompanyId),
            where('category', '==', filters.category)
          );
          const snap = await getDocs(complexQ);
          if (!snap.empty) {
            return snap.docs.map((d) => d.data() as IncidentReport);
          }
        } else if (filters?.clientCompanyId) {
          const clientQ = query(q, where('clientCompanyId', '==', filters.clientCompanyId));
          const snap = await getDocs(clientQ);
          if (!snap.empty) {
            return snap.docs.map((d) => d.data() as IncidentReport);
          }
        }
      } catch (e) {
        console.warn('[Firestore] Fallback para incidentReports:', e);
      }
    }

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
    if (isFirebaseConfigured() && db) {
      try {
        const docSnap = await getDoc(doc(db, 'incidentReports', id));
        if (docSnap.exists()) {
          return docSnap.data() as IncidentReport;
        }
      } catch (e) {
        // Fallback
      }
    }
    const found = incidentReportsState.find((r) => r.id === id);
    return found || null;
  },

  async getIncidentItems(reportId?: string, clientCompanyId?: string): Promise<IncidentItem[]> {
    if (isFirebaseConfigured() && db) {
      try {
        let q = collection(db, 'incidentItems');
        if (reportId) {
          const snap = await getDocs(query(q, where('reportId', '==', reportId)));
          if (!snap.empty) {
            return snap.docs.map((d) => d.data() as IncidentItem);
          }
        } else if (clientCompanyId) {
          const snap = await getDocs(query(q, where('clientCompanyId', '==', clientCompanyId)));
          if (!snap.empty) {
            return snap.docs.map((d) => d.data() as IncidentItem);
          }
        }
      } catch (e) {
        console.warn('[Firestore] Fallback para incidentItems:', e);
      }
    }

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
    if (isFirebaseConfigured() && db) {
      try {
        const docSnap = await getDoc(doc(db, 'incidentItems', id));
        if (docSnap.exists()) {
          return docSnap.data() as IncidentItem;
        }
      } catch {
        // Fallback
      }
    }
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
    idempotencyKey?: string;
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

    // 1. Process images and upload to Cloud Storage (strictly no silent fallback)
    const processedItems: IncidentItem[] = [];
    for (let idx = 0; idx < payload.items.length; idx++) {
      const it = payload.items[idx];
      const itemId = `item-${reportId}-${idx + 1}`;

      let finalOriginalUrl = it.originalImageUrl;
      let finalAnnotatedUrl = it.annotatedImageUrl;

      const hasLocalOriginal = it.originalImageUrl && it.originalImageUrl.startsWith('data:');
      const hasLocalAnnotated = it.annotatedImageUrl && it.annotatedImageUrl.startsWith('data:');

      if (hasLocalOriginal || hasLocalAnnotated) {
        try {
          const evidenceResult = await storageService.uploadIncidentEvidencePair({
            developerCompanyId: payload.developerCompanyId,
            clientCompanyId: payload.clientCompanyId,
            projectId: payload.projectId,
            reportId,
            itemId,
            originalDataUrl: it.originalImageUrl,
            annotatedDataUrl: it.annotatedImageUrl,
          });

          if (evidenceResult.originalUrl) {
            finalOriginalUrl = evidenceResult.originalUrl;
          }
          if (evidenceResult.annotatedUrl) {
            finalAnnotatedUrl = evidenceResult.annotatedUrl;
          }
        } catch (uploadErr: any) {
          console.error('[API] Error al almacenar evidencias:', uploadErr);
          throw new Error(
            `Fallo al subir evidencia a Cloud Storage: ${uploadErr.message || 'Error de red'}. El reporte no fue enviado para evitar pérdida de evidencias.`
          );
        }
      }

      const newItem: IncidentItem = {
        id: itemId,
        reportId: reportId,
        clientCompanyId: payload.clientCompanyId,
        developerCompanyId: payload.developerCompanyId,
        projectId: payload.projectId,
        title: it.title,
        description: it.description,
        moduleAffected: it.moduleAffected,
        originalImageUrl: finalOriginalUrl,
        annotatedImageUrl: finalAnnotatedUrl,
        annotations: it.annotations,
        evidenceFiles: it.evidenceFiles || [],
        status: 'received',
        priority: payload.category === 'critical' ? 'urgent' : it.priority,
        aiFixEligible: true,
        aiFixStatus: 'not_started',
        createdAt: now,
        updatedAt: now,
      };

      processedItems.push(newItem);
    }

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

    // Update in-memory state for UI responsiveness
    incidentReportsState = [newReport, ...incidentReportsState];
    incidentItemsState = [...processedItems, ...incidentItemsState];

    // Persist to live Firebase backend
    if (isFirebaseConfigured()) {
      if (payload.category === 'general' && functions) {
        // Enforce transactional quota check via Cloud Function
        try {
          const submitFn = httpsCallable<any, any>(functions, 'submitGeneralIncidentBatch');
          const fnRes = await submitFn({
            clientCompanyId: payload.clientCompanyId,
            developerCompanyId: payload.developerCompanyId,
            projectId: payload.projectId,
            title: payload.title,
            dailyConsent: payload.dailyConsent,
            items: processedItems,
            idempotencyKey: payload.idempotencyKey || `idem-${reportId}`,
          });
          if (fnRes.data?.reportId) {
            newReport.id = fnRes.data.reportId;
          }
        } catch (fnErr: any) {
          console.warn('[Cloud Functions] Fallback a Firestore directo o error de cuota:', fnErr);
          if (fnErr.code === 'functions/resource-exhausted') {
            throw new Error(fnErr.message || 'Cuota diaria de envío general alcanzada.');
          }
          // Direct fallback only if emulator or development without functions deploy
          if (db) {
            await setDoc(doc(db, 'incidentReports', reportId), {
              ...newReport,
              serverTimestamp: serverTimestamp(),
            });
            for (const item of processedItems) {
              await setDoc(doc(db, 'incidentItems', item.id), {
                ...item,
                serverTimestamp: serverTimestamp(),
              });
            }
          }
        }
      } else if (db) {
        // Critical incident or direct firestore persistence
        try {
          await setDoc(doc(db, 'incidentReports', reportId), {
            ...newReport,
            serverTimestamp: serverTimestamp(),
          });
          for (const item of processedItems) {
            await setDoc(doc(db, 'incidentItems', item.id), {
              ...item,
              serverTimestamp: serverTimestamp(),
            });
          }
        } catch (e) {
          console.warn('[Firestore] Error al persistir reporte en Firestore:', e);
        }
      }
    }

    return newReport;
  },

  async updateIncidentItemStatus(itemId: string, status: IncidentStatus): Promise<void> {
    incidentItemsState = incidentItemsState.map((it) =>
      it.id === itemId ? { ...it, status, updatedAt: new Date().toISOString() } : it
    );

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'incidentItems', itemId), {
          status,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] Error al actualizar estado de item:', e);
      }
    }
  },

  // --- FEATURE REQUESTS ---
  async getFeatureRequests(clientCompanyId?: string): Promise<FeatureRequestItem[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const q = clientCompanyId
          ? query(collection(db, 'featureRequests'), where('clientCompanyId', '==', clientCompanyId))
          : collection(db, 'featureRequests');
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as FeatureRequestItem);
        }
      } catch (e) {
        console.warn('[Firestore] Fallback para featureRequests:', e);
      }
    }

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

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'featureRequests', id), {
          ...newItem,
          serverTimestamp: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] Error al persistir solicitud en Firestore:', e);
      }
    }

    return newItem;
  },

  // --- QUOTES ---
  async getQuotes(clientCompanyId?: string): Promise<Quote[]> {
    if (isFirebaseConfigured() && db) {
      try {
        const q = clientCompanyId
          ? query(collection(db, 'quotes'), where('clientCompanyId', '==', clientCompanyId))
          : collection(db, 'quotes');
        const snap = await getDocs(q);
        if (!snap.empty) {
          return snap.docs.map((d) => d.data() as Quote);
        }
      } catch (e) {
        console.warn('[Firestore] Fallback para quotes:', e);
      }
    }

    let result = [...quotesState];
    if (clientCompanyId) {
      result = result.filter((q) => q.clientCompanyId === clientCompanyId);
    }
    return result;
  },

  async approveQuote(quoteId: string, approver: { uid: string; displayName: string; email: string }): Promise<void> {
    const now = new Date().toISOString();
    quotesState = quotesState.map((q) =>
      q.id === quoteId
        ? {
            ...q,
            status: 'approved',
            approvedBy: approver,
            approvedAt: now,
            updatedAt: now,
          }
        : q
    );

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'quotes', quoteId), {
          status: 'approved',
          approvedBy: approver,
          approvedAt: now,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] Error actualizando cotización aprobada:', e);
      }
    }
  },

  async rejectQuote(quoteId: string, reason: string, user: { uid: string; displayName: string }): Promise<void> {
    const now = new Date().toISOString();
    quotesState = quotesState.map((q) =>
      q.id === quoteId
        ? {
            ...q,
            status: 'rejected',
            rejectedBy: user,
            rejectionReason: reason,
            rejectedAt: now,
            updatedAt: now,
          }
        : q
    );

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'quotes', quoteId), {
          status: 'rejected',
          rejectedBy: user,
          rejectionReason: reason,
          rejectedAt: now,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn('[Firestore] Error actualizando cotización rechazada:', e);
      }
    }
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
