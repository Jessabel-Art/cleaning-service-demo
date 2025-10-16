// src/pages/owner/CalendarView.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { db } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  updateDoc,
  doc,
} from "firebase/firestore";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import addMinutes from "date-fns/addMinutes";
import isBefore from "date-fns/isBefore";
import isAfter from "date-fns/isAfter";
import isWithinInterval from "date-fns/isWithinInterval";
import addDays from "date-fns/addDays";
import subDays from "date-fns/subDays";
import { enUS } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

// ---- date-fns localizer ----
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// DnD wrapper
const DnDCalendar = withDragAndDrop(Calendar);

// ---- helpers ----
const money = (n) =>
  Number(n || 0).toLocaleString(undefined, { style: "currency", currency: "USD" });

const overlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

const STATUS_ORDER = ["pending", "confirmed", "declined", "completed"];
const STATUS_COLORS = {
  pending: "#fde68a",   // amber-200
  confirmed: "#bbf7d0", // green-200
  declined: "#fecaca",  // rose-200
  completed: "#e5e7eb"  // gray-200
};

// compute the calendar's date range given current view and date anchor
function visibleRange(view, anchorDate) {
  const d = new Date(anchorDate);
  if (view === "day") {
    const start = new Date(d); start.setHours(0,0,0,0);
    const end = new Date(d);   end.setHours(23,59,59,999);
    return { start, end };
  }
  if (view === "week") {
    const start = startOfWeek(d, { weekStartsOn: 0 });
    const end = addDays(start, 6);
    end.setHours(23,59,59,999);
    return { start, end };
  }
  // month
  const start = new Date(d.getFullYear(), d.getMonth(), 1, 0,0,0,0);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23,59,59,999);
  return { start, end };
}

export function CalendarView() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [anchorDate, setAnchorDate] = React.useState(new Date());
  const [view, setView] = React.useState("month"); // 'month' | 'week' | 'day'
  const [statusFilter, setStatusFilter] = React.useState(new Set(["pending","confirmed","declined","completed"]));
  const [rows, setRows] = React.useState([]);
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [selectedRange, setSelectedRange] = React.useState(null);

  // ----- subscribe only to visible range (+ buffer) -----
  React.useEffect(() => {
    const { start, end } = visibleRange(view, anchorDate);
    // buffer to avoid snapping while dragging across edges
    const from = subDays(start, 7);
    const to = addDays(end, 7);

    const qRef = query(
      collection(db, "bookings"),
      where("startAt", ">=", Timestamp.fromDate(from)),
      where("startAt", "<=", Timestamp.fromDate(to)),
      orderBy("startAt", "asc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRows(data);
      },
      (err) => {
        console.error("Calendar subscription error", err);
        toast({
          title: "Could not load calendar",
          description: err.message || String(err),
          variant: "destructive",
        });
      }
    );
    return () => unsub();
  }, [view, anchorDate, toast]);

  // ----- normalize into calendar events -----
  const events = React.useMemo(() => {
    return rows
      .map((r) => {
        const start = r.startAt?.toDate?.() ?? r.scheduledAt?.toDate?.();
        let end = r.endAt?.toDate?.();
        if (!end && start) {
          const minutes = Number(
            r.durationMinutes ?? (r.durationHours ? r.durationHours * 60 : 120)
          );
          end = addMinutes(start, minutes);
        }
        if (!start || !end) return null;

        const title = `${r.serviceName || r.service || "Service"} — ${r.contact?.name || r.name || ""}`;
        return { id: r.id, title, start, end, resource: r };
      })
      .filter(Boolean);
  }, [rows]);

  // ----- apply status filtering -----
  const filteredEvents = React.useMemo(() => {
    if (statusFilter.size === STATUS_ORDER.length) return events;
    return events.filter((e) => statusFilter.has(String(e.resource?.status || "").toLowerCase()));
  }, [events, statusFilter]);

  // ----- styles -----
  const eventStyleGetter = (event) => {
    const status = String(event.resource?.status || "").toLowerCase();
    const bg = STATUS_COLORS[status] || "#e9d5ff"; // fallback lilac
    return {
      style: {
        backgroundColor: bg,
        borderRadius: 8,
        padding: "2px 6px",
        color: "#111",
        border: "1px solid rgba(0,0,0,0.05)",
      },
    };
  };

  // ----- conflict detection (local) -----
  const hasConflict = (candidate, allEvents) => {
    const sameDay = allEvents.filter((e) =>
      // cheap reject for other dates
      e.start.toDateString() === candidate.start.toDateString()
    );
    for (const e of sameDay) {
      if (e.id === candidate.id) continue;
      // treat only confirmed/pending as blocking
      const st = String(e.resource?.status || "").toLowerCase();
      if (st === "declined" || st === "completed") continue;
      if (overlap(candidate.start, candidate.end, e.start, e.end)) return true;
    }
    return false;
  };

  // ----- persist new time (DnD) -----
  const persistWhen = async (event, start, end) => {
    try {
      const payload = {
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),
        dateKey: start.toISOString().slice(0, 10),
        updatedAt: Timestamp.now(),
      };
      await updateDoc(doc(db, "bookings", event.id), payload);
      toast({ title: "Rescheduled", description: `${start.toLocaleString()} – ${end.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` });
    } catch (e) {
      toast({ title: "Could not reschedule", description: String(e?.message || e), variant: "destructive" });
      // rely on the realtime listener to reset the view
      throw e;
    }
  };

  const onEventDrop = async ({ event, start, end }) => {
    const candidate = { ...event, start, end };
    if (hasConflict(candidate, filteredEvents)) {
      toast({ title: "Time conflict", description: "Overlaps another booking. Choose a different time.", variant: "destructive" });
      return;
    }
    await persistWhen(event, start, end);
  };

  const onEventResize = async ({ event, start, end }) => {
    const candidate = { ...event, start, end };
    if (hasConflict(candidate, filteredEvents)) {
      toast({ title: "Time conflict", description: "Overlaps another booking.", variant: "destructive" });
      return;
    }
    await persistWhen(event, start, end);
  };

  // ----- UI handlers -----
  const goToday = () => setAnchorDate(new Date());
  const jumpToDate = (e) => {
    const v = e.target.value; // yyyy-mm-dd
    if (!v) return;
    const d = new Date(v);
    setAnchorDate(d);
  };

  // sidebar events for selected range
  const sidebarEvents = React.useMemo(() => {
    if (!selectedRange) return [];
    const { start, end } = selectedRange;
    return filteredEvents
      .filter((e) => overlap(e.start, e.end, start, end))
      .sort((a, b) => a.start - b.start);
  }, [filteredEvents, selectedRange]);

  // printing
  const printEvent = (ev) => {
    try {
      const r = ev.resource || {};
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(`<html><head><title>${ev.title}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px} h1{margin-bottom:8px}</style></head><body>`);
      win.document.write(`<h1>${ev.title}</h1>`);
      win.document.write(`<p><strong>Client:</strong> ${r.contact?.name || r.name || "—"}</p>`);
      win.document.write(`<p><strong>Service:</strong> ${r.serviceName || r.service || "—"}</p>`);
      win.document.write(`<p><strong>When:</strong> ${ev.start?.toLocaleString()} — ${ev.end?.toLocaleString()}</p>`);
      win.document.write(`<p><strong>Address:</strong> ${r.address?.line1 || "—"}</p>`);
      if (r.notes) win.document.write(`<h3>Notes</h3><pre>${String(r.notes)}</pre>`);
      win.document.write(`<p>Printed: ${new Date().toLocaleString()}</p>`);
      win.document.write("</body></html>");
      win.document.close();
      win.focus();
      win.print();
    } catch (e) {
      console.error("Print failed", e);
    }
  };

  return (
    <section>
      {/* Top bar: range + view controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-sm text-plum font-medium">Range</label>
          <Button variant="outline" onClick={goToday}>Today</Button>
          <input
            type="date"
            onChange={jumpToDate}
            className="px-3 py-2 rounded-lg border bg-white text-sm"
            aria-label="Go to date"
          />

          {/* Status filters */}
          <div className="ml-2 flex flex-wrap gap-2">
            {STATUS_ORDER.map((st) => {
              const active = statusFilter.has(st);
              return (
                <button
                  key={st}
                  onClick={() => {
                    const next = new Set(statusFilter);
                    active ? next.delete(st) : next.add(st);
                    setStatusFilter(next);
                  }}
                  className={[
                    "px-2.5 py-1 rounded-full border text-sm",
                    active ? "bg-white" : "bg-gray-50",
                  ].join(" ")}
                  style={{ borderColor: "rgba(0,0,0,0.15)" }}
                  aria-pressed={active}
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full mr-2 align-middle"
                    style={{ background: STATUS_COLORS[st] }}
                  />
                  {st[0].toUpperCase() + st.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button onClick={() => setView("month")} variant={view === "month" ? "default" : "ghost"}>
            Month
          </Button>
          <Button onClick={() => setView("week")} variant={view === "week" ? "default" : "ghost"}>
            Week
          </Button>
          <Button onClick={() => setView("day")} variant={view === "day" ? "default" : "ghost"}>
            Day
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="mb-2 text-xs text-plum/70 flex flex-wrap gap-4">
        {STATUS_ORDER.map((st) => (
          <span key={st} className="inline-flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ background: STATUS_COLORS[st] }} />
            {st}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[2fr,1fr] gap-4">
        <div style={{ height: 560 }}>
          <DnDCalendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            view={view}
            date={anchorDate}
            onView={(v) => setView(v)}
            onNavigate={(d /*Date*/) => setAnchorDate(d)}
            onRangeChange={(range) => {
              // react-big-calendar will call this when the range visibly changes; we don't need to store
              // anything here because we already subscribe using (view, anchorDate)
            }}
            selectable
            resizable
            onSelectEvent={(ev) => setSelectedEvent(ev)}
            onSelectSlot={(slot) => setSelectedRange({ start: slot.start, end: slot.end })}
            eventPropGetter={eventStyleGetter}
            onEventDrop={onEventDrop}
            onEventResize={onEventResize}
            popup
            step={30}
            timeslots={2}
            toolbar={false}
          />
        </div>

        {/* Sidebar */}
        <aside className="bg-white border rounded-lg p-3">
          <h3 className="font-semibold text-plum mb-2">Appointments</h3>
          {!selectedRange && (
            <div className="text-sm text-plum/70 mb-2">
              Select a date or drag over a range on the calendar to see appointments here.
            </div>
          )}
          {selectedRange && sidebarEvents.length === 0 && (
            <div className="text-sm text-plum/70">No appointments in the selected range.</div>
          )}
          <ul className="space-y-2">
            {sidebarEvents.map((ev) => (
              <li key={ev.id} className="p-2 border rounded hover:bg-neutral-50">
                <div className="flex justify-between items-start gap-3">
                  <div>
                    <div className="font-medium">{ev.title}</div>
                    <div className="text-sm text-plum/70">
                      {ev.start.toLocaleString()} —{" "}
                      {ev.end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </div>
                    <div className="text-sm text-plum/70">
                      {ev.resource?.contact?.name ?? "—"}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm" onClick={() => setSelectedEvent(ev)}>Details</Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        navigate(`/book?bookingId=${ev.id}`);
                      }}
                    >
                      Reschedule
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>
      </div>

      {/* Details dialog */}
      {selectedEvent && (
        <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
          <DialogContent>
            <DialogHeader>
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
            </DialogHeader>

            <div className="mt-2 space-y-1 text-sm">
              <p><b>Client:</b> {selectedEvent.resource?.contact?.name ?? selectedEvent.resource?.name ?? "—"}</p>
              <p><b>Service:</b> {selectedEvent.resource?.serviceName ?? selectedEvent.resource?.service ?? "—"}</p>
              <p>
                <b>When:</b> {selectedEvent.start?.toLocaleString()} — {selectedEvent.end?.toLocaleString()}
              </p>
              <p><b>Amount:</b> {money(selectedEvent.resource?.amount ?? selectedEvent.resource?.cost ?? 0)}</p>
              <p><b>Status:</b> {selectedEvent.resource?.status}</p>
              <p><b>Address:</b> {selectedEvent.resource?.address?.line1 ?? "—"}</p>
              {selectedEvent.resource?.contact?.email && (
                <p>
                  <b>Email:</b>{" "}
                  <a className="underline" href={`mailto:${selectedEvent.resource.contact.email}`}>
                    {selectedEvent.resource.contact.email}
                  </a>
                </p>
              )}
              {selectedEvent.resource?.contact?.phone && (
                <p>
                  <b>Phone:</b>{" "}
                  <a className="underline" href={`tel:${selectedEvent.resource.contact.phone}`}>
                    {selectedEvent.resource.contact.phone}
                  </a>
                </p>
              )}
              {selectedEvent.resource?.address?.line1 && (
                <p>
                  <b>Map:</b>{" "}
                  <a
                    className="underline"
                    target="_blank"
                    rel="noreferrer"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      selectedEvent.resource.address.line1
                    )}`}
                  >
                    Open in Maps
                  </a>
                </p>
              )}

              {selectedEvent.resource?.notes && (
                <div className="mt-3">
                  <h4 className="font-semibold">Notes</h4>
                  <pre className="whitespace-pre-wrap">{String(selectedEvent.resource.notes)}</pre>
                </div>
              )}
            </div>

            <DialogFooter>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
                <Button variant="outline" onClick={() => printEvent(selectedEvent)}>
                  Print
                </Button>
                <Button
                  className="bg-plum text-white"
                  onClick={() => {
                    navigate(`/book?bookingId=${selectedEvent.id}`);
                    setSelectedEvent(null);
                  }}
                >
                  Reschedule
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </section>
  );
}
