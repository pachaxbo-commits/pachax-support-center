import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Client Portal Terminology Cleanliness', () => {
  const clientPagesDir = path.resolve(__dirname, '../pages/client');
  const forbiddenTechnicalJargon = [
    'tenantId',
    'RBAC',
    'SDK',
    'bootstrapSuperadmin',
  ];

  it('verifies client portal pages do not expose internal developer acronyms', () => {
    const files = fs.readdirSync(clientPagesDir);
    const filesChecked: string[] = [];

    for (const file of files) {
      if (!file.endsWith('.tsx')) continue;
      filesChecked.push(file);
      const content = fs.readFileSync(path.join(clientPagesDir, file), 'utf-8');

      for (const jargon of forbiddenTechnicalJargon) {
        expect(content).not.toContain(jargon);
      }
    }

    expect(filesChecked.length).toBeGreaterThanOrEqual(5);
  });
});
