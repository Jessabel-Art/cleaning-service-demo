import { describe, it, expect } from 'vitest';
import { isNonBillable, isCancelled, computeRemainingDue, derivePaymentInfo } from '../src/lib/payments';

describe('payments helpers', () => {
  it('isCancelled matches exact lowercase "cancelled"', () => {
    expect(isCancelled('cancelled')).toBe(true);
    expect(isCancelled({ status: 'cancelled' })).toBe(true);
    expect(isCancelled('Cancelled')).toBe(true);
    expect(isCancelled('canceled')).toBe(false); // American spelling not supported
    expect(isCancelled('declined')).toBe(false);
  });

  it('isNonBillable true for cancelled/declined', () => {
    expect(isNonBillable({ status: 'cancelled' })).toBe(true);
    expect(isNonBillable({ status: 'declined' })).toBe(true);
    expect(isNonBillable({ status: 'confirmed' })).toBe(false);
    expect(isNonBillable({})).toBe(false);
  });

  it('computeRemainingDue returns 0 for cancelled', () => {
    const booking = {
      status: 'cancelled',
      amount: 200,
      depositAmount: 50,
      depositPaid: false,
      amountPaid: 0,
    };
    expect(computeRemainingDue(booking)).toBe(0);

    const info = derivePaymentInfo(booking);
    expect(info.remainingBalance).toBe(0);
  });

  it('computeRemainingDue uses payments math when not cancelled', () => {
    const booking = {
      status: 'confirmed',
      amount: 200,
      depositAmount: 50,
      depositPaid: true,
      amountPaid: 20,
    };
    // total 200 - (deposit 50 + paid 20) = 130
    expect(computeRemainingDue(booking)).toBe(130);

    const info = derivePaymentInfo(booking);
    expect(info.remainingBalance).toBe(130);
  });
});
