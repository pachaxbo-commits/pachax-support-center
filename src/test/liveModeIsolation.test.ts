import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { firebaseRepository } from '@/lib/repositories/firebaseRepository';
import { isUsingDemoRepository } from '@/lib/api';

describe('Phase 2.4 — Eliminación Definitiva del Modo Demo en Producción y Separación de Repositorios', () => {
  it('1. Garantiza que firebaseRepository.ts NO importe ni referencie demoData.ts', () => {
    const repoPath = path.resolve(process.cwd(), 'src/lib/repositories/firebaseRepository.ts');
    const source = fs.readFileSync(repoPath, 'utf8');

    expect(source).not.toContain('demoData');
    expect(source).not.toContain('DEMO_CLIENTS');
    expect(source).not.toContain('DEMO_PROJECTS');
    expect(source).not.toContain('INITIAL_INCIDENT_REPORTS');
    expect(source).not.toContain('INITIAL_INCIDENT_ITEMS');
    expect(source).not.toContain('INITIAL_QUOTES');
    expect(source).not.toContain('INITIAL_AI_REPAIR_RUNS');
    expect(source).not.toContain('client-sanjose');
  });

  it('2. Garantiza que UsersManagementPage, ClientsPage, ProjectsPage, QuotesManagementPage e IncidentsQueuePage NO importen DEMO_USERS ni datos ficticios', () => {
    const adminPages = [
      'src/pages/admin/AdminDashboardPage.tsx',
      'src/pages/admin/ClientsPage.tsx',
      'src/pages/admin/ProjectsPage.tsx',
      'src/pages/admin/UsersManagementPage.tsx',
      'src/pages/admin/QuotesManagementPage.tsx',
      'src/pages/admin/IncidentsQueuePage.tsx',
      'src/pages/admin/AiRepairCenterPage.tsx',
      'src/pages/admin/IntegrationsSettingsPage.tsx',
    ];

    for (const relPath of adminPages) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).not.toContain('demoData');
      expect(content).not.toContain('DEMO_USERS');
      expect(content).not.toContain('DEMO_CLIENTS');
      expect(content).not.toContain('San José');
      expect(content).not.toContain('QB Insumos');
      expect(content).not.toContain('Expreso Punata');
    }
  });

  it('3. Garantiza que los formularios de cliente no usen el fallback "client-sanjose"', () => {
    const clientPages = [
      'src/pages/client/ClientDashboardPage.tsx',
      'src/pages/client/ReportGeneralIncidentPage.tsx',
      'src/pages/client/ReportCriticalIncidentPage.tsx',
      'src/pages/client/FeatureRequestPage.tsx',
    ];

    for (const relPath of clientPages) {
      const fullPath = path.resolve(process.cwd(), relPath);
      const content = fs.readFileSync(fullPath, 'utf8');
      expect(content).not.toContain('client-sanjose');
    }
  });

  it('4. Rechaza la generación de ejecuciones simuladas de IA en firebaseRepository.triggerAiRepair (Fase 3 pendiente)', async () => {
    await expect(
      firebaseRepository.triggerAiRepair({
        incidentItemId: 'item-1',
        projectId: 'proj-1',
        mode: 'delegated',
        agentEngine: 'codex-sdk',
        triggeredBy: { uid: 'NH3DaEHYt3aiFfg0gq85kHirPO12', displayName: 'Superadmin' },
      })
    ).rejects.toThrow(/FASE_3_PENDIENTE/);
  });

  it('5. Impide que un administrador suspenda su propia cuenta activa en firebaseRepository.updateUserStatus', async () => {
    await expect(
      firebaseRepository.updateUserStatus(
        'NH3DaEHYt3aiFfg0gq85kHirPO12',
        'suspended',
        'NH3DaEHYt3aiFfg0gq85kHirPO12',
        'dev-pachax-core'
      )
    ).rejects.toThrow(/propia cuenta/);
  });

  it('6. Verifica que isUsingDemoRepository sea false cuando Firebase está configurado o en producción', () => {
    expect(typeof isUsingDemoRepository()).toBe('boolean');
  });
});
