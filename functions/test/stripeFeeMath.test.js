const assert = require('node:assert/strict');

const {
  calculateGrossFromNet,
  estimateStripeFeeFromGrossCents,
} = require('../stripeFeeMath');

describe('calculateGrossFromNet', () => {
  it('covers a $50.00 net deposit without leaving the vendor short', () => {
    const result = calculateGrossFromNet(50);

    assert.equal(result.netAmount, 50);
    assert.equal(result.grossAmount, 51.8);
    assert.equal(result.grossAmountCents, 5180);
    assert.equal(result.estimatedFee, 1.8);

    const netAfterFee = result.grossAmountCents - estimateStripeFeeFromGrossCents(result.grossAmountCents);
    assert.equal(netAfterFee, 5000);
  });

  it('returns the smallest safe gross amount in cents', () => {
    const result = calculateGrossFromNet(127.43);
    const currentNet = result.grossAmountCents - estimateStripeFeeFromGrossCents(result.grossAmountCents);
    const priorNet = (result.grossAmountCents - 1) - estimateStripeFeeFromGrossCents(result.grossAmountCents - 1);

    assert.ok(currentNet >= result.netAmountCents);
    assert.ok(priorNet < result.netAmountCents);
  });

  it('returns zeroes for non-positive amounts', () => {
    const result = calculateGrossFromNet(0);

    assert.equal(result.grossAmountCents, 0);
    assert.equal(result.estimatedFeeCents, 0);
  });
});