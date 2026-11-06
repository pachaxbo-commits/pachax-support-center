export type AiRepairMode =
  | 'manual'                // Propietario aprueba cada paso y diff antes de proceder
  | 'delegated'             // IA diagnostica, prueba y abre PR para revisión humana
  | 'autonomous_authorized';// IA diagnostica, prueba, mergea y despliega si los tests pasan

export type AiRepairStage =
  | 'queued'
  | 'inspecting_repository'
  | 'diagnosing_root_cause'
  | 'generating_patch'
  | 'running_test_suite'
  | 'retrying_corrections'
  | 'creating_pull_request'
  | 'canary_deploying'
  | 'completed'
  | 'failed';

export interface AiRepairLogEntry {
  id: string;
  stage: AiRepairStage;
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'error' | 'success';
  diffPreview?: string;
  testOutput?: string;
}

export interface AiRepairRun {
  id: string;
  incidentItemId: string;
  projectId: string;
  developerCompanyId: string;
  mode: AiRepairMode;
  agentEngine: 'codex-sdk' | 'claude-agent-sdk' | 'hybrid';
  stage: AiRepairStage;
  branchName: string;
  pullRequestUrl?: string;
  pullRequestNumber?: number;
  filesModified: string[];
  testPassRate?: number;
  retryAttempts: number;
  maxRetries: number;
  triggeredBy: {
    uid: string;
    displayName: string;
  };
  logs: AiRepairLogEntry[];
  errorDetails?: string;
  createdAt: string;
  completedAt?: string;
}
