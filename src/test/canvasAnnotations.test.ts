import { describe, it, expect } from 'vitest';
import { AnnotationItem } from '@/models/incident';

describe('Image Annotation Data Integrity', () => {
  it('correctly creates and validates an arrow annotation item', () => {
    const arrowItem: AnnotationItem = {
      id: 'ann-1',
      type: 'arrow',
      startX: 100,
      startY: 100,
      endX: 250,
      endY: 300,
      color: '#ef4444',
      strokeWidth: 4,
    };

    expect(arrowItem.type).toBe('arrow');
    expect(arrowItem.endX).toBe(250);
    expect(arrowItem.strokeWidth).toBe(4);
  });

  it('correctly creates freehand pen points array', () => {
    const penItem: AnnotationItem = {
      id: 'ann-2',
      type: 'pen',
      color: '#10b981',
      strokeWidth: 3,
      points: [
        { x: 10, y: 10 },
        { x: 12, y: 15 },
        { x: 20, y: 25 },
      ],
    };

    expect(penItem.points?.length).toBe(3);
    expect(penItem.points?.[2].x).toBe(20);
  });
});
