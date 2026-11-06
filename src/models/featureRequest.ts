import { AnnotationItem, EvidenceFile } from './incident';

export type FeatureRequestStatus =
  | 'submitted'     // Solicitud enviada
  | 'evaluating'    // En evaluación técnica y comercial
  | 'quoted'        // Cotización enviada al cliente
  | 'approved'      // Aprobada por el cliente
  | 'rejected'      // Rechazada por el cliente o inviable
  | 'in_development'// En desarrollo
  | 'deployed'      // Desplegada en producción
  | 'completed';    // Concluida y aprobada

export type ChangeScope = 'client_specific' | 'template' | 'core';

export interface FeatureRequestItem {
  id: string;
  clientCompanyId: string;
  developerCompanyId: string;
  projectId: string;
  projectName?: string;
  title: string;
  description: string;
  businessJustification: string;
  isConsideredFreeByClient: boolean;
  freeRationale?: string;
  changeScope: ChangeScope;
  annotatedImageUrl?: string;
  annotations?: AnnotationItem[];
  evidenceFiles: EvidenceFile[];
  status: FeatureRequestStatus;
  quoteId?: string;
  estimatedHours?: number;
  reportedBy: {
    uid: string;
    displayName: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
}
