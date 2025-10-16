import { describe, it, expect } from 'vitest';
import { buildBookingPayload } from '@/lib/payloads';

describe('buildBookingPayload', () => {
  it('builds a payload with address and timestamps', () => {
    const form = { service: 'clean', name: 'Jane', email: 'jane@example.com', street: '1 Main St', city: 'Providence', state: 'RI', zip: '02903', startAt: new Date().toISOString(), frequency: 'one-time' };
    const estimate = { total: 120, durationHours: 2 };
    const p = buildBookingPayload(form, estimate, 'uid123');
    expect(p.contact.emailLower).toBe('jane@example.com');
    expect(p.address.line1).toBe('1 Main St');
    expect(p.status).toBe('pending');
    expect(p.startAt).toBeTruthy();
    expect(p.endAt).toBeTruthy();
  });
});
