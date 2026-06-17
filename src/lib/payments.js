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
  const payment = raw.payment && typeof raw.payment === "object" ? raw.payment : {};
  const totalPrice = Math.max(
    0,
    firstFiniteAmount(
      raw.totalPrice,
      source?.totalPrice,
      raw.totalAmount,
      source?.totalAmount,
      raw.total,
      source?.total,
      payment.totalPrice,
      payment.totalAmount,
      payment.total,
      source?.amount,
      raw.cost,
      raw.amount,
      raw.estimate?.total,
      source?.estimate?.total
    ) ?? 0
  );
  const depositAmount = Math.max(
    0,
    firstFiniteAmount(
      raw.depositAmount,
      source?.depositAmount,
      payment.depositAmount,
      raw.depositDue,
      source?.depositDue
    ) ?? 0
  );
  const explicitPaidAmount = firstFiniteAmount(
    raw.paidAmount,
    source?.paidAmount,
    payment.paidAmount,
    raw.amountPaid,
    source?.amountPaid,
    payment.amountPaid,
    raw.paid,
    source?.paid
  );
  const storedRemainingDue = firstFiniteAmount(
    raw.remainingDue,
    source?.remainingDue,
    payment.remainingDue,
    raw.balanceDue,
    source?.balanceDue,
    payment.balanceDue,
    raw.remainingBalance,
    source?.remainingBalance,
    payment.remainingBalance
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

export function getBookingTotal(source) {
  return normalizePaymentAmounts(source || {}).totalPrice;
}

export function getPaidAmount(source) {
  return normalizePaymentAmounts(source || {}).paidAmount;
}

export function getBalanceDue(source) {
  if (isNonBillable(source)) return 0;
  return normalizePaymentAmounts(source || {}).remainingDue;
}

export function normalizePaymentStatus(source) {
  const raw = source?.raw || source || {};
  const refundedAmount = Number(raw.refundedAmount || raw.payment?.refundedAmount || 0);
  const refunded = !!raw.refunded || refundedAmount > 0;
  if (refunded) return "refunded";

  if (isNonBillable(source)) {
    const status = String(raw.status || source?.status || "").toLowerCase().trim();
    return status === "cancelled" ? "cancelled" : "not_required";
  }

  const { totalPrice, paidAmount, remainingDue } = normalizePaymentAmounts(source || {});
  const depositPaid = !!(raw.depositPaid ?? raw.payment?.depositPaid);
  const anyPayment = depositPaid || paidAmount > 0;

  if (totalPrice <= 0) return "not_required";
  if (paidAmount >= totalPrice || remainingDue <= 0) return "paid";
  if (anyPayment) return "partial";
  return "unpaid";
}

export function getPaymentStatusLabel(statusOrBooking) {
  const status =
    typeof statusOrBooking === "string"
      ? statusOrBooking
      : normalizePaymentStatus(statusOrBooking || {});
  switch (String(status || "").toLowerCase().trim()) {
    case "paid":
    case "paid_in_full":
    case "paid in full":
      return "Paid";
    case "partial":
    case "partially_paid":
    case "partially paid":
    case "partial payment":
      return "Partial";
    case "refunded":
      return "Refunded";
    case "cancelled":
      return "Cancelled";
    case "not_required":
      return "Not required";
    case "checkout_created":
    case "requires_payment":
    case "unpaid":
    default:
      return "Unpaid";
  }
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

function formatDateOnly(value, fallback = "TBD") {
  const d = parseDateLike(value);
  if (!d) return fallback;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTimeOnly(value) {
  const d = parseDateLike(value);
  if (!d) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function normalizeServiceStatus(statusRaw, fallback = "Pending") {
  const status = String(statusRaw || "").trim();
  if (!status) return fallback;
  return status;
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
  const start = parseDateLike(raw.startAt || raw.scheduledAt || raw.date);
  const end = parseDateLike(raw.endAt || raw.endAtTime || raw.endTime);
  const dateStr = formatDateOnly(start);
  const startTimeStr = formatTimeOnly(start);
  const endTimeStr = formatTimeOnly(end);
  const dateTimeRange = start
    ? `${dateStr} · ${startTimeStr}${endTimeStr ? ` - ${endTimeStr}` : ""}`
    : "TBD";
  const normalized = normalizePaymentAmounts(source);
  const totalAmount = normalized.totalPrice;
  const depositAmount = normalized.depositAmount;
  const depositPaid = !!(raw.depositPaid ?? raw.payment?.depositPaid);
  const amountPaid = normalized.paidAmount;
  let remainingBalance = normalized.remainingDue;

  // Non-billable bookings are immediately closed out
  if (isNonBillable(source)) {
    remainingBalance = 0;
  }

  const refundedAmount = Number(raw.refundedAmount || 0);
  const refunded = !!raw.refunded || refundedAmount > 0;

  const paymentStatus = normalizePaymentStatus(source);
  const paymentStatusLabel = getPaymentStatusLabel(paymentStatus);

  const methodRaw =
    raw.balancePaymentMethod ||
    raw.paymentMethod ||
    raw.depositPaymentMethod ||
    (raw.stripePaymentIntentId || raw.stripeSessionId ? "card_stripe" : "");

  const methodLabel = prettifyMethodLabel(methodRaw);

  return {
    totalAmount,
    totalPrice: totalAmount,
    start,
    end,
    dateStr,
    startTimeStr,
    endTimeStr,
    dateTimeRange,
    statusLabel: normalizeServiceStatus(raw.status || raw.bookingStatus),
    depositAmount,
    depositPaid,
    amountPaid,
    totalPaid: amountPaid,
    paidAmount: amountPaid,
    remainingBalance,
    remainingDue: remainingBalance,
    balanceDue: remainingBalance,
    refunded,
    refundedAmount,
    paymentStatus,
    paymentStatusLabel,
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

export function formatAddressFromBooking(b) {
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

function cleanInvoiceText(value, fallback = "Not provided") {
  if (value == null) return fallback;
  const text = String(value).trim();
  if (!text || text.toLowerCase() === "undefined" || text.toLowerCase() === "null") {
    return fallback;
  }
  return text;
}

function escapeHtml(value) {
  return cleanInvoiceText(value, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function buildInvoiceData(booking, options = {}) {
  const b = booking || {};
  const info = derivePaymentInfo(b);
  const invoicePaymentStatus =
    info.paymentStatus === "paid"
      ? "Paid in full"
      : info.paymentStatus === "partial"
      ? "Partially paid"
      : info.paymentStatus === "unpaid"
      ? "Unpaid"
      : info.paymentStatusLabel;
  const serviceAddress = options.addressOverride || formatAddressFromBooking(b);
  const billAddress = cleanInvoiceText(
    b.billingAddress ||
      b.contact?.billingAddress ||
      b.contact?.address ||
      serviceAddress,
    "Address on file"
  );
  const billName = cleanInvoiceText(
    b.contact?.name || b.name || b.customerName || b.clientName || b.client,
    "Sanchez Services client"
  );
  const invoiceNumber = cleanInvoiceText(
    b.invoiceNumber ||
      b.invoiceNo ||
      b.invoiceId ||
      b.invoice ||
      b.orderId ||
      b.orderCode ||
      (b.id ? String(b.id).slice(0, 8) : ""),
    "Not provided"
  );
  const invoiceDate = formatDateOnly(options.invoiceDate || new Date());
  const { lineItems, subtotal, discountsTotal, pricing } = buildInvoiceLineItems(
    b,
    info,
    serviceAddress
  );
  const additionalPayments = Math.max(
    0,
    Number(info.totalPaid || 0) - (info.depositPaid ? Number(info.depositAmount || 0) : 0)
  );

  return {
    booking: b,
    info,
    invoiceNumber,
    invoiceDate,
    dueDate: invoiceDate,
    billName,
    billAddress,
    serviceName: cleanInvoiceText(b.serviceName || b.service || b.serviceSlug, "Cleaning service"),
    dateTimeRange: cleanInvoiceText(info.dateTimeRange, "TBD"),
    frequency: cleanInvoiceText(b.frequency, "one-time"),
    statusLabel: cleanInvoiceText(info.statusLabel, "Pending"),
    serviceAddress: cleanInvoiceText(serviceAddress, "Service address not provided"),
    notes: cleanInvoiceText(b.notes || b.cleanerNotes || b.notesForCleaner, ""),
    lineItems,
    subtotal,
    discountsTotal,
    pricing,
    serviceTotal: Number(info.totalPrice || 0),
    depositAmount: Number(info.depositAmount || 0),
    depositReceived: Boolean(info.depositPaid),
    additionalPayments,
    totalPaid: Number(info.totalPaid || 0),
    amountDue: Number(info.remainingBalance || 0),
    paymentStatus: cleanInvoiceText(invoicePaymentStatus, "Unpaid"),
    amountPaid: Number(info.totalPaid || 0),
    paymentMethod: cleanInvoiceText(info.methodLabel, "Not recorded"),
    refunded: Boolean(info.refunded),
    refundedAmount: Number(info.refundedAmount || 0),
    terms:
      "Payment is due at the time of your appointment unless otherwise arranged with Sterling. Deposits are non-refundable but may be transferred once to a new date with proper notice according to the cancellation policy.",
  };
}

export function buildInvoiceCsvRows(booking) {
  const invoice = buildInvoiceData(booking);
  return [
    ["Invoice ID", invoice.invoiceNumber],
    ["Service", invoice.serviceName],
    ["Status", invoice.statusLabel],
    ["Payment Status", invoice.paymentStatus],
    ["Payment Method", invoice.paymentMethod],
    ["Date / Time", invoice.dateTimeRange],
    ["Frequency", invoice.frequency],
    ["Service Total", formatMoney(invoice.serviceTotal)],
    ["Deposit Received", invoice.depositReceived ? "Yes" : "No"],
    ["Additional Payments", formatMoney(invoice.additionalPayments)],
    ["Total Paid", formatMoney(invoice.totalPaid)],
    ["Amount Due", formatMoney(invoice.amountDue)],
    ["Service Address", invoice.serviceAddress],
    ["Billing Address", invoice.billAddress],
    ["Notes", invoice.notes || "No notes added."],
  ];
}

export function buildInvoiceHtml(booking, { logoSrc = "", autoPrint = false } = {}) {
  const invoice = buildInvoiceData(booking);
  const rowsHtml = invoice.lineItems
    .map(
      (item) => `
        <tr>
          <td style="padding:10px 8px; border-bottom:1px solid #f1e3ff; font-size:12px;">${escapeHtml(item.qty)}</td>
          <td style="padding:10px 8px; border-bottom:1px solid #f1e3ff; font-size:12px;">
            <div>${escapeHtml(item.label)}</div>
            ${item.detail ? `<div style="margin-top:2px; font-size:11px; color:#9b74a6;">${escapeHtml(item.detail)}</div>` : ""}
          </td>
          <td style="padding:10px 8px; border-bottom:1px solid #f1e3ff; font-size:12px; text-align:right;">${formatMoney(item.unitPrice)}</td>
          <td style="padding:10px 8px; border-bottom:1px solid #f1e3ff; font-size:12px; text-align:right; ${item.isDiscount ? "color:#b4234b;" : ""}">${formatMoney(item.amount)}</td>
        </tr>`
    )
    .join("");
  const logoHtml = logoSrc
    ? `<img src="${escapeHtml(logoSrc)}" alt="Sanchez Services" style="max-width:100%; max-height:100%; object-fit:contain;" />`
    : "";
  const printScript = autoPrint
    ? `<script>(function(){function p(){try{window.focus();setTimeout(function(){try{window.print()}catch(e){}},350)}catch(e){}}if(document.readyState==='complete'){p()}else{window.addEventListener('load',p);setTimeout(p,1200)}})()</` +
      `script>`
    : "";

  return `<!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Invoice - ${escapeHtml(invoice.invoiceNumber)}</title>
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <style>
          html,body{margin:0;padding:0;background:#f7f2fb;-webkit-print-color-adjust:exact;color-adjust:exact}
          @page{size:auto;margin:10mm}
          @media print{body,html{background:#ffffff} *{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
        </style>
      </head>
      <body style="margin:0; background:#f7f2fb; font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif; color:#2c0735;">
        <div style="max-width:840px; margin:32px auto; background:#ffffff; border-radius:8px; padding:32px 36px; box-sizing:border-box; box-shadow:0 18px 40px rgba(31, 4, 43, 0.09);">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px;">
            <div style="display:flex; align-items:center; gap:12px;">
              <div style="width:40px; height:40px; border-radius:999px; overflow:hidden; display:flex; align-items:center; justify-content:center; border:1px solid #f1d7ff;">${logoHtml}</div>
              <div>
                <div style="font-size:14px; font-weight:600; letter-spacing:0.14em; text-transform:uppercase; color:#7e4b8e;">Sanchez Services</div>
                <div style="margin-top:4px; font-size:12px; color:#9b74a6;">Residential &amp; commercial cleaning<br/>Rhode Island &amp; Massachusetts</div>
              </div>
            </div>
            <div style="text-align:right; font-size:11px; color:#9b74a6;">
              <div style="margin-bottom:4px;">Invoice # <span style="font-weight:600; letter-spacing:0.12em;">${escapeHtml(invoice.invoiceNumber)}</span></div>
              <div>Invoice date: <span style="font-weight:500;">${escapeHtml(invoice.invoiceDate)}</span></div>
              <div>Due date: <span style="font-weight:500;">${escapeHtml(invoice.dueDate)}</span></div>
            </div>
          </div>
          <h1 style="margin:0 0 28px; text-align:center; font-size:18px; letter-spacing:0.28em; text-transform:uppercase; color:#1a0430;">Cleaning services invoice</h1>
          <div style="display:flex; flex-wrap:wrap; gap:32px; margin-bottom:28px; font-size:13px;">
            <div style="flex:1 1 260px;">
              <div style="font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:0.12em; color:#9b74a6; margin-bottom:6px;">Bill to</div>
              <div style="font-size:14px; font-weight:500; color:#2c0735;">${escapeHtml(invoice.billName)}</div>
              <div style="margin-top:4px; white-space:pre-line; color:#5b4461;">${escapeHtml(invoice.billAddress)}</div>
            </div>
            <div style="flex:1 1 220px;">
              <div style="font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:0.12em; color:#9b74a6; margin-bottom:6px;">Appointment</div>
              <div><strong>Service:</strong> ${escapeHtml(invoice.serviceName)}</div>
              <div style="margin-top:4px;"><strong>Date / time:</strong> ${escapeHtml(invoice.dateTimeRange)}</div>
              <div style="margin-top:4px;"><strong>Frequency:</strong> ${escapeHtml(invoice.frequency)}</div>
              <div style="margin-top:4px;"><strong>Status:</strong> ${escapeHtml(invoice.statusLabel)}</div>
              <div style="margin-top:4px;"><strong>Service address:</strong> ${escapeHtml(invoice.serviceAddress)}</div>
            </div>
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:13px; margin-bottom:20px;">
            <thead><tr>
              <th style="text-align:left; padding:10px 8px; background:#5b0b73; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#ffffff;">Qty</th>
              <th style="text-align:left; padding:10px 8px; background:#5b0b73; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#ffffff;">Description</th>
              <th style="text-align:right; padding:10px 8px; background:#5b0b73; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#ffffff;">Unit price</th>
              <th style="text-align:right; padding:10px 8px; background:#5b0b73; font-size:11px; text-transform:uppercase; letter-spacing:0.12em; color:#ffffff;">Amount</th>
            </tr></thead>
            <tbody>${rowsHtml}</tbody>
          </table>
          <div style="display:flex; justify-content:flex-end; margin-bottom:24px; font-size:13px;">
            <div style="width:260px;">
              <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Subtotal</span><span>${formatMoney(invoice.subtotal)}</span></div>
              ${invoice.discountsTotal > 0 ? `<div style="display:flex; justify-content:space-between; padding:4px 0; color:#b4234b;"><span>Discounts</span><span>${formatMoney(-invoice.discountsTotal)}</span></div>` : ""}
              <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Service total</span><span>${formatMoney(invoice.serviceTotal)}</span></div>
              <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Deposit ${invoice.depositReceived ? "(received)" : "(due)"}</span><span>${formatMoney(invoice.depositAmount)}</span></div>
              <div style="display:flex; justify-content:space-between; padding:4px 0;"><span>Additional payments</span><span>${formatMoney(invoice.additionalPayments)}</span></div>
              <div style="display:flex; justify-content:space-between; padding:4px 0; border-top:1px solid #edd8ff; margin-top:6px;"><span>Total paid so far</span><span>${formatMoney(invoice.totalPaid)}</span></div>
              <div style="display:flex; justify-content:space-between; padding:6px 0; border-top:1px solid #edd8ff; margin-top:6px; font-weight:600;"><span>Amount due</span><span>${formatMoney(invoice.amountDue)}</span></div>
            </div>
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:24px; font-size:12px; margin-bottom:16px;">
            <div style="flex:1 1 260px;">
              <div style="font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:0.12em; color:#9b74a6; margin-bottom:6px;">Payment details</div>
              <div>Payment status: <strong>${escapeHtml(invoice.paymentStatus)}</strong></div>
              <div>Amount paid: <strong>${formatMoney(invoice.amountPaid)}</strong></div>
              <div>Payment method: <strong>${escapeHtml(invoice.paymentMethod)}</strong></div>
              ${invoice.refunded ? `<div style="margin-top:4px; color:#b4234b;">Refunded: ${formatMoney(invoice.refundedAmount)}</div>` : ""}
            </div>
            <div style="flex:1 1 260px;">
              <div style="font-weight:600; text-transform:uppercase; font-size:11px; letter-spacing:0.12em; color:#9b74a6; margin-bottom:6px;">Notes for your cleaner</div>
              <div style="border:1px solid #edd8ff; border-radius:4px; padding:8px; min-height:70px;">${invoice.notes ? escapeHtml(invoice.notes) : "<span style='color:#b39bbc;'>No notes added.</span>"}</div>
            </div>
          </div>
          <div style="margin-top:10px; padding-top:10px; border-top:1px dashed #e5d1ff; font-size:11px; color:#9b74a6;"><strong>Terms &amp; conditions</strong><br/>${escapeHtml(invoice.terms)}</div>
        </div>
        ${printScript}
      </body>
    </html>`;
}
