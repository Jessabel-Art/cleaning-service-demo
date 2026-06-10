// src/lib/payments.js

import {
  ADD_ONS,
  ESTIMATE_RULES,
  getFrequencyById,
  getServiceBySlug,
} from "@/data/services";

export const STRIPE_CARD_PERCENT_FEE = 0.029;
export const STRIPE_CARD_FIXED_FEE = 0.30;

export function dollarsToCents(amount) {
  const value = Number(amount || 0);
  if (!Number.isFinite(value)) return 0;
  return Math.round(value * 100);
}

export function centsToDollars(amountCents) {
  return Number((Number(amountCents || 0) / 100).toFixed(2));
}

export function estimateStripeFeeFromGrossCents(
  grossAmountCents,
  percentFee = STRIPE_CARD_PERCENT_FEE,
  fixedFee = STRIPE_CARD_FIXED_FEE
) {
  const grossCents = Math.max(0, Number(grossAmountCents || 0));
  const fixedFeeCents = dollarsToCents(fixedFee);
  return Math.round(grossCents * Number(percentFee || 0)) + fixedFeeCents;
}

export function calculateGrossFromNet(
  netAmount,
  percentFee = STRIPE_CARD_PERCENT_FEE,
  fixedFee = STRIPE_CARD_FIXED_FEE
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

function parseFiniteAmount(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function firstFiniteAmount(...values) {
  for (const value of values) {
    if (typeof value === "boolean") continue;
    const amount = parseFiniteAmount(value);
    if (amount != null) return amount;
  }
  return null;
}

function normalizePaymentAmounts(source) {
  const raw = source?.raw || source || {};
  const totalPrice = Math.max(
    0,
    firstFiniteAmount(raw.totalPrice, source?.totalPrice, source?.amount, raw.cost, raw.amount) ?? 0
  );
  const depositAmount = Math.max(0, firstFiniteAmount(raw.depositAmount) ?? 0);
  const explicitPaidAmount = firstFiniteAmount(
    raw.paidAmount,
    source?.paidAmount,
    raw.amountPaid,
    source?.amountPaid,
    raw.paid,
    source?.paid
  );
  const storedRemainingDue = firstFiniteAmount(
    raw.remainingDue,
    source?.remainingDue,
    raw.remainingBalance,
    source?.remainingBalance
  );

  let paidAmount = Math.max(0, explicitPaidAmount ?? 0);
  if (explicitPaidAmount == null && storedRemainingDue != null && totalPrice > 0) {
    paidAmount = Math.max(0, totalPrice - Math.max(0, storedRemainingDue));
  } else if (explicitPaidAmount == null && raw.depositPaid) {
    paidAmount = depositAmount;
  }

  if (totalPrice > 0) {
    paidAmount = Math.min(totalPrice, paidAmount);
  }
  const remainingDue = Math.max(0, totalPrice - paidAmount);

  return {
    totalPrice,
    depositAmount,
    paidAmount,
    remainingDue,
  };
}

function parseDateLike(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value?.toDate === "function") {
    const d = value.toDate();
    return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
  }
  if (typeof value === "object" && typeof value.seconds === "number") {
    const d = new Date(value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isStripeMethod(methodRaw) {
  const s = String(methodRaw || "").toLowerCase();
  return s.includes("stripe") || s.includes("card");
}

function normalizeSummary(summary) {
  const netAmount = Math.max(0, Number(summary.netAmount || 0));
  const feeAmountRaw = parseFiniteAmount(summary.feeAmount);
  const grossAmountRaw = parseFiniteAmount(summary.grossAmount);
  const feeStatus = summary.feeStatus || "unknown";
  const feeAmount = feeAmountRaw != null ? Math.max(0, feeAmountRaw) : null;
  const grossAmount = grossAmountRaw != null ? Math.max(netAmount, grossAmountRaw) : null;
  const source = summary.source || "unknown";
  const feeCollected =
    typeof summary.feeCollected === "boolean"
      ? summary.feeCollected
      : feeStatus === "collected";

  return {
    netAmount,
    feeAmount,
    grossAmount,
    feeCollected,
    feeStatus,
    source,
    paymentType: summary.paymentType,

    // Backward-compatible aliases used by existing UI call sites.
    estimatedFee: feeAmount ?? 0,
    netAmountCents: dollarsToCents(netAmount),
    estimatedFeeCents: dollarsToCents(feeAmount ?? 0),
    grossAmountCents: dollarsToCents(grossAmount ?? netAmount),
    percentFee: STRIPE_CARD_PERCENT_FEE,
    fixedFee: STRIPE_CARD_FIXED_FEE,
    isStored: source === "stored_stripe_fields",
    isEstimated: source === "estimated_current_pricing",
  };
}

export function getNormalizedStripePaymentSummary(booking, paymentType = "remaining_due") {
  const isDeposit = paymentType === "deposit";

  const storedNetAmount = parseFiniteAmount(
    isDeposit ? booking?.depositStripeNetAmount : booking?.balanceStripeNetAmount
  );
  const storedFeeAmount = parseFiniteAmount(
    isDeposit ? booking?.depositStripeFeeAmount : booking?.balanceStripeFeeAmount
  );
  const storedGrossAmount = parseFiniteAmount(
    isDeposit ? booking?.depositStripeGrossAmount : booking?.balanceStripeGrossAmount
  );

  // Most trustworthy path: webhook-stored Stripe breakdown.
  if (
    storedNetAmount != null &&
    storedFeeAmount != null &&
    storedGrossAmount != null &&
    storedNetAmount >= 0 &&
    storedFeeAmount >= 0 &&
    storedGrossAmount >= storedNetAmount
  ) {
    return normalizeSummary({
      netAmount: storedNetAmount,
      feeAmount: storedFeeAmount,
      grossAmount: storedGrossAmount,
      feeCollected: storedFeeAmount > 0 || storedGrossAmount > storedNetAmount,
      feeStatus:
        storedFeeAmount > 0 || storedGrossAmount > storedNetAmount
          ? "collected"
          : "not_collected",
      source: "stored_stripe_fields",
      paymentType,
    });
  }

  const {
    totalPrice,
    depositAmount,
    paidAmount,
    remainingDue,
  } = normalizePaymentAmounts(booking);
  const amountNet = Math.max(0, parseFiniteAmount(booking?.amountNet) ?? 0);

  const hasDepositIntent = Boolean(booking?.depositPaymentIntentId);
  const hasBalanceIntent = Boolean(booking?.balancePaymentIntentId);
  const hasAnyIntent = Boolean(booking?.stripePaymentIntentId || hasDepositIntent || hasBalanceIntent);
  const depositMethodIsStripe = isStripeMethod(booking?.depositPaymentMethod);
  const balanceMethodIsStripe = isStripeMethod(booking?.balancePaymentMethod || booking?.paymentMethod);

  const completedDepositViaStripe =
    Boolean(booking?.depositPaid) &&
    (hasDepositIntent || depositMethodIsStripe || Boolean(booking?.stripeSessionId));

  const inferredRemainingPaidNet = Math.max(
    0,
    paidAmount > 0
      ? paidAmount - (booking?.depositPaid ? depositAmount : 0)
      : Boolean(booking?.depositPaid)
      ? Math.max(0, paidAmount - depositAmount)
      : Math.max(0, totalPrice - remainingDue)
  );

  const completedBalanceViaStripe =
    hasBalanceIntent ||
    (balanceMethodIsStripe && inferredRemainingPaidNet > 0) ||
    (!isDeposit && hasAnyIntent && remainingDue <= 0 && paidAmount > 0);

  const stripeEvidenceForPaymentType = isDeposit
    ? completedDepositViaStripe
    : completedBalanceViaStripe;

  const evidenceDate =
    parseDateLike(booking?.paidAt) ||
    parseDateLike(booking?.updatedAt) ||
    parseDateLike(booking?.createdAt) ||
    parseDateLike(booking?.startAt);

  // Conservative recency heuristic:
  // if Stripe evidence exists but fee fields are missing, and the record is recent
  // (or has no reliable date), treat fee status as unknown instead of no-fee.
  const UNKNOWN_FEE_LOOKBACK_DAYS = 180;
  const unknownCutoff = new Date(Date.now() - UNKNOWN_FEE_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);
  const isRecentOrUndated = !evidenceDate || evidenceDate >= unknownCutoff;

  if (stripeEvidenceForPaymentType && isRecentOrUndated) {
    const uncertainNet = Math.max(
      0,
      isDeposit ? amountNet || depositAmount : amountNet || inferredRemainingPaidNet
    );
    return normalizeSummary({
      netAmount: uncertainNet,
      feeAmount: null,
      grossAmount: null,
      feeCollected: false,
      feeStatus: "unknown",
      source: "unknown_fee_status",
      paymentType,
    });
  }

  // Legacy safeguard:
  // If Stripe payment evidence exists but Stripe fee fields were never stored,
  // do NOT invent fees from today's rules. Treat as no-fee-collected.
  if (isDeposit && completedDepositViaStripe) {
    const legacyNet = Math.max(0, amountNet || depositAmount);
    return normalizeSummary({
      netAmount: legacyNet,
      feeAmount: 0,
      grossAmount: legacyNet,
      feeCollected: false,
      feeStatus: "not_collected",
      source: "legacy_no_fee_inferred",
      paymentType,
    });
  }

  if (!isDeposit && completedBalanceViaStripe) {
    const legacyNet = Math.max(0, amountNet || inferredRemainingPaidNet);
    return normalizeSummary({
      netAmount: legacyNet,
      feeAmount: 0,
      grossAmount: legacyNet,
      feeCollected: false,
      feeStatus: "not_collected",
      source: "legacy_no_fee_inferred",
      paymentType,
    });
  }

  // Preview path for not-yet-paid card checkout (current pricing model).
  const fallbackNetAmount = Math.max(
    0,
    Number(isDeposit ? depositAmount : remainingDue)
  );

  if (fallbackNetAmount <= 0) {
    return normalizeSummary({
      netAmount: 0,
      feeAmount: 0,
      grossAmount: 0,
      feeCollected: false,
      feeStatus: "unknown",
      source: "none",
      paymentType,
    });
  }

  const estimate = calculateGrossFromNet(fallbackNetAmount);
  return normalizeSummary({
    netAmount: estimate.netAmount,
    feeAmount: estimate.estimatedFee,
    grossAmount: estimate.grossAmount,
    feeCollected: false,
    feeStatus: "unknown",
    source: "estimated_current_pricing",
    paymentType,
  });
}

export function getStripeChargeSummary(booking, paymentType = "remaining_due") {
  return getNormalizedStripePaymentSummary(booking, paymentType);
}

/**
 * Determines if a booking should not be billed.
 * Non-billable statuses: cancelled, declined (do not contribute to outstanding balances or deposit tracking).
 * Cancelled/declined bookings are treated as closed-out with $0 remaining due.
 */
export function isNonBillable(booking) {
  if (!booking) return false;
  const status = String(booking.status || "").toLowerCase().trim();
  return status === "cancelled" || status === "declined";
}

/** Exact cancelled status helper (no American spelling variant supported) */
export function isCancelled(bookingOrStatus) {
  if (bookingOrStatus == null) return false;
  const s = typeof bookingOrStatus === "string"
    ? bookingOrStatus
    : String(bookingOrStatus.status || "");
  return s.toLowerCase().trim() === "cancelled";
}

export function prettifyMethodLabel(methodRaw) {
  if (!methodRaw) return "Not recorded";
  const s = String(methodRaw).toLowerCase();
  if (s.includes("stripe") || s.includes("card")) return "Card (Stripe)";
  if (s.includes("cash_app") || s.includes("cashapp")) return "Cash App";
  if (s.includes("zelle")) return "Zelle";
  if (s === "cash") return "Cash";
  return methodRaw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Normalize payment info from either:
 * - an admin bookings row with .raw
 * - a Firestore booking doc
 */
export function derivePaymentInfo(source) {
  const raw = source.raw || source || {};
  const normalized = normalizePaymentAmounts(source);
  const totalAmount = normalized.totalPrice;
  const depositAmount = normalized.depositAmount;
  const depositPaid = !!raw.depositPaid;
  const amountPaid = normalized.paidAmount;
  let remainingBalance = normalized.remainingDue;

  // Non-billable bookings are immediately closed out
  if (isNonBillable(source)) {
    remainingBalance = 0;
  }

  const refundedAmount = Number(raw.refundedAmount || 0);
  const refunded = !!raw.refunded || refundedAmount > 0;

  let paymentStatus = "Unpaid";
  const anyPayment = depositPaid || amountPaid > 0;

  if (refunded) {
    paymentStatus = "Refunded";
  } else if (remainingBalance <= 0 && anyPayment) {
    paymentStatus = "Paid in full";
  } else if (anyPayment) {
    paymentStatus = "Partially paid";
  }

  const methodRaw =
    raw.balancePaymentMethod ||
    raw.paymentMethod ||
    raw.depositPaymentMethod ||
    (raw.stripePaymentIntentId || raw.stripeSessionId ? "card_stripe" : "");

  const methodLabel = prettifyMethodLabel(methodRaw);

  return {
    totalAmount,
    totalPrice: totalAmount,
    depositAmount,
    depositPaid,
    amountPaid,
    paidAmount: amountPaid,
    remainingBalance,
    remainingDue: remainingBalance,
    refunded,
    refundedAmount,
    paymentStatus,
    methodRaw,
    methodLabel,
  };
}

/** Compute remaining due with a single source of truth, treating cancelled/declined as 0 */
export function computeRemainingDue(booking) {
  const info = derivePaymentInfo(booking || {});
  return isNonBillable(booking) ? 0 : Number(info.remainingDue || 0);
}

export function formatMoney(value) {
  const n = Number(value || 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}
/* -------------------- invoice / pricing helpers (moved from PaymentCenterPage) ------------------- */

function inferServiceKeyFromBooking(b) {
  if (!b) return "residential-cleaning";
  const slug = b.serviceSlug || b.service || b.serviceId;
  if (getServiceBySlug(slug)) return slug;
  if (slug === "deep-cleaning") return "deep-clean";
  if (slug === "moving-cleaning") return "move-in-move-out";
  if (slug === "commercial-cleaning") return "office-cleaning";

  const name = String(b.serviceName || "").toLowerCase();
  if (name.includes("move")) return "move-in-move-out";
  if (name.includes("deep")) return "deep-clean";
  if (name.includes("office")) return "office-cleaning";
  return "residential-cleaning";
}

function formatAddressFromBooking(b) {
  if (!b) return "Service address not provided";

  const contact = b.contact || {};
  const addrObj = b.address || b.serviceAddressData || {};

  const line1 =
    addrObj.line1 ||
    addrObj.street ||
    b.addressLine1 ||
    b.street ||
    b.streetAddress ||
    b.serviceAddress ||
    contact.addressLine1 ||
    contact.streetAddress ||
    contact.street ||
    null;

  const city = addrObj.city || b.city || contact.city || null;

  const state =
    addrObj.state || b.state || b.stateCode || contact.state || contact.stateCode || null;

  const zip =
    addrObj.zip || addrObj.postalCode || b.zip || b.zipCode || b.postalCode || contact.zip || contact.zipCode || contact.postalCode || null;

  const cityState = [city, state].filter(Boolean).join(", ") || null;
  const line2 = [cityState, zip].filter(Boolean).join(" ") || null;

  if (!line1 && !line2) return "Service address not provided";
  return [line1, line2].filter(Boolean).join("\n");
}

function computePricingBreakdownFromBooking(b) {
  const serviceSlug = inferServiceKeyFromBooking(b);
  const service = getServiceBySlug(serviceSlug) || getServiceBySlug("residential-cleaning");
  const servicePricing = service.pricing;

  const bedrooms = Number(b.bedrooms || 0);
  const bathrooms = Number(b.bathrooms || 0);
  const sqft = Number(b.sqft || b.squareFeet || 0);

  const conditionRaw = String(b.conditionLevel || b.condition || "standard").toLowerCase();
  let condition = "standard";
  if (conditionRaw.includes("light")) condition = "light";
  else if (conditionRaw.includes("heavy")) condition = "heavy";

  const pets = b.petsOnSite || b.pets === true || b.pets === "yes" ? "yes" : "no";
  const frequency = b.frequency || "one-time";
  const promoCode = (b.promoCode || "").toUpperCase();
  const promoApplied = !!b.promoApplied || promoCode === "CLEAN10";

  let addonIds = [];
  if (Array.isArray(b.addOnsIds)) addonIds = b.addOnsIds;
  else if (Array.isArray(b.addOns)) addonIds = b.addOns;
  else if (Array.isArray(b.addons)) addonIds = b.addons;

  const normalizedAddonIds = addonIds
    .map((raw) => {
      if (!raw) return null;
      if (ADD_ONS.some((a) => a.id === raw)) return raw;
      const lower = String(raw).toLowerCase();
      const byName = ADD_ONS.find((a) => a.label.toLowerCase() === lower);
      return byName ? byName.id : null;
    })
    .filter(Boolean);

  let base = 0,
    sizeCost = 0,
    conditionMultiplier = 1,
    petsCost = 0,
    addonsCost = 0,
    frequencyDiscount = 0,
    duration = 0;

  if (servicePricing.sqftRate) {
    base = servicePricing.basePrice;
    sizeCost = sqft * servicePricing.sqftRate;
    duration = sqft / servicePricing.sqftPerHour;
  } else {
    base = servicePricing.basePrice;
    sizeCost =
      bedrooms * ESTIMATE_RULES.bedroomPrice +
      bathrooms * ESTIMATE_RULES.bathroomPrice;
    duration =
      (bedrooms * ESTIMATE_RULES.bedroomDurationHours +
        bathrooms * ESTIMATE_RULES.bathroomDurationHours +
        ESTIMATE_RULES.baseDurationHours) *
      servicePricing.durationMultiplier;
  }

  conditionMultiplier = ESTIMATE_RULES.conditionMultipliers[condition] || 1;
  duration *= ESTIMATE_RULES.conditionDurationMultipliers[condition] || 1;

  if (pets === "yes") {
    petsCost = ESTIMATE_RULES.petPrice;
    duration += ESTIMATE_RULES.petDurationHours;
  }

  const addonItems = (normalizedAddonIds || []).map((id) => {
    const a = ADD_ONS.find((x) => x.id === id);
    return a ? { id: a.id, label: a.label, price: a.price, durationHours: a.durationHours } : null;
  }).filter(Boolean);

  addonsCost = addonItems.reduce((s, it) => s + (it.price || 0), 0);
  duration += addonItems.reduce((s, it) => s + (it.durationHours || 0), 0);

  const rawTotal = base + sizeCost + petsCost + addonsCost;
  const conditionCost = rawTotal * (conditionMultiplier - 1);
  let conditionAdjustedTotal = rawTotal + conditionCost;

  const freq = getFrequencyById(frequency);
  if (freq && freq.discount && service.recurringDiscountEligible) {
    frequencyDiscount = Math.round(conditionAdjustedTotal * freq.discount * 100) / 100;
    conditionAdjustedTotal = conditionAdjustedTotal - frequencyDiscount;
  }

  let promoDiscount = 0;
  if (promoApplied) {
    promoDiscount = Math.round(conditionAdjustedTotal * 0.1 * 100) / 100;
    conditionAdjustedTotal = conditionAdjustedTotal - promoDiscount;
  }

  const subtotal = Math.max(0, Math.round(conditionAdjustedTotal * 100) / 100);

  return {
    base,
    bedrooms,
    bathrooms,
    sqft,
    service: service.slug,
    frequency,
    condition,
    conditionCost,
    conditionAdjustedTotal,
    petsCost,
    addonItems,
    addonsCost,
    frequencyDiscount,
    promoDiscount,
    subtotal,
    duration,
  };
}

/**
 * Build full invoice line items from a booking using the same math
 * as BookingPage.jsx.
 */
export function buildInvoiceLineItems(booking, info, addressOverride) {
  if (!booking || !info) {
    return { lineItems: [], subtotal: 0, discountsTotal: 0, pricing: null };
  }

  const pricing = computePricingBreakdownFromBooking(booking);
  if (!pricing) {
    return {
      lineItems: [],
      subtotal: info.totalAmount,
      discountsTotal: 0,
      pricing: null,
    };
  }

  const addr = addressOverride || formatAddressFromBooking(booking) || "Address on file";

  const lineItems = [];

  // 1) Base rate
  lineItems.push({
    key: "base",
    qty: 1,
    label: `${booking.serviceName || "Cleaning service"} – base rate`,
    unitPrice: pricing.base,
    amount: pricing.base,
  });

  // 2) Bedrooms
  if (pricing.bedrooms > 0) {
    const qty = pricing.bedrooms;
    const unitPrice = ESTIMATE_RULES.bedroomPrice;
    lineItems.push({ key: "bedrooms", qty, label: qty === 1 ? "Bedroom" : "Bedrooms", unitPrice, amount: qty * unitPrice });
  }

  // 3) Bathrooms
  if (pricing.bathrooms > 0) {
    const qty = pricing.bathrooms;
    const unitPrice = ESTIMATE_RULES.bathroomPrice;
    lineItems.push({ key: "bathrooms", qty, label: qty === 1 ? "Bathroom" : "Bathrooms", unitPrice, amount: qty * unitPrice });
  }

  // 4) Pets
  if (pricing.petsCost > 0) {
    lineItems.push({ key: "pets", qty: 1, label: "Pets on site", detail: "Additional time and supplies for homes with pets", unitPrice: pricing.petsCost, amount: pricing.petsCost });
  }

  // 5) Add-ons
  pricing.addonItems.forEach((addon) => {
    lineItems.push({ key: `addon-${addon.id}`, qty: 1, label: addon.label, unitPrice: addon.price, amount: addon.price });
  });

  let subtotal = pricing.conditionAdjustedTotal;
  let discountsTotal = 0;

  if (pricing.conditionCost !== 0) {
    lineItems.push({ key: "condition", qty: 1, label: pricing.condition === "light" ? "Light condition adjustment" : "Heavy condition adjustment", detail: pricing.condition === "light" ? "Lightly soiled home discount" : "Heavier build-up adjustment", unitPrice: pricing.conditionCost, amount: pricing.conditionCost, isDiscount: pricing.conditionCost < 0 });
  }

  if (pricing.frequencyDiscount > 0) {
    const freqLabel = getFrequencyById(pricing.frequency)?.name || pricing.frequency;
    lineItems.push({ key: "freq-discount", qty: 1, label: `Recurring service discount (${freqLabel})`, detail: "Discount for recurring cleanings", unitPrice: -pricing.frequencyDiscount, amount: -pricing.frequencyDiscount, isDiscount: true });
    discountsTotal += pricing.frequencyDiscount;
  }

  if (pricing.promoDiscount > 0) {
    lineItems.push({ key: "promo-discount", qty: 1, label: `Promo discount`, unitPrice: -pricing.promoDiscount, amount: -pricing.promoDiscount, isDiscount: true });
    discountsTotal += pricing.promoDiscount;
  }

  return { lineItems, subtotal, discountsTotal, pricing };
}
