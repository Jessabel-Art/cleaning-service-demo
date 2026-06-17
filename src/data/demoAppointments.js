import { getDemoClientById } from "./demoClients";

const appointmentSeeds = [
  ["apt-1001", "client-004", "Residential Cleaning", "residential-cleaning", "2026-06-18T09:00:00", 3, "confirmed", 180, 50, true, "Weekly", "Focus on kitchen, bathrooms, and playroom."],
  ["apt-1002", "client-001", "Residential Cleaning", "residential-cleaning", "2026-06-18T13:00:00", 2.5, "confirmed", 165, 50, true, "Biweekly", "Use fragrance-free products upstairs."],
  ["apt-1003", "client-006", "Deep Clean", "deep-clean", "2026-06-19T11:00:00", 4, "pending", 285, 75, false, "One-time", "Historic trim; avoid abrasive cleaners."],
  ["apt-1004", "client-005", "Office Cleaning", "office-cleaning", "2026-06-19T15:00:00", 2, "confirmed", 210, 0, true, "Weekly", "Clean conference room first."],
  ["apt-1005", "client-008", "Deep Clean", "deep-clean", "2026-06-20T09:00:00", 4.5, "confirmed", 320, 75, true, "Biweekly", "Two cats; upholstery lint pass."],
  ["apt-1006", "client-002", "Deep Clean", "deep-clean", "2026-06-21T11:00:00", 3.5, "pending", 245, 50, false, "Monthly", "Morning arrival preferred."],
  ["apt-1007", "client-009", "Residential Cleaning", "residential-cleaning", "2026-06-22T09:00:00", 3, "confirmed", 195, 50, true, "Biweekly", "Use side entrance."],
  ["apt-1008", "client-003", "Move-In/Move-Out", "move-in-move-out", "2026-06-22T13:00:00", 5, "confirmed", 410, 100, true, "One-time", "Vacant property; lockbox available."],
  ["apt-1009", "client-010", "Move-In/Move-Out", "move-in-move-out", "2026-06-23T13:00:00", 4.5, "pending", 360, 100, false, "One-time", "Include oven and refrigerator."],
  ["apt-1010", "client-007", "Residential Cleaning", "residential-cleaning", "2026-06-24T11:00:00", 2.5, "confirmed", 155, 50, true, "One-time", "Avoid calling before noon."],
  ["apt-1011", "client-004", "Residential Cleaning", "residential-cleaning", "2026-06-25T09:00:00", 3, "confirmed", 180, 50, true, "Weekly", "Routine weekly service."],
  ["apt-1012", "client-001", "Residential Cleaning", "residential-cleaning", "2026-06-26T09:00:00", 2.5, "confirmed", 165, 50, true, "Biweekly", "Change sheets in primary bedroom."],
  ["apt-1013", "client-006", "Deep Clean", "deep-clean", "2026-06-14T11:00:00", 4, "completed", 285, 75, true, "One-time", "Completed deep clean and interior windows."],
  ["apt-1014", "client-008", "Deep Clean", "deep-clean", "2026-06-09T09:00:00", 4.5, "completed", 320, 75, true, "Biweekly", "Completed kitchen detail."],
  ["apt-1015", "client-005", "Office Cleaning", "office-cleaning", "2026-06-11T15:00:00", 2, "completed", 210, 0, true, "Weekly", "Completed studio reset."],
  ["apt-1016", "client-002", "Deep Clean", "deep-clean", "2026-06-04T11:00:00", 3.5, "completed", 245, 50, true, "Monthly", "Completed bathrooms and baseboards."],
  ["apt-1017", "client-010", "Move-In/Move-Out", "move-in-move-out", "2026-06-03T13:00:00", 4.5, "completed", 360, 100, true, "One-time", "Completed move-out cleaning."],
  ["apt-1018", "client-007", "Residential Cleaning", "residential-cleaning", "2026-05-24T13:00:00", 2.5, "cancelled", 155, 50, false, "One-time", "Cancelled by client."],
];

function addHours(value, hours) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() + hours * 60);
  return date.toISOString();
}

export const demoAppointments = appointmentSeeds.map(
  ([id, clientId, serviceName, serviceSlug, startAt, durationHours, status, total, depositAmount, depositPaid, frequency, notes]) => {
    const client = getDemoClientById(clientId);
    const paidAmount =
      status === "completed" || depositPaid
        ? status === "completed"
          ? total
          : depositAmount
        : 0;

    return {
      id,
      clientId,
      clientName: client?.name || "Demo Client",
      serviceName,
      service: serviceName,
      serviceSlug,
      startAt,
      scheduledAt: startAt,
      date: startAt,
      endAt: addHours(startAt, durationHours),
      durationHours,
      status,
      friendly: status.charAt(0).toUpperCase() + status.slice(1),
      frequency,
      total,
      amount: total,
      cost: total,
      totalPrice: total,
      depositAmount,
      depositPaid,
      paidAmount,
      amountPaid: paidAmount,
      paymentStatus:
        status === "cancelled"
          ? "Cancelled"
          : paidAmount >= total
          ? "Paid"
          : paidAmount > 0
          ? "Partial"
          : "Unpaid",
      contact: {
        name: client?.name || "Demo Client",
        email: client?.email || "",
        phone: client?.phone || "",
      },
      address: {
        line1: client?.addressLine1 || "",
        city: client?.city || "",
        state: client?.state || "",
        zip: client?.zip || "",
        full: client?.addressSummary || "",
      },
      addressLine: client?.addressSummary || "",
      notes,
      notesForCleaner: notes,
      createdAt: "2026-05-20T10:00:00",
      updatedAt: "2026-06-12T10:00:00",
    };
  }
);

export function getDemoAppointmentById(appointmentId) {
  return demoAppointments.find((appointment) => appointment.id === appointmentId) || null;
}

export function getDemoAppointmentsByClientId(clientId) {
  return demoAppointments.filter((appointment) => appointment.clientId === clientId);
}
