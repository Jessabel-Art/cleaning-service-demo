const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('enqueueBookingEmail', () => {
  let adminStub;
  let functionsStub;
  let addStub;
  let handler;

  beforeEach(() => {
    addStub = sinon.stub().resolves({ id: 'mail123' });
    const updateStub = sinon.stub().resolves();
    const collectionStub = sinon.stub().returns({ add: addStub, doc: (id) => ({ update: updateStub }) });
    const firestoreStub = sinon.stub().returns({ collection: collectionStub });

    adminStub = {
      firestore: firestoreStub,
      initializeApp: sinon.stub(),
    };
    // make FieldValue available on the firestore function (admin.firestore.FieldValue.serverTimestamp())
    adminStub.firestore.FieldValue = { serverTimestamp: sinon.stub().returns('SERVER_TS') };

    // create a fake firebase-functions object that has the shapes used in index.js
    const fakeFunctions = {
      https: {
        onRequest: (fn) => fn,
      },
      firestore: {
        document: (path) => ({
          onWrite: (fn) => fn,
        }),
      },
    };

    // require the functions module with admin and fake functions stubbed
    const mod = proxyquire('../index.js', { 'firebase-admin': adminStub, 'firebase-functions': fakeFunctions });
    handler = mod.enqueueBookingEmail;
  });

  it('should write a mail doc when booking created with email', async () => {
    const fakeChange = {
      before: { exists: false },
      after: { exists: true, data: () => ({ status: 'pending', contact: { email: 'test@example.com', name: 'Test' }, scheduledAt: { toDate: () => new Date('2025-10-20T10:00:00Z') } }) }
    };
    // call the handler
    await handler(fakeChange, { params: { bookingId: 'b1' } });
    expect(addStub.called).to.be.true;
    const arg = addStub.getCall(0).args[0];
    expect(arg).to.have.property('to');
    expect(arg.to[0]).to.equal('test@example.com');
    expect(arg).to.have.property('message');
  });
});
