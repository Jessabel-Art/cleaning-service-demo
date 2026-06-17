import React, { useMemo, useState } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import { enUS } from "date-fns/locale";
import { CalendarDays, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CalendarExportButtons from "@/components/calendar/CalendarExportButtons";
import { demoCalendarEvents } from "@/data/demoCalendarEvents";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales: { "en-US": enUS },
});

const statusColors = {
  pending: "#eab308",
  confirmed: "#22c55e",
  completed: "#3A9FDF",
  cancelled: "#f97316",
  blocked: "#0B283D",
};

function money(value) {
  return Number(value || 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export default function CalendarView() {
  const [selectedEvent, setSelectedEvent] = useState(null);

  const events = useMemo(
    () =>
      demoCalendarEvents.map((event) => ({
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      })),
    []
  );

  const upcoming = useMemo(
    () =>
      events
        .filter((event) => event.start >= new Date())
        .sort((a, b) => a.start - b.start)
        .slice(0, 6),
    [events]
  );

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-2xl font-semibold text-plum">Calendar</h2>
        <p className="text-sm text-plum/70">
          Demo schedule populated from local sample appointments.
        </p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="bg-white border-plum/10">
          <CardContent className="p-3 sm:p-4">
            <div className="h-[620px]">
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                defaultView="week"
                views={["month", "week", "day", "agenda"]}
                onSelectEvent={setSelectedEvent}
                eventPropGetter={(event) => ({
                  style: {
                    backgroundColor: statusColors[event.status] || "#3A9FDF",
                    color: "#fff",
                    border: "none",
                    borderRadius: 6,
                    padding: "2px 4px",
                  },
                })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card className="bg-white border-plum/10">
            <CardHeader>
              <CardTitle className="text-plum flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-gold" />
                Upcoming jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {upcoming.map((event) => (
                <button
                  type="button"
                  key={event.id}
                  onClick={() => setSelectedEvent(event)}
                  className="w-full text-left rounded-xl border border-plum/10 bg-plum/5 p-3 hover:border-gold/40"
                >
                  <p className="font-medium text-plum">{event.title}</p>
                  <p className="text-xs text-plum/70">
                    {event.start.toLocaleDateString()} at{" "}
                    {event.start.toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-white border-plum/10">
            <CardHeader>
              <CardTitle className="text-plum">Event details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-plum/80">
              {selectedEvent ? (
                <>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-plum/50">Title</p>
                    <p className="font-medium text-plum">{selectedEvent.title}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-wide text-plum/50">When</p>
                    <p>
                      {selectedEvent.start.toLocaleString()} -{" "}
                      {selectedEvent.end.toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <MapPin className="w-4 h-4 mt-0.5 text-plum/60" />
                    <p>{selectedEvent.location || "Location on file"}</p>
                  </div>
                  {selectedEvent.resource && (
                    <div className="rounded-xl bg-[#EEF5FB] p-3">
                      <p>Total: {money(selectedEvent.resource.total)}</p>
                      <p>Status: {selectedEvent.resource.status}</p>
                      <p>{selectedEvent.resource.notes}</p>
                    </div>
                  )}
                  <CalendarExportButtons
                    booking={{
                      id: selectedEvent.id,
                      service: selectedEvent.title,
                      startAt: selectedEvent.start,
                      endAt: selectedEvent.end,
                      address: selectedEvent.location,
                      notes: selectedEvent.notes,
                    }}
                  />
                </>
              ) : (
                <p>Select an event to view details.</p>
              )}
            </CardContent>
          </Card>

          <Button className="w-full rounded-full bg-gold hover:bg-gold/90 text-white">
            Demo calendar only
          </Button>
        </div>
      </div>
    </section>
  );
}
