import { demoAppointments } from "./demoAppointments";
import { demoInvoices } from "./demoInvoices";

const PENDING_BOOKING_KEY = "cleanpro_demo_pending_booking";

function safeJsonParse(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function formatAppointmentTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "TBD"
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function savePendingDemoBooking(payload) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(PENDING_BOOKING_KEY, JSON.stringify(payload));
}

export function getPendingDemoBooking() {
  if (typeof window === "undefined") return null;
  return safeJsonParse(window.sessionStorage.getItem(PENDING_BOOKING_KEY));
}

export function clearPendingDemoBooking() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(PENDING_BOOKING_KEY);
}

export function createDemoBookingFromForm(form, estimate = {}) {
  const now = new Date();
  const id = `demo-${now.getTime()}`;
  const startAt = form.date
    ? new Date(form.date)
    : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 3, 9, 0, 0);

  if (form.time) {
    const match = String(form.time).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (match) {
      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const period = match[3].toUpperCase();
      if (period === "PM" && hour !== 12) hour += 12;
      if (period === "AM" && hour === 12) hour = 0;
      startAt.setHours(hour, minute, 0, 0);
    }
  }

  const durationHours = Number(estimate.duration || 2.5);
  const endAt = new Date(startAt.getTime() + durationHours * 60 * 60 * 1000);
  const clientName = [form.firstName, form.lastName].filter(Boolean).join(" ") || "Demo Guest";
  const total = Number(estimate.total || 0);
  const depositAmount = total > 0 ? Math.min(50, total) : 0;

  const appointment = {
    id,
    clientId: "client-demo-new",
    clientName,
    serviceName: form.serviceName || form.service || "Residential Cleaning",
    service: form.serviceName || form.service || "Residential Cleaning",
    serviceSlug: form.service || "residential-cleaning",
    startAt: startAt.toISOString(),
    scheduledAt: startAt.toISOString(),
    date: startAt.toISOString(),
    endAt: endAt.toISOString(),
    durationHours,
    status: "pending",
    friendly: "Pending",
    frequency: form.frequency || "one-time",
    total,
    amount: total,
    cost: total,
    totalPrice: total,
    depositAmount,
    depositPaid: false,
    paidAmount: 0,
    amountPaid: 0,
    paymentStatus: "Unpaid",
    contact: {
      name: clientName,
      email: form.email || "demo.guest@example.com",
      phone: form.phone || "",
    },
    address: {
      line1: form.street || "",
      city: form.city || "",
      state: form.state || "",
      zip: form.zip || "",
      full: [form.street, form.city, form.state, form.zip].filter(Boolean).join(", "),
    },
    notes: [form.accessNotes, form.cleanerNotes].filter(Boolean).join(" "),
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };

  const invoice = {
    id: `inv-${id}`,
    invoiceNumber: `CP-DEMO-${String(now.getTime()).slice(-6)}`,
    appointmentId: id,
    clientId: appointment.clientId,
    clientName,
    clientAddress: appointment.address.full || "Demo address on file",
    clientEmail: appointment.contact.email,
    serviceAddress: appointment.address.full || "Demo address on file",
    serviceName: appointment.serviceName,
    appointmentDate: appointment.startAt,
    appointmentTime: formatAppointmentTime(appointment.startAt),
    frequency: appointment.frequency,
    status: "Unpaid",
    issueDate: now.toISOString(),
    dueDate: appointment.startAt,
    paidAt: null,
    subtotal: total,
    discount: 0,
    tax: 0,
    total,
    paidAmount: 0,
    amountPaid: 0,
    depositReceived: 0,
    amountDue: total,
    paymentStatus: "Unpaid",
    paymentMethod: "Not paid",
    lineItems: [
      {
        label: `${appointment.serviceName} - estimated service`,
        quantity: 1,
        unitPrice: total,
        amount: total,
      },
    ],
    cleanerNotes:
      appointment.notes ||
      "Review the booking form notes before arrival and confirm any access instructions.",
    terms:
      "Payment is due by the appointment date. Deposits are applied to the final balance. This frontend demo does not process payments.",
    notes: "Generated locally for the frontend demo. No data is stored.",
    createdAt: now.toISOString(),
  };

  return { appointment, invoice };
}

export function getAllDemoAppointments() {
  const pending = getPendingDemoBooking()?.appointment;
  return pending ? [pending, ...demoAppointments] : demoAppointments;
}

export function getAllDemoInvoices() {
  const pending = getPendingDemoBooking()?.invoice;
  return pending ? [pending, ...demoInvoices] : demoInvoices;
}
