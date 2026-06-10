import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/firebase', () => ({ db: {}, functions: {} }));

import { hasOverlap } from '../src/lib/db';

const minutesFrom = (base, mins) => new Date(base.getTime() + mins * 60000);

describe('hasOverlap', () => {
  it('blocks partial overlap at start', () => {
    const start = new Date('2024-01-01T10:00:00Z');
    const end = minutesFrom(start, 120);
    const existingStart = new Date('2024-01-01T11:00:00Z');
    const existingEnd = minutesFrom(existingStart, 90);
    expect(hasOverlap(start, end, existingStart, existingEnd)).toBe(true);
  });

  it('blocks partial overlap at end', () => {
    const start = new Date('2024-01-01T10:00:00Z');
    const end = minutesFrom(start, 120);
    const existingStart = new Date('2024-01-01T09:30:00Z');
    const existingEnd = minutesFrom(existingStart, 60);
    expect(hasOverlap(start, end, existingStart, existingEnd)).toBe(true);
  });

  it('allows back-to-back when candidate starts at existing end', () => {
    const existingStart = new Date('2024-01-01T10:00:00Z');
    const existingEnd = minutesFrom(existingStart, 60);
    const candidateStart = existingEnd; // exact edge
    const candidateEnd = minutesFrom(candidateStart, 60);
    expect(hasOverlap(candidateStart, candidateEnd, existingStart, existingEnd)).toBe(false);
  });

  it('allows back-to-back when candidate ends at existing start', () => {
    const existingStart = new Date('2024-01-01T10:00:00Z');
    const existingEnd = minutesFrom(existingStart, 60);
    const candidateEnd = existingStart; // exact edge
    const candidateStart = minutesFrom(candidateEnd, -60);
    expect(hasOverlap(candidateStart, candidateEnd, existingStart, existingEnd)).toBe(false);
  });

  it('blocks exact containment', () => {
    const existingStart = new Date('2024-01-01T10:00:00Z');
    const existingEnd = minutesFrom(existingStart, 120);
    const candidateStart = new Date('2024-01-01T10:30:00Z');
    const candidateEnd = minutesFrom(candidateStart, 30);
    expect(hasOverlap(candidateStart, candidateEnd, existingStart, existingEnd)).toBe(true);
  });
});
