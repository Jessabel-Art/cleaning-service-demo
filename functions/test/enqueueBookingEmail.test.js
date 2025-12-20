import { createRequire } from 'node:module';
import { describe, it, beforeEach, expect, vi } from 'vitest';

const require = createRequire(import.meta.url);
const proxyquire = require('proxyquire');

describe('enqueueBookingEmail', () => {
  let addStub;
  let handler;

  beforeEach(() => {
    addStub = vi.fn().mockResolvedValue({ id: 'mail123' });
    const updateStub = vi.fn().mockResolvedValue();
    const collectionStub = vi.fn().mockReturnValue({ add: addStub, doc: (id) => ({ update: updateStub }) });
    const firestoreStub = vi.fn().mockReturnValue({ collection: collectionStub });

    const adminStub = {
      firestore: firestoreStub,
      initializeApp: vi.fn(),
    };
    adminStub.firestore.FieldValue = { serverTimestamp: vi.fn().mockReturnValue('SERVER_TS') };

    const fakeFunctions = {
      config: () => ({}),
      https: {
        onRequest: (fn) => fn,
        onCall: (fn) => fn,
      },
      firestore: {
        document: () => ({
          onWrite: (fn) => fn,
          onCreate: (fn) => fn,
          onUpdate: (fn) => fn,
          onDelete: (fn) => fn,
        }),
      },
    };

    // require the functions module with admin and fake functions stubbed
    const mod = proxyquire('../index.js', {
      'firebase-admin': adminStub,
      'firebase-functions': fakeFunctions,
      'firebase-functions/v1': fakeFunctions,
    });
    handler = mod.enqueueBookingEmail;
  });

  it('should write a mail doc when booking created with email', async () => {
    const fakeChange = {
      before: { exists: false },
      after: {
        exists: true,
        data: () => ({
          status: 'pending',
          contact: { email: 'test@example.com', name: 'Test' },
          scheduledAt: { toDate: () => new Date('2025-10-20T10:00:00Z') },
        }),
        ref: { update: vi.fn().mockResolvedValue() },
      },
    };

    await handler(fakeChange, { params: { bookingId: 'b1' } });

    expect(addStub.mock.calls.length).toBeGreaterThanOrEqual(1);
    const arg = addStub.mock.calls[0][0];
    expect(arg).toHaveProperty('to');
    expect(arg.to[0]).toBe('test@example.com');
    expect(arg).toHaveProperty('message');
  });
});
