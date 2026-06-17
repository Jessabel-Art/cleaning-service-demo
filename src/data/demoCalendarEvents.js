import { demoAppointments } from "./demoAppointments";

export const demoCalendarEvents = [
  ...demoAppointments.slice(0, 15).map((appointment) => ({
    id: `event-${appointment.id}`,
    appointmentId: appointment.id,
    clientId: appointment.clientId,
    title: `${appointment.clientName} - ${appointment.serviceName}`,
    start: appointment.startAt,
    end: appointment.endAt,
    status: appointment.status,
    type: "appointment",
    location: appointment.address.full || appointment.addressLine,
    notes: appointment.notes,
    resource: appointment,
  })),
  {
    id: "event-block-001",
    title: "Supply restock and vehicle prep",
    start: "2026-06-20T15:00:00",
    end: "2026-06-20T16:30:00",
    status: "blocked",
    type: "internal",
    location: "Operations office",
    notes: "Demo internal calendar block.",
  },
  {
    id: "event-block-002",
    title: "Team training",
    start: "2026-06-24T15:00:00",
    end: "2026-06-24T17:00:00",
    status: "blocked",
    type: "internal",
    location: "CleanPro Demo office",
    notes: "Quarterly customer experience training.",
  },
  {
    id: "event-block-003",
    title: "Estimate follow-up calls",
    start: "2026-06-25T13:00:00",
    end: "2026-06-25T14:00:00",
    status: "blocked",
    type: "internal",
    location: "Remote",
    notes: "Demo sales follow-up block.",
  },
];

export function getCalendarEventsForRange(startDate, endDate) {
  const start = startDate ? new Date(startDate) : null;
  const end = endDate ? new Date(endDate) : null;

  return demoCalendarEvents.filter((event) => {
    const eventStart = new Date(event.start);
    if (start && eventStart < start) return false;
    if (end && eventStart > end) return false;
    return true;
  });
}
