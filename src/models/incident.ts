export type IncidentCategory = 'general' | 'critical';

export type IncidentStatus =
  | 'received'      // Recibido por el sistema
  | 'triaged'       // Clasificado y priorizado
  | 'in_progress'   // En desarrollo / corrección
  | 'review'        // En pruebas / validación técnica
  | 'fixed'         // Corregido
  | 'verified'      // Verificado por el cliente
  | 'closed';       // Cerrado satisfactoriamente

export interface AnnotationItem {
  id: string;
  type: 'pen' | 'arrow' | 'rect' | 'circle' | 'highlighter' | 'text';
  points?: { x: number; y: number }[]; // For pen & highlighter
  startX?: number;
  startY?: number;
  endX?: number;
  endY?: number;
  color: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
}

export interface EvidenceFile {
  id: string;
  name: string;
  url: string;
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
}

export interface IncidentItem {
  id: string;
  reportId: string;
  clientCompanyId: string;
  developerCompanyId: string;
  projectId: string;
  title: string;
  description: string;
  moduleAffected: string;
  originalImageUrl?: string;
  annotatedImageUrl?: string;
  annotations?: AnnotationItem[];
  evidenceFiles: EvidenceFile[];
  status: IncidentStatus;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo?: {
    uid: string;
    displayName: string;
    email: string;
  };
  aiFixEligible: boolean;
  aiFixStatus?: 'not_started' | 'analyzing' | 'patch_ready' | 'tested' | 'applied' | 'failed';
  aiRepairRunId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentReport {
  id: string;
  clientCompanyId: string;
  developerCompanyId: string;
  projectId: string;
  projectName?: string;
  reportedBy: {
    uid: string;
    displayName: string;
    email: string;
  };
  category: IncidentCategory;
  title: string;
  itemsCount: number;
  status: IncidentStatus;
  dailySubmissionConsentConfirmed?: boolean;
  criticalJustification?: string;
  createdAt: string;
  updatedAt: string;
}
