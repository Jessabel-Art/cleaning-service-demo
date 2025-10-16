import { describe, it, expect } from 'vitest';
import { buildReviewPayload } from '@/lib/payloads';

describe('buildReviewPayload', () => {
  it('builds a pending review payload', () => {
    const user = { uid: 'u1', displayName: 'Jane', email: 'jane@example.com' };
    const p = buildReviewPayload(user, 4, 'Nice job');
    expect(p.userId).toBe('u1');
    expect(p.rating).toBe(4);
    expect(p.status).toBe('pending');
    expect(p.body).toBe('Nice job');
  });
});
