// src/pages/admin/CalendarView.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "@/lib/firebase";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
  where,
  Timestamp,
  updateDoc,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getApp } from "firebase/app";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";

import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import addMinutes from "date-fns/addMinutes";
import addDays from "date-fns/addDays";
import subDays from "date-fns/subDays";
import { enUS } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import BlackoutModal from "./components/BlackoutModal";

/* --- constants / helpers --- */
const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});
const DnDCalendar = withDragAndDrop(Calendar);

const STATUS_ORDER = ["pending", "confirmed", "declined", "completed"];
const STATUS_COLORS = {
  pending: "#fde68a", // soft yellow
  confirmed: "#bbf7d0", // soft green
  declined: "#fecaca", // soft red
  completed: "#F3E8FF", // soft plum
};

// neutral gray used for blackout days
const BLACKOUT_BG = "#E5E7EB";

const CAL_HEIGHT = 520;

/* WIDTH ADJUSTMENTS */
const PAGE_MAX_W = 1360; // overall dashboard max width
const SIDEBAR_W = 360; // fixed sidebar width (px)

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const money = (n) =>
  Number(n || 0).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
  });

const overlap = (aStart, aEnd, bStart, bEnd) => aStart < bEnd && aEnd > bStart;

const dateKey = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.toISOString().slice(0, 10);
};

const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
};

/* --- calendar file helpers (for Add to calendar) --- */

function formatIcsDate(date) {
  // UTC in basic format: 20251204T140000Z
  const iso = date.toISOString().replace(/[-:]/g, "");
  return iso.split(".")[0] + "Z";
}

function buildIcsForEvent(ev) {
  const r = ev.resource || {};

  const title =
    r.serviceName || r.service || ev.title || "Sanchez Services Appointment";

  const descriptionLines = [
    `Client: ${r.contact?.name || r.name || "—"}`,
    `Service: ${r.serviceName || r.service || "—"}`,
    `Amount: ${money(r.amount ?? r.cost ?? 0)}`,
    r.notes ? `Notes: ${r.notes}` : "",
  ].filter(Boolean);

  const description = descriptionLines.join("\\n").replace(/\r?\n/g, "\\n");

  const location = r.address?.line1 || r.address?.full || r.location || "";

  const dtStart = formatIcsDate(ev.start);
  const dtEnd = formatIcsDate(ev.end);
  const dtStamp = formatIcsDate(new Date());
  const uid = `${ev.id || "booking"}@sanchezservices`;

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Sanchez Services//Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title}`,
    location ? `LOCATION:${location.replace(/[\r\n]/g, " ")}` : "",
    `DESCRIPTION:${description}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");
}

function downloadCalendarFile(ev) {
  if (!ev?.start || !ev?.end) return;
  const ics = buildIcsForEvent(ev);
  const blob = new Blob([ics], {
    type: "text/calendar;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const safeTitle =
    (ev.resource?.serviceName || ev.resource?.service || "sanchez-booking")
      .toLowerCase()
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/^-+|-+$/g, "") || "sanchez-booking";

  const a = document.createElement("a");
  a.href = url;
  a.download = `${safeTitle}-${dateKey(ev.start)}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* --- main component --- */

export default function CalendarView() {
  const { toast } = useToast();
  const navigate = useNavigate();

  const now = React.useMemo(() => new Date(), []);

  // calendar UI state
  const [anchorDate, setAnchorDate] = React.useState(now);
  const [view, setView] = React.useState("month");

  // Month / Week / Day controls
  const [monthYear, setMonthYear] = React.useState({
    month: now.getMonth(),
    year: now.getFullYear(),
  });

  const [weekRange, setWeekRange] = React.useState({
    start: "",
    end: "",
  });

  const [dayInput, setDayInput] = React.useState(toInputDate(now));

  // status toggle filter
  const [statusFilter, setStatusFilter] = React.useState(
    () => new Set(STATUS_ORDER)
  );

  const [rows, setRows] = React.useState([]);
  const [selectedEvent, setSelectedEvent] = React.useState(null);
  const [selectedRange, setSelectedRange] = React.useState(null);

  // blackouts
  const [blackouts, setBlackouts] = React.useState([]);
  const [showBlackoutModal, setShowBlackoutModal] = React.useState(false);
  const [blackoutInitial, setBlackoutInitial] = React.useState(null);

  // admin gate
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [authReady, setAuthReady] = React.useState(false);

  // guards for toasts in StrictMode
  const adminWarnedRef = React.useRef(false);
  const subErrorWarnedRef = React.useRef(false);
  const blackoutErrorWarnedRef = React.useRef(false);

  // establish admin status (mirrors the rules)
  React.useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setIsAdmin(false);
        setAuthReady(true);
        return;
      }

      try {
        const app = getApp();
        // eslint-disable-next-line no-console
        console.log(
          "FB projectId:",
          app.options.projectId,
          "uid:",
          u.uid,
          "email:",
          u.email
        );
      } catch {}

      const allow = ["jessabel.santos@gmail.com", "sanchezservices24@yahoo.com"];
      const emailLower = String(u.email || "").toLowerCase();
      const inAllow = allow.includes(emailLower);

      let inAdmins = false;
      try {
        const docSnap = await getDoc(doc(db, "admins", u.uid));
        inAdmins = docSnap.exists();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("admins/{uid} lookup failed", e);
      }

      setIsAdmin(inAllow || inAdmins);
      setAuthReady(true);
      adminWarnedRef.current = false;
    });
    return () => unsub();
  }, []);

  // compute date range for both bookings + blackouts
  const currentRange = React.useMemo(() => {
    let from;
    let to;

    if (view === "month") {
      const { year, month } = monthYear;
      const start = new Date(year, month, 1);
      const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
      from = subDays(start, 7);
      to = addDays(end, 7);
    } else if (view === "week") {
      let start;
      let end;

      if (weekRange.start && weekRange.end) {
        start = new Date(weekRange.start);
        end = new Date(weekRange.end);
        end.setHours(23, 59, 59, 999);
      } else {
        start = startOfWeek(anchorDate, { weekStartsOn: 0 });
        end = addDays(start, 6);
        end.setHours(23, 59, 59, 999);
      }

      from = start;
      to = end;
    } else {
      // day view
      const base = dayInput ? new Date(dayInput) : anchorDate;
      const start = new Date(base);
      start.setHours(0, 0, 0, 0);
      const end = new Date(base);
      end.setHours(23, 59, 59, 999);
      from = start;
      to = end;
    }

    return { from, to };
  }, [view, monthYear, weekRange, dayInput, anchorDate]);

  // subscribe bookings ONLY when admin confirmed
  React.useEffect(() => {
    if (!authReady || !isAdmin) return;
    const { from, to } = currentRange;

    const qRef = query(
      collection(db, "bookings"),
      where("startAt", ">=", Timestamp.fromDate(from)),
      where("startAt", "<=", Timestamp.fromDate(to)),
      orderBy("startAt", "asc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        subErrorWarnedRef.current = false;
      },
      (err) => {
        if (subErrorWarnedRef.current) return;
        subErrorWarnedRef.current = true;

        // eslint-disable-next-line no-console
        console.error("Calendar subscription error", err, {
          user: auth.currentUser,
        });
        toast({
          title: "Could not load calendar",
          description:
            err?.code === "permission-denied"
              ? "This account is not recognized as admin for this project."
              : err?.message || String(err),
          variant: "destructive",
        });
      }
    );
    return () => unsub();
  }, [authReady, isAdmin, currentRange, toast]);

  // subscribe blackouts for same range
  React.useEffect(() => {
    if (!authReady || !isAdmin) return;
    const { from, to } = currentRange;

    const qRef = query(
      collection(db, "blackouts"),
      where("startAt", ">=", Timestamp.fromDate(from)),
      where("startAt", "<=", Timestamp.fromDate(to)),
      orderBy("startAt", "asc")
    );

    const unsub = onSnapshot(
      qRef,
      (snap) => {
        setBlackouts(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        blackoutErrorWarnedRef.current = false;
      },
      (err) => {
        if (blackoutErrorWarnedRef.current) return;
        blackoutErrorWarnedRef.current = true;

        // eslint-disable-next-line no-console
        console.error("Blackouts subscription error", err);
        toast({
          title: "Could not load blackouts",
          description: err?.message || String(err),
          variant: "destructive",
        });
      }
    );
    return () => unsub();
  }, [authReady, isAdmin, currentRange, toast]);

  // if auth known but not admin, show one precise message (once)
  React.useEffect(() => {
    if (!authReady) return;
    if (isAdmin) {
      adminWarnedRef.current = false;
      return;
    }
    if (adminWarnedRef.current) return;
    adminWarnedRef.current = true;

    const email = auth.currentUser?.email || "(not signed in)";
    toast({
      title: "Admin access required",
      description: `Signed in as ${email}. This account isn’t in /admins or the allowlist for this Firebase project.`,
      variant: "destructive",
    });
  }, [authReady, isAdmin, toast]);

  // map bookings to calendar events
  const events = React.useMemo(() => {
    return rows
      .map((r) => {
        const start = r.startAt?.toDate?.() ?? r.scheduledAt?.toDate?.();
        let end = r.endAt?.toDate?.();
        if (!end && start) {
          const minutes = Number(
            r.durationMinutes ??
              (r.durationHours ? r.durationHours * 60 : 120)
          );
          end = addMinutes(start, minutes);
        }
        if (!start || !end) return null;
        const title = `${r.serviceName || r.service || "Service"} — ${
          r.contact?.name || r.name || ""
        }`;
        return { id: r.id, title, start, end, resource: r };
      })
      .filter(Boolean);
  }, [rows]);

  // status color + filtering
  const filteredEvents = React.useMemo(() => {
    if (statusFilter.size === STATUS_ORDER.length) return events;
    return events.filter((e) =>
      statusFilter.has(String(e.resource?.status || "").toLowerCase())
    );
  }, [events, statusFilter]);

  const eventStyleGetter = (event) => {
    const status = String(event.resource?.status || "").toLowerCase();
    const bg = STATUS_COLORS[status] || "#e9d5ff";
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

  // blackout days: shade any day that has at least one blackout
  const blackoutDateKeys = React.useMemo(() => {
    const set = new Set();
    blackouts.forEach((b) => {
      const start = b.startAt?.toDate?.() || null;
      const end = b.endAt?.toDate?.() || start;
      if (!start || !end) return;
      const d = new Date(start);
      d.setHours(0, 0, 0, 0);
      const last = new Date(end);
      last.setHours(0, 0, 0, 0);
      let cur = d;
      while (cur <= last) {
        set.add(dateKey(cur));
        cur = addDays(cur, 1);
      }
    });
    return set;
  }, [blackouts]);

  const dayPropGetter = (date) => {
    const key = dateKey(date);
    if (blackoutDateKeys.has(key)) {
      return {
        style: {
          backgroundColor: BLACKOUT_BG, // neutral gray for blackout days
        },
      };
    }
    return {};
  };

  // collision detection for drag/resize
  const hasConflict = (candidate, allEvents) => {
    const sameDay = allEvents.filter(
      (e) => e.start.toDateString() === candidate.start.toDateString()
    );
    for (const e of sameDay) {
      if (e.id === candidate.id) continue;
      const st = String(e.resource?.status || "").toLowerCase();
      if (st === "declined" || st === "completed") continue;
      if (overlap(candidate.start, candidate.end, e.start, e.end)) return true;
    }
    return false;
  };

  const persistWhen = async (event, start, end) => {
    await updateDoc(doc(db, "bookings", event.id), {
      startAt: Timestamp.fromDate(start),
      endAt: Timestamp.fromDate(end),
      dateKey: start.toISOString().slice(0, 10),
      updatedAt: Timestamp.now(),
    });
    toast({
      title: "Rescheduled",
      description: `${start.toLocaleString()} – ${end.toLocaleTimeString(
        [],
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      )}`,
    });
  };

  const onEventDrop = async ({ event, start, end }) => {
    const candidate = { ...event, start, end };
    if (hasConflict(candidate, filteredEvents)) {
      toast({
        title: "Time conflict",
        description: "Overlaps another booking. Choose a different time.",
        variant: "destructive",
      });
      return;
    }
    try {
      await persistWhen(event, start, end);
    } catch (e) {
      toast({
        title: "Could not reschedule",
        description: String(e?.message || e),
        variant: "destructive",
      });
    }
  };

  const onEventResize = async ({ event, start, end }) => {
    const candidate = { ...event, start, end };
    if (hasConflict(candidate, filteredEvents)) {
      toast({
        title: "Time conflict",
        description: "Overlaps another booking.",
        variant: "destructive",
      });
      return;
    }
    try {
      await persistWhen(event, start, end);
    } catch (e) {
      toast({
        title: "Could not reschedule",
        description: String(e?.message || e),
        variant: "destructive",
      });
    }
  };

  // side list
  const sidebarEvents = React.useMemo(() => {
    if (!selectedRange) return [];
    const { start, end } = selectedRange;
    return filteredEvents
      .filter((e) => overlap(e.start, e.end, start, end))
      .sort((a, b) => a.start - b.start);
  }, [filteredEvents, selectedRange]);

  // side blackouts intersecting selected range
  const sidebarBlackouts = React.useMemo(() => {
    if (!selectedRange) return [];
    const { start, end } = selectedRange;
    return blackouts
      .filter((b) => {
        const s = b.startAt?.toDate?.();
        const e = b.endAt?.toDate?.() || s;
        if (!s || !e) return false;
        return overlap(s, e, start, end);
      })
      .sort(
        (a, b) => (a.startAt?.toMillis?.() || 0) - (b.startAt?.toMillis?.() || 0)
      );
  }, [blackouts, selectedRange]);

  const handleToday = () => {
    const today = new Date();
    // Ensure we jump to the day view focused on today
    setView('day');
    setAnchorDate(today);
    setSelectedRange(null);

    if (view === "month") {
      setMonthYear({
        month: today.getMonth(),
        year: today.getFullYear(),
      });
    } else if (view === "week") {
      const start = startOfWeek(today, { weekStartsOn: 0 });
      const end = addDays(start, 6);
      setWeekRange({
        start: toInputDate(start),
        end: toInputDate(end),
      });
    } else {
      setDayInput(toInputDate(today));
    }
  };

  const handleViewChange = (nextView) => {
    setView(nextView);
    setSelectedRange(null);

    if (nextView === "month") {
      setMonthYear({
        month: anchorDate.getMonth(),
        year: anchorDate.getFullYear(),
      });
    } else if (nextView === "week") {
      const start = startOfWeek(anchorDate, { weekStartsOn: 0 });
      const end = addDays(start, 6);
      setWeekRange({
        start: toInputDate(start),
        end: toInputDate(end),
      });
    } else {
      setDayInput(toInputDate(anchorDate));
    }
  };

  // Today is considered active only when we're in day view and the selected day is today.
  const isShowingToday = React.useMemo(() => {
    try {
      if (view !== 'day') return false;
      const todayIso = toInputDate(new Date());
      if (dayInput) return dayInput === todayIso;
      // fallback to anchorDate
      return toInputDate(anchorDate) === todayIso;
    } catch (e) {
      return false;
    }
  }, [view, dayInput, anchorDate]);

  const printEvent = (ev) => {
    try {
      const r = ev.resource || {};
      const win = window.open("", "_blank");
      if (!win) return;
      win.document.write(
        `<html><head><title>${ev.title}</title><style>body{font-family:Arial,Helvetica,sans-serif;padding:20px} h1{margin-bottom:8px}</style></head><body>`
      );
      win.document.write(`<h1>${ev.title}</h1>`);
      win.document.write(
        `<p><strong>Client:</strong> ${r.contact?.name || r.name || "—"}</p>`
      );
      win.document.write(
        `<p><strong>Service:</strong> ${r.serviceName || r.service || "—"}</p>`
      );
      win.document.write(
        `<p><strong>When:</strong> ${ev.start?.toLocaleString()} — ${ev.end?.toLocaleString()}</p>`
      );
      win.document.write(
        `<p><strong>Address:</strong> ${r.address?.line1 || "—"}</p>`
      );
      if (r.notes)
        win.document.write(`<h3>Notes</h3><pre>${String(r.notes)}</pre>`);
      win.document.write(`<p>Printed: ${new Date().toLocaleString()}</p>`);
      win.document.write("</body></html>");
      win.document.close();
      win.focus();
      win.print();
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("Print failed", e);
    }
  };

  const handleOpenBlackout = () => {
    if (selectedRange) {
      setBlackoutInitial({
        startDate: dateKey(selectedRange.start),
        endDate: dateKey(selectedRange.end),
        allDay: true,
        reason: "",
      });
    } else {
      const iso = dateKey(anchorDate);
      setBlackoutInitial({
        startDate: iso,
        endDate: iso,
        allDay: true,
        reason: "",
      });
    }
    setShowBlackoutModal(true);
  };

  const handleSaveBlackout = async (data) => {
    const { startDate, endDate, startTime, endTime, allDay, reason } = data;
    if (!startDate) return;

    const start = new Date(startDate);
    const end = new Date(endDate || startDate);

    if (allDay || !startTime) {
      start.setHours(0, 0, 0, 0);
    } else {
      const [hh, mm] = String(startTime)
        .split(":")
        .map((n) => parseInt(n || "0", 10));
      start.setHours(hh || 0, mm || 0, 0, 0);
    }

    if (allDay || !endTime) {
      end.setHours(23, 59, 59, 999);
    } else {
      const [eh, em] = String(endTime)
        .split(":")
        .map((n) => parseInt(n || "0", 10));
      end.setHours(eh || 23, em || 59, 59, 999);
    }

    try {
      await addDoc(collection(db, "blackouts"), {
        startAt: Timestamp.fromDate(start),
        endAt: Timestamp.fromDate(end),
        allDay: !!allDay,
        reason: reason?.trim() || "",
        createdAt: serverTimestamp ? serverTimestamp() : new Date(),
        createdBy: auth.currentUser?.uid || null,
      });

      toast({
        title: "Time blocked",
        description:
          "This range is now marked as blocked. Update the client booking form logic to respect blackouts if it doesn't already.",
      });
    } catch (e) {
      toast({
        title: "Could not save blackout",
        description: String(e?.message || e),
        variant: "destructive",
      });
    }
  };

  const handleWeekRangeApply = () => {
    if (!weekRange.start && !weekRange.end) {
      // treat as clear
      setWeekRange({ start: "", end: "" });
      setAnchorDate(now);
      setSelectedRange(null);
      return;
    }

    if (!weekRange.start || !weekRange.end) {
      toast({
        title: "Select both dates",
        description: "Choose a start and end date before applying the range.",
        variant: "destructive",
      });
      return;
    }

    const start = new Date(weekRange.start);
    const end = new Date(weekRange.end);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast({
        title: "Invalid dates",
        description: "One or both dates are not valid.",
        variant: "destructive",
      });
      return;
    }

    if (start > end) {
      toast({
        title: "Start after end",
        description: "The start date must be before the end date.",
        variant: "destructive",
      });
      return;
    }

    setAnchorDate(start);
    setSelectedRange(null);
  };

  const handleWeekRangeClear = () => {
    setWeekRange({ start: "", end: "" });
    setSelectedRange(null);
    setAnchorDate(now);
  };

  const handleDayChange = (value) => {
    setDayInput(value);
    if (!value) return;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return;
    setAnchorDate(d);
    // optional: select full day for sidebar
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d);
    end.setHours(23, 59, 59, 999);
    setSelectedRange({ start, end });
  };

  const handleMonthSelect = (monthIdx) => {
    setMonthYear((prev) => {
      const next = { ...prev, month: monthIdx };
      const d = new Date(next.year, next.month, 1);
      setAnchorDate(d);
      setSelectedRange(null);
      return next;
    });
  };

  const handleYearSelect = (yearValue) => {
    setMonthYear((prev) => {
      const next = { ...prev, year: yearValue };
      const d = new Date(next.year, next.month, 1);
      setAnchorDate(d);
      setSelectedRange(null);
      return next;
    });
  };

  const toggleStatus = (status) => {
    setStatusFilter((prev) => {
      const next = new Set(prev);
      if (next.has(status)) {
        next.delete(status);
      } else {
        next.add(status);
      }
      return next;
    });
  };

  // build small year window around current year
  const yearOptions = React.useMemo(() => {
    const base = now.getFullYear();
    return [base - 1, base, base + 1, base + 2];
  }, [now]);

  return (
    <section>
      {/* small CSS nips to improve readability */}
      <style>{`
        .rbc-overlay { z-index: 60; }
        .rbc-event { padding: 2px 6px; }
        .rbc-time-view .rbc-time-slot { min-height: 18px; }
      `}</style>

      {/* WIDTH CONTAINER: center and constrain overall width */}
      <div className="mx-auto w-full px-4" style={{ maxWidth: PAGE_MAX_W }}>
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* Left controls: depend on view */}
          <div className="flex flex-wrap items-center gap-3">
            {view === "month" && (
              <>
                <span className="text-sm text-plum font-medium">Month</span>
                <select
                  className="px-3 py-2 rounded-lg border bg-white text-sm"
                  value={monthYear.month}
                  onChange={(e) => handleMonthSelect(Number(e.target.value))}
                >
                  {MONTH_LABELS.map((label, idx) => (
                    <option key={label} value={idx}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  className="px-3 py-2 rounded-lg border bg-white text-sm"
                  value={monthYear.year}
                  onChange={(e) => handleYearSelect(Number(e.target.value))}
                >
                  {yearOptions.map((yr) => (
                    <option key={yr} value={yr}>
                      {yr}
                    </option>
                  ))}
                </select>
              </>
            )}

            {view === "week" && (
              <>
                <span className="text-sm text-plum font-medium">Week</span>
                <input
                  type="date"
                  value={weekRange.start}
                  onChange={(e) =>
                    setWeekRange((prev) => ({
                      ...prev,
                      start: e.target.value,
                    }))
                  }
                  className="px-3 py-2 rounded-lg border bg-white text-sm"
                  aria-label="Week start"
                />
                <span className="text-plum/70">to</span>
                <input
                  type="date"
                  value={weekRange.end}
                  onChange={(e) =>
                    setWeekRange((prev) => ({
                      ...prev,
                      end: e.target.value,
                    }))
                  }
                  className="px-3 py-2 rounded-lg border bg-white text-sm"
                  aria-label="Week end"
                />
                <Button
                  size="sm"
                  type="button"
                  className="text-xs bg-[#431039] text-white hover:bg-[#5a1750]"
                  onClick={handleWeekRangeApply}
                >
                  Apply
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  className="text-xs"
                  onClick={handleWeekRangeClear}
                >
                  Clear
                </Button>
              </>
            )}

            {view === "day" && (
              <>
                <span className="text-sm text-plum font-medium">Day</span>
                <input
                  type="date"
                  value={dayInput}
                  onChange={(e) => handleDayChange(e.target.value)}
                  className="px-3 py-2 rounded-lg border bg-white text-sm"
                  aria-label="Day"
                />
              </>
            )}

            <Button
              size="sm"
              className="bg-[#E2A82B] text-[#431039] hover:bg-[#F0BA3E] text-xs"
              type="button"
              onClick={handleOpenBlackout}
            >
              Block time
            </Button>
          </div>

          {/* Right controls: Today + view toggle */}
          <div className="flex items-center gap-2">
            <Button
              type="button"
              onClick={handleToday}
              variant="ghost"
              className={`text-xs px-3 py-1 rounded-full border ${
                isShowingToday
                  ? "bg-[#431039] text-white border-[#431039] shadow-sm"
                  : "bg-transparent text-[#431039] border-transparent hover:bg-white/70"
              }`}
            >
              Today
            </Button>

            <Button
              type="button"
              onClick={() => handleViewChange("month")}
              variant="ghost"
              className={`text-xs px-3 py-1 rounded-full border ${
                view === "month"
                  ? "bg-[#431039] text-white border-[#431039] shadow-sm"
                  : "bg-transparent text-[#431039] border-transparent hover:bg-white/70"
              }`}
            >
              Month
            </Button>
            <Button
              type="button"
              onClick={() => handleViewChange("week")}
              variant="ghost"
              className={`text-xs px-3 py-1 rounded-full border ${
                view === "week"
                  ? "bg-[#431039] text-white border-[#431039] shadow-sm"
                  : "bg-transparent text-[#431039] border-transparent hover:bg-white/70"
              }`}
            >
              Week
            </Button>
            <Button
              type="button"
              onClick={() => handleViewChange("day")}
              variant="ghost"
              className={`text-xs px-3 py-1 rounded-full border ${
                view === "day"
                  ? "bg-[#431039] text-white border-[#431039] shadow-sm"
                  : "bg-transparent text-[#431039] border-transparent hover:bg-white/70"
              }`}
            >
              Day
            </Button>
          </div>
        </div>

        {/* Legend with clickable status filters */}
        <div className="mb-2 text-xs text-plum/70 flex flex-wrap gap-4">
          {STATUS_ORDER.map((st) => {
            const active = statusFilter.has(st);
            return (
              <button
                key={st}
                type="button"
                onClick={() => toggleStatus(st)}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border transition ${
                  active
                    ? "bg-white border-[#E5C2E5] text-plum"
                    : "bg-transparent border-transparent text-plum/50 hover:bg-white/60"
                }`}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full"
                  style={{ background: STATUS_COLORS[st] }}
                />
                {st}
              </button>
            );
          })}
          <span className="inline-flex items-center gap-1 ml-4">
            <span
              className="inline-block w-3 h-3 rounded"
              style={{ background: BLACKOUT_BG }}
            />
            Blacked-out day
          </span>
        </div>

        {/* GRID: calendar + fixed-width sidebar */}
        <div
          className="grid grid-cols-1 md:grid-cols-[minmax(600px,1fr),360px] gap-4"
          style={{ alignItems: "start" }}
        >
          {/* Calendar card with solid white background */}
          <div
            className="bg-white border rounded-xl shadow-sm p-2"
            style={{ height: CAL_HEIGHT }}
          >
            <DnDCalendar
              localizer={localizer}
              events={filteredEvents}
              startAccessor="start"
              endAccessor="end"
              style={{ height: "100%" }}
              view={view}
              date={anchorDate}
              onView={handleViewChange}
              onNavigate={(d) => {
                setAnchorDate(d);
                setSelectedRange(null);
              }}
              selectable
              resizable
              onSelectEvent={(ev) => setSelectedEvent(ev)}
              onSelectSlot={(slot) =>
                setSelectedRange({ start: slot.start, end: slot.end })
              }
              eventPropGetter={eventStyleGetter}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
              popup
              step={30}
              timeslots={2}
              toolbar={false}
              dayPropGetter={dayPropGetter}
            />
          </div>

          {/* Sidebar */}
          <aside
            className="bg-white border rounded-lg p-3"
            style={{ width: SIDEBAR_W }}
          >
            <h3 className="font-semibold text-plum mb-2">Appointments</h3>
            {!selectedRange && (
              <div className="text-sm text-plum/70 mb-2">
                Select a date or drag over a range on the calendar to see
                appointments here.
              </div>
            )}
            {selectedRange && sidebarEvents.length === 0 && (
              <div className="text-sm text-plum/70 mb-2">
                No appointments in the selected range.
              </div>
            )}
            <ul className="space-y-2 mb-3">
              {sidebarEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="p-2 border rounded hover:bg-neutral-50"
                >
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <div className="font-medium">{ev.title}</div>
                      <div className="text-sm text-plum/70">
                        {ev.start.toLocaleString()} —{" "}
                        {ev.end.toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      <div className="text-sm text-plum/70">
                        {ev.resource?.contact?.name ?? "—"}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button size="sm" onClick={() => setSelectedEvent(ev)}>
                        Details
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate(`/book?bookingId=${ev.id}`)
                        }
                      >
                        Reschedule
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {selectedRange && (
              <>
                <h4 className="font-semibold text-plum mb-1 text-sm">
                  Blackouts in range
                </h4>
                {sidebarBlackouts.length === 0 ? (
                  <div className="text-xs text-plum/70">
                    No blackouts overlapping this range.
                  </div>
                ) : (
                  <ul className="space-y-1 text-xs text-plum/80">
                    {sidebarBlackouts.map((b) => {
                      const s = b.startAt?.toDate?.();
                      const e = b.endAt?.toDate?.() || s;
                      return (
                        <li
                          key={b.id}
                          className="px-2 py-1 border rounded"
                          style={{ background: BLACKOUT_BG }}
                        >
                          <div className="font-medium">
                            {s?.toLocaleDateString()} —{" "}
                            {e?.toLocaleDateString()}
                          </div>
                          <div>{b.reason || "Blocked time"}</div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </aside>
        </div>
      </div>

      {selectedEvent && (
        <Dialog
          open={!!selectedEvent}
          onOpenChange={() => setSelectedEvent(null)}
        >
          <DialogContent className="sm:max-w-lg bg-white text-plum border border-plum/10 shadow-2xl rounded-2xl">
            <DialogHeader>
              <h3 className="text-lg font-semibold">{selectedEvent.title}</h3>
            </DialogHeader>
            <div className="mt-2 space-y-1 text-sm">
              <p>
                <b>Client:</b>{" "}
                {selectedEvent.resource?.contact?.name ??
                  selectedEvent.resource?.name ??
                  "—"}
              </p>
              <p>
                <b>Service:</b>{" "}
                {selectedEvent.resource?.serviceName ??
                  selectedEvent.resource?.service ??
                  "—"}
              </p>
              <p>
                <b>When:</b> {selectedEvent.start?.toLocaleString()} —{" "}
                {selectedEvent.end?.toLocaleString()}
              </p>
              <p>
                <b>Amount:</b>{" "}
                {money(
                  selectedEvent.resource?.amount ??
                    selectedEvent.resource?.cost ??
                    0
                )}
              </p>
              <p>
                <b>Status:</b> {selectedEvent.resource?.status}
              </p>
              <p>
                <b>Address:</b>{" "}
                {selectedEvent.resource?.address?.line1 ?? "—"}
              </p>
            </div>
            <DialogFooter>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  onClick={() => setSelectedEvent(null)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => printEvent(selectedEvent)}
                >
                  Print
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadCalendarFile(selectedEvent)}
                >
                  Add to calendar
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

      {/* Blackout modal */}
      <BlackoutModal
        open={showBlackoutModal}
        onOpenChange={setShowBlackoutModal}
        initialValue={blackoutInitial}
        onSave={handleSaveBlackout}
      />
    </section>
  );
}
