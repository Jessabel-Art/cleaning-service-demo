import { demoAppointments } from "./demoAppointments";

function invoiceStatusForAppointment(appointment) {
  if (appointment.status === "cancelled") return "Cancelled";
  if (appointment.paidAmount >= appointment.total) return "Paid";
  if (appointment.paidAmount > 0) return "Partial";
  return "Unpaid";
}

function addDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function formatAppointmentTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "TBD"
    : date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function invoiceTerms(amountDue) {
  return amountDue > 0
    ? "Payment is due by the appointment date. Deposits are applied to the final balance. This frontend demo does not process payments."
    : "Paid in full. Thank you for choosing CleanPro Demo. This frontend demo does not process payments.";
}

export const demoInvoices = demoAppointments.slice(0, 12).map((appointment, index) => {
  const subtotal = Number(appointment.total || 0);
  const discount = appointment.frequency === "Weekly" ? Math.round(subtotal * 0.08) : 0;
  const total = subtotal - discount;
  const paidAmount = Math.min(Number(appointment.paidAmount || 0), total);
  const amountDue = Math.max(0, total - paidAmount);
  const depositReceived = appointment.depositPaid ? Number(appointment.depositAmount || 0) : 0;
  const status = invoiceStatusForAppointment({ ...appointment, total, paidAmount });
  const issueDate = addDays(appointment.startAt, -3);
  const serviceAddress = appointment.address?.full || appointment.addressLine || "Address on file";
  const clientAddress = appointment.address?.full || serviceAddress;

  return {
    id: `inv-${String(index + 1001)}`,
    invoiceNumber: `CP-${2026}-${String(index + 101).padStart(4, "0")}`,
    appointmentId: appointment.id,
    clientId: appointment.clientId,
    clientName: appointment.clientName,
    clientAddress,
    clientEmail: appointment.contact.email,
    serviceAddress,
    serviceName: appointment.serviceName,
    appointmentDate: appointment.startAt,
    appointmentTime: formatAppointmentTime(appointment.startAt),
    frequency: appointment.frequency,
    status,
    issueDate,
    dueDate: appointment.startAt,
    paidAt: amountDue === 0 ? addDays(appointment.startAt, 0) : null,
    subtotal,
    discount,
    tax: 0,
    total,
    paidAmount,
    amountPaid: paidAmount,
    depositReceived,
    amountDue,
    paymentStatus: status,
    paymentMethod:
      paidAmount === 0
        ? "Not paid"
        : appointment.depositPaid && paidAmount < total
        ? "Deposit on file"
        : "Card (demo)",
    lineItems: [
      {
        label: `${appointment.serviceName} - base service`,
        quantity: 1,
        unitPrice: subtotal,
        amount: subtotal,
      },
      ...(discount
        ? [
            {
              label: "Recurring service discount",
              quantity: 1,
              unitPrice: -discount,
              amount: -discount,
            },
          ]
        : []),
    ],
    cleanerNotes:
      appointment.notesForCleaner ||
      appointment.notes ||
      "Please complete the checklist for the selected service and confirm any access notes before arrival.",
    terms: invoiceTerms(amountDue),
    notes: "Demo invoice generated from local sample data. No payment is processed.",
    createdAt: issueDate,
  };
});

export function getDemoInvoiceById(invoiceId) {
  return demoInvoices.find((invoice) => invoice.id === invoiceId) || null;
}

export function getDemoInvoicesByClientId(clientId) {
  return demoInvoices.filter((invoice) => invoice.clientId === clientId);
}

export function getDemoInvoiceByAppointmentId(appointmentId) {
  return demoInvoices.find((invoice) => invoice.appointmentId === appointmentId) || null;
}
