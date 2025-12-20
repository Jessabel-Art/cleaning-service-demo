// src/lib/payments.js

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

  const totalAmount = Number(source.amount ?? raw.amount ?? 0);
  const depositAmount = Number(raw.depositAmount || 0);
  const depositPaid = !!raw.depositPaid;

  const amountPaid = Number(raw.amountPaid ?? raw.paid ?? 0);

  const remainingBalance =
    raw.remainingBalance != null
      ? Number(raw.remainingBalance)
      : Math.max(
          0,
          totalAmount - amountPaid - (depositPaid ? depositAmount : 0)
        );

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
    depositAmount,
    depositPaid,
    amountPaid,
    remainingBalance,
    refunded,
    refundedAmount,
    paymentStatus,
    methodRaw,
    methodLabel,
  };
}

export function formatMoney(value) {
  const n = Number(value || 0);
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toFixed(2)}`;
}
/* -------------------- invoice / pricing helpers (moved from PaymentCenterPage) ------------------- */

const PRICING_ADDONS = [
  { id: "fridge", name: "Inside Fridge", price: 20 },
  { id: "oven", name: "Inside Oven", price: 20 },
  { id: "windows", name: "Interior Windows", price: 30 },
  { id: "baseboards", name: "Baseboards", price: 25 },
  { id: "laundry", name: "Laundry Fold", price: 15 },
  { id: "garage", name: "Garage Sweep", price: 20 },
  { id: "carpet", name: "Carpet Shampoo", price: 40 },
];

const PRICING_FREQUENCIES = [
  { id: "one-time", name: "One-time", discount: 0 },
  { id: "weekly", name: "Weekly", discount: 0.15 },
  { id: "biweekly", name: "Biweekly", discount: 0.1 },
  { id: "monthly", name: "Monthly", discount: 0.05 },
];

function inferServiceKeyFromBooking(b) {
  if (!b) return "residential-cleaning";
  if (b.service) return b.service;
  if (b.serviceId) return b.serviceId;

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
  const service = inferServiceKeyFromBooking(b);

  const bedrooms = Number(b.bedrooms || 0);
  const bathrooms = Number(b.bathrooms || 0);
  const sqft = Number(b.sqft || b.squareFeet || 0);

  const conditionRaw = String(b.conditionLevel || b.condition || "standard").toLowerCase();
  let condition = "standard";
  if (conditionRaw.includes("light")) condition = "light";
  else if (conditionRaw.includes("heavy")) condition = "heavy";

  const pets = b.petsOnSite ? "yes" : "no";
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
      if (PRICING_ADDONS.some((a) => a.id === raw)) return raw;
      const lower = String(raw).toLowerCase();
      const byName = PRICING_ADDONS.find((a) => a.name.toLowerCase() === lower);
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

  if (service === "office-cleaning") {
    base = 0;
    sizeCost = sqft * 0.12;
    duration = sqft / 500;
  } else {
    base = 80;
    sizeCost = bedrooms * 20 + bathrooms * 25;
    duration = bedrooms * 0.5 + bathrooms * 0.5 + 1;
  }

  if (service === "deep-clean") {
    base *= 1.5;
    duration *= 1.5;
  }
  if (service === "move-in-move-out") {
    base *= 1.8;
    duration *= 1.8;
  }

  if (condition === "light") conditionMultiplier = 0.95;
  if (condition === "heavy") conditionMultiplier = 1.15;

  if (b.petsOnSite) petsCost = 15;

  const addonItems = (normalizedAddonIds || []).map((id) => {
    const a = PRICING_ADDONS.find((x) => x.id === id);
    return a ? { id: a.id, label: a.name, price: a.price } : null;
  }).filter(Boolean);

  addonsCost = addonItems.reduce((s, it) => s + (it.price || 0), 0);

  const rawTotal = base + sizeCost + petsCost + addonsCost;
  const conditionCost = rawTotal * (conditionMultiplier - 1);
  let conditionAdjustedTotal = rawTotal + conditionCost;

  const freq = PRICING_FREQUENCIES.find((f) => f.id === frequency);
  if (freq && freq.discount) {
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
    addonItems,
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
    const unitPrice = 20;
    lineItems.push({ key: "bedrooms", qty, label: qty === 1 ? "Bedroom" : "Bedrooms", unitPrice, amount: qty * unitPrice });
  }

  // 3) Bathrooms
  if (pricing.bathrooms > 0) {
    const qty = pricing.bathrooms;
    const unitPrice = 25;
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
    const freqLabel = PRICING_FREQUENCIES.find((f) => f.id === pricing.frequency)?.name || pricing.frequency;
    lineItems.push({ key: "freq-discount", qty: 1, label: `Recurring service discount (${freqLabel})`, detail: "Discount for recurring cleanings", unitPrice: -pricing.frequencyDiscount, amount: -pricing.frequencyDiscount, isDiscount: true });
    discountsTotal += pricing.frequencyDiscount;
  }

  if (pricing.promoDiscount > 0) {
    lineItems.push({ key: "promo-discount", qty: 1, label: `Promo discount`, unitPrice: -pricing.promoDiscount, amount: -pricing.promoDiscount, isDiscount: true });
    discountsTotal += pricing.promoDiscount;
  }

  return { lineItems, subtotal, discountsTotal, pricing };
}
