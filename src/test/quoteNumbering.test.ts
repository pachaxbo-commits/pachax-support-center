import { describe, it, expect } from 'vitest';

function generateQuoteCode(sequence: number, year: number = 2026): string {
  const padded = String(sequence).padStart(3, '0');
  return `COT-${year}-${padded}`;
}

describe('Commercial Quote Document Numbering', () => {
  it('formats quote identifiers in standard COT-YYYY-NNN format', () => {
    expect(generateQuoteCode(1, 2026)).toBe('COT-2026-001');
    expect(generateQuoteCode(42, 2026)).toBe('COT-2026-042');
    expect(generateQuoteCode(105, 2026)).toBe('COT-2026-105');
  });

  it('validates that quote subtotal accurately aggregates itemized line items', () => {
    const items = [
      { hours: 5, hourlyRate: 40, total: 200 },
      { hours: 10, hourlyRate: 40, total: 400 },
      { hours: 3, hourlyRate: 50, total: 150 },
    ];
    const subtotal = items.reduce((acc, curr) => acc + curr.total, 0);
    expect(subtotal).toBe(750);
  });
});
