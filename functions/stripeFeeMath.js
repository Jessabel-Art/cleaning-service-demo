const DEFAULT_STRIPE_PERCENT_FEE = 0.029;
const DEFAULT_STRIPE_FIXED_FEE = 0.30;

function dollarsToCents(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

function centsToDollars(amountCents) {
  return Number((Number(amountCents || 0) / 100).toFixed(2));
}

function estimateStripeFeeFromGrossCents(
  grossAmountCents,
  percentFee = DEFAULT_STRIPE_PERCENT_FEE,
  fixedFee = DEFAULT_STRIPE_FIXED_FEE
) {
  const grossCents = Math.max(0, Number(grossAmountCents || 0));
  const fixedFeeCents = dollarsToCents(fixedFee);
  const percentFeeCents = Math.round(grossCents * Number(percentFee || 0));
  return percentFeeCents + fixedFeeCents;
}

function calculateGrossFromNet(
  netAmount,
  percentFee = DEFAULT_STRIPE_PERCENT_FEE,
  fixedFee = DEFAULT_STRIPE_FIXED_FEE
) {
  const netAmountCents = dollarsToCents(netAmount);

  if (netAmountCents <= 0) {
    return {
      netAmount: 0,
      netAmountCents: 0,
      grossAmount: 0,
      grossAmountCents: 0,
      estimatedFee: 0,
      estimatedFeeCents: 0,
      percentFee,
      fixedFee,
    };
  }

  const fixedFeeCents = dollarsToCents(fixedFee);
  const feePercent = Number(percentFee || 0);

  let grossAmountCents = Math.max(
    netAmountCents,
    Math.round((netAmountCents + fixedFeeCents) / (1 - feePercent))
  );

  let estimatedFeeCents = estimateStripeFeeFromGrossCents(
    grossAmountCents,
    feePercent,
    fixedFee
  );

  while (grossAmountCents - estimatedFeeCents < netAmountCents) {
    grossAmountCents += 1;
    estimatedFeeCents = estimateStripeFeeFromGrossCents(
      grossAmountCents,
      feePercent,
      fixedFee
    );
  }

  while (grossAmountCents > netAmountCents) {
    const priorGrossAmountCents = grossAmountCents - 1;
    const priorFeeCents = estimateStripeFeeFromGrossCents(
      priorGrossAmountCents,
      feePercent,
      fixedFee
    );
    if (priorGrossAmountCents - priorFeeCents < netAmountCents) {
      break;
    }
    grossAmountCents = priorGrossAmountCents;
    estimatedFeeCents = priorFeeCents;
  }

  return {
    netAmount: centsToDollars(netAmountCents),
    netAmountCents,
    grossAmount: centsToDollars(grossAmountCents),
    grossAmountCents,
    estimatedFee: centsToDollars(estimatedFeeCents),
    estimatedFeeCents,
    percentFee: feePercent,
    fixedFee: centsToDollars(fixedFeeCents),
  };
}

module.exports = {
  DEFAULT_STRIPE_PERCENT_FEE,
  DEFAULT_STRIPE_FIXED_FEE,
  calculateGrossFromNet,
  estimateStripeFeeFromGrossCents,
  dollarsToCents,
  centsToDollars,
};