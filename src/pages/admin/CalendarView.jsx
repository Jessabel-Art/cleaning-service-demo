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
  deleteDoc,
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
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import BlackoutModal from "./components/BlackoutModal";
import logoPrimary from "@/assets/logo/logo-primary.png";

/* --- convenience date helpers (same style as portal) --- */
function toDate(tsLike) {
  if (!tsLike) return null;
  if (typeof tsLike.toDate === "function") return tsLike.toDate();
  return new Date(tsLike);
}

function formatDate(tsLike) {
  const d = toDate(tsLike);
  if (!d || Number.isNaN(d.getTime())) return "TBD";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(tsLike) {
  const d = toDate(tsLike);
  if (!d || Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

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

// PLUM blackout styling (background + text)
const BLACKOUT_BG = "#431039";
const BLACKOUT_TEXT = "#FFFFFF";

// selected date background
const SELECT_BG = "#FFF7CC"; // pale pastel yellow

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

// Parse "YYYY-MM-DD" as a local date (NOT UTC)
const parseLocalDateString = (str) => {
  if (!str) return null;
  const [y, m, d] = String(str).split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};

/**
 * Local date key (YYYY-MM-DD) without UTC shifting.
 */
const dateKey = (d) => {
  const x = new Date(d);
  const year = x.getFullYear();
  const month = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Local date string for <input type="date" />, also avoiding UTC.
 */
const toInputDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/* --- calendar file helpers (for Add to calendar) --- */

function formatIcsDate(date) {
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
    `Amount: ${money(r.total ?? r.amount ?? r.cost ?? 0)}`,
    r.notesForCleaner || r.notes
      ? `Notes: ${r.notesForCleaner || r.notes}`
      : "",
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

/* convenience accessor like client side */
const getBookingField = (booking, keys, fallback = "Not specified") => {
  for (const key of keys) {
    const v = booking?.[key];
    if (v !== undefined && v !== null && v !== "") return v;
  }
  return fallback;
};

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

  // notes draft for modal
  const [notesDraft, setNotesDraft] = React.useState("");

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

  // when a new event is selected, seed notesDraft
  React.useEffect(() => {
    if (!selectedEvent) return;
    const r = selectedEvent.resource || {};
    const initialNotes =
      r.notesForCleaner || r.notes || r.specialInstructions || "";
    setNotesDraft(initialNotes || "");
  }, [selectedEvent]);

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
        start = parseLocalDateString(weekRange.start);
        end = parseLocalDateString(weekRange.end);
        if (!start || !end) {
          // fallback if something is weird
          start = startOfWeek(anchorDate, { weekStartsOn: 0 });
          end = addDays(start, 6);
        }
        end.setHours(23, 59, 59, 999);
      } else {
        // fallback to anchor week when no explicit weekRange provided
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
            r.durationMinutes ?? (r.durationHours ? r.durationHours * 60 : 120)
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

  // events by date for count badge
  const eventsByDate = React.useMemo(() => {
    const map = new Map();
    filteredEvents.forEach((ev) => {
      const key = dateKey(ev.start);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(ev);
    });
    return map;
  }, [filteredEvents]);

  const eventStyleGetter = (event) => {
    const status = String(event.resource?.status || "").toLowerCase();
    const bg = STATUS_COLORS[status] || "#e9d5ff";

    return {
      style: {
        backgroundColor: bg,
        borderRadius: 8,
        padding: "2px 6px",
        color: "#111",
        border: "1px solid rgba(0, 0, 0, 0.05)",
        position: "relative",
        zIndex: 5,
        fontSize: "11px",
        lineHeight: 1.2,
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

  // selected range converted to actual day keys (ONE day for a single click)
  const selectedDateKeys = React.useMemo(() => {
    const set = new Set();
    if (!selectedRange?.start || !selectedRange?.end) return set;

    const start = new Date(selectedRange.start);
    const endExclusive = new Date(selectedRange.end);

    let cur = new Date(start);
    cur.setHours(0, 0, 0, 0);

    const lastInclusive = new Date(endExclusive);
    lastInclusive.setDate(lastInclusive.getDate() - 1);
    lastInclusive.setHours(0, 0, 0, 0);

    while (cur <= lastInclusive) {
      set.add(dateKey(cur));
      cur = addDays(cur, 1);
    }
    return set;
  }, [selectedRange]);

  // Wrap the date cells so blackout + selected days tweak number color/bg
  const DateCellWrapper = ({ value, children, ...rest }) => {
    const key = dateKey(value);
    const isBlackout = blackoutDateKeys.has(key);
    const isSelected = selectedDateKeys.has(key);

    const child = React.Children.only(children);

    let className = child.props.className || "";
    if (isBlackout) className += " ss-blackout-datecell";
    if (isSelected) className += " ss-selected-datecell";

    return React.cloneElement(child, {
      ...rest,
      className: className.trim(),
    });
  };

  // Month view header: label + tiny count badge
  const MonthDateHeader = ({ label, date }) => {
    const key = dateKey(date);
    const isBlackout = blackoutDateKeys.has(key);
    const isSelected = selectedDateKeys.has(key);
    const dayEvents = eventsByDate.get(key) || [];
    const count = dayEvents.length;

    let labelNode;
    if (isBlackout) {
      labelNode = <span className="ss-blackout-dateheader">{label}</span>;
    } else if (isSelected) {
      labelNode = (
        <span className="font-semibold text-[#431039]">{label}</span>
      );
    } else {
      labelNode = <span>{label}</span>;
    }

    return (
      <div className="flex items-center justify-between w-full">
        {labelNode}
        {count > 0 && (
          <span
            className="ml-1 inline-flex items-center justify-center rounded-full text-[9px] leading-none px-1.5 py-0.5 font-semibold"
            style={{
              backgroundColor: "#E2A82B",
              color: "#431039",
            }}
          >
            {count}
          </span>
        )}
      </div>
    );
  };

  // PLUM blackout styling + yellow selection in the grid
  const dayPropGetter = (date) => {
    const key = dateKey(date);
    const isBlackout = blackoutDateKeys.has(key);
    const isSelected = selectedDateKeys.has(key);

    const style = {};
    let className = "";

    if (isBlackout) {
      className = "ss-blackout-day";
      style.backgroundColor = BLACKOUT_BG;
      style.color = BLACKOUT_TEXT;
    }

    if (isSelected) {
      if (!isBlackout) {
        style.backgroundColor = SELECT_BG;
      }
      style.boxShadow = "inset 0 0 0 2px #E2A82B";
    }

    return { className, style };
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
      description: `${start.toLocaleString()} – ${start.toLocaleTimeString(
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
      .filter((e) => {
        const s = e.start;
        return s >= start && s < end; // end exclusive
      })
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
    const start = new Date(today);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 1); // end-exclusive pattern

    setView("day");
    setAnchorDate(start);
    setDayInput(toInputDate(start));
    setSelectedRange({ start, end });
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

  const isShowingToday = React.useMemo(() => {
    try {
      if (view !== "day") return false;
      const todayIso = toInputDate(new Date());
      if (dayInput) return dayInput === todayIso;
      return toInputDate(anchorDate) === todayIso;
    } catch {
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
      if (r.notesForCleaner || r.notes)
        win.document.write(
          `<h3>Notes</h3><pre>${String(
            r.notesForCleaner || r.notes
          )}</pre>`
        );
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
      const startKey = dateKey(selectedRange.start);
      const endExclusive = new Date(selectedRange.end);
      const lastInclusive = new Date(endExclusive);
      lastInclusive.setDate(lastInclusive.getDate() - 1);
      const endKey = dateKey(lastInclusive);

      setBlackoutInitial({
        startDate: startKey,
        endDate: endKey,
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

    const start = parseLocalDateString(startDate);
    const end = parseLocalDateString(endDate || startDate);

    if (!start || !end) {
      toast({
        title: "Invalid blackout dates",
        description: "Could not parse the selected start or end date.",
        variant: "destructive",
      });
      return;
    }

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

    const start = parseLocalDateString(weekRange.start);
    const end = parseLocalDateString(weekRange.end);

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
    const d = parseLocalDateString(value);
    if (!d || Number.isNaN(d.getTime())) return;
    const start = new Date(d);
    start.setHours(0, 0, 0, 0);
    const end = addDays(start, 1); // end-exclusive

    setAnchorDate(start);
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

  // remove blackout helper
  const handleRemoveBlackout = async (blackout) => {
    if (!blackout?.id) return;

    const ok = window.confirm(
      "Remove this blackout and reopen these dates for bookings?"
    );
    if (!ok) return;

    try {
      await deleteDoc(doc(db, "blackouts", blackout.id));
      toast({
        title: "Blackout removed",
        description: "Those dates are now open again for bookings.",
      });
    } catch (e) {
      toast({
        title: "Could not remove blackout",
        description: String(e?.message || e),
        variant: "destructive",
      });
    }
  };

  // save notes + close modal
  const handleCloseDetails = async () => {
    if (selectedEvent) {
      const r = selectedEvent.resource || {};
      const originalNotes =
        r.notesForCleaner || r.notes || r.specialInstructions || "";
      const trimmed = (notesDraft || "").trim();

      if (trimmed !== (originalNotes || "")) {
        try {
          await updateDoc(doc(db, "bookings", selectedEvent.id), {
            notesForCleaner: trimmed,
            notes: trimmed,
            updatedAt: Timestamp.now(),
          });
          toast({
            title: "Notes updated",
            description: "Cleaner notes were saved to this appointment.",
          });
        } catch (e) {
          toast({
            title: "Could not save notes",
            description: String(e?.message || e),
            variant: "destructive",
          });
        }
      }
    }
    setSelectedEvent(null);
  };

  /* ---------- RENDER ---------- */
  return (
    <section>
      <style>{`
        .rbc-overlay { z-index: 60; }
        .rbc-event { padding: 2px 6px; }

        /* Time view tweaks */
        .rbc-time-view .rbc-time-slot { min-height: 18px; }

        /* Plum blackout background on the grid cells */
        .ss-blackout-day,
        .ss-blackout-day.rbc-day-bg {
          background-color: ${BLACKOUT_BG} !important;
        }

        /* Force the date number to white on blackout days */
        .ss-blackout-datecell,
        .ss-blackout-datecell .rbc-button-link,
        .ss-blackout-datecell span,
        .ss-blackout-datecell * {
          color: ${BLACKOUT_TEXT} !important;
        }

        /* Selected date label styling */
        .ss-selected-datecell .rbc-button-link {
          background-color: ${SELECT_BG} !important;
          border-radius: 4px;
          color: #431039 !important;
        }

        /* Built-in slot selection overlay when dragging */
        .rbc-slot-selection {
          background-color: rgba(226, 168, 43, 0.22) !important;
          border: 1px solid #E2A82B !important;
        }
        .rbc-selected-cell {
          background-color: ${SELECT_BG} !important;
        }

        /* White numbers in MONTH view date headers for blackout */
        .ss-blackout-dateheader {
          color: ${BLACKOUT_TEXT} !important;
        }

        /* Ensure events render above the blackout background layer */
        .rbc-month-view .rbc-row-content {
          position: relative;
          z-index: 2;
        }
        .rbc-month-view .rbc-day-bg {
          z-index: 1;
        }
        .rbc-month-view .rbc-event {
          position: relative;
          z-index: 5;
        }
      `}</style>

      {/* WIDTH CONTAINER: center and constrain overall width */}
      <div className="mx-auto w-full px-4" style={{ maxWidth: PAGE_MAX_W }}>
        {/* Top bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          {/* Left controls */}
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
          {/* Calendar */}
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
                setSelectedRange({
                  start: slot.start,
                  end: slot.end, // react-big-calendar gives end as exclusive
                })
              }
              eventPropGetter={eventStyleGetter}
              onEventDrop={onEventDrop}
              onEventResize={onEventResize}
              popup
              step={30}
              timeslots={2}
              toolbar={false}
              dayPropGetter={dayPropGetter}
              components={{
                dateCellWrapper: DateCellWrapper,
                month: { dateHeader: MonthDateHeader },
              }}
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
              {sidebarEvents.map((ev) => {
                const statusRaw = String(
                  ev.resource?.status || "pending"
                ).toLowerCase();
                const statusColor =
                  STATUS_COLORS[statusRaw] || STATUS_COLORS.pending;

                return (
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
                          {ev.resource?.contact?.name ??
                            ev.resource?.name ??
                            "—"}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span
                          className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-medium capitalize shadow-sm"
                          style={{
                            backgroundColor: statusColor,
                            color: "#431039",
                          }}
                        >
                          {statusRaw}
                        </span>

                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 px-3 text-[11px] rounded-full border-[#E5C2E5] text-[#431039] bg-white
                                  hover:bg-[#FFF1FA] hover:border-[#B34A87]
                                  active:bg-[#FBE7F5] active:translate-y-[1px] transition"
                          onClick={() => setSelectedEvent(ev)}
                        >
                          Details
                        </Button>

                        <Button
                          size="sm"
                          className="h-8 px-3 text-[11px] rounded-full bg-[#431039] text-white
                                  hover:bg-[#5B1A52]
                                  active:bg-[#310925] active:translate-y-[1px] transition"
                          onClick={() => navigate(`/book?bookingId=${ev.id}`)}
                        >
                          Reschedule
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
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
                  <ul className="space-y-1 text-xs">
                    {sidebarBlackouts.map((b) => {
                      const s = b.startAt?.toDate?.();
                      const e = b.endAt?.toDate?.() || s;
                      return (
                        <li
                          key={b.id}
                          className="px-2 py-1 border rounded flex items-start justify-between gap-2 bg-[#431039] text-white"
                        >
                          <div>
                            <div className="font-medium">
                              {s?.toLocaleDateString()} —{" "}
                              {e?.toLocaleDateString()}
                            </div>
                            <div>{b.reason || "Blocked time"}</div>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="text-[11px] px-2 py-1 border-white text-white hover:bg-white/10"
                            onClick={() => handleRemoveBlackout(b)}
                          >
                            Remove
                          </Button>
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

      {/* Booking details modal */}
      {selectedEvent && (
        <Dialog
          open={!!selectedEvent}
          onOpenChange={(open) => {
            if (!open) handleCloseDetails();
          }}
        >
          {(() => {
            const base = selectedEvent.resource || {};
            const b = { id: selectedEvent.id, ...base };

            const orderCode = `CI-${(b.id || "").slice(0, 5).toUpperCase()}`;

            const propertyType = getBookingField(b, [
              "propertyType",
              "homeType",
            ]);
            const bedrooms = getBookingField(
              b,
              ["bedrooms", "numBedrooms"],
              "—"
            );
            const bathrooms = getBookingField(
              b,
              ["bathrooms", "numBathrooms"],
              "—"
            );
            const conditionLevel = getBookingField(
              b,
              ["conditionLevel", "condition"],
              "Standard"
            );

            const petsValue = getBookingField(
              b,
              ["petsOnSite", "hasPets"],
              "No"
            );
            const pets =
              typeof petsValue === "boolean"
                ? petsValue
                  ? "Yes"
                  : "No"
                : petsValue;

            const fragrancePreference = getBookingField(
              b,
              ["fragrancePreference", "scentPreference"],
              "No preference"
            );

            const addOnsRaw =
              b.addOns || b.addons || b.addonList || b.selectedAddOns || [];
            const addOnsArray = Array.isArray(addOnsRaw)
              ? addOnsRaw
              : typeof addOnsRaw === "string"
              ? addOnsRaw
                  .split(",")
                  .map((x) => x.trim())
                  .filter(Boolean)
              : [];
            const addOns =
              addOnsArray.length > 0 ? addOnsArray.join(", ") : "None added";

            const startDate =
              toDate(b.startAt || b.date) || selectedEvent.start;
            const endDate = toDate(b.endAt) || selectedEvent.end;

            // normalize address into a string for safe rendering
            let address = "";

            if (b.address) {
              if (typeof b.address === "string") {
                address = b.address;
              } else if (typeof b.address === "object") {
                const parts = [
                  b.address.line1,
                  b.address.city,
                  b.address.state,
                  b.address.zip,
                ].filter(Boolean);
                address = parts.join(", ");
              }
            }

            if (!address && b.fullAddress && typeof b.fullAddress === "string") {
              address = b.fullAddress;
            }

            if (!address && (b.street || b.city)) {
              address = `${b.street || ""}${
                b.city ? (b.street ? `, ${b.city}` : b.city) : ""
              }`;
            }

            if (!address && b.address?.full && typeof b.address.full === "string") {
              address = b.address.full;
            }

            if (!address && b.address?.line1 && typeof b.address.line1 === "string") {
              address = b.address.line1;
            }

            if (!address) {
              address = "On file";
            }

            const frequency = getBookingField(
              b,
              ["frequency", "serviceFrequency"],
              "one-time"
            );

            const totalAmount =
              b.total ?? b.amount ?? b.cost ?? b.price ?? 0;

            const depositDue = Number(
              b.depositDue ??
                b.deposit ??
                b.depositAmount ??
                0
            );

            const statusRaw = String(b.status || "Pending");

            return (
              <DialogContent
                className="
                  max-w-xl sm:max-w-2xl
                  max-h-[85vh] overflow-y-auto
                  rounded-3xl p-5 sm:p-6
                  bg-white shadow-xl border border-plum/10
                "
              >
                <DialogHeader className="mb-4 space-y-4">
                  {/* Invoice-style header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={logoPrimary}
                        alt="Sanchez Services"
                        className="h-10 w-auto"
                      />
                      <div className="leading-tight text-xs text-plum/70">
                        <p className="font-semibold text-plum text-sm">
                          Sanchez Services
                        </p>
                        <p>Appointment summary</p>
                      </div>
                    </div>
                    <div className="text-right text-xs text-plum/60 space-y-1">
                      <p className="font-mono text-[11px]">
                        Order:{" "}
                        <span className="font-semibold">{orderCode}</span>
                      </p>
                      {startDate && (
                        <p>
                          {formatDate(startDate)}{" "}
                          {formatTime(startDate) && (
                            <>· {formatTime(startDate)}</>
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  <DialogTitle className="text-lg sm:text-xl text-plum">
                    Appointment details
                  </DialogTitle>
                </DialogHeader>

                {/* Body */}
                <div className="space-y-4 text-sm text-plum">
                  {/* Core info */}
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1">
                      <p className="font-semibold">Service</p>
                      <p>{b.serviceName || b.service || "Residential Cleaning"}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold">Status</p>
                      <p>{b.friendly || statusRaw}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold">Date / Time</p>
                      {startDate ? (
                        <p>
                          {formatDate(startDate)}{" "}
                          {formatTime(startDate) &&
                            `· ${formatTime(startDate)}`}
                          {endDate && (
                            <>
                              {" – "}
                              {formatTime(endDate)}
                            </>
                          )}
                        </p>
                      ) : (
                        <p>TBD</p>
                      )}
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold">Frequency</p>
                      <p>{frequency}</p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-semibold">Total</p>
                      <p>{money(totalAmount)}</p>
                    </div>

                    {depositDue > 0 && (
                      <div className="space-y-1">
                        <p className="font-semibold">Deposit due</p>
                        <p>{money(depositDue)}</p>
                      </div>
                    )}

                    <div className="space-y-1 sm:col-span-2">
                      <p className="font-semibold">Service address</p>
                      <p>{address}</p>
                    </div>
                  </div>

                  {/* Home & cleaning details */}
                  <div className="mt-2 border-t border-plum/10 pt-3 space-y-2">
                    <p className="font-semibold text-sm">
                      Home &amp; cleaning details
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2 text-sm">
                      <div>
                        <span className="text-plum/60 text-xs block">
                          Property type
                        </span>
                        <span>{propertyType}</span>
                      </div>
                      <div>
                        <span className="text-plum/60 text-xs block">
                          Bedrooms / Bathrooms
                        </span>
                        <span>
                          {bedrooms} bed · {bathrooms} bath
                        </span>
                      </div>
                      <div>
                        <span className="text-plum/60 text-xs block">
                          Condition level
                        </span>
                        <span>{conditionLevel}</span>
                      </div>
                      <div>
                        <span className="text-plum/60 text-xs block">
                          Pets on site
                        </span>
                        <span>{pets}</span>
                      </div>
                      <div>
                        <span className="text-plum/60 text-xs block">
                          Fragrance preference
                        </span>
                        <span>{fragrancePreference}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-plum/60 text-xs block">
                          Add-ons
                        </span>
                        <span>{addOns}</span>
                      </div>
                    </div>
                  </div>

                  {/* Notes (editable) */}
                  <div className="mt-2 border-t border-plum/10 pt-3 space-y-1">
                    <Label
                      htmlFor="appointment-notes-admin"
                      className="text-xs font-semibold text-plum"
                    >
                      Notes for your cleaner
                    </Label>
                    <Textarea
                      id="appointment-notes-admin"
                      rows={3}
                      className="resize-none text-sm"
                      placeholder="Gate codes, parking notes, pet instructions, or any last-minute changes."
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                    />
                    <p className="text-[11px] text-plum/50">
                      Changes you make here will be saved to this appointment
                      when you close.
                    </p>
                  </div>
                </div>

                <DialogFooter className="mt-6 flex flex-col sm:flex-row sm:justify-between gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="order-1 sm:order-none border-plum/40 text-plum hover:bg-plum/5"
                    onClick={handleCloseDetails}
                  >
                    Close
                  </Button>

                  <div className="flex flex-row gap-2 justify-end w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="outline"
                      className="border-plum/40 text-plum hover:bg-plum/5"
                      onClick={() => printEvent(selectedEvent)}
                    >
                      Print
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="border-plum/40 text-plum hover:bg-plum/5"
                      onClick={() => downloadCalendarFile(selectedEvent)}
                    >
                      Add to calendar
                    </Button>
                    <Button
                      type="button"
                      className="bg-[#431039] text-white hover:bg-[#5B1A52]"
                      onClick={() => {
                        navigate(`/book?bookingId=${selectedEvent.id}`);
                        // notes already handled on close
                        setSelectedEvent(null);
                      }}
                    >
                      Reschedule
                    </Button>
                  </div>
                </DialogFooter>
              </DialogContent>
            );
          })()}
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
